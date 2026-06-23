# @file-viewer/eda-layout

Framework-neutral EDA layout inspection engine for Flyfish File Viewer. It exposes pure TypeScript APIs for standard GDSII quick preview primitives and OASIS upgrade boundaries without any UI dependency.

```ts
import { parseGdsLayout, inspectOasisLayout } from '@file-viewer/eda-layout'

const layout = parseGdsLayout(new Uint8Array(buffer))
const oasis = inspectOasisLayout(new Uint8Array(buffer))
```

## Scope

- `parseGdsLayout()` reads standard GDSII stream records and returns structures, boundaries, paths, text labels, references, bounds, and warnings.
- `inspectOasisLayout()` detects OASIS files and keeps full repetition expansion / geometry rendering behind a dedicated WASM/WebGL engine boundary.
- No Vue, React, Web Component, or DOM dependency.
- `@file-viewer/renderer-eda` turns this engine output into the user-facing preview UI.

## Roadmap

Industrial GDSII / OASIS preview needs layers, hierarchical cell navigation, repetition expansion, incremental parsing, and tiled rendering. This package is the stable place to integrate a future KLayout/gdstk/OpenAccess-style WASM engine or a dedicated WebGL tile renderer.
