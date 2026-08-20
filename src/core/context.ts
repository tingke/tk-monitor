import type { MonitorEvent, ResolvedConfig, SdkContext } from './types';

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** 创建插件上下文：report 时自动注入公共字段 */
export function createContext(
  config: ResolvedConfig,
  report: (event: MonitorEvent) => void,
): SdkContext {
  const sessionId = generateId();
  const commonFields = {
    title: document.title,
    userAgent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}`,
    language: navigator.language,
  };
  return {
    config,
    report(event) {
      // 注入顺序：动态字段先给默认值，插件字段最后展开可覆盖
      // （xhr 等插件需要用请求地址覆盖默认的页面地址）
      report({
        ...commonFields,
        url: location.href,
        timestamp: Date.now(),
        sessionId,
        appId: config.appId,
        ...event,
      });
    },
  };
}
