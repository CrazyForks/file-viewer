# Vue 2.6 + Vue CLI 3 + webpack 4 重点格式最小集示例

这个示例验证旧版 Vue 2.6 / Vue CLI 3 / webpack 4 项目按需集成 File Viewer。它不使用 `preset-all` 或 `preset-office`，而是只注册 PDF、Word、Excel、PowerPoint、CAD、3D、图片和视频八类渲染器，避免把本项目不需要的格式打进首屏依赖。

```bash
cd examples/vue2.6-cli3-office
npm install
npm run build
```

Node 17+ 运行 webpack 4 时若出现 OpenSSL/MD4 错误，可使用：

```bash
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

## 集成要点

- `src/fileViewerOptions.js` 使用 `rendererMode: 'replace'`、`builtinRenderers: 'none'`、`autoRenderers: false` 和显式 renderer 列表，保证依赖边界可审计。
- `vue.config.js` 处理 webpack 4 对 package exports、`.mjs`、`import.meta.url`、PDF.js 内部 webpack 包装和 `three/addons/*` 的兼容问题。
- `scripts/copy-file-viewer-assets.cjs` 将 PDF、DOCX、Excel、PPT/PPTX、CAD 和 OCCT 3D 的 Worker、WASM、字体及许可证复制到 `public/file-viewer/`，可用于内网静态部署。
- Excel 使用已经打包为单文件的 `dist/worker/sheet.worker.js`；不能直接发布仍含裸模块 import 的内部 `spreadsheet/worker/sheetjs` 源目录。
- PDF 同步复制 CMap、WASM、标准字体和 Noto Sans SC 中文回退字体。
- 视频只注册 video handler，不注册音频/MIDI；HLS 在 Safari 优先使用原生能力，其余支持 MSE 的浏览器按需加载 `hls.js`。

## 本示例明确覆盖

- PDF：`pdf`
- Office：`doc`、`docx`、`docm`、`dot`、`dotx`、`dotm`、`xls`、`xlsx`、`xlsm`、`xlsb`、`xlt`、`xltx`、`xltm`、`csv`、`tsv`、`ppt`、`pptx`、`pptm`、`potx`、`potm`、`ppsx`、`ppsm`
- CAD：`dwg`、`dxf`、`dwf`、`dwfx`、`xps`
- 3D：`glb`、`gltf`、`obj`、`stl`、`ply`、`fbx`、`dae`、`3ds`、`3mf`、`amf`、`usd`、`usda`、`usdc`、`usdz`、`kmz`、`pcd`、`wrl`、`vrml`、`xyz`、`vtk`、`vtp`、`step`、`stp`、`iges`、`igs`、`brep`
- 图片：`png`、`jpg`、`jpeg`、`gif`、`bmp`、`svg`、`webp`、`ico`、`heic`、`heif`；AVIF 取决于浏览器
- 视频：`mp4`、`webm`、`m3u8`；实际音视频编解码器取决于浏览器，HLS 分片必须满足鉴权和 CORS

当前没有实际解析器的 `ifc`、`3dm`，以及没有跨浏览器解码器的 `tiff/tif`、`jxl`，不列为保证格式。3D 外部纹理/buffer、CAD 外部 SHX、HLS 分片仍须由业务下载接口提供可访问 URL。

## 部署要求

- `.wasm` 返回 `Content-Type: application/wasm`。
- `.mjs`、Worker JS 返回正确 JavaScript MIME。
- CSP 至少允许 `worker-src 'self' blob:`；按浏览器要求允许 WebAssembly 执行。
- `connect-src` 包含文件下载域、静态资源域和 HLS 分片域。
- 生产环境保持同源下载，或正确配置 CORS、Cookie/Token 与 Range 请求。

若客户项目仍依赖 `node-sass@4`，建议用 Node 14/16 完成旧项目安装；本示例本身不需要 Sass。
