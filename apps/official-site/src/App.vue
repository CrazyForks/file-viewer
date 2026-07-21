<script setup lang="ts">
import { computed, h, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import type { Mesh, Object3D, Scene, WebGLRenderer } from 'three'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Building2,
  Cloud,
  Cpu,
  Download,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Gem,
  GitBranch,
  HandCoins,
  HeartHandshake,
  Languages,
  Layers3,
  LockKeyhole,
  Mail,
  Menu,
  MonitorPlay,
  PackageCheck,
  PanelTop,
  QrCode,
  Radar,
  Replace,
  Rocket,
  Scale,
  SearchCheck,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Wrench,
  X,
  Zap
} from '@lucide/vue'

type Locale = 'zh' | 'en'
type HighlightLanguage = 'bash' | 'javascript' | 'typescript' | 'xml'

type LinkItem = {
  label: string
  href: string
  note: string
  icon: Component
  featured?: boolean
}

type MetricItem = {
  title: string
  value: string
  detail: string
  tone: string
}

type FormatGroup = {
  label: string
  count: string
  examples: string
  icon: Component
  tone: string
}

type Scenario = {
  title: string
  summary: string
  icon: Component
}

type Capability = {
  title: string
  detail: string
  icon: Component
}

type CommercialComparisonItem = {
  dimension: string
  openSource: string
  commercial: string
  icon: Component
}

type CommercialRouteStep = {
  label: string
  title: string
  detail: string
  icon: Component
}

type QrItem = {
  label: string
  note: string
  image: string
}

type SupportOption = {
  label: string
  note: string
  href: string
  icon: Component
}

type QuickStartItem = {
  label: string
  packageName: string
  install: string
  title: string
  summary: string
  language: string
  highlightLanguage: HighlightLanguage
  code: string
  href: string
  tone: string
  icon: Component
}

type NavAnchorId =
  | 'formats'
  | 'demo'
  | 'solutions'
  | 'ecosystem'
  | 'docs'
  | 'commercial'
  | 'delivery'
  | 'support'

type SectionId = 'top' | NavAnchorId

type NavItem = {
  id: NavAnchorId
  label: string
}

type HeroSceneController = {
  start: () => void
  stop: () => void
  dispose: () => void
}

const docsUrl = 'https://doc.file-viewer.app/'
const demoUrl = 'https://demo.file-viewer.app/'
const compareUrl = 'https://demo.file-viewer.app/compare.html'
const githubUrl = 'https://github.com/flyfish-dev/file-viewer'
const githubApiUrl = 'https://api.github.com/repos/flyfish-dev/file-viewer'
const githubStarCountFallback = 739
const releasesUrl = 'https://github.com/flyfish-dev/file-viewer/releases'
const currentReleaseVersion = '2.2.3'
const currentReleaseUrl = `${releasesUrl}/tag/v${currentReleaseVersion}`
const githubSponsorsUrl = 'https://github.com/sponsors/wybaby168'
const domesticSponsorUrl = 'https://dev.flyfish.group/sponsor?source=github'
const prioritySupportUrl = 'https://dev.flyfish.group/shop'
const studioUrl = 'https://flyfish.dev/'
const commercialUrl = 'https://product.flyfish.group/'
const commercialDemoUrl = 'https://office.flyfish.dev/'
const siteRootUrl = 'https://file-viewer.app/'
const siteEnglishUrl = `${siteRootUrl}en/`
const demoPreviewDesktopPaths = {
  zh: '/file-viewer-demo-v2.2.3-desktop-zh.webp',
  en: '/file-viewer-demo-v2.2.3-desktop-en.webp'
} satisfies Record<Locale, string>
const demoPreviewMobilePaths = {
  zh: '/file-viewer-demo-v2.2.3-mobile-zh.webp',
  en: '/file-viewer-demo-v2.2.3-mobile-en.webp'
} satisfies Record<Locale, string>
const sitePreviewImageUrls = {
  zh: `${siteRootUrl}${demoPreviewDesktopPaths.zh.slice(1)}`,
  en: `${siteRootUrl}${demoPreviewDesktopPaths.en.slice(1)}`
} satisfies Record<Locale, string>
const siteLocalePreferenceKey = 'flyfish-site-locale-preference'

type SiteMetadata = {
  lang: string
  canonical: string
  title: string
  description: string
  ogLocale: string
  ogLocaleAlternate: string
  imageAlt: string
}

const siteMetadata = {
  zh: {
    lang: 'zh-CN',
    canonical: siteRootUrl,
    title: 'File Viewer by Flyfish - 浏览器原生多格式文件预览',
    description:
      'File Viewer by Flyfish 是浏览器原生、离线优先的多格式预览组件：208 个扩展名通过 25 条独立预览链路按需加载，54 个 npm 目标覆盖主流前端生态。',
    ogLocale: 'zh_CN',
    ogLocaleAlternate: 'en_US',
    imageAlt: 'File Viewer v2.2.3 浏览器原生 DOCX 预览工作区'
  },
  en: {
    lang: 'en',
    canonical: siteEnglishUrl,
    title: 'File Viewer by Flyfish - Browser-native multi-format file preview',
    description:
      'File Viewer by Flyfish is a browser-native, offline-first preview component. It routes 208 extensions through 25 lazy preview pipelines and ships 54 npm targets for the main frontend stacks.',
    ogLocale: 'en_US',
    ogLocaleAlternate: 'zh_CN',
    imageAlt: 'File Viewer v2.2.3 browser-native DOCX preview workspace'
  }
} satisfies Record<Locale, SiteMetadata>

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('xml', xml)

const locale = ref<Locale>('en')
const topbar = ref<HTMLElement | null>(null)
const heroStage = ref<HTMLElement | null>(null)
const heroCanvas = ref<HTMLCanvasElement | null>(null)
const demoReveal = ref<HTMLElement | null>(null)
const docsFrame = ref<HTMLElement | null>(null)
const quickStartSection = ref<HTMLElement | null>(null)
const quickStartTrack = ref<HTMLElement | null>(null)
const isTopbarPinned = ref(false)
const activeSectionId = ref<SectionId>('top')
const mobileNavOpen = ref(false)
const heroCanvasReady = ref(false)
const demoRevealActive = ref(false)
const demoFrameMounted = ref(false)
const demoFrameReady = ref(false)
const docsFrameMounted = ref(false)
const quickStartSectionActive = ref(false)
const activeQuickStartIndex = ref(0)
const githubStarCount = ref(githubStarCountFallback)
const isZh = computed(() => locale.value === 'zh')
const nextLocaleLabel = computed(() => (isZh.value ? 'EN' : '中文'))
const githubStarsLabel = computed(() => formatStarCount(githubStarCount.value))
const githubStarsAriaLabel = computed(() =>
  isZh.value
    ? `GitHub 开源总仓，${githubStarsLabel.value} stars`
    : `GitHub repository, ${githubStarsLabel.value} stars`
)
const demoPreviewDesktopPath = computed(() => demoPreviewDesktopPaths[locale.value])
const demoPreviewMobilePath = computed(() => demoPreviewMobilePaths[locale.value])

function resolveLocalizedDemoUrl(targetUrl: string) {
  const url = new URL(targetUrl)
  url.searchParams.set('lang', isZh.value ? 'zh-CN' : 'en-US')
  return url.toString()
}

function resolveLocalizedDocsUrl(path = '') {
  const normalizedPath = path.replace(/^\/+/, '')
  const localizedPath = isZh.value ? `zh/${normalizedPath}` : normalizedPath
  const url = new URL(localizedPath, docsUrl)
  url.searchParams.set('no_lang_redirect', '1')
  return url.toString()
}

const localizedDemoUrl = computed(() => resolveLocalizedDemoUrl(demoUrl))
const localizedCompareUrl = computed(() => resolveLocalizedDemoUrl(compareUrl))
const localizedDocsUrl = computed(() => resolveLocalizedDocsUrl())
const localizedDocsQuickstartUrl = computed(() => resolveLocalizedDocsUrl('guide/quickstart'))

function formatStarCount(count: number) {
  if (count >= 1000000) {
    return `${Number((count / 1000000).toFixed(1))}m`
  }
  if (count >= 1000) {
    return `${Number((count / 1000).toFixed(1))}k`
  }
  return `${count}`
}

async function loadGithubStarCount() {
  try {
    const response = await fetch(githubApiUrl, {
      headers: {
        Accept: 'application/vnd.github+json'
      }
    })
    if (!response.ok) {
      return
    }
    const payload = (await response.json()) as { stargazers_count?: unknown }
    if (typeof payload.stargazers_count === 'number' && Number.isFinite(payload.stargazers_count)) {
      githubStarCount.value = payload.stargazers_count
    }
  } catch {
    // Keep the baked-in count when GitHub is unavailable or rate limited.
  }
}

const copy = {
  zh: {
    nav: {
      formats: '支持矩阵',
      solutions: '应用落地',
      ecosystem: '生态组件',
      commercial: '商业版',
      delivery: '部署分发',
      support: '打赏支持',
      docs: '文档',
      demo: '在线体验'
    },
    hero: {
      eyebrow: 'v2.2.3 · 208 个扩展名 · 无需转码服务器',
      title: '文件预览，全部在浏览器完成。',
      subtitle:
        '为了预览一份内部 DOCX 就把它上传到服务器，糟透了。File Viewer 让 Office、PDF、CAD、压缩包、邮件等文件留在浏览器里，并且可以完整离线部署。',
      primary: '立即体验',
      secondary: '阅读文档',
      commercial: '了解商业版',
      proof: ['54 个 npm 目标', '208 个文件扩展名', '25 条预览链路', 'Full 自托管资产契约']
    },
    matrixTitle: '208 个扩展名，按 25 条真实预览链路组织。',
    matrixIntro:
      '这不是一个通用降级页面配一长串后缀。PDF/OFD、Word、Spreadsheet、二进制 PPT、PPTX、CAD、Archive、XMind 和 STEP 等格式会匹配独立 renderer；Worker、WASM、字体与 vendor 资产按需加载，Full 包可整套离线交付。',
    formatsTitle: '支持矩阵',
    solutionsTitle: '适合长期运行在企业系统里',
    solutionsIntro:
      '从 OA 审批到工程图纸，从客服工单到 AI 文档工作台，File Viewer 更关注真实文件、复杂网络、私有化部署和用户每天都会遇到的细节。',
    ecosystemTitle: '原生组件接入，统一参数与事件。',
    ecosystemIntro:
      'Full 包直接内置 preset-all，无需再安装或传入 preset。Vite 注册插件并开启 copyAssets:true 后自动发布包内资产；Webpack、Vue CLI 等非 Vite 项目只需执行一次包内 CLI。',
    demoTitle: '不看截图想象。直接打开真实文件。',
    demoIntro:
      '用完整样例矩阵检查沉浸式文档滚动、独立工具弹层、格式图标、全局缩放、明暗主题、本地上传和显式 URL 模式；桌面与移动端共用同一渲染链路。',
    docsTitle: '接入文档，快速参阅关键能力。',
    docsIntro:
      '从快速开始进入，集中查阅 Full 包、Vite 自动资产、非 Vite 单次复制、完整 web-full dist、格式矩阵、组件参数与私有化部署。',
    commercialTitle: '免费组件与商业版的边界，一眼看清。',
    commercialIntro:
      '开源 File Viewer 负责浏览器原生、多格式、可离线部署的通用预览；商业版来自 Flyfish Office 自研原生文档引擎，专注 Word、Excel、PowerPoint 的高还原、大文件性能、授权交付和优先支持。两者不是二选一：商业版可以作为可替换的 Office 能力接入现有 File Viewer 组件，获得 file-viewer-pro 体验。',
    commercialCta: '了解商业授权',
    supportTitle: '支持 File Viewer 持续维护，也为企业需求保留清晰入口。',
    supportIntro:
      'GitHub Sponsors 支持一次性或持续赞助，国内用户也可使用微信或支付宝。赞助用于开源维护，不影响开源功能；私有化、定制与明确响应时间请使用企业技术支持入口。',
    releaseTitle: 'v2.2.3 已发布：组件工具栏默认隔离宿主样式，Angular PPTX 与普通 Vite PPT Worker 路径完成修复。',
    footer:
      '本仓库源码与软件包采用 Apache-2.0；可选外部依赖保留各自许可。由 Flyfish Dev 持续维护。'
  },
  en: {
    nav: {
      formats: 'Format Matrix',
      solutions: 'Use Cases',
      ecosystem: 'Components',
      commercial: 'Commercial',
      delivery: 'Delivery',
      support: 'Sponsor',
      docs: 'Docs',
      demo: 'Live Demo'
    },
    hero: {
      eyebrow: 'v2.2.3 · 208 extensions · no conversion server',
      title: 'Preview files entirely in the browser.',
      subtitle:
        'Uploading a private DOCX just to preview it is awful. File Viewer keeps Office, PDF, CAD, archives, email, and more in the browser, with every runtime asset ready for self-hosting.',
      primary: 'Try the Demo',
      secondary: 'Read the Docs',
      commercial: 'Commercial Edition',
      proof: ['54 npm targets', '208 file extensions', '25 preview pipelines', 'Self-hosted Full assets']
    },
    matrixTitle: '208 extensions. 25 real preview pipelines.',
    matrixIntro:
      'This is not one generic fallback page with a long suffix list. PDF/OFD, Word, Spreadsheet, binary PPT, PPTX, CAD, Archive, XMind, STEP, and other families match dedicated renderers. Workers, WASM, fonts, and vendor assets load on demand, while Full packages deliver the complete offline payload.',
    formatsTitle: 'Format matrix',
    solutionsTitle: 'Built for long-running enterprise workspaces',
    solutionsIntro:
      'From approvals to engineering drawings, support tickets, and AI document workflows, File Viewer focuses on real files, private networks, self-hosted delivery, and the details users meet every day.',
    ecosystemTitle: 'Native integrations with one options and event model.',
    ecosystemIntro:
      'Full packages include preset-all, so there is no separate preset to install or pass. Vite publishes packaged assets with copyAssets:true; Webpack, Vue CLI, and other builds run the included CLI once.',
    demoTitle: 'Do not guess from screenshots. Open real files.',
    demoIntro:
      'Use the full sample matrix to check immersive document scrolling, anchored tool panels, format icons, global zoom, light and dark themes, local uploads, and explicit URL mode. Desktop and mobile use the same renderer paths.',
    docsTitle: 'Integration docs for fast technical reference.',
    docsIntro:
      'Start with Full packages, Vite asset publishing, the one-command non-Vite path, complete web-full dist, format coverage, component options, and self-hosted deployment.',
    commercialTitle: 'Open-source component or commercial edition? Make the boundary obvious.',
    commercialIntro:
      'The open-source File Viewer focuses on browser-native, multi-format, offline-ready preview. The commercial edition comes from the Flyfish Office product line and focuses on Word, Excel, and PowerPoint fidelity, large-file performance, licensed delivery, and priority support. They are not mutually exclusive: the commercial engine can replace the Office capability inside the same File Viewer integration to deliver a file-viewer-pro experience.',
    commercialCta: 'Commercial Licensing',
    supportTitle: 'Support sustainable maintenance, with a clear path for enterprise help.',
    supportIntro:
      'Back the open-source work through GitHub Sponsors, buy us a lemonade in the support shop, or explore the commercial edition when Office fidelity, private delivery, and committed support matter.',
    releaseTitle: 'v2.2.3 is live: component toolbars are isolated from host CSS, with Angular PPTX and plain-Vite PPT Worker paths fixed.',
    footer:
      'Repository source and packages use Apache-2.0; optional external dependencies keep their own licenses. Maintained by Flyfish Dev.'
  }
} satisfies Record<Locale, Record<string, any>>

