# tk-monitor

轻量级前端监控 SDK —— 错误 / 接口 / 性能 / 用户行为，一个 init 全搞定。

## 特性

- **稳定性**：JS 运行时错误、资源加载错误、Promise 未捕获异常，带堆栈与 DOM 选择器溯源
- **接口**：拦截 XHR 与 fetch，自动上报失败与慢请求，支持 URL 过滤
- **性能**：Web Vitals（LCP / CLS / INP / FCP / TTFB）+ Navigation Timing
- **行为**：点击埋点 + hash / history 路由 PV
- **上报**：sendBeacon 优先、批量队列、错误去重、会话采样，可选阿里云 SLS 适配器
- **体量**：零框架依赖（仅 web-vitals），TS 编写，自带类型声明

## 快速开始

```bash
pnpm add tk-monitor
```

```ts
import { init } from 'tk-monitor';

init({
  appId: 'my-app',
  endpoint: 'https://your-api.example.com/collect',
  debug: import.meta.env.DEV,
});
```

CDN（UMD）：

```html
<script src="https://unpkg.com/tk-monitor/dist/index.umd.js"></script>
<script>TkMonitor.init({ appId: 'my-app', endpoint: '...' })</script>
```

## 配置项

| 配置 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `appId` | `string` | 必填 | 应用标识 |
| `endpoint` | `string` | - | 上报地址（通用 HTTP POST JSON），`adapter: 'default'` 时必填 |
| `adapter` | `'default' \| 'sls'` | `'default'` | 上报适配器 |
| `sls` | `{ host, project, logStore }` | - | SLS WebTracker 配置，`adapter: 'sls'` 时必填 |
| `plugins.xhrError.ignoreUrls` | `(string \| RegExp)[]` | `[]` | 命中不上报的接口 |
| `plugins.xhrError.slowThreshold` | `number` | `5000` | 慢请求阈值 ms |
| `plugins.jsError` / `plugins.promiseError` / `plugins.performance` / `plugins.behavior` | `boolean` | `true` | 各插件开关（置 `false` 关闭） |
| `plugins.xhrError` | `XhrErrorOptions \| false` | `{ ignoreUrls: [], slowThreshold: 5000 }` | 接口监控插件（对象配置或 `false` 关闭） |
| `sampleRate` | `number` | `1` | 会话级采样率 0~1 |
| `ignoreErrors` | `(string \| RegExp)[]` | `[]` | 忽略的错误 message |
| `beforeSend` | `(e) => e \| null` | - | 上报前钩子，返回 null 丢弃 |
| `debug` | `boolean` | `false` | 控制台打印事件 |

## 数据模型

每条事件自动注入公共字段：`appId / sessionId / url / title / timestamp / userAgent / screen / language`。

| kind | type | 说明 |
|---|---|---|
| `stability` | `error` | `errorType`: jsError / resourceError / promiseError |
| `stability` | `xhr` | 接口失败与慢请求，含 `status / duration / method / url` |
| `performance` | `webVitals` | `metricName`: LCP / CLS / INP / FCP / TTFB，含 `value / rating` |
| `performance` | `navigation` | dns / tcp / ttfb / response / domReady / load |
| `behavior` | `click` / `pv` | 点击 selector+innerText / 路由变化 |

## 架构

```text
init(config)         会话采样在 init 入口决策（core/sdk.ts）
  ├─ core/config     配置合并校验
  ├─ core/context    插件上下文，公共字段注入
  ├─ core/reporter   队列/去重/beforeSend → Sender
  │    ├─ adapters/sls（可选）
  │    └─ 默认 HTTP sender（sendBeacon → XHR 降级）
  └─ plugins         jsError · promiseError · xhrError · performance · behavior
```

自定义插件（高级）：

```ts
// Plugin 接口：{ name, init(ctx) }，ctx.report() 即上报
```

## 本地开发

```bash
pnpm install
pnpm test        # Vitest
pnpm build       # tsup：ESM + UMD + d.ts
pnpm dev         # tsup --watch 增量构建
pnpm demo        # express 本地后端（接收上报 + 测试接口），访问 /demo/
```

## 与 Sentry 的差异

tk-monitor 面向「自有后端轻量接入」场景：无账号绑定、上报格式透明、单 gz 后 ~10KB 量级；Sentry 提供完整 SaaS 平台（告警、issue 聚合、SourceMap 还原、录屏）。需要后者请直接用 Sentry。

## License

MIT
