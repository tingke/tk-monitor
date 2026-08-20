import { resolveConfig } from './config';
import { createContext } from './context';
import { Reporter, createDefaultSender } from './reporter';
import type { Config, Plugin, SdkContext } from './types';
import { jsErrorPlugin } from '../plugins/jsError';
import { promiseErrorPlugin } from '../plugins/promiseError';
import { xhrErrorPlugin } from '../plugins/xhrError';
import { performancePlugin } from '../plugins/performance';
import { behaviorPlugin } from '../plugins/behavior';
import { createSlsSender } from '../adapters/sls';

// 幂等标记挂 window 全局符号（而非模块级变量）：
// 模块级 let 会在脚本被重新执行时随模块作用域重建而归零——
// 预览工具热重载/重复注入 script 场景下会导致二次 init、插件重复注册、事件双倍上报
const INIT_FLAG = '__tk_monitor_initialized__';

/** SDK 初始化入口。未命中会话采样时返回 undefined 且不做任何事 */
export function init(userConfig: Config): SdkContext | undefined {
  // 幂等防护：已初始化则直接忽略本次调用，避免插件被重复注册
  if ((window as unknown as Record<string, unknown>)[INIT_FLAG]) {
    if (userConfig.debug) console.warn('[tk-monitor] init 重复调用，已忽略');
    return undefined;
  }
  const config = resolveConfig(userConfig);
  // 会话级采样：一次决策，全有或全无
  if (Math.random() >= config.sampleRate) return undefined;

  const sender =
    config.adapter === 'sls' && config.sls
      ? createSlsSender(config.sls)
      : createDefaultSender(config.endpoint!);

  const reporter = new Reporter(config, sender);
  const ctx = createContext(config, (event) => reporter.report(event));

  const plugins: Array<Plugin | false> = [
    config.plugins.jsError && jsErrorPlugin,
    config.plugins.promiseError && promiseErrorPlugin,
    config.plugins.xhrError && xhrErrorPlugin,
    config.plugins.performance && performancePlugin,
    config.plugins.behavior && behaviorPlugin,
  ];
  plugins.filter((p): p is Plugin => Boolean(p)).forEach((p) => p.init(ctx));

  // 插件全部注册成功后置位，此后重复 init（含脚本重执行后的再次调用）将被拦截
  (window as unknown as Record<string, unknown>)[INIT_FLAG] = true;

  if (config.debug) console.log('[tk-monitor] 已初始化，插件：', plugins.filter(Boolean).map((p) => (p as Plugin).name).join(', '));
  return ctx;
}
