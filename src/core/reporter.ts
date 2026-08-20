import type { MonitorEvent, ResolvedConfig, Sender } from './types';

const BATCH_SIZE = 10;
const FLUSH_INTERVAL = 5000;
const DEDUPE_WINDOW = 30_000;

/** 上报器：批量队列 + 错误去重 + 定时/隐藏时 flush */
export class Reporter {
  private queue: MonitorEvent[] = [];
  private timer: ReturnType<typeof setInterval>;
  private dedupeMap = new Map<string, number>();

  constructor(private config: ResolvedConfig, private sender: Sender) {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    window.addEventListener('pagehide', () => this.flush());
    this.timer = setInterval(() => this.flush(), FLUSH_INTERVAL);
  }

  report(event: MonitorEvent): void {
    if (this.config.beforeSend) {
      const result = this.config.beforeSend(event);
      if (!result) return;
      event = result;
    }
    if (event.type === 'error') {
      const message = String(event.message ?? '');
      if (this.config.ignoreErrors.some((p) =>
        typeof p === 'string' ? message.includes(p) : p.test(message),
      )) {
        return;
      }
      // 错误去重：message|filename，30s 窗口
      const key = `${message}|${String(event.filename ?? '')}`;
      const now = Date.now();
      const last = this.dedupeMap.get(key);
      if (last !== undefined && now - last < DEDUPE_WINDOW) return;
      this.dedupeMap.set(key, now);
    }
    if (this.config.debug) console.log('[tk-monitor]', event);
    this.queue.push(event);
    if (this.queue.length >= BATCH_SIZE) this.flush();
  }

  flush(): void {
    if (this.queue.length === 0) return;
    const events = this.queue;
    this.queue = [];
    try {
      this.sender(events);
    } catch (e) {
      if (this.config.debug) console.error('[tk-monitor] 上报失败', e);
    }
  }

  destroy(): void {
    clearInterval(this.timer);
    this.flush();
  }
}

/** 默认发送器：sendBeacon 优先，降级新建 XHR（不复用实例） */
export function createDefaultSender(endpoint: string): Sender {
  return (events) => {
    const body = JSON.stringify({ events });
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, body)) return;
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpoint, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(body);
  };
}
