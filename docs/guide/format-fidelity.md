# 格式完整度与渲染路线

<div class="doc-kicker">Rendering Fidelity</div>

<p class="doc-lead">
  Flyfish Viewer 的目标不是“识别一个扩展名就算支持”，而是尽量让文件在浏览器里形成可理解、可操作、可交付的预览体验。
  本页基于当前实现和公开生态调研，说明新增复杂格式的真实完整度、WASM / 手写解析可行性，以及后续需要独立维护的 renderer 方向。
  依赖拆包和按需安装路线见 <a href="/guide/on-demand-renderers">按需渲染架构计划</a>。
</p>

## 分级原则

| 级别 | 标准 | 对外说明口径 |
| --- | --- | --- |
| 完整可视预览 | 能读取主体结构并渲染接近原文件的视觉内容，支持缩放、平移、打印或 HTML 导出等核心操作 | 可以作为正式预览能力 |
| 结构可读预览 | 能安全读取目录、元数据、文本、对象候选或几何子集，但不能承诺专业工具级还原 | 明确标注为结构预览/附件初筛 |
| 需要独立内核 | 格式复杂、生态缺少稳定浏览器库、或需要 C++/Rust/WASM 才能达到完整可视 | 拆成独立包持续维护，不塞进 core |

## 已确认的完整链路

| 格式 | 当前策略 | 结论 |
| --- | --- | --- |
| Typst | 使用 `@myriaddreamin/typst.ts` 浏览器 WASM 编译和 SVG 渲染，直接读取 `.typ` / `.typst` 源文件 | 保持现有链路，重点补齐资源包、字体、依赖文件错误提示和回归样本 |
| Draw.io | 使用官方 diagrams.net `viewer-static.min.js`，并把 styles、shapes、stencils、img、mxgraph、math 全部自托管 | 保持离线 viewer 优先，内置 SVG 仅作为失败兜底 |
| Excalidraw | 使用官方 `@excalidraw/excalidraw` 的 `restore` + `exportToSvg` | 保持官方导出优先，rough.js 兜底 |
| CAD | 委托 `@flyfish-dev/cad-viewer`，DWG 使用 Worker + LibreDWG WASM，DWF/DWFx/XPS 使用 native DWF renderer | 继续跟随 cad-viewer 升级，viewer 只负责资源路径、生命周期和统一 toolbar |
| XMind | 解析 XMind 8 XML / XMind 2020+ JSON 包结构，使用 core SVG/DOM 脑图阅读器 | 继续增强只读预览体验，当前已补拖拽平移、滚轮锚点缩放和键盘平移 |
| GDSII | 手写 GDSII record parser，读取 library、structure、boundary、path、text、sref/aref 和坐标边界并生成 SVG | 当前可作为 GDSII 版图快速预览；更大文件和层级实例展开适合拆出 WebGL/WASM renderer |

## 当前只能作为结构预览的格式

| 格式 | 现状 | 后续完整方案 |
| --- | --- | --- |
| OLB | 可识别常见 CFB/OLE2 容器、流、属性、字符串和元件候选 | 参考 OpenOrCadParser 的 C++ 解析路线，后续可拆 `@file-viewer/eda-orcad`，通过 Emscripten/WASM 或逐步 TS 移植补齐符号图形 |
| DRA | 可识别 CFB/OLE2 容器、封装/padstack/图形候选和可读属性 | DRA/PSM/PAD 属于 Allegro 私有数据库生态，应先积累真实样本，再独立维护 OrCAD/Allegro renderer |
| OAS/OASIS | 当前做安全二进制索引、可读字符串、结构候选和诊断 | OASIS 需要低层 record parser、重复结构展开、压缩块处理和版图实例渲染，适合拆 `@file-viewer/eda-layout` |
| STEP/IGES/IFC/3DM | 已保留 3D 入口，但完整几何解析依赖专业内核 | STEP/IGES 走 OpenCascade WASM，IFC 走 `web-ifc`，3DM 走 `rhino3dm`，均应按需拆包 |

## 当前落地策略

| 格式线 | 浏览器端可行方案 | Flyfish Viewer 当前动作 |
| --- | --- | --- |
| XMind | `.xmind` 本质是 ZIP，现代 XMind 使用 `content.json`，经典 XMind 8 使用 `content.xml`；成熟 viewer 都以“解析包结构 + 可拖拽缩放画布”为体验基线 | 保留 `@ljheee/xmind-parser`，独立 `@file-viewer/renderer-mindmap` 负责解析和交互；当前拖拽边界已放宽为画布式平移，鼠标、触摸、滚轮、键盘统一处理 |
| OLB / DRA / PSM | Cadence 格式没有稳定官方 Web SDK；公开可用路线主要是 OpenOrCadParser / OpenAllegroParser 这类 C++ 解析器，后续可以 Emscripten/WASM 化或按样本逐步 TS 移植 | 当前只声明为结构预览，不虚标完整图形；后续像 PPTX 一样拆 `@file-viewer/eda-orcad` / `@file-viewer/eda-allegro` 长期维护 |
| GDSII / OASIS | GDSII 已可按 record parser 生成 SVG/WebGL；OASIS 是 SEMI 二进制版图格式，支持压缩块、重复结构和更复杂索引，完整渲染更适合 WebGL 或 WASM | GDSII 当前提供 SVG 快速预览；OASIS 继续结构索引，后续拆 `@file-viewer/eda-layout` 做 WebGL/增量渲染 |
| STEP / IGES / IFC / 3DM | STEP/IGES/BREP 可走 OpenCascade WASM，IFC 走 `web-ifc` / That Open 生态，3DM 走 `rhino3dm` | 保留 3D 入口和转换说明，不把这些重量级几何内核放进 core 默认路径 |
| Draw.io / Excalidraw | Draw.io 最佳链路是自托管 diagrams.net offline viewer；Excalidraw 使用官方 restore/export 工具保持真实文件兼容 | 继续离线 vendor 分发，禁止依赖公共 CDN；失败时才走安全 SVG 兜底 |
| Typst | 官方 Rust 编译器生态已可通过 `typst.ts` 在浏览器 WASM 编译并渲染为 SVG/PDF | 保持 `@file-viewer/renderer-typst` 独立维护 compiler/renderer WASM、超时和资源错误提示 |