const metrics = computed<MetricItem[]>(() =>
  isZh.value
    ? [
        { title: '文件扩展名', value: '208', detail: '由唯一格式注册表生成，官网、文档与发布物同源', tone: 'green' },
        { title: '预览链路', value: '25', detail: '匹配独立 renderer，Worker/WASM 只在需要时加载', tone: 'blue' },
        { title: 'Preset 层级', value: '4', detail: 'lite、office、engineering、all 按产品形态装配', tone: 'violet' },
        { title: 'npm 发布目标', value: '54', detail: '48 个标准包与 6 个历史兼容 alias 同版本发布', tone: 'amber' }
      ]
    : [
        { title: 'Extensions', value: '208', detail: 'Generated from one format registry shared by the site, docs, and release artifacts', tone: 'green' },
        { title: 'Pipelines', value: '25', detail: 'Dedicated renderer matches with lazy Worker and WASM loading', tone: 'blue' },
        { title: 'Preset tiers', value: '4', detail: 'lite, office, engineering, and all product-shaped bundles', tone: 'violet' },
        { title: 'npm targets', value: '54', detail: '48 standard packages and 6 historical aliases released together', tone: 'amber' }
      ]
)

const formatGroups = computed<FormatGroup[]>(() =>
  isZh.value
    ? [
        {
          label: 'Office 与版式文档',
          count: 'Word / Excel / PPT / PDF / OFD / Typst',
          examples: 'docx、doc、xlsx、xls、ppt、pptx、pdf、ofd、typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: '工程与设计资产',
          count: 'CAD / EDA / 3D / Mind Maps',
          examples: 'dwg、dxf、dwf、dwfx、olb、dra、gds、oas、oasis、xmind、step、stl、excalidraw、drawio',
          icon: Layers3,
          tone: 'cyan'
        },
        {
          label: '归档与沟通文件',
          count: 'Archives / Email / Ebooks',
          examples: 'zip、7z、rar、tar、eml、msg、mbox、epub、umd',
          icon: FileArchive,
          tone: 'orange'
        },
        {
          label: '代码、数据与媒体',
          count: 'Code / Data / Media / Geo',
          examples: 'md、json、ts、py、sqlite、parquet、mp4、mp3、geojson、kml',
          icon: FileCode2,
          tone: 'indigo'
        }
      ]
    : [
        {
          label: 'Office and fixed-layout documents',
          count: 'Word / Excel / PPT / PDF / OFD / Typst',
          examples: 'docx, doc, xlsx, xls, ppt, pptx, pdf, ofd, typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: 'Engineering and design assets',
          count: 'CAD / EDA / 3D / Mind maps',
          examples: 'dwg, dxf, dwf, dwfx, olb, dra, gds, oas, oasis, xmind, step, stl, excalidraw, drawio',
          icon: Layers3,
          tone: 'cyan'
        },
        {
          label: 'Archives and communication files',
          count: 'Archives / Email / Ebooks',
          examples: 'zip, 7z, rar, tar, eml, msg, mbox, epub, umd',
          icon: FileArchive,
          tone: 'orange'
        },
        {
          label: 'Code, data, media, and geo',
          count: 'Code / Data / Media / Geo',
          examples: 'md, json, ts, py, sqlite, parquet, mp4, mp3, geojson, kml',
          icon: FileCode2,
          tone: 'indigo'
        }
      ]
)

const scenarios = computed<Scenario[]>(() =>
  isZh.value
    ? [
        {
          title: 'OA 审批与合同归档',
          summary: 'PDF、Word、OFD、图片和压缩包直接在审批流里打开，减少下载和外部应用跳转。',
          icon: ShieldCheck
        },
        {
          title: '知识库与附件中心',
          summary: '文档、表格、演示稿、代码片段和媒体附件在同一阅读体验中被检索、定位和复用。',
          icon: SearchCheck
        },
        {
          title: '工程图纸协同',
          summary: 'CAD/DWG/DXF/DWF、EDA 和 3D 模型进入浏览器，适合工程、制造和图纸审核。',
          icon: Radar
        },
        {
          title: '客服与工单平台',
          summary: '邮件、附件包、截图、录音和文档在线预览，帮助团队快速判断问题来源。',
          icon: Mail
        },
        {
          title: '私有化与离线部署',
          summary: '前端静态资源即可运行，支持 npm、Docker、Release tarball 和内网静态站。',
          icon: LockKeyhole
        },
        {
          title: 'AI 文档工作台',
          summary: '搜索、高亮、定位、导出 HTML 和文本切片为溯源、向量化与知识提取留好接口。',
          icon: Sparkles
        }
      ]
    : [
        {
          title: 'Approvals and contract archives',
          summary: 'Open PDF, Word, OFD, images, and archives directly in approval flows without downloads or external apps.',
          icon: ShieldCheck
        },
        {
          title: 'Knowledge bases and attachment hubs',
          summary: 'Documents, spreadsheets, decks, snippets, and media attachments become searchable and reusable in one reading surface.',
          icon: SearchCheck
        },
        {
          title: 'Engineering drawing collaboration',
          summary: 'Bring CAD/DWG/DXF/DWF, EDA assets, and 3D models into browser workflows for review and manufacturing teams.',
          icon: Radar
        },
        {
          title: 'Support and ticketing systems',
          summary: 'Preview email, attachment bundles, screenshots, recordings, and documents to identify issues quickly.',
          icon: Mail
        },
        {
          title: 'Private and offline deployment',
          summary: 'Run from static assets with npm, Docker, GitHub Release tarballs, or internal static hosting.',
          icon: LockKeyhole
        },
        {
          title: 'AI document workspaces',
          summary: 'Search, highlights, anchors, HTML export, and text chunks prepare the ground for citation and vector workflows.',
          icon: Sparkles
        }
      ]
)

const capabilities = computed<Capability[]>(() =>
  isZh.value
    ? [
        { title: '统一搜索与定位', detail: 'Ctrl/Command + F 调出浮层搜索，命中高亮、上一条/下一条和行级/页级定位可复用。', icon: SearchCheck },
        { title: '高保真打印导出', detail: 'PDF、Word、Markdown、图片等按渲染链路动态启用打印与 HTML 导出，避免只打印当前视口。', icon: Download },
        { title: '主题与水印', detail: 'light、dark、system 可控，文字/图片水印通过 options 统一注入。', icon: PanelTop },
        { title: '按需包与 Full 包边界清晰', detail: '轻量包通过 options.preset 自由裁剪；所有 Full 包直接内置 preset-all，并绑定同版本 File Viewer 自有静态资产，不需要业务侧再次拼装格式能力。', icon: Boxes }
      ]
    : [
        { title: 'Unified search and anchors', detail: 'Ctrl/Command + F opens focused search with highlights, next/previous navigation, and reusable page/line anchors.', icon: SearchCheck },
        { title: 'High-fidelity print and export', detail: 'PDF, Word, Markdown, images, and other printable renderers expose print and HTML export only when the output is trustworthy.', icon: Download },
        { title: 'Theme and watermark options', detail: 'light, dark, and system themes are controlled by options; text and image watermarks use one contract.', icon: PanelTop },
        { title: 'Clear light and Full package boundaries', detail: 'Light packages stay configurable through options.preset. Every Full package includes preset-all and its same-version File Viewer-owned static assets, with no extra format assembly.', icon: Boxes }
      ]
)

const fullPackageFaqs = computed<Capability[]>(() =>
  isZh.value
    ? [
        { title: 'Full 还要安装 preset-all 吗？', detail: '不需要。Vue、React、React Legacy、Vue 2.7、Vue 2.6、Svelte、jQuery 与 Web Full 均已内置 preset-all，安装对应 Full 包即可获得完整格式注册。', icon: PackageCheck },
        { title: 'Vite 还要手工复制 assets 吗？', detail: '不需要。注册 @file-viewer/vite-plugin 并设置 copyAssets:true，dev 与 build 会按部署根路径自动提供包内 Worker、WASM、字体和 vendor 资源。', icon: Zap },
        { title: 'Webpack / Vue CLI 怎么部署？', detail: '安装任一 Full 包后执行一次 npx --no-install file-viewer-copy-assets ./public/file-viewer。CLI 来自该 Full 包并锁定同一版本。', icon: Wrench },
        { title: 'web-full 还需要 copy 吗？', detail: '不需要。完整部署 @file-viewer/web-full/dist，脚本、renderer 与 File Viewer 自有静态资产位于同一目录树，可直接用于内网或静态托管。', icon: Cloud }
      ]
    : [
        { title: 'Does Full need a separate preset-all?', detail: 'No. Vue, React, React Legacy, Vue 2.7, Vue 2.6, Svelte, jQuery, and Web Full packages include preset-all and register the complete format set.', icon: PackageCheck },
        { title: 'Does Vite need a manual asset copy?', detail: 'No. Register @file-viewer/vite-plugin with copyAssets:true. Dev and build then serve packaged Worker, WASM, font, and vendor assets from the deployment base.', icon: Zap },
        { title: 'What about Webpack or Vue CLI?', detail: 'After installing any Full package, run npx --no-install file-viewer-copy-assets ./public/file-viewer once. The included CLI is pinned to the same package version.', icon: Wrench },
        { title: 'Does web-full still need a copy step?', detail: 'No. Deploy @file-viewer/web-full/dist intact. The script, renderers, and File Viewer-owned static payload share one directory tree for intranet or static hosting.', icon: Cloud }
      ]
)

const GitHubMark = {
  name: 'GitHubMark',
  render: () =>
    h(
      'svg',
      {
        class: 'github-mark',
        viewBox: '0 0 24 24',
        'aria-hidden': 'true',
        fill: 'currentColor'
      },
      [
        h('path', {
          d: 'M12 1.7C6.3 1.7 1.7 6.3 1.7 12c0 4.6 3 8.5 7.2 9.8.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.2-3.5-1.2-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 2.9.9.1-.7.4-1.1.7-1.3-2.3-.3-4.7-1.2-4.7-5.1 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1.8-.2 1.7-.3 2.6-.3.9 0 1.8.1 2.6.3 2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.8 1.1 1.7 1.1 2.8 0 4-2.4 4.8-4.7 5.1.4.3.8 1 .8 2v3c0 .3.2.6.8.5 4.2-1.3 7.2-5.2 7.2-9.8C22.3 6.3 17.7 1.7 12 1.7Z'
        })
      ]
    )
} satisfies Component

