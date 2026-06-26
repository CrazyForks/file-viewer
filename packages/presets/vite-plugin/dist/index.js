import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { copyFile, cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, join, resolve } from 'node:path';
const virtualModuleId = 'virtual:file-viewer-renderers';
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const pluginRequire = createRequire(import.meta.url);
let workspacePackageJsonCache = null;
const rendererModules = [
    {
        id: 'pdf',
        packageName: '@file-viewer/renderer-pdf',
        exportName: 'pdfRenderer',
        formats: ['pdf'],
        rendererIds: ['pdf'],
        chunkName: 'file-viewer-pdf'
    },
    {
        id: 'ofd',
        packageName: '@file-viewer/renderer-ofd',
        exportName: 'ofdRenderer',
        formats: ['ofd'],
        rendererIds: ['ofd'],
        chunkName: 'file-viewer-ofd'
    },
    {
        id: 'cad',
        packageName: '@file-viewer/renderer-cad',
        exportName: 'cadRenderer',
        formats: ['cad', 'dwg', 'dxf', 'dwf', 'dwfx', 'xps'],
        rendererIds: ['cad'],
        chunkName: 'file-viewer-cad'
    },
    {
        id: 'typst',
        packageName: '@file-viewer/renderer-typst',
        exportName: 'typstRenderer',
        formats: ['typ', 'typst'],
        rendererIds: ['typst'],
        chunkName: 'file-viewer-typst'
    },
    {
        id: 'presentation',
        packageName: '@file-viewer/renderer-presentation',
        exportName: 'presentationRenderer',
        formats: ['presentation', 'pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'],
        rendererIds: ['office-presentation'],
        chunkName: 'file-viewer-presentation'
    },
    {
        id: 'word',
        packageName: '@file-viewer/renderer-word',
        exportName: 'wordRenderer',
        formats: ['word', 'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'odt', 'odp', 'rtf'],
        rendererIds: ['office-word-openxml', 'office-word-binary', 'open-document'],
        chunkName: 'file-viewer-word'
    },
    {
        id: 'spreadsheet',
        packageName: '@file-viewer/renderer-spreadsheet',
        exportName: 'spreadsheetRenderer',
        formats: ['spreadsheet', 'excel', 'xls', 'xlsx', 'xltx', 'xlsm', 'xlsb', 'xlt', 'xltm', 'csv', 'tsv', 'ods', 'fods', 'numbers'],
        rendererIds: ['spreadsheet-openxml'],
        chunkName: 'file-viewer-spreadsheet'
    },
    {
        id: 'drawing',
        packageName: '@file-viewer/renderer-drawing',
        exportName: 'drawingRenderer',
        formats: ['drawing', 'drawio', 'dio', 'excalidraw', 'mermaid', 'mmd', 'plantuml', 'puml'],
        rendererIds: ['drawing'],
        chunkName: 'file-viewer-drawing'
    },
    {
        id: 'model',
        packageName: '@file-viewer/renderer-3d',
        exportName: 'modelRenderer',
        formats: [
            '3d',
            'model',
            'stl',
            'obj',
            'gltf',
            'glb',
            'fbx',
            'dae',
            '3ds',
            '3mf',
            'amf',
            'ply',
            'pcd',
            'vrml',
            'wrl',
            'vtk',
            'vtp',
            'xyz',
            'usd',
            'usda',
            'usdc',
            'usdz',
            'kmz',
            'step',
            'stp',
            'iges',
            'igs',
            'ifc',
            '3dm',
            'brep'
        ],
        rendererIds: ['model'],
        chunkName: 'file-viewer-3d'
    },
    {
        id: 'archive',
        packageName: '@file-viewer/renderer-archive',
        exportName: 'archiveRenderer',
        formats: [
            'archive',
            'zip',
            'zipx',
            '7z',
            'rar',
            'tar',
            'gz',
            'gzip',
            'tgz',
            'bz2',
            'bzip2',
            'tbz',
            'tbz2',
            'xz',
            'txz',
            'lzma',
            'zst',
            'tzst',
            'cab',
            'ar',
            'cpio',
            'iso',
            'xar',
            'lha',
            'lzh',
            'jar',
            'war',
            'ear',
            'apk',
            'cbz',
            'cbr'
        ],
        rendererIds: ['archive'],
        chunkName: 'file-viewer-archive'
    },
    {
        id: 'email',
        packageName: '@file-viewer/renderer-email',
        exportName: 'emailRenderer',
        formats: ['email', 'eml', 'msg', 'mbox'],
        rendererIds: ['email'],
        chunkName: 'file-viewer-email'
    },
    {
        id: 'ebook',
        packageName: '@file-viewer/renderer-epub',
        exportName: 'ebookRenderer',
        formats: ['ebook', 'epub', 'umd'],
        rendererIds: ['epub', 'umd'],
        chunkName: 'file-viewer-ebook'
    },
    {
        id: 'text',
        packageName: '@file-viewer/renderer-text',
        exportName: 'textRenderer',
        formats: [
            'text',
            'txt',
            'log',
            'code',
            'md',
            'markdown',
            'js',
            'mjs',
            'cjs',
            'jsx',
            'ts',
            'tsx',
            'json',
            'jsonc',
            'json5',
            'xml',
            'yaml',
            'yml',
            'toml',
            'ini',
            'htm',
            'html',
            'css',
            'vue',
            'py',
            'java',
            'go',
            'rs',
            'c',
            'cpp',
            'cc',
            'h',
            'hpp',
            'cs',
            'diff',
            'patch',
            'bundle',
            'bdl',
            'php',
            'rb',
            'swift',
            'kt',
            'sh',
            'bash',
            'sql',
            'json5',
            'proto',
            'hcl',
            'tex',
            'gv',
            'graphviz',
            'http',
            'react',
            'ipynb'
        ],
        rendererIds: ['code', 'markdown'],
        chunkName: 'file-viewer-text'
    },
    {
        id: 'image',
        packageName: '@file-viewer/renderer-image',
        exportName: 'imageRenderer',
        formats: [
            'image',
            'jpg',
            'jpeg',
            'png',
            'gif',
            'webp',
            'svg',
            'bmp',
            'tiff',
            'tif',
            'avif',
            'ico',
            'heic',
            'heif',
            'jxl'
        ],
        rendererIds: ['image'],
        chunkName: 'file-viewer-image'
    },
    {
        id: 'media',
        packageName: '@file-viewer/renderer-media',
        exportName: 'mediaRenderer',
        formats: [
            'media',
            'audio',
            'video',
            'mp3',
            'mpeg',
            'wav',
            'ogg',
            'oga',
            'opus',
            'flac',
            'aac',
            'm4a',
            'mp4',
            'webm',
            'weba',
            'mov',
            'm3u8',
            'midi',
            'mid'
        ],
        rendererIds: ['audio', 'video'],
        chunkName: 'file-viewer-media'
    },
    {
        id: 'mindmap',
        packageName: '@file-viewer/renderer-mindmap',
        exportName: 'mindmapRenderer',
        formats: ['mindmap', 'xmind'],
        rendererIds: ['mindmap'],
        chunkName: 'file-viewer-mindmap'
    },
    {
        id: 'geo',
        packageName: '@file-viewer/renderer-geo',
        exportName: 'geoRenderer',
        formats: ['geo', 'geojson', 'kml', 'gpx', 'shp'],
        rendererIds: ['geo'],
        chunkName: 'file-viewer-geo'
    },
    {
        id: 'data',
        packageName: '@file-viewer/renderer-data',
        exportName: 'dataRenderer',
        formats: [
            'data',
            'data-asset',
            'sqlite',
            'db',
            'sqlite3',
            'parquet',
            'avro',
            'psd',
            'ai',
            'eps',
            'webarchive',
            'wasm',
            'ttf',
            'otf',
            'woff',
            'woff2'
        ],
        rendererIds: ['data-asset'],
        chunkName: 'file-viewer-data'
    },
    {
        id: 'eda',
        packageName: '@file-viewer/renderer-eda',
        exportName: 'edaRenderer',
        formats: ['eda', 'gds', 'oas', 'oasis', 'olb', 'dra', 'dsn'],
        rendererIds: ['eda'],
        chunkName: 'file-viewer-eda'
    }
];
const descriptorsById = new Map(rendererModules.map((descriptor) => [descriptor.id, descriptor]));
const descriptorsByFormat = new Map();
const descriptorsByRendererId = new Map();
rendererModules.forEach((descriptor) => {
    descriptor.formats.forEach((format) => descriptorsByFormat.set(format, descriptor));
    descriptor.rendererIds.forEach((rendererId) => descriptorsByRendererId.set(rendererId, descriptor));
});
const presetRendererIds = {
    all: rendererModules.map((descriptor) => descriptor.id),
    lite: ['text', 'image', 'media'],
    office: ['pdf', 'word', 'spreadsheet', 'presentation', 'ofd'],
    engineering: [
        'cad',
        'model',
        'drawing',
        'mindmap',
        'geo',
        'typst',
        'archive',
        'data',
        'eda'
    ]
};
const presetModules = {
    all: {
        id: 'all',
        packageName: '@file-viewer/preset-all',
        exportName: 'allRenderers',
        rendererIds: presetRendererIds.all,
        chunkName: 'file-viewer-preset-all'
    },
    lite: {
        id: 'lite',
        packageName: '@file-viewer/preset-lite',
        exportName: 'liteRenderers',
        rendererIds: presetRendererIds.lite,
        chunkName: 'file-viewer-preset-lite'
    },
    office: {
        id: 'office',
        packageName: '@file-viewer/preset-office',
        exportName: 'officeRenderers',
        rendererIds: presetRendererIds.office,
        chunkName: 'file-viewer-preset-office'
    },
    engineering: {
        id: 'engineering',
        packageName: '@file-viewer/preset-engineering',
        exportName: 'engineeringRenderers',
        rendererIds: presetRendererIds.engineering,
        chunkName: 'file-viewer-preset-engineering'
    }
};
const defaultScanRoots = ['src', 'app', 'pages', 'components'];
const defaultScanExtensions = [
    'js',
    'jsx',
    'ts',
    'tsx',
    'vue',
    'svelte',
    'html',
    'md',
    'mdx'
];
const ignoredScanDirectories = new Set([
    '.git',
    '.idea',
    '.next',
    '.nuxt',
    '.output',
    '.release',
    '.svelte-kit',
    '.vite',
    'coverage',
    'dist',
    'node_modules'
]);
const defaultScanMaxFileSize = 1024 * 1024;
const mimeFormatHints = {
    'application/pdf': ['pdf'],
    'application/ofd': ['ofd'],
    'application/zip': ['zip'],
    'application/x-zip-compressed': ['zip'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
    'application/msword': ['doc'],
    'application/vnd.ms-excel': ['xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
    'application/vnd.ms-powerpoint': ['ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
    'application/json': ['json'],
    'application/x-ndjson': ['json'],
    'application/xml': ['xml'],
    'application/x-tar': ['tar'],
    'application/gzip': ['gz'],
    'application/x-7z-compressed': ['7z'],
    'application/vnd.rar': ['rar'],
    'text/markdown': ['md'],
    'text/csv': ['csv'],
    'text/html': ['html'],
    'text/css': ['css'],
    'text/plain': ['txt'],
    'image/*': ['image'],
    'image/tiff': ['tiff'],
    'image/heic': ['heic'],
    'image/heif': ['heif'],
    'audio/*': ['audio'],
    'audio/mpeg': ['mp3'],
    'audio/ogg': ['ogg'],
    'audio/flac': ['flac'],
    'audio/midi': ['midi'],
    'video/*': ['video']
};
function normalizeToken(value) {
    return value.trim().toLowerCase().replace(/^\./, '');
}
function unique(items) {
    return [...new Set(items)];
}
function normalizeScanExtension(value) {
    return normalizeToken(value);
}
function collectQuotedTokens(value) {
    return [...value.matchAll(/['"`]([^'"`]+)['"`]/g)].flatMap((match) => collectDelimitedTokens(match[1]));
}
function collectDelimitedTokens(value) {
    return value
        .split(/[\s,;|]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
        .flatMap((item) => mimeFormatHints[item.toLowerCase()] || [item])
        .map(normalizeToken)
        .filter(Boolean);
}
export function extractFileViewerRendererHintTokens(source) {
    const tokens = [];
    const push = (items) => {
        items.forEach((item) => {
            if (item) {
                tokens.push(item);
            }
        });
    };
    // Explicit JavaScript/TypeScript hints:
    //   const fileViewerFormats = ['pdf', 'docx']
    //   fileViewerRenderers: ['pdf', 'cad']
    for (const match of source.matchAll(/\bfileViewer(?:Formats?|Renderers?)\b\s*[:=]\s*\[([\s\S]*?)\]/g)) {
        push(collectQuotedTokens(match[1]));
    }
    // HTML / template hints:
    //   <div data-file-viewer-formats="pdf,docx"></div>
    //   <input accept=".pdf,.docx,application/vnd.ms-excel">
    for (const match of source.matchAll(/\bdata-file-viewer-(?:formats?|renderers?)\s*=\s*["']([^"']+)["']/g)) {
        push(collectDelimitedTokens(match[1]));
    }
    for (const match of source.matchAll(/\baccept\s*=\s*["']([^"']+)["']/g)) {
        push(collectDelimitedTokens(match[1]));
    }
    // Comment hints are useful in non-framework projects where the upload UI is
    // assembled dynamically:
    //   // file-viewer-formats: pdf,docx,dwg
    for (const match of source.matchAll(/file-viewer-(?:formats?|renderers?)\s*:\s*([^\n\r<]+)/g)) {
        push(collectDelimitedTokens(match[1]));
    }
    return unique(tokens);
}
function normalizeScanOptions(value) {
    if (!value) {
        return null;
    }
    const raw = typeof value === 'object' ? value : {};
    if (raw.enabled === false) {
        return null;
    }
    return {
        roots: raw.roots?.length ? [...raw.roots] : defaultScanRoots,
        extensions: new Set((raw.extensions?.length ? raw.extensions : defaultScanExtensions).map(normalizeScanExtension)),
        maxFileSize: raw.maxFileSize ?? defaultScanMaxFileSize
    };
}
function scanFile(filePath, extensions, maxFileSize) {
    const extension = normalizeScanExtension(extname(filePath));
    if (!extensions.has(extension)) {
        return [];
    }
    const info = statSyncSafe(filePath);
    if (!info?.isFile() || info.size > maxFileSize) {
        return [];
    }
    return extractFileViewerRendererHintTokens(readFileSync(filePath, 'utf8'));
}
function statSyncSafe(filePath) {
    try {
        return existsSync(filePath) ? statSync(filePath) : null;
    }
    catch {
        return null;
    }
}
function walkScanRoot(directory, extensions, maxFileSize, output) {
    if (!existsSync(directory)) {
        return;
    }
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory()) {
            if (!ignoredScanDirectories.has(entry.name)) {
                walkScanRoot(join(directory, entry.name), extensions, maxFileSize, output);
            }
            continue;
        }
        if (entry.isFile()) {
            output.push(...scanFile(join(directory, entry.name), extensions, maxFileSize));
        }
    }
}
export function collectFileViewerRendererScanTokens(projectRoot, scan) {
    const normalized = normalizeScanOptions(scan);
    if (!normalized) {
        return [];
    }
    const tokens = [];
    normalized.roots.forEach((root) => {
        walkScanRoot(isAbsolute(root) ? root : resolve(projectRoot, root), normalized.extensions, normalized.maxFileSize, tokens);
    });
    return unique(tokens);
}
function resolveManualPreset(preset) {
    return preset && preset !== 'auto' ? preset : null;
}
function selectRenderers(options) {
    const preset = resolveManualPreset(options.preset);
    const presetCoveredIds = new Set(preset ? presetRendererIds[preset] : []);
    const selected = new Map();
    const missing = [];
    const requestedTokens = [...(options.renderers || []), ...(options.formats || [])]
        .map(normalizeToken)
        .filter(Boolean);
    requestedTokens.forEach((token) => {
        const descriptor = descriptorsById.get(token) ||
            descriptorsByRendererId.get(token) ||
            descriptorsByFormat.get(token);
        if (descriptor) {
            if (!presetCoveredIds.has(descriptor.id)) {
                selected.set(descriptor.id, descriptor);
            }
            return;
        }
        missing.push({
            format: token,
            note: 'No renderer mapping is registered for this format yet.'
        });
    });
    return { preset, descriptors: [...selected.values()], missing };
}
function formatMissingRendererMessage(missing) {
    return [
        'Some requested File Viewer formats do not have standalone renderer packages in this workspace yet:',
        ...missing.map((item) => `  - ${item.format}${item.targetPackage ? ` -> ${item.targetPackage}` : ''}: ${item.note}`),
        'Use @file-viewer/preset-all for full compatibility while the remaining renderer lines are extracted, or remove those formats from @file-viewer/vite-plugin.'
    ].join('\n');
}
function assertMissingRendererPolicy(selection, mode) {
    if (!selection.missing.length || mode === 'ignore') {
        return;
    }
    const message = formatMissingRendererMessage(selection.missing);
    if (mode === 'warn') {
        console.warn(`[file-viewer:vite-plugin]\n${message}`);
        return;
    }
    throw new Error(`[file-viewer:vite-plugin]\n${message}`);
}
function expandDescriptorRendererIds(ids) {
    return unique(ids.flatMap((id) => {
        const descriptor = descriptorsById.get(id);
        return descriptor ? [...descriptor.rendererIds] : [id];
    }));
}
function renderVirtualModule(selection, formats, autoPresetIds = []) {
    const presetModule = selection.preset ? presetModules[selection.preset] : null;
    const autoPresetModules = autoPresetIds
        .filter((id) => id !== selection.preset)
        .map((id) => presetModules[id]);
    const presetImport = presetModule
        ? `import { ${presetModule.exportName} as presetRenderers } from '${presetModule.packageName}';`
        : null;
    const autoPresetImports = autoPresetModules.map((preset, index) => `import { ${preset.exportName} as autoPresetRenderers${index} } from '${preset.packageName}';`);
    const rendererImports = selection.descriptors.map((descriptor, index) => `import { ${descriptor.exportName} as renderer${index} } from '${descriptor.packageName}';`);
    const rendererNames = [
        ...(presetModule ? ['presetRenderers'] : []),
        ...autoPresetModules.map((_preset, index) => `autoPresetRenderers${index}`),
        ...selection.descriptors.map((_descriptor, index) => `renderer${index}`)
    ];
    const rendererIds = unique([
        ...(presetModule ? expandDescriptorRendererIds(presetModule.rendererIds) : []),
        ...autoPresetModules.flatMap((preset) => expandDescriptorRendererIds(preset.rendererIds)),
        ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
    ]);
    const packages = unique([
        ...(presetModule ? [presetModule.packageName] : []),
        ...autoPresetModules.map((preset) => preset.packageName),
        ...selection.descriptors.map((descriptor) => descriptor.packageName)
    ]);
    const plan = {
        preset: selection.preset,
        autoPresets: autoPresetModules.map((preset) => preset.id),
        formats,
        rendererIds,
        packages,
        generatedBy: '@file-viewer/vite-plugin'
    };
    const autoRegistrationId = selection.descriptors.length
        ? '@file-viewer/vite-plugin:configured'
        : selection.preset && !autoPresetModules.length
            ? selection.preset
            : !selection.preset && autoPresetModules.length === 1
                ? autoPresetModules[0].id
                : '@file-viewer/vite-plugin:configured';
    return [
        `import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';`,
        ...[presetImport].filter(Boolean),
        ...autoPresetImports,
        ...rendererImports,
        '',
        `export const configuredFileViewerRenderers = [${rendererNames.join(', ')}];`,
        `export const fileViewerRendererPlan = ${JSON.stringify(plan, null, 2)};`,
        `registerFileViewerAutoRendererPreset(configuredFileViewerRenderers, { id: ${JSON.stringify(autoRegistrationId)} });`,
        'export default configuredFileViewerRenderers;',
        ''
    ].join('\n');
}
function hasManualChunks(config) {
    const output = config.build?.rollupOptions?.output;
    if (Array.isArray(output)) {
        return output.some((item) => Boolean(item.manualChunks));
    }
    return Boolean(output?.manualChunks);
}
function createManualChunks(selection, autoPresetIds = []) {
    const packageToChunk = new Map();
    const presetIds = unique([
        ...(selection.preset ? [selection.preset] : []),
        ...autoPresetIds
    ]);
    presetIds.forEach((presetId) => {
        const presetModule = presetModules[presetId];
        packageToChunk.set(presetModule.packageName, presetModule.chunkName);
        presetModule.rendererIds
            .map((id) => descriptorsById.get(id))
            .filter((descriptor) => Boolean(descriptor))
            .forEach((descriptor) => {
            packageToChunk.set(descriptor.packageName, descriptor.chunkName);
        });
    });
    selection.descriptors.forEach((descriptor) => {
        packageToChunk.set(descriptor.packageName, descriptor.chunkName);
    });
    return (id) => {
        const normalized = id.replace(/\\/g, '/');
        for (const [packageName, chunkName] of packageToChunk) {
            if (normalized.includes(`/node_modules/${packageName}/`) ||
                normalized.includes(`/node_modules/.pnpm/${packageName.replace('/', '+')}@`)) {
                return chunkName;
            }
        }
        return undefined;
    };
}
function projectRequire() {
    return createRequire(resolve(process.cwd(), 'package.json'));
}
function findPackageJsonFromEntry(entry) {
    let current = dirname(entry);
    while (current && current !== dirname(current)) {
        const candidate = join(current, 'package.json');
        if (existsSync(candidate)) {
            return candidate;
        }
        current = dirname(current);
    }
    return null;
}
function tryResolvePackageJson(packageName, requireFn) {
    try {
        return requireFn.resolve(`${packageName}/package.json`);
    }
    catch {
        try {
            const entry = requireFn.resolve(packageName);
            return findPackageJsonFromEntry(entry);
        }
        catch {
            return null;
        }
    }
}
function collectWorkspacePackageJsons(root) {
    const packageJsons = new Map();
    const ignoredDirectoryNames = new Set(['node_modules', 'dist', 'vendor', '.git']);
    const scanRoots = ['packages', 'apps'].map((item) => join(root, item));
    const visit = (directory, depth) => {
        if (depth < 0 || !existsSync(directory)) {
            return;
        }
        const packageJsonPath = join(directory, 'package.json');
        if (existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.name) {
                    packageJsons.set(packageJson.name, packageJsonPath);
                }
            }
            catch {
                // Ignore malformed package.json files in unrelated workspace folders.
            }
        }
        for (const entry of readdirSync(directory)) {
            if (ignoredDirectoryNames.has(entry)) {
                continue;
            }
            const candidate = join(directory, entry);
            if (statSync(candidate).isDirectory()) {
                visit(candidate, depth - 1);
            }
        }
    };
    scanRoots.forEach((scanRoot) => visit(scanRoot, 4));
    return packageJsons;
}
function resolveWorkspacePackageJson(packageName) {
    if (!workspacePackageJsonCache) {
        workspacePackageJsonCache = collectWorkspacePackageJsons(process.cwd());
    }
    return workspacePackageJsonCache.get(packageName) || null;
}
function resolvePackageJson(packageName, anchorPackages = []) {
    const requireFns = [projectRequire(), pluginRequire];
    const effectiveAnchorPackages = unique([
        ...Object.values(presetModules).map((preset) => preset.packageName),
        ...anchorPackages
    ]);
    const anchorPackageJsons = new Set();
    let discoveredAnchor = true;
    while (discoveredAnchor) {
        discoveredAnchor = false;
        for (const anchorPackage of effectiveAnchorPackages) {
            for (const requireFn of [...requireFns]) {
                const anchorPackageJson = tryResolvePackageJson(anchorPackage, requireFn);
                if (anchorPackageJson && !anchorPackageJsons.has(anchorPackageJson)) {
                    anchorPackageJsons.add(anchorPackageJson);
                    requireFns.push(createRequire(anchorPackageJson));
                    discoveredAnchor = true;
                }
            }
        }
    }
    for (const requireFn of requireFns) {
        const packageJson = tryResolvePackageJson(packageName, requireFn);
        if (packageJson) {
            return packageJson;
        }
    }
    return resolveWorkspacePackageJson(packageName);
}
function hasExplicitRendererSelection(options) {
    return Boolean(resolveManualPreset(options.preset) ||
        options.formats?.length ||
        options.renderers?.length ||
        options.scan);
}
function shouldAutoDiscoverPresets(options) {
    if (Array.isArray(options.autoPresets)) {
        return true;
    }
    if (typeof options.autoPresets === 'boolean') {
        return options.autoPresets;
    }
    return options.preset === 'auto' || !hasExplicitRendererSelection(options);
}
function resolveAutoPresetIds(options) {
    if (!shouldAutoDiscoverPresets(options)) {
        return [];
    }
    const candidates = Array.isArray(options.autoPresets)
        ? options.autoPresets
        : Object.keys(presetModules);
    const installed = unique(candidates).filter((presetId) => Boolean(resolvePackageJson(presetModules[presetId].packageName)));
    return installed.includes('all') ? ['all'] : installed;
}
function collectSelectedPackages(selection, autoPresetIds = []) {
    const presetModule = selection.preset ? presetModules[selection.preset] : null;
    return unique([
        ...(presetModule ? [presetModule.packageName] : []),
        ...autoPresetIds.map((presetId) => presetModules[presetId].packageName),
        ...selection.descriptors.map((descriptor) => descriptor.packageName)
    ]);
}
function resolvePackageRoot(packageName, anchorPackages = []) {
    const packageJson = resolvePackageJson(packageName, anchorPackages);
    return packageJson ? dirname(packageJson) : null;
}
async function copyFileIfPresent(from, to) {
    if (!from || !existsSync(from)) {
        return false;
    }
    const info = await stat(from);
    if (!info.isFile()) {
        return false;
    }
    await mkdir(dirname(to), { recursive: true });
    await copyFile(from, to);
    return true;
}
async function copyDirectoryIfPresent(from, to) {
    if (!from || !existsSync(from)) {
        return false;
    }
    const info = await stat(from);
    if (!info.isDirectory()) {
        return false;
    }
    await rm(to, { recursive: true, force: true });
    await mkdir(dirname(to), { recursive: true });
    await cp(from, to, { recursive: true, force: true });
    return true;
}
async function copyKnownRendererAssets(targetRoot, rendererIds) {
    const selected = new Set(rendererIds);
    const results = [];
    const push = async (rendererId, id, to, copyAction, reason) => {
        if (!selected.has(rendererId)) {
            return;
        }
        const copied = await copyAction();
        results.push({
            rendererId,
            id,
            to,
            copied,
            reason: copied ? undefined : reason || 'source asset not found'
        });
    };
    const pdfRoot = resolvePackageRoot('pdfjs-dist', ['@file-viewer/renderer-pdf']);
    await push('pdf', 'pdf-worker', join(targetRoot, 'vendor/pdf/pdf.worker.mjs'), () => copyFileIfPresent(pdfRoot ? join(pdfRoot, 'legacy/build/pdf.worker.mjs') : null, join(targetRoot, 'vendor/pdf/pdf.worker.mjs')));
    await push('pdf', 'pdf-cmaps', join(targetRoot, 'vendor/pdf/cmaps'), () => copyDirectoryIfPresent(pdfRoot ? join(pdfRoot, 'cmaps') : null, join(targetRoot, 'vendor/pdf/cmaps')));
    await push('pdf', 'pdf-wasm', join(targetRoot, 'vendor/pdf/wasm'), () => copyDirectoryIfPresent(pdfRoot ? join(pdfRoot, 'wasm') : null, join(targetRoot, 'vendor/pdf/wasm')));
    await push('pdf', 'pdf-standard-fonts', join(targetRoot, 'vendor/pdf/standard_fonts'), () => copyDirectoryIfPresent(pdfRoot ? join(pdfRoot, 'standard_fonts') : null, join(targetRoot, 'vendor/pdf/standard_fonts')));
    const cadRoot = resolvePackageRoot('@flyfish-dev/cad-viewer', ['@file-viewer/renderer-cad']);
    await push('cad', 'cad-wasm-directory', join(targetRoot, 'wasm/cad'), () => copyDirectoryIfPresent(cadRoot ? join(cadRoot, 'dist/wasm') : null, join(targetRoot, 'wasm/cad')));
    const typstCompilerRoot = resolvePackageRoot('@myriaddreamin/typst-ts-web-compiler', [
        '@file-viewer/renderer-typst'
    ]);
    const typstRendererRoot = resolvePackageRoot('@myriaddreamin/typst-ts-renderer', [
        '@file-viewer/renderer-typst'
    ]);
    const typstRendererPackageRoot = resolvePackageRoot('@file-viewer/renderer-typst', [
        '@file-viewer/renderer-typst'
    ]);
    await push('typst', 'typst-compiler-wasm', join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm'), () => copyFileIfPresent(typstCompilerRoot ? join(typstCompilerRoot, 'pkg/typst_ts_web_compiler_bg.wasm') : null, join(targetRoot, 'wasm/typst/typst_ts_web_compiler_bg.wasm')));
    await push('typst', 'typst-renderer-wasm', join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm'), () => copyFileIfPresent(typstRendererRoot ? join(typstRendererRoot, 'pkg/typst_ts_renderer_bg.wasm') : null, join(targetRoot, 'wasm/typst/typst_ts_renderer_bg.wasm')));
    await push('typst', 'typst-font-assets', join(targetRoot, 'wasm/typst/fonts'), () => copyDirectoryIfPresent(typstRendererPackageRoot ? join(typstRendererPackageRoot, 'assets/fonts') : null, join(targetRoot, 'wasm/typst/fonts')));
    const archiveRoot = resolvePackageRoot('libarchive.js', ['@file-viewer/renderer-archive']);
    await push('archive', 'libarchive-worker', join(targetRoot, 'vendor/libarchive/worker-bundle.js'), () => copyFileIfPresent(archiveRoot ? join(archiveRoot, 'dist/worker-bundle.js') : null, join(targetRoot, 'vendor/libarchive/worker-bundle.js')));
    await push('archive', 'libarchive-wasm', join(targetRoot, 'vendor/libarchive/libarchive.wasm'), () => copyFileIfPresent(archiveRoot ? join(archiveRoot, 'dist/libarchive.wasm') : null, join(targetRoot, 'vendor/libarchive/libarchive.wasm')));
    const sqlJsRoot = resolvePackageRoot('sql.js', ['@file-viewer/renderer-data']);
    await push('data-asset', 'data-sql-wasm', join(targetRoot, 'wasm/data/sql-wasm.wasm'), () => copyFileIfPresent(sqlJsRoot ? join(sqlJsRoot, 'dist/sql-wasm.wasm') : null, join(targetRoot, 'wasm/data/sql-wasm.wasm')));
    await mkdir(targetRoot, { recursive: true });
    await writeFile(join(targetRoot, 'flyfish-viewer-assets.json'), `${JSON.stringify({
        schemaVersion: 1,
        generatedBy: '@file-viewer/vite-plugin',
        rendererIds,
        copiedAt: new Date().toISOString(),
        assets: results
    }, null, 2)}\n`);
    return results;
}
function resolveTargetDir(value, fallback) {
    const target = value || fallback;
    return isAbsolute(target) ? target : resolve(process.cwd(), target);
}
function copyOptions(value) {
    return typeof value === 'object' ? value : {};
}
function collectAssetRendererIds(selection, autoPresetIds = []) {
    const presetIds = [
        ...(selection.preset ? expandDescriptorRendererIds(presetModules[selection.preset].rendererIds) : []),
        ...autoPresetIds.flatMap((presetId) => expandDescriptorRendererIds(presetModules[presetId].rendererIds))
    ];
    return unique([
        ...presetIds,
        ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
    ]);
}
function reportAssetCopy(results, targetRoot, mode) {
    const failedRequired = results.filter((result) => !result.copied && ['pdf', 'cad', 'typst'].includes(result.rendererId));
    if (!results.length) {
        return;
    }
    const summary = `[file-viewer:vite-plugin] Copied ${results.filter((result) => result.copied).length}/${results.length} renderer assets to ${targetRoot}`;
    if (!failedRequired.length || mode === 'ignore') {
        console.log(summary);
        return;
    }
    const details = failedRequired
        .map((result) => `  - ${result.rendererId}:${result.id} -> ${result.to} (${result.reason})`)
        .join('\n');
    if (mode === 'warn') {
        console.warn(`${summary}\nMissing required assets:\n${details}`);
        return;
    }
    throw new Error(`${summary}\nMissing required assets:\n${details}`);
}
export function fileViewerRenderers(options = {}) {
    const moduleId = options.moduleId || virtualModuleId;
    const resolvedModuleId = `\0${moduleId}`;
    const injectedModulePath = moduleId.startsWith('/') ? moduleId : `/${moduleId}`;
    const missingMode = options.missingRenderer || 'error';
    const explicitFormats = [...(options.formats || []), ...(options.renderers || [])]
        .map(normalizeToken)
        .filter(Boolean);
    let scanFormats = [];
    let requestedFormats = unique([...explicitFormats, ...scanFormats]);
    let selection = selectRenderers({
        ...options,
        formats: [...(options.formats || []), ...scanFormats]
    });
    let autoPresetIds = resolveAutoPresetIds(options);
    let resolvedConfig = null;
    const refreshSelection = (projectRoot) => {
        if (projectRoot) {
            scanFormats = collectFileViewerRendererScanTokens(projectRoot, options.scan);
        }
        requestedFormats = unique([...explicitFormats, ...scanFormats]);
        selection = selectRenderers({
            ...options,
            formats: [...(options.formats || []), ...scanFormats]
        });
        autoPresetIds = resolveAutoPresetIds(options);
    };
    const hasConfiguredRenderers = () => Boolean(selection.preset || selection.descriptors.length || autoPresetIds.length);
    return {
        name: 'file-viewer-renderers',
        enforce: 'pre',
        config(userConfig) {
            const projectRoot = resolve(process.cwd(), userConfig.root || '.');
            refreshSelection(projectRoot);
            if ((options.chunkStrategy || 'renderer') === 'none' || hasManualChunks(userConfig)) {
                return undefined;
            }
            return {
                build: {
                    rollupOptions: {
                        output: {
                            manualChunks: createManualChunks(selection, autoPresetIds)
                        }
                    }
                }
            };
        },
        configResolved(config) {
            resolvedConfig = config;
            refreshSelection(config.root);
        },
        buildStart() {
            assertMissingRendererPolicy(selection, missingMode);
            const packages = collectSelectedPackages(selection, autoPresetIds);
            const missingPackages = packages.filter((packageName) => !resolvePackageJson(packageName));
            if (missingPackages.length && missingMode !== 'ignore') {
                const message = `Missing File Viewer preset/renderer package(s): ${missingPackages.join(', ')}. Install them or remove the matching preset/formats from @file-viewer/vite-plugin.`;
                if (missingMode === 'warn') {
                    console.warn(`[file-viewer:vite-plugin] ${message}`);
                }
                else {
                    throw new Error(`[file-viewer:vite-plugin] ${message}`);
                }
            }
        },
        async configureServer() {
            if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'build') {
                return;
            }
            const targetRoot = resolveTargetDir(copyOptions(options.copyAssets).publicDir, resolvedConfig?.publicDir || 'public');
            const results = await copyKnownRendererAssets(targetRoot, collectAssetRendererIds(selection, autoPresetIds));
            reportAssetCopy(results, targetRoot, missingMode);
        },
        transformIndexHtml() {
            if (options.inject === false || !hasConfiguredRenderers()) {
                return undefined;
            }
            return [
                {
                    tag: 'script',
                    attrs: { type: 'module', src: injectedModulePath },
                    injectTo: 'head'
                }
            ];
        },
        handleHotUpdate(context) {
            if (!options.scan || !resolvedConfig) {
                return undefined;
            }
            const previous = requestedFormats.join(',');
            refreshSelection(resolvedConfig.root);
            if (requestedFormats.join(',') === previous) {
                return undefined;
            }
            const modules = [
                context.server.moduleGraph.getModuleById(resolvedModuleId),
                context.server.moduleGraph.getModuleById(resolvedVirtualModuleId)
            ].filter(Boolean);
            modules.forEach((module) => {
                if (module) {
                    context.server.moduleGraph.invalidateModule(module);
                }
            });
            context.server.ws.send({
                type: 'full-reload'
            });
            return [];
        },
        async closeBundle() {
            if (!options.copyAssets || copyOptions(options.copyAssets).mode === 'dev') {
                return;
            }
            const outDir = resolvedConfig?.build.outDir || 'dist';
            const targetRoot = resolveTargetDir(copyOptions(options.copyAssets).outDir, outDir);
            const results = await copyKnownRendererAssets(targetRoot, collectAssetRendererIds(selection, autoPresetIds));
            reportAssetCopy(results, targetRoot, missingMode);
        },
        resolveId(id) {
            if (id === moduleId || id === virtualModuleId || id === injectedModulePath) {
                return id === virtualModuleId ? resolvedVirtualModuleId : resolvedModuleId;
            }
            return undefined;
        },
        load(id) {
            if (id === resolvedModuleId || id === resolvedVirtualModuleId) {
                return renderVirtualModule(selection, requestedFormats, autoPresetIds);
            }
            return undefined;
        }
    };
}
export function createFileViewerManualChunks(options = {}) {
    return createManualChunks(selectRenderers(options), resolveAutoPresetIds(options));
}
export function resolveFileViewerRendererSelection(options = {}, projectRoot = process.cwd()) {
    const scanFormats = collectFileViewerRendererScanTokens(projectRoot, options.scan);
    const requestedFormats = unique([
        ...(options.formats || []),
        ...(options.renderers || []),
        ...scanFormats
    ].map(normalizeToken).filter(Boolean));
    const selection = selectRenderers({
        ...options,
        formats: [...(options.formats || []), ...scanFormats]
    });
    const presetModule = selection.preset ? presetModules[selection.preset] : null;
    const autoPresetIds = resolveAutoPresetIds(options);
    const autoPresetModules = autoPresetIds.map((presetId) => presetModules[presetId]);
    const packages = collectSelectedPackages(selection, autoPresetIds);
    return {
        preset: selection.preset,
        presetPackage: presetModule?.packageName ?? null,
        autoPresets: autoPresetModules.map((preset) => preset.id),
        autoPresetPackages: autoPresetModules.map((preset) => preset.packageName),
        formats: requestedFormats,
        packages,
        rendererIds: unique([
            ...(presetModule ? expandDescriptorRendererIds(presetModule.rendererIds) : []),
            ...autoPresetModules.flatMap((preset) => expandDescriptorRendererIds(preset.rendererIds)),
            ...selection.descriptors.flatMap((descriptor) => descriptor.rendererIds)
        ]),
        renderers: selection.descriptors.map((descriptor) => ({
            id: descriptor.id,
            packageName: descriptor.packageName,
            formats: [...descriptor.formats],
            rendererIds: [...descriptor.rendererIds],
            chunkName: descriptor.chunkName
        })),
        missing: selection.missing
    };
}
export default fileViewerRenderers;
