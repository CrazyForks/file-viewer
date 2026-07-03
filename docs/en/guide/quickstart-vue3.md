# Vue 3 Integration

<div class="doc-kicker">Native Vue Component</div>

<p class="doc-lead">
  <code>@file-viewer/vue3</code> provides a Vue-native component and plugin while keeping renderer engines lazy and framework-neutral underneath.
</p>

## Install

```bash
npm install @file-viewer/vue3 @file-viewer/preset-office
```

Switch `@file-viewer/preset-office` to `@file-viewer/preset-all` when you want the complete official demo capability in one install.

```bash
npm install @file-viewer/vue3 @file-viewer/preset-all
```

Use the full package when you want one package to enable the complete matrix by default:

```bash
npm install @file-viewer/vue3-full
```

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3-full'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<file-viewer
  url="/files/demo.pdf"
  :options="{ theme: 'light', toolbar: { position: 'bottom-right' } }"
/>
```

## Dialogs And Component Teardown

The Vue 3 component can be mounted inside Element Plus dialogs, drawers, route tabs, and `v-if` blocks. When a dialog should release the active document after closing, let the host actually unmount the component. For Element Plus, use `destroy-on-close`:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import officePreset from '@file-viewer/preset-office'

const visible = ref(false)
const url = ref('/files/contract.pdf')
const options = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
</script>

<template>
  <el-dialog v-model="visible" destroy-on-close width="80vw">
    <div class="dialog-viewer-shell">
      <file-viewer
        :url="url"
        :options="options"
        @unload-complete="event => console.log(event.reason)"
      />
    </div>
  </el-dialog>
</template>

<style scoped>
.dialog-viewer-shell {
  height: 70vh;
  min-height: 0;
}
</style>
```

On Vue unmount, the component automatically cancels active loading, destroys the current renderer session, clears the rendered DOM, stops zoom and view-state observers, and emits `unload-complete` with `reason: "component-unmount"`. Host code does not need to clear the inner container manually.

If the dialog only hides the component, for example with `v-show` or without `destroy-on-close`, the viewer instance stays alive and keeps the current document. That is useful when the product wants to preserve reading position. For explicit teardown while keeping the surrounding component alive, call `viewerRef.value?.destroy()` and recreate the viewer component when previewing again.

## Universal Renderer Assembly

The Vue package stays lightweight. Concrete PDF, Office, CAD, Typst, archive, and engineering capabilities are injected through presets or renderer packages. This path works in Vite, Webpack, Rspack, Rollup, Umi, and internal component libraries:

```ts
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

## Register Globally

```ts
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from '@file-viewer/vue3'

createApp(App).use(FileViewer).mount('#app')
```

```vue
<template>
  <div class="preview-shell">
    <file-viewer
      url="/files/report.docx"
      :options="viewerOptions"
      @viewer-event="onViewerEvent"
    />
  </div>
</template>

<script setup lang="ts">
import officePreset from '@file-viewer/preset-office'

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right' },
  search: { enabled: true },
  archive: { cache: true }
}

function onViewerEvent(event) {
  console.log(event.type)
}
</script>

<style scoped>
.preview-shell {
  height: 100vh;
}
</style>
```

## Local Registration

```vue
<script setup lang="ts">
import { FileViewer } from '@file-viewer/vue3'
</script>
```

## Vite Zero-Config Setup

Vite projects can add the plugin to assemble renderer imports and copy Worker/WASM assets automatically. Installing the npm package alone does not make Vite run it; register the plugin once in `vite.config.ts`. The plugin discovers installed preset packages, so application code can omit the manual preset import:

```bash
npm install -D @file-viewer/vite-plugin
```

```ts
import { defineConfig } from 'vite'
import { fileViewerRenderers } from '@file-viewer/vite-plugin'

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
      // Installed @file-viewer/preset-* packages are discovered automatically.
    })
  ]
})
```

Use `preset:'auto'` or `autoPresets:true` when `scan:true` is also enabled, so installed presets stay auto-activated while source hints add extra formats.

## Compatibility Names

Historical packages remain synchronized:

- `@flyfish-group/file-viewer3`
- `file-viewer3`

New Vue 3 projects should use `@file-viewer/vue3`.
