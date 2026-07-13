import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPreset,
} from '@file-viewer/core';
import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';
import { imageRenderer } from '@file-viewer/renderer-image';
import { mediaRenderer } from '@file-viewer/renderer-media';
import { textRenderer } from '@file-viewer/renderer-text';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

export const liteRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-lite',
  label: 'Flyfish File Viewer lite renderer preset',
  renderers: [textRenderer, imageRenderer, mediaRenderer],
};

export const fileViewerPresetLite = liteRenderers;

registerFileViewerAutoRendererPreset(liteRenderers, {
  id: 'lite',
  packageName: '@file-viewer/preset-lite',
});

export default liteRenderers;
