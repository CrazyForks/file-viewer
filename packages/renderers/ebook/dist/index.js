import { DEFAULT_RENDERER_DEFINITIONS, } from '@file-viewer/core';
const epubDefinition = DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === 'epub');
if (!epubDefinition) {
    throw new Error('@file-viewer/renderer-ebook could not locate the shared EPUB format definition.');
}
export const ebookRendererDefinition = epubDefinition;
export const renderFileViewerEpub = (buffer, target) => import('./epub.js').then(({ default: renderEpub }) => renderEpub(buffer, target));
export const ebookRenderer = {
    id: 'file-viewer-renderer-ebook',
    label: 'Flyfish File Viewer ebook renderer',
    definitions: [ebookRendererDefinition],
    handlers: [{
            rendererId: ebookRendererDefinition.id,
            handler: renderFileViewerEpub,
        }],
};
export default ebookRenderer;
