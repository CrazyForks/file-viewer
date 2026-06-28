# @file-viewer/renderer-geo

Standalone geospatial renderer package for Flyfish File Viewer. It previews GeoJSON, KML, GPX, and Shapefile data in the browser while keeping `@tmcw/togeojson`, `shpjs`, `maplibre-gl`, and `proj4` lazy-loaded for geospatial files only.

## Usage

```ts
import { geoRenderer } from '@file-viewer/renderer-geo'

const options = {
  builtinRenderers: 'none',
  renderers: [geoRenderer],
}
```

You can also compose it through the full preset:

```ts
import { allRenderers } from '@file-viewer/preset-all'

const options = {
  builtinRenderers: 'none',
  renderers: allRenderers,
}
```

## Capabilities

- Reads GeoJSON `FeatureCollection`, `Feature`, and standalone geometry objects.
- Loads `@tmcw/togeojson` only for KML / GPX and normalizes them into the shared GeoJSON pipeline.
- Loads `shpjs` only for SHP / Shapefile previews, including common ZIP or binary Shapefile payloads.
- Uses an offline MapLibre empty style to render point, line, and polygon overlays with pan, zoom, and fit-to-bounds controls. It does not need online map tiles or public CDNs.
- Supports GeoJSON `crs` metadata, explicit `options.geo.projection`, Web Mercator inference, and conversion from `EPSG:4326`, `EPSG:3857`, `EPSG:4490`, `GCJ02`, `BD09`, or proj4 strings to WGS84.
- Falls back to an SVG vector preview when WebGL or MapLibre initialization is unavailable.
- Cleans up DOM resources on unmount and remains compatible with core lifecycle, HTML export, and zoom orchestration.

## Projection Options

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

Standard GeoJSON is read as WGS84 by default. If an export omits `crs` but contains Web Mercator coordinates, the renderer infers EPSG:3857 by default. For non-EPSG systems such as GCJ-02 or BD-09, pass `options.geo.projection` explicitly.

## Migration Note

`@file-viewer/core` no longer bundles the geo renderer and no longer installs `@tmcw/togeojson` or `shpjs` by default. Install this renderer explicitly, or use `@file-viewer/preset-all`, when GeoJSON / KML / GPX / SHP preview is required.
