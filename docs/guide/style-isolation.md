# Style Isolation And Customization

<div class="doc-kicker">Shadow DOM, Tokens, Parts</div>

<p class="doc-lead">
  File Viewer uses Shadow DOM by default in Web Component / IIFE / full web entries to isolate the viewer shell and rendered content.
  Applications customize the viewer through CSS custom properties and Shadow Parts instead of depending on internal classes or global overrides.
</p>

This model is designed for admin systems, OA portals, low-code platforms, micro-frontends, embedded third-party pages, and products where host CSS is hard to control. The goal is to keep both guarantees at once: aggressive host styles should not break the viewer, while product teams can still customize theme, toolbar, and key surfaces predictably.

## Recommendation

| Scenario | Recommended path |
| --- | --- |
| New projects, classic admin pages, script tags, low-code, micro-frontends | Use `@file-viewer/web`, `@file-viewer/web-full`, or `<flyfish-file-viewer>`. The default `styleIsolation:'auto'` uses Shadow DOM. |
| Vue / React / Svelte / jQuery projects under aggressive host CSS | Keep the framework package and pass `options.styleIsolation:'shadow'`. |
| Need controlled inheritance from host fonts or theme variables | Use `styleIsolation:'scoped'`. |
| Legacy projects with deep internal class overrides | Temporarily use `styleIsolation:'none'`, then migrate to tokens and parts. |

iframe is not the recommended core path. It gives stronger process-like isolation, but makes file transfer, printing, search, sizing, event bridges, and offline asset deployment much more complex. File Viewer prefers platform-native Shadow DOM isolation.

## Public API

`FileViewerOptions` exposes one shared field:

```ts
type FileViewerStyleIsolation = 'auto' | 'shadow' | 'scoped' | 'none'

const options = {
  styleIsolation: 'shadow',
  theme: 'light',
  toolbar: { position: 'bottom-right' }
}
```

| Value | Behavior |
| --- | --- |
| `auto` | Default. Web Component / Web full / IIFE / custom element entries default to `shadow`; framework components keep compatibility, while renderer content can still be isolated by core. |
| `shadow` | Creates a ShadowRoot render surface. Styles are injected into the isolated root first, and overlays prefer the same root. |
| `scoped` | Does not create a ShadowRoot. Uses a stable root selector, `@layer file-viewer`, and local resets to constrain cascade impact. |
| `none` | Historical light-DOM behavior for legacy theme CSS or deep overrides. |

The Web Component also supports an attribute:

```html
<flyfish-file-viewer
  src="/files/report.pdf"
  filename="report.pdf"
  style-isolation="shadow"
  theme="light"
  style="display:block;height:720px"
></flyfish-file-viewer>
```

To return to historical behavior:

```html
<flyfish-file-viewer style-isolation="none"></flyfish-file-viewer>
```

## CSS Tokens

Start customization with `--file-viewer-*` CSS variables. They can be placed on the custom element, a business shell, `:root`, or a theme class. Shadow DOM inherits CSS custom properties from the host.

```css
flyfish-file-viewer {
  --file-viewer-bg: #f7f9fc;
  --file-viewer-text: #172033;
  --file-viewer-font: Inter, "Segoe UI", sans-serif;
  --file-viewer-toolbar-bg: rgba(255, 255, 255, 0.96);
  --file-viewer-toolbar-border: rgba(21, 75, 131, 0.16);
  --file-viewer-button-color: #154b83;
  --file-viewer-button-hover-bg: rgba(21, 75, 131, 0.08);
  --file-viewer-button-radius: 6px;
}
```

