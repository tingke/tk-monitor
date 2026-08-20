import type { Plugin, SdkContext } from '../core/types';
import { getLastEvent } from '../utils/lastEvent';
import { getSelector } from '../utils/selector';
import { formatStack } from '../utils/stack';

/** JS 运行时错误 + 资源加载错误 */
export const jsErrorPlugin: Plugin = {
  name: 'jsError',
  init(ctx: SdkContext) {
    window.addEventListener(
      'error',
      (event) => {
        // 事件派发在 window 上但 target 是资源元素 → 资源加载错误
        const target = event.target as (HTMLElement | Window) | null;
        if (target && target !== window && (target instanceof HTMLImageElement || target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)) {
          const src = (target as HTMLImageElement).src || (target as HTMLLinkElement).href;
          ctx.report({
            kind: 'stability',
            type: 'error',
            errorType: 'resourceError',
            filename: src,
            tagName: target.tagName,
            selector: getSelector(event),
          });
          return;
        }
        // JS 执行错误
        const lastEvent = getLastEvent();
        ctx.report({
          kind: 'stability',
          type: 'error',
          errorType: 'jsError',
          message: event.message,
          filename: event.filename,
          position: `${event.lineno}:${event.colno}`,
          stack: formatStack(event.error?.stack),
          selector: lastEvent ? getSelector(lastEvent) : '',
        });
      },
      true, // 捕获阶段才能拿到资源加载错误
    );
  },
};
