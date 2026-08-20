import { describe, it, expect, vi } from 'vitest';
import { createSlsSender } from '../src/adapters/sls';
import type { MonitorEvent } from '../src/core/types';

const sls = { host: 'cn-hangzhou.log.aliyuncs.com', project: 'my-project', logStore: 'monitor' };
const events: MonitorEvent[] = [{ kind: 'stability', type: 'error', message: 'boom', timestamp: 1700000000000 }];

describe('createSlsSender', () => {
  it('sendBeacon 可用时优先且 URL 拼装正确', () => {
    const beacon = vi.fn<(url: string) => boolean>(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    createSlsSender(sls)(events);
    const url = beacon.mock.calls[0]?.[0] as string;
    expect(url.startsWith('https://my-project.cn-hangzhou.log.aliyuncs.com/logstores/monitor/track?APIVersion=0.6.0')).toBe(true);
    expect(decodeURIComponent(url.split('body=')[1] ?? '')).toContain('"message":"boom"');
    vi.unstubAllGlobals();
  });

  it('sendBeacon 不可用时降级 Image 打点', () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    const imgInstances: Array<{ src: string }> = [];
    const ImageCtor = class {
      src = '';
      constructor() { imgInstances.push(this); }
    };
    vi.stubGlobal('Image', ImageCtor);
    createSlsSender(sls)(events);
    expect(imgInstances[0]?.src).toContain('APIVersion=0.6.0');
    vi.unstubAllGlobals();
  });
});
