# 支持格式

<div class="doc-kicker">Runtime Truth</div>

<p class="doc-lead">
  当前版本内置 <strong>149 个扩展名映射</strong>，覆盖 <strong>20 条预览链路</strong>。
  这一页不是“计划支持什么”，而是以当前代码里已经注册好的渲染器为准，告诉你项目现在到底能处理哪些格式、分别走哪条渲染链路，以及在真实业务里应该怎么选。
</p>

<div class="doc-grid">
  <div class="doc-card">
    <h3>149 个扩展名映射</h3>
    <p>覆盖 Office、PDF、OFD、Typst、压缩包、邮件、OLB/DRA、CAD、3D 模型、Excalidraw、draw.io、EPUB、UMD、Markdown、图片、音频、代码/文本和视频等常见附件类型。</p>
  </div>
  <div class="doc-card">
    <h3>按需异步加载</h3>
    <p>OFD、Typst、压缩包、邮件、OLB/DRA、CAD、3D 模型、绘图、PDF、Office、Markdown、代码高亮等渲染器都会拆成独立异步块，命中格式时才加载。</p>
  </div>
  <div class="doc-card">
    <h3>两条输入路径</h3>
    <p>既可以用 <code>url</code> 直接预览，也可以在业务侧拿到文件后二次包装成 <code>File</code> 再传入。</p>
  </div>
  <div class="doc-card">
    <h3>以体验边界为准</h3>
    <p>不同格式会走不同解析链路，兼容优先的格式与高保真格式在样式还原上并不完全一样。</p>
  </div>
</div>

## 当前支持矩阵

