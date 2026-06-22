import { DEFAULT_RENDERER_DEFINITIONS, } from '@file-viewer/core';
const emailDefinition = DEFAULT_RENDERER_DEFINITIONS.find(definition => definition.id === 'email');
if (!emailDefinition) {
    throw new Error('@file-viewer/renderer-email could not locate the shared email format definition.');
}
export const emailRendererDefinition = emailDefinition;
export const renderFileViewerEmail = (buffer, target, type, context) => import('./email.js').then(({ default: renderEmail }) => renderEmail(buffer, target, type, context));
export const emailRenderer = {
    id: 'file-viewer-renderer-email',
    label: 'Flyfish File Viewer email renderer',
    definitions: [emailRendererDefinition],
    handlers: [{
            rendererId: emailRendererDefinition.id,
            handler: renderFileViewerEmail,
        }],
};
export default emailRenderer;
