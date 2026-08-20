import { describe, it, expect } from 'vitest';
import { promiseErrorPlugin } from '../src/plugins/promiseError';
import type { SdkContext, MonitorEvent } from '../src/core/types';
import { resolveConfig } from '../src/core/config';

function createCtx() {
  const events: MonitorEvent[] = [];
  const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
  return { ctx, events };
}

function fireRejection(reason: unknown) {
  const event = new Event('unhandledrejection') as Event & { reason: unknown };
  event.reason = reason;
  window.dispatchEvent(event);
}

describe('promiseErrorPlugin', () => {
  it('reason 为字符串时取字符串作为 message', () => {
    const { ctx, events } = createCtx();
    promiseErrorPlugin.init(ctx);
    fireRejection('网络炸了');
    expect(events[0]).toMatchObject({ errorType: 'promiseError', message: '网络炸了' });
  });

  it('reason 为 Error 对象时解析 message 与堆栈位置', () => {
    const { ctx, events } = createCtx();
    promiseErrorPlugin.init(ctx);
    fireRejection(new Error('db down'));
    expect(events[0]).toMatchObject({
      errorType: 'promiseError',
      message: 'db down',
      stack: expect.any(String),
    });
  });

  it('reason 缺失时不崩溃且 message 为 undefined', () => {
    const { ctx, events } = createCtx();
    promiseErrorPlugin.init(ctx);
    expect(() => fireRejection(undefined)).not.toThrow();
    expect(events[0]?.errorType).toBe('promiseError');
  });
});