| 分类 | 扩展名 | 渲染链路 | 当前表现 | 更适合的场景 |
| --- | --- | --- | --- | --- |
| Word | `docx`、`docm`、`dotx`、`dotm` | `docx-preview` + Web Worker | 白色纸张显示在灰色页面底中，支持宽度自适应和长文档视觉分页；默认在 Worker 内完成解析和 HTML 构建，并按页渐进挂载同一份 docx-preview 结果，Worker 超时会回退到 docx-preview 原生主线程渲染，模板/宏格式按只读预览处理 | 新生成的 Word 文档、正式公文、Word 模板 |
| Word | `doc`、`dot` | `msdoc-viewer` | 使用 Word 风格页面容器，页面居中显示在灰色工作台中，增强 CFB 容错和表格布局 | 存量老文档、Word 97-2003 模板、历史附件回溯 |
| Excel | `xlsx`、`xltx` | `styled-exceljs` + `e-virt-table` | 支持虚拟滚动、列宽/行高、合并单元格、常见样式和 workbook drawing 图片；打印按钮按能力隐藏 | 大表格预览、报表、Excel 模板 |
| Excel 兼容格式 | `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`csv`、`ods`、`fods`、`numbers` | `styled-exceljs` + `e-virt-table` | 统一读取数据、尺寸和可用样式，按浏览器能力渐进还原 | 老表格、跨平台导出的表格 |
| PowerPoint | `pptx`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm` | 自定义 PPTX 渲染器 | 以页面展示为主，增强组合图形、旋转/翻转、主题背景、图片裁剪和 EMF 矢量图预览 | 汇报材料、说明文档、培训课件、演示模板 |
| PDF | `pdf` | `pdfjs-dist` | 浏览器端 PDF 渲染，同源 URL 默认渐进读取，服务端支持 Range 时自动分片加载，支持缩放工具栏、页侧边栏/目录树侧边栏切换、宽度自适应、完整打印和导出 HTML | 合同、票据、版式稳定文件 |
| OFD | `ofd` | `DLTech21/ofd.js` 源码 | 使用浏览器端 OFD 解析和页面渲染，避开 npm dist 授权 wasm 分支 | 电子发票、公文、国产版式归档材料 |
| Typst | `typ`、`typst` | `@myriaddreamin/typst.ts` 浏览器 WASM 编译 | 直接读取 Typst 源文档并输出按页 SVG，支持完整预览、打印和导出 HTML；compiler WASM 仅命中 Typst 时按需加载 | 技术报告、论文草稿、工程文档模板 |
| 压缩包 | `zip`、`zipx`、`7z`、`rar`、`tar`、`gz`、`gzip`、`tgz`、`bz2`、`bzip2`、`tbz`、`tbz2`、`xz`、`txz`、`lzma`、`zst`、`tzst`、`cab`、`ar`、`cpio`、`iso`、`xar`、`lha`、`lzh`、`jar`、`war`、`ear`、`apk`、`cbz`、`cbr` | `libarchive.js` + WASM Worker | 先读取目录，点击文件后按需解压；内部文件继续复用统一预览器，并支持 IndexedDB 缓存和体积上限 | 归档附件、批量交付包、压缩包内文档快速查看 |
| 邮件 | `eml`、`msg` | `postal-mime` / `@kenjiuno/msgreader` | 展示头信息、HTML/文本正文、附件列表；附件可下载，也可继续在线预览 | 邮件归档、客服工单、客户来信附件 |
| EDA | `olb`、`dra` | `cfb` 容器解析 + EDA 结构分析 | 优先解析 OrCAD / Allegro 常见 CFB 容器，展示结构树、元件/封装/Padstack 候选、属性、诊断和可读字符串；非 CFB 文件安全退化 | 元件库、封装图纸、EDA 文件初筛 |
| CAD | `dxf` | `@cadview/core` | Canvas 方式浏览 DXF 图纸，支持缩放、平移、图层显示控制 | 工程图纸、二维 CAD 附件 |
| CAD 兼容入口 | `dwg` | DWG 兼容解析 | 先识别误命名 DXF；真实 DWG 会尽量提取内嵌 PNG/JPEG/BMP 预览图，无法完整解析几何时说明原因 | 需要兼容上传入口但不希望引入 GPL 或闭源 DWG 运行时代码的业务 |
| 3D 模型 | `glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`ifc`、`3dm` | Three.js | WebGL 交互预览，支持轨道控制、适配视图、网格/坐标轴、线框和自动旋转；工程 CAD/BIM 格式会给出转换原因 | 设计模型、点云、三维资产、工程模型 |
| Excalidraw | `excalidraw` | `@excalidraw/excalidraw` | 使用官方 `restore` 兼容真实公开文件，再通过 `exportToSvg` 输出只读 SVG 预览 | 白板草图、产品沟通图、流程草稿 |
| draw.io | `drawio`、`dio` | diagrams.net `GraphViewer` | 使用官方 viewer 渲染 mxGraphModel / mxfile，不自行解析 draw.io 方言 | 流程图、架构图、业务泳道图 |
| 电子书 | `epub` | `epubjs` | 解析 EPUB 包、目录和章节资源，使用滚动阅读避免超宽分页白板 | 电子书、培训手册、长篇阅读材料 |
| 电子书 | `umd` | UMD 结构解析 + `pako` | 解析老移动电子书的元数据、章节偏移、章节标题和 zlib 压缩正文 | 历史小说附件、旧移动阅读文件 |
| Markdown | `md`、`markdown` | Markdown 渲染器 | 保留 Markdown 阅读样式，支持明暗主题阅读面 | README、知识文档、开发说明 |
| 图片 | `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp` | 图片渲染器 | 原生图片浏览 | 图片附件、设计稿、截图、Logo |
| 代码/文本 | `txt`、`json`、`js`、`mjs`、`cjs`、`css`、`java`、`py`、`html`、`htm`、`jsx`、`ts`、`tsx`、`xml`、`log`、`vue`、`yaml`、`yml`、`ini`、`sh`、`bash`、`sql`、`go`、`rs`、`php`、`c`、`cpp`、`cc`、`h`、`hpp`、`cs`、`diff` | `highlight.js` | 按源码方式展示并轻量高亮，不执行脚本 | 配置文件、日志、代码片段、接口响应 |
| 音频 | `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba` | 浏览器原生 `<audio>` | 使用原生音频控件播放，具体编码支持取决于浏览器 | 录音、播客、语音附件、音效素材 |
| 视频 | `mp4` | 浏览器原生视频播放器 | 原生播放、带控制条 | 演示视频、录屏材料 |

## 按类型看体验和边界

### Word 文档

- `docx`、`docm`、`dotx`、`dotm` 使用 `docx-preview`，适合正文、表格、图片和常规版式较多的现代 Word 文档与模板。当前预览层会恢复白色纸张和灰色页面底，并根据可用宽度自动缩放；宏内容只作为只读文档结构预览，不执行宏。
- DOCX 默认通过 Web Worker 运行 `docx-preview` 的 ZIP/XML 解析和 HTML 构建，主线程按页面分批挂载同一份 docx-preview 结果并处理缩放、打印和导出；遇到严格 CSP、旧浏览器兼容问题或 Worker DOM 兼容边界时，可通过 `options.docx.worker: false` 回退到 docx-preview 原生主线程渲染，也可以用 `options.docx.workerTimeout` 调整默认 15000ms 的自动兜底时间。
- `doc`、`dot` 使用 `msdoc-viewer`，并额外套用 Word 风格页面容器。构建前会通过包管理器无关的补丁脚本增强 CFB 局部 sector 容错，它不只是“把内容吐出来”，而是尽量保留文档阅读时的页面感。
- Word 打印和导出 HTML 使用独立导出适配器，只带文档页面和必要 Word 样式，不带 Demo 布局、滚动容器和缩放状态，长文档会按完整页序输出。
- 如果源文档缺少显式分页，`.docx` 预览会在浏览器端补一层视觉分页，避免长文档变成一整条没有纸张边界的内容流。
- 如果你的业务能控制导出格式，优先推荐 `docx`；如果你面对的是存量老文档，当前 `.doc` 已经可以作为正式能力对外说明。

<div class="doc-shot">
  <img src="/_images/demo-doc.png" alt="DOC 文档按 Word 风格展示" />
  <p class="doc-caption">`.doc` 文件现在会显示在灰色工作台中的白色纸张上，页面居中，阅读路径更接近真实 Word 阅读体验。</p>
</div>

### Office 模板格式

- 当前前端已接入可直接复用的模板格式：`dot`、`dotx`、`dotm`、`docm`、`xlt`、`xltx`、`xltm`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`。
- 这些模板格式仍然走对应的 Word、Excel 或 PowerPoint 渲染链路，按只读预览处理，不执行宏，也不把模板写回文件。
- 如果业务系统允许控制附件出口，建议优先沉淀为 `docx`、`xlsx`、`pptx`、`pdf` 或 `ofd` 这类更稳定的浏览器预览格式。

