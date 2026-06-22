import {
  DEFAULT_RENDERER_DEFINITIONS,
  coreBrowserRendererHandlers,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type FileViewerRendererPreset,
} from '@file-viewer/core';
import { archiveRenderer } from '@file-viewer/renderer-archive';
import { cadRenderer } from '@file-viewer/renderer-cad';
import { emailRenderer } from '@file-viewer/renderer-email';
import { mindmapRenderer } from '@file-viewer/renderer-mindmap';
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { typstRenderer } from '@file-viewer/renderer-typst';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

const allRendererHandlers = coreBrowserRendererHandlers as readonly {
  rendererId: string;
  handler: BrowserRendererHandler;
}[];

const extractedRendererIds = ['archive', 'cad', 'email', 'mindmap', 'pdf', 'typst'] as const;

export const fileViewerAllRendererPlugin: FileViewerRendererPlugin<BrowserRendererHandler> = {
  id: 'file-viewer-all-renderers',
  label: 'Flyfish File Viewer all renderers',
  definitions: DEFAULT_RENDERER_DEFINITIONS.filter(definition => !extractedRendererIds.includes(definition.id as typeof extractedRendererIds[number])),
  handlers: allRendererHandlers.filter(handler => !extractedRendererIds.includes(handler.rendererId as typeof extractedRendererIds[number])),
};

export const allRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-all',
  label: 'Flyfish File Viewer full renderer preset',
  renderers: [pdfRenderer, cadRenderer, typstRenderer, archiveRenderer, emailRenderer, mindmapRenderer, fileViewerAllRendererPlugin],
};

export const fileViewerPresetAll = allRenderers;

export default allRenderers;
