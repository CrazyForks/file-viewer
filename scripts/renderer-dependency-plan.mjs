export const rendererModularizationLines = [
  {
    id: 'office-word',
    group: 'office',
    targetPackage: '@file-viewer/renderer-word',
    phase: 2,
    status: 'planned',
    renderers: ['office-word-openxml', 'office-word-binary', 'open-document'],
    dependencies: ['@file-viewer/docx', 'msdoc-viewer', 'rtf.js', 'jszip'],
  },
  {
    id: 'office-presentation',
    group: 'office',
    targetPackage: '@file-viewer/renderer-presentation',
    phase: 2,
    status: 'partially-extracted',
    renderers: ['office-presentation'],
    dependencies: ['@file-viewer/pptx'],
  },
  {
    id: 'office-spreadsheet',
    group: 'office',
    targetPackage: '@file-viewer/renderer-spreadsheet',
    phase: 2,
    status: 'planned',
    renderers: ['spreadsheet-openxml'],
    dependencies: ['styled-exceljs', 'e-virt-table', 'tinycolor2'],
  },
  {
    id: 'document-pdf',
    group: 'document',
    targetPackage: '@file-viewer/renderer-pdf',
    phase: 2,
    status: 'partially-extracted',
    renderers: ['pdf'],
    dependencies: ['pdfjs-dist'],
  },
  {
    id: 'document-ofd',
    group: 'document',
    targetPackage: '@file-viewer/renderer-ofd',
    phase: 2,
    status: 'planned',
    renderers: ['ofd'],
    dependencies: ['ofd-xml-parser', 'linkedom'],
  },
  {
    id: 'document-typst',
    group: 'document',
    targetPackage: '@file-viewer/renderer-typst',
    phase: 2,
    status: 'partially-extracted',
    renderers: ['typst'],
    dependencies: [
      '@myriaddreamin/typst.ts',
      '@myriaddreamin/typst-ts-renderer',
      '@myriaddreamin/typst-ts-web-compiler',
    ],
  },
  {
    id: 'engineering-cad',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-cad',
    phase: 2,
    status: 'partially-extracted',
    renderers: ['cad'],
    dependencies: ['@flyfish-dev/cad-viewer'],
  },
  {
    id: 'engineering-model',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-3d',
    phase: 3,
    status: 'planned',
    renderers: ['model'],
    dependencies: ['three'],
  },
  {
    id: 'engineering-drawing',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-drawing',
    phase: 3,
    status: 'planned',
    renderers: ['drawing'],
    dependencies: ['@excalidraw/excalidraw', 'roughjs'],
  },
  {
    id: 'engineering-mindmap',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-mindmap',
    phase: 3,
    status: 'partially-extracted',
    renderers: ['mindmap'],
    dependencies: ['@ljheee/xmind-parser'],
  },
  {
    id: 'engineering-geo',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-geo',
    phase: 3,
    status: 'planned',
    renderers: ['geo'],
    dependencies: ['@tmcw/togeojson', 'shpjs'],
  },
  {
    id: 'engineering-eda',
    group: 'engineering',
    targetPackage: '@file-viewer/renderer-eda',
    phase: 4,
    status: 'planned',
    renderers: ['eda'],
    dependencies: ['cfb'],
  },
  {
    id: 'archive',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-archive',
    phase: 2,
    status: 'partially-extracted',
    renderers: ['archive'],
    dependencies: ['libarchive.js', 'pako', 'jszip'],
  },
  {
    id: 'email',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-email',
    phase: 3,
    status: 'partially-extracted',
    renderers: ['email'],
    dependencies: ['postal-mime', '@kenjiuno/msgreader'],
  },
  {
    id: 'ebook',
    group: 'archiveEmailEbook',
    targetPackage: '@file-viewer/renderer-ebook',
    phase: 3,
    status: 'partially-extracted',
    renderers: ['epub'],
    dependencies: ['epubjs'],
  },
  {
    id: 'code-markdown',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-text',
    phase: 3,
    status: 'partially-extracted',
    renderers: ['code', 'markdown'],
    dependencies: ['highlight.js', 'marked'],
  },
  {
    id: 'media',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-media',
    phase: 3,
    status: 'planned',
    renderers: ['audio', 'video'],
    dependencies: ['hls.js', '@tonejs/midi'],
  },
  {
    id: 'image',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-image',
    phase: 3,
    status: 'planned',
    renderers: ['image'],
    dependencies: ['heic2any'],
  },
  {
    id: 'data-asset',
    group: 'mediaAndData',
    targetPackage: '@file-viewer/renderer-data',
    phase: 4,
    status: 'planned',
    renderers: ['data-asset'],
    dependencies: ['ag-psd', 'sql.js', 'hyparquet', 'avsc'],
  },
  {
    id: 'worker-dom',
    group: 'smallShared',
    targetPackage: '@file-viewer/renderer-word',
    phase: 2,
    status: 'planned',
    renderers: ['office-word-openxml'],
    dependencies: ['@xmldom/xmldom'],
  },
];

export const rendererDependencyGroups = rendererModularizationLines.reduce((result, line) => {
  result[line.group] ||= [];
  line.dependencies.forEach(dependency => {
    if (!result[line.group].includes(dependency)) {
      result[line.group].push(dependency);
    }
  });
  return result;
}, {});

export const dependencyToRendererLines = rendererModularizationLines.reduce((result, line) => {
  line.dependencies.forEach(dependency => {
    result.set(dependency, [...(result.get(dependency) || []), line]);
  });
  return result;
}, new Map());

export const dependencyToRendererLine = new Map(
  Array.from(dependencyToRendererLines.entries()).map(([dependency, lines]) => [dependency, lines[0]])
);