### 表格类文件

- 表格类文件统一走 `styled-exceljs` 解析和 `e-virt-table` 虚拟渲染，适合需要保留表格结构、合并单元格、workbook drawing 图片和视觉层级的场景。
- `xlsm`、`xlsb`、`xls`、`xlt`、`xltm`、`csv`、`ods`、`fods`、`numbers` 会读取格式中能表达的数据、尺寸和样式；部分格式本身不包含完整样式时，会按可用信息渐进还原。
- Excel 预览为了兼顾大表格性能采用虚拟表格，DOM 中不会一次性持有完整工作表，因此当前会主动隐藏打印按钮，避免浏览器只打印当前视口或截断内容。
- 如果你正在设计业务导出格式，优先选 `xlsx`；如果你只是需要把历史附件打开看内容，兼容链路已经足够实用。

### 演示文稿、PDF、OFD 与 Typst

- `pptx` 适合浏览幻灯片内容、做方案回看和日常演示，不需要 Office 本体参与。
- PPTX 渲染器现在会按 DrawingML 的组合图形坐标系处理 `chOff/chExt`，组合内元素在缩放、旋转、翻转时会更接近 PowerPoint 中的位置关系。
- 主题背景支持从 `fillStyleLst` / `bgFillStyleLst` 解析纯色、渐变、图片和平铺图案；PPTX 内嵌的 EMF 图片会尽量转换为 SVG 数据图，避免只显示空白占位。
- 图片填充会处理 `srcRect` 裁剪信息，复杂模板里的裁切图、背景图和组合形状更适合作为真实业务样本回归。
- `pdf` 走 `pdfjs-dist`，通常是版式最稳定的一类文件，适合合同、流程单、正式成品材料。当前 PDF 视图提供顶部缩放工具栏、页码状态、旋转页兼容、可显隐导航窗格、页面/目录树切换和宽度自适应。同源 URL 会默认使用 PDF.js 的 URL 渐进读取；文件服务支持 Range 时会自动分片加载，避免大文件必须整包下载后才出现首屏。
- PDF 的打印与导出 HTML 会通过专属导出适配器逐页生成完整页面，不依赖当前滚动位置、当前可见页或已经渲染的 canvas，也不会被导航窗格、预览容器或全局样式截断，适合正式归档和审批留痕。
- `ofd` 走 `DLTech21/ofd.js` 仓库源码，用于国产版式文档在线预览。npm dist 当前会在 wasm 解析层返回授权错误，组件改用同仓库的纯 JS 解析/渲染链路，OFD 依赖仍保持按需异步加载。
- `typ` / `typst` 始终按源文件直接预览，不会自动探测或替换为同名 PDF。组件会在命中 Typst 时按需加载 `@myriaddreamin/typst.ts` 的浏览器 WASM 编译与 SVG 渲染链路。
- 组件会读取 Typst 输出里的页面尺寸元数据，把整文档拆成按页 SVG 预览，打印和导出 HTML 时只输出文档页面，不带 Demo 外壳。compiler WASM 默认使用固定 CDN 地址，也可以通过 `options.typst.compilerWasmUrl` 指向私有化部署地址。
- Typst 适合技术报告、论文草稿、工程文档模板和需要保留排版语言源文件的场景。如果文档引用本地图片或拆分文件，建议在业务侧先把资源打包进压缩包，保留完整项目结构。
- 如果你更在意“展示结果必须完全稳定”，优先考虑 `pdf` / `ofd` 这类版式成品；如果你希望保留可编辑源文件和排版语义，Typst 是更轻量的工程文档入口。

