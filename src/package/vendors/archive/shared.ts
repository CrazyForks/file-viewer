export const ARCHIVE_EXTENSIONS = [
  'zip', 'zipx', '7z', 'rar', 'tar', 'gz', 'gzip', 'tgz', 'bz2', 'bzip2', 'tbz', 'tbz2',
  'xz', 'txz', 'lzma', 'zst', 'tzst', 'cab', 'ar', 'cpio', 'iso', 'xar', 'lha', 'lzh',
  'jar', 'war', 'ear', 'apk', 'cbz', 'cbr'
]

export const ARCHIVE_PREVIEWABLE_EXTENSIONS = [
  'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm', 'xls', 'xlsx', 'xlsm', 'xlsb',
  'xlt', 'xltx', 'xltm', 'csv', 'ods', 'fods', 'numbers', 'pptx', 'pptm',
  'potx', 'potm', 'ppsx', 'ppsm', 'pdf', 'ofd', 'typ', 'typst', 'dxf', 'dwg',
  'gltf', 'glb', 'obj', 'stl', 'ply', 'fbx', 'dae', '3ds',
  '3mf', 'amf', 'usd', 'usda', 'usdc', 'usdz', 'kmz', 'pcd', 'wrl', 'vrml', 'xyz', 'vtk',
  'vtp', 'step', 'stp', 'iges', 'igs', 'ifc', '3dm', 'excalidraw', 'drawio', 'dio',
  'epub', 'umd', 'gif', 'jpg', 'jpeg', 'bmp', 'tiff', 'tif', 'png', 'svg', 'webp', 'md',
  'markdown', 'txt', 'json', 'js', 'mjs', 'cjs', 'css', 'java', 'py', 'html', 'htm', 'jsx',
  'ts', 'tsx', 'xml', 'log', 'vue', 'yaml', 'yml', 'ini', 'sh', 'bash', 'sql', 'go', 'rs',
  'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'cs', 'diff', 'mp4', 'mp3', 'mpeg', 'wav', 'ogg',
  'oga', 'opus', 'm4a', 'aac', 'flac', 'weba', 'eml', 'msg', 'olb', 'dra',
  ...ARCHIVE_EXTENSIONS
]

export interface ArchiveEntryView {
  id: string;
  path: string;
  name: string;
  extension: string;
  size: number;
  lastModified?: number;
  depth: number;
  previewable: boolean;
  compressedFile: {
    name: string;
    size: number;
    lastModified?: number;
    extract(): Promise<File>;
  };
}

export const getExtension = (name: string) => {
  const clean = name.split(/[?#]/)[0] || name
  const dot = clean.lastIndexOf('.')
  return dot === -1 ? '' : clean.slice(dot + 1).toLowerCase()
}

export const isArchiveExtension = (extension: string) => ARCHIVE_EXTENSIONS.includes(extension.toLowerCase())

export const isPreviewableArchiveEntry = (name: string) => {
  const extension = getExtension(name)
  return ARCHIVE_PREVIEWABLE_EXTENSIONS.includes(extension)
}

export const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value < 0) {
    return '-'
  }
  if (value < 1024) {
    return `${value} B`
  }
  const units = ['KB', 'MB', 'GB']
  let next = value / 1024
  for (const unit of units) {
    if (next < 1024 || unit === units[units.length - 1]) {
      return `${next.toFixed(next < 10 ? 1 : 0)} ${unit}`
    }
    next /= 1024
  }
  return `${value} B`
}

const isCompressedFile = (value: unknown): value is ArchiveEntryView['compressedFile'] => {
  return typeof value === 'object' &&
    value !== null &&
    'extract' in value &&
    typeof value.extract === 'function'
}

export const flattenArchiveObject = (input: Record<string, unknown>, prefix = ''): ArchiveEntryView[] => {
  const entries: ArchiveEntryView[] = []

  Object.entries(input).forEach(([key, value]) => {
    const path = prefix ? `${prefix}/${key}` : key
    if (isCompressedFile(value)) {
      const name = value.name || key
      const extension = getExtension(name)
      entries.push({
        id: path,
        path,
        name,
        extension,
        size: value.size || 0,
        lastModified: value.lastModified,
        depth: path.split('/').length - 1,
        previewable: isPreviewableArchiveEntry(name),
        compressedFile: value
      })
      return
    }
    if (value && typeof value === 'object') {
      entries.push(...flattenArchiveObject(value as Record<string, unknown>, path))
    }
  })

  return entries
}

export const createArchiveCacheKey = (archiveName: string, archiveSize: number, entry: ArchiveEntryView) => {
  return [
    'archive-entry',
    archiveName || 'archive',
    archiveSize,
    entry.path,
    entry.size,
    entry.lastModified || 0
  ].join(':')
}
