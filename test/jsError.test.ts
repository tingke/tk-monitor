import { describe, it, expect } from 'vitest';
import { jsErrorPlugin } from '../src/plugins/jsError';
import type { SdkContext, MonitorEvent } from '../src/core/types';
import { resolveConfig } from '../src/core/config';

function createCtx() {
  const events: MonitorEvent[] = [];
  const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
  return { ctx, events };
}

function fireErrorEvent(detail: { message?: string; filename?: string; lineno?: number; colno?: number; error?: Error }) {
  const event = new Event('error') as Event & typeof detail;
  Object.assign(event, detail);
  window.dispatchEvent(event);
}

describe('jsErrorPlugin', () => {
  it('捕获 js 执行错误（含堆栈格式化与 selector）', () => {
    const { ctx, events } = createCtx();
    jsErrorPlugin.init(ctx);
    fireErrorEvent({ message: 'boom is not defined', filename: 'a.js', lineno: 12, colno: 3, error: new Error('boom') });
    expect(events[0]).toMatchObject({
      kind: 'stability',
      type: 'error',
      errorType: 'jsError',
      message: 'boom is not defined',
      filename: 'a.js',
      position: '12:3',
    });
    expect(typeof events[0]?.stack).toBe('string');
    expect((events[0]?.stack as string).startsWith('Error: boom')).toBe(false); // 第一行被去掉
  });

  it('error.error 为空时堆栈为 undefined 不崩溃', () => {
    const { ctx, events } = createCtx();
    jsErrorPlugin.init(ctx);
    expect(() => fireErrorEvent({ message: 'x', filename: 'a.js' })).not.toThrow();
    expect(events[0]?.stack).toBeUndefined();
  });

  it('捕获资源加载错误（用 href/src，修复旧 link 字段 bug）', () => {
    const { ctx, events } = createCtx();
    jsErrorPlugin.init(ctx);
    const img = document.createElement('img');
    img.src = 'http://x.dev/1.jpg';
    const event = new Event('error') as Event & { target: Element };
    // Event.prototype.target 为 getter-only，直接赋值不生效，需定义自身属性模拟资源错误的 target
    Object.defineProperty(event, 'target', { value: img, configurable: true });
    window.dispatchEvent(event);
    expect(events[0]).toMatchObject({
      errorType: 'resourceError',
      filename: 'http://x.dev/1.jpg',
      tagName: 'IMG',
    });
  });
});