### 压缩包、邮件与 EDA

- 压缩包走 `libarchive.js`，目录读取在 Worker 中完成，只有用户点击内部文件时才按需解压对应条目，避免一次性把大包全量展开到主线程。
- 压缩包内文件会继续复用同一套文件预览器，所以包里的 PDF、Word、Markdown、代码、图片、邮件或嵌套压缩包都能在体积限制内继续打开。
- `options.archive.cache` 默认启用 IndexedDB 缓存，已解压的内部文件再次打开会更快；`maxArchiveSize` 和 `maxEntryPreviewSize` 用于限制压缩包和单个条目的内存风险。
- EML 使用 `postal-mime` 解析 MIME、正文和附件；MSG 使用 `@kenjiuno/msgreader` 解析 Outlook MSG，附件同样支持下载和在线预览。
- 邮件 HTML 正文渲染在 sandbox iframe 中，不执行脚本；如果你接收外部邮件，仍建议在业务层保留病毒扫描和附件白名单策略。
- OLB / DRA 使用 `cfb` 读取常见复合文档容器，并按 OrCAD Capture 元件库、Allegro drawing / footprint / padstack 的内容习惯做结构树、对象候选、属性和诊断展示。复杂电气规则、封装编辑和几何校核仍应交给 OrCAD / Allegro 等专业工具。

### CAD 图纸

- `dxf` 走 `@cadview/core`，提供 Canvas 图纸预览、缩放、平移和图层显隐能力。
- `dwg` 当前会尽量处理: 如果文件内容其实是 DXF 文本，会直接按 DXF 打开；如果是真 DWG 二进制，会扫描并提取内嵌 PNG/JPEG/BMP 预览图。
- 真实 DWG 的矢量图元、图层、块参照和实体几何仍不能在纯 Apache-2.0 前端包里完整解析。原因是 DWG 为专有二进制格式，常见开源转换器授权与当前包不匹配，闭源 SDK 又不适合直接打进 npm 包。
- 如果你要在生产系统里稳定预览 CAD 文件，建议把 DXF 作为前端预览标准格式；若必须接收 DWG，建议在上传或归档环节接入私有服务端转换链路。

### 3D 模型

- 3D 模型统一走 Three.js，组件会根据扩展名按需加载对应 loader，避免普通文档预览被 3D 依赖拖慢。
- `glb` / `gltf` 是最推荐的 Web 3D 交换格式；`obj`、`stl`、`ply` 适合轻量几何和打印模型；`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd` / `usdz`、`kmz` 适合兼容设计工具导出的历史或工程资产。
- `pcd`、`xyz`、`vtk`、`vtp` 会按点云或几何模型展示，适合扫描、仿真和工程数据的快速浏览。
- `step` / `stp`、`iges` / `igs`、`ifc`、`3dm` 已保留入口，但完整解析需要 OpenCascade、web-ifc 或 rhino3dm 这类 WebAssembly 几何内核；组件会展示原因，生产建议在私有服务端转换为 `glb` / `gltf`。
- 如果 `.gltf`、`.dae`、`.fbx` 依赖同目录贴图、材质或 `.bin` 文件，使用 `url` 远程预览时会以原始 URL 的目录作为资源基准继续加载；使用本地单文件上传时，请优先选择 `.glb` 或把资源内联。

### 绘图文件

