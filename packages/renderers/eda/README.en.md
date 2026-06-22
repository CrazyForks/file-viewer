# @file-viewer/renderer-eda

Standalone EDA renderer package for Flyfish File Viewer. It handles safe structure previews for OLB, DRA, GDSII, and OASIS files without forcing normal document preview installs to carry EDA parsing code.

## Usage

```ts
import FileViewer from '@file-viewer/vue3'
import { edaRenderer } from '@file-viewer/renderer-eda'

const options = {
  rendererMode: 'replace',
  renderers: edaRenderer,
}
```

Compose it with other renderers when needed:

```ts
import { edaRenderer } from '@file-viewer/renderer-eda'
import { cadRenderer } from '@file-viewer/renderer-cad'

const options = {
  rendererMode: 'replace',
  renderers: [edaRenderer, cadRenderer],
}
```

## Scope

- `gds` reads standard GDSII records, extracts libraries, structures, boundaries, paths, text, references, coordinate bounds, and renders a quick SVG layout preview.
- `oas` / `oasis` currently provide safe binary indexing, readable strings, structure candidates, and diagnostics rather than claiming full geometry rendering.
- `olb` / `dra` use `cfb` to inspect common compound document containers and expose stream trees, entity candidates, properties, strings, and diagnostics.
- High-fidelity OrCAD / Allegro / OASIS graphics should evolve as a dedicated WASM or incremental rendering kernel.

## Migration Notes

`@file-viewer/core` no longer bundles the EDA renderer and no longer installs `cfb` by default. Install this package explicitly, or use `@file-viewer/preset-all`, when you need OLB, DRA, GDSII, or OASIS previews. The low-level `parseEdaFile()` API is exported from this package for business-side structure indexing, diagnostics, or future custom WASM engine integration.

## Offline Deployment

The current EDA renderer does not require extra Worker or WASM assets. It only loads `cfb` and this renderer package when OLB, DRA, GDSII, or OASIS formats are selected.