## 外部调研依据

- Typst 官方生态中，`typst.ts` 明确定位为把 Typst 编译/渲染带到 JavaScript 和浏览器 WASM 环境: <https://github.com/myriad-dreamin/typst.ts>
- diagrams.net 官方文档推荐把 `viewer-static.min.js` 从仓库复制到企业可访问位置自托管，适合内网离线场景: <https://www.drawio.com/docs/integrations/atlassian/confluence/customise/configure-javascript-viewer-drawio-confluence-server/>
- diagrams.net 官方集成文档说明 embed/viewer 模式通过 iframe/window 和 HTML5 Messaging API 控制，企业离线部署应自托管官方静态资源: <https://jgraph.github.io/drawio-integration/>
- XMind 官方 SDK 支持 Node.js，Browser 标注为 not fully supported，因此 viewer 继续使用解析器 + 自有只读渲染更稳: <https://github.com/xmindltd/xmind-sdk-js>
- SimpleMindMap 文档也确认 `.xmind` 可以按 ZIP 解包并读取 `content.json` 转换为脑图数据: <https://wanglin2.github.io/mind-map-docs/en/api/xmind.html>
- Mind Elixir 是成熟的交互式脑图内核，适合作为未来“更强交互/编辑级阅读”的候选，但不直接替代当前 XMind 文件解析链路: <https://www.npmjs.com/package/mind-elixir>
- GDS2WebGL 证明 GDSII 可以在浏览器里做 WebGL pan/zoom 查看，适合成为后续 GDS/OASIS 独立 renderer 的参考: <https://github.com/s-holst/GDS2WebGL>
- GDSJam 证明 GDSII/DXF 可以做客户端 WebGL viewer，适合为大版图交互性能设定基线: <https://github.com/jwt625/gdsjam>
- OASIS 公开生态里存在低层解析器，但不是完整 Web viewer，需要在解析层之上自行构建几何模型和渲染层: <https://github.com/EDDRSoftware/oasFileParser>
- OpenOrCadParser 是 OrCAD DSN/OLB 二进制解析的 C++ 开源实现，说明 OLB 完整解析可行，但工程量和样本覆盖都应独立维护: <https://github.com/Werni2A/OpenOrCadParser>
- OpenAllegroParser 是 Allegro 二进制解析的 C++ 开源路线，适合作为 DRA / PSM / PAD 后续 WASM 内核参考: <https://github.com/Werni2A/OpenAllegroParser>
- OpenCascade / `occt-import-js` 证明 STEP / IGES / BREP 可以在浏览器 WASM 中导入，再交给 Three.js 渲染: <https://github.com/kovacsv/occt-import-js>
- That Open `web-ifc` 生态提供 IFC 的 WASM 读取能力，适合独立 BIM renderer，而不是进入默认 core: <https://github.com/thatopen/engine_web-ifc>

## 后续验收 checklist

- [x] XMind 支持拖拽平移、触摸/鼠标兼容、Ctrl/Command 滚轮锚点缩放、键盘方向键平移。
- [x] 继续保持 Draw.io、Typst、CAD、archive、PDF worker/WASM/vendor 静态资源全部自托管，不依赖公共 CDN。
- [x] 使用 `pnpm verify:format-support` 校验 198 个扩展名和 24 条 renderer pipeline 口径一致。
- [ ] 为 XMind 增加真实复杂样本，覆盖多 sheet、标签、备注、图片、链接、折叠节点和大脑图拖拽回归。
- [ ] 为 GDSII 增加真实公开版图样本，验证层过滤、实例引用、文本和大文件性能。
- [ ] 拆出 `@file-viewer/eda-layout`，专门维护 GDSII / OASIS WebGL 或 WASM 渲染。
- [ ] 拆出 `@file-viewer/eda-orcad`，专门维护 OLB / DRA / PSM / PAD 解析和 OrCAD/Allegro 样本回归。
- [ ] 为 STEP / IGES / IFC / 3DM 建立独立按需 renderer 包，避免 OpenCascade / web-ifc / rhino3dm 进入默认 core install path。
- [ ] 在浏览器烟测里加入 XMind pan/zoom、Typst WASM、Draw.io offline viewer、CAD WASM、GDSII preview 的实际交互断言。

<div class="doc-note">
  复杂工程格式不要强行虚标“全量高保真”。能完整渲染的走成熟库和 WASM；目前只能安全解析的格式要明确边界，并把专业内核拆成可独立迭代的 renderer 包。
</div>
