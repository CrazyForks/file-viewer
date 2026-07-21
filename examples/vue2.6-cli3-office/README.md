# Vue 2.6 + Vue CLI 3 + preset-office 独立示例

这个示例用于复现并解决旧 Vue 2.6 项目中导入 `@file-viewer/preset-office` 后构建失败的问题。技术栈按客户提供的 `package.json` 抽取典型组合：`vue@2.6`、`@vue/cli-service@3.1`、webpack 4、Element UI、Ant Design Vue 1.x、`babel-polyfill` 和 Office preset。

```bash
cd examples/vue2.6-cli3-office
npm install
npm run serve
```

Node 17+ 运行 webpack 4 时可能遇到 OpenSSL/MD4 报错，可临时使用：

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

## 关键点

- `options.preset` 显式传入 `officePreset`，轻量 Vue 2.6 组件不会自动包含 PDF/Office renderer。
- `vue.config.js` 里对 `@file-viewer/*`、`pdfjs-dist`、`e-virt-table`、`styled-exceljs` 做选择性 Babel 转译。
- webpack 4 不识别 package `exports` 子路径时，通过 alias 兼容 `@file-viewer/core/assets`、`browser`、`headless`。
- webpack 4 默认优先读取 `@file-viewer/docx` 的 UMD `browser` 入口；该入口再经过 Babel 转译会丢失 CommonJS 导出，因此示例把包根 alias 到 `dist/docx-preview.mjs`，避免上传 DOCX 时出现 `renderAsync is not a function`。
- `build/rename-pdfjs-webpack-require.cjs` 处理 PDF.js legacy `.mjs` 自带 webpack 包装代码，避免和宿主 webpack 4 注入的 `__webpack_require__` 同名冲突。
- 二进制 `.ppt` 使用 `@file-viewer/ppt@0.3.2` Worker/OffscreenCanvas/WASM 引擎；示例会把其 ESM、Worker、帧缓存、WASM、CJK 字体、manifest、package metadata、LICENSE 与 NOTICE 九个文件完整复制到 `public/file-viewer/vendor/ppt/`。`.pptx` 仍使用独立 Worker。PPTX 依赖里的 `import.meta.url` 由示例中的 Babel 小插件兼容 webpack 4。
- `scripts/copy-file-viewer-assets.cjs` 把 PDF、DOCX、Excel、PPT 和 PPTX 的 Worker、CMap、WASM、标准字体及 vendor 资源复制到 `public/file-viewer/`，满足离线部署；`src/fileViewerOptions.js` 已配置这套旧构建链需要的本地 PPT/PPTX URL，业务侧无需再拼路径。
- `.env.normalServe` / `.env.noApiServe` 使用 `NODE_ENV=production` 预览，是为了绕开 Vue CLI 3.1 dev server 对 HMR 客户端的强注入；客户项目如需开发热更新，建议先用这个示例确认构建链，再把兼容配置搬回真实工程。

如果客户项目仍使用 `node-sass@4`，建议使用 Node 14/16；Node 18+ 安装 `node-sass@4` 经常会在原生编译阶段失败。这个示例没有使用 Sass，因此没有把 `node-sass` 放进依赖。
