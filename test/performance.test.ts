import { describe, it, expect, vi } from 'vitest';

vi.mock('web-vitals', () => ({
  onLCP: (cb: (m: { name: string; value: number; rating: string }) => void) => cb({ name: 'LCP', value: 1234, rating: 'good' }),
  onCLS: (cb: (m: { name: string; value: number; rating: string }) => void) => cb({ name: 'CLS', value: 0.1, rating: 'good' }),
  onINP: (cb: (m: { name: string; value: number; rating: string }) => void) => cb({ name: 'INP', value: 96, rating: 'good' }),
  onFCP: (cb: (m: { name: string; value: number; rating: string }) => void) => cb({ name: 'FCP', value: 800, rating: 'good' }),
  onTTFB: (cb: (m: { name: string; value: number; rating: string }) => void) => cb({ name: 'TTFB', value: 120, rating: 'good' }),
}));

import { performancePlugin } from '../src/plugins/performance';
import type { SdkContext, MonitorEvent } from '../src/core/types';
import { resolveConfig } from '../src/core/config';

describe('performancePlugin', () => {
  it('上报五个 Web Vitals 指标', () => {
    const events: MonitorEvent[] = [];
    const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
    performancePlugin.init(ctx);
    const names = events.filter((e) => e.type === 'webVitals').map((e) => e.metricName);
    expect(names.sort()).toEqual(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']);
    expect(events.find((e) => e.metricName === 'LCP')).toMatchObject({ kind: 'performance', value: 1234, rating: 'good' });
  });

  it('上报 navigation 指标（stub navigation 条目后断言各阶段耗时）', () => {
    const events: MonitorEvent[] = [];
    const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
    const fakeNav = {
      startTime: 0,
      domainLookupStart: 0, domainLookupEnd: 10,
      connectStart: 10, connectEnd: 30,
      requestStart: 30, responseStart: 100, responseEnd: 200,
      domContentLoadedEventEnd: 400, loadEventEnd: 600,
    };
    const spy = vi
      .spyOn(performance, 'getEntriesByType')
      .mockReturnValue([fakeNav] as unknown as PerformanceEntryList);
    performancePlugin.init(ctx);
    window.dispatchEvent(new Event('load'));
    expect(events.find((e) => e.type === 'navigation')).toMatchObject({
      kind: 'performance',
      dns: 10,
      tcp: 20,
      ttfb: 70,
      response: 100,
      domReady: 400,
      load: 600,
    });
    spy.mockRestore();
  });

  it('load 监听分支推迟一拍读取（loadEventEnd 在事件派发期间为 0）', () => {
    vi.useFakeTimers();
    const events: MonitorEvent[] = [];
    const ctx: SdkContext = { config: resolveConfig({ appId: 'a', endpoint: 'x' }), report: (e) => events.push(e) };
    const fakeNav = { startTime: 0, loadEventEnd: 600, domContentLoadedEventEnd: 400 };
    const spy = vi.spyOn(performance, 'getEntriesByType').mockReturnValue([fakeNav] as unknown as PerformanceEntryList);
    // jsdom readyState 恒为 complete，临时改写以进入 load 监听分支
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    try {
      performancePlugin.init(ctx);
      window.dispatchEvent(new Event('load'));
      expect(events.find((e) => e.type === 'navigation')).toBeUndefined(); // 事件派发期间不上报
      vi.advanceTimersByTime(0);
      expect(events.find((e) => e.type === 'navigation')).toMatchObject({ load: 600, domReady: 400 });
    } finally {
      Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
      spy.mockRestore();
      vi.useRealTimers();
    }
  });
});
