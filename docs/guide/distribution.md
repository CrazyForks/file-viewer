# 发布与成品分发

<div class="doc-kicker">Release For Users</div>

<p class="doc-lead">
  这一页说明 Flyfish Viewer 对外分发时包含什么、如何安装、如何下载成品，以及源码如何自助开通。
</p>

## 分发渠道

| 渠道 | 地址 | 内容 |
| --- | --- | --- |
| 官方文档/组件主页 | [doc.flyfish.dev](https://doc.flyfish.dev) | 组件主页、接入文档、格式说明和成品分发说明 |
| 在线 Demo | [viewer.flyfish.dev](https://viewer.flyfish.dev) | 可直接体验完整预览器 |
| npm 包 | [@flyfish-group/file-viewer3](https://www.npmjs.com/package/@flyfish-group/file-viewer3) | Vue 3 组件库，包含混淆压缩后的 `dist/` |
| GitHub 成品仓库 | [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer) | README、LICENSE、构建产物、示例和可下载 tarball |
| 源码自助开通 | [dev.flyfish.group/shop](https://dev.flyfish.group/shop) | 付费 4.99 后自助开通源码或二开资源 |

## npm 安装

```bash
pnpm add @flyfish-group/file-viewer3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer3'

createApp(App).use(FileViewer).mount('#app')
```

## 成品仓库内容

公开 GitHub 仓库只用于成品交付，不包含当前源码目录。仓库内容通常包括:

- `dist/`: 混淆压缩后的组件库产物
- `demo/`: 可独立部署的在线预览器静态站点
- `docs/`: VitePress 文档静态站点
- `example/`: 完整样例文件列表
- `artifacts/`: npm tarball、Demo tarball、文档 tarball
- `README.md`: 友好的安装、嵌入、下载和授权说明
- `LICENSE`: 项目许可证

其中 `README.md` 会承担公开仓库首页职责，写明官方文档、在线 Demo、npm 包、成品目录和源码开通入口。`docs/` 则是官方文档站的静态构建产物，可部署到任何静态资源服务中。

## 发版命令

```bash
pnpm type-check
pnpm build
pnpm build-lib-only
pnpm obfuscate
pnpm docs:build
npm pack
```

其中 `pnpm obfuscate` 会处理 `dist/` 中的 `.js` / `.mjs` 文件。类型声明、CSS、图片和示例文件不会被混淆，便于业务方正常接入和排查。

## 授权和贡献

项目使用 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3`。

如果你修复了通用问题或增强了通用能力，建议通过 issue / PR 一起贡献回来。这样后续升级时，大家都能少走一点弯路。
