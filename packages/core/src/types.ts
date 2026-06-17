export type FileViewerSourceKind = 'file' | 'url' | 'buffer' | 'empty';

export type FileViewerThemeMode = 'light' | 'dark' | 'system';

export type FileViewerFileRef = File | Blob | ArrayBuffer;

export type FileViewerToolbarPosition = 'auto' | 'top' | 'bottom-right';

export type FileViewerLifecyclePhase = 'load-start' | 'load-complete' | 'unload-start' | 'unload-complete';

export type FileViewerOperationType = 'download' | 'print' | 'export-html' | 'zoom-in' | 'zoom-out' | 'zoom-reset';

export type FileViewerRendererCategory =
  | 'office'
  | 'document'
  | 'archive'
  | 'email'
  | 'eda'
  | 'cad'
  | 'model'
  | 'geo'
  | 'drawing'
  | 'ebook'
  | 'image'
  | 'markdown'
  | 'code'
  | 'media'
  | 'asset'
  | 'fallback';

export interface FileViewerWatermarkOptions {
  enabled?: boolean;
  text?: string;
  image?: string;
  opacity?: number;
  rotate?: number;
  gapX?: number;
  gapY?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface FileViewerToolbarOptions {
  download?: boolean;
  print?: boolean;
  exportHtml?: boolean;
  zoom?: boolean;
  position?: FileViewerToolbarPosition;
  beforeOperation?: FileViewerBeforeOperation;
  beforeDownload?: FileViewerBeforeOperation;
  beforePrint?: FileViewerBeforeOperation;
  beforeExportHtml?: FileViewerBeforeOperation;
}

export interface FileViewerArchiveOptions {
  workerUrl?: string;
  wasmUrl?: string;
  workerTimeoutMs?: number;
  cache?: boolean;
  maxArchiveSize?: number;
  maxEntryPreviewSize?: number;
}

export interface FileViewerPdfOptions {
  toolbar?: boolean;
  navigation?: boolean;
  defaultNavigationVisible?: boolean;
  rotation?: number;
  streaming?: boolean | 'same-origin';
  rangeChunkSize?: number;
  withCredentials?: boolean;
}

export interface FileViewerDocxOptions {
  worker?: boolean;
  progressive?: boolean;
  workerTimeout?: number;
}

export type FileRenderExportMode = 'export' | 'print';

export interface FileRenderExportOptions {
  mode: FileRenderExportMode;
  title: string;
}

export interface FileRenderExportAdapter {
  print?: boolean;
  exportHtml?: boolean;
  includeDocumentStyles?: boolean;
  beforeSnapshot?: () => Promise<void> | void;
  printStyle?: string | ((options: FileRenderExportOptions) => Promise<string> | string);
  toHtml?: (options: FileRenderExportOptions) => Promise<string> | string;
}

export interface FileRenderContext {
  filename?: string;
  url?: string;
  streamUrl?: string;
  options?: FileViewerOptions;
  registerExportAdapter?: (adapter: FileRenderExportAdapter | null) => void;
  onProgressiveRender?: () => void;
}

export type FileRenderHandler<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> = (
  buffer: ArrayBuffer,
  target: Target,
  type?: string,
  context?: FileRenderContext
) => Promise<Rendered>;

export interface FileRenderHandlerComposite<
  Rendered = unknown,
  Target extends HTMLElement = HTMLElement,
> {
  accepts: Array<string>;
  handler: FileRenderHandler<Rendered, Target>;
}

export interface FileViewerTypstOptions {
  compilerWasmUrl?: string;
}

export type FileViewerCadRenderer = 'auto' | 'webgl' | 'canvas2d';
export type FileViewerCadDwfLineWeightMode = 'adaptive' | 'physical' | 'hairline';

export interface FileViewerCadOptions {
  wasmPath?: string;
  workerUrl?: string | URL;
  dwfWasmUrl?: string;
  dxfEncoding?: string;
  useWorker?: boolean;
  workerTimeoutMs?: number;
  renderer?: FileViewerCadRenderer;
  preferDwgWasm?: boolean;
  includePaperSpace?: boolean;
  maxInsertDepth?: number;
  keepRaw?: boolean;
  preloadDwg?: boolean;
  dwfPreferWebgl?: boolean;
  dwfPreferWasm?: boolean;
  dwfBackground?: string;
  dwfMaxDevicePixelRatio?: number;
  dwfMaxCanvasPixels?: number;
  dwfMaxGpuCacheBytes?: number;
  dwfMaxCachedScenes?: number;
  dwfLineWeightMode?: FileViewerCadDwfLineWeightMode;
  dwfMinStrokeCssPx?: number;
  dwfMaxOverviewStrokeCssPx?: number;
  dwfMinTextCssPx?: number;
  dwfMinFilledAreaCssPx?: number;
  canvasOptions?: Record<string, unknown>;
}

export interface FileViewerSearchOptions {
  enabled?: boolean;
  caseSensitive?: boolean;
  wholeWord?: boolean;
  maxMatches?: number;
  debounce?: number;
  className?: string;
  activeClassName?: string;
}

export interface FileViewerAiOptions {
  enabled?: boolean;
  collectText?: boolean;
  maxTextLength?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface FileViewerOptions {
  theme?: FileViewerThemeMode;
  watermark?: boolean | FileViewerWatermarkOptions;
  toolbar?: boolean | FileViewerToolbarOptions;
  search?: boolean | FileViewerSearchOptions;
  ai?: boolean | FileViewerAiOptions;
  archive?: FileViewerArchiveOptions;
  pdf?: FileViewerPdfOptions;
  docx?: FileViewerDocxOptions;
  typst?: FileViewerTypstOptions;
  cad?: FileViewerCadOptions;
  hooks?: FileViewerLifecycleHooks;
  beforeOperation?: FileViewerBeforeOperation;
}

export interface FileViewerLifecycleContext {
  phase: FileViewerLifecyclePhase;
  type: string;
  filename: string;
  source: FileViewerSourceKind;
  url?: string;
  file?: File;
  size?: number;
  version: number;
  timestamp: number;
  duration?: number;
  reason?: 'replace' | 'reset' | 'component-unmount';
}

export interface FileViewerLifecycleHooks {
  onLoadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onLoadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onUnloadStart?: (context: FileViewerLifecycleContext) => void | Promise<void>;
  onUnloadComplete?: (context: FileViewerLifecycleContext) => void | Promise<void>;
}

export interface FileViewerOperationContext extends Omit<FileViewerLifecycleContext, 'phase'> {
  operation: FileViewerOperationType;
  label: string;
}

export type FileViewerBeforeOperation = (
  context: FileViewerOperationContext
) => boolean | void | Promise<boolean | void>;

export interface FileViewerOperationAvailability {
  download: boolean;
  print: boolean;
  exportHtml: boolean;
  zoom: boolean;
  zoomIn: boolean;
  zoomOut: boolean;
  zoomReset: boolean;
}

export interface FileViewerZoomState {
  scale: number;
  label: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  canReset: boolean;
  minScale?: number;
  maxScale?: number;
}

export interface FileViewerZoomProvider {
  zoomIn: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  zoomOut: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  resetZoom: () => FileViewerZoomState | Promise<FileViewerZoomState>;
  setZoom?: (scale: number) => FileViewerZoomState | Promise<FileViewerZoomState>;
  getState: () => FileViewerZoomState;
  subscribe?: (listener: () => void) => () => void;
}

export interface FileViewerSearchMatch {
  id: string;
  index: number;
  text: string;
  anchor: FileViewerDocumentAnchor | null;
  line?: number;
  page?: number;
}

export interface FileViewerSearchState {
  query: string;
  total: number;
  currentIndex: number;
  current: FileViewerSearchMatch | null;
  matches: FileViewerSearchMatch[];
}

export interface FileViewerSearchProvider {
  search: (query: string, options?: FileViewerSearchOptions) => FileViewerSearchState | Promise<FileViewerSearchState>;
  next?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  previous?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  clear?: () => FileViewerSearchState | Promise<FileViewerSearchState>;
  getState?: () => FileViewerSearchState;
}

export interface FileViewerDocumentAnchor {
  id: string;
  index: number;
  line: number;
  type: 'page' | 'line' | 'block';
  label: string;
  text: string;
  page?: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FileViewerDocumentChunk {
  id: string;
  text: string;
  anchor: FileViewerDocumentAnchor;
  startLine: number;
  endLine: number;
}

export interface FileViewerSource {
  url?: string;
  file?: File | Blob;
  buffer?: ArrayBuffer;
  filename?: string;
  type?: string;
  size?: number;
}

export interface NormalizedFileViewerSource {
  kind: FileViewerSourceKind;
  filename: string;
  extension: string;
  url?: string;
  file?: File | Blob;
  buffer?: ArrayBuffer;
  size?: number;
}

export interface RenderSurface {
  container: HTMLElement;
  shadowRoot?: ShadowRoot;
}

export interface RendererCapability {
  download?: boolean;
  print?: boolean | 'adapter';
  exportHtml?: boolean | 'adapter';
  zoom?: boolean | 'provider';
  search?: boolean | 'provider';
}

export interface RendererDefinition {
  id: string;
  label: string;
  category: FileViewerRendererCategory;
  extensions: readonly string[];
  async?: boolean;
  capabilities?: RendererCapability;
  load?: RendererLoader;
}

export type RendererPlugin = RendererDefinition;

export type ViewerLifecycleContext = FileViewerLifecycleContext;

export type ViewerOperationContext = FileViewerOperationContext;

export type ViewerCapabilityState = FileViewerOperationAvailability;

export interface RendererLoadContext {
  source: NormalizedFileViewerSource;
  surface: RenderSurface;
  options: FileViewerOptions;
  signal?: AbortSignal;
}

export interface RendererSession {
  destroy?: () => void | Promise<void>;
  getAvailability?: () => Partial<FileViewerOperationAvailability>;
}

export type RendererLoader = (context: RendererLoadContext) => RendererSession | Promise<RendererSession>;

export interface RendererRegistry {
  register(definition: RendererDefinition): void;
  unregister(id: string): boolean;
  getById(id: string): RendererDefinition | undefined;
  getByExtension(extension: string): RendererDefinition | undefined;
  hasExtension(extension: string): boolean;
  list(): RendererDefinition[];
  listExtensions(): string[];
}

export interface FileViewerInstance {
  readonly container: HTMLElement;
  load(source: FileViewerSource): Promise<RendererSession | null>;
  destroy(reason?: FileViewerLifecycleContext['reason']): Promise<void>;
  updateOptions(options: Partial<FileViewerOptions>): void;
  getCapabilities(extension?: string): FileViewerOperationAvailability;
  getRenderer(extension?: string): RendererDefinition | undefined;
  getSource(): NormalizedFileViewerSource | null;
}
