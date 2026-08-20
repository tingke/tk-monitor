import type { Config, ResolvedConfig } from './types';

/** 合并默认值并校验用户配置 */
export function resolveConfig(userConfig: Config): ResolvedConfig {
  if (!userConfig.appId) {
    throw new Error('[tk-monitor] appId 必填');
  }
  if (userConfig.adapter === 'sls') {
    const { host, project, logStore } = userConfig.sls ?? {};
    if (!host || !project || !logStore) {
      throw new Error('[tk-monitor] adapter 为 sls 时必须完整配置 sls: { host, project, logStore }');
    }
  } else if (!userConfig.endpoint) {
    throw new Error('[tk-monitor] 必须配置 endpoint，或使用 adapter: "sls" + sls 配置');
  }

  return {
    appId: userConfig.appId,
    endpoint: userConfig.endpoint,
    adapter: userConfig.adapter ?? 'default',
    sls: userConfig.sls,
    plugins: {
      jsError: userConfig.plugins?.jsError ?? true,
      promiseError: userConfig.plugins?.promiseError ?? true,
      xhrError: userConfig.plugins?.xhrError ?? { ignoreUrls: [], slowThreshold: 5000 },
      performance: userConfig.plugins?.performance ?? true,
      behavior: userConfig.plugins?.behavior ?? true,
    },
    sampleRate: userConfig.sampleRate ?? 1,
    ignoreErrors: userConfig.ignoreErrors ?? [],
    beforeSend: userConfig.beforeSend,
    debug: userConfig.debug ?? false,
  };
}