| Token | Purpose |
| --- | --- |
| `--file-viewer-bg` / `--file-viewer-text` / `--file-viewer-muted` | Shell background, primary text, and muted text |
| `--file-viewer-font` | Viewer shell, toolbar, and state panel font |
| `--file-viewer-border` / `--file-viewer-focus-ring` | Borders and keyboard focus styles |
| `--file-viewer-toolbar-bg` / `--file-viewer-toolbar-border` / `--file-viewer-toolbar-shadow` | Toolbar background, border, and shadow |
| `--file-viewer-toolbar-padding` / `--file-viewer-toolbar-gap` / `--file-viewer-toolbar-radius` | Toolbar spacing and radius |
| `--file-viewer-toolbar-floating-offset` / `--file-viewer-toolbar-floating-padding` | Floating toolbar offset and safe padding |
| `--file-viewer-group-bg` / `--file-viewer-group-border` | Toolbar group background and border |
| `--file-viewer-button-color` / `--file-viewer-button-hover-color` / `--file-viewer-button-disabled-color` | Button text colors |
| `--file-viewer-button-hover-bg` / `--file-viewer-button-radius` | Button hover background and radius |
| `--file-viewer-input-bg` / `--file-viewer-input-color` | Built-in inputs such as search |
| `--file-viewer-z-toolbar` / `--file-viewer-z-floating-toolbar` | Toolbar stacking levels |

## Shadow Parts

When tokens are not enough, target stable surfaces with `::part()`:

```css
flyfish-file-viewer::part(toolbar) {
  border-radius: 999px;
}

flyfish-file-viewer::part(button) {
  min-width: 32px;
  font-weight: 600;
}

flyfish-file-viewer::part(content) {
  background: #eef2f7;
}
```

| Part | Current purpose |
| --- | --- |
| `host` | Internal Web Component mount node |
| `shell` | Viewer shell |
| `toolbar` | Built-in toolbar container |
| `toolbar-group` | Toolbar button group |
| `toolbar-status` | Toolbar status text |
| `button` | Built-in buttons |
| `input` | Built-in inputs such as search |
| `content` | Renderer content mount area |

Renderer authors and future extensions should keep using stable names such as `state-panel` and `watermark` when exposing state panels and watermark layers. Application code should not rely on `.file-viewer-*` internal classes because those classes are implementation details.

## Framework Packages

Vue / React / Svelte / jQuery keep compatibility by default so old local styles and snapshots do not change unexpectedly. Opt into strong isolation through the shared options object:

```ts
const viewerOptions = {
  styleIsolation: 'shadow',
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light'
}
```

If the application needs limited inheritance from host CSS without letting global resets pollute document content, use:

```ts
const viewerOptions = {
  styleIsolation: 'scoped'
}
```

## Hostile CSS Harness

Before release, add an aggressive host-CSS harness once and confirm toolbar, buttons, document content, images, canvases, tables, and SVGs remain usable:

```css
* {
  box-sizing: content-box !important;
  font-size: 26px !important;
  line-height: 3 !important;
}

button,
input,
table,
img,
svg,
canvas,
a,
div {
  all: unset !important;
  display: block !important;
  border: 8px solid red !important;
}
```

Expected behavior:

- With `styleIsolation:'shadow'`, the Web Component toolbar and content stay usable.
- Theme variables set through `--file-viewer-*` still apply.
- `flyfish-file-viewer::part(toolbar)` and similar selectors customize only the intended surface.
- Events remain `bubbles:true` and `composed:true`, so host pages can keep listening for `viewer-event`.

## Printing And Export

Under Shadow DOM, print and HTML export collect content and required styles from the current render surface. Format-specific adapters still take precedence for complete-page output, such as PDF and Word. Unreliable pipelines such as virtual spreadsheets, media, and 3D continue to hide print buttons dynamically.

If you maintain a custom renderer:

- Do not inject preview styles into `document.head` or `document.body`.
- Prefer the core render surface and style injection helper.
- Mount lightboxes, menus, and overlays inside `context.surface.shadowRoot` or the current renderer container.
- Use stable `part` names for public customization surfaces instead of exposing temporary classes as API.

## Migration

1. Keep the default `auto` for new Web / IIFE integrations.
2. If a legacy project depends on deep class overrides, start with `styleIsolation:'none'`.
3. Move color, font, spacing, and radius overrides to `--file-viewer-*` tokens.
4. Move structural customization to `::part()`.
5. Switch back to `auto` or explicit `shadow`, then run the hostile CSS harness and common-format smoke tests.
