<script setup lang='ts'>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  FileSearch,
  FolderOpen,
  History,
  Link2,
  MoreHorizontal,
  Moon,
  Printer,
  RotateCcw,
  Scan,
  Search,
  Settings2,
  Sparkles,
  Stamp,
  Sun,
  Upload,
  X,
  ZoomIn,
  ZoomOut
} from '@lucide/vue'
import {
  resolveFileViewerColorScheme,
  toggleFileViewerColorScheme
} from '@file-viewer/core'
import { allRenderers } from '@file-viewer/preset-all'
import { createDemoFileHandoff } from '@/components/utils'
import DemoFileTypeIcon from '@/components/demo/DemoFileTypeIcon.vue'
import DemoRecentFiles from '@/components/demo/DemoRecentFiles.vue'
import DemoViewerSettingsPanel from '@/components/demo/DemoViewerSettingsPanel.vue'
import { useDemoCopy } from '@/composables/useDemoCopy'
import { useDemoFileCapsuleMotion } from '@/composables/useDemoFileCapsuleMotion'
import { useDemoFileTypes } from '@/composables/useDemoFileTypes'
import { useDemoFloatingPanels } from '@/composables/useDemoFloatingPanels'
import { useDemoRecentFiles } from '@/composables/useDemoRecentFiles'
import {
  createDemoModelOptions,
  resolveDemoFormatSettingsSection,
  useDemoViewerSettings
} from '@/composables/useDemoViewerSettings'
import type { DemoFormatSettingsSection } from '@/composables/useDemoViewerSettings'
import type { DemoLocale } from '@/composables/useDemoCopy'
import type { DemoSourcePanelAnchor } from '@/composables/useDemoFloatingPanels'
import type { DemoRecentFile } from '@/composables/useDemoRecentFiles'
import type {
  FileViewerFileRef as FileRef,
  FileViewerFitMode,
  FileViewerOperationAvailability,
  FileViewerOptions,
  FileViewerPublicApi as FileViewerExpose,
  FileViewerSearchState,
  FileViewerThemeMode,
  FileViewerUiDensity,
  FileViewerViewState,
  FileViewerViewStateChange,
  FileViewerZoomState
} from '@file-viewer/core'
import brandLogo from '@/assets/logo.png'
import githubMark from '@/assets/github-mark.svg'

const demoFileHandoff = createDemoFileHandoff()
const { extensionOf, fileNameOf, safeDecodeURIComponent, getFileIconMeta } = useDemoFileTypes()
const {
  recentFiles,
  hasRecentFiles,
  rememberUrl,
  rememberSample,
  rememberLocalFile,
  dismissRecentFile
} = useDemoRecentFiles()

// An explicit URL is an integration entry, not a navigation action inside the
// product demo. Keep that contract synchronous so the full demo chrome never
// flashes before the standalone viewer mounts.
const immersiveMode = ref(demoFileHandoff.isImmersiveRequest)
const filename = ref('')
const file = ref<FileRef | undefined>()
const isMobileDemoViewport = () => window.matchMedia?.('(max-width: 720px)').matches ?? false
const recentPanelOpen = ref(!isMobileDemoViewport())
const wasMobileViewport = ref(isMobileDemoViewport())
const recentLocalReselectName = ref('')
const recentLocalFiles = new Map<string, File>()

const DEMO_LOCALE_STORAGE_KEY = 'file-viewer-demo-locale'
const DEMO_THEME_STORAGE_KEY = 'file-viewer-demo-theme'
const DEFAULT_DEMO_URL_BY_LOCALE: Record<DemoLocale, string> = {
  'zh-CN': '/example/word.docx',
  'en-US': '/example/en/calibre-demo.docx'
}
const githubRepositoryUrl = 'https://github.com/flyfish-dev/file-viewer'

const readDemoStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

const writeDemoStorage = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Restricted/private browser contexts may disable storage. The live UI
    // remains authoritative for the current session.
  }
}

const normalizeDemoLocale = (value?: string | null): DemoLocale => {
  return String(value || '').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US'
}

const normalizeDemoDensity = (value?: string | null): FileViewerUiDensity => {
  return value === 'compact' ? 'compact' : 'comfortable'
}

const normalizeDemoTheme = (value?: string | null): FileViewerThemeMode => {
  return value === 'light' || value === 'dark' ? value : 'system'
}

const resolveInitialDemoLocale = (): DemoLocale => {
  const queryParams = new URLSearchParams(window.location.search)
  const explicitLocale = queryParams.get('locale') || queryParams.get('lang')
  if (explicitLocale) {
    return normalizeDemoLocale(explicitLocale)
  }
  const storedLocale = readDemoStorage(DEMO_LOCALE_STORAGE_KEY)
  if (storedLocale) {
    return normalizeDemoLocale(storedLocale)
  }
  return normalizeDemoLocale(navigator.languages?.[0] || navigator.language)
}

const resolveInitialDemoDensity = (): FileViewerUiDensity => {
  const queryParams = new URLSearchParams(window.location.search)
  return normalizeDemoDensity(queryParams.get('density') || queryParams.get('uiDensity'))
}

const resolveInitialDemoTheme = (): FileViewerThemeMode => {
  const queryParams = new URLSearchParams(window.location.search)
  const explicitTheme = queryParams.get('theme') || queryParams.get('viewerTheme')
  if (explicitTheme) {
    return normalizeDemoTheme(explicitTheme)
  }
  return normalizeDemoTheme(readDemoStorage(DEMO_THEME_STORAGE_KEY))
}

const demoLocale = ref<DemoLocale>(resolveInitialDemoLocale())
const { copy: demoCopy, getCopy: getDemoCopy } = useDemoCopy(demoLocale)
const demoDensity = ref<FileViewerUiDensity>(resolveInitialDemoDensity())
const demoTheme = ref<FileViewerThemeMode>(resolveInitialDemoTheme())
const systemPrefersDark = ref(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)
const systemThemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
const url = ref(demoFileHandoff.isEmbedRequest && !demoFileHandoff.initialUrl ? '' : DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value])
const preview = ref('')
const samplePickerOpen = ref(false)
const expandedSampleGroupIndex = ref<number | null>(0)
const samplePickerRef = ref<HTMLElement | null>(null)
const controlPanelRef = ref<HTMLElement | null>(null)
const settingsButtonRef = ref<HTMLButtonElement | null>(null)
const mobileMoreButtonRef = ref<HTMLButtonElement | null>(null)
const mobileActionsPanelRef = ref<HTMLElement | null>(null)
const morePanelRef = ref<HTMLElement | null>(null)
const fileIdentityButtonRef = ref<HTMLButtonElement | null>(null)
const topCapsuleNavigationRef = ref<HTMLElement | null>(null)
const linkTriggerButtonRef = ref<HTMLButtonElement | null>(null)
const uploadTriggerButtonRef = ref<HTMLButtonElement | null>(null)
const sampleRailButtonRef = ref<HTMLButtonElement | null>(null)
const watermarkEnabled = ref(false)
const desktopActionsOpen = ref(false)
const fitMode = ref<FileViewerFitMode | 'default'>('default')
const runtimeOptions = shallowRef<FileViewerOptions>({})
const mobileControlsOpen = ref(false)
const mobileActionsOpen = ref(false)
const {
  sourcePanelOpen: desktopSourcePanelOpen,
  sourcePanelMode: desktopSourceMode,
  sourcePanelAnchor,
  sourcePanelStyle,
  openSourcePanel,
  closeSourcePanel,
  toggleSourcePanel,
  updatePosition: updateDesktopSourcePanelPosition
} = useDemoFloatingPanels({
  linkTrigger: linkTriggerButtonRef,
  uploadTrigger: uploadTriggerButtonRef,
  samplesTrigger: sampleRailButtonRef,
  fileTrigger: fileIdentityButtonRef
})
const viewerSearchOpen = ref(false)
const viewerSearchQuery = ref('')
const viewerSearchInputRef = ref<HTMLInputElement | null>(null)
const snippetCopied = ref(false)
const snippetDialogOpen = ref(false)
const snippetCloseRef = ref<HTMLButtonElement | null>(null)
const snippetDialogRef = ref<HTMLElement | null>(null)
const viewerSearchState = ref<FileViewerSearchState>({
  query: '',
  total: 0,
  currentIndex: -1,
  current: null,
  matches: []
})

type ViewerAction = 'download' | 'print' | 'exportHtml' | 'zoomIn' | 'zoomOut' | 'resetZoom'

const fileViewerRef = ref<FileViewerExpose | null>(null)
const {
  settingsPanelOpen,
  settingsActiveTab,
  settingsFormatSection,
  appliedViewerSettings,
  settingsDraft,
  viewerRevision,
  settingsNoticeVisible,
  settingsApplying,
  settingsApplyError,
  openSettingsPanel: openViewerSettingsPanel,
  closeSettingsPanel: closeViewerSettingsPanel,
  resetSettingsDraft,
  clearPendingViewState,
  applySettings: applyViewerSettings,
  handleViewerLoadComplete
} = useDemoViewerSettings({
  initialTheme: demoTheme,
  initialDensity: demoDensity,
  fileViewerRef,
  hasActivePreview: () => Boolean(file.value || preview.value),
  applyTheme: nextTheme => {
    demoTheme.value = nextTheme
    writeDemoStorage(DEMO_THEME_STORAGE_KEY, nextTheme)
    syncDemoDocumentChrome()
  },
  applyDensity: nextDensity => {
    demoDensity.value = nextDensity
  },
  applyFit: async (nextFit, context) => {
    fitMode.value = nextFit.fitMode
    if (
      context.needsRendererRefresh && context.hasActivePreview ||
      nextFit.fitMode === 'default'
    ) {
      return
    }
    await nextTick()
    await fileViewerRef.value?.fitToView({
      mode: nextFit.fitMode,
      resize: nextFit.fitResize,
      padding: nextFit.fitPadding,
      minScale: nextFit.fitMinScale,
      maxScale: nextFit.fitMaxScale
    })
  },
  applyWatermark: nextWatermark => {
    watermarkEnabled.value = nextWatermark.watermarkEnabled
  },
  beforeApply: async ({ next }) => {
    if (!next.searchEnabled && viewerSearchOpen.value) {
      await closeViewerSearch()
    }
  }
})
const desktopFileCapsuleMotionQuery = window.matchMedia?.(
  '(min-width: 721px) and (hover: hover) and (pointer: fine)'
)
const reducedFileCapsuleMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
const resolveFileCapsuleMergeTarget = () => {
  const trigger = uploadTriggerButtonRef.value
  if (!trigger) return null
  const bounds = trigger.getBoundingClientRect()
  const configuredWidth = Number.parseFloat(
    window.getComputedStyle(trigger).getPropertyValue('--demo-file-capsule-merged-width')
  )
  const width = Number.isFinite(configuredWidth) && configuredWidth > 0
    ? configuredWidth
    : bounds.width
  // The navigation stays centered while its first slot grows. Compensating by
  // half the width delta gives the file capsule its exact resting rect before
  // the capsule morph starts, avoiding a final lateral jump.
  const left = bounds.left - (width - bounds.width) / 2
  return {
    top: bounds.top,
    right: left + width,
    bottom: bounds.bottom,
    left,
    width,
    height: bounds.height
  }
}
const {
  state: fileCapsuleState,
  motionStyle: fileCapsuleMotionStyle,
  stableMerged: fileCapsuleMerged,
  actionLocked: fileCapsuleActionLocked,
  reset: resetFileCapsuleMotion,
  handlePointerEnter: handleFileCapsulePointerEnter,
  handlePointerLeave: handleFileCapsulePointerLeave,
  handleFocusIn: handleFileCapsuleFocusIn,
  handleFocusOut: handleFileCapsuleFocusOut
} = useDemoFileCapsuleMotion({
  enabled: () => Boolean(
    desktopFileCapsuleMotionQuery?.matches &&
    !reducedFileCapsuleMotionQuery?.matches &&
    !immersiveMode.value
  ),
  canMerge: () => !(
    desktopSourcePanelOpen.value ||
    settingsPanelOpen.value ||
    desktopActionsOpen.value ||
    viewerSearchOpen.value ||
    mobileControlsOpen.value ||
    mobileActionsOpen.value ||
    snippetDialogOpen.value
  ),
  resolveFileBounds: () => fileIdentityButtonRef.value?.getBoundingClientRect() || null,
  resolveTriggerBounds: () => topCapsuleNavigationRef.value?.getBoundingClientRect() || null,
  resolveMergeTarget: resolveFileCapsuleMergeTarget
})
const createEmptyViewerAvailability = (): FileViewerOperationAvailability => ({
  download: false,
  print: false,
  exportHtml: false,
  zoom: false,
  zoomIn: false,
  zoomOut: false,
  zoomReset: false
})

