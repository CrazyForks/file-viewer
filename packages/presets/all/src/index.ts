import {
  DEFAULT_RENDERER_DEFINITIONS,
  coreBrowserRendererHandlers,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type FileViewerRendererPreset,
} from '@file-viewer/core';
import { mindmapRenderer } from '@file-viewer/renderer-mindmap';
import { pdfRenderer } from '@file-viewer/renderer-pdf';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

const allRendererHandlers = coreBrowserRendererHandlers as readonly {
  rendererId: string;
  handler: BrowserRendererHandler;
}[];

export const fileViewerAllRendererPlugin: FileViewerRendererPlugin<BrowserRendererHandler> = {
  id: 'file-viewer-all-renderers',
  label: 'Flyfish File Viewer all renderers',
  definitions: DEFAULT_RENDERER_DEFINITIONS.filter(definition => !['mindmap', 'pdf'].includes(definition.id)),
  handlers: allRendererHandlers.filter(handler => !['mindmap', 'pdf'].includes(handler.rendererId)),
};

export const allRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-all',
  label: 'Flyfish File Viewer full renderer preset',
  renderers: [pdfRenderer, mindmapRenderer, fileViewerAllRendererPlugin],
};

export const fileViewerPresetAll = allRenderers;

export default allRenderers;
