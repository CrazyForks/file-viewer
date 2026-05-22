# Demo 说明

<div class="doc-kicker">See It Before You Ship It</div>

<p class="doc-lead">
  一个好用的 Demo，不只是“给别人看看”，也是团队内部确认能力边界、联调文件样本和复现问题的最快入口。
  当前仓库已经为所有已注册格式准备了可切换入口，适合在本地开发、依赖升级和上线前做完整回归。
</p>

## 本地可用的两个入口

| 入口 | 地址 | 适合做什么 |
| --- | --- | --- |
| 主示例页 | `/` | 切换预置文件、上传本地文件、快速确认各类格式表现 |
| iframe 示例页 | `/example/embedded.html` | 验证独立部署与二进制推送协议 |
| 适配层 Demo | `packages/demo` | 同时验证 React 组件和纯 JS helper 的私有化 iframe 集成 |

## 主示例页

主示例页内置了完整示例列表，包括 Word、Excel、PPT、PDF、OFD、DXF、Excalidraw、draw.io、EPUB、UMD、Markdown、代码/文本、图片、音频与视频。示例选择器按文件类型分组展示，每个样例都提供图标、格式名和文件名，点击后会立即打开并自动收起选择器。它适合做三件事:

- 快速演示当前项目支持哪些文件类型
- 用本地上传验证 `file` 方案
- 在修改渲染逻辑后做肉眼回归检查

<div class="doc-shot">
  <img src="/_images/demo-main.png" alt="主示例页截图" />
  <p class="doc-caption">主示例页提供分组样例文件盒子、URL 预览和上传预览，是最直接的联调入口。</p>
</div>

## Word 页面效果

Word 示例被单独拿出来说明，因为它已经不只是“能打开”，而是具备更明确的页面感。`.doc` 和 `.docx` 都会尽量保留灰色页面底、白色纸张、页面居中和宽度自适应的阅读体验。

<div class="doc-shot">
  <img src="/_images/demo-doc.png" alt="DOC 文件渲染截图" />
  <p class="doc-caption">Word 文件会显示在灰色工作台中的白色纸张上，页面居中，阅读体验更接近真实文档。</p>
</div>

## iframe 示例页

`public/example/embedded.html` 演示了宿主页面如何下载文件，再把 `Blob` 推送给预览器。

<div class="doc-shot">
  <img src="/_images/demo-iframe.png" alt="Iframe 示例页截图" />
  <p class="doc-caption">iframe 示例适合验证跨系统集成路径，尤其适合做带鉴权文件的联调。</p>
</div>

## React / 纯 JS 适配层 Demo

仓库中的 `packages/demo` 会把 `packages/web/viewer` 同步到自己的 `public/file-viewer`，页面上同时挂载 React 组件和纯 JS helper。调试时运行:

```bash
pnpm dev:adapters
```

构建上线前运行:

```bash
pnpm build:adapter-demo
pnpm --filter @flyfish-group/file-viewer-demo preview
```

如果开发服务和 build preview 中两个面板都能显示同一份 Markdown 示例，就说明 npm 包默认的 `/file-viewer/index.html` 私有化路径可用。

## 示例文件清单

仓库中当前提供的示例文件位于 `public/example/`:

代码、配置和日志类样本已经按真实集成场景扩充，不再只是几行占位内容；它们会覆盖注释、函数、类型、嵌套配置、SQL CTE、Shell 参数、diff 块和长内容滚动，适合验证代码高亮的实际可读性。CAD、3D、绘图、音频和 EPUB 样本使用公开文件或项目内最小夹具，UMD 电子书样本由项目内生成，来源记录在 `public/example/SOURCES.md`。

