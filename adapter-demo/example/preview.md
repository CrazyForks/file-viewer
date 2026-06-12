# Flyfish Viewer 私有化预览

这是一份随演示应用一起发布的本地 Markdown 文件。

- React 组件通过 `@flyfish-group/file-viewer-react` 加载。
- 纯 Web 入口通过 `@flyfish-group/file-viewer-web` 挂载。
- 两个入口都使用宿主静态目录里的 `/file-viewer/index.html`。

构建后只要把 `dist` 目录部署到静态站点根路径，就能直接访问这份预览。
