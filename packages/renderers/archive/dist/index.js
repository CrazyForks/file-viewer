import { DEFAULT_RENDERER_DEFINITIONS, } from '@file-viewer/core';
const archiveDefinition = DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === 'archive');
if (!archiveDefinition) {
    throw new Error('@file-viewer/renderer-archive could not locate the shared archive format definition.');
}
export const archiveRendererDefinition = archiveDefinition;
export const renderFileViewerArchive = (buffer, target, type, context) => import('./archive.js').then(({ default: renderArchive }) => renderArchive(buffer, target, type, context));
export const archiveRenderer = {
    id: 'file-viewer-renderer-archive',
    label: 'Flyfish File Viewer archive renderer',
    definitions: [archiveRendererDefinition],
    handlers: [{
            rendererId: archiveRendererDefinition.id,
            handler: renderFileViewerArchive,
        }],
};
export default archiveRenderer;
