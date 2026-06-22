# @file-viewer/renderer-eda

Flyfish File Viewer 的独立 EDA renderer 包。它承接 OLB、DRA、GDSII、OASIS 等电子设计与版图文件的安全结构预览，避免普通文档预览场景安装 EDA 解析链路。

## 用法

```ts
import FileViewer from '@file-viewer/vue3'
import { edaRenderer } from '@file-viewer/renderer-eda'

const options = {
  rendererMode: 'replace',
  renderers: edaRenderer,
}
```

也可以和其他 renderer 一起组合：

```ts
import { edaRenderer } from '@file-viewer/renderer-eda'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [edaRenderer, cadRenderer],
}
```

## 能力边界

- `gds` 读取标准 GDSII record，提取 library、structure、boundary、path、text、sref/aref 和坐标边界，并生成 SVG 快速版图预览。
- `oas` / `oasis` 做安全二进制索引、可读字符串、结构候选和诊断，不虚标为完整几何渲染。
- `olb` / `dra` 使用 `cfb` 读取常见复合文档容器，展示结构树、对象候选、属性、可读字符串和诊断。
- 复杂 OrCAD / Allegro / OASIS 高保真图形能力后续会继续演进为独立 WASM/增量渲染内核。

## 迁移说明

`@file-viewer/core` 已不再内置 EDA renderer，也不再默认安装 `cfb`。需要 OLB / DRA / GDSII / OASIS 预览时，请显式安装本包，或使用 `@file-viewer/preset-all`。底层 `parseEdaFile()` 也从本包导出，适合业务侧做结构索引、诊断和后续自研 WASM 内核对接。

## 离线部署

当前 EDA renderer 没有额外 Worker/WASM 静态资产。它只在命中 OLB、DRA、GDSII 或 OASIS 格式时加载 `cfb` 和本包解析代码。
