# File Viewer 私有化预览

这是一份随演示应用一起发布的本地 Markdown 文件。

- React 组件通过标准包 `@file-viewer/react` 加载。
- 纯 Web 入口通过标准包 `@file-viewer/web` 挂载。
- Full 包已内置 `preset-all`；Vite 使用 `copyAssets:true` 自动发布 Worker/WASM/字体/vendor 资源，非 Vite 项目运行随包同版本的 `npx --no-install file-viewer-copy-assets ./public/file-viewer`。
- 完整部署 `@file-viewer/web-full/dist/` 时资源已随目录提供，无需再次复制。

构建后只要把 `dist` 目录部署到静态站点根路径，就能直接访问这份预览。
