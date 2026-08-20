import { describe, it, expect, vi } from 'vitest';
import { createContext } from '../src/core/context';
import { resolveConfig } from '../src/core/config';

const config = resolveConfig({ appId: 'app-1', endpoint: 'https://x.dev/collect' });

describe('createContext', () => {
  it('report 注入公共字段且插件字段优先', () => {
    const report = vi.fn();
    const ctx = createContext(config, report);
    ctx.report({ kind: 'stability', type: 'error', title: '插件标题' });
    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: 'app-1',
        kind: 'stability',
        type: 'error',
        title: '插件标题', // 插件字段覆盖公共 title
        url: location.href,
        sessionId: expect.any(String),
        userAgent: navigator.userAgent,
        timestamp: expect.any(Number),
        screen: expect.any(String),
        language: navigator.language,
      }),
    );
  });

  it('插件自带 url 时保留（如 xhr 请求地址），未带时注入页面地址', () => {
    const report = vi.fn();
    const ctx = createContext(config, report);
    ctx.report({ kind: 'stability', type: 'xhr', url: '/api/demo-404', status: 404 });
    ctx.report({ kind: 'behavior', type: 'pv' });
    expect(report.mock.calls[0]?.[0].url).toBe('/api/demo-404');
    expect(report.mock.calls[1]?.[0].url).toBe(location.href);
  });

  it('同一 context 的 sessionId 稳定', () => {
    const report = vi.fn();
    const ctx = createContext(config, report);
    ctx.report({ kind: 'behavior', type: 'pv' });
    ctx.report({ kind: 'behavior', type: 'click' });
    const s1 = report.mock.calls[0]?.[0].sessionId;
    const s2 = report.mock.calls[1]?.[0].sessionId;
    expect(s1).toBe(s2);
  });
});