const createEmptyViewerZoomState = (): FileViewerZoomState => ({
  scale: 1,
  label: '100%',
  canZoomIn: false,
  canZoomOut: false,
  canReset: false
})

const viewerAvailability = ref<FileViewerOperationAvailability>(createEmptyViewerAvailability())
const viewerZoomState = ref<FileViewerZoomState>(createEmptyViewerZoomState())
const viewerViewState = ref<FileViewerViewState>({})
let viewerProviderEpoch = 0

type PresetFile = {
  name: string
  url: string
}

type SampleGroup = {
  title: string
  description: string
  family: string
  items: PresetFile[]
}

const recentTimeFormatter = computed(() => new Intl.DateTimeFormat(demoLocale.value, {
  hour: '2-digit',
  minute: '2-digit'
}))
const recentDisplayEntries = computed(() => (
  recentFiles.value.slice(0, 3).map(entry => ({
    ...entry,
    ...getFileIconMeta(entry.iconTarget),
    timeLabel: recentTimeFormatter.value.format(new Date(entry.timestamp)),
    timeIso: new Date(entry.timestamp).toISOString()
  }))
))
const recentFilesCopy = computed(() => ({
  title: demoCopy.value.recentOpened,
  close: demoCopy.value.closeRecent,
  open: demoCopy.value.openRecent,
  dismiss: demoCopy.value.dismissRecent
}))
const recentLocalReselectNotice = computed(() => {
  if (!recentLocalReselectName.value) {
    return ''
  }
  return demoCopy.value.reselectLocalFile.replace('{name}', recentLocalReselectName.value)
})
const resolvedDemoTheme = computed(() => resolveFileViewerColorScheme(demoTheme.value, systemPrefersDark.value))
const demoThemeButtonTitle = computed(() => {
  return resolvedDemoTheme.value === 'dark'
    ? demoCopy.value.themeToLight
    : demoCopy.value.themeToDark
})
const githubRepositoryAriaLabel = computed(() =>
  demoLocale.value === 'zh-CN'
    ? 'GitHub 开源总仓库'
    : 'GitHub repository'
)

const sampleGroupsZh: SampleGroup[] = [
  {
    title: '文档',
    description: 'Word / PDF / OFD / Typst',
    family: 'word',
    items: [
      { name: 'DOC', url: '/example/test.doc' },
      { name: 'DOCX 中文长文档', url: '/example/word.docx' },
      { name: 'DOT 模板', url: '/example/template.dot' },
      { name: 'RTF', url: '/example/sample.rtf' },
      { name: 'ODT', url: '/example/document.odt' },
      { name: 'PDF 技术说明', url: '/example/pdf.pdf' },
      { name: 'OFD', url: '/example/ofd.ofd' },
      { name: 'Typst', url: '/example/report.typ' }
    ]
  },
  {
    title: '表格',
    description: 'Excel / CSV / ODS',
    family: 'sheet',
    items: [
      { name: 'XLSX', url: '/example/excel.xlsx' },
      { name: 'XLSM', url: '/example/excel.xlsm' },
      { name: 'XLSB', url: '/example/excel.xlsb' },
      { name: 'XLS', url: '/example/excel.xls' },
      { name: 'CSV', url: '/example/table.csv' },
      { name: 'ODS', url: '/example/excel.ods' },
      { name: 'FODS', url: '/example/excel.fods' },
      { name: 'Numbers', url: '/example/excel.numbers' }
    ]
  },
  {
    title: '演示与图纸',
    description: 'PPT / PPTX / CAD',
    family: 'cad',
    items: [
      { name: 'PowerPoint 97–2003', url: '/example/office-demo.ppt' },
      { name: 'NASA 月球战略 PPTX', url: '/example/ppt.pptx' },
      { name: 'ODP', url: '/example/slides.odp' },
      { name: 'DXF', url: '/example/drawing.dxf' },
      { name: 'DWG', url: '/example/sample.dwg' },
      { name: 'DWF Blocks/Tables', url: '/example/samples/apache/blocks_and_tables.dwf' },
      { name: 'DWFx House', url: '/example/samples/autodesk/house.dwfx' },
      { name: 'DWFx RobotArm', url: '/example/samples/autodesk/robot-arm.dwfx' }
    ]
  },
  {
    title: '脑图与绘图',
    description: 'XMind / Mermaid / PlantUML / draw.io',
    family: 'drawing',
    items: [
      { name: 'XMind 脑图', url: '/example/mindmap.xmind' },
      { name: 'Mermaid 架构图', url: '/example/architecture.mermaid' },
      { name: 'PlantUML 时序图', url: '/example/sequence.plantuml' },
      { name: 'Excalidraw', url: '/example/flow.excalidraw' },
      { name: 'draw.io', url: '/example/process.drawio' }
    ]
  },
  {
    title: '3D 模型和地理数据',
    description: 'GLTF / STEP / OBJ / STL / GeoJSON / KML / GPX',
    family: 'model',
    items: [
      { name: 'GLTF', url: '/example/model.gltf' },
      { name: 'STEP 工程模型', url: '/example/model.step' },
      { name: 'OBJ', url: '/example/model.obj' },
      { name: 'STL', url: '/example/model.stl' },
      { name: 'PLY', url: '/example/model.ply' },
      { name: 'GeoJSON', url: '/example/map.geojson' },
      { name: 'KML', url: '/example/route.kml' },
      { name: 'GPX', url: '/example/track.gpx' }
    ]
  },
  {
    title: '电子书',
    description: 'EPUB / UMD',
    family: 'ebook',
    items: [
      { name: 'EPUB', url: '/example/book.epub' },
      { name: 'UMD', url: '/example/book.umd' }
    ]
  },
  {
    title: '压缩包',
    description: 'ZIP / TAR.GZ / 加密',
    family: 'archive',
    items: [
      { name: 'ZIP', url: '/example/archive.zip' },
      { name: 'TAR.GZ', url: '/example/archive.tar.gz' },
      { name: '加密 ZIP（密码 flyfish）', url: '/example/encrypted.zip' }
    ]
  },
  {
    title: '邮件与 EDA',
    description: 'EML / MSG / OLB / DRA / GDS / OASIS',
    family: 'email',
    items: [
      { name: 'EML', url: '/example/sample.eml' },
      { name: 'MSG', url: '/example/sample.msg' },
      { name: 'MBOX', url: '/example/sample.mbox' },
      { name: 'OLB', url: '/example/sample.olb' },
      { name: 'DRA', url: '/example/sample.dra' },
      { name: 'GDSII', url: '/example/layout.gds' },
      { name: 'OAS', url: '/example/layout.oas' },
      { name: 'OASIS', url: '/example/layout.oasis' }
    ]
  },
  {
    title: '文本',
    description: 'Markdown / TXT / Log',
    family: 'text',
    items: [
      { name: 'MD', url: '/example/markdown.md' },
      { name: 'MARKDOWN', url: '/example/notes.markdown' },
      { name: 'TXT', url: '/example/text.txt' },
      { name: 'Log', url: '/example/app.log' }
    ]
  },
  {
    title: '前端与数据',
    description: 'JS / TS / Vue / Data',
    family: 'code',
    items: [
      { name: 'JSON', url: '/example/data.json' },
      { name: 'JSONC', url: '/example/data.jsonc' },
      { name: 'JSON5', url: '/example/data.json5' },
      { name: 'IPYNB', url: '/example/notebook.ipynb' },
      { name: 'JS', url: '/example/code.js' },
      { name: 'MJS', url: '/example/code.mjs' },
      { name: 'CJS', url: '/example/code.cjs' },
      { name: 'TS', url: '/example/code.ts' },
      { name: 'TSX', url: '/example/code.tsx' },
      { name: 'JSX', url: '/example/code.jsx' },
      { name: 'CSS', url: '/example/code.css' },
      { name: 'HTML', url: '/example/page.html' },
      { name: 'HTM', url: '/example/page.htm' },
      { name: 'XML', url: '/example/data.xml' },
      { name: 'VUE', url: '/example/component.vue' },
      { name: 'React', url: '/example/component.react' },
      { name: 'YAML', url: '/example/config.yaml' },
      { name: 'YML', url: '/example/config.yml' },
      { name: 'TOML', url: '/example/config.toml' },
      { name: 'INI', url: '/example/settings.ini' },
      { name: 'PROTO', url: '/example/service.proto' },
      { name: 'HCL', url: '/example/infrastructure.hcl' },
      { name: 'TeX', url: '/example/formula.tex' },
      { name: 'Graphviz', url: '/example/graph.gv' },
      { name: 'HTTP', url: '/example/request.http' },
      { name: 'DIFF', url: '/example/change.diff' },
      { name: 'PATCH 左右比对', url: '/example/change.patch' },
      { name: 'Git Bundle', url: '/example/repository.bundle' }
    ]
  },
  {
    title: '后端与系统',
    description: 'Shell / SQL / C / Go',
    family: 'code',
    items: [
      { name: 'SH', url: '/example/script.sh' },
      { name: 'BASH', url: '/example/script.bash' },
      { name: 'SQL', url: '/example/query.sql' },
      { name: 'GO', url: '/example/main.go' },
      { name: 'RS', url: '/example/main.rs' },
      { name: 'PHP', url: '/example/index.php' },
      { name: 'C', url: '/example/main.c' },
      { name: 'CPP', url: '/example/main.cpp' },
      { name: 'CC', url: '/example/module.cc' },
      { name: 'H', url: '/example/main.h' },
      { name: 'HPP', url: '/example/main.hpp' },
      { name: 'CS', url: '/example/program.cs' },
      { name: 'Java', url: '/example/code.java' },
      { name: 'Python', url: '/example/code.py' },
      { name: 'Ruby', url: '/example/code.rb' },
      { name: 'Swift', url: '/example/code.swift' },
      { name: 'Kotlin', url: '/example/Main.kt' }
    ]
  },
  {
    title: '资产与数据',
    description: 'SQLite / WASM / ICO',
    family: 'data',
    items: [
      { name: 'SQLite', url: '/example/sample.sqlite' },
      { name: 'WASM', url: '/example/module.wasm' },
      { name: 'PSD 图层', url: '/example/design.psd' },
      { name: 'ICO', url: '/example/icon.ico' }
    ]
  },
  {
    title: '媒体',
    description: 'Image / Audio / Video',
    family: 'image',
    items: [
      { name: 'PNG', url: '/example/pic.png' },
      { name: 'JPG', url: '/example/pic.jpg' },
      { name: 'JPEG', url: '/example/pic.jpeg' },
      { name: 'GIF', url: '/example/pic.gif' },
      { name: 'BMP', url: '/example/pic.bmp' },
      { name: 'TIFF', url: '/example/pic.tiff' },
      { name: 'TIF', url: '/example/pic.tif' },
      { name: 'SVG', url: '/example/vector.svg' },
      { name: 'WEBP', url: '/example/pic.webp' },
      { name: 'MP3', url: '/example/audio.mp3' },
      { name: 'OGG', url: '/example/audio.ogg' },
      { name: 'MIDI', url: '/example/melody.mid' },
      { name: 'MP4', url: '/example/video.mp4' }
    ]
  }
]

