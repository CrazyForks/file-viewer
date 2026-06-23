# @file-viewer/eda-layout

Flyfish File Viewer 的独立 EDA 版图内核包。它只提供框架无关的 TypeScript API，当前负责标准 GDSII 记录解析和 OASIS 检测边界，不包含任何 UI 组件。

```ts
import { parseGdsLayout, inspectOasisLayout } from '@file-viewer/eda-layout'

const layout = parseGdsLayout(new Uint8Array(buffer))
const oasis = inspectOasisLayout(new Uint8Array(buffer))
```

## 定位

- `parseGdsLayout()` 解析标准 GDSII stream record，输出 structure、boundary、path、text、reference、bounds 等只读预览模型。
- `inspectOasisLayout()` 识别 OASIS 文件边界，并把完整 OASIS 几何展开留给独立 WASM/WebGL 内核演进。
- 不依赖 Vue、React、Web Component 或 DOM，可独立发布、独立回归。
- `@file-viewer/renderer-eda` 负责把本包输出转换为可视化 UI。

## 后续路线

GDSII / OASIS 的完整工业级浏览需要分层、层控制、重复结构展开、层级 cell 导航和大文件增量渲染。本包是后续接入 KLayout/gdstk/OpenAccess 类 WASM 内核或自研 WebGL tile renderer 的稳定入口。