| 文件 | 用途 | 对应能力 |
| --- | --- | --- |
| `test.doc` | 验证老 Word 文档链路 | `doc` + Word 风格页面容器 |
| `word.docx` | 验证现代 Word 文档 | `docx` |
| `excel.xlsx` | 验证表格样式链路 | `xlsx` |
| `excel.xlsm` | 验证宏工作簿扩展名映射 | `xlsm` |
| `excel.xlsb` | 验证二进制工作簿扩展名映射 | `xlsb` |
| `excel.xls` | 验证老 Excel 扩展名映射 | `xls` |
| `table.csv` | 验证轻量数据表格链路 | `csv` |
| `excel.ods` | 验证 OpenDocument 表格扩展名映射 | `ods` |
| `excel.fods` | 验证 Flat ODS 扩展名映射 | `fods` |
| `excel.numbers` | 验证 Numbers 扩展名映射 | `numbers` |
| `ppt.pptx` | 验证演示文稿渲染、组合图形、主题背景和图片资源 | `pptx` |
| `pdf.pdf` | 验证 PDF 阅读体验、缩放工具栏和页面导航窗格 | `pdf` |
| `ofd.ofd` | 验证 OFD 在线预览 | `ofd` |
| `drawing.dxf` | 使用公开 DXF 样例验证 CAD 图纸预览、平移、缩放和图层控制 | `dxf` |
| `sample.dwg` | 使用公开 DWG 样例验证 DWG 内嵌预览图提取和原因提示 | `dwg` |
| `model.gltf` | 使用项目内嵌入数据的最小 glTF 验证 Web 3D 预览 | `gltf` |
| `model.obj` | 使用项目内生成的 OBJ 四面体验证 OBJ 几何预览 | `obj` |
| `model.stl` | 使用项目内生成的 STL 四面体验证 STL 几何预览 | `stl` |
| `model.ply` | 使用项目内生成的 PLY 四面体验证 PLY 几何预览 | `ply` |
| `model.step` | 使用项目内生成的最小 STEP 验证工程 CAD 格式转换原因提示 | `step` |
| `flow.excalidraw` | 使用公开 Excalidraw 图纸验证官方恢复与 SVG 导出预览 | `excalidraw` |
| `process.drawio` | 使用官方 draw.io 示例验证 diagrams.net Viewer 预览 | `drawio` |
| `book.epub` | 使用 Project Gutenberg 公开 EPUB 验证电子书目录和滚动阅读 | `epub` |
| `book.umd` | 使用项目内生成的 UMD 电子书验证元数据、目录和 zlib 正文解析 | `umd` |
| `markdown.md` | 验证 Markdown 阅读样式 | `md` |
| `notes.markdown` | 验证 Markdown 长扩展名 | `markdown` |
| `text.txt` | 验证纯文本展示 | `txt` |
| `data.json` | 验证 JSON 高亮 | `json` |
| `code.js` | 验证 JavaScript 高亮 | `js` |
| `code.mjs` | 验证 ES Module JavaScript 高亮 | `mjs` |
| `code.cjs` | 验证 CommonJS JavaScript 高亮 | `cjs` |
| `code.ts` | 验证 TypeScript 高亮 | `ts` |
| `code.tsx` | 验证 TSX 高亮 | `tsx` |
| `code.jsx` | 验证 JSX 高亮 | `jsx` |
| `code.css` | 验证 CSS 高亮 | `css` |
| `page.html` | 验证 HTML 源码展示，不作为网页执行 | `html` |
| `page.htm` | 验证 HTM 源码展示，不作为网页执行 | `htm` |
| `data.xml` | 验证 XML 高亮 | `xml` |
| `component.vue` | 验证 Vue 单文件组件高亮 | `vue` |
| `config.yaml` | 验证 YAML 高亮 | `yaml` |
| `config.yml` | 验证 YML 高亮 | `yml` |
| `settings.ini` | 验证 INI 高亮 | `ini` |
| `script.sh` | 验证 Shell 脚本高亮 | `sh` |
| `script.bash` | 验证 Bash 脚本高亮 | `bash` |
| `query.sql` | 验证 SQL 高亮 | `sql` |
| `main.go` | 验证 Go 高亮 | `go` |
| `main.rs` | 验证 Rust 高亮 | `rs` |
| `index.php` | 验证 PHP 高亮 | `php` |
| `main.c` | 验证 C 高亮 | `c` |
| `main.cpp` | 验证 C++ 高亮 | `cpp` |
| `module.cc` | 验证 C++ 兼容扩展名高亮 | `cc` |
| `main.h` | 验证 C/C++ 头文件高亮 | `h` |
| `main.hpp` | 验证 C++ 头文件高亮 | `hpp` |
| `program.cs` | 验证 C# 高亮 | `cs` |
| `change.diff` | 验证 diff 高亮 | `diff` |
| `code.java` | 验证 Java 高亮 | `java` |
| `code.py` | 验证 Python 高亮 | `py` |
| `app.log` | 验证日志文本展示 | `log` |
| `pic.png` | 验证 PNG 图片预览 | `png` |
| `pic.jpg` | 验证 JPG 图片预览 | `jpg` |
| `pic.jpeg` | 验证 JPEG 图片预览 | `jpeg` |
| `pic.gif` | 验证 GIF 图片预览 | `gif` |
| `pic.bmp` | 验证 BMP 图片预览 | `bmp` |
| `pic.tiff` | 验证 TIFF 图片预览 | `tiff` |
| `pic.tif` | 验证 TIF 图片预览 | `tif` |
| `vector.svg` | 验证 SVG 图片预览 | `svg` |
| `pic.webp` | 验证 WEBP 图片预览 | `webp` |
| `audio.mp3` | 使用 MDN CC0 音频验证 MP3 原生播放 | `mp3` |
| `audio.ogg` | 使用 Wikimedia Commons 音频验证 OGG 原生播放 | `ogg` |
| `video.mp4` | 验证视频播放 | `mp4` |