const portalLinks = computed<LinkItem[]>(() =>
  isZh.value
    ? [
        { label: '在线 Demo', href: localizedDemoUrl.value, note: '体验主预览器、上传预览和完整样例矩阵', icon: MonitorPlay, featured: true },
        { label: '官方文档', href: localizedDocsUrl.value, note: 'doc.file-viewer.app，接入、格式、部署与 API', icon: BookOpen, featured: true },
        { label: '文档比对', href: localizedCompareUrl.value, note: '左右并排预览、同步滚动、搜索定位', icon: PanelTop, featured: true },
        { label: 'GitHub 开源总仓', href: githubUrl, note: '源码、Release 下载、构建产物和 issue', icon: GitHubMark, featured: true },
        { label: 'npm 生态包', href: 'https://www.npmjs.com/search?q=%40file-viewer', note: 'core、renderer、preset 与标准组件包', icon: PackageCheck },
        { label: 'Docker 部署', href: resolveLocalizedDocsUrl('guide/docker'), note: 'amd64 / arm64 一键部署文档与示例', icon: Cloud },
        { label: '商业版引擎', href: commercialUrl, note: '自研原生 Office 引擎，高还原与极致性能', icon: Gem },
        { label: 'GitHub Sponsors', href: githubSponsorsUrl, note: '一次性或持续赞助开源维护', icon: HandCoins },
        { label: '飞鱼开源工作室', href: studioUrl, note: '了解 Flyfish Dev 的产品与服务', icon: Building2 }
      ]
    : [
        { label: 'Live demo', href: localizedDemoUrl.value, note: 'Try the main viewer, uploads, and the full sample matrix', icon: MonitorPlay, featured: true },
        { label: 'Documentation', href: localizedDocsUrl.value, note: 'doc.file-viewer.app for integration, formats, deployment, and APIs', icon: BookOpen, featured: true },
        { label: 'Compare demo', href: localizedCompareUrl.value, note: 'Side-by-side preview with sync scroll, search, and anchors', icon: PanelTop, featured: true },
        { label: 'GitHub monorepo', href: githubUrl, note: 'Source, releases, artifacts, and issues', icon: GitHubMark, featured: true },
        { label: 'npm packages', href: 'https://www.npmjs.com/search?q=%40file-viewer', note: 'core, renderer, preset, and standard component packages', icon: PackageCheck },
        { label: 'Docker deployment', href: resolveLocalizedDocsUrl('guide/docker'), note: 'amd64 / arm64 deployment for docs and examples', icon: Cloud },
        { label: 'Commercial engine', href: commercialUrl, note: 'Native Office engine for high fidelity and extreme performance', icon: Gem },
        { label: 'GitHub Sponsors', href: githubSponsorsUrl, note: 'One-time or recurring support for open-source maintenance', icon: HandCoins },
        { label: 'Flyfish Dev', href: studioUrl, note: 'Explore Flyfish Dev products and services', icon: Building2 }
      ]
)

function snippetImport(statement: string) {
  return `im${'port'} ${statement}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function highlightSnippet(code: string, language: HighlightLanguage) {
  try {
    return hljs.highlight(code, { language, ignoreIllegals: true }).value
  } catch {
    return escapeHtml(code)
  }
}

const quickStartItems = computed<QuickStartItem[]>(() => [
  {
    label: isZh.value ? 'Vanilla JS Full' : 'Vanilla JS Full',
    packageName: '@file-viewer/web-full',
    install: 'npm install @file-viewer/web-full@2.2.3',
    title: isZh.value ? '完整部署 dist，零 copy 直接预览' : 'Deploy the complete dist with zero copy steps',
    summary: isZh.value
      ? 'web-full 内置 preset-all；完整 dist 已包含 renderer、Worker、WASM、字体和 vendor，保持目录结构部署即可。'
      : 'web-full includes preset-all; its complete dist already contains renderers, Workers, WASM, fonts, and vendor assets.',
    language: 'HTML',
    highlightLanguage: 'xml',
    href: resolveLocalizedDocsUrl('guide/quickstart-web'),
    tone: 'violet',
    icon: MonitorPlay,
    code: `<!-- Deploy @file-viewer/web-full/dist intact at /file-viewer/. -->
<div id="viewer" style="height:720px"></div>
<script src="/file-viewer/flyfish-file-viewer-web-full.iife.js"></${'script'}>

<script>
const controller = FlyfishFileViewerWebFull.mountViewer(
  document.getElementById('viewer'),
  {
    url: '/files/drawing.dwg',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    },
    onEvent(event) {
      console.log(event.type, event.payload)
    }
  }
)

controller.zoomIn()
</${'script'}>`
  },
  {
    label: 'Vue 3',
    packageName: '@file-viewer/vue3-full',
    install: 'npm install @file-viewer/vue3-full',
    title: isZh.value ? 'Vue 3 一步获得完整能力' : 'Vue 3 with complete capability',
    summary: isZh.value
      ? 'Full 已内置 preset-all，无需另装或传入 preset；完整资产通过 Vite 自动发布或非 Vite CLI 一次复制。'
      : 'Full includes preset-all with no separate preset option; Vite publishes assets automatically, or the non-Vite CLI copies them once.',
    language: 'Vue SFC',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue3'),
    tone: 'green',
    icon: PanelTop,
    code: `${snippetImport("{ createApp } from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue3-full'")}

const viewerOptions = {
  theme: 'light',
  toolbar: { position: 'bottom-right', zoom: true }
}

createApp(App).use(FileViewer).mount('#app')

<file-viewer
  url="/files/contract.pdf"
  :options="viewerOptions"
  @load-complete="handleLoadComplete"
/>`
  },
  {
    label: isZh.value ? 'Vue 3 按需' : 'Vue 3 On Demand',
    packageName: '@file-viewer/vue3',
    install: 'npm install @file-viewer/vue3 @file-viewer/preset-office',
    title: isZh.value ? 'Vue 3 标准包按需装配' : 'Vue 3 standard package with presets',
    summary: isZh.value
      ? '标准包保持最轻入口，格式能力通过 preset 或单 renderer 注入，适合控制安装体积。'
      : 'The standard package stays light; presets or single renderers control the installed capability set.',
    language: 'Vue SFC',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue3'),
    tone: 'green',
    icon: PanelTop,
    code: `${snippetImport("{ createApp } from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue3'")}
${snippetImport("officePreset from '@file-viewer/preset-office'")}

const viewerOptions = {
  preset: officePreset,
  rendererMode: 'replace',
  theme: 'light',
  toolbar: { position: 'bottom-right', zoom: true }
}

createApp(App).use(FileViewer).mount('#app')

<file-viewer
  url="/files/contract.pdf"
  :options="viewerOptions"
/>`
  },
  {
    label: 'React',
    packageName: '@file-viewer/react-full',
    install: 'npm install @file-viewer/react-full',
    title: isZh.value ? 'React full 包一行接入' : 'React full package in one line',
    summary: isZh.value
      ? '内置 preset-all 与同版本完整资产，同时保留 React 组件、hooks、事件回调和 ref/controller。'
      : 'Includes preset-all and the same-version complete asset payload, while keeping components, hooks, callbacks, and ref/controller APIs.',
    language: 'TSX',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/quickstart-react'),
    tone: 'blue',
    icon: Rocket,
    code: `${snippetImport("FileViewer, { useFileViewer } from '@file-viewer/react-full'")}

export function Preview() {
  const viewer = useFileViewer({
    url: '/files/report.docx',
    options: {
      theme: 'light',
      toolbar: { position: 'bottom-right' }
    },
    onEvent: event => console.log(event.type)
  })

  return (
    <FileViewer
      ref={viewer.ref}
      {...viewer.props}
    />
  )
}`
  },
  {
    label: 'Svelte',
    packageName: '@file-viewer/svelte-full',
    install: 'npm install @file-viewer/svelte-full',
    title: isZh.value ? 'Svelte full 包完整接入' : 'Svelte full package with the complete matrix',
    summary: isZh.value
      ? 'Svelte Full 内置 preset-all 与完整离线资产，并保留统一的 options、事件、主题、搜索、缩放和打印导出能力。'
      : 'Svelte Full includes preset-all and complete offline assets while keeping the shared options, events, themes, search, zoom, print, and export APIs.',
    language: 'Svelte',
    highlightLanguage: 'xml',
    href: resolveLocalizedDocsUrl('guide/quickstart-svelte'),
    tone: 'cyan',
    icon: Zap,
    code: `<script lang="ts">
  ${snippetImport("FileViewer from '@file-viewer/svelte-full'")}

  const options = {
    theme: 'light',
    toolbar: { position: 'bottom-right', zoom: true }
  }
${'<\\/script>'}

<FileViewer
  url="/files/deck.pptx"
  {options}
  on:viewerEvent={event => console.log(event.detail.type)}
/>`
  },
  {
    label: 'Vue 2.7 / 2.6',
    packageName: '@file-viewer/vue2.7-full',
    install: 'npm install @file-viewer/vue2.7-full',
    title: isZh.value ? 'Vue 2.7 / 2.6 项目平滑接入' : 'Smooth Vue 2.7 / 2.6 integration',
    summary: isZh.value
      ? 'Vue 2.7 与 Vue 2.6 Full 均内置 preset-all、同版本复制 CLI，并保持相同的 props、事件和样式入口。'
      : 'Vue 2.7 and Vue 2.6 Full both include preset-all, the same-version copy CLI, and the same props, events, and style entry.',
    language: 'Vue 2',
    highlightLanguage: 'javascript',
    href: resolveLocalizedDocsUrl('guide/quickstart-vue2'),
    tone: 'amber',
    icon: Layers3,
    code: `${snippetImport("Vue from 'vue'")}
${snippetImport("FileViewer from '@file-viewer/vue2.7-full'")}
// Vue 2.6 projects use @file-viewer/vue2.6-full.

Vue.use(FileViewer)

new Vue({
  template: \`
    <file-viewer
      url="/files/archive.zip"
      :options="viewerOptions"
      @viewer-event="handleViewerEvent"
    />
  \`,
  data: () => ({
    viewerOptions: {
      theme: 'light',
      toolbar: true
    }
  })
}).$mount('#app')`
  },
  {
    label: 'jQuery',
    packageName: '@file-viewer/jquery-full',
    install: 'npm install @file-viewer/jquery-full',
    title: isZh.value ? 'jQuery Full 命令式完整接入' : 'Complete imperative jQuery Full integration',
    summary: isZh.value
      ? '内置 preset-all 与同版本完整资产，面向传统多页应用保留 controller、事件解绑、销毁和运行时更新能力。'
      : 'Includes preset-all and same-version complete assets, with controller, event cleanup, destroy, and runtime updates for classic apps.',
    language: 'JavaScript',
    highlightLanguage: 'javascript',
    href: resolveLocalizedDocsUrl('guide/ecosystem#jquery'),
    tone: 'orange',
    icon: Wrench,
    code: `${snippetImport("{ mountViewer } from '@file-viewer/jquery-full'")}

const controller = mountViewer(document.getElementById('viewer'), {
  url: '/files/sheet.xlsx',
  options: {
    theme: 'light',
    toolbar: { zoom: true }
  },
  onEvent(event) {
    console.log(event.type)
  }
})

controller.load({ url: '/files/contract.pdf' })`
  },
  {
    label: isZh.value ? 'Vite 自动装配' : 'Vite Auto',
    packageName: '@file-viewer/vite-plugin',
    install: isZh.value
      ? 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin'
      : 'npm install @file-viewer/vue3-full && npm install -D @file-viewer/vite-plugin',
    title: isZh.value ? 'Full + copyAssets:true 自动完成格式与资产' : 'Full + copyAssets:true completes formats and assets',
    summary: isZh.value
      ? 'Full 自带 preset-all；插件在 dev/build 中自动发布全部 Worker、WASM、字体和 vendor，并兼容根路径与子路径部署。'
      : 'Full brings preset-all; the plugin publishes every Worker, WASM, font, and vendor asset in dev/build for root or subpath deployments.',
    language: 'Vite',
    highlightLanguage: 'typescript',
    href: resolveLocalizedDocsUrl('guide/on-demand-renderers'),
    tone: 'blue',
    icon: Layers3,
    code: `${snippetImport("{ defineConfig } from 'vite'")}
${snippetImport("{ fileViewerRenderers } from '@file-viewer/vite-plugin'")}

export default defineConfig({
  plugins: [
    fileViewerRenderers({
      copyAssets: true
    })
  ]
})

// @file-viewer/vue3-full already includes preset-all.
// No preset option and no manual asset copy are required.`
  },
  {
    label: isZh.value ? '离线部署' : 'Offline',
    packageName: '@file-viewer/*-full',
    install: isZh.value ? '非 Vite：任一 Full 包自带复制命令' : 'Non-Vite: every Full package includes the copy command',
    title: isZh.value ? 'Webpack / Vue CLI 只执行一次 CLI' : 'One CLI command for Webpack or Vue CLI',
    summary: isZh.value
      ? '命令来自已安装的 Full 包，复制同版本完整资产并写入清单；运行时不依赖公共 CDN。'
      : 'The command comes with the installed Full package, copies its same-version complete payload, and writes the manifest; runtime stays off public CDNs.',
    language: 'Shell',
    highlightLanguage: 'bash',
    href: resolveLocalizedDocsUrl('guide/distribution'),
    tone: 'cyan',
    icon: Boxes,
    code: `npx --no-install file-viewer-copy-assets ./public/file-viewer

# Serve public/file-viewer from /file-viewer/ on your own domain.
# Workers, WASM, fonts, vendor files, and the manifest stay aligned
# with the installed Full package version.`
  }
])

