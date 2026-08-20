// 本地演示后端：静态服务 demo 页 + 接收上报 + 提供测试接口
// 用法：pnpm demo → http://localhost:3000/demo/
const express = require('express');
const path = require('path');

const app = express();

// 全量请求日志：调试上报链路用
app.use((req, _res, next) => {
  console.log(`[req] ${req.method} ${req.url}`);
  next();
});

// CORS：允许从其他本地开发页面（如 vite 项目）指向本服务测试上报
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    return res.set('Access-Control-Allow-Headers', '*').set('Access-Control-Allow-Methods', '*').end();
  }
  next();
});

// sendBeacon 默认 Content-Type 为 text/plain，需放宽解析类型
app.use(express.json({ type: '*/*' }));

// 上报接口：打印每批事件
app.post('/collect', (req, res) => {
  const events = Array.isArray(req.body) ? req.body : [req.body];
  console.log(`\n=== 收到上报 ${events.length} 条 ===`);
  events.forEach((e) => console.log(JSON.stringify(e)));
  res.status(204).end();
});

// 演示接口：返回 404（触发 xhr 错误上报）
app.get('/api/demo-404', (_req, res) => {
  res.status(404).json({ error: 'demo not found' });
});

// 演示接口：延迟 6s（超过默认慢请求阈值 5000ms，触发慢请求上报）
app.get('/api/demo-delay', (_req, res) => {
  setTimeout(() => res.json({ ok: 1 }), 6000);
});

// 静态服务项目根目录：/demo/ 页面与 /dist UMD 产物均可直接访问
app.use(express.static(path.join(__dirname, '..')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`demo server: http://localhost:${PORT}/demo/`);
  console.log('上报接口 POST /collect，测试接口 GET /api/demo-404、GET /api/demo-delay');
});
