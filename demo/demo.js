// 本地演示：debug 模式把每条事件打印到页面与控制台
const eventsEl = document.getElementById('events');
eventsEl.textContent = '';

TkMonitor.init({
  appId: 'demo-app',
  // 同源上报到本地演示后端（pnpm demo 启动，见 demo/server.js）
  endpoint: 'http://localhost:3000/demo/collect',
  debug: true,
  beforeSend: (event) => {
    eventsEl.textContent += JSON.stringify(event, null, 2) + '\n\n';
    return event; // 不丢弃，继续正常上报链路
  },
});

document.getElementById('js-error').addEventListener('click', () => {
  window.someUndefinedVar.error = 'boom';
});
document.getElementById('promise-error').addEventListener('click', () => {
  new Promise((_, reject) => reject(new Error('promise rejected')));
});
document.getElementById('resource-error').addEventListener('click', () => {
  const img = new Image();
  // 必须插入 DOM：脱离文档树的元素 error 事件不会传播到 window，插件收不到
  document.body.appendChild(img);
  img.src = '/not-exist-' + Date.now() + '.jpg';
});
document.getElementById('xhr-500').addEventListener('click', () => {
  const xhr = new XMLHttpRequest();
  // 指向本地相对路径，静态服务下必 404，稳定触发 xhr 失败事件
  xhr.open('GET', '/api/demo-404');
  xhr.send();
});
document.getElementById('fetch-500').addEventListener('click', () => {
  // 指向本地相对路径，静态服务下必 404，fetch 因非 2xx 状态码上报
  fetch('/api/demo-404');
});
document.getElementById('slow-xhr').addEventListener('click', () => {
  // 本地后端延迟 6s 返回，超过默认慢请求阈值 5000ms，触发慢请求上报
  fetch('/api/demo-delay');
});
document.getElementById('pv').addEventListener('click', () => {
  location.hash = '/page-' + Date.now();
});