const activeQuickStart = computed(() => {
  const items = quickStartItems.value
  return items[activeQuickStartIndex.value] ?? items[0]!
})

const commercialFeatures = computed<Capability[]>(() =>
  isZh.value
    ? [
        { title: '自研原生版式引擎', detail: '面向 Word、Excel、PowerPoint 的结构解析、分页和绘制链路，不依赖系统 Office。', icon: Cpu },
        { title: '大文件性能优先', detail: 'Worker 解析、异步渲染、虚拟滚动和窗口化数据链路，减少主线程卡顿。', icon: Zap },
        { title: '严肃商用支持', detail: '适合合同归档、报表中心、知识库和需要更高还原度的企业产品。', icon: HeartHandshake }
      ]
    : [
        { title: 'Self-developed native layout engine', detail: 'Structural parsing, pagination, and rendering for Word, Excel, and PowerPoint without relying on system Office.', icon: Cpu },
        { title: 'Large-file performance first', detail: 'Worker parsing, asynchronous rendering, virtual scrolling, and windowed data paths reduce main-thread blocking.', icon: Zap },
        { title: 'Serious commercial support', detail: 'For contract archives, report centers, knowledge bases, and enterprise products that demand stronger fidelity.', icon: HeartHandshake }
      ]
)

const commercialComparison = computed<CommercialComparisonItem[]>(() =>
  isZh.value
    ? [
        {
          dimension: '文件格式',
          openSource:
            '覆盖 208 个扩展名，包含 PDF/OFD、Office、CAD、Typst、压缩包、邮件、绘图、媒体、3D 和数据资产；通过 lite / office / engineering / all preset 按需启用。',
          commercial:
            '重点增强 Word、Excel、PowerPoint 深水区，可替换 office preset 中的 Word / Spreadsheet / Presentation 能力；PDF、OFD、CAD、Archive 等其它格式继续由开源 renderer 承接。',
          icon: FileText
        },
        {
          dimension: '还原度',
          openSource:
            '目标是可读、可搜索、可打印、可嵌入业务系统；DOCX 当前偏流式阅读，Excel 与 PPT/PPTX 覆盖常见业务预览，不承诺原生 Office 逐像素一致。',
          commercial:
            '自研原生文档引擎面向分页、字体、表格、图形、页眉页脚、批注修订和复杂演示布局，适合合同、报告、档案和正式交付预览。',
          icon: Scale
        },
        {
          dimension: '性能',
          openSource:
            '轻 core + renderer 按需加载，Worker/WASM 懒加载，适合大多数附件中心和在线预览；极端大文件需要结合真实样本做回归。',
          commercial:
            '针对大文档、大表格和复杂 PPT 做 Worker 解析、分页/分块渲染、虚拟滚动、缓存和内存调优，优先保障主线程流畅。',
          icon: Zap
        },
        {
          dimension: '授权与支持',
          openSource:
            '本仓库产出的 File Viewer 源码与软件包采用 Apache-2.0；可选外部依赖保留各自许可。社区 issue、打赏和优先支持可协助定位，但上线验收与兼容性风险由项目自行把控。',
          commercial:
            '商业授权、私有交付、优先技术支持、样本回归和定制兼容路线，适合需要明确责任边界、交付周期和企业支持的场景。',
          icon: ShieldCheck
        }
      ]
    : [
        {
          dimension: 'Formats',
          openSource:
            'Covers 208 extensions across PDF/OFD, Office, CAD, Typst, archives, email, diagrams, media, 3D, and data assets through lite / office / engineering / all presets.',
          commercial:
            'Strengthens the Word, Excel, and PowerPoint deep end. It can replace the Word / Spreadsheet / Presentation capability in the office preset while PDF, OFD, CAD, Archive, and other formats continue to use open-source renderers.',
          icon: FileText
        },
        {
          dimension: 'Fidelity',
          openSource:
            'Optimized for readable, searchable, printable previews embedded in business systems. DOCX is currently flow-first, and Excel plus PPT/PPTX target common preview needs rather than native Office pixel parity.',
          commercial:
            'The self-developed native document engine targets pagination, fonts, tables, shapes, headers/footers, comments/revisions, and complex deck layouts for contracts, reports, archives, and formal delivery.',
          icon: Scale
        },
        {
          dimension: 'Performance',
          openSource:
            'A light core plus lazy renderer loading keeps most attachment centers responsive. Worker/WASM assets load on demand, while extreme large files should be validated with real samples.',
          commercial:
            'Large documents, large spreadsheets, and complex decks get Worker parsing, paginated or chunked rendering, virtual scrolling, caching, and memory tuning to keep the main thread smooth.',
          icon: Zap
        },
        {
          dimension: 'Licensing and support',
          openSource:
            'File Viewer source and packages produced by this repository use Apache-2.0; optional external dependencies keep their own licenses. Community issues, sponsorship, and priority support can help, but final launch validation remains with the product team.',
          commercial:
            'Commercial licensing, private delivery, priority support, sample regression, and custom compatibility work for teams that need clear ownership, delivery timelines, and enterprise support.',
          icon: ShieldCheck
        }
      ]
)

const commercialRouteSteps = computed<CommercialRouteStep[]>(() =>
  isZh.value
    ? [
        {
          label: 'Step 01',
          title: '保留现有组件入口',
          detail: 'Vue、React、Svelte、jQuery、Web Component 或 Vanilla JS 接入方式不变，业务仍使用同一套 options、事件和 controller。',
          icon: PanelTop
        },
        {
          label: 'Step 02',
          title: '替换 Office 能力',
          detail: '将开源 office preset 中的 Word、Spreadsheet、Presentation renderer 替换为商业版 Office preset / renderer。',
          icon: Replace
        },
        {
          label: 'Step 03',
          title: '继续组合其它格式',
          detail: 'PDF、OFD、CAD、Archive、Email、Drawing、3D、Data 等仍可通过开源 preset 或单 renderer 与商业 Office 能力并列装配。',
          icon: GitBranch
        },
        {
          label: 'Step 04',
          title: '获得 file-viewer-pro 效果',
          detail: '同一个 FileViewer 外壳内获得商业版 Office 高还原、大文件性能、授权交付和优先支持体验。',
          icon: Sparkles
        }
      ]
    : [
        {
          label: 'Step 01',
          title: 'Keep the same component entry',
          detail: 'Vue, React, Svelte, jQuery, Web Component, and Vanilla JS integrations keep the same options, events, and controller contract.',
          icon: PanelTop
        },
        {
          label: 'Step 02',
          title: 'Replace the Office capability',
          detail: 'Swap the open-source Word, Spreadsheet, and Presentation renderers from the office preset with the commercial Office preset or renderer set.',
          icon: Replace
        },
        {
          label: 'Step 03',
          title: 'Keep composing other formats',
          detail: 'PDF, OFD, CAD, Archive, Email, Drawing, 3D, Data, and other formats can still be assembled through open-source presets or single renderers.',
          icon: GitBranch
        },
        {
          label: 'Step 04',
          title: 'Deliver a file-viewer-pro experience',
          detail: 'The same FileViewer shell gains commercial Office fidelity, large-file performance, licensed delivery, and priority support.',
          icon: Sparkles
        }
      ]
)

const commercialRouteCode = computed(() =>
  isZh.value
    ? `${snippetImport("FileViewer from '@file-viewer/vue3'")}
${snippetImport("engineeringPreset from '@file-viewer/preset-engineering'")}
${snippetImport("{ commercialOfficePreset } from './vendor/file-viewer-pro-office'")}

const viewerOptions = {
  rendererMode: 'replace',
  preset: [
    commercialOfficePreset,
    engineeringPreset
  ],
  theme: 'light'
}

<FileViewer
  url="/files/report.docx"
  :options="viewerOptions"
/>`
    : `${snippetImport("FileViewer from '@file-viewer/vue3'")}
${snippetImport("engineeringPreset from '@file-viewer/preset-engineering'")}
${snippetImport("{ commercialOfficePreset } from './vendor/file-viewer-pro-office'")}

const viewerOptions = {
  rendererMode: 'replace',
  preset: [
    commercialOfficePreset,
    engineeringPreset
  ],
  theme: 'light'
}

<FileViewer
  url="/files/report.docx"
  :options="viewerOptions"
/>`
)

const qrItems: QrItem[] = [
  { label: '微信打赏', note: '请我们喝杯柠檬水', image: '/donate-wx.jpg?v=637db1a6' },
  { label: '支付宝打赏', note: '支持开源持续迭代', image: '/donate-alipay.jpg?v=3b614e81' },
  { label: '客服微信', note: '优先支持与商业沟通', image: '/contact.jpg' },
  { label: '公众号', note: '关注更新与实践文章', image: '/wechat-mp.png' },
  { label: '交流群', note: '加入用户交流群', image: '/invite.webp' }
]

const englishSupportOptions: SupportOption[] = [
  {
    label: 'GitHub Sponsors',
    note: 'Make a one-time or recurring contribution to open-source maintenance.',
    href: githubSponsorsUrl,
    icon: HandCoins
  },
  {
    label: 'Support Shop',
    note: 'Buy us a lemonade or choose a maintainer support option that fits your team.',
    href: prioritySupportUrl,
    icon: ShoppingCart
  },
  {
    label: 'Commercial Edition',
    note: 'Explore the native Office engine for higher fidelity, private delivery, and enterprise support.',
    href: commercialUrl,
    icon: Gem
  }
]

const currentCopy = computed(() => copy[locale.value])

const pageSectionIds: readonly SectionId[] = [
  'top',
  'formats',
  'demo',
  'solutions',
  'ecosystem',
  'docs',
  'commercial',
  'delivery',
  'support'
]

const primaryNavItems = computed<NavItem[]>(() => [
  { id: 'formats', label: currentCopy.value.nav.formats },
  { id: 'demo', label: currentCopy.value.nav.demo },
  { id: 'solutions', label: currentCopy.value.nav.solutions },
  { id: 'ecosystem', label: currentCopy.value.nav.ecosystem },
  { id: 'docs', label: currentCopy.value.nav.docs },
  { id: 'commercial', label: currentCopy.value.nav.commercial },
  { id: 'delivery', label: currentCopy.value.nav.delivery },
  { id: 'support', label: currentCopy.value.nav.support }
])

function resolveLocaleFromPathname(pathname: string): Locale | undefined {
  const normalizedPathname = pathname.toLowerCase()
  if (normalizedPathname === '/en' || normalizedPathname.startsWith('/en/')) {
    return 'en'
  }
  if (normalizedPathname === '/zh' || normalizedPathname.startsWith('/zh/')) {
    return 'zh'
  }
  return undefined
}

function resolvePathForLocale(nextLocale: Locale) {
  return nextLocale === 'en' ? '/en/' : '/'
}

