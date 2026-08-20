/** 根据 DOM 上的 className 生成 class 段（SVG 的 className 是 SVGAnimatedString） */
function classOf(el: Element): string {
  const cls = (el as HTMLElement).className;
  if (typeof cls === 'string') return cls;
  // SVGAnimatedString
  const baseVal = (cls as unknown as { baseVal?: string })?.baseVal;
  return baseVal ?? '';
}

function selectorOfPath(path: Array<EventTarget | null>): string {
  return path
    .filter((t): t is Element => t instanceof Element)
    .map((el) => {
      if (el.id) return `${el.nodeName.toLowerCase()}#${el.id}`;
      const cls = classOf(el).trim();
      if (cls) return `${el.nodeName.toLowerCase()}.${cls.replace(/\s+/g, '.')}`;
      return el.nodeName.toLowerCase();
    })
    .join(' ');
}

/** 从事件提取 DOM 选择器路径；document/window 非实例自动被过滤 */
export function getSelector(event: Event): string {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  if (!Array.isArray(path) || path.length === 0) return '';
  return selectorOfPath(path);
}
