import {
  DEFAULT_RENDERER_DEFINITIONS,
  type FileRenderHandler,
  type FileViewerRenderedInstance,
  type FileViewerRendererPlugin,
  type RendererDefinition,
} from '@file-viewer/core';

const epubDefinition = DEFAULT_RENDERER_DEFINITIONS.find(
  definition => definition.id === 'epub'
) as RendererDefinition | undefined;

if (!epubDefinition) {
  throw new Error('@file-viewer/renderer-ebook could not locate the shared EPUB format definition.');
}

export const ebookRendererDefinition = epubDefinition;

export const renderFileViewerEpub: FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement> = (
  buffer,
  target
) => import('./epub.js').then(({ default: renderEpub }) => renderEpub(buffer, target));

export const ebookRenderer: FileViewerRendererPlugin<FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>> = {
  id: 'file-viewer-renderer-ebook',
  label: 'Flyfish File Viewer ebook renderer',
  definitions: [ebookRendererDefinition],
  handlers: [{
    rendererId: ebookRendererDefinition.id,
    handler: renderFileViewerEpub,
  }],
};

export default ebookRenderer;