function syncBrowserPathForLocale(nextLocale: Locale) {
  const pathLocale = resolveLocaleFromPathname(window.location.pathname)
  if ((nextLocale === 'zh' && pathLocale !== 'en') || pathLocale === nextLocale) {
    return
  }

  const nextPath = resolvePathForLocale(nextLocale)
  const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`
  window.history.replaceState(null, '', nextUrl)
}

function setMetaContent(selector: string, content: string) {
  const element = document.querySelector<HTMLMetaElement>(selector)
  if (element) {
    element.content = content
  }
}

function setLinkHref(selector: string, href: string) {
  const element = document.querySelector<HTMLLinkElement>(selector)
  if (element) {
    element.href = href
  }
}

function updateDocumentMetadata(nextLocale: Locale) {
  const metadata = siteMetadata[nextLocale]
  const canonical = resolveCanonicalForCurrentPath()
  const previewImageUrl = sitePreviewImageUrls[nextLocale]
  document.documentElement.lang = metadata.lang
  document.title = metadata.title
  setLinkHref('link[rel="canonical"]', canonical)
  setMetaContent('meta[name="description"]', metadata.description)
  setMetaContent('meta[property="og:title"]', metadata.title)
  setMetaContent('meta[property="og:description"]', metadata.description)
  setMetaContent('meta[property="og:url"]', canonical)
  setMetaContent('meta[property="og:image"]', previewImageUrl)
  setMetaContent('meta[property="og:image:secure_url"]', previewImageUrl)
  setMetaContent('meta[property="og:image:alt"]', metadata.imageAlt)
  setMetaContent('meta[property="og:locale"]', metadata.ogLocale)
  setMetaContent('meta[property="og:locale:alternate"]', metadata.ogLocaleAlternate)
  setMetaContent('meta[name="twitter:title"]', metadata.title)
  setMetaContent('meta[name="twitter:description"]', metadata.description)
  setMetaContent('meta[name="twitter:image"]', previewImageUrl)
}

function readStoredLocalePreference(): Locale | undefined {
  try {
    const storedLocale = window.localStorage.getItem(siteLocalePreferenceKey)
    return storedLocale === 'zh' || storedLocale === 'en' ? storedLocale : undefined
  } catch {
    return undefined
  }
}

function writeStoredLocalePreference(nextLocale: Locale) {
  try {
    window.localStorage.setItem(siteLocalePreferenceKey, nextLocale)
  } catch {
    // Storage can be unavailable in privacy-restricted browsing modes.
  }
}

function prefersChineseEnvironment() {
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean)
  return languages.some(language => language.toLowerCase().startsWith('zh'))
}

function resolveInitialLocale(): Locale {
  const pathLocale = resolveLocaleFromPathname(window.location.pathname)
  if (pathLocale) {
    return pathLocale
  }

  const storedLocale = readStoredLocalePreference()
  if (storedLocale) {
    return storedLocale
  }

  if (prefersChineseEnvironment()) {
    return 'zh'
  }

  return 'en'
}

function resolveCanonicalForCurrentPath() {
  return resolveLocaleFromPathname(window.location.pathname) === 'en' ? siteEnglishUrl : siteRootUrl
}

function toggleLocale() {
  const nextLocale = isZh.value ? 'en' : 'zh'
  mobileNavOpen.value = false
  writeStoredLocalePreference(nextLocale)
  locale.value = nextLocale
  syncBrowserPathForLocale(nextLocale)
}

function selectQuickStart(index: number) {
  activeQuickStartIndex.value = index
  const track = quickStartTrack.value
  const target = track?.children.item(index) as HTMLElement | null
  if (!track || !target) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  track.scrollTo({
    left: target.offsetLeft - track.offsetLeft,
    behavior: reduceMotion ? 'auto' : 'smooth'
  })
}

let quickStartScrollFrame = 0
let pageScrollFrame = 0

function syncQuickStartFromScroll() {
  const track = quickStartTrack.value
  if (!track) return

  window.cancelAnimationFrame(quickStartScrollFrame)
  quickStartScrollFrame = window.requestAnimationFrame(() => {
    const panels = Array.from(track.children) as HTMLElement[]
    const trackCenter = track.scrollLeft + track.clientWidth / 2
    let nextIndex = activeQuickStartIndex.value
    let nearestDistance = Number.POSITIVE_INFINITY

    panels.forEach((panel, index) => {
      const panelCenter = panel.offsetLeft + panel.offsetWidth / 2
      const distance = Math.abs(panelCenter - trackCenter)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nextIndex = index
      }
    })

    activeQuickStartIndex.value = nextIndex
  })
}

function handleQuickStartKeydown(event: KeyboardEvent, index: number) {
  const lastIndex = quickStartItems.value.length - 1
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault()
    selectQuickStart(Math.max(0, index - 1))
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault()
    selectQuickStart(Math.min(lastIndex, index + 1))
  } else if (event.key === 'Home') {
    event.preventDefault()
    selectQuickStart(0)
  } else if (event.key === 'End') {
    event.preventDefault()
    selectQuickStart(lastIndex)
  }
}

function isPageSectionId(id: string): id is SectionId {
  return pageSectionIds.includes(id as SectionId)
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function supportsWebGLRendering() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function shouldUseHeroWebGL() {
  return supportsWebGLRendering()
}

function getTopbarScrollOffset() {
  const rect = topbar.value?.getBoundingClientRect()
  const height = rect?.height ?? 72
  const top = rect ? Math.max(8, rect.top) : 14
  return Math.ceil(height + top + 62)
}

function updateAnchorOffsetVariable() {
  const rect = topbar.value?.getBoundingClientRect()
  const styles = topbar.value ? window.getComputedStyle(topbar.value) : null
  const marginTop = styles ? Number.parseFloat(styles.marginTop) || 0 : 14
  const marginBottom = styles ? Number.parseFloat(styles.marginBottom) || 0 : 32
  const topbarSpace = Math.ceil((rect?.height ?? 72) + marginTop + marginBottom)
  document.documentElement.style.setProperty('--site-anchor-offset', `${getTopbarScrollOffset()}px`)
  document.documentElement.style.setProperty('--site-topbar-space', `${topbarSpace}px`)
}

function resolveActiveSection() {
  const anchorY = window.scrollY + getTopbarScrollOffset() + 6
  let nextSection: SectionId = 'top'

  pageSectionIds.forEach((id) => {
    const section = document.getElementById(id)
    if (section && section.offsetTop <= anchorY) {
      nextSection = id
    }
  })

  const pageBottom = window.scrollY + window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  if (pageBottom >= documentHeight - 8) {
    nextSection = 'support'
  }

  return nextSection
}

function updatePageNavStateNow() {
  isTopbarPinned.value = window.scrollY > 24
  updateAnchorOffsetVariable()
  activeSectionId.value = resolveActiveSection()
}

function requestPageNavStateUpdate() {
  window.cancelAnimationFrame(pageScrollFrame)
  pageScrollFrame = window.requestAnimationFrame(updatePageNavStateNow)
}

function scrollInitialHashIntoView() {
  const hashId = window.location.hash ? decodeURIComponent(window.location.hash.slice(1)) : ''
  const target = hashId ? document.getElementById(hashId) : null
  if (!target) return

  window.requestAnimationFrame(() => {
    if (hashId === 'ecosystem') {
      quickStartSectionActive.value = true
    }
    if (isPageSectionId(hashId)) {
      activeSectionId.value = hashId
    }
    const top =
      hashId === 'top'
        ? 0
        : Math.max(0, target.getBoundingClientRect().top + window.scrollY - getTopbarScrollOffset())
    window.scrollTo({ top, behavior: 'auto' })
    updatePageNavStateNow()
  })
}

function scrollToSection(event: MouseEvent, id: SectionId) {
  event.preventDefault()
  mobileNavOpen.value = false
  const target = document.getElementById(id)
  if (!target) return

  const top =
    id === 'top'
      ? 0
      : Math.max(0, target.getBoundingClientRect().top + window.scrollY - getTopbarScrollOffset())
  if (id === 'ecosystem') {
    quickStartSectionActive.value = true
  }
  activeSectionId.value = id
  window.history.replaceState(null, '', `#${id}`)
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

function disposeScene(scene: Scene, renderer: WebGLRenderer) {
  scene.traverse((child: Object3D) => {
    const mesh = child as Mesh
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }

    const material = mesh.material
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose())
    } else if (material) {
      material.dispose()
    }
  })
  renderer.dispose()
}

