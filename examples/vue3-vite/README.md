# Vue 3 + Vite + full package

A one-step Vue 3 starter using `@file-viewer/vue3-full`. It enables the complete preset and all 206 maintained extension mappings while keeping heavy renderers lazy by format.

After copying this directory outside the monorepo:

```bash
pnpm install
pnpm dev
```

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm --dir examples/vue3-vite dev
```

The Vite plugin detects the full package and copies the complete local runtime asset set to `/file-viewer/` for private and offline deployment. No preset or per-renderer Worker/WASM URL is required. For a smaller dependency graph, replace the full package with `@file-viewer/vue3` plus `preset-lite`, `preset-office`, or `preset-engineering`.