const englishGroupCopy: Array<Pick<SampleGroup, 'title' | 'description'>> = [
  { title: 'Documents', description: 'Word / PDF / OFD / Typst' },
  { title: 'Spreadsheets', description: 'Excel / CSV / ODS' },
  { title: 'Slides & CAD', description: 'PPT / PPTX / CAD' },
  { title: 'Mindmaps & Diagrams', description: 'XMind / Mermaid / PlantUML / draw.io' },
  { title: '3D Models & Geospatial Data', description: 'GLTF / STEP / OBJ / STL / GeoJSON / KML / GPX' },
  { title: 'Ebooks', description: 'EPUB / UMD' },
  { title: 'Archives', description: 'ZIP / TAR.GZ / Encrypted' },
  { title: 'Email & EDA', description: 'EML / MSG / OLB / DRA / GDS / OASIS' },
  { title: 'Text', description: 'Markdown / TXT / Log' },
  { title: 'Frontend & Data', description: 'JS / TS / Vue / Data' },
  { title: 'Backend & System', description: 'Shell / SQL / C / Go' },
  { title: 'Assets & Data', description: 'SQLite / WASM / PSD / ICO' },
  { title: 'Media', description: 'Image / Audio / Video' }
]

const englishSampleUrlMap: Record<string, string> = {
  '/example/word.docx': '/example/en/calibre-demo.docx',
  '/example/excel.xlsx': '/example/en/financial-sample.xlsx',
  '/example/pdf.pdf': '/example/en/prince-sample.pdf',
  '/example/ppt.pptx': '/example/en/sample-presentation.pptx',
  '/example/archive.zip': '/example/en/archive.zip',
  '/example/archive.tar.gz': '/example/en/archive.tar.gz',
  '/example/encrypted.zip': '/example/encrypted.zip',
  '/example/model.gltf': '/example/en/model.gltf',
  '/example/map.geojson': '/example/en/map.geojson',
  '/example/markdown.md': '/example/en/markdown.md',
  '/example/notes.markdown': '/example/en/notes.markdown',
  '/example/text.txt': '/example/en/text.txt',
  '/example/app.log': '/example/en/app.log',
  '/example/table.csv': '/example/en/table.csv',
  '/example/data.json': '/example/en/data.json',
  '/example/data.jsonc': '/example/en/data.jsonc',
  '/example/data.json5': '/example/en/data.json5',
  '/example/code.ts': '/example/en/code.ts',
  '/example/code.js': '/example/en/code.js'
}

const englishSampleNameMap: Record<string, string> = {
  '/example/test.doc': 'DOC legacy document',
  '/example/en/calibre-demo.docx': 'DOCX rich English document',
  '/example/template.dot': 'DOT template',
  '/example/sample.rtf': 'RTF document',
  '/example/document.odt': 'ODT document',
  '/example/en/prince-sample.pdf': 'PDF technical sample',
  '/example/ofd.ofd': 'OFD layout document',
  '/example/report.typ': 'Typst report',
  '/example/en/financial-sample.xlsx': 'XLSX financial workbook',
  '/example/excel.xlsm': 'XLSM macro workbook',
  '/example/excel.xlsb': 'XLSB binary workbook',
  '/example/excel.xls': 'XLS legacy workbook',
  '/example/table.csv': 'CSV table',
  '/example/excel.ods': 'ODS spreadsheet',
  '/example/excel.fods': 'Flat ODS spreadsheet',
  '/example/excel.numbers': 'Numbers workbook',
  '/example/office-demo.ppt': 'PowerPoint 97–2003 sample',
  '/example/en/sample-presentation.pptx': 'NASA lunar strategy PPTX',
  '/example/slides.odp': 'ODP presentation',
  '/example/drawing.dxf': 'DXF drawing',
  '/example/sample.dwg': 'DWG Autodesk sample',
  '/example/samples/apache/blocks_and_tables.dwf': 'DWF blocks and tables',
  '/example/samples/autodesk/house.dwfx': 'DWFx house drawing',
  '/example/samples/autodesk/robot-arm.dwfx': 'DWFx robot arm',
  '/example/mindmap.xmind': 'XMind mind map',
  '/example/architecture.mermaid': 'Mermaid architecture',
  '/example/sequence.plantuml': 'PlantUML sequence',
  '/example/flow.excalidraw': 'Excalidraw scene',
  '/example/process.drawio': 'draw.io process',
  '/example/book.epub': 'EPUB ebook',
  '/example/book.umd': 'UMD ebook',
  '/example/en/archive.zip': 'ZIP archive with English samples',
  '/example/en/archive.tar.gz': 'TAR.GZ archive with English samples',
  '/example/encrypted.zip': 'Encrypted ZIP (password: flyfish)',
  '/example/sample.eml': 'EML message',
  '/example/sample.msg': 'MSG Outlook message',
  '/example/sample.mbox': 'MBOX mailbox',
  '/example/sample.olb': 'OLB library',
  '/example/sample.dra': 'DRA design archive',
  '/example/layout.gds': 'GDSII layout',
  '/example/layout.oas': 'OAS layout',
  '/example/layout.oasis': 'OASIS layout',
  '/example/markdown.md': 'Markdown document',
  '/example/notes.markdown': 'Markdown notes',
  '/example/text.txt': 'Plain text',
  '/example/app.log': 'Application log',
  '/example/en/markdown.md': 'Markdown product guide',
  '/example/en/notes.markdown': 'Markdown support notes',
  '/example/en/text.txt': 'Plain text overview',
  '/example/en/app.log': 'Application log stream',
  '/example/en/table.csv': 'CSV revenue table',
  '/example/en/data.json': 'JSON capability data',
  '/example/en/data.jsonc': 'JSONC config sample',
  '/example/en/data.json5': 'JSON5 config sample',
  '/example/en/code.ts': 'TypeScript integration sample',
  '/example/en/code.js': 'JavaScript integration sample',
  '/example/en/model.gltf': 'glTF embedded model',
  '/example/model.step': 'STEP engineering model',
  '/example/en/map.geojson': 'GeoJSON Bay route',
  '/example/change.patch': 'Patch side-by-side diff',
  '/example/repository.bundle': 'Git bundle history',
  '/example/sample.sqlite': 'SQLite database',
  '/example/module.wasm': 'WASM module',
  '/example/design.psd': 'PSD layers',
  '/example/icon.ico': 'ICO image'
}

const sampleGroupsEn: SampleGroup[] = sampleGroupsZh.map((group, index) => ({
  ...group,
  ...(englishGroupCopy[index] || {}),
  items: group.items.map(item => {
    const nextUrl = englishSampleUrlMap[item.url] || item.url
    return {
      url: nextUrl,
      name: englishSampleNameMap[nextUrl] || englishSampleNameMap[item.url] || item.name
    }
  })
}))

const sampleGroups = computed(() => demoLocale.value === 'zh-CN' ? sampleGroupsZh : sampleGroupsEn)
const presetFiles = computed(() => sampleGroups.value.flatMap(group => group.items))
const allPresetFiles = [...sampleGroupsZh, ...sampleGroupsEn].flatMap(group => group.items)
const integrationSnippet = computed(() => {
  if (file.value) {
    return `import FileViewer from '@file-viewer/react-full'

export function Preview({ file }: { file: File }) {
  return <FileViewer file={file} style={{ height: 720 }} />
}`
  }
  const sampleUrl = preview.value || url.value || DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value]
  return `import FileViewer from '@file-viewer/react-full'

export function Preview() {
  return <FileViewer url="${sampleUrl}" style={{ height: 720 }} />
}`
})
const extraUploadExtensions = [
  'docm', 'dot', 'dotx', 'dotm', 'rtf', 'odt',
  'xlt', 'xltx', 'xltm',
  'ppt', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'odp',
  'avif', 'jxl', 'heic', 'heif', 'webm', 'm3u8', 'mpeg', 'wav', 'oga', 'opus', 'm4a', 'aac', 'flac', 'weba', 'midi',
  'glb', 'fbx', 'dae', '3ds', '3mf', 'amf', 'usd', 'usda', 'usdc', 'usdz', 'kmz',
  'step', 'stp', 'iges', 'igs', 'ifc', '3dm', 'pcd', 'wrl', 'vrml', 'xyz', 'vtk', 'vtp', 'shp',
  'zip', 'zipx', '7z', 'rar', 'tar', 'gz', 'gzip', 'tgz', 'bz2', 'bzip2', 'tbz', 'tbz2',
  'xz', 'txz', 'lzma', 'zst', 'tzst', 'cab', 'ar', 'cpio', 'iso', 'xar', 'lha', 'lzh',
  'jar', 'war', 'ear', 'apk', 'cbz', 'cbr', 'eml', 'msg', 'mbox', 'olb', 'dra', 'gds', 'oas', 'oasis', 'xmind', 'typst',
  'mermaid', 'mmd', 'plantuml', 'puml', 'patch', 'bundle', 'bdl',
  'ttf', 'otf', 'woff', 'woff2', 'psd', 'ai', 'eps', 'parquet', 'avro', 'webarchive'
]

const uploadAccept = Array.from(new Set([
  ...allPresetFiles.map(item => {
    const ext = item.url.split('.').pop()
    return ext ? `.${ext}` : ''
  }),
  ...extraUploadExtensions.map(ext => `.${ext}`)
]))
  .filter(Boolean)
  .join(',')

const localUrlBase = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return 'file:///'
}

const sampleUrlKey = (target: string) => {
  const clean = target.split(/[?#]/)[0] || target
  try {
    const parsed = new URL(clean, localUrlBase())
    const isLocal = parsed.origin === new URL(localUrlBase()).origin
    const originKey = isLocal ? '' : parsed.origin.toLowerCase()
    return `${originKey}${safeDecodeURIComponent(parsed.pathname)}`
  } catch {
    const path = clean.startsWith('/') ? clean : `/${clean}`
    return safeDecodeURIComponent(path)
  }
}

const legacyDemoUrlMap: Record<string, string> = {
  '/example/calibre-demo.docx': '/example/en/calibre-demo.docx'
}

const normalizeDemoUrl = (target: string) => {
  const normalizedPath = legacyDemoUrlMap[sampleUrlKey(target)]
  if (!normalizedPath) {
    return target
  }
  try {
    const parsed = new URL(target, localUrlBase())
    const isRelative = !/^[a-z][a-z\d+\-.]*:/i.test(target)
    const isLocalOrigin = typeof window === 'undefined' || parsed.origin === window.location.origin
    if (!isRelative && !isLocalOrigin) {
      return target
    }
    return `${normalizedPath}${parsed.search}${parsed.hash}`
  } catch {
    return normalizedPath
  }
}

const isSameSampleUrl = (left: string, right: string) => {
  return sampleUrlKey(left) === sampleUrlKey(right)
}

const activePreset = computed(() => {
  return presetFiles.value.find(item => isSameSampleUrl(item.url, url.value))
})

const activeSampleGroupIndex = computed(() => {
  const target = activePreset.value?.url || url.value || preview.value
  return sampleGroups.value.findIndex(group => group.items.some(item => isSameSampleUrl(item.url, target)))
})

const activeIconMeta = computed(() => {
  return getFileIconMeta(activePreset.value?.url || url.value)
})

const currentFileTarget = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  return preview.value || url.value || displayName.value
})

const currentIconMeta = computed(() => getFileIconMeta(currentFileTarget.value))
const fileSamplesOpen = computed(() => (
  wasMobileViewport.value
    ? mobileControlsOpen.value && desktopSourceMode.value === 'samples'
    : desktopSourcePanelOpen.value && desktopSourceMode.value === 'samples' && sourcePanelAnchor.value === 'file'
))

