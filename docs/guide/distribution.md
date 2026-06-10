# 发布与成品分发

<div class="doc-kicker">Release For Users</div>

<p class="doc-lead">
  这一页说明 Flyfish Viewer 对外分发时包含什么、如何安装、如何发布私有化 viewer 静态产物，以及源码如何自助开通。
  公开 GitHub / Gitee 成品仓库只交付混淆压缩后的构建产物、示例文件、静态文档产物、适配包和下载包。
  Gitee 镜像同步同一份成品，方便国内网络环境下载和部署。
</p>

## 分发渠道

| 渠道 | 地址 | 内容 |
| --- | --- | --- |
| 官方文档/组件主页 | [doc.flyfish.dev](https://doc.flyfish.dev) | 组件主页、接入文档、格式说明和成品分发说明 |
| 在线 Demo | [viewer.flyfish.dev](https://viewer.flyfish.dev) | 可直接体验完整预览器，用于快速验证能力 |
| 文档比对 Demo | [viewer.flyfish.dev/compare.html](https://viewer.flyfish.dev/compare.html) | 独立入口，支持左右并排预览、上传、URL、交换、重置和同步滚动 |
| Docker 镜像发布目标 | `flyfishdev/file-viewer:1.0.22` | 可一键部署的 nginx 静态镜像，发布时支持 `linux/amd64` 和 `linux/arm64` |
| npm 包(Vue3) | [@flyfish-group/file-viewer3](https://www.npmjs.com/package/@flyfish-group/file-viewer3) | Vue3 组件库，当前 latest 为 `1.0.22`，样式会随安装器自动带入 |
| npm 包(Vue2) | [@flyfish-group/file-viewer](https://www.npmjs.com/package/@flyfish-group/file-viewer) | Vue2.7 组件库，当前 latest 为 `1.0.22`，安装器会自动带上样式 |
| npm 包(React) | [@flyfish-group/file-viewer-react](https://www.npmjs.com/package/@flyfish-group/file-viewer-react) | React 17 / 18 / 19 iframe 组件，当前 latest 为 `1.0.22` |
| npm 包(纯 JS) | [@flyfish-group/file-viewer-web](https://www.npmjs.com/package/@flyfish-group/file-viewer-web) | 纯 Web iframe helper，当前 latest 为 `1.0.22` |
| 私有化 viewer 静态产物 | `file-viewer/index.html` | React、纯 JS 和 iframe 方案默认加载的 Vue3 基线预览器 |
| GitHub 成品仓库 | [github.com/flyfish-dev/file-viewer](https://github.com/flyfish-dev/file-viewer) | README、LICENSE、构建产物、示例和可下载 tarball |
| Gitee 成品仓库 | [gitee.com/flyfish-dev/file-viewer](https://gitee.com/flyfish-dev/file-viewer) | 与 GitHub 成品仓库同步的国内镜像，便于快速克隆和下载 |
| 源码自助开通 | [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop) | 付费 4.99 后自助开通源码或二开资源 |

## npm 安装

### Vue3

```bash
pnpm add @flyfish-group/file-viewer3
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer3'

createApp(App).use(FileViewer).mount('#app')
```

Vue3 入口会自动引入样式，不需要再手动 import CSS。

### Vue2.7

```bash
pnpm add @flyfish-group/file-viewer
```

```ts
import Vue from 'vue'
import App from './App.vue'
import FileViewer from '@flyfish-group/file-viewer'

Vue.use(FileViewer)

new Vue({
  render: h => h(App)
}).$mount('#app')
```

Vue2 入口会自动带上样式，不需要再额外 import CSS。

### React

```bash
npm install @flyfish-group/file-viewer-react@1.0.22
```

```tsx
import FileViewer from '@flyfish-group/file-viewer-react'

export function Preview() {
  return (
    <div style={{ height: '100vh' }}>
      <FileViewer url="/files/demo.docx" />
    </div>
  )
}
```

安装后依赖的 web 包会把 Vue3 基线 viewer 产物复制到宿主项目 `public/file-viewer`。如果使用 pnpm 10，请允许 `@flyfish-group/file-viewer-web` 的安装脚本，或执行 `pnpm exec file-viewer-copy-assets ./public/file-viewer`。如果静态目录不同，请手动执行 `npx file-viewer-copy-assets ./public/vendor/file-viewer`，并传入对应的 `viewerUrl`。复制脚本会清空目标目录并复制完整 `index.html`、`assets/*`、`vendor/*`，避免旧 hash chunk 和新入口页混用。

### 纯 JS

```bash
npm install @flyfish-group/file-viewer-web@1.0.22
```

```ts
import { mountViewerFrame } from '@flyfish-group/file-viewer-web'

mountViewerFrame(document.getElementById('viewer')!, {
  url: '/files/demo.pdf'
})

```

## 成品 tarball 安装

如果你在内网、离线环境，或者 npm 发布权限还没有完成配置，也可以直接使用公开成品仓库 `artifacts/` 里的 tarball:

```bash
npm install ./artifacts/flyfish-group-file-viewer3-1.0.22.tgz
npm install ./artifacts/flyfish-group-file-viewer-1.0.22.tgz
npm install ./artifacts/flyfish-group-file-viewer-web-1.0.22.tgz
npm install ./artifacts/flyfish-group-file-viewer-react-1.0.22.tgz
```

Vue3、Vue2、React 和纯 JS tarball 都会随公开成品仓库一起生成。React tarball 会依赖同版本的 `@flyfish-group/file-viewer-web`，所以离线安装时请先安装 web 包，再安装 React 包。

## 成品仓库内容

公开 GitHub / Gitee 成品仓库只用于成品交付，不包含当前源码目录。仓库内容通常包括:

- `dist/`: 混淆压缩后的组件库产物
- `demo/`: 可独立部署的私有化预览器静态站点
- `docs/`: VitePress 文档静态站点
- `Dockerfile` / Docker Hub 标签: 可直接部署的静态镜像构建与发布信息
- `example/`: 完整样例文件列表
- `artifacts/`: npm tarball、适配包 tarball、Demo tarball、文档 tarball
- `packages/web/viewer/`: React、纯 JS 和 iframe 适配层共用的 Vue3 基线 viewer 产物
- `README.md`: 默认中文入口，提供友好的安装、嵌入、下载和授权说明
- `README.en.md`: 完整英文入口，与中文 README 互相提供语言切换链接，便于海外客户快速评估和接入
- `LICENSE`: 项目许可证

其中 `README.md` 会承担公开仓库首页职责，写明官方文档、在线 Demo、npm 包、私有化部署、成品目录和源码开通入口。`docs/` 是文档站静态构建产物，可部署到任何静态资源服务中。

公开 GitHub / Gitee 成品仓库和源码仓库保持分离，源码只在内部仓库维护；公开仓库只保留可直接部署或下载的成品。

## 发版命令

Vue 组件 npm 包线分别在对应分支发布:

| 技术栈 | 分支 | npm 包 |
| --- | --- | --- |
| Vue3 | `v3` | `@flyfish-group/file-viewer3` |
| Vue2.7 | `main` | `@flyfish-group/file-viewer` |

发布前建议在目标分支执行:

```bash
pnpm type-check
pnpm build
pnpm build-lib-only
pnpm obfuscate
pnpm docs:build
npm pack
```

其中 `pnpm obfuscate` 会处理 `dist/` 中的 `.js` / `.mjs` 文件。类型声明、CSS、图片和示例文件不会被混淆，便于业务方正常接入和排查。

正式发布前建议先执行:

```bash
npm publish --dry-run --access public
```

确认包名、版本、README 和 `dist/` 文件无误后，再执行 `npm publish --access public`。如果 npm 账号启用了 MFA，请使用交互式会话完成浏览器确认。

React 和纯 JS 适配包在当前仓库内发布:

```bash
pnpm type-check:adapters
pnpm build:adapter-demo
pnpm release:adapters:pack
pnpm -C packages/web publish --access public --dry-run
pnpm -C packages/react publish --access public --dry-run
pnpm release:adapters:publish
```

`release:adapters:pack` 会先构建 Vue3 基线 viewer 并同步到 `packages/web/viewer`，再分别打包 `@flyfish-group/file-viewer-web` 和 `@flyfish-group/file-viewer-react`。发布前请确认 tarball 中包含 `viewer/index.html`、`viewer/assets/*`、`dist/*` 和 README，且没有 `.DS_Store`。

## Docker 镜像发布

Docker 镜像用于一键部署主 Demo 和文档比对页。发布前先确保 Docker Hub 已登录，并且当前账号对 `flyfishdev/file-viewer` 有推送权限:

```bash
docker login
DOCKER_IMAGE=flyfishdev/file-viewer pnpm docker:publish
```

默认会推送 `1.0.22` 和 `latest` 两个标签，并生成 `linux/amd64` / `linux/arm64` 多架构 manifest。发布后至少验证:

```bash
docker run --rm -p 8080:80 flyfishdev/file-viewer:1.0.22
```

然后打开 `/`、`/compare.html` 和 `/healthz`。

## 授权和贡献

项目使用 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。

如果你修复了通用问题或增强了通用能力，建议通过 issue / PR 一起贡献回来。这样后续升级时，大家都能少走一点弯路。
