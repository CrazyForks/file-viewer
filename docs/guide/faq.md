# 常见问题

## Vue2 和 Vue3 应该安装哪个包

Vue3 项目安装 `@flyfish-group/file-viewer3@1.0.8`，使用 `createApp(App).use(FileViewer)` 注册。Vue2.7 项目安装 `@flyfish-group/file-viewer@1.0.8`，使用 `Vue.use(FileViewer)` 注册。

两条包线的格式能力、示例文件、`file` / `url` 参数行为和 iframe 协议保持一致。线上 Demo `viewer.flyfish.dev` 始终使用 `v3` 分支产物作为最新体验基准。

## URL 预览为什么失败或空白

组件在浏览器里通过 `axios` 请求目标文件，所以最常见的失败原因是:

- 文件地址本身不可访问
- 服务端没有正确配置 CORS
- 鉴权信息只能在宿主系统内使用，浏览器直接请求拿不到文件

如果你的场景带有登录态、签名 URL 或内部权限体系，优先使用 `file` 参数或 [Iframe 嵌入](/guide/iframe)。

## 为什么带查询参数的下载地址有时识别不到格式

当前预览器会根据文件名扩展名判断该走哪条渲染链路。如果 URL 形如 `/download?id=123`，路径里没有明确的 `.pdf`、`.docx`、`.xlsx` 这类后缀，渲染器就很难准确识别文件类型。

这类地址最稳妥的做法是:

- 先在业务侧请求文件
- 拿到 `Blob` 或 `ArrayBuffer`
- 再包装成带正确文件名的 `File`

## 为什么一定要给父容器设置高度

预览器默认使用 `width: 100%` 和 `height: 100%` 填满父容器。如果父容器没有稳定高度，渲染区域就会塌陷，看起来像“没有内容”。

## `file` 和 `url` 同时传时，谁优先

当前行为是 `file` 优先。如果后续把 `file` 清空，而 `url` 仍然存在，组件会回退到 `url` 再次加载。

## `.doc` 和 `.docx` 的渲染实现一样吗

不一样。

- `docx` 使用 `docx-preview`
- `doc` 使用 `msdoc-viewer`

另外，`.doc` 还额外套了一层 Word 风格页面容器，让页面在灰色背景中居中展示。

## `Blob` 或 `ArrayBuffer` 能直接传给 `file` 吗

从接入经验上看，不建议直接把裸 `Blob` 或 `ArrayBuffer` 塞进去。

原因很简单: 预览器要靠文件名扩展名来选择渲染器，而裸二进制本身通常不带可靠的文件名。更稳妥的方式是:

```ts
const file = new File([blobOrBuffer], 'report.xlsx')
```

这样既保留了二进制链路，也把渲染器最依赖的扩展名补齐了。

## `xls` 和 `xlsx` 的样式能力有什么差异

当前表格预览统一走 `styled-exceljs`，会读取文件里能表达的列宽、行高、合并单元格、边框、填充和对齐等信息。差异主要来自格式本身: `xlsx` 通常保存的样式信息更完整，而 `xls/csv/ods` 等格式可能缺少部分现代样式描述。

## `html` 文件为什么是按文本显示的

因为当前版本把 `html` 放在代码/文本类型里处理，它会展示并高亮源内容，而不会把文件当作网页直接执行。这是为了保证预览行为更安全、更可控，也更适合代码和模板查看。

## 为什么 DWG 会提示转换为 DXF

DXF 当前走 `@cadview/core` 在浏览器端直接预览。DWG 是专有二进制格式，常见前端解析包存在 GPL 授权约束或需要额外转换运行时，所以组件不会默认把 DWG 解析器打进包里。业务侧可以先把 DWG 转成 DXF，再交给预览器展示。

## Excalidraw 和 draw.io 是怎么预览的

`.excalidraw` 走官方 `@excalidraw/excalidraw` 包的 `exportToSvg`，`.drawio` / `.dio` 走官方 diagrams.net `GraphViewer`。组件不会手写绘图格式解析器，只负责按需加载第三方开源能力、挂载预览容器和显示错误提示。

## EPUB 和音频是怎么预览的

`.epub` 走 `epubjs`，用于解析 EPUB 包、目录、章节资源和分页阅读。当前不内置 Kindle 专有格式或 DRM 电子书解析，建议在业务侧转换为 EPUB / PDF。

音频文件走浏览器原生 `<audio>`，支持 `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` 等扩展名入口。实际能否播放取决于浏览器对具体编码的支持，跨端最稳妥的是 MP3 或 OGG。

## PPTX 复杂模板能还原到什么程度

PPTX 是浏览器端近似渲染，不依赖 Office 本体。当前已经增强组合图形坐标、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图片转换，适合汇报材料、课件和方案回看。动画、宏、嵌入式对象和极复杂的专有 Office 特效仍建议导出 PDF，或把真实业务样本加入上线前回归。

## 代码文件会执行吗

不会。代码/文本链路使用 `highlight.js` 做源码高亮，只展示内容，不执行 `html`、`js` 或模板里的脚本。

## 大小写扩展名会影响识别吗

不会。扩展名匹配时会统一转成小写，所以 `PDF`、`DocX`、`SVG` 这类大小写差异不会影响命中。

## 为什么 `ppt` 不能像 `pptx` 一样直接打开

当前内置的是 `pptx` 渲染链路，老的二进制 `ppt` 并没有注册对应处理器。如果你的业务里大量存在 `ppt`，建议在接入侧先做格式转换，或者统一导出为 `pptx` / `pdf`。

## iframe 模式为什么要带 `from`

这是为了限制消息来源。预览器接收 `Blob` 时会校验 `event.origin === from`，只有来源匹配才会渲染，这样能避免任意页面向 iframe 注入数据。

## 大文件会不会慢

会，尤其是复杂的 Office 文档和大体积 PDF。因为解析发生在浏览器里，最终体验取决于:

- 文件体积和复杂度
- 当前设备的 CPU 和内存
- 浏览器本身的性能

如果你的业务里经常处理超大文件，建议优先用真实样本做联调测试。

## 公开仓库里为什么没有源码

公开 GitHub 仓库面向“成品分发”，提供的是混淆压缩后的组件库、可部署 Demo、文档静态产物、完整示例文件和 tarball。需要源码、二开包或商业自助开通的用户，可以前往 [https://dev.flyfish.group/shop](https://dev.flyfish.group/shop)，付费 4.99 后自助开通。

## 二开或商用需要注意什么

项目使用 `Apache-2.0` 许可证。二开或商用时，请保留许可证、版权和来源说明，并注明项目来源为 Flyfish Viewer / `@flyfish-group/file-viewer3` 或 `@flyfish-group/file-viewer`。如果修复了通用问题或增强了通用能力，建议通过 issue / PR 贡献回来。