const currentSettingsFormatSection = computed<Exclude<DemoFormatSettingsSection, 'current'>>(() => {
  return resolveDemoFormatSettingsSection(currentFileTarget.value)
})

const desktopSourcePanelTitle = computed(() => {
  if (desktopSourceMode.value === 'upload') {
    return demoCopy.value.uploadPanelTitle
  }
  if (desktopSourceMode.value === 'samples') {
    return demoCopy.value.samplesPanelTitle
  }
  return demoCopy.value.linkPanelTitle
})

const desktopSourcePanelHint = computed(() => {
  return desktopSourceMode.value === 'upload'
    ? demoCopy.value.uploadPanelHint
    : demoCopy.value.linkPanelHint
})

const displayName = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  if (preview.value) {
    return fileNameOf(preview.value) || preview.value
  }
  return activePreset.value?.name || demoCopy.value.unselected
})

const displayPath = computed(() => {
  if (file.value && filename.value) {
    return filename.value
  }
  return preview.value || url.value || ''
})

const previewType = computed(() => {
  const name = displayName.value
  const ext = extensionOf(name)
  if (!ext) {
    return demoCopy.value.auto
  }
  return ext.toUpperCase()
})

const fileIdentityAriaLabel = computed(() => (
  `${displayName.value}, ${previewType.value}, ${demoCopy.value.openSamples}`
))

watch(currentFileTarget, (nextTarget, previousTarget) => {
  if (nextTarget !== previousTarget) {
    resetFileCapsuleMotion()
  }
})

const externalToolbar = computed(() => {
  const settings = appliedViewerSettings.value
  const toolbar = runtimeOptions.value.toolbar
  if (toolbar === false) {
    return {
      download: false,
      print: false,
      exportHtml: false,
      zoom: false
    }
  }
  if (toolbar && typeof toolbar === 'object') {
    return {
      download: settings.toolbarDownload && toolbar.download !== false,
      print: settings.toolbarPrint && toolbar.print !== false,
      exportHtml: settings.toolbarExportHtml && toolbar.exportHtml !== false,
      zoom: settings.toolbarZoom && toolbar.zoom !== false
    }
  }
  return {
    download: settings.toolbarDownload,
    print: settings.toolbarPrint,
    exportHtml: settings.toolbarExportHtml,
    zoom: settings.toolbarZoom
  }
})

const visibleExternalToolbar = computed(() => {
  return externalToolbar.value
})

const fitModeOptions = computed<Array<{ value: FileViewerFitMode | 'default'; label: string }>>(() => [
  { value: 'default', label: demoCopy.value.fitDefault },
  { value: 'auto', label: demoCopy.value.fitAuto },
  { value: 'contain', label: demoCopy.value.fitContain },
  { value: 'width', label: demoCopy.value.fitWidth },
  { value: 'height', label: demoCopy.value.fitHeight },
  { value: 'cover', label: demoCopy.value.fitCover },
  { value: 'actual', label: demoCopy.value.fitActual },
  { value: 'scale-down', label: demoCopy.value.fitScaleDown }
])

const viewerActionDisabled = computed(() => !file.value && !preview.value)
const viewerZoomDisplayLabel = computed(() => (
  !viewerActionDisabled.value && viewerAvailability.value.zoom
    ? viewerZoomState.value.label
    : '—'
))
const viewerZoomResetLabel = computed(() => (
  `${demoCopy.value.resetZoom}: ${viewerZoomDisplayLabel.value}`
))

const viewerDensity = computed<FileViewerUiDensity>(() => {
  return runtimeOptions.value.ui?.density
    ? normalizeDemoDensity(runtimeOptions.value.ui.density)
    : demoDensity.value
})

const viewerSearchSummary = computed(() => {
  if (!viewerSearchQuery.value.trim()) {
    return '0/0'
  }
  const state = viewerSearchState.value
  return state.total ? `${state.currentIndex + 1}/${state.total}` : '0/0'
})

const viewerPageLabel = computed(() => {
  const pageCount = viewerViewState.value.pageCount
  if (pageCount && pageCount > 0) {
    return `${viewerViewState.value.page || 1} / ${pageCount}`
  }
  return previewType.value
})

const viewerOptions = computed((): FileViewerOptions => {
  const runtime = runtimeOptions.value
  const settings = appliedViewerSettings.value
  const megabyte = 1024 * 1024
  const options = { ...(runtime as Record<string, unknown>) } as FileViewerOptions
  options.renderers = runtime.renderers ?? allRenderers
  if (!options.locale && !options.i18n?.locale) {
    options.locale = demoLocale.value
  }
  if (!immersiveMode.value) {
    options.theme = settings.theme
    options.styleIsolation = settings.styleIsolation
  } else if (!options.theme) {
    options.theme = demoTheme.value
  }
  if (runtime.ui || viewerDensity.value === 'compact' || !immersiveMode.value) {
    options.ui = {
      ...runtime.ui,
      density: viewerDensity.value,
      ...(!immersiveMode.value
        ? { surfaceBackground: settings.surfaceBackground }
        : {})
    }
  } else {
    delete options.ui
  }

  options.archive = {
    cache: true,
    ...runtime.archive,
    ...(!immersiveMode.value
      ? {
          cache: settings.archiveCache,
          maxArchiveSize: settings.archiveMaxSizeMb * megabyte,
          maxEntryPreviewSize: settings.archiveMaxEntryPreviewMb * megabyte,
          entryActions: {
            ...runtime.archive?.entryActions,
            download: settings.archiveEntryDownload
          }
        }
      : {})
  }
  options.spreadsheet = {
    worker: 'auto',
    resizableColumns: true,
    resizableRows: true,
    ...runtime.spreadsheet,
    ...(!immersiveMode.value
      ? {
          resizableColumns: settings.spreadsheetResizableColumns,
          resizableRows: settings.spreadsheetResizableRows,
          textEncoding: settings.spreadsheetTextEncoding,
          workerAutoThreshold: settings.spreadsheetWorkerThresholdMb * megabyte
        }
      : {})
  }
  options.presentation = {
    pptModuleUrl: 'vendor/ppt/index.mjs',
    pptWorkerUrl: 'vendor/ppt/worker.mjs',
    pptWasmUrl: 'vendor/ppt/ppt-native.wasm',
    pptFontUrl: 'vendor/ppt/ppt-font-cjk.otf',
    ...runtime.presentation
  }
  if (!immersiveMode.value) {
    options.pdf = {
      ...runtime.pdf,
      toolbar: settings.pdfToolbar,
      navigation: settings.pdfNavigation,
      defaultNavigationVisible: settings.pdfDefaultNavigationVisible,
      thumbnails: settings.pdfThumbnails,
      rotation: settings.pdfRotation,
      streaming: settings.pdfStreaming,
      cjkFontFallback: settings.pdfCjkFontFallback,
      identityFontRepair: settings.pdfIdentityFontRepair
    }
    options.docx = {
      ...runtime.docx,
      progressive: settings.docxProgressive,
      visualPagination: settings.docxVisualPagination,
      strictWordCompatibility: settings.docxStrictWordCompatibility,
      awaitLayout: settings.docxAwaitLayout,
      hideWebHiddenContent: settings.docxHideWebHiddenContent,
      ignoreLastRenderedPageBreak: settings.docxIgnoreLastRenderedPageBreak
    }
    options.text = {
      ...runtime.text,
      toolbar: settings.textToolbar,
      lineNumbers: settings.textLineNumbers,
      virtualizeAboveBytes: settings.textVirtualizeAboveKb * 1024,
      markdownVirtualizeAboveBytes: settings.textMarkdownVirtualizeAboveKb > 0
        ? settings.textMarkdownVirtualizeAboveKb * 1024
        : undefined,
      maxRenderedLineBytes: settings.textMaxRenderedLineKb * 1024,
      virtualOverscanLines: settings.textVirtualOverscanLines
    }
    const runtimeSearch = runtime.search && typeof runtime.search === 'object' ? runtime.search : {}
    options.search = {
      ...runtimeSearch,
      enabled: settings.searchEnabled,
      caseSensitive: settings.searchCaseSensitive,
      wholeWord: settings.searchWholeWord,
      maxMatches: settings.searchMaxMatches
    }
    options.cad = {
      ...runtime.cad,
      renderer: settings.cadRenderer,
      fitMode: settings.cadFitMode,
      fitPadding: settings.cadFitPadding,
      includePaperSpace: settings.cadIncludePaperSpace,
      dwfLineWeightMode: settings.cadDwfLineWeightMode
    }
    options.geo = {
      ...runtime.geo,
      basemap: settings.geoBasemap,
      inferProjection: settings.geoInferProjection,
      preferMapEngine: settings.geoPreferMapEngine,
      fitPadding: settings.geoFitPadding
    }
    options.model = createDemoModelOptions(settings, runtime.model)
    options.drawing = {
      ...runtime.drawing,
      preferOfficial: settings.drawingPreferOfficial
    }
  } else {
    options.geo = {
      basemap: 'openfreemap-liberty',
      ...runtime.geo
    }
    options.drawing = { ...runtime.drawing }
  }
  if (fitMode.value !== 'default') {
    options.fit = {
      mode: fitMode.value,
      resize: settings.fitResize,
      padding: settings.fitPadding,
      minScale: settings.fitMinScale,
      maxScale: settings.fitMaxScale
    }
  } else if (!immersiveMode.value) {
    delete options.fit
  }
  options.toolbar = immersiveMode.value ? runtime.toolbar ?? true : false
  options.watermark = !immersiveMode.value && !watermarkEnabled.value
    ? false
    : watermarkEnabled.value
    ? {
        text: settings.watermarkText || 'Flyfish Viewer',
        opacity: settings.watermarkOpacity,
        rotate: settings.watermarkRotate,
        gapX: settings.watermarkGapX,
        gapY: settings.watermarkGapY,
        fontSize: settings.watermarkFontSize,
        color: settings.watermarkColor,
        ...(
          typeof runtime.watermark === 'object' && runtime.watermark
            ? runtime.watermark
            : {}
        )
      }
    : runtime.watermark

  return options
})

const isVisibleControl = (element: HTMLElement | null): element is HTMLElement => (
  Boolean(element && element.getClientRects().length)
)

function focusActionsTrigger() {
  const trigger = isVisibleControl(settingsButtonRef.value)
    ? settingsButtonRef.value
    : mobileMoreButtonRef.value
  trigger?.focus()
}

function focusSourceTrigger(anchor = sourcePanelAnchor.value) {
  const trigger = anchor === 'file'
    ? fileIdentityButtonRef.value
    : anchor === 'upload'
      ? uploadTriggerButtonRef.value
      : anchor === 'samples'
        ? sampleRailButtonRef.value
        : linkTriggerButtonRef.value
  if (isVisibleControl(trigger)) {
    trigger.focus()
  }
}

function focusSourcePanel(mode = desktopSourceMode.value) {
  const selector = mode === 'link'
    ? '#preview-url'
    : mode === 'upload'
      ? '.desktop-upload-dropzone input'
      : '.sample-card.active, .sample-group-header'
  controlPanelRef.value?.querySelector<HTMLElement>(selector)?.focus()
}

function closeDesktopSourcePanel(returnFocus = false) {
  const previousAnchor = sourcePanelAnchor.value
  closeSourcePanel()
  samplePickerOpen.value = false
  if (returnFocus) {
    void nextTick(() => focusSourceTrigger(previousAnchor))
  }
}

function closeSettingsPanel(returnFocus = false) {
  if (!settingsPanelOpen.value) {
    return
  }
  closeViewerSettingsPanel()
  if (returnFocus) {
    void nextTick(focusActionsTrigger)
  }
}

function closeDesktopTransientUi(except?: 'source' | 'settings' | 'search' | 'more') {
  if (except !== 'source') {
    closeDesktopSourcePanel()
  }
  if (except !== 'settings') {
    closeSettingsPanel()
  }
  if (except !== 'more') {
    desktopActionsOpen.value = false
  }
  if (except !== 'search' && viewerSearchOpen.value) {
    void closeViewerSearch()
  }
}

