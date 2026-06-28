# @file-viewer/renderer-geo

Flyfish File Viewer 的独立地理数据 renderer 包。它负责 GeoJSON、KML、GPX 和 Shapefile 的浏览器端预览，并让 `@tmcw/togeojson`、`shpjs`、`maplibre-gl`、`proj4` 只在命中地理数据格式时加载。

## 使用

```ts
import { geoRenderer } from '@file-viewer/renderer-geo'

const options = {
  builtinRenderers: 'none',
  renderers: [geoRenderer],
}
```

也可以通过全量 preset 自动装配：

```ts
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

## 能力

- GeoJSON 直接读取 `FeatureCollection`、`Feature` 或单个 geometry。
- KML / GPX 只在命中格式时按需加载 `@tmcw/togeojson`，转换为统一 GeoJSON 管线。
- SHP / Shapefile 只在命中格式时按需加载 `shpjs`，支持常见 ZIP 或二进制 Shapefile 数据转 GeoJSON。
- 默认使用离线 MapLibre 空底图渲染点、线、面叠加层，支持平移、缩放和适配范围；无需在线地图瓦片或公网 CDN。
- 支持 GeoJSON `crs` 元数据、`options.geo.projection` 显式坐标系、Web Mercator 自动推断，以及 `EPSG:4326`、`EPSG:3857`、`EPSG:4490`、`GCJ02`、`BD09` 和 proj4 字符串转换到 WGS84。
- WebGL 或 MapLibre 初始化失败时自动回退 SVG 矢量预览，适合内网部署和附件快速审阅。
- 卸载时清理 DOM 资源，和 core 的生命周期、导出 HTML、缩放能力保持一致。

## 坐标系选项

```ts
const options = {
  renderers: [geoRenderer],
  geo: {
    projection: 'EPSG:3857',
    inferProjection: true,
    fitPadding: 48,
  },
}
```

标准 GeoJSON 默认按 WGS84 读取。如果业务导出没有写 `crs`，但坐标是 Web Mercator，默认会自动推断；GCJ-02 / BD-09 这类非 EPSG 坐标建议通过 `options.geo.projection` 显式声明。

## 迁移说明

`@file-viewer/core` 已不再内置 geo renderer，也不会默认安装 `@tmcw/togeojson` 和 `shpjs`。需要 GeoJSON / KML / GPX / SHP 预览时，请显式安装本包，或直接使用 `@file-viewer/preset-all` 聚合能力。
