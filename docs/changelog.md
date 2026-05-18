# 更新日志

这份日志记录的是当前仓库主线中，对外最值得说明的能力演进。

## 当前主线

### `v1.0.6` 成品分发版本

- 新增 PDF 缩放工具栏、页码状态和可显隐页面导航窗格
- 补齐 OFD、CAD、代码高亮与完整示例文件盒子
- 增加 `pnpm obfuscate` 与 `pnpm release:pack`，库产物支持压缩混淆后分发
- README、文档站和公开成品仓库说明同步补充 npm、GitHub、源码自助开通、授权与贡献说明
- npm tarball 只包含 `README.md`、`LICENSE` 和混淆压缩后的 `dist/`

### 文档站与交付说明完善

- 重写 README 与 VitePress 文档结构
- 增加 Demo 说明、本地开发与打包说明
- 补充截图、接入建议与发布前检查清单

### `.doc` 渲染能力升级

- 使用 `msdoc-viewer` 替换旧的 `.doc` 解析方案
- 将 `.doc` 内容渲染在 Word 风格页面容器中
- 增加灰色工作台、白色纸张与页面居中展示效果

### 示例与工程体验

- 提供更清晰的本地 Demo 入口说明
- 支持将预览器独立部署并通过 iframe 集成
- 本地构建、文档站构建与 npm 打包链路持续收敛

## 历史版本

### `v1.0.3`

- 修复与优化 PDF 字体、缩放和 Excel 样式相关问题

### 更早版本

- 优化 PPTX 加载性能
- 补强 Word 与 Excel 的基础预览能力
- 持续完善 TypeScript 与 Vue 3 版本实现

<div class="doc-note">
  npm 包版本请以 `package.json` 和实际发布记录为准；本页更偏向说明“这个仓库当前已经演进到了哪里”。
</div>
