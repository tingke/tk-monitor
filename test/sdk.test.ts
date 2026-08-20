import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/plugins/jsError', () => ({ jsErrorPlugin: { name: 'jsError', init: vi.fn() } }));
vi.mock('../src/plugins/promiseError', () => ({ promiseErrorPlugin: { name: 'promiseError', init: vi.fn() } }));
vi.mock('../src/plugins/xhrError', () => ({ xhrErrorPlugin: { name: 'xhrError', init: vi.fn() } }));
vi.mock('../src/plugins/performance', () => ({ performancePlugin: { name: 'performance', init: vi.fn() } }));
vi.mock('../src/plugins/behavior', () => ({ behaviorPlugin: { name: 'behavior', init: vi.fn() } }));

import { init } from '../src/core/sdk';
import { jsErrorPlugin } from '../src/plugins/jsError';

describe('init', () => {
  it('注册启用的插件并返回上下文', () => {
    const ctx = init({ appId: 'a', endpoint: 'x' });
    expect(ctx?.config.appId).toBe('a');
    expect(jsErrorPlugin.init).toHaveBeenCalledTimes(1);
  });

  it('sampleRate=0 时不注册任何插件，返回 undefined', () => {
    const MathRandom = Math.random;
    Math.random = () => 0.99;
    const ctx = init({ appId: 'a', endpoint: 'x', sampleRate: 0 });
    Math.random = MathRandom;
    expect(ctx).toBeUndefined();
    expect(jsErrorPlugin.init).toHaveBeenCalledTimes(1); // 仍是上一例的 1 次
  });

  it('重复调用 init 只初始化一次（幂等），插件不会重复注册', () => {
    init({ appId: 'a', endpoint: 'x' });
    init({ appId: 'a', endpoint: 'x' }); // 已初始化，应被幂等防护拦截
    expect(jsErrorPlugin.init).toHaveBeenCalledTimes(1); // 不因第二次调用而增加
  });

  it('脚本被重新执行（模块作用域重建）时，window 级标志仍拦截二次 init', async () => {
    // 模拟预览工具热重载：resetModules 后重新 import，模块级变量归零但 window 标志仍在
    vi.resetModules();
    const { init: reInit } = await import('../src/core/sdk');
    const ctx = reInit({ appId: 'a', endpoint: 'x' });
    expect(ctx).toBeUndefined();
  });
});