- `excalidraw` 使用官方 `@excalidraw/excalidraw` 包的 `restore` 与 `exportToSvg` 能力，按需加载后输出只读 SVG 预览，不手写 Excalidraw 图元解析器。
- `drawio` 和 `dio` 使用官方 diagrams.net `GraphViewer`，由官方 viewer 处理 mxGraphModel / mxfile、主题和图元兼容，组件只负责创建容器和传入 XML。
- draw.io viewer 脚本来自 diagrams.net 官方静态地址，只有命中 `.drawio` / `.dio` 时才加载；需要内网私有化时，可以把该官方脚本镜像到自己的静态资源域名再替换加载地址。

### 电子书

- `epub` 使用 `epubjs`，由成熟开源库处理 EPUB zip 包、OPF、目录和章节资源。
- EPUB 预览提供目录窗格、上一章/下一章式导航和阅读进度。正文区域使用滚动文档模式，避免部分浏览器在超宽分页 iframe 下出现白板。为了安全，阅读器不会允许书内脚本执行。
- `umd` 是早期移动阅读器常见的电子书封装。当前没有可靠维护的前端 UMD 阅读库，组件按公开文件结构解析文件头、元数据、章节偏移、章节标题和正文数据块，正文 zlib 解压交给 `pako`。
- UMD 文本正文按 UTF-16LE 解码，保留章节目录和换行；图片/漫画类 UMD 会尽量按图像数据块展示，但复杂混排文件建议用真实样本补充回归。
- Kindle 专有格式、DRM 电子书或业务加密包不在当前内置范围内，建议在接入侧转换为 EPUB、UMD 文本电子书或 PDF 后预览。

### Markdown、代码与文本

- `md` 和 `markdown` 会按 Markdown 阅读样式展示，适合项目说明、知识文档和内部手册。Markdown 属于预览器自有阅读面，会跟随系统明暗模式切换；PDF、Word、Excel 这类带原始版式的文件则保持独立纸张或表格背景，避免全局主题破坏源文件视觉。
- 代码和文本文件会使用 `highlight.js` 做轻量高亮，按扩展名匹配语言，不命中时会自动退回纯文本。
- 这里有一个很重要的边界：`html` 文件会被当作源码看，而不是在预览器里当网页执行。这是更安全、也更可控的默认策略。

### 图片、音频与视频

- 图片类支持 `gif`、`jpg`、`jpeg`、`bmp`、`tiff`、`tif`、`png`、`svg`、`webp`。
- `svg` 会作为图片来展示，很适合拿来放矢量图标、流程图和品牌素材。
- 音频类支持 `mp3`、`mpeg`、`wav`、`ogg`、`oga`、`opus`、`m4a`、`aac`、`flac`、`weba`，使用浏览器原生播放器；不同浏览器对编码格式的支持会有差异。
- 视频当前支持 `mp4`，使用浏览器原生播放器，适合最常见的演示和录屏场景。

## 真实业务里怎么选

- 你能控制导出格式：优先使用 `docx`、`xlsx`、`pptx`、`pdf`、`ofd`、`dxf`、`glb` 这类现代或稳定交换格式。
- 你要兼容历史附件：`.doc` 与 `xls/xlsm/xlsb/csv/ods` 这一组已经有正式链路，但要接受它们与现代格式在样式上的差异。
- 你要看日志、配置或代码：直接用代码/文本链路即可，重点是快速打开、检索内容和保持安全。
- 你在做品牌、示意图或视觉素材展示：`png`、`svg`、`webp` 这类图片格式会比转成文档更省心。
- 你要预览 CAD：优先沉淀 `dxf`；`dwg` 可以展示内嵌预览图，但完整几何预览建议转换为 DXF。
- 你要预览 3D 模型：优先沉淀 `glb` / `gltf`，历史模型再用 OBJ、STL、PLY、FBX、DAE、3DS、3MF、AMF、USD/USDZ、KMZ 等格式接入；STEP、IGES、IFC、3DM 建议先转换。
- 你要预览绘图文件：Excalidraw 和 draw.io 都保留源格式入口，前者走官方恢复与导出 SVG，后者走官方 diagrams.net viewer。
- 你要预览电子书或音频：EPUB / UMD 优先保留源文件，音频优先选择浏览器兼容最稳定的 MP3 / OGG。

## 不支持的格式会怎样

如果文件扩展名没有命中已注册渲染器，组件会显示“不支持当前格式在线预览”的提示，引导用户下载后查看或转换格式。

<div class="doc-note">
  最稳妥的做法，不是只看这张表，而是把你业务里最关键的那几类真实文件各准备一份样本，走一遍本地 Demo 和接入页联调。这样你拿去对外说明时，底气会更足。
</div>
