import { resolveFileViewerArchiveWasmUrl, resolveFileViewerArchiveWorkerUrl, } from '@file-viewer/core/assets';
import { collectFileViewerRendererPlugins, createFileRenderHandlerLoader, createFileViewerCoreRendererRegistry, createFileViewerTranslator, createRendererRegistry, disposeFileViewerRendered, installFileViewerRendererPlugins, listFileViewerAutoRendererPresets, normalizeSource, resolveFileViewerRendererPresetInputs, } from '@file-viewer/core';
import { buildArchiveNestedRenderContext, createArchiveCacheKey, flattenArchiveObject, formatArchiveBytes, getArchiveEntryExtension, } from './archiveShared.js';
import { readArchiveCache, writeArchiveCache } from './archiveCache.js';
import { isLikelyEncryptedArchive, loadArchiveEntriesWithoutWorker, } from './archiveFallback.js';
const DEFAULT_MAX_ARCHIVE_SIZE = 320 * 1024 * 1024;
const DEFAULT_MAX_ENTRY_PREVIEW_SIZE = 64 * 1024 * 1024;
const DEFAULT_WORKER_TIMEOUT_MS = 30000;
const MAX_LISTED_ENTRIES = 5000;
class ArchivePasswordCancelledError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ArchivePasswordCancelledError';
    }
}
const archiveStyle = `
.archive-shell,.archive-viewer{position:relative;box-sizing:border-box;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;display:grid;grid-template-columns:minmax(280px,34%) minmax(0,1fr);grid-template-rows:minmax(0,1fr);background:#edf2f7;color:#172033;font-family:Aptos,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif}
.archive-shell *,.archive-viewer *{box-sizing:border-box}
.archive-sidebar{grid-column:1;grid-row:1;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column;gap:12px;padding:16px;border-right:1px solid rgba(23,32,51,.08);background:rgba(255,255,255,.72);transition:opacity .18s ease,padding .18s ease,border-color .18s ease}
.archive-shell.archive-sidebar-collapsed,.archive-viewer.archive-sidebar-collapsed{grid-template-columns:0 minmax(0,1fr)}
.archive-sidebar-collapsed .archive-sidebar{display:none;width:0;max-width:0;padding:0;border-color:transparent;opacity:0;pointer-events:none}
.archive-sidebar-collapsed .archive-sidebar>*{visibility:hidden}
.archive-head{min-width:0;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;align-items:start}
.archive-head-main{min-width:0}
.archive-head span,.archive-preview-toolbar span{color:#6c7c90;font-size:12px;font-weight:800;letter-spacing:0}
.archive-head strong,.archive-preview-toolbar strong{display:block;margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:18px;line-height:1.25}
.archive-head p{min-width:0;margin:8px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#69798b;font-size:13px}
.archive-sidebar-toggle{width:34px;height:34px;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border:1px solid rgba(23,32,51,.1);border-radius:10px;background:#fff;color:#1f7a58;font:inherit;font-size:17px;font-weight:900;line-height:1;cursor:pointer;box-shadow:0 6px 16px rgba(23,32,51,.07)}
.archive-sidebar-toggle:hover{border-color:rgba(31,122,88,.32);background:#f0fdf4}
.archive-warning,.archive-info,.archive-error{border-radius:12px;padding:10px 12px;background:#fff7e8;color:#8a4b00;font-size:13px;line-height:1.5}
.archive-info{background:#ecfdf5;color:#166534}
.archive-search{width:100%;height:42px;padding:0 12px;border-radius:12px;border:1px solid rgba(23,32,51,.1);outline:none;background:#fff;color:#172033;font:inherit}
.archive-list{flex:1;min-width:0;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:7px;padding-right:4px}
.archive-entry{width:100%;min-width:0;min-height:58px;display:grid;grid-template-columns:42px minmax(0,1fr) minmax(46px,auto);gap:10px;align-items:center;padding:8px 10px 8px calc(10px + var(--entry-depth,0) * 10px);border:1px solid rgba(23,32,51,.07);border-radius:12px;background:rgba(255,255,255,.86);color:inherit;text-align:left;cursor:pointer;font:inherit}
.archive-entry:hover,.archive-entry.active{border-color:rgba(33,129,95,.28);box-shadow:0 10px 22px rgba(23,32,51,.08)}
.entry-ext{height:34px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;background:rgba(33,129,95,.12);color:#1d7a56;font-size:11px;font-weight:900;text-transform:uppercase}
.entry-copy{min-width:0}
.entry-copy strong,.entry-copy em{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.entry-copy em,.archive-entry small{color:#718096;font-size:12px;font-style:normal}
.archive-entry small{min-width:0;max-width:74px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
.archive-preview{grid-column:2;grid-row:1;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden;display:flex;flex-direction:column}
.archive-preview-toolbar{min-width:0;min-height:64px;display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(23,32,51,.08);background:rgba(255,255,255,.76)}
.archive-preview-toolbar button{height:34px;border:0;border-radius:10px;padding:0 12px;background:#1f7a58;color:#fff;font:inherit;font-size:13px;font-weight:800;cursor:pointer}
.archive-preview-toolbar .archive-sidebar-toggle{background:#fff;color:#1f7a58;border:1px solid rgba(23,32,51,.1);padding:0}
.archive-preview-title{min-width:0;flex:1}
.archive-preview-toolbar span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.archive-preview-toolbar .archive-download-button{flex:0 0 auto}
.archive-nested-target{position:relative;flex:1;min-height:0;overflow:auto}
.archive-nested-content{width:100%;height:100%;min-height:420px}
.archive-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;color:#64748b}
.archive-empty strong{color:#172033;font-size:18px}
.archive-state{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(241,245,249,.82);backdrop-filter:blur(8px);z-index:4}
.archive-state>div{display:flex;align-items:center;gap:14px;width:min(92%,430px);padding:18px;border-radius:16px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.14)}
.archive-state p{margin:4px 0 0;color:#64748b}
.archive-spinner{width:34px;height:34px;flex-shrink:0;border-radius:999px;border:3px solid rgba(31,122,88,.16);border-top-color:#1f7a58;animation:archive-spin .9s linear infinite}
.archive-error{position:absolute;right:18px;bottom:18px;width:min(460px,calc(100% - 36px));box-shadow:0 16px 36px rgba(23,32,51,.14);z-index:5}
.archive-password-dialog{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;padding:22px;background:rgba(15,23,42,.42);backdrop-filter:blur(10px)}
.archive-password-card{width:min(420px,100%);display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:18px;background:#fff;color:#172033;box-shadow:0 24px 56px rgba(15,23,42,.24)}
.archive-password-card h3{margin:0;font-size:19px;line-height:1.25}
.archive-password-card p{margin:0;color:#64748b;font-size:13px;line-height:1.55}
.archive-password-card input{width:100%;height:44px;border-radius:12px;border:1px solid rgba(23,32,51,.12);outline:none;padding:0 12px;background:#fff;color:#172033;font:inherit}
.archive-password-card input:focus{border-color:rgba(31,122,88,.48);box-shadow:0 0 0 3px rgba(31,122,88,.12)}
.archive-password-error{min-height:18px;color:#b42318!important}
.archive-password-actions{display:flex;justify-content:flex-end;gap:10px}
.archive-password-actions button{height:38px;border:0;border-radius:10px;padding:0 14px;font:inherit;font-weight:800;cursor:pointer}
.archive-password-cancel{background:#eef2f7;color:#334155}
.archive-password-submit{background:#1f7a58;color:#fff}
.archive-hidden{display:none!important}
.file-viewer[data-viewer-theme='dark'] .archive-shell,.file-viewer[data-viewer-theme='dark'] .archive-viewer{background:#101820;color:#e6edf3}
.file-viewer[data-viewer-theme='dark'] .archive-sidebar,.file-viewer[data-viewer-theme='dark'] .archive-preview-toolbar{border-color:rgba(139,148,158,.2);background:rgba(21,27,35,.82)}
.file-viewer[data-viewer-theme='dark'] .archive-entry,.file-viewer[data-viewer-theme='dark'] .archive-search,.file-viewer[data-viewer-theme='dark'] .archive-state>div{background:#151b23;color:#e6edf3;border-color:rgba(139,148,158,.2)}
.file-viewer[data-viewer-theme='dark'] .archive-password-card{background:#151b23;color:#e6edf3}
.file-viewer[data-viewer-theme='dark'] .archive-password-card input{background:#0d1117;color:#e6edf3;border-color:rgba(139,148,158,.24)}
.file-viewer[data-viewer-theme='dark'] .archive-password-cancel{background:#212a35;color:#d7dee8}
.file-viewer[data-viewer-theme='dark'] .archive-empty strong{color:#f8fafc}
@media (prefers-color-scheme:dark){.file-viewer[data-viewer-theme='system'] .archive-shell,.file-viewer[data-viewer-theme='system'] .archive-viewer{background:#101820;color:#e6edf3}.file-viewer[data-viewer-theme='system'] .archive-sidebar,.file-viewer[data-viewer-theme='system'] .archive-preview-toolbar{border-color:rgba(139,148,158,.2);background:rgba(21,27,35,.82)}.file-viewer[data-viewer-theme='system'] .archive-entry,.file-viewer[data-viewer-theme='system'] .archive-search,.file-viewer[data-viewer-theme='system'] .archive-state>div{background:#151b23;color:#e6edf3;border-color:rgba(139,148,158,.2)}.file-viewer[data-viewer-theme='system'] .archive-password-card{background:#151b23;color:#e6edf3}.file-viewer[data-viewer-theme='system'] .archive-password-card input{background:#0d1117;color:#e6edf3;border-color:rgba(139,148,158,.24)}.file-viewer[data-viewer-theme='system'] .archive-password-cancel{background:#212a35;color:#d7dee8}.file-viewer[data-viewer-theme='system'] .archive-empty strong{color:#f8fafc}}
@keyframes archive-spin{to{transform:rotate(360deg)}}
@media (max-width:860px){.archive-shell,.archive-viewer{grid-template-columns:1fr;grid-template-rows:minmax(220px,38%) minmax(0,1fr)}.archive-shell.archive-sidebar-collapsed,.archive-viewer.archive-sidebar-collapsed{grid-template-columns:1fr;grid-template-rows:0 minmax(0,1fr)}.archive-sidebar{grid-column:1;grid-row:1;border-right:0;border-bottom:1px solid rgba(23,32,51,.08)}.archive-preview{grid-column:1;grid-row:2}.archive-preview-toolbar{min-height:56px;padding:10px 12px}.archive-head strong,.archive-preview-toolbar strong{font-size:16px}.archive-entry{grid-template-columns:38px minmax(0,1fr) minmax(40px,auto)}}
`;
const createStyle = (documentRef) => {
    const style = documentRef.createElement('style');
    style.textContent = archiveStyle;
    return style;
};
const createElement = (documentRef, tagName, className, text) => {
    const element = documentRef.createElement(tagName);
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
};
const normalizeWorkerError = (reason) => {
    if (reason instanceof Error) {
        return reason.message;
    }
    return typeof reason === 'string' ? reason : JSON.stringify(reason);
};
const isArchivePasswordError = (reason) => {
    const message = normalizeWorkerError(reason).toLowerCase();
    return /passphrase|password|encrypted|decrypt|crypto|wrong key|incorrect/i.test(message);
};
const resolveAutoRenderersEnabled = (options = {}) => {
    const setting = options.autoRenderers;
    if (typeof setting === 'boolean') {
        return setting;
    }
    if ((setting === null || setting === void 0 ? void 0 : setting.enabled) !== undefined) {
        return setting.enabled;
    }
    return (options.rendererMode || 'extend') !== 'replace';
};
const createNestedRendererRegistry = async (context) => {
    const options = (context === null || context === void 0 ? void 0 : context.options) || {};
    const registry = options.rendererMode === 'replace'
        ? createRendererRegistry([])
        : createFileViewerCoreRendererRegistry({
            builtinRenderers: options.builtinRenderers,
        }).registry;
    const rendererInputs = [];
    if (resolveAutoRenderersEnabled(options)) {
        rendererInputs.push(...listFileViewerAutoRendererPresets());
    }
    rendererInputs.push(...resolveFileViewerRendererPresetInputs(options.preset), ...resolveFileViewerRendererPresetInputs(options.presets));
    if (options.renderers) {
        rendererInputs.push(options.renderers);
    }
    const plugins = collectFileViewerRendererPlugins(rendererInputs);
    if (!plugins.length) {
        return registry;
    }
    await installFileViewerRendererPlugins({
        registry,
        plugins,
        registerHandler: registration => {
            const definition = registry.getById(registration.rendererId);
            if (!definition) {
                return;
            }
            registry.register({
                ...definition,
                load: createFileRenderHandlerLoader({
                    handler: registration.handler,
                    getTarget: loadContext => loadContext.surface.container,
                }),
            });
        },
    });
    return registry;
};
const createNestedRenderedInstance = (target, session) => ({
    $el: target,
    destroy: () => { var _a; return (_a = session.destroy) === null || _a === void 0 ? void 0 : _a.call(session); },
});
const withTimeout = async (promise, timeout, message, targetWindow) => {
    let timer = 0;
    const timerWindow = targetWindow || (typeof window !== 'undefined' ? window : undefined);
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = (timerWindow === null || timerWindow === void 0 ? void 0 : timerWindow.setTimeout)
                    ? timerWindow.setTimeout(() => reject(new Error(message)), timeout)
                    : setTimeout(() => reject(new Error(message)), timeout);
            }),
        ]);
    }
    finally {
        if (timerWindow === null || timerWindow === void 0 ? void 0 : timerWindow.clearTimeout) {
            timerWindow.clearTimeout(timer);
        }
        else {
            clearTimeout(timer);
        }
    }
};
const getDocumentBaseUrl = (documentRef) => {
    return documentRef.baseURI ||
        documentRef.URL ||
        'http://localhost/';
};
const getWorkerConstructor = (documentRef) => {
    var _a;
    const WorkerCtor = ((_a = documentRef.defaultView) === null || _a === void 0 ? void 0 : _a.Worker) ||
        (typeof Worker !== 'undefined' ? Worker : undefined);
    if (!WorkerCtor) {
        throw new Error('Web Worker is not supported by this browser.');
    }
    return WorkerCtor;
};
const getFileConstructor = (documentRef) => {
    var _a;
    return (((_a = documentRef.defaultView) === null || _a === void 0 ? void 0 : _a.File) ||
        (typeof File !== 'undefined' ? File : undefined));
};
const createArchiveFile = (documentRef, buffer, filename) => {
    const FileCtor = getFileConstructor(documentRef);
    if (FileCtor) {
        return new FileCtor([buffer], filename || 'archive.bin', {
            type: 'application/octet-stream',
        });
    }
    return Object.assign(new Blob([buffer], { type: 'application/octet-stream' }), {
        name: filename || 'archive.bin',
    });
};
const probeWorkerUrl = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && /javascript|ecmascript|octet-stream/i.test(contentType)) {
            return true;
        }
        if (response.status && response.status !== 405) {
            return false;
        }
    }
    catch {
        // Some local servers do not support HEAD; continue with a tiny GET probe.
    }
    try {
        const response = await fetch(url, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                Range: 'bytes=0-0',
            },
        });
        const contentType = response.headers.get('content-type') || '';
        return response.ok && /javascript|ecmascript|octet-stream/i.test(contentType);
    }
    catch {
        return false;
    }
};
const patchLibarchiveWorkerSource = (source, wasmUrl) => {
    const wasmLiteral = JSON.stringify(wasmUrl);
    return source.replace(/new URL\((['"])libarchive\.wasm\1\s*,\s*import\.meta\.url\)\.href/g, wasmLiteral);
};
const prepareWorkerUrl = async (candidate, objectUrls) => {
    if (!candidate.wasmUrl) {
        return candidate.workerUrl;
    }
    const response = await fetch(candidate.workerUrl, { cache: 'no-cache' });
    if (!response.ok) {
        throw new Error(`Unable to read libarchive Worker: ${response.status}`);
    }
    const source = await response.text();
    const workerUrl = URL.createObjectURL(new Blob([
        patchLibarchiveWorkerSource(source, candidate.wasmUrl),
    ], { type: 'application/javascript' }));
    objectUrls.push(workerUrl);
    return workerUrl;
};
const resolveWorkerCandidates = async (documentRef, options) => {
    const candidates = [];
    const baseUrl = getDocumentBaseUrl(documentRef);
    const wasmUrl = (options === null || options === void 0 ? void 0 : options.wasmUrl)
        ? resolveFileViewerArchiveWasmUrl(options, '')
        : undefined;
    if (options === null || options === void 0 ? void 0 : options.workerUrl) {
        candidates.push({
            label: 'custom libarchive Worker',
            workerUrl: resolveFileViewerArchiveWorkerUrl(options, baseUrl),
            wasmUrl,
        });
        return candidates;
    }
    const publicWorkerUrl = resolveFileViewerArchiveWorkerUrl(undefined, baseUrl);
    if (await probeWorkerUrl(publicWorkerUrl)) {
        candidates.push({
            label: 'static libarchive Worker',
            workerUrl: publicWorkerUrl,
            wasmUrl,
        });
    }
    return candidates;
};
const renderNestedWithCurrentOptions = async (buffer, type, target, context) => {
    const t = createFileViewerTranslator(context === null || context === void 0 ? void 0 : context.options);
    const registry = await createNestedRendererRegistry(context);
    const renderer = registry.getByExtension(type);
    if (!(renderer === null || renderer === void 0 ? void 0 : renderer.load)) {
        target.textContent = t('archive.error.nestedUnsupported', { type });
        return undefined;
    }
    const session = await renderer.load({
        source: normalizeSource({
            buffer,
            filename: (context === null || context === void 0 ? void 0 : context.filename) || `preview.${type}`,
            type,
            url: context === null || context === void 0 ? void 0 : context.url,
        }),
        surface: { container: target },
        options: (context === null || context === void 0 ? void 0 : context.options) || {},
        registerExportAdapter: context === null || context === void 0 ? void 0 : context.registerExportAdapter,
        renderContext: {
            ...context,
            renderNestedBuffer: (context === null || context === void 0 ? void 0 : context.renderNestedBuffer) || renderNestedWithCurrentOptions,
        },
    });
    return createNestedRenderedInstance(target, session);
};
const renderNestedEntry = (buffer, type, target, context) => {
    const nestedRender = (context === null || context === void 0 ? void 0 : context.renderNestedBuffer) || renderNestedWithCurrentOptions;
    return nestedRender(buffer, type, target, {
        ...context,
        renderNestedBuffer: (context === null || context === void 0 ? void 0 : context.renderNestedBuffer) || renderNestedWithCurrentOptions,
    });
};
export default async function renderArchive(buffer, target, _type, context) {
    var _a;
    const documentRef = target.ownerDocument;
    const targetWindow = documentRef.defaultView || null;
    const archiveOptions = (_a = context === null || context === void 0 ? void 0 : context.options) === null || _a === void 0 ? void 0 : _a.archive;
    const filename = (context === null || context === void 0 ? void 0 : context.filename) || 'archive.bin';
    const maxArchiveSize = (archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.maxArchiveSize) || DEFAULT_MAX_ARCHIVE_SIZE;
    const maxEntryPreviewSize = (archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.maxEntryPreviewSize) || DEFAULT_MAX_ENTRY_PREVIEW_SIZE;
    const cacheEnabled = (archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.cache) !== false;
    const workerTimeoutMs = (archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.workerTimeoutMs) || DEFAULT_WORKER_TIMEOUT_MS;
    const objectUrls = [];
    const cleanups = [];
    let archiveReader = null;
    let entries = [];
    let selectedEntry = null;
    let nestedRendered;
    let loading = false;
    const t = createFileViewerTranslator(context === null || context === void 0 ? void 0 : context.options);
    let loadingText = t('archive.loading.readingDirectory');
    let loadingHint = t('archive.loading.readingDirectoryHint');
    let errorText = '';
    let archiveNotice = '';
    let encrypted = null;
    let filterText = '';
    let passwordAttempt = 0;
    let passwordResolver = null;
    let sidebarCollapsed = false;
    const style = createStyle(documentRef);
    const root = createElement(documentRef, 'section', 'archive-shell archive-viewer');
    const sidebar = createElement(documentRef, 'aside', 'archive-sidebar');
    const head = createElement(documentRef, 'div', 'archive-head');
    const headMain = createElement(documentRef, 'div', 'archive-head-main');
    const badge = createElement(documentRef, 'span', undefined, 'ARCHIVE');
    const title = createElement(documentRef, 'strong', undefined, filename);
    title.title = filename;
    const stats = createElement(documentRef, 'p');
    const sidebarHideButton = createElement(documentRef, 'button', 'archive-sidebar-toggle');
    sidebarHideButton.type = 'button';
    headMain.append(badge, title, stats);
    head.append(headMain, sidebarHideButton);
    const warning = createElement(documentRef, 'div', 'archive-warning');
    const info = createElement(documentRef, 'div', 'archive-info');
    const search = createElement(documentRef, 'input', 'archive-search');
    search.type = 'search';
    search.placeholder = t('archive.search.placeholder');
    const list = createElement(documentRef, 'div', 'archive-list');
    list.setAttribute('role', 'list');
    sidebar.append(head, warning, info, search, list);
    const preview = createElement(documentRef, 'main', 'archive-preview');
    const toolbar = createElement(documentRef, 'div', 'archive-preview-toolbar');
    const sidebarShowButton = createElement(documentRef, 'button', 'archive-sidebar-toggle');
    sidebarShowButton.type = 'button';
    const toolbarTitle = createElement(documentRef, 'div', 'archive-preview-title');
    toolbarTitle.append(createElement(documentRef, 'span', undefined, t('archive.preview.title')), createElement(documentRef, 'strong', undefined, t('archive.preview.chooseFile')));
    const downloadButton = createElement(documentRef, 'button', 'archive-download-button', t('archive.preview.downloadFile'));
    downloadButton.type = 'button';
    toolbar.append(sidebarShowButton, toolbarTitle, downloadButton);
    const nestedTarget = createElement(documentRef, 'div', 'archive-nested-target');
    preview.append(toolbar, nestedTarget);
    root.append(sidebar, preview);
    const state = createElement(documentRef, 'div', 'archive-state');
    const stateContent = createElement(documentRef, 'div');
    const spinner = createElement(documentRef, 'span', 'archive-spinner');
    const stateCopy = createElement(documentRef, 'div');
    const stateTitle = createElement(documentRef, 'strong', undefined, loadingText);
    const stateHint = createElement(documentRef, 'p', undefined, loadingHint);
    stateCopy.append(stateTitle, stateHint);
    stateContent.append(spinner, stateCopy);
    state.append(stateContent);
    root.append(state);
    const error = createElement(documentRef, 'div', 'archive-error');
    const errorTitle = createElement(documentRef, 'strong', undefined, t('archive.error.title'));
    const errorMessage = createElement(documentRef, 'p');
    error.append(errorTitle, errorMessage);
    root.append(error);
    const passwordDialog = createElement(documentRef, 'div', 'archive-password-dialog archive-hidden');
    passwordDialog.setAttribute('role', 'dialog');
    passwordDialog.setAttribute('aria-modal', 'true');
    const passwordCard = createElement(documentRef, 'form', 'archive-password-card');
    const passwordTitle = createElement(documentRef, 'h3', undefined, t('archive.password.title'));
    const passwordDescription = createElement(documentRef, 'p', undefined, t('archive.password.description'));
    const passwordInput = createElement(documentRef, 'input');
    passwordInput.type = 'password';
    passwordInput.autocomplete = 'current-password';
    passwordInput.placeholder = t('archive.password.placeholder');
    const passwordError = createElement(documentRef, 'p', 'archive-password-error');
    const passwordActions = createElement(documentRef, 'div', 'archive-password-actions');
    const passwordCancelButton = createElement(documentRef, 'button', 'archive-password-cancel', t('archive.password.cancel'));
    passwordCancelButton.type = 'button';
    const passwordSubmitButton = createElement(documentRef, 'button', 'archive-password-submit', t('archive.password.confirm'));
    passwordSubmitButton.type = 'submit';
    passwordActions.append(passwordCancelButton, passwordSubmitButton);
    passwordCard.append(passwordTitle, passwordDescription, passwordInput, passwordError, passwordActions);
    passwordDialog.append(passwordCard);
    root.append(passwordDialog);
    target.replaceChildren(style, root);
    const listen = (element, event, listener) => {
        element.addEventListener(event, listener);
        cleanups.push(() => element.removeEventListener(event, listener));
    };
    const closePasswordDialog = (password) => {
        passwordDialog.classList.add('archive-hidden');
        const resolve = passwordResolver;
        passwordResolver = null;
        resolve === null || resolve === void 0 ? void 0 : resolve(password);
    };
    const requestPasswordWithDialog = async (reason, previousError) => {
        const wasLoading = loading;
        if (wasLoading) {
            loading = false;
            syncState();
            renderEmptyState();
        }
        passwordDescription.textContent = t('archive.password.description');
        passwordError.textContent = previousError || reason === 'invalid-password'
            ? t('archive.password.invalid')
            : '';
        passwordInput.value = '';
        passwordDialog.classList.remove('archive-hidden');
        targetWindow === null || targetWindow === void 0 ? void 0 : targetWindow.setTimeout(() => passwordInput.focus(), 0);
        return new Promise((resolve) => {
            passwordResolver = password => {
                if (wasLoading && password !== null) {
                    loading = true;
                    syncState();
                    renderEmptyState();
                }
                resolve(password);
            };
        });
    };
    const requestArchivePassword = async (reason, entry, previousError) => {
        passwordAttempt += 1;
        const contextPayload = {
            filename,
            entryName: entry === null || entry === void 0 ? void 0 : entry.name,
            attempt: passwordAttempt,
            reason,
            error: previousError,
        };
        if ((archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.password) && passwordAttempt === 1 && !previousError) {
            return archiveOptions.password;
        }
        if (archiveOptions === null || archiveOptions === void 0 ? void 0 : archiveOptions.requestPassword) {
            const customPassword = await archiveOptions.requestPassword(contextPayload);
            return customPassword !== null && customPassword !== void 0 ? customPassword : null;
        }
        return requestPasswordWithDialog(reason, previousError);
    };
    const applyArchivePassword = async (password) => {
        var _a;
        await ((_a = archiveReader === null || archiveReader === void 0 ? void 0 : archiveReader.usePassword) === null || _a === void 0 ? void 0 : _a.call(archiveReader, password));
    };
    const requestAndApplyPassword = async (reason, entry, previousError) => {
        const password = await requestArchivePassword(reason, entry, previousError);
        if (password === null) {
            throw new ArchivePasswordCancelledError(t('archive.error.passwordRequired'));
        }
        await applyArchivePassword(password);
    };
    listen(passwordCard, 'submit', (event) => {
        event.preventDefault();
        const password = passwordInput.value;
        if (!password) {
            passwordError.textContent = t('archive.password.required');
            passwordInput.focus();
            return;
        }
        closePasswordDialog(password);
    });
    listen(passwordCancelButton, 'click', () => {
        closePasswordDialog(null);
    });
    listen(passwordDialog, 'keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closePasswordDialog(null);
        }
    });
    listen(sidebarHideButton, 'click', () => {
        sidebarCollapsed = true;
        syncState();
    });
    listen(sidebarShowButton, 'click', () => {
        sidebarCollapsed = !sidebarCollapsed;
        syncState();
    });
    const getArchiveStats = () => {
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        const previewableCount = entries.filter(entry => entry.previewable).length;
        return {
            count: entries.length,
            totalSize,
            previewableCount,
        };
    };
    const getFilteredEntries = () => {
        const keyword = filterText.trim().toLowerCase();
        const source = keyword
            ? entries.filter(entry => entry.path.toLowerCase().includes(keyword))
            : entries;
        return source.slice(0, MAX_LISTED_ENTRIES);
    };
    const clearNestedPreview = async () => {
        await disposeFileViewerRendered(nestedRendered);
        nestedRendered = undefined;
        nestedTarget.replaceChildren();
    };
    const closeArchive = async () => {
        var _a;
        await ((_a = archiveReader === null || archiveReader === void 0 ? void 0 : archiveReader.close) === null || _a === void 0 ? void 0 : _a.call(archiveReader));
        archiveReader = null;
    };
    const syncSidebarToggleState = () => {
        const showLabel = t('archive.sidebar.show');
        const hideLabel = t('archive.sidebar.hide');
        const activeLabel = sidebarCollapsed ? showLabel : hideLabel;
        root.classList.toggle('archive-sidebar-collapsed', sidebarCollapsed);
        sidebarHideButton.textContent = '‹';
        sidebarShowButton.textContent = sidebarCollapsed ? '☰' : '‹';
        sidebarHideButton.title = hideLabel;
        sidebarShowButton.title = activeLabel;
        sidebarHideButton.setAttribute('aria-label', hideLabel);
        sidebarShowButton.setAttribute('aria-label', activeLabel);
        sidebarHideButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
        sidebarShowButton.setAttribute('aria-expanded', String(!sidebarCollapsed));
    };
    const syncState = () => {
        const archiveStats = getArchiveStats();
        stats.textContent = t('archive.stats.summary', {
            count: archiveStats.count,
            size: formatArchiveBytes(archiveStats.totalSize),
            previewable: archiveStats.previewableCount,
        });
        warning.textContent = t('archive.warning.encrypted');
        warning.classList.toggle('archive-hidden', !encrypted);
        info.textContent = archiveNotice;
        info.classList.toggle('archive-hidden', !archiveNotice);
        state.classList.toggle('archive-hidden', !loading);
        stateTitle.textContent = loadingText;
        stateHint.textContent = loadingHint;
        error.classList.toggle('archive-hidden', !errorText);
        errorMessage.textContent = errorText;
        downloadButton.hidden = !selectedEntry;
        const activeTitle = toolbarTitle.querySelector('strong');
        if (activeTitle) {
            activeTitle.textContent = (selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.name) || t('archive.preview.chooseFile');
            activeTitle.setAttribute('title', (selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.path) || (selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.name) || '');
        }
        syncSidebarToggleState();
    };
    const renderEmptyState = () => {
        if (selectedEntry || loading || nestedTarget.childElementCount) {
            return;
        }
        const empty = createElement(documentRef, 'div', 'archive-empty');
        empty.append(createElement(documentRef, 'strong', undefined, t('archive.empty.title')), createElement(documentRef, 'p', undefined, t('archive.empty.message')));
        nestedTarget.replaceChildren(empty);
    };
    const renderEntryList = () => {
        list.replaceChildren();
        getFilteredEntries().forEach(entry => {
            const button = createElement(documentRef, 'button', 'archive-entry');
            button.type = 'button';
            button.style.setProperty('--entry-depth', String(entry.depth));
            button.classList.toggle('active', (selectedEntry === null || selectedEntry === void 0 ? void 0 : selectedEntry.id) === entry.id);
            const icon = createElement(documentRef, 'span', 'entry-ext', entry.extension || 'file');
            const copy = createElement(documentRef, 'span', 'entry-copy');
            const nameNode = createElement(documentRef, 'strong', undefined, entry.name);
            const pathNode = createElement(documentRef, 'em', undefined, entry.path);
            const sizeText = formatArchiveBytes(entry.size);
            const sizeNode = createElement(documentRef, 'small', undefined, sizeText);
            nameNode.title = entry.name;
            pathNode.title = entry.path;
            sizeNode.title = sizeText;
            button.title = entry.path;
            copy.append(nameNode, pathNode);
            button.append(icon, copy, sizeNode);
            button.addEventListener('click', () => {
                void previewEntry(entry);
            });
            list.append(button);
        });
    };
    const setLoading = (next, text, hint) => {
        loading = next;
        if (text) {
            loadingText = text;
        }
        if (hint) {
            loadingHint = hint;
        }
        syncState();
        renderEmptyState();
    };
    const setError = (message) => {
        errorText = message;
        syncState();
    };
    const terminateWorkers = (workers) => {
        workers.forEach(worker => worker.terminate());
        workers.length = 0;
    };
    const readArchiveDirectoryWithPassword = async (archive, candidate) => {
        for (;;) {
            try {
                return await withTimeout(archive.getFilesObject(), workerTimeoutMs, t('archive.error.candidateReadTimeout', { label: candidate.label }), targetWindow);
            }
            catch (reason) {
                if (!encrypted && !isArchivePasswordError(reason)) {
                    throw reason;
                }
                await requestAndApplyPassword(encrypted ? 'invalid-password' : 'read-failed', undefined, reason);
            }
        }
    };
    const tryOpenArchiveWithWorker = async (Archive, candidate) => {
        const createdWorkers = [];
        const workerUrl = await prepareWorkerUrl(candidate, objectUrls);
        const WorkerCtor = getWorkerConstructor(documentRef);
        try {
            Archive.init({
                getWorker: () => {
                    const worker = new WorkerCtor(workerUrl, { type: 'module' });
                    createdWorkers.push(worker);
                    return worker;
                },
            });
            setLoading(true, t('archive.loading.initializingCandidate', { label: candidate.label }), t('archive.loading.initializingCandidateHint'));
            const archiveFile = createArchiveFile(documentRef, buffer, filename);
            const archive = await withTimeout(Archive.open(archiveFile), workerTimeoutMs, t('archive.error.candidateInitTimeout', { label: candidate.label }), targetWindow);
            archiveReader = archive;
            encrypted = await withTimeout(archive.hasEncryptedData(), workerTimeoutMs, t('archive.error.encryptedCheckTimeout', { label: candidate.label }), targetWindow).catch(() => null);
            if (encrypted) {
                await requestAndApplyPassword('encrypted');
            }
            setLoading(true, t('archive.loading.readingDirectory'), t('archive.loading.directoryReadyHint'));
            const fileTree = await readArchiveDirectoryWithPassword(archive, candidate);
            entries = flattenArchiveObject(fileTree)
                .sort((left, right) => left.path.localeCompare(right.path));
            syncState();
            renderEntryList();
            renderEmptyState();
            return true;
        }
        catch (reason) {
            if (!archiveReader) {
                terminateWorkers(createdWorkers);
            }
            throw reason;
        }
    };
    const tryOpenArchiveWithFallback = async () => {
        setLoading(true, t('archive.loading.workerFallback'), t('archive.loading.workerFallbackHint'));
        const fallbackEntries = await loadArchiveEntriesWithoutWorker(buffer, filename);
        if (!fallbackEntries) {
            return false;
        }
        entries = fallbackEntries.sort((left, right) => left.path.localeCompare(right.path));
        encrypted = null;
        archiveNotice = t('archive.notice.workerFallback');
        syncState();
        renderEntryList();
        renderEmptyState();
        return true;
    };
    const openArchive = async () => {
        if (buffer.byteLength > maxArchiveSize) {
            setError(t('archive.error.tooLarge', {
                size: formatArchiveBytes(buffer.byteLength),
                limit: formatArchiveBytes(maxArchiveSize),
            }));
            return;
        }
        setLoading(true, t('archive.loading.initializingWorker'), t('archive.loading.initializingWorkerHint'));
        setError('');
        archiveNotice = '';
        try {
            const [{ Archive }, candidates] = await Promise.all([
                import('libarchive.js'),
                resolveWorkerCandidates(documentRef, archiveOptions),
            ]);
            const errors = [];
            for (const candidate of candidates) {
                try {
                    await closeArchive();
                    await tryOpenArchiveWithWorker(Archive, candidate);
                    return;
                }
                catch (reason) {
                    if (reason instanceof ArchivePasswordCancelledError) {
                        throw reason;
                    }
                    errors.push(`${candidate.label}: ${normalizeWorkerError(reason)}`);
                }
            }
            await closeArchive();
            if (isLikelyEncryptedArchive(buffer, filename)) {
                encrypted = true;
                syncState();
                throw new Error(t('archive.error.encryptedRequiresWorker'));
            }
            if (await tryOpenArchiveWithFallback()) {
                return;
            }
            throw new Error(errors.join('; ') || t('archive.error.workerInitFailed'));
        }
        catch (nextError) {
            console.error(nextError);
            setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
        finally {
            setLoading(false);
        }
    };
    const renderEntryBuffer = async (entry, entryBuffer) => {
        await clearNestedPreview();
        const child = createElement(documentRef, 'div', 'archive-nested-content');
        nestedTarget.append(child);
        const nestedContext = buildArchiveNestedRenderContext(context, entry, archiveOptions);
        nestedRendered = await renderNestedEntry(entryBuffer, entry.extension, child, nestedContext);
    };
    const extractEntryBuffer = async (entry) => {
        const cacheKey = createArchiveCacheKey(filename, buffer.byteLength, entry);
        if (cacheEnabled) {
            const cached = await readArchiveCache(cacheKey);
            if (cached) {
                return cached.buffer;
            }
        }
        let file;
        for (;;) {
            try {
                file = await entry.compressedFile.extract();
                break;
            }
            catch (reason) {
                if (!archiveReader || !isArchivePasswordError(reason)) {
                    throw reason;
                }
                encrypted = true;
                syncState();
                await requestAndApplyPassword('extract-failed', entry, reason);
            }
        }
        const entryBuffer = await file.arrayBuffer();
        if (cacheEnabled) {
            await writeArchiveCache({
                key: cacheKey,
                filename: entry.name,
                size: entryBuffer.byteLength,
                updatedAt: Date.now(),
                buffer: entryBuffer,
            });
        }
        return entryBuffer;
    };
    async function previewEntry(entry) {
        selectedEntry = entry;
        renderEntryList();
        syncState();
        if (entry.size > maxEntryPreviewSize) {
            setError(t('archive.error.entryTooLarge', {
                name: entry.name,
                size: formatArchiveBytes(entry.size),
                limit: formatArchiveBytes(maxEntryPreviewSize),
            }));
            return;
        }
        setLoading(true, t('archive.loading.extracting', { name: entry.name }));
        setError('');
        try {
            const entryBuffer = await extractEntryBuffer(entry);
            setLoading(true, t('archive.loading.rendering', { name: entry.name }));
            await renderEntryBuffer(entry, entryBuffer);
        }
        catch (nextError) {
            console.error(nextError);
            setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
        finally {
            setLoading(false);
        }
    }
    const downloadEntry = async (entry) => {
        setLoading(true, t('archive.loading.exporting', { name: entry.name }));
        try {
            const entryBuffer = await extractEntryBuffer(entry);
            const url = URL.createObjectURL(new Blob([entryBuffer]));
            objectUrls.push(url);
            const link = documentRef.createElement('a');
            link.href = url;
            link.download = entry.name;
            documentRef.body.append(link);
            link.click();
            link.remove();
        }
        finally {
            setLoading(false);
        }
    };
    listen(search, 'input', () => {
        filterText = search.value;
        renderEntryList();
    });
    listen(downloadButton, 'click', () => {
        if (selectedEntry) {
            void downloadEntry(selectedEntry);
        }
    });
    syncState();
    renderEmptyState();
    void openArchive();
    return {
        $el: root,
        async unmount() {
            closePasswordDialog(null);
            cleanups.splice(0).forEach(cleanup => cleanup());
            await clearNestedPreview();
            await closeArchive();
            objectUrls.forEach(url => URL.revokeObjectURL(url));
            target.replaceChildren();
        },
    };
}