async function toggleSettingsPanel() {
  if (settingsPanelOpen.value) {
    closeSettingsPanel(true)
    return
  }
  closeDesktopTransientUi('settings')
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  recentPanelOpen.value = false
  openViewerSettingsPanel({
    theme: demoTheme.value,
    density: viewerDensity.value,
    fitMode: fitMode.value,
    watermarkEnabled: watermarkEnabled.value
  })
  await nextTick()
  controlPanelRef.value?.querySelector<HTMLElement>('.settings-tabs button')?.focus()
}

async function applySettingsAndRestoreFocus() {
  const result = await applyViewerSettings()
  if (result) {
    await nextTick()
    focusActionsTrigger()
  }
}

let copyResetTimer: number | undefined
const clipboardWriteTimeoutMs = 800

async function openSnippetDialog() {
  closeDesktopTransientUi()
  mobileActionsOpen.value = false
  snippetDialogOpen.value = true
  await nextTick()
  snippetCloseRef.value?.focus()
}

function closeSnippetDialog() {
  if (!snippetDialogOpen.value) {
    return
  }
  snippetDialogOpen.value = false
  void nextTick(focusActionsTrigger)
}

function copyIntegrationSnippetFallback() {
  const textarea = document.createElement('textarea')
  textarea.value = integrationSnippet.value
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) {
    throw new Error('Clipboard copy was rejected')
  }
}

async function writeIntegrationSnippetToClipboard() {
  if (!navigator.clipboard?.writeText) {
    copyIntegrationSnippetFallback()
    return
  }
  let timeoutId: number | undefined
  try {
    await Promise.race([
      navigator.clipboard.writeText(integrationSnippet.value),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error('Clipboard write timed out')), clipboardWriteTimeoutMs)
      })
    ])
  } catch {
    copyIntegrationSnippetFallback()
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

async function copyIntegrationSnippet() {
  snippetCopied.value = true
  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
  }
  copyResetTimer = window.setTimeout(() => {
    snippetCopied.value = false
    copyResetTimer = undefined
  }, 1600)

  try {
    await writeIntegrationSnippetToClipboard()
  } catch {
    snippetCopied.value = false
  }
}

async function toggleDesktopActions() {
  if (!desktopActionsOpen.value) {
    closeDesktopTransientUi('more')
  }
  desktopActionsOpen.value = !desktopActionsOpen.value
  if (!desktopActionsOpen.value) {
    await nextTick()
    focusActionsTrigger()
    return
  }
  await nextTick()
  morePanelRef.value?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
}

function handleMoreMenuKeydown(event: KeyboardEvent) {
  const buttons = Array.from(morePanelRef.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])
  if (!buttons.length) {
    return
  }
  if (event.key === 'Escape') {
    event.preventDefault()
    desktopActionsOpen.value = false
    void nextTick(focusActionsTrigger)
    return
  }
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement)
  let nextIndex: number | null = null
  if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % buttons.length
  if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length
  if (event.key === 'Home') nextIndex = 0
  if (event.key === 'End') nextIndex = buttons.length - 1
  if (nextIndex === null) {
    return
  }
  event.preventDefault()
  buttons[nextIndex]?.focus()
}

async function fitCurrentDocument() {
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
  const providerEpoch = viewerProviderEpoch
  const settings = appliedViewerSettings.value
  const mode = fitMode.value === 'default' ? 'auto' : fitMode.value
  const result = await fileViewerRef.value?.fitToView({
    mode,
    resize: settings.fitResize,
    padding: settings.fitPadding,
    minScale: settings.fitMinScale,
    maxScale: settings.fitMaxScale
  })
  if (providerEpoch !== viewerProviderEpoch) {
    return
  }
  if (result?.applied) {
    viewerZoomState.value = fileViewerRef.value?.getZoomState() || viewerZoomState.value
    viewerAvailability.value = fileViewerRef.value?.getOperationAvailability() || viewerAvailability.value
  }
}

async function printDirect() {
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
  await fileViewerRef.value?.printRenderedHtml()
}

async function printWithMask() {
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
  await fileViewerRef.value?.printWithMask()
}

function triggerViewerAction(action: ViewerAction) {
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
  if (action === 'download') {
    void fileViewerRef.value?.downloadOriginalFile()
    return
  }
  if (action === 'print') {
    void printDirect()
    return
  }
  if (action === 'exportHtml') {
    void fileViewerRef.value?.exportRenderedHtml()
    return
  }
  const nextAction = action === 'zoomIn'
    ? fileViewerRef.value?.zoomIn()
    : action === 'zoomOut'
      ? fileViewerRef.value?.zoomOut()
      : fileViewerRef.value?.resetZoom()
  const providerEpoch = viewerProviderEpoch
  void nextAction?.then(state => {
    if (providerEpoch !== viewerProviderEpoch) {
      return
    }
    viewerZoomState.value = state
    viewerAvailability.value = fileViewerRef.value?.getOperationAvailability() || viewerAvailability.value
  })
}

async function selectFitMode(event: Event) {
  const value = (event.target as HTMLSelectElement).value as FileViewerFitMode | 'default'
  fitMode.value = value
  appliedViewerSettings.value = {
    ...appliedViewerSettings.value,
    fitMode: value
  }
  await nextTick()
  if (value !== 'default') {
    const settings = appliedViewerSettings.value
    const result = await fileViewerRef.value?.fitToView({
      mode: value,
      resize: settings.fitResize,
      padding: settings.fitPadding
    })
    if (result?.applied) {
      viewerZoomState.value = fileViewerRef.value?.getZoomState() || viewerZoomState.value
      viewerAvailability.value = fileViewerRef.value?.getOperationAvailability() || viewerAvailability.value
    }
  }
}

async function runViewerSearch() {
  const query = viewerSearchQuery.value.trim()
  if (!query) {
    viewerSearchState.value = await fileViewerRef.value?.clearDocumentSearch() || viewerSearchState.value
    return
  }
  viewerSearchState.value = await fileViewerRef.value?.searchDocument(query) || viewerSearchState.value
}

async function openViewerSearch() {
  if (!appliedViewerSettings.value.searchEnabled) {
    return
  }
  closeDesktopTransientUi('search')
  mobileActionsOpen.value = false
  if (isMobileDemoViewport()) {
    recentPanelOpen.value = false
  }
  viewerSearchOpen.value = true
  await nextTick()
  viewerSearchInputRef.value?.focus()
  viewerSearchInputRef.value?.select()
}

async function closeViewerSearch() {
  viewerSearchOpen.value = false
  viewerSearchState.value = await fileViewerRef.value?.clearDocumentSearch() || viewerSearchState.value
}

async function openDesktopSourcePanel(
  mode: 'link' | 'upload' | 'samples' = 'link',
  anchor: DemoSourcePanelAnchor = mode
) {
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi('source')
  mobileActionsOpen.value = false
  await openSourcePanel(mode, anchor)

  if (mode === 'samples') {
    samplePickerOpen.value = true
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
    return
  }

  samplePickerOpen.value = false
  await nextTick()
  focusSourcePanel(mode)
}

async function toggleDesktopSourcePanel(
  mode: 'link' | 'upload' | 'samples',
  anchor: DemoSourcePanelAnchor = mode
) {
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi('source')
  mobileActionsOpen.value = false
  const opened = await toggleSourcePanel(mode, anchor)
  samplePickerOpen.value = opened && mode === 'samples'
  if (samplePickerOpen.value) {
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
  } else if (opened) {
    await nextTick()
    focusSourcePanel(mode)
  } else {
    focusSourceTrigger(anchor)
  }
}

function resetViewerSearch() {
  viewerSearchQuery.value = ''
  void closeViewerSearch()
}

async function openMobileControls(
  mode: 'link' | 'upload' | 'samples' = 'link',
  anchor: DemoSourcePanelAnchor = mode
) {
  if (mode === 'upload') {
    recentLocalReselectName.value = ''
  }
  closeDesktopTransientUi()
  desktopSourceMode.value = mode
  sourcePanelAnchor.value = anchor
  sourcePanelStyle.value = {}
  mobileControlsOpen.value = true
  mobileActionsOpen.value = false
  recentPanelOpen.value = false
  if (mode === 'samples') {
    samplePickerOpen.value = true
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
    await nextTick()
    focusSourcePanel(mode)
    return
  }
  samplePickerOpen.value = false
  await nextTick()
  focusSourcePanel(mode)
}

function closeMobileControls() {
  mobileControlsOpen.value = false
  samplePickerOpen.value = false
}

async function toggleMobileActions() {
  mobileActionsOpen.value = !mobileActionsOpen.value
  if (mobileActionsOpen.value) {
    mobileControlsOpen.value = false
    recentPanelOpen.value = false
    await nextTick()
    mobileActionsPanelRef.value?.querySelector<HTMLElement>(
      '.mobile-action-source-grid button:not([disabled]), select'
    )?.focus()
  } else {
    await nextTick()
    mobileMoreButtonRef.value?.focus()
  }
}

async function toggleFileSamples() {
  if (isMobileDemoViewport()) {
    if (mobileControlsOpen.value && desktopSourceMode.value === 'samples') {
      closeMobileControls()
      return
    }
    await openMobileControls('samples', 'file')
    return
  }
  await toggleDesktopSourcePanel('samples', 'file')
}

function toggleWatermark() {
  watermarkEnabled.value = !watermarkEnabled.value
  appliedViewerSettings.value = {
    ...appliedViewerSettings.value,
    watermarkEnabled: watermarkEnabled.value
  }
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
}

async function nextViewerSearch() {
  if (!viewerSearchQuery.value.trim()) {
    return
  }
  if (viewerSearchState.value.query !== viewerSearchQuery.value.trim()) {
    await runViewerSearch()
    return
  }
  viewerSearchState.value = await fileViewerRef.value?.nextSearchResult() || viewerSearchState.value
}

async function previousViewerSearch() {
  if (!viewerSearchQuery.value.trim()) {
    return
  }
  if (viewerSearchState.value.query !== viewerSearchQuery.value.trim()) {
    await runViewerSearch()
    return
  }
  viewerSearchState.value = await fileViewerRef.value?.previousSearchResult() || viewerSearchState.value
}

function handleViewerAvailabilityChange(availability: FileViewerOperationAvailability) {
  viewerAvailability.value = availability
  viewerZoomState.value = fileViewerRef.value?.getZoomState() || viewerZoomState.value
}

function handleViewerLoadStart() {
  viewerProviderEpoch += 1
  viewerAvailability.value = createEmptyViewerAvailability()
  viewerZoomState.value = createEmptyViewerZoomState()
  viewerViewState.value = {}
}

function handleViewerSearchChange(state: FileViewerSearchState) {
  viewerSearchState.value = state
}

function handleViewerZoomChange(state: FileViewerZoomState) {
  viewerZoomState.value = state
}

function handleViewerViewStateChange(change: FileViewerViewStateChange) {
  viewerViewState.value = change.state
}

const stopDemoFileHandoff = demoFileHandoff.listen((body, target, options) => {
  immersiveMode.value = true
  runtimeOptions.value = options || {}
  samplePickerOpen.value = false
  settingsPanelOpen.value = false
  if (body || target) {
    clearPendingViewState()
  }
  if (body) {
    filename.value = fileNameOf(body.name) || body.name || ''
    file.value = body
  }
  if (target) {
    const normalizedTarget = normalizeDemoUrl(target)
    url.value = normalizedTarget
    preview.value = normalizedTarget
  }
})

function syncDemoDocumentChrome(nextLocale = demoLocale.value) {
  document.documentElement.lang = nextLocale
  document.documentElement.dataset.demoTheme = resolvedDemoTheme.value
  document.title = getDemoCopy(nextLocale).pageTitle
}

