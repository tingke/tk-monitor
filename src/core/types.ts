/** 监控事件大类 */
export type EventKind = 'stability' | 'performance' | 'behavior';

/** 监控事件：各插件自有字段 + 索引签名扩展 */
export interface MonitorEvent {
  kind: EventKind;
  /** 小类型：error / xhr / pv / click / webVitals / navigation ... */
  type: string;
  [key: string]: unknown;
}

/** 阿里云 SLS WebTracker 配置 */
export interface SlsConfig {
  host: string;
  project: string;
  logStore: string;
}

/** 接口监控插件配置 */
export interface XhrErrorOptions {
  /** 命中则不上报（如健康检查） */
  ignoreUrls: Array<string | RegExp>;
  /** 慢请求阈值 ms，超过则上报 */
  slowThreshold: number;
}

export interface ResolvedPluginConfig {
  jsError: boolean;
  promiseError: boolean;
  xhrError: XhrErrorOptions | false;
  performance: boolean;
  behavior: boolean;
}

export interface Config {
  appId: string;
  /** 通用上报地址（adapter 为 default 时必填） */
  endpoint?: string;
  /** 上报适配器，默认 'default' */
  adapter?: 'default' | 'sls';
  sls?: SlsConfig;
  plugins?: {
    jsError?: boolean;
    promiseError?: boolean;
    xhrError?: XhrErrorOptions | false;
    performance?: boolean;
    behavior?: boolean;
  };
  /** 会话级采样率 0~1，默认 1（全采样） */
  sampleRate?: number;
  /** 命中则忽略的错误（message 字符串或正则） */
  ignoreErrors?: Array<string | RegExp>;
  /** 上报前钩子，返回 null 丢弃事件 */
  beforeSend?: (event: MonitorEvent) => MonitorEvent | null;
  debug?: boolean;
}

export interface ResolvedConfig {
  appId: string;
  endpoint: string | undefined;
  adapter: 'default' | 'sls';
  sls: SlsConfig | undefined;
  plugins: ResolvedPluginConfig;
  sampleRate: number;
  ignoreErrors: Array<string | RegExp>;
  beforeSend: ((event: MonitorEvent) => MonitorEvent | null) | undefined;
  debug: boolean;
}

/** 插件运行时上下文 */
export interface SdkContext {
  config: ResolvedConfig;
  report(event: MonitorEvent): void;
}

/** 插件接口 */
export interface Plugin {
  name: string;
  init(ctx: SdkContext): void;
}

/** 上报发送器：接收一批事件，fire-and-forget */
export type Sender = (events: MonitorEvent[]) => void;
