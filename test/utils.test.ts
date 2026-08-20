import { describe, it, expect } from 'vitest';
import { getSelector } from '../src/utils/selector';
import { getLastEvent } from '../src/utils/lastEvent';

describe('getSelector', () => {
  it('由 id 生成选择器', () => {
    const div = document.createElement('div');
    div.id = 'app';
    const btn = document.createElement('button');
    div.appendChild(btn);
    document.body.appendChild(div);
    const event = { target: btn, composedPath: () => [btn, div, document, window] } as unknown as Event;
    expect(getSelector(event)).toBe('button div#app');
    div.remove();
  });

  it('由 class 生成选择器', () => {
    const p = document.createElement('p');
    p.className = 'item active';
    document.body.appendChild(p);
    const event = { target: p, composedPath: () => [p, document, window] } as unknown as Event;
    expect(getSelector(event)).toBe('p.item.active');
    p.remove();
  });

  it('无 id/class 时用标签名', () => {
    const span = document.createElement('span');
    const event = { target: span, composedPath: () => [span, document] } as unknown as Event;
    expect(getSelector(event)).toBe('span');
  });

  it('空路径返回空串', () => {
    expect(getSelector({ composedPath: () => [] } as unknown as Event)).toBe('');
  });
});

describe('getLastEvent', () => {
  it('返回最近一次交互事件', async () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    btn.click();
    expect(getLastEvent()?.type).toBe('click');
    btn.remove();
  });
});
