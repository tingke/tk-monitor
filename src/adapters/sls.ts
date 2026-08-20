import type { Sender, SlsConfig } from '../core/types';

/**
 * 阿里云 SLS WebTracker GET 适配器。
 * sendBeacon 无法携带自定义 header，SLS 支持 GET query 打点：
 * https://{project}.{host}/logstores/{logStore}/track?APIVersion=0.6.0&body=<logs>
 */
export function createSlsSender(sls: SlsConfig): Sender {
  const base = `https://${sls.project}.${sls.host}/logstores/${sls.logStore}/track`;
  return (events) => {
    // SLS 要求秒级 Time 字段，其余字段原样透传
    const logs = events.map((e) => ({
      ...e,
      Time: Math.floor(Number(e.timestamp ?? Date.now()) / 1000),
    }));
    const url = `${base}?APIVersion=0.6.0&body=${encodeURIComponent(JSON.stringify(logs))}`;
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url)) return;
    new Image().src = url; // 1x1 打点降级，页面卸载不阻塞
  };
}
