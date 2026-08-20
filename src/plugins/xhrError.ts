import type { Plugin, SdkContext, XhrErrorOptions } from '../core/types';

/** 决策是否上报：非 2xx 或慢请求上报；命中 ignoreUrls 不上报 */
export function decideXhrReport(
  url: string,
  status: number,
  duration: number,
  options: XhrErrorOptions,
): boolean {
  if (options.ignoreUrls.some((p) => (typeof p === 'string' ? url.includes(p) : p.test(url)))) {
    return false;
  }
  const failed = status < 200 || status >= 300;
  const slow = duration >= options.slowThreshold;
  return failed || slow;
}

// 以 XHR 实例为键记录各自的 method/url：open 总在 send 前对同一实例调用，
// loadend 回调按实例取值，避免并发请求时共享变量被后 open 的覆盖（串报）
const xhrMeta = new WeakMap<XMLHttpRequest, { method: string; url: string }>();

/** 接口监控：拦截 XHR 与 fetch，只观察不修改 */
export const xhrErrorPlugin: Plugin = {
  name: 'xhrError',
  init(ctx: SdkContext) {
    const options = ctx.config.plugins.xhrError;
    if (!options) return;

    // ---- XMLHttpRequest ----
    const XHR = XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;

    XHR.open = function (this: XMLHttpRequest, m: string, u: string | URL, ...rest: unknown[]) {
      // 按实例存取：不同实例（含并发的多个请求）互不覆盖
      xhrMeta.set(this, { method: m, url: String(u) });
      // @ts-expect-error 透传原参数
      return originalOpen.apply(this, [m, u, ...rest]);
    };
    XHR.send = function (this: XMLHttpRequest, ...args: unknown[]) {
      const start = performance.now();
      this.addEventListener('loadend', () => {
        const duration = Math.round(performance.now() - start);
        const meta = xhrMeta.get(this);
        if (!meta) return;
        if (!decideXhrReport(meta.url, this.status, duration, options)) return;
        ctx.report({
          kind: 'stability',
          type: 'xhr',
          eventType: this.status === 0 ? 'xhrError' : 'xhrLoad',
          method: meta.method,
          url: meta.url,
          status: this.status,
          duration,
          success: this.status >= 200 && this.status < 300,
        });
      });
      // @ts-expect-error 透传原参数
      return originalSend.apply(this, args);
    };

    // ---- fetch ----
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      const start = performance.now();
      return originalFetch.call(this, input, init).then(
        (response) => {
          const duration = Math.round(performance.now() - start);
          const reqUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          const method = (init?.method ?? 'GET').toUpperCase();
          if (decideXhrReport(reqUrl, response.status, duration, options)) {
            ctx.report({
              kind: 'stability',
              type: 'xhr',
              eventType: 'xhrLoad',
              method,
              url: reqUrl,
              status: response.status,
              duration,
              success: response.ok,
            });
          }
          return response;
        },
        (error: unknown) => {
          const duration = Math.round(performance.now() - start);
          const reqUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
          ctx.report({
            kind: 'stability',
            type: 'xhr',
            eventType: 'xhrError',
            method: (init?.method ?? 'GET').toUpperCase(),
            url: reqUrl,
            status: 0,
            duration,
            success: false,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        },
      );
    };
  },
};
