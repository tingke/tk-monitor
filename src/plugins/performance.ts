import type { Plugin, SdkContext } from '../core/types';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

/** 性能监控：Web Vitals + Navigation Timing */
export const performancePlugin: Plugin = {
  name: 'performance',
  init(ctx: SdkContext) {
    const reportMetric = (metric: { name: string; value: number; rating: string }) => {
      ctx.report({
        kind: 'performance',
        type: 'webVitals',
        metricName: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        rating: metric.rating,
      });
    };
    onLCP(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
    onFCP(reportMetric);
    onTTFB(reportMetric);

    const reportNavigation = () => {
      // getEntriesByType 声明返回 PerformanceEntry[]，navigation 条目实际类型为 PerformanceNavigationTiming
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!nav) return;
      ctx.report({
        kind: 'performance',
        type: 'navigation',
        dns: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp: Math.round(nav.connectEnd - nav.connectStart),
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        response: Math.round(nav.responseEnd - nav.responseStart),
        domReady: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      });
    };
    if (document.readyState === 'complete') reportNavigation();
    // load 事件派发期间 loadEventEnd 尚为 0，推迟到事件结束后读取
    else window.addEventListener('load', () => setTimeout(reportNavigation, 0), { once: true });
  },
};
