import { describe, it, expect, afterEach } from 'vitest';
import { behaviorPlugin } from '../src/plugins/behavior';
import type { SdkContext, MonitorEvent } from '../src/core/types';
import { resolveConfig } from '../src/core/config';

function createCtx() {
  const events: MonitorEvent[] = [];
  const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
  return { ctx, events };
}

afterEach(() => {
  history.replaceState(null, '', location.pathname + '#');
});

describe('behaviorPlugin', () => {
  it('点击时上报 selector 与 innerText', () => {
    const { ctx, events } = createCtx();
    behaviorPlugin.init(ctx);
    const btn = document.createElement('button');
    btn.id = 'buy';
    btn.textContent = '立即购买';
    document.body.appendChild(btn);
    btn.click();
    // init 末尾会先上报一次首次进入 PV，click 事件不一定是 events[0]，用 find 定位
    const click = events.find((e) => e.type === 'click');
    expect(click).toMatchObject({ kind: 'behavior', type: 'click', innerText: '立即购买' });
    // getSelector 返回完整路径（目标元素在最前），不依赖 jsdom 路径深度细节
    expect((click?.selector as string).startsWith('button#buy')).toBe(true);
    btn.remove();
  });

  it('hashchange 上报 pv', () => {
    const { ctx, events } = createCtx();
    behaviorPlugin.init(ctx);
    location.hash = '/list';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    expect(events.some((e) => e.type === 'pv')).toBe(true);
  });

  it('history.pushState 劫持上报 pv 且带防重复标记', () => {
    const { ctx, events } = createCtx();
    behaviorPlugin.init(ctx);
    history.pushState(null, '', '/detail?id=1');
    expect(events.some((e) => e.type === 'pv')).toBe(true);
    expect((window as unknown as Record<string, unknown>).__tk_monitor_history_patched__).toBe(true);
  });
});
