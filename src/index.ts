export { init } from './core/sdk';
export { createSlsSender } from './adapters/sls';
export const VERSION = '0.1.0';
export type {
  Config,
  EventKind,
  MonitorEvent,
  Plugin,
  ResolvedConfig,
  Sender,
  SdkContext,
  SlsConfig,
  XhrErrorOptions,
} from './core/types';