onMounted(() => {
  syncDemoDocumentChrome()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', handleWindowResize)
  systemThemeQuery?.addEventListener?.('change', handleSystemThemeChange)
  desktopFileCapsuleMotionQuery?.addEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  reducedFileCapsuleMotionQuery?.addEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  if (url.value || !immersiveMode.value) {
    openUrlPreview(url.value)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', handleWindowResize)
  systemThemeQuery?.removeEventListener?.('change', handleSystemThemeChange)
  desktopFileCapsuleMotionQuery?.removeEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  reducedFileCapsuleMotionQuery?.removeEventListener?.('change', handleFileCapsuleMotionPreferenceChange)
  stopDemoFileHandoff()
  if (copyResetTimer) {
    window.clearTimeout(copyResetTimer)
  }
  recentLocalFiles.clear()
})

type DemoRemoteRecentSource = 'auto' | 'url' | 'sample'

function rememberRemotePreview(normalizedUrl: string, source: DemoRemoteRecentSource) {
  if (immersiveMode.value || !normalizedUrl) {
    return
  }
  const matchedSample = allPresetFiles.find(item => isSameSampleUrl(item.url, normalizedUrl))
  const input = {
    name: fileNameOf(normalizedUrl) || normalizedUrl,
    url: normalizedUrl,
    type: extensionOf(normalizedUrl),
    iconTarget: normalizedUrl
  }
  if (source === 'sample' || (source === 'auto' && matchedSample)) {
    rememberSample(input)
    return
  }
  rememberUrl(input)
}

function openUrlPreview(nextUrl = url.value, recentSource: DemoRemoteRecentSource = 'auto') {
  const normalizedUrl = normalizeDemoUrl(nextUrl)
  clearPendingViewState()
  file.value = undefined
  recentLocalReselectName.value = ''
  resetViewerSearch()
  url.value = normalizedUrl
  preview.value = normalizedUrl
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  rememberRemotePreview(normalizedUrl, recentSource)
}

function setDemoLocale(nextLocale: DemoLocale) {
  if (demoLocale.value === nextLocale) {
    return
  }
  const previousDefaultUrl = DEFAULT_DEMO_URL_BY_LOCALE[demoLocale.value]
  demoLocale.value = nextLocale
  writeDemoStorage(DEMO_LOCALE_STORAGE_KEY, nextLocale)
  syncDemoDocumentChrome(nextLocale)
  if (!file.value && isSameSampleUrl(url.value || preview.value, previousDefaultUrl)) {
    const nextDefaultUrl = DEFAULT_DEMO_URL_BY_LOCALE[nextLocale]
    url.value = nextDefaultUrl
    openUrlPreview(nextDefaultUrl)
  }
}

function handleSystemThemeChange(event: MediaQueryListEvent) {
  systemPrefersDark.value = event.matches
  if (demoTheme.value === 'system') {
    syncDemoDocumentChrome()
  }
}

function handleFileCapsuleMotionPreferenceChange() {
  resetFileCapsuleMotion()
}

function toggleDemoTheme() {
  const nextTheme = toggleFileViewerColorScheme(demoTheme.value, systemPrefersDark.value)
  demoTheme.value = nextTheme
  appliedViewerSettings.value = {
    ...appliedViewerSettings.value,
    theme: nextTheme
  }
  writeDemoStorage(DEMO_THEME_STORAGE_KEY, nextTheme)
  syncDemoDocumentChrome()
}

function activateLocalFile(value: File) {
  clearPendingViewState()
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  recentLocalReselectName.value = ''
  resetViewerSearch()
  filename.value = fileNameOf(value.name) || value.name
  file.value = value
  const recent = rememberLocalFile(value, { iconTarget: value.name })
  if (recent) {
    recentLocalFiles.set(recent.id, value)
  }
  pruneRecentLocalFiles()
}

function pruneRecentLocalFiles() {
  const retainedIds = new Set(recentFiles.value.filter(entry => entry.source === 'local').map(entry => entry.id))
  for (const id of recentLocalFiles.keys()) {
    if (!retainedIds.has(id)) {
      recentLocalFiles.delete(id)
    }
  }
}

async function handleChange(e: Event) {
  const target = e.target as HTMLInputElement
  const value = target.files?.item(0)
  if (!value) {
    return
  }
  activateLocalFile(value)
  target.value = ''
}

async function openRecentFile(entry: DemoRecentFile) {
  if (entry.source !== 'local') {
    if (entry.url) {
      openUrlPreview(entry.url, entry.source)
    }
    return
  }

  const runtimeFile = recentLocalFiles.get(entry.id)
  if (runtimeFile) {
    activateLocalFile(runtimeFile)
    return
  }

  recentPanelOpen.value = false
  if (isMobileDemoViewport()) {
    await openMobileControls('upload')
  } else {
    await openDesktopSourcePanel('upload', 'upload')
  }
  recentLocalReselectName.value = entry.name
}

function dismissRecentFileEntry(id: string) {
  dismissRecentFile(id)
  pruneRecentLocalFiles()
}

async function toggleSamplePicker() {
  samplePickerOpen.value = !samplePickerOpen.value
  if (samplePickerOpen.value) {
    expandedSampleGroupIndex.value = activeSampleGroupIndex.value >= 0 ? activeSampleGroupIndex.value : 0
  }
}

function toggleSampleGroup(index: number) {
  expandedSampleGroupIndex.value = expandedSampleGroupIndex.value === index ? null : index
}

function selectPreset(nextUrl: string) {
  const normalizedUrl = normalizeDemoUrl(nextUrl)
  const nextGroupIndex = sampleGroups.value.findIndex(group => group.items.some(item => isSameSampleUrl(item.url, normalizedUrl)))
  url.value = normalizedUrl
  expandedSampleGroupIndex.value = nextGroupIndex >= 0 ? nextGroupIndex : expandedSampleGroupIndex.value
  samplePickerOpen.value = false
  desktopSourcePanelOpen.value = false
  mobileControlsOpen.value = false
  mobileActionsOpen.value = false
  openUrlPreview(normalizedUrl, 'sample')
}

function isActivePreset(item: PresetFile) {
  return !file.value && isSameSampleUrl(url.value, item.url)
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (
    !samplePickerOpen.value &&
    !desktopSourcePanelOpen.value &&
    !settingsPanelOpen.value &&
    !desktopActionsOpen.value &&
    !viewerSearchOpen.value &&
    !mobileActionsOpen.value
  ) {
    return
  }
  const target = event.target
  if (
    target instanceof Element &&
    target.closest('.viewer-file-identity, .immersive-more-menu, .viewer-search-popover, .mobile-action-dock')
  ) {
    return
  }
  if (
    target instanceof Node &&
    controlPanelRef.value?.contains(target)
  ) {
    return
  }
  if (target instanceof Node && samplePickerRef.value?.contains(target)) {
    return
  }
  closeDesktopSourcePanel()
  closeSettingsPanel()
  desktopActionsOpen.value = false
  mobileActionsOpen.value = false
  if (viewerSearchOpen.value) {
    void closeViewerSearch()
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (snippetDialogOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeSnippetDialog()
      return
    }
    if (event.key === 'Tab') {
      const focusable = Array.from(snippetDialogRef.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') || [])
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault()
        first.focus()
      }
    }
    return
  }
  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'f') {
    event.preventDefault()
    event.stopPropagation()
    if (viewerSearchOpen.value) {
      void closeViewerSearch()
      return
    }
    void openViewerSearch()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    if (settingsPanelOpen.value) {
      closeSettingsPanel(true)
      return
    }
    if (desktopActionsOpen.value) {
      desktopActionsOpen.value = false
      void nextTick(focusActionsTrigger)
      return
    }
    if (desktopSourcePanelOpen.value) {
      closeDesktopSourcePanel(true)
      return
    }
    if (mobileControlsOpen.value) {
      closeMobileControls()
      return
    }
    if (mobileActionsOpen.value) {
      mobileActionsOpen.value = false
      void nextTick(focusActionsTrigger)
      return
    }
    if (viewerSearchOpen.value) {
      void closeViewerSearch()
    }
  }
}

function handleWindowResize() {
  const mobile = isMobileDemoViewport()
  resetFileCapsuleMotion()
  if (mobile !== wasMobileViewport.value) {
    const sourceMode = desktopSourceMode.value
    const sourceAnchor = sourcePanelAnchor.value
    if (mobile && desktopSourcePanelOpen.value) {
      closeDesktopSourcePanel()
      void openMobileControls(sourceMode, sourceAnchor)
    } else if (!mobile && mobileControlsOpen.value) {
      closeMobileControls()
      void openDesktopSourcePanel(sourceMode, sourceAnchor)
    }
    if (mobile) {
      recentPanelOpen.value = false
    }
    wasMobileViewport.value = mobile
  }
  if (desktopSourcePanelOpen.value) {
    void updateDesktopSourcePanelPosition()
  }
}

</script>

