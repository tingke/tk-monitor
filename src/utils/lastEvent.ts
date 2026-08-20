let lastEvent: Event | undefined;

['click', 'touchstart', 'mousedown', 'keydown', 'mouseover'].forEach((type) => {
  document.addEventListener(
    type,
    (event) => {
      lastEvent = event;
    },
    { capture: true, passive: true },
  );
});

/** 最近一次用户交互事件，用于错误行为溯源 */
export function getLastEvent(): Event | undefined {
  return lastEvent;
}
