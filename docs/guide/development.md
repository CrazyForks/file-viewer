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
| `pnpm docs:dev` | 启动 VitePress 文档站 |
| `pnpm docs:build` | 构建 VitePress 文档站 |
| `pnpm type-check` | 执行 TypeScript 类型检查 |
| `pnpm test` | 运行测试 |

## 推荐验证顺序

```bash
pnpm type-check
pnpm build
pnpm build-lib
pnpm obfuscate
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

## 主要产物位置

- 应用构建产物: `dist/`
- 文档站构建产物: `docs/.vitepress/dist/`
- npm 包 tarball: 仓库根目录下的 `*.tgz`
- 公开 GitHub 成品仓库: 只放混淆压缩后的库产物、Demo 静态站点、文档静态站点、示例文件和 tarball，不包含源码目录

## 发版前检查清单

- README 是否和当前代码能力一致
- 文档站中的支持格式、iframe 协议和 Demo 截图是否最新
- `file` / `url` 的行为说明是否与运行逻辑一致
- 本地构建和文档构建是否全部通过
- `npm pack` 产物中是否包含正确的 `dist/` 和 README
- 混淆后的 `dist/index.mjs`、`dist/index.umd.js` 是否仍可被业务项目正常导入
- README 是否包含 npm、Demo、GitHub 成品仓库、源码自助开通和 Apache-2.0 许可证说明

## 部署建议

项目可以部署在 Vercel 或任意静态资源服务上。对外提供 Demo 时，建议:

- 使用稳定域名承载在线预览器
- 把 iframe 方案作为推荐接入方式写进对外文档
- 发布前先用本地构建产物做一次完整 smoke test

## 源码与成品分发

公开仓库用于分发可直接使用的成品；需要源码、二开包或商业自助开通的用户，请前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

二开或商用时，请保留 Flyfish Viewer / `@flyfish-group/file-viewer3` 的来源说明、许可证和版权信息。通用问题修复和通用增强建议通过 issue / PR 贡献回来。