<template>
  <div
    class='demo-shell'
    :data-demo-density='viewerDensity'
    :data-demo-theme='resolvedDemoTheme'
    :data-demo-mode='immersiveMode ? "immersive" : "product"'
    :data-file-family='currentIconMeta.family'
    :data-file-capsule-state='fileCapsuleState'
    :class="{
      hidden: immersiveMode,
      'mobile-controls-open': mobileControlsOpen,
      'mobile-actions-open': mobileActionsOpen,
      'sample-picker-open': samplePickerOpen
    }"
  >
    <main class='workspace'>
      <div v-if='!immersiveMode' class='layout-shell'>
        <div class='top-capsule-cluster'>
          <nav
            ref='topCapsuleNavigationRef'
            class='rail-navigation'
            :aria-label='demoCopy.previewActions'
            @pointerenter='handleFileCapsulePointerEnter'
            @pointerleave='handleFileCapsulePointerLeave'
            @focusin='handleFileCapsuleFocusIn'
            @focusout='handleFileCapsuleFocusOut'
          >
            <button
              ref='linkTriggerButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--link'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "link" }'
              :aria-label='demoCopy.openFromLink'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "link"'
              @click='toggleDesktopSourcePanel("link")'
            >
              <Link2 :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.pasteLink }}</span>
            </button>
            <button
              ref='uploadTriggerButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--upload'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "upload" }'
              :aria-hidden='fileCapsuleMerged || fileCapsuleActionLocked ? "true" : undefined'
              :aria-label='demoCopy.openFromDevice'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "upload"'
              :tabindex='fileCapsuleMerged || fileCapsuleActionLocked ? -1 : undefined'
              @click='toggleDesktopSourcePanel("upload")'
            >
              <FolderOpen :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.openFile }}</span>
            </button>
            <button
              ref='sampleRailButtonRef'
              type='button'
              class='rail-nav-button rail-nav-button--samples'
              :class='{ active: desktopSourcePanelOpen && desktopSourceMode === "samples" }'
              :aria-label='demoCopy.openSamples'
              :aria-pressed='desktopSourcePanelOpen && desktopSourceMode === "samples"'
              @click='toggleDesktopSourcePanel("samples", "samples")'
            >
              <Sparkles :size='21' :stroke-width='2.15' />
              <span>{{ demoCopy.samples }}</span>
            </button>
          </nav>

          <div
            class='viewer-toolbar'
            :style='fileCapsuleMotionStyle'
          >
            <div
              class='viewer-file-identity'
              @pointerenter='handleFileCapsulePointerEnter'
              @pointerleave='handleFileCapsulePointerLeave'
              @focusin='handleFileCapsuleFocusIn'
              @focusout='handleFileCapsuleFocusOut'
            >
              <button
                ref='fileIdentityButtonRef'
                type='button'
                class='viewer-copy'
                :class='{ active: fileSamplesOpen }'
                aria-haspopup='dialog'
                :aria-expanded='fileSamplesOpen'
                :aria-label='fileIdentityAriaLabel'
                :tabindex='fileCapsuleActionLocked ? -1 : undefined'
                @click='toggleFileSamples'
              >
                <DemoFileTypeIcon class='viewer-current-file-icon' :meta='currentIconMeta' :size='32' />
                <span class='viewer-file-copy'>
                  <strong :title='displayName'>{{ displayName }}</strong>
                </span>
                <span class='viewer-type'>{{ previewType }}</span>
                <ChevronUp
                  v-if='fileSamplesOpen'
                  class='viewer-file-chevron'
                  :size='17'
                  :stroke-width='2.25'
                  aria-hidden='true'
                />
                <ChevronDown v-else class='viewer-file-chevron' :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
            </div>
            <div class='viewer-path'>{{ displayPath }}</div>
          </div>
          </div>

        <aside
          ref='controlPanelRef'
          class='control-panel'
          :class='{ "desktop-source-open": desktopSourcePanelOpen, "settings-open": settingsPanelOpen }'
          :data-source-mode='desktopSourceMode'
        >
          <header class='rail-brand'>
            <span class='brand-mark'>
              <img :src='brandLogo' alt='' />
            </span>
            <h1>File Viewer</h1>
          </header>

          <button type='button' class='mobile-sheet-close' :aria-label='demoCopy.closePanel' @click='closeMobileControls'>
            <X :size='18' :stroke-width='2.5' />
          </button>

          <div
            v-if='desktopSourcePanelOpen || mobileControlsOpen'
            class='panel-body'
            role='dialog'
            :aria-label='desktopSourcePanelTitle'
            :data-source-anchor='sourcePanelAnchor'
            :style='sourcePanelStyle'
          >
            <header class='source-panel-header'>
              <span>
                <strong>{{ desktopSourcePanelTitle }}</strong>
                <small v-if='desktopSourceMode !== "samples"'>{{ desktopSourcePanelHint }}</small>
              </span>
              <button
                type='button'
                :aria-label='demoCopy.closePanel'
                @click='mobileControlsOpen ? closeMobileControls() : closeDesktopSourcePanel(true)'
              >
                <X :size='17' :stroke-width='2.4' />
              </button>
            </header>

            <template v-if='desktopSourceMode === "link"'>
              <section class='source-command source-command--focused'>
                <label class='field-label' for='preview-url'>{{ demoCopy.address }}</label>
                <div class='source-command-row'>
                  <input
                    id='preview-url'
                    v-model='url'
                    class='compact-field'
                    type='url'
                    inputmode='url'
                    autocomplete='url'
                    :placeholder='demoCopy.addressPlaceholder'
                    @keyup.enter='openUrlPreview()'
                  />
                  <button type='button' class='primary-button' @click='openUrlPreview()'>
                    {{ demoCopy.preview }}
                  </button>
                </div>
              </section>
              <div class='source-context-row'>
                <Link2 :size='17' :stroke-width='2.2' />
                <span>
                  <small>{{ demoCopy.filePath }}</small>
                  <strong>{{ displayPath }}</strong>
                </span>
              </div>
            </template>

            <template v-else-if='desktopSourceMode === "upload"'>
              <label class='desktop-upload-dropzone'>
                <input type='file' :accept='uploadAccept' @change='handleChange' />
                <span class='desktop-upload-icon'>
                  <Upload :size='23' :stroke-width='2.1' />
                </span>
                <strong>{{ demoCopy.chooseFile }}</strong>
                <small role='status'>{{ recentLocalReselectNotice || demoCopy.uploadPanelHint }}</small>
                <em>{{ filename || demoCopy.openLocal }}</em>
              </label>
            </template>

            <template v-else>
              <div ref='samplePickerRef' class='sample-picker' :class='{ open: samplePickerOpen }'>
                <button
                  type='button'
                  class='sample-trigger'
                  aria-controls='sample-menu'
                  :aria-expanded="samplePickerOpen ? 'true' : 'false'"
                  @click='toggleSamplePicker'
                >
                  <DemoFileTypeIcon :meta='activeIconMeta' :size='44' />
                  <span class='sample-trigger-copy'>
                    <span>{{ demoCopy.sampleFile }}</span>
                    <strong>{{ activePreset?.name || fileNameOf(url) }}</strong>
                    <em>{{ activePreset ? fileNameOf(activePreset.url) : url }}</em>
                  </span>
                  <span class='sample-trigger-action'>{{ samplePickerOpen ? demoCopy.collapse : demoCopy.open }}</span>
                </button>

                <div
                  v-if='samplePickerOpen'
                  id='sample-menu'
                  class='sample-menu'
                >
                  <section
                    v-for='(group, groupIndex) in sampleGroups'
                    :key='group.title'
                    class='sample-group'
                    :class="{ 'sample-group--open': expandedSampleGroupIndex === groupIndex }"
                    :data-family='group.family'
                  >
                    <button
                      type='button'
                      class='sample-group-header'
                      :aria-expanded="expandedSampleGroupIndex === groupIndex ? 'true' : 'false'"
                      :aria-controls='`sample-group-panel-${groupIndex}`'
                      @click='toggleSampleGroup(groupIndex)'
                    >
                      <span class='sample-group-title'>{{ group.title }}</span>
                      <em>{{ group.description }}</em>
                      <strong>{{ group.items.length }}</strong>
                      <i aria-hidden='true' />
                    </button>
                    <div
                      v-if='expandedSampleGroupIndex === groupIndex'
                      :id='`sample-group-panel-${groupIndex}`'
                      class='sample-group-grid'
                    >
                      <button
                        v-for='item in group.items'
                        :key='item.url'
                        type='button'
                        class='sample-card'
                        :class='{ active: isActivePreset(item) }'
                        @click='selectPreset(item.url)'
                      >
                        <DemoFileTypeIcon :meta='getFileIconMeta(item.url)' :size='36' />
                        <span class='sample-card-copy'>
                          <strong>{{ item.name }}</strong>
                          <span>{{ fileNameOf(item.url) }}</span>
                        </span>
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            </template>
          </div>

          <DemoViewerSettingsPanel
            v-if='settingsPanelOpen'
            v-model:settings='settingsDraft'
            v-model:active-tab='settingsActiveTab'
            v-model:format-section='settingsFormatSection'
            :copy='demoCopy'
            :preview-type='previewType'
            :current-format-section='currentSettingsFormatSection'
            :fit-mode-options='fitModeOptions'
            :applying='settingsApplying'
            :error='settingsApplyError'
            @close='closeSettingsPanel(true)'
            @reset='resetSettingsDraft()'
            @apply='applySettingsAndRestoreFocus'
          />
        </aside>

        <section class='viewer-panel'>
          <div class='viewer-global-actions'>
            <a
              class='viewer-github-link'
              :href='githubRepositoryUrl'
              target='_blank'
              rel='noreferrer'
              :aria-label='githubRepositoryAriaLabel'
            >
              <img :src='githubMark' alt='' />
            </a>
            <div class='locale-switch viewer-locale-switch' :aria-label='demoCopy.language'>
                <button
                  type='button'
                  :class='{ active: demoLocale === "zh-CN" }'
                  @click='setDemoLocale("zh-CN")'
                >
                  中
                </button>
                <button
                  type='button'
                  :class='{ active: demoLocale === "en-US" }'
                  @click='setDemoLocale("en-US")'
                >
                  EN
                </button>
              </div>
          </div>

          <nav class='immersive-right-toolbar' :aria-label='demoCopy.previewActions'>
            <button
              v-if='appliedViewerSettings.toolbarSearch && appliedViewerSettings.searchEnabled'
              type='button'
              :class='{ active: viewerSearchOpen }'
              :data-tooltip='demoCopy.search'
              :aria-label='demoCopy.searchDocument'
              @click='openViewerSearch'
            >
              <Search :size='21' :stroke-width='2.1' />
            </button>
            <button
              type='button'
              :data-tooltip='demoCopy.theme'
              :aria-label='demoThemeButtonTitle'
              :aria-pressed='resolvedDemoTheme === "dark"'
              @click='toggleDemoTheme'
            >
              <Sun v-if='resolvedDemoTheme === "dark"' :size='21' :stroke-width='2.05' />
              <Moon v-else :size='21' :stroke-width='2.05' />
            </button>
            <button
              v-if='visibleExternalToolbar.download'
              type='button'
              :disabled='viewerActionDisabled || !viewerAvailability.download'
              :data-tooltip='demoCopy.download'
              :aria-label='demoCopy.downloadTitle'
              @click='triggerViewerAction("download")'
            >
              <Download :size='21' :stroke-width='2.05' />
            </button>
            <div class='immersive-more-menu' :data-open='desktopActionsOpen ? "true" : "false"'>
              <button
                ref='settingsButtonRef'
                type='button'
                data-viewer-action='more'
                :class='{ active: desktopActionsOpen }'
                :data-tooltip='demoCopy.more'
                :aria-label='demoCopy.openMoreActions'
                aria-haspopup='menu'
                :aria-expanded='desktopActionsOpen'
                @click='toggleDesktopActions'
              >
                <MoreHorizontal :size='22' :stroke-width='2.15' />
              </button>
              <div
                v-if='desktopActionsOpen'
                ref='morePanelRef'
                class='immersive-more-panel'
                role='menu'
                @keydown='handleMoreMenuKeydown'
              >
                <button v-if='visibleExternalToolbar.print' type='button' role='menuitem' :disabled='!viewerAvailability.print' @click='printDirect'>
                  <Printer :size='17' /><span>{{ demoCopy.printDirect }}</span>
                </button>
                <button v-if='visibleExternalToolbar.print' type='button' role='menuitem' :disabled='!viewerAvailability.print' @click='printWithMask'>
                  <Stamp :size='17' /><span>{{ demoCopy.printMask }}</span>
                </button>
                <button v-if='visibleExternalToolbar.exportHtml' type='button' role='menuitem' :disabled='!viewerAvailability.exportHtml' @click='triggerViewerAction("exportHtml")'>
                  <Code2 :size='17' /><span>{{ demoCopy.exportHtml }}</span>
                </button>
                <button type='button' role='menuitem' :class='{ active: watermarkEnabled }' @click='toggleWatermark'>
                  <Stamp :size='17' /><span>{{ demoCopy.watermark }}</span>
                </button>
                <button type='button' role='menuitem' :disabled='!viewerAvailability.zoomReset' @click='triggerViewerAction("resetZoom")'>
                  <RotateCcw :size='17' /><span>{{ demoCopy.resetZoom }}</span>
                </button>
                <button type='button' role='menuitem' @click='openSnippetDialog'>
                  <Code2 :size='17' /><span>{{ demoCopy.integration }}</span>
                </button>
                <button type='button' role='menuitem' data-viewer-action='settings' @click='toggleSettingsPanel'>
                  <Settings2 :size='17' /><span>{{ demoCopy.settings }}</span>
                </button>
              </div>
            </div>
          </nav>

          <Transition name='settings-notice'>
            <div v-if='settingsNoticeVisible' class='settings-notice' role='status'>
              <Check :size='16' :stroke-width='2.5' />
              <span>{{ demoCopy.settingsApplied }}</span>
            </div>
          </Transition>

          <div v-if='viewerSearchOpen' class='viewer-search-popover' role='search' :aria-label='demoCopy.searchDocument'>
            <input
              ref='viewerSearchInputRef'
              v-model.trim='viewerSearchQuery'
              type='search'
              :placeholder='demoCopy.searchPlaceholder'
              @keyup.enter='runViewerSearch'
            />
            <span class='viewer-search-summary'>{{ viewerSearchSummary }}</span>
            <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.previousResult' :aria-label='demoCopy.previousResult' @click='previousViewerSearch'>
              <ChevronUp class='viewer-search-icon' aria-hidden='true' />
            </button>
            <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.nextResult' :aria-label='demoCopy.nextResult' @click='nextViewerSearch'>
              <ChevronDown class='viewer-search-icon' aria-hidden='true' />
            </button>
            <button type='button' class='viewer-search-close' :title='demoCopy.closeSearch' @click='closeViewerSearch'>
              <X class='viewer-search-icon' aria-hidden='true' />
            </button>
          </div>

          <div class='viewport'>
            <file-viewer
              :key='viewerRevision'
              ref='fileViewerRef'
              :file='file'
              :url='preview'
              :options='viewerOptions'
              @load-start='handleViewerLoadStart'
              @operation-availability-change='handleViewerAvailabilityChange'
              @load-complete='handleViewerLoadComplete'
              @search-change='handleViewerSearchChange'
              @view-state-change='handleViewerViewStateChange'
              @zoom-change='handleViewerZoomChange'
            />
          </div>
          <div class='viewer-status-dock' :aria-label='demoCopy.previewActions'>
            <span class='viewer-status-context'>{{ viewerPageLabel }}</span>
            <i v-if='visibleExternalToolbar.zoom' class='viewer-status-divider' aria-hidden='true' />
            <div
              v-if='visibleExternalToolbar.zoom'
              class='viewer-zoom-controls'
              role='group'
              :aria-label='demoCopy.zoomControls'
            >
              <button
                type='button'
                class='viewer-zoom-button'
                data-demo-zoom-action='out'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomOut'
                :title='demoCopy.zoomOut'
                :aria-label='demoCopy.zoomOut'
                @click='triggerViewerAction("zoomOut")'
              >
                <ZoomOut :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
              <button
                type='button'
                class='viewer-zoom-meter'
                data-demo-zoom-action='reset'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomReset'
                :title='viewerZoomResetLabel'
                :aria-label='viewerZoomResetLabel'
                @click='triggerViewerAction("resetZoom")'
              >
                <span aria-live='polite' aria-atomic='true'>{{ viewerZoomDisplayLabel }}</span>
              </button>
              <button
                type='button'
                class='viewer-zoom-button'
                data-demo-zoom-action='in'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomIn'
                :title='demoCopy.zoomIn'
                :aria-label='demoCopy.zoomIn'
                @click='triggerViewerAction("zoomIn")'
              >
                <ZoomIn :size='17' :stroke-width='2.25' aria-hidden='true' />
              </button>
              <button
                type='button'
                class='viewer-zoom-button viewer-zoom-fit'
                data-demo-zoom-action='fit'
                :disabled='viewerActionDisabled || !viewerAvailability.zoom'
                :title='demoCopy.fitMode'
                :aria-label='demoCopy.fitMode'
                @click='fitCurrentDocument'
              >
                <Scan :size='17' :stroke-width='2.2' aria-hidden='true' />
              </button>
            </div>
          </div>
        </section>

        <DemoRecentFiles
          v-if='recentPanelOpen && recentDisplayEntries.length'
          :entries='recentDisplayEntries'
          :copy='recentFilesCopy'
          @open='openRecentFile'
          @dismiss='dismissRecentFileEntry'
          @close='recentPanelOpen = false'
        />
        <button
          v-else-if='hasRecentFiles'
          type='button'
          class='recent-history-fab'
          :title='demoCopy.showRecent'
          :aria-label='demoCopy.showRecent'
          @click='recentPanelOpen = true'
        >
          <History :size='20' :stroke-width='2.15' aria-hidden='true' />
        </button>

        <button
          v-if='mobileControlsOpen'
          type='button'
          class='mobile-control-backdrop'
          :aria-label='demoCopy.closeMobileControls'
          @click='closeMobileControls'
        />

        <nav class='mobile-action-dock' :aria-label='demoCopy.previewActions'>
          <div
            v-if='mobileActionsOpen'
            ref='mobileActionsPanelRef'
            class='mobile-action-panel'
            role='dialog'
            :aria-label='demoCopy.openMoreActions'
          >
            <header class='mobile-action-header'>
              <span>
                <MoreHorizontal :size='19' :stroke-width='2.5' aria-hidden='true' />
                <strong>{{ demoCopy.more }}</strong>
                <small>{{ demoCopy.previewActions }}</small>
              </span>
              <button type='button' :aria-label='demoCopy.closeMobileControls' @click='toggleMobileActions'>
                <X :size='17' :stroke-width='2.5' aria-hidden='true' />
              </button>
            </header>

            <div class='mobile-action-source-grid'>
              <button type='button' :aria-label='demoCopy.openLinkSettings' @click='openMobileControls("link")'>
                <Link2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.link }}</span>
              </button>
              <button type='button' :aria-label='demoCopy.uploadLocalFile' @click='openMobileControls("upload")'>
                <Upload :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.upload }}</span>
              </button>
              <button type='button' :aria-label='demoCopy.openSamples' @click='openMobileControls("samples", "samples")'>
                <FileSearch :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.samples }}</span>
              </button>
              <button
                v-if='appliedViewerSettings.toolbarSearch && appliedViewerSettings.searchEnabled'
                type='button'
                :aria-label='demoCopy.searchCurrentDocument'
                @click='openViewerSearch'
              >
                <Search :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.search }}</span>
              </button>
            </div>

            <label class='mobile-fit-control'>
              <span>{{ demoCopy.fitMode }}</span>
              <select :value='fitMode' :aria-label='demoCopy.fitMode' @change='selectFitMode'>
                <option
                  v-for='option in fitModeOptions'
                  :key='option.value'
                  :value='option.value'
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <div class='mobile-action-tool-grid'>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomOut'
                :aria-label='demoCopy.zoomOut'
                @click='triggerViewerAction("zoomOut")'
              >
                <ZoomOut :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.zoomOut }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomReset'
                :title='viewerZoomResetLabel'
                :aria-label='viewerZoomResetLabel'
                @click='triggerViewerAction("resetZoom")'
              >
                <RotateCcw :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ viewerZoomDisplayLabel }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoomIn'
                :aria-label='demoCopy.zoomIn'
                @click='triggerViewerAction("zoomIn")'
              >
                <ZoomIn :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.zoomIn }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.zoom'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.zoom'
                :aria-label='demoCopy.fitMode'
                @click='fitCurrentDocument'
              >
                <Scan :size='18' :stroke-width='2.2' aria-hidden='true' />
                <span>{{ demoCopy.fitMode }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.download'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.download'
                @click='triggerViewerAction("download")'
              >
                <Download :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.download }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.print'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.print'
                @click='printDirect'
              >
                <Printer :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.printDirect }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.print'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.print'
                @click='printWithMask'
              >
                <Stamp :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.printMask }}</span>
              </button>
              <button
                v-if='visibleExternalToolbar.exportHtml'
                type='button'
                :disabled='viewerActionDisabled || !viewerAvailability.exportHtml'
                @click='triggerViewerAction("exportHtml")'
              >
                <Code2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>HTML</span>
              </button>
              <button type='button' :class='{ active: watermarkEnabled }' @click='toggleWatermark'>
                <Stamp :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.watermark }}</span>
              </button>
            </div>

            <footer class='mobile-action-settings-grid'>
              <button type='button' @click='toggleDemoTheme'>
                <Sun v-if='resolvedDemoTheme === "dark"' :size='18' :stroke-width='2.25' aria-hidden='true' />
                <Moon v-else :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.theme }}</span>
              </button>
              <button type='button' @click='openSnippetDialog'>
                <Code2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.integration }}</span>
              </button>
              <button type='button' @click='toggleSettingsPanel'>
                <Settings2 :size='18' :stroke-width='2.25' aria-hidden='true' />
                <span>{{ demoCopy.fullSettings }}</span>
              </button>
            </footer>
          </div>

          <button
            ref='mobileMoreButtonRef'
            type='button'
            class='mobile-more-trigger'
            :class='{ active: mobileActionsOpen }'
            :aria-label='mobileActionsOpen ? demoCopy.closeMobileControls : demoCopy.openMoreActions'
            aria-haspopup='dialog'
            :aria-expanded="mobileActionsOpen ? 'true' : 'false'"
            @click='toggleMobileActions'
          >
            <X v-if='mobileActionsOpen' :size='20' :stroke-width='2.6' aria-hidden='true' />
            <MoreHorizontal v-else :size='21' :stroke-width='2.6' aria-hidden='true' />
            <span>{{ demoCopy.more }}</span>
          </button>
        </nav>
      </div>

      <section v-else class='viewer-panel standalone'>
        <div v-if='viewerSearchOpen' class='viewer-search-popover viewer-search-popover--standalone' role='search' :aria-label='demoCopy.searchDocument'>
          <input
            ref='viewerSearchInputRef'
            v-model.trim='viewerSearchQuery'
            type='search'
            :placeholder='demoCopy.searchPlaceholder'
            @keyup.enter='runViewerSearch'
          />
          <span class='viewer-search-summary'>{{ viewerSearchSummary }}</span>
          <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.previousResult' :aria-label='demoCopy.previousResult' @click='previousViewerSearch'>
            <ChevronUp class='viewer-search-icon' aria-hidden='true' />
          </button>
          <button type='button' :disabled='viewerSearchState.total === 0' :title='demoCopy.nextResult' :aria-label='demoCopy.nextResult' @click='nextViewerSearch'>
            <ChevronDown class='viewer-search-icon' aria-hidden='true' />
          </button>
          <button type='button' class='viewer-search-close' :title='demoCopy.closeSearch' @click='closeViewerSearch'>
            <X class='viewer-search-icon' aria-hidden='true' />
          </button>
        </div>
        <div class='viewport'>
          <file-viewer
            :key='viewerRevision'
            ref='fileViewerRef'
            :file='file'
            :url='preview'
            :options='viewerOptions'
            @load-start='handleViewerLoadStart'
            @operation-availability-change='handleViewerAvailabilityChange'
            @load-complete='handleViewerLoadComplete'
            @search-change='handleViewerSearchChange'
            @view-state-change='handleViewerViewStateChange'
            @zoom-change='handleViewerZoomChange'
          />
        </div>
      </section>
    </main>

    <Teleport to='body'>
      <Transition name='snippet-dialog'>
        <div
          v-if='snippetDialogOpen'
          class='snippet-dialog-backdrop'
          :data-demo-theme='resolvedDemoTheme'
          @click.self='closeSnippetDialog'
        >
          <section
            ref='snippetDialogRef'
            id='integration-snippet-dialog'
            class='snippet-dialog-panel'
            role='dialog'
            aria-modal='true'
            aria-labelledby='integration-snippet-title'
            aria-describedby='integration-snippet-description'
          >
            <header class='snippet-dialog-header'>
              <span class='snippet-dialog-icon'>
                <Code2 :size='21' :stroke-width='2.3' />
              </span>
              <span class='snippet-dialog-title'>
                <strong id='integration-snippet-title'>{{ demoCopy.integrationSnippet }}</strong>
                <em id='integration-snippet-description'>{{ demoCopy.integrationSnippetDescription }}</em>
              </span>
              <button
                ref='snippetCloseRef'
                type='button'
                class='snippet-dialog-close'
                :aria-label='demoCopy.closeIntegrationSnippet'
                @click='closeSnippetDialog'
              >
                <X :size='18' :stroke-width='2.5' />
              </button>
            </header>

            <pre class='snippet-dialog-code'><code>{{ integrationSnippet }}</code></pre>

            <footer class='snippet-dialog-footer'>
              <span>{{ demoCopy.integrationSnippetHint }}</span>
              <button
                type='button'
                class='snippet-dialog-copy'
                :class='{ copied: snippetCopied }'
                :title='snippetCopied ? demoCopy.copiedSnippet : demoCopy.copySnippet'
                @click='copyIntegrationSnippet'
              >
                <Check v-if='snippetCopied' :size='16' :stroke-width='2.5' />
                <Copy v-else :size='16' :stroke-width='2.5' />
                <strong>{{ snippetCopied ? demoCopy.copiedSnippet : demoCopy.copySnippet }}</strong>
              </button>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped src='../assets/demo-shell-base.css'></style>

<style scoped src='../assets/demo-shell-immersive.css'></style>
