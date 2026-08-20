import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    // 本份先跑并清空 outDir；后一份 umd 追加产物，避免被 clean 清掉
    clean: true,
    target: 'es2018',
    sourcemap: true,
    outExtension() {
      return { js: '.js' };
    },
  },
  {
    entry: ['src/index.ts'],
    format: ['umd'],
    globalName: 'TkMonitor',
    // 浏览器 <script> 加载无模块系统，外部化的依赖会退化为全局变量查找
    // （global.webVitals → undefined），必须内联
    noExternal: ['web-vitals'],
    // esbuild 已不支持 umd 输出格式，umd 需开启 treeshake 借助 rollup 管线生成
    treeshake: true,
    clean: false,
    target: 'es2018',
    sourcemap: true,
    outExtension() {
      return { js: '.umd.js' };
    },
  },
]);
