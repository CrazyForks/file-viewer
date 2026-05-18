# Flyfish Viewer Markdown Sample

This Markdown sample verifies that the viewer can render prose, lists, links, tables, and fenced code blocks.

## Checklist

- Markdown route is selected by the `.md` extension.
- Content is rendered as a document, not as raw text.
- Code fences remain readable inside the preview surface.

| Format | Renderer |
| --- | --- |
| `.md` | Markdown viewer |
| `.ts` | highlight.js code viewer |
| `.ofd` | ofd.js viewer |
| `.dxf` | CAD viewer |

```ts
const supported = ['ofd', 'dxf', 'markdown', 'highlight.js']

export function canPreview(type: string) {
  return supported.includes(type.toLowerCase())
}
```
