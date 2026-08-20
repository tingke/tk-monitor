import type { Plugin, SdkContext } from '../core/types';
import { getSelector } from '../utils/selector';

const HISTORY_PATCH_FLAG = '__tk_monitor_history_patched__';

/** 用户行为：点击埋点 + 路由变化 PV */
export const behaviorPlugin: Plugin = {
  name: 'behavior',
  init(ctx: SdkContext) {
    // 点击（委托到 document 捕获阶段）
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target as Element | null;
        if (!target) return;
        ctx.report({
          kind: 'behavior',
          type: 'click',
          selector: getSelector(event),
          innerText: (target.textContent ?? '').trim().slice(0, 50),
        });
      },
      { capture: true, passive: true },
    );

    // PV：hash 路由
    const reportPv = () => ctx.report({ kind: 'behavior', type: 'pv', page: location.pathname + location.hash });
    window.addEventListener('hashchange', reportPv);
    window.addEventListener('popstate', reportPv);

    // PV：history 路由（pushState/replaceState 不触发任何事件，需劫持）
    const w = window as unknown as Record<string, unknown>;
    if (!w[HISTORY_PATCH_FLAG]) {
      w[HISTORY_PATCH_FLAG] = true;
      (['pushState', 'replaceState'] as const).forEach((key) => {
        const original = history[key];
        history[key] = ((...args: Parameters<typeof original>) => {
          const result = original.apply(history, args);
          reportPv();
          return result;
        }) as typeof original;
      });
    }
    // 首次进入也算一次 PV
    reportPv();
  },
};
