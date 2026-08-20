import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Reporter } from '../src/core/reporter';
import { resolveConfig } from '../src/core/config';

const config = resolveConfig({ appId: 'a', endpoint: 'x' });
const errorEvent = { kind: 'stability' as const, type: 'error', message: 'boom', filename: 'a.js' };

describe('Reporter', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('满 10 条自动 flush', () => {
    const sender = vi.fn();
    const r = new Reporter(config, sender);
    for (let i = 0; i < 9; i++) r.report({ kind: 'behavior', type: 'click' });
    expect(sender).not.toHaveBeenCalled();
    r.report({ kind: 'behavior', type: 'click' });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0]?.[0]).toHaveLength(10);
    r.destroy();
  });

  it('5s 定时 flush', () => {
    const sender = vi.fn();
    const r = new Reporter(config, sender);
    r.report({ kind: 'behavior', type: 'pv' });
    vi.advanceTimersByTime(5000);
    expect(sender).toHaveBeenCalledTimes(1);
    r.destroy();
  });

  it('同 message+filename 错误 30s 窗口内去重', () => {
    const sender = vi.fn();
    const r = new Reporter(config, sender);
    r.report({ ...errorEvent });
    r.report({ ...errorEvent });
    vi.advanceTimersByTime(29_000);
    r.flush();
    expect(sender.mock.calls[0]?.[0]).toHaveLength(1);
    vi.advanceTimersByTime(2000); // 累计 31s，窗口过期
    r.report({ ...errorEvent });
    r.flush();
    expect(sender.mock.calls[1]?.[0]).toHaveLength(1);
    r.destroy();
  });

  it('beforeSend 返回 null 则丢弃', () => {
    const sender = vi.fn();
    const c = resolveConfig({ appId: 'a', endpoint: 'x', beforeSend: () => null });
    const r = new Reporter(c, sender);
    r.report({ kind: 'behavior', type: 'click' });
    r.flush();
    expect(sender).not.toHaveBeenCalled();
    r.destroy();
  });

  it('ignoreErrors 命中则丢弃错误', () => {
    const sender = vi.fn();
    const c = resolveConfig({ appId: 'a', endpoint: 'x', ignoreErrors: [/ResizeObserver/] });
    const r = new Reporter(c, sender);
    r.report({ kind: 'stability', type: 'error', message: 'ResizeObserver loop error' });
    r.flush();
    expect(sender).not.toHaveBeenCalled();
    r.destroy();
  });

  it('页面隐藏时强制 flush', () => {
    const sender = vi.fn();
    const r = new Reporter(config, sender);
    r.report({ kind: 'behavior', type: 'click' });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(sender).toHaveBeenCalledTimes(1);
    r.destroy();
  });

  it('sender 抛错不中断且清空队列', () => {
    const sender = vi.fn(() => { throw new Error('network'); });
    const r = new Reporter(config, sender);
    r.report({ kind: 'behavior', type: 'click' });
    expect(() => r.flush()).not.toThrow();
    r.report({ kind: 'behavior', type: 'click' });
    r.flush();
    expect(sender).toHaveBeenCalledTimes(2);
    r.destroy();
  });
});

describe('createDefaultSender', () => {
  it('sendBeacon 可用时优先使用', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    const { createDefaultSender } = await import('../src/core/reporter');
    createDefaultSender('https://x.dev/c')([{ kind: 'behavior', type: 'pv' }]);
    expect(beacon).toHaveBeenCalledWith('https://x.dev/c', expect.any(String));
    vi.unstubAllGlobals();
  });
});
