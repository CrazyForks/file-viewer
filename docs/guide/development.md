# 本地开发与打包

<div class="doc-kicker">Build With Confidence</div>

<p class="doc-lead">
  当你准备发布一个可分发组件时，代码、文档、Demo 和打包产物最好能在本地一次性对齐。
  这一页把常用命令、建议验证顺序和发版前检查项整理在一起，方便团队复用。
</p>

## 安装依赖

```bash
pnpm install
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动示例站点 |
| `pnpm build` | 构建示例站点 |
| `pnpm build-lib` | 构建组件库产物 |
| `pnpm obfuscate` | 对 `dist/` 中的库 JS 产物做压缩混淆 |
| `pnpm release:pack` | 类型检查、库构建、混淆并生成 npm tarball |
| `pnpm build:viewer-assets` | 构建 Vue3 基线 viewer，并同步到 `packages/web/viewer` |
| `pnpm build:adapters` | 构建 Vue3 基线 viewer、纯 JS 包和 React 包 |
| `pnpm verify:demo-output` | 校验 Demo 多入口 HTML 及其引用的静态资源，防止比对页或 hash 资源漏传 |
| `pnpm deploy:cloudflare` | 构建 Demo、校验多入口产物，并通过 Wrangler Direct Upload 发布到 Cloudflare Pages |
| `pnpm docs:deploy:cloudflare` | 构建文档站，并发布到 `flyfish-file-viewer-docs` Cloudflare Pages 项目 |
| `pnpm docker:build` | 使用 Dockerfile 构建本机架构镜像 |
| `pnpm docker:publish` | 使用 buildx 推送 `linux/amd64` / `linux/arm64` Docker Hub 镜像 |
| `pnpm dev:adapters` | 启动 React + 纯 JS 私有化适配层 Demo |
| `pnpm build:adapter-demo` | 构建适配层 Demo，验证上线静态产物 |
| `pnpm release:adapters:pack` | 构建并打包 React / 纯 JS npm tarball |
| `pnpm release:adapters:publish` | 构建并发布 React / 纯 JS npm 包 |
| `pnpm docs:dev` | 启动 VitePress 文档站 |
| `pnpm docs:build` | 构建 VitePress 文档站 |
| `pnpm type-check` | 执行 Vue3 基线 TypeScript 类型检查 |
| `pnpm type-check:adapters` | 执行 React / 纯 JS 适配包类型检查 |
| `pnpm test` | 运行测试 |

## 推荐验证顺序

```bash
pnpm type-check
pnpm type-check:adapters
pnpm build
pnpm build-lib
pnpm obfuscate
pnpm build:adapter-demo
pnpm docker:build
pnpm release:adapters:pack
pnpm docs:build
pnpm test
```

如果你要发布 npm 包，再执行:

```bash
npm pack
```

或者直接使用项目内置的发包准备命令:

```bash
pnpm release:pack
```

## Vue2 / Vue3 / React / 纯 JS 发版

当前四条 npm 包线都使用 `1.0.21`:

| 技术栈 | 分支 | npm 包 | 注册方式 |
| --- | --- | --- | --- |
| Vue3 | `v3` | `@flyfish-group/file-viewer3` | `createApp(App).use(FileViewer)` |
| Vue2.7 | `main` | `@flyfish-group/file-viewer` | `Vue.use(FileViewer)` |
| React 17 / 18 / 19 | 当前仓库子工程 | `@flyfish-group/file-viewer-react@1.0.21` | `<FileViewer url="/files/demo.pdf" />` |
| 纯 JS | 当前仓库子工程 | `@flyfish-group/file-viewer-web@1.0.21` | `mountViewerFrame(container, options)` |

Vue3 和 Vue2 发版时请先切到对应分支，再运行类型检查、库构建、混淆和 `npm publish --access public`。React 和纯 JS 包在当前仓库内作为子工程发布，发版前必须先执行 `pnpm build:viewer-assets`，确保随包携带的是最新 Vue3 基线 viewer 静态产物。

## 主要产物位置

- 应用构建产物: `dist/`
- Docker 镜像运行产物: `dist/` 会被复制到 nginx 的 `/usr/share/nginx/html/`
- 文档站构建产物: `docs/.vitepress/dist/`
- npm 包 tarball: 仓库根目录下的 `*.tgz`，适配包 tarball 位于 `.release/adapters/`
- React / 纯 JS 随包 viewer 产物: `packages/web/viewer/`
- 适配层 Demo 构建产物: `packages/demo/dist/`
- 公开 GitHub / Gitee 成品仓库: 只放混淆压缩后的库产物、Demo 静态站点、文档静态站点、示例文件和 tarball，不包含源码目录

## 发版前检查清单

- README 是否和当前代码能力一致
- README 和文档站是否同时写清 Vue3 / Vue2 / React / 纯 JS 包名、版本和接入方式
- 文档站中的支持格式、iframe 协议和 Demo 截图是否最新
- `file` / `url` 的行为说明是否与运行逻辑一致
- 本地构建和文档构建是否全部通过
- React / 纯 JS 适配层 Demo 是否在开发服务和 build preview 中都能显示内容
- `packages/web/viewer` 是否已经由最新 Vue3 基线构建产物同步
- `npm pack` 产物中是否包含正确的 `dist/` 和 README
- React / 纯 JS tarball 是否包含 `viewer/`、`dist/`、README，且不包含 `.DS_Store`
- 混淆后的 `dist/index.mjs`、`dist/index.umd.js` 是否仍可被业务项目正常导入
- README 是否包含官方文档、在线 Demo、npm(Vue3/Vue2/React/纯 JS)、私有化部署、GitHub / Gitee 成品仓库、源码自助开通和 Apache-2.0 许可证说明

## 部署建议

项目可以部署在 Cloudflare Pages、Vercel 或任意静态资源服务上。对外提供 Demo 和文档站时，建议:

- 使用稳定域名承载官网 Demo，方便用户快速验证能力
- 性能敏感场景优先使用 Cloudflare Pages / CDN 边缘节点承载 Demo 和文档静态产物，并保持 `viewer.flyfish.dev`、`doc.flyfish.dev` 作为唯一对外域名
- Cloudflare Pages Direct Upload 可执行 `CLOUDFLARE_PAGES_PROJECT=flyfish-file-viewer pnpm deploy:cloudflare`，项目名可按控制台实际项目覆盖
- 文档站 Cloudflare Pages Direct Upload 可执行 `pnpm docs:deploy:cloudflare`，默认发布到 `flyfish-file-viewer-docs`
- 首次切换到 Cloudflare Pages 时，需先在 Pages 项目中添加 `viewer.flyfish.dev` 自定义域名；如果 `flyfish.dev` 的 DNS 不在当前 Cloudflare 账号，需要在 DNS 托管处把 `viewer.flyfish.dev` 的 CNAME 指向 `flyfish-file-viewer.pages.dev`
- 文档站切到 Cloudflare Pages 时同理，需要把 `doc.flyfish.dev` 添加到 `flyfish-file-viewer-docs` 的自定义域名，并让 DNS CNAME 指向 `flyfish-file-viewer-docs.pages.dev`
- `public/_headers` 已为哈希资源、WASM/Worker、示例文件和 HTML 配置缓存策略，部署到 Cloudflare 后会自动生效
- `docs/public/_headers` 已为 VitePress 文档站的哈希资源、图片和 HTML 配置缓存策略，部署到 Cloudflare 后会自动生效
- React / 纯 JS 包默认仍只加载用户项目内的私有化 viewer 静态产物
- Docker 镜像发布后可直接运行 `flyfishdev/file-viewer:1.0.20`，主预览入口是 `/`，文档比对入口是 `/compare.html`
- 把 iframe 方案作为推荐接入方式写进对外文档
- 发布前先用本地构建产物做一次完整 smoke test

## 源码与成品分发

公开仓库用于分发可直接使用的成品；需要源码、二开包或商业自助开通的用户，请前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

二开或商用时，请保留 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer` 的来源说明、许可证和版权信息。通用问题修复和通用增强建议通过 issue / PR 贡献回来。
