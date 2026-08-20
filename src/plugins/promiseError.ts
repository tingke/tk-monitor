import type { Plugin, SdkContext } from '../core/types';
import { getLastEvent } from '../utils/lastEvent';
import { getSelector } from '../utils/selector';
import { formatStack } from '../utils/stack';

/** 未捕获的 Promise rejection（修复旧版读 event.message 的缺陷） */
export const promiseErrorPlugin: Plugin = {
  name: 'promiseError',
  init(ctx: SdkContext) {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = (event as PromiseRejectionEvent).reason;
      let message: string | undefined;
      let filename: string | undefined;
      let position = '0:0';
      let stack: string | undefined;

      if (typeof reason === 'string') {
        message = reason;
      } else if (reason instanceof Error) {
        message = reason.message;
        stack = formatStack(reason.stack);
        const match = reason.stack?.match(/at\s+(.+):(\d+):(\d+)/);
        if (match) {
          filename = match[1];
          position = `${match[2]}:${match[3]}`;
        }
      } else if (reason != null) {
        message = String(reason);
      }

      const lastEvent = getLastEvent();
      ctx.report({
        kind: 'stability',
        type: 'error',
        errorType: 'promiseError',
        message,
        filename,
        position,
        stack,
        selector: lastEvent ? getSelector(lastEvent) : '',
      });
    });
  },
};