<div class="doc-note">
  部分兼容格式示例复用了同一份可解析内容来覆盖扩展名入口，例如表格兼容格式和图片兼容格式。上线前仍建议使用业务真实文件补一轮回归。
</div>

## 完整覆盖与绘图说明

上面的清单已经覆盖当前注册的全部扩展名。DWG 当前作为 CAD 兼容入口保留，打开 `.dwg` 时会尽量提取内嵌预览图；如果客户需要完整 DWG 几何解析，建议在业务侧转换为 DXF 后再交给前端预览，避免把 GPL 或闭源 DWG 解析运行时打进组件包。

3D 模型示例覆盖 glTF、OBJ、STL、PLY 四条最常用的浏览器模型入口；FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ、PCD、VRML/WRL、XYZ、VTK/VTP 等扩展名也已经注册到同一个 Three.js 预览器。STEP/IGES/IFC/3DM 会展示转换原因，建议用客户真实模型补充回归。

Excalidraw 使用官方 `@excalidraw/excalidraw` 的 `restore` 补齐真实公开文件中常见的精简字段，再通过 `exportToSvg` 生成只读 SVG；draw.io / diagrams.net 文件使用官方 `GraphViewer` 渲染 mxGraphModel / mxfile。组件不自行实现绘图格式解析，只做按需加载、容器挂载和错误提示。

## 公开样例来源

| 示例 | 来源 | 许可 |
| --- | --- | --- |
| `drawing.dxf` | `mozman/ezdxf` 的 `examples_dxf/wipeout_door.dxf` | MIT |
| `sample.dwg` | `dshn06/cad-webviewer-unity` 的 `baseline-sample.dwg` | MIT |
| `model.gltf` / `model.obj` / `model.stl` / `model.ply` / `model.step` | 项目内生成的最小 3D fixture | Apache-2.0 |
| `flow.excalidraw` | `neo4j-labs/agent-memory` 的 `poleo-model.excalidraw` | Apache-2.0 |
| `process.drawio` | `jgraph/drawio-diagrams` 的 `blog/data-flow.drawio` | Apache-2.0 |
| `book.umd` | 项目内生成的最小 UMD 文本电子书 fixture | Apache-2.0 |
| `audio.mp3` | MDN interactive examples 的 `t-rex-roar.mp3` | CC0 |
| `audio.ogg` | Wikimedia Commons 的 `Example.ogg` | CC BY-SA 3.0 |
| `book.epub` | Project Gutenberg 的 `Alice's Adventures in Wonderland` EPUB | Public domain in the USA |

这些样例的作用是验证预览器兼容性，不承诺覆盖你业务中所有 CAD 图元、绘图插件、UMD 方言或打包器输出。上线前仍建议把自己的高频文件加入回归清单。

## 建议保留一套自己的回归样本

如果你要把这个项目接进正式业务，建议你把下面这几类文件各留一份，形成自己的最小回归集:

- 一份版式复杂的 `docx`
- 一份历史 `.doc`
- 一份带合并单元格和颜色的 `xlsx`
- 一份兼容格式表格，比如 `xls` 或 `csv`
- 一份业务里最常见的 `pdf`
- 一份真实 OFD 发票或归档件
- 一份 DXF 图纸
- 一份 Excalidraw 或 draw.io 图纸
- 一份 EPUB 或 UMD 电子书
- 一份 Markdown 说明文档
- 一份日志或配置文件，比如 `log` / `json`
- 一份源码文件，比如 `ts` / `py` / `java`
- 一份 `svg` 或 `webp` 图片
- 一份业务常用音频，比如 `mp3` 或 `ogg`

这样每次升级预览器、调整依赖或准备发版时，都能快速知道“这次有没有把关键能力碰坏”。

<div class="doc-note">
  建议你先用仓库内置样本确认主链路，再用自己的真实文件补一轮回归。前者帮你判断“项目本身能不能跑”，后者帮你判断“它能不能真正接住你的业务”。
</div>