async function initHeroScene(): Promise<HeroSceneController> {
  const canvas = heroCanvas.value
  const stage = heroStage.value || canvas?.parentElement
  if (!canvas || !stage) {
    return {
      start: () => {},
      stop: () => {},
      dispose: () => {}
    }
  }

  const THREE = await import('three')

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: 'high-performance'
  })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
  camera.position.set(0, 0.5, 7.8)

  const ambient = new THREE.HemisphereLight(0xe9fff8, 0x071526, 2.2)
  const key = new THREE.DirectionalLight(0xf4fffd, 3.6)
  key.position.set(4.6, 5.6, 6.2)
  const rim = new THREE.PointLight(0x2dd4bf, 4.4, 15)
  rim.position.set(-4.2, 1.2, 3.8)
  scene.add(ambient, key, rim)

  const rig = new THREE.Group()
  scene.add(rig)

  const coreField = new THREE.Group()
  coreField.position.set(0, 0.08, -2.05)
  const corePlateGeometry = new THREE.CylinderGeometry(2.38, 2.38, 0.055, 6)
  const corePlate = new THREE.Mesh(
    corePlateGeometry,
    new THREE.MeshBasicMaterial({ color: 0x153f4b, transparent: true, opacity: 0.34, side: THREE.DoubleSide })
  )
  corePlate.rotation.x = Math.PI / 2
  corePlate.scale.x = 0.94
  const corePlateEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(corePlateGeometry),
    new THREE.LineBasicMaterial({ color: 0x4ee5c2, transparent: true, opacity: 0.2 })
  )
  corePlateEdge.rotation.copy(corePlate.rotation)
  corePlateEdge.scale.copy(corePlate.scale)
  coreField.add(corePlate, corePlateEdge)
  scene.add(coreField)

  const pageGeometry = new THREE.BoxGeometry(2.86, 3.82, 0.045)
  const pageMaterials = [
    new THREE.MeshStandardMaterial({ color: 0xf6fffb, roughness: 0.4, metalness: 0.02, transparent: true, opacity: 0.94 }),
    new THREE.MeshStandardMaterial({ color: 0xe7fbff, roughness: 0.44, metalness: 0.03, transparent: true, opacity: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0xf6f1ff, roughness: 0.46, metalness: 0.03, transparent: true, opacity: 0.88 })
  ]
  const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x90f3dd, transparent: true, opacity: 0.46 })
  const pages: Mesh[] = []
  const pageBasePositions: Array<{ x: number; y: number; z: number }> = []

  for (let index = 0; index < 7; index += 1) {
    const page = new THREE.Mesh(pageGeometry, pageMaterials[index % pageMaterials.length])
    const basePosition = {
      x: (index - 3) * 0.14,
      y: 0.16 - index * 0.034,
      z: -index * 0.23
    }
    pageBasePositions.push(basePosition)
    page.position.set(basePosition.x, basePosition.y, basePosition.z)
    page.rotation.set(-0.07 + index * 0.01, -0.34 + index * 0.018, -0.065)
    pages.push(page)
    rig.add(page)

    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(pageGeometry), edgeMaterial)
    page.add(edge)
  }

  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x25d692, transparent: true, opacity: 0.58 })
  const cyanMaterial = new THREE.MeshBasicMaterial({ color: 0x37d6f3, transparent: true, opacity: 0.62 })
  const violetMaterial = new THREE.MeshBasicMaterial({ color: 0x8b7cf6, transparent: true, opacity: 0.52 })
  const amberMaterial = new THREE.MeshBasicMaterial({ color: 0xf3b24f, transparent: true, opacity: 0.62 })
  const panelItems = [
    { x: -0.62, y: 0.82, z: 0.1, w: 0.92, h: 0.18, material: glowMaterial },
    { x: 0.42, y: 0.36, z: 0.12, w: 1.18, h: 0.14, material: cyanMaterial },
    { x: -0.35, y: -0.22, z: 0.14, w: 1.42, h: 0.16, material: violetMaterial },
    { x: 0.58, y: -0.78, z: 0.16, w: 0.86, h: 0.16, material: amberMaterial }
  ]
  const panelBlocks: Mesh[] = []

  panelItems.forEach((item, index) => {
    const block = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, 0.04), item.material)
    block.position.set(item.x, item.y, item.z)
    block.rotation.set(-0.08, -0.35, -0.08)
    block.userData.baseX = item.x
    block.userData.baseScaleX = 0.92 + index * 0.018
    block.scale.x = block.userData.baseScaleX
    panelBlocks.push(block)
    rig.add(block)
  })

  const railGroup = new THREE.Group()
  rig.add(railGroup)

  const railMaterial = new THREE.LineBasicMaterial({ color: 0x6de5ff, transparent: true, opacity: 0.46 })
  const railPoints = [
    new THREE.Vector3(-2.3, -1.55, -0.22),
    new THREE.Vector3(-1.5, -1.04, 0),
    new THREE.Vector3(-0.6, -1.35, 0.16),
    new THREE.Vector3(0.4, -1.08, 0.26),
    new THREE.Vector3(1.58, -1.46, 0.02),
    new THREE.Vector3(2.34, -0.92, -0.28)
  ]
  const railCurve = new THREE.CatmullRomCurve3(railPoints, false, 'catmullrom', 0.36)
  const rail = new THREE.Line(new THREE.BufferGeometry().setFromPoints(railCurve.getPoints(72)), railMaterial)
  railGroup.add(rail)

  const nodeGeometry = new THREE.SphereGeometry(0.065, 12, 8)
  const nodeMaterials = [
    new THREE.MeshBasicMaterial({ color: 0x28d989 }),
    new THREE.MeshBasicMaterial({ color: 0x39d8ff }),
    new THREE.MeshBasicMaterial({ color: 0xf0bb45 })
  ]
  const nodes = railPoints.map((point, index) => {
    const node = new THREE.Mesh(nodeGeometry, nodeMaterials[index % nodeMaterials.length])
    node.position.copy(point)
    railGroup.add(node)
    return node
  })
  const flowTracer = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xe9fff8, transparent: true, opacity: 0.94 })
  )
  railGroup.add(flowTracer)

  const ringGroup = new THREE.Group()
  scene.add(ringGroup)
  const ringOne = new THREE.Mesh(
    new THREE.TorusGeometry(2.36, 0.012, 6, 96),
    new THREE.MeshBasicMaterial({ color: 0x1fbf8a, transparent: true, opacity: 0.36 })
  )
  const ringTwo = new THREE.Mesh(
    new THREE.TorusGeometry(3.06, 0.008, 6, 112),
    new THREE.MeshBasicMaterial({ color: 0x55d7ff, transparent: true, opacity: 0.28 })
  )
  ringOne.rotation.set(1.08, 0.36, -0.44)
  ringTwo.rotation.set(1.22, -0.28, 0.35)
  ringGroup.add(ringOne, ringTwo)

  const orbitNodeGroup = new THREE.Group()
  const orbitNodeGeometry = new THREE.BoxGeometry(0.58, 0.38, 0.04)
  const orbitNodeSpecs = [
    { position: [-2.58, 1.24, -0.46], color: 0x2dd4bf },
    { position: [2.66, 0.92, -0.72], color: 0x38bdf8 },
    { position: [-2.46, -1.54, -0.2], color: 0xa78bfa },
    { position: [2.52, -1.38, -0.4], color: 0xf6c453 }
  ] as const
  const orbitNodes = orbitNodeSpecs.map((spec, index) => {
    const node = new THREE.Mesh(
      orbitNodeGeometry,
      new THREE.MeshBasicMaterial({
        color: spec.color,
        transparent: true,
        opacity: 0.78
      })
    )
    node.position.set(spec.position[0], spec.position[1], spec.position[2])
    node.rotation.set(-0.08, index % 2 === 0 ? 0.24 : -0.24, (index - 1.5) * 0.05)
    node.userData.baseY = spec.position[1]
    orbitNodeGroup.add(node)
    return node
  })
  scene.add(orbitNodeGroup)

  const particles = new THREE.BufferGeometry()
  const particleCount = 72
  const positions = new Float32Array(particleCount * 3)
  for (let index = 0; index < particleCount; index += 1) {
    const angle = index * 1.618
    const radius = 2.15 + ((index % 13) / 13) * 1.38
    positions[index * 3] = Math.cos(angle) * radius
    positions[index * 3 + 1] = -1.82 + ((index * 37) % 100) / 28
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.42 - 0.6
  }
  particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const particleField = new THREE.Points(
    particles,
    new THREE.PointsMaterial({ color: 0x8ee8d2, size: 0.022, transparent: true, opacity: 0.66 })
  )
  scene.add(particleField)

  let frameId = 0
  let isRunning = false
  let isDisposed = false
  let playRequested = false
  let lastFrameTime = performance.now()
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const pointerTarget = new THREE.Vector2()
  const pointerCurrent = new THREE.Vector2()
  const cameraTarget = new THREE.Vector2()

  const handlePointerMove = (event: PointerEvent) => {
    if (motionQuery.matches) return
    const bounds = stage.getBoundingClientRect()
    pointerTarget.set(
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
      -(((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 - 1)
    )
  }

  const handlePointerLeave = () => {
    pointerTarget.set(0, 0)
  }

  const renderFrame = (time: number) => {
    const delta = Math.min(0.05, Math.max(1 / 240, (time - lastFrameTime) / 1000))
    lastFrameTime = time
    const elapsed = motionQuery.matches ? 1.1 : time * 0.001
    const pointerDamping = motionQuery.matches ? 20 : 7.5
    pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, pointerDamping, delta)
    pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, pointerDamping, delta)
    cameraTarget.set(pointerCurrent.x * 0.18, 0.5 + pointerCurrent.y * 0.12)

    rig.rotation.y = Math.sin(elapsed * 0.34) * 0.085 + pointerCurrent.x * 0.16
    rig.rotation.x = Math.sin(elapsed * 0.27) * 0.026 - pointerCurrent.y * 0.075
    rig.position.y = Math.sin(elapsed * 0.46) * 0.045
    coreField.rotation.z = -elapsed * 0.018
    coreField.rotation.y = Math.sin(elapsed * 0.22) * 0.028
    ringGroup.rotation.z = elapsed * 0.075
    ringGroup.rotation.y = Math.sin(elapsed * 0.24) * 0.05 + pointerCurrent.x * 0.04
    railGroup.position.y = Math.sin(elapsed * 0.82) * 0.038
    orbitNodeGroup.rotation.z = Math.sin(elapsed * 0.18) * 0.025
    particleField.rotation.y = elapsed * 0.045
    particleField.rotation.z = Math.sin(elapsed * 0.2) * 0.035

    camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTarget.x, 5.5, delta)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraTarget.y, 5.5, delta)
    camera.lookAt(0, 0.1, 0)

    pages.forEach((page, index) => {
      const base = pageBasePositions[index]
      const wave = Math.sin(elapsed * 0.58 + index * 0.68)
      page.position.x = base.x + wave * 0.012
      page.position.y = base.y + wave * 0.008
      page.position.z = base.z + wave * 0.024
      page.rotation.z = -0.065 + Math.sin(elapsed * 0.42 + index * 0.84) * 0.009
    })
    panelBlocks.forEach((block, index) => {
      const shimmer = 1 + Math.sin(elapsed * 1.18 + index * 0.78) * 0.035
      block.scale.x = block.userData.baseScaleX * shimmer
      block.position.x = block.userData.baseX + Math.sin(elapsed * 0.72 + index) * 0.012
    })
    nodes.forEach((node, index) => {
      const pulse = 1 + Math.sin(elapsed * 1.75 + index * 0.72) * 0.16
      node.scale.setScalar(pulse)
    })
    flowTracer.position.copy(railCurve.getPoint((elapsed * 0.095) % 1))
    orbitNodes.forEach((node, index) => {
      node.position.y = node.userData.baseY + Math.sin(elapsed * 0.62 + index * 1.3) * 0.075
      node.rotation.z += delta * (index % 2 === 0 ? 0.05 : -0.045)
    })

    stage.style.setProperty('--hero-pointer-x', `${(pointerCurrent.x * 8).toFixed(2)}px`)
    stage.style.setProperty('--hero-pointer-y', `${(-pointerCurrent.y * 7).toFixed(2)}px`)
    renderer.render(scene, camera)
  }

  const resize = () => {
    const width = Math.max(320, stage.clientWidth)
    const height = Math.max(420, stage.clientHeight)
    const pixelRatioCap = width < 720 ? 1.35 : width * height > 520000 ? 1.5 : 1.65
    const renderScale = width * height > 420000 ? 0.82 : 1
    renderer.setPixelRatio(Math.max(0.82, Math.min(window.devicePixelRatio || 1, pixelRatioCap) * renderScale))
    renderer.setSize(width, height, false)
    camera.position.z = width / height < 0.9 ? 9.1 : 7.8
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    if (!isRunning && !isDisposed) {
      renderFrame(performance.now())
    }
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(stage)

  const animate = (time: number) => {
    if (!isRunning || isDisposed) {
      return
    }

    renderFrame(time)
    frameId = window.requestAnimationFrame(animate)
  }

  const startLoop = () => {
    if (isRunning || isDisposed || motionQuery.matches) {
      return
    }
    isRunning = true
    lastFrameTime = performance.now()
    frameId = window.requestAnimationFrame(animate)
  }

  const stopLoop = () => {
    isRunning = false
    window.cancelAnimationFrame(frameId)
    frameId = 0
  }

  const start = () => {
    playRequested = true
    if (motionQuery.matches) {
      renderFrame(performance.now())
      return
    }
    startLoop()
  }

  const stop = () => {
    playRequested = false
    stopLoop()
  }

  const handleMotionPreferenceChange = () => {
    pointerTarget.set(0, 0)
    stopLoop()
    if (playRequested) {
      start()
    } else {
      renderFrame(performance.now())
    }
  }

  const handleContextLost = (event: Event) => {
    event.preventDefault()
    stopLoop()
    heroCanvasReady.value = false
  }

  const handleContextRestored = () => {
    resize()
    heroCanvasReady.value = true
    if (playRequested) startLoop()
  }

  stage.addEventListener('pointermove', handlePointerMove, { passive: true })
  stage.addEventListener('pointerleave', handlePointerLeave)
  motionQuery.addEventListener('change', handleMotionPreferenceChange)
  canvas.addEventListener('webglcontextlost', handleContextLost)
  canvas.addEventListener('webglcontextrestored', handleContextRestored)

  resize()
  renderFrame(performance.now())
  heroCanvasReady.value = true

  return {
    start,
    stop,
    dispose: () => {
      isDisposed = true
      stop()
      resizeObserver.disconnect()
      stage.removeEventListener('pointermove', handlePointerMove)
      stage.removeEventListener('pointerleave', handlePointerLeave)
      motionQuery.removeEventListener('change', handleMotionPreferenceChange)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
      disposeScene(scene, renderer)
      renderer.forceContextLoss()
      heroCanvasReady.value = false
    }
  }
}

let heroSceneController: HeroSceneController | undefined
let heroSceneInitPromise: Promise<void> | undefined
let heroSceneDisposed = false
let heroSceneInView = false
let heroVisibilityObserver: IntersectionObserver | undefined
let demoRevealObserver: IntersectionObserver | undefined
let docsFrameObserver: IntersectionObserver | undefined
let quickStartObserver: IntersectionObserver | undefined
let topbarResizeObserver: ResizeObserver | undefined
let demoFrameUnmountTimer: number | undefined
let docsFrameUnmountTimer: number | undefined

async function ensureHeroScene() {
  if (heroSceneController || heroSceneInitPromise || heroSceneDisposed || !shouldUseHeroWebGL()) {
    return
  }

  heroSceneInitPromise = initHeroScene()
    .then((controller) => {
      heroSceneInitPromise = undefined
      if (heroSceneDisposed) {
        controller.dispose()
        return
      }
      heroSceneController = controller
      syncHeroScenePlayback()
    })
    .catch(() => {
      heroSceneInitPromise = undefined
      heroCanvasReady.value = false
    })
  await heroSceneInitPromise
}

function syncHeroScenePlayback() {
  if (!heroSceneController) {
    return
  }

  if (heroSceneInView && document.visibilityState === 'visible') {
    heroSceneController.start()
  } else {
    heroSceneController.stop()
  }
}

function clearFrameUnmountTimers() {
  if (demoFrameUnmountTimer) {
    window.clearTimeout(demoFrameUnmountTimer)
    demoFrameUnmountTimer = undefined
  }
  if (docsFrameUnmountTimer) {
    window.clearTimeout(docsFrameUnmountTimer)
    docsFrameUnmountTimer = undefined
  }
}

function setDemoFrameActive(active: boolean) {
  demoRevealActive.value = active
  if (demoFrameUnmountTimer) {
    window.clearTimeout(demoFrameUnmountTimer)
    demoFrameUnmountTimer = undefined
  }

  if (active) {
    demoFrameMounted.value = true
    return
  }

  demoFrameUnmountTimer = window.setTimeout(() => {
    if (!demoRevealActive.value) {
      demoFrameMounted.value = false
      demoFrameReady.value = false
    }
    demoFrameUnmountTimer = undefined
  }, 5000)
}

function handleDemoFrameLoad() {
  demoFrameReady.value = true
}

function setDocsFrameActive(active: boolean) {
  if (docsFrameUnmountTimer) {
    window.clearTimeout(docsFrameUnmountTimer)
    docsFrameUnmountTimer = undefined
  }

  if (active) {
    docsFrameMounted.value = true
    return
  }

  docsFrameUnmountTimer = window.setTimeout(() => {
    docsFrameMounted.value = false
    docsFrameUnmountTimer = undefined
  }, 5000)
}

watch(locale, (nextLocale) => {
  demoFrameReady.value = false
  updateDocumentMetadata(nextLocale)
})

onMounted(async () => {
  locale.value = resolveInitialLocale()
  if (readStoredLocalePreference() || prefersChineseEnvironment()) {
    syncBrowserPathForLocale(locale.value)
  }
  updateDocumentMetadata(locale.value)
  void loadGithubStarCount()
  await nextTick()
  topbarResizeObserver = new ResizeObserver(requestPageNavStateUpdate)
  if (topbar.value) {
    topbarResizeObserver.observe(topbar.value)
  }
  window.addEventListener('scroll', requestPageNavStateUpdate, { passive: true })
  window.addEventListener('resize', requestPageNavStateUpdate)
  updatePageNavStateNow()
  if (window.location.hash === '#ecosystem') {
    quickStartSectionActive.value = true
  }
  scrollInitialHashIntoView()
  if (heroStage.value && shouldUseHeroWebGL()) {
    heroVisibilityObserver = new IntersectionObserver(
      ([entry]) => {
        heroSceneInView = entry.isIntersecting && entry.intersectionRatio > 0.1
        if (heroSceneInView) {
          void ensureHeroScene()
        }
        syncHeroScenePlayback()
      },
      {
        rootMargin: '120px 0px 120px 0px',
        threshold: [0, 0.1, 0.35]
      }
    )
    heroVisibilityObserver.observe(heroStage.value)
  }
  document.addEventListener('visibilitychange', syncHeroScenePlayback)

  if (demoReveal.value) {
    demoRevealObserver = new IntersectionObserver(
      ([entry]) => {
        const active = entry.isIntersecting && entry.intersectionRatio > 0.18
        setDemoFrameActive(active)
      },
      {
        rootMargin: '-12% 0px -18% 0px',
        threshold: [0, 0.18, 0.4, 0.72]
      }
    )
    demoRevealObserver.observe(demoReveal.value)
  }

  if (docsFrame.value) {
    docsFrameObserver = new IntersectionObserver(
      ([entry]) => {
        setDocsFrameActive(entry.isIntersecting && entry.intersectionRatio > 0.12)
      },
      {
        rootMargin: '-8% 0px -14% 0px',
        threshold: [0, 0.12, 0.4]
      }
    )
    docsFrameObserver.observe(docsFrame.value)
  }

  if (quickStartSection.value) {
    quickStartObserver = new IntersectionObserver(
      ([entry]) => {
        quickStartSectionActive.value =
          window.location.hash === '#ecosystem' || (entry.isIntersecting && entry.intersectionRatio > 0.16)
      },
      {
        rootMargin: '-14% 0px -18% 0px',
        threshold: [0, 0.16, 0.42, 0.72]
      }
    )
    quickStartObserver.observe(quickStartSection.value)
  }
})

