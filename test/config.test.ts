import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/core/config';
import type { MonitorEvent } from '../src/core/types';

describe('resolveConfig', () => {
  it('缺少 appId 时抛错', () => {
    expect(() => resolveConfig({} as never)).toThrow('appId');
  });

  it('缺少 endpoint 时抛错', () => {
    expect(() => resolveConfig({ appId: 'a' })).toThrow('endpoint');
  });

  it('adapter=sls 但缺 sls 配置时抛错', () => {
    expect(() => resolveConfig({ appId: 'a', adapter: 'sls' })).toThrow('sls');
  });

  it('填充全部默认值', () => {
    const c = resolveConfig({ appId: 'a', endpoint: 'https://x.dev/collect' });
    expect(c.adapter).toBe('default');
    expect(c.sampleRate).toBe(1);
    expect(c.debug).toBe(false);
    expect(c.plugins.jsError).toBe(true);
    expect(c.plugins.promiseError).toBe(true);
    expect(c.plugins.xhrError).toEqual({ ignoreUrls: [], slowThreshold: 5000 });
    expect(c.plugins.performance).toBe(true);
    expect(c.plugins.behavior).toBe(true);
  });

  it('合并用户配置', () => {
    const c = resolveConfig({
      appId: 'a',
      endpoint: 'x',
      adapter: 'sls',
      sls: { host: 'h', project: 'p', logStore: 'l' },
      plugins: { xhrError: false },
      sampleRate: 0.5,
      debug: true,
    });
    expect(c.plugins.xhrError).toBe(false);
    expect(c.plugins.jsError).toBe(true);
    expect(c.sampleRate).toBe(0.5);
    expect(c.adapter).toBe('sls');
  });

  it('保留 ignoreErrors 与 beforeSend', () => {
    const beforeSend = (e: MonitorEvent) => e;
    const c = resolveConfig({ appId: 'a', endpoint: 'x', ignoreErrors: [/ResizeObserver/], beforeSend });
    expect(c.ignoreErrors).toEqual([/ResizeObserver/]);
    expect(c.beforeSend).toBe(beforeSend);
  });
});
