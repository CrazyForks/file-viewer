import {
  DEFAULT_RENDERER_DEFINITIONS,
  coreBrowserRendererHandlers,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type FileViewerRendererPreset,
} from '@file-viewer/core';
import { pdfRenderer } from '@file-viewer/renderer-pdf';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

const allRendererHandlers = coreBrowserRendererHandlers as readonly {
  rendererId: string;
  handler: BrowserRendererHandler;
}[];

export const fileViewerAllRendererPlugin: FileViewerRendererPlugin<BrowserRendererHandler> = {
  id: 'file-viewer-all-renderers',
  label: 'Flyfish File Viewer all renderers',
  definitions: DEFAULT_RENDERER_DEFINITIONS.filter(definition => definition.id !== 'pdf'),
  handlers: allRendererHandlers.filter(handler => handler.rendererId !== 'pdf'),
};

export const allRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-all',
  label: 'Flyfish File Viewer full renderer preset',
  renderers: [pdfRenderer, fileViewerAllRendererPlugin],
};

export const fileViewerPresetAll = allRenderers;

export default allRenderers;