onBeforeUnmount(() => {
  heroSceneDisposed = true
  window.removeEventListener('scroll', requestPageNavStateUpdate)
  window.removeEventListener('resize', requestPageNavStateUpdate)
  document.removeEventListener('visibilitychange', syncHeroScenePlayback)
  heroVisibilityObserver?.disconnect()
  demoRevealObserver?.disconnect()
  docsFrameObserver?.disconnect()
  quickStartObserver?.disconnect()
  topbarResizeObserver?.disconnect()
  clearFrameUnmountTimers()
  window.cancelAnimationFrame(quickStartScrollFrame)
  window.cancelAnimationFrame(pageScrollFrame)
  heroSceneController?.dispose()
})
</script>

<template>
  <main class="site-shell" :class="{ 'has-pinned-nav': isTopbarPinned }" :lang="locale">
    <nav
      ref="topbar"
      class="topbar"
      :class="{ 'is-pinned': isTopbarPinned }"
      aria-label="Primary navigation"
    >
      <a class="brand" href="#top" aria-label="File Viewer" @click="scrollToSection($event, 'top')">
        <img src="/logo.png" alt="" />
        <span>File Viewer</span>
      </a>
      <div id="primary-navigation" class="topbar-links" :class="{ 'is-open': mobileNavOpen }">
        <a
          v-for="item in primaryNavItems"
          :key="item.id"
          :href="`#${item.id}`"
          :class="{ 'is-active': activeSectionId === item.id }"
          :aria-current="activeSectionId === item.id ? 'location' : undefined"
          @click="scrollToSection($event, item.id)"
        >
          {{ item.label }}
        </a>
      </div>
      <div class="topbar-actions">
        <button
          class="nav-icon-button mobile-nav-toggle"
          type="button"
          :aria-label="isZh ? '打开导航菜单' : 'Open navigation menu'"
          aria-controls="primary-navigation"
          :aria-expanded="mobileNavOpen"
          @click="mobileNavOpen = !mobileNavOpen"
        >
          <X v-if="mobileNavOpen" :size="18" />
          <Menu v-else :size="18" />
        </button>
        <a
          class="nav-icon-button github-star-button"
          :href="githubUrl"
          target="_blank"
          rel="noreferrer"
          :aria-label="githubStarsAriaLabel"
        >
          <GitHubMark />
          <span class="github-star-badge" aria-hidden="true">
            <Star :size="9" fill="currentColor" :stroke-width="2.5" />
            <span>{{ githubStarsLabel }}</span>
          </span>
        </a>
        <button class="language-toggle" type="button" @click="toggleLocale">
          <Languages :size="16" />
          {{ nextLocaleLabel }}
        </button>
        <a class="topbar-action" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
          <span class="topbar-action-label-full">{{ currentCopy.nav.demo }}</span>
          <span class="topbar-action-label-short">{{ isZh ? '体验' : 'Demo' }}</span>
          <ArrowRight :size="16" />
        </a>
      </div>
    </nav>

    <section id="top" class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">
          <Sparkles :size="17" />
          {{ currentCopy.hero.eyebrow }}
        </p>
        <h1>
          <template v-if="isZh">
            <span class="hero-title-line">File Viewer。</span>
            <span class="hero-title-line hero-title-accent">文件预览，全部在浏览器完成。</span>
          </template>
          <template v-else>
            <span class="hero-title-line">File Viewer.</span>
            <span class="hero-title-line hero-title-accent">Preview files in the browser.</span>
          </template>
        </h1>
        <p class="hero-subtitle">{{ currentCopy.hero.subtitle }}</p>
        <div class="hero-actions">
          <a class="button primary" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.hero.primary }}</span>
            <MonitorPlay :size="18" />
          </a>
          <a class="button secondary" :href="localizedDocsUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.hero.secondary }}</span>
            <BookOpen :size="18" />
          </a>
          <a class="button tertiary" :href="commercialUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.hero.commercial }}</span>
            <Gem :size="18" />
          </a>
        </div>
        <div class="hero-badges" aria-label="Highlights">
          <span v-for="item in currentCopy.hero.proof" :key="item">
            <BadgeCheck :size="15" />
            {{ item }}
          </span>
        </div>
      </div>

      <div class="hero-visual" aria-label="File Viewer browser-native preview workspace">
        <div ref="heroStage" class="hero-stage" :class="{ 'is-webgl-ready': heroCanvasReady }">
          <div class="hero-static-preview" aria-hidden="true">
            <span class="hero-static-page hero-static-page-one"></span>
            <span class="hero-static-page hero-static-page-two"></span>
            <span class="hero-static-page hero-static-page-three"></span>
            <span class="hero-static-line hero-static-line-one"></span>
            <span class="hero-static-line hero-static-line-two"></span>
            <span class="hero-static-line hero-static-line-three"></span>
            <span class="hero-static-node hero-static-node-one"></span>
            <span class="hero-static-node hero-static-node-two"></span>
            <span class="hero-static-node hero-static-node-three"></span>
          </div>
          <canvas ref="heroCanvas" class="three-canvas" aria-hidden="true"></canvas>
          <div class="hero-format-cloud" aria-hidden="true">
            <span class="hero-format-pill hero-format-pdf">PDF</span>
            <span class="hero-format-pill hero-format-office">DOCX</span>
            <span class="hero-format-pill hero-format-cad">CAD</span>
            <span class="hero-format-pill hero-format-data">3D</span>
          </div>
          <div class="hero-signal hero-signal-top">
            <FileSpreadsheet :size="18" />
            <span>{{ isZh ? '统一预览链路' : 'Unified preview pipeline' }}</span>
          </div>
          <div class="hero-signal hero-signal-bottom">
            <Boxes :size="18" />
            <span>{{ isZh ? 'Worker / WASM 按需加载' : 'Worker / WASM on demand' }}</span>
          </div>
          <div class="hero-engine-card">
            <strong>{{ isZh ? 'Core Renderer' : 'Core Renderer' }}</strong>
            <span>{{ isZh ? '纯 TypeScript 底座' : 'framework-neutral TypeScript' }}</span>
          </div>
        </div>
      </div>
    </section>

    <section id="formats" class="band band-light" aria-labelledby="formats-title">
      <div class="section-heading">
        <p class="section-kicker">Coverage matrix</p>
        <h2 id="formats-title">{{ currentCopy.matrixTitle }}</h2>
        <p>{{ currentCopy.matrixIntro }}</p>
      </div>
      <div class="metric-grid">
        <article v-for="item in metrics" :key="item.title" class="metric-card" :class="`metric-${item.tone}`">
          <span>{{ item.title }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </div>
      <div class="format-grid" :aria-label="currentCopy.formatsTitle">
        <article v-for="group in formatGroups" :key="group.label" class="format-card" :class="`accent-${group.tone}`">
          <component :is="group.icon" :size="26" />
          <h3>{{ group.label }}</h3>
          <strong>{{ group.count }}</strong>
          <p>{{ group.examples }}</p>
        </article>
      </div>
    </section>

    <section
      id="demo"
      ref="demoReveal"
      class="demo-reveal-section"
      :class="{ 'demo-reveal-active': demoRevealActive }"
      aria-labelledby="demo-title"
    >
      <div class="demo-reveal-stage">
        <div class="demo-reveal-copy">
          <div>
            <p class="section-kicker">Live demo</p>
            <h2 id="demo-title">{{ currentCopy.demoTitle }}</h2>
            <p>{{ currentCopy.demoIntro }}</p>
          </div>
          <div class="inline-actions">
            <a class="button primary" :href="localizedDemoUrl" target="_blank" rel="noreferrer">
              <span>{{ currentCopy.nav.demo }}</span>
              <MonitorPlay :size="18" />
            </a>
            <a class="button secondary" :href="localizedCompareUrl" target="_blank" rel="noreferrer">
              <span>{{ isZh ? '文档比对' : 'Compare Demo' }}</span>
              <PanelTop :size="18" />
            </a>
          </div>
        </div>

        <div class="demo-reveal-window">
          <div class="demo-seam demo-seam-top">
            <span>{{ isZh ? '完整预览器' : 'full viewer' }}</span>
          </div>
          <div class="demo-browser demo-browser-wide">
            <div class="demo-browser-bar">
              <span />
              <span />
              <span />
              <strong>demo.file-viewer.app</strong>
            </div>
            <div class="demo-frame-stack">
              <picture class="demo-frame-poster" :class="{ 'is-hidden': demoFrameReady }">
                <source media="(max-width: 760px)" :srcset="demoPreviewMobilePath" />
                <img
                  :src="demoPreviewDesktopPath"
                  :alt="isZh ? 'File Viewer v2.2.3 沉浸式 DOCX 预览界面' : 'File Viewer v2.2.3 immersive DOCX preview UI'"
                  width="1600"
                  height="900"
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <iframe
                v-if="demoFrameMounted"
                :key="`demo-${locale}`"
                :class="{ 'is-ready': demoFrameReady }"
                :src="localizedDemoUrl"
                :title="isZh ? 'File Viewer 在线 Demo' : 'File Viewer live demo'"
                loading="lazy"
                @load="handleDemoFrameLoad"
              ></iframe>
            </div>
          </div>
          <div class="demo-seam demo-seam-bottom">
            <span>{{ isZh ? '真实样例矩阵' : 'real sample matrix' }}</span>
          </div>
        </div>
      </div>
    </section>

    <section id="solutions" class="band scenario-section" aria-labelledby="solutions-title">
      <div class="section-heading compact">
        <p class="section-kicker">In production</p>
        <h2 id="solutions-title">{{ currentCopy.solutionsTitle }}</h2>
        <p>{{ currentCopy.solutionsIntro }}</p>
      </div>
      <div class="scenario-grid">
        <article v-for="scenario in scenarios" :key="scenario.title" class="scenario-card">
          <component :is="scenario.icon" :size="24" />
          <h3>{{ scenario.title }}</h3>
          <p>{{ scenario.summary }}</p>
        </article>
      </div>
    </section>

    <section
      id="ecosystem"
      ref="quickStartSection"
      class="band ecosystem-section"
      :class="{ 'quickstart-active': quickStartSectionActive }"
      aria-labelledby="ecosystem-title"
    >
      <div class="ecosystem-copy">
        <p class="section-kicker">Native components</p>
        <h2 id="ecosystem-title">{{ currentCopy.ecosystemTitle }}</h2>
        <p>{{ currentCopy.ecosystemIntro }}</p>
        <div class="quickstart-tabs" role="tablist" aria-label="Ecosystem quick start examples">
          <button
            v-for="(item, index) in quickStartItems"
            :id="`quickstart-tab-${index}`"
            :key="item.packageName"
            class="quickstart-tab"
            :class="[`quickstart-tab-${item.tone}`, { 'is-active': index === activeQuickStartIndex }]"
            :style="{ transitionDelay: `${index * 55}ms` }"
            type="button"
            role="tab"
            :aria-selected="index === activeQuickStartIndex"
            :aria-controls="`quickstart-panel-${index}`"
            :tabindex="index === activeQuickStartIndex ? 0 : -1"
            @click="selectQuickStart(index)"
            @keydown="handleQuickStartKeydown($event, index)"
          >
            <span class="quickstart-tab-icon">
              <component :is="item.icon" :size="17" />
            </span>
            <span class="quickstart-tab-copy">
              <strong>{{ item.label }}</strong>
              <em>{{ item.title }}</em>
            </span>
          </button>
        </div>
      </div>

      <div class="quickstart-workbench" aria-label="Ecosystem quick start code">
        <div class="quickstart-header">
          <div>
            <span>{{ activeQuickStart.install }}</span>
            <strong>{{ activeQuickStart.title }}</strong>
          </div>
          <a :href="activeQuickStart.href" target="_blank" rel="noreferrer">
            {{ isZh ? '完整文档' : 'Full docs' }}
            <ArrowRight :size="15" />
          </a>
        </div>

        <div
          ref="quickStartTrack"
          class="quickstart-track"
          tabindex="0"
          aria-live="polite"
          @scroll.passive="syncQuickStartFromScroll"
        >
          <article
            v-for="(item, index) in quickStartItems"
            :id="`quickstart-panel-${index}`"
            :key="item.packageName"
            class="code-panel quickstart-panel"
            :class="`quickstart-panel-${item.tone}`"
            role="tabpanel"
            :aria-labelledby="`quickstart-tab-${index}`"
            :aria-hidden="index !== activeQuickStartIndex"
          >
            <div class="code-toolbar">
              <span />
              <span />
              <span />
              <strong>{{ item.language }}</strong>
            </div>
            <pre><code
              class="hljs"
              :class="`language-${item.highlightLanguage}`"
              v-html="highlightSnippet(item.code, item.highlightLanguage)"
            ></code></pre>
          </article>
        </div>

        <div class="quickstart-footer">
          <span>{{ activeQuickStart.summary }}</span>
          <div class="quickstart-dots" aria-label="Quick start slides">
            <button
              v-for="(item, index) in quickStartItems"
              :key="`dot-${item.packageName}`"
              type="button"
              :class="{ 'is-active': index === activeQuickStartIndex }"
              :aria-label="`${isZh ? '切换到' : 'Show'} ${item.label}`"
              @click="selectQuickStart(index)"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="band architecture-section" aria-labelledby="full-delivery-title">
      <div class="section-heading compact">
        <p class="section-kicker">v{{ currentReleaseVersion }} Full delivery</p>
        <h2 id="full-delivery-title">
          {{ isZh ? 'Full 包现在怎样开箱即用？' : 'What does out-of-the-box Full mean now?' }}
        </h2>
        <p>
          {{ isZh
            ? '完整格式注册与静态资源交付是同一份契约：preset-all、Worker、WASM、字体、vendor 和资产清单都跟随 Full 包版本。'
            : 'Complete format registration and static delivery share one contract: preset-all, Workers, WASM, fonts, vendor files, and the asset manifest follow the Full package version.' }}
        </p>
      </div>
      <div class="capability-grid">
        <article v-for="item in fullPackageFaqs" :key="item.title" class="capability-card">
          <component :is="item.icon" :size="24" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
        </article>
      </div>
    </section>

    <section id="docs" class="band docs-section" aria-labelledby="docs-title">
      <div class="section-heading compact">
        <p class="section-kicker">Documentation</p>
        <h2 id="docs-title">{{ currentCopy.docsTitle }}</h2>
        <p>{{ currentCopy.docsIntro }}</p>
      </div>
      <div class="docs-quick-nav" aria-label="Documentation shortcuts">
        <a :href="localizedDocsQuickstartUrl" target="_blank" rel="noreferrer">{{ isZh ? '快速开始' : 'Quickstart' }}</a>
        <a :href="resolveLocalizedDocsUrl('guide/on-demand-renderers')" target="_blank" rel="noreferrer">{{ isZh ? '按需装配' : 'On-demand' }}</a>
        <a :href="resolveLocalizedDocsUrl('guide/formats')" target="_blank" rel="noreferrer">{{ isZh ? '支持格式' : 'Formats' }}</a>
        <a :href="resolveLocalizedDocsUrl('guide/usage')" target="_blank" rel="noreferrer">{{ isZh ? '组件参数' : 'Options' }}</a>
        <a :href="resolveLocalizedDocsUrl('guide/distribution')" target="_blank" rel="noreferrer">{{ isZh ? '部署分发' : 'Distribution' }}</a>
      </div>
      <div ref="docsFrame" class="docs-frame-card">
        <div class="demo-browser-bar">
          <span />
          <span />
          <span />
          <strong>doc.file-viewer.app / guide / quickstart</strong>
        </div>
        <iframe
          v-if="docsFrameMounted"
          :key="`docs-${locale}`"
          :src="localizedDocsQuickstartUrl"
          :title="isZh ? 'File Viewer 快速开始文档' : 'File Viewer quickstart documentation'"
          loading="lazy"
        ></iframe>
        <div v-else class="demo-frame-placeholder docs-frame-placeholder">
          <BookOpen :size="28" />
          <strong>{{ isZh ? '快速开始文档' : 'Quickstart docs' }}</strong>
          <span>{{ isZh ? '官方文档即将加载' : 'Documentation loading' }}</span>
        </div>
      </div>
    </section>

    <section class="band architecture-section" aria-labelledby="architecture-title">
      <div class="section-heading compact">
        <p class="section-kicker">Architecture</p>
        <h2 id="architecture-title">{{ isZh ? '架构边界清晰，长期维护才稳。' : 'Clear boundaries keep the project maintainable.' }}</h2>
        <p>{{ isZh ? 'core、renderer、preset、组件包和静态资产各司其职，避免把框架、重型引擎或资源路径揉进同一个入口。' : 'Core, renderers, presets, component packages, and static assets stay separated so framework code, heavy engines, and resource paths do not collapse into one entry point.' }}</p>
      </div>
      <div class="capability-grid">
        <article v-for="capability in capabilities" :key="capability.title" class="capability-card">
          <component :is="capability.icon" :size="24" />
          <h3>{{ capability.title }}</h3>
          <p>{{ capability.detail }}</p>
        </article>
      </div>
    </section>

    <section id="commercial" class="commercial-section" aria-labelledby="commercial-title">
      <div class="commercial-heading">
        <div>
          <p class="section-kicker">Commercial edition</p>
          <h2 id="commercial-title">{{ currentCopy.commercialTitle }}</h2>
          <p>{{ currentCopy.commercialIntro }}</p>
        </div>
        <div class="commercial-heading-actions">
          <a class="button primary" :href="commercialUrl" target="_blank" rel="noreferrer">
            <span>{{ currentCopy.commercialCta }}</span>
            <ShoppingCart :size="18" />
          </a>
          <a class="button secondary" :href="commercialDemoUrl" target="_blank" rel="noreferrer">
            <span>{{ isZh ? '商业版 Demo' : 'Commercial Demo' }}</span>
            <ExternalLink :size="18" />
          </a>
        </div>
      </div>

      <div class="commercial-summary-grid" aria-label="Edition summary">
        <article class="commercial-summary-card open-source-card">
          <span>{{ isZh ? '免费开源组件' : 'Open-source component' }}</span>
          <strong>{{ isZh ? '多格式覆盖，前端原生，Apache-2.0' : 'Multi-format, browser-native, Apache-2.0' }}</strong>
          <p>{{ isZh ? '适合业务附件中心、内网预览、轻量集成和需要私有化部署的通用文件查看。' : 'Best for attachment centers, intranet preview, lightweight integration, and self-hosted general file viewing.' }}</p>
        </article>
        <article class="commercial-summary-card pro-card">
          <span>{{ isZh ? '商业版 Office 引擎' : 'Commercial Office engine' }}</span>
          <strong>{{ isZh ? '替换 Office 能力，获得 file-viewer-pro 效果' : 'Replace Office capability for a file-viewer-pro experience' }}</strong>
          <p>{{ isZh ? '适合高还原合同、报表、演示稿、大文件、企业授权和需要优先技术支持的严肃场景。' : 'Best for high-fidelity contracts, reports, decks, large files, enterprise licensing, and priority support.' }}</p>
        </article>
      </div>

      <div class="commercial-comparison" :aria-label="isZh ? '免费版与商业版对比' : 'Open-source and commercial comparison'">
        <div class="comparison-row comparison-row-head" aria-hidden="true">
          <span>{{ isZh ? '维度' : 'Dimension' }}</span>
          <span>{{ isZh ? '免费 File Viewer 组件' : 'Open-source File Viewer' }}</span>
          <span>{{ isZh ? '商业版 / file-viewer-pro 路线' : 'Commercial / file-viewer-pro path' }}</span>
        </div>
        <article v-for="item in commercialComparison" :key="item.dimension" class="comparison-row">
          <div class="comparison-dimension">
            <component :is="item.icon" :size="22" />
            <strong>{{ item.dimension }}</strong>
          </div>
          <p>
            <span class="comparison-mobile-label">{{ isZh ? '免费组件' : 'Open source' }}</span>
            {{ item.openSource }}
          </p>
          <p class="comparison-pro">
            <span class="comparison-mobile-label">{{ isZh ? '商业版' : 'Commercial' }}</span>
            {{ item.commercial }}
          </p>
        </article>
      </div>

      <div class="commercial-route">
        <div class="route-copy">
          <p class="section-kicker">Replacement path</p>
          <h3>{{ isZh ? '不推翻现有接入，只替换 Office 引擎。' : 'Do not rebuild the integration. Replace the Office engine.' }}</h3>
          <p>{{ isZh ? '商业版交付时提供可插拔的 Office preset / renderer。业务保留 FileViewer 组件、主题、水印、工具栏、搜索、事件和其它格式能力，只把 Word、Excel、PowerPoint 的渲染链路切到商业引擎。' : 'Commercial delivery provides a pluggable Office preset or renderer set. The product keeps the FileViewer component, themes, watermarks, toolbar, search, events, and non-Office renderers while Word, Excel, and PowerPoint switch to the commercial engine.' }}</p>
        </div>
        <div class="route-steps">
          <article v-for="step in commercialRouteSteps" :key="step.label" class="route-step">
            <span>{{ step.label }}</span>
            <component :is="step.icon" :size="22" />
            <h4>{{ step.title }}</h4>
            <p>{{ step.detail }}</p>
          </article>
        </div>
        <div class="commercial-code-panel">
          <div class="code-toolbar">
            <span />
            <span />
            <span />
            <strong>{{ isZh ? '替换路线示例' : 'Replacement example' }}</strong>
          </div>
          <pre><code
            class="hljs language-typescript"
            v-html="highlightSnippet(commercialRouteCode, 'typescript')"
          ></code></pre>
          <p>{{ isZh ? '实际包名和交付方式以商业授权交付为准；这里展示的是稳定的 File Viewer preset 替换模式。' : 'The actual package name and delivery channel depend on the commercial license; this shows the stable File Viewer preset replacement pattern.' }}</p>
        </div>
      </div>

      <div class="commercial-grid commercial-feature-grid">
        <article v-for="item in commercialFeatures" :key="item.title" class="commercial-card">
          <component :is="item.icon" :size="24" />
          <h3>{{ item.title }}</h3>
          <p>{{ item.detail }}</p>
        </article>
      </div>
    </section>

    <section id="delivery" class="band portal-section" aria-labelledby="portal-title">
      <div class="section-heading compact">
        <p class="section-kicker">Portal</p>
        <h2 id="portal-title">{{ isZh ? '一个入口，找到所有必备站点。' : 'One portal for every essential destination.' }}</h2>
      </div>
      <div class="portal-grid">
        <a
          v-for="link in portalLinks"
          :key="link.href + link.label"
          class="portal-card"
          :class="{ 'primary-card': link.featured }"
          :href="link.href"
          target="_blank"
          rel="noreferrer"
        >
          <component :is="link.icon" :size="22" />
          <strong>{{ link.label }}</strong>
          <span>{{ link.note }}</span>
        </a>
      </div>
    </section>

    <section class="release-strip" aria-label="Downloads and deployment">
      <div>
        <p class="section-kicker">Ship anywhere</p>
        <h2>{{ currentCopy.releaseTitle }}</h2>
      </div>
      <div class="release-actions">
        <a :href="currentReleaseUrl" target="_blank" rel="noreferrer">
          <Download :size="19" />
          <span>v{{ currentReleaseVersion }} Release</span>
        </a>
        <a :href="githubUrl" target="_blank" rel="noreferrer">
          <GitHubMark />
          <span>GitHub</span>
        </a>
        <a :href="resolveLocalizedDocsUrl('guide/docker')" target="_blank" rel="noreferrer">
          <Wrench :size="19" />
          <span>Docker</span>
        </a>
      </div>
    </section>

    <footer id="support" class="support-footer">
      <div class="support-copy">
        <div class="footer-brand">
          <img src="/logo.png" alt="" />
          <strong>File Viewer</strong>
        </div>
        <h2>{{ currentCopy.supportTitle }}</h2>
        <p>{{ currentCopy.supportIntro }}</p>
        <div v-if="isZh" class="footer-links">
          <a :href="githubSponsorsUrl" target="_blank" rel="noreferrer">
            <HandCoins :size="16" />
            GitHub Sponsors
          </a>
          <a :href="domesticSponsorUrl" target="_blank" rel="noreferrer">
            <QrCode :size="16" />
            微信 / 支付宝
          </a>
          <a :href="prioritySupportUrl" target="_blank" rel="noreferrer">
            <HeartHandshake :size="16" />
            企业技术支持
          </a>
          <a :href="studioUrl" target="_blank" rel="noreferrer">
            <Rocket :size="16" />
            Flyfish Dev
          </a>
          <a :href="githubUrl" target="_blank" rel="noreferrer">
            <GitHubMark />
            GitHub
          </a>
        </div>
      </div>
      <div v-if="isZh" class="qr-grid">
        <article v-for="item in qrItems" :key="item.label" class="qr-card">
          <div class="qr-image">
            <img :src="item.image" :alt="item.label" loading="lazy" decoding="async" />
          </div>
          <strong>
            <QrCode :size="15" />
            {{ item.label }}
          </strong>
          <span>{{ item.note }}</span>
        </article>
      </div>
      <div v-else class="support-option-grid" aria-label="Ways to support File Viewer">
        <a
          v-for="item in englishSupportOptions"
          :key="item.label"
          class="support-option-card"
          :href="item.href"
          target="_blank"
          rel="noreferrer"
        >
          <span class="support-option-icon"><component :is="item.icon" :size="24" /></span>
          <span class="support-option-copy">
            <strong>{{ item.label }}</strong>
            <span>{{ item.note }}</span>
          </span>
          <ArrowRight class="support-option-arrow" :size="20" aria-hidden="true" />
        </a>
      </div>
      <div class="footer-bottom">
        <p>{{ currentCopy.footer }}</p>
      </div>
    </footer>
  </main>
</template>
