import { describe, it, expect, vi } from 'vitest';
import { decideXhrReport, xhrErrorPlugin } from '../src/plugins/xhrError';
import type { SdkContext, MonitorEvent } from '../src/core/types';
import { resolveConfig } from '../src/core/config';

const opts = { ignoreUrls: ['/health'], slowThreshold: 5000 };

describe('decideXhrReport', () => {
  it('2xx 且不慢则不上报', () => {
    expect(decideXhrReport('/api/list', 200, 100, opts)).toBe(false);
  });
  it('4xx/5xx 上报', () => {
    expect(decideXhrReport('/api/list', 500, 100, opts)).toBe(true);
    expect(decideXhrReport('/api/list', 404, 100, opts)).toBe(true);
  });
  it('慢请求上报', () => {
    expect(decideXhrReport('/api/list', 200, 6000, opts)).toBe(true);
  });
  it('ignoreUrls 字符串子串命中不上报', () => {
    expect(decideXhrReport('/health/check', 500, 100, opts)).toBe(false);
  });
  it('ignoreUrls 正则命中不上报', () => {
    expect(decideXhrReport('/static/app.js', 500, 100, { ignoreUrls: [/^\/static/], slowThreshold: 5000 })).toBe(false);
  });
});

describe('xhrErrorPlugin 拦截 fetch', () => {
  it('fetch 失败时上报 xhr 事件', async () => {
    const events: MonitorEvent[] = [];
    const ctx: SdkContext = {
      config: resolveConfig({ appId: 'a', endpoint: 'x', plugins: { xhrError: opts } }),
      report: (e) => events.push(e),
    };
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    window.fetch = vi.fn().mockResolvedValue({ status: 500, ok: false } as Response);
    xhrErrorPlugin.init(ctx);
    await window.fetch('/api/list', { method: 'POST' });
    expect(events[0]).toMatchObject({
      kind: 'stability',
      type: 'xhr',
      method: 'POST',
      url: '/api/list',
      status: 500,
      success: false,
    });
    window.fetch = originalFetch; // 还原，避免污染后续用例
    XMLHttpRequest.prototype.open = originalOpen; // 还原，避免污染后续用例
    XMLHttpRequest.prototype.send = originalSend; // 还原，避免污染后续用例
  });
});

describe('xhrErrorPlugin 拦截 XMLHttpRequest', () => {
  it('并发 XHR 时各实例上报各自的 method/url，不串报', () => {
    const events: MonitorEvent[] = [];
    const ctx: SdkContext = {
      config: resolveConfig({ appId: 'a', endpoint: 'x', plugins: { xhrError: opts } }),
      report: (e) => events.push(e),
    };
    const originalFetch = window.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    // 替换为空函数，避免测试环境真正发请求；插件 init 会在此基础上再包一层
    XMLHttpRequest.prototype.open = function () {};
    XMLHttpRequest.prototype.send = function () {};
    xhrErrorPlugin.init(ctx);

    const a = new XMLHttpRequest();
    const b = new XMLHttpRequest();
    a.open('GET', '/api/a');
    b.open('POST', '/api/b'); // 后 open 的 b 若覆盖共享变量，a 的上报就会串成 /api/b
    a.send();
    b.send();
    Object.defineProperty(a, 'status', { value: 500 });
    Object.defineProperty(b, 'status', { value: 500 });
    a.dispatchEvent(new Event('loadend'));
    b.dispatchEvent(new Event('loadend'));

    const eventA = events.find((e) => e.url === '/api/a');
    const eventB = events.find((e) => e.url === '/api/b');
    expect(eventA).toMatchObject({ method: 'GET', url: '/api/a' });
    expect(eventB).toMatchObject({ method: 'POST', url: '/api/b' });

    // 用完还原原型与 fetch，避免污染后续用例
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.send = originalSend;
    window.fetch = originalFetch;
  });
});
