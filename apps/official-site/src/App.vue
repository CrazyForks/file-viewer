<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Boxes,
  Building2,
  Cloud,
  Download,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  FileText,
  FolderGit2,
  HandCoins,
  Languages,
  Layers3,
  LockKeyhole,
  Mail,
  MonitorPlay,
  PackageCheck,
  PanelTop,
  Radar,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wrench
} from '@lucide/vue'

type Locale = 'zh' | 'en'

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

const docsUrl = 'https://doc.file-viewer.app/'
const demoUrl = 'https://demo.file-viewer.app/'
const compareUrl = 'https://demo.file-viewer.app/compare.html'
const githubUrl = 'https://github.com/flyfish-dev/file-viewer'
const shopUrl = 'https://dev.flyfish.group/shop'
const studioUrl = 'https://flyfish.dev/'

const locale = ref<Locale>('zh')
const isZh = computed(() => locale.value === 'zh')
const nextLocaleLabel = computed(() => (isZh.value ? 'EN' : '中文'))

const copy = {
  zh: {
    nav: {
      formats: '支持矩阵',
      solutions: '应用落地',
      ecosystem: '生态组件',
      delivery: '部署分发',
      docs: '文档',
      demo: '打开 Demo'
    },
    hero: {
      eyebrow: '浏览器原生文件预览超级组件',
      title: '一个组件，预览业务系统里的每一种关键文件。',
      subtitle:
        'Flyfish File Viewer 将 Office、PDF、OFD、CAD、压缩包、邮件、电子书、代码、媒体、3D 与数据资产带进浏览器。它以纯 TypeScript core 为底座，提供 Vue、React、Web、jQuery、Svelte 等生产可用组件，并保持按需加载、高保真版式、搜索定位、缩放、打印、导出和私有化部署能力一致。',
      primary: '立即体验',
      secondary: '阅读文档',
      proof: ['194+ 扩展名', '23 条懒加载链路', '8 个生态组件包', 'Apache-2.0 开源']
    },
    matrixTitle: '覆盖广，不等于粗糙。每条链路都面向真实业务。',
    matrixIntro:
      '格式识别、资源加载、Worker/WASM、主题、水印、搜索、缩放、打印和导出都由预览器内部统一适配，业务侧只需要把文件交给组件。',
    formatsTitle: '支持矩阵',
    solutionsTitle: '适合长期运行在企业系统里',
    solutionsIntro:
      '从 OA 审批到工程图纸，从客服工单到 AI 文档工作台，File Viewer 更关注真实文件、复杂网络、私有化部署和用户每天都会遇到的细节。',
    ecosystemTitle: 'Core 负责底层预览能力，生态包负责原生体验。',
    ecosystemIntro:
      '新的 2.x 架构不再以 iframe 作为核心路径。每个标准组件都只依赖 @file-viewer/core，并提供对应生态里的 props、hooks、ref/controller、事件和完整类型。',
    architectureTitle: '清晰架构，轻量首屏，复杂能力按需加载。',
    architectureIntro:
      '首屏只加载壳层与当前文件所需 renderer。Office、CAD、PDF、Typst、压缩包和媒体链路在命中格式后异步加载，避免业务系统被一次性大包拖慢。',
    portalTitle: '一个入口，找到所有必备站点。',
    releaseTitle: '从 npm 到静态部署，交付方式都准备好了。',
    footer:
      'Apache-2.0 开源。由 Flyfish Dev 持续维护，适合需要可靠浏览器原生文件预览的产品团队。'
  },
  en: {
    nav: {
      formats: 'Format Matrix',
      solutions: 'Use Cases',
      ecosystem: 'Components',
      delivery: 'Delivery',
      docs: 'Docs',
      demo: 'Open Demo'
    },
    hero: {
      eyebrow: 'Browser-native file preview super component',
      title: 'One component for every critical business file.',
      subtitle:
        'Flyfish File Viewer brings Office, PDF, OFD, CAD, archives, email, ebooks, code, media, 3D models, and data assets into the browser. A framework-neutral TypeScript core powers production-ready Vue, React, Web, jQuery, and Svelte components with lazy loading, high-fidelity layout, search, zoom, print, export, watermark, and self-hosted deployment built in.',
      primary: 'Try the Demo',
      secondary: 'Read the Docs',
      proof: ['194+ extensions', '23 lazy pipelines', '8 component packages', 'Apache-2.0 open source']
    },
    matrixTitle: 'Broad coverage, without treating fidelity as optional.',
    matrixIntro:
      'Format detection, assets, Worker/WASM loading, themes, watermarking, search, zoom, print, and export are adapted inside the viewer so applications can hand over the file and keep moving.',
    formatsTitle: 'Format matrix',
    solutionsTitle: 'Built for long-running enterprise workspaces',
    solutionsIntro:
      'From approvals to engineering drawings, support tickets, and AI document workflows, File Viewer focuses on real files, private networks, self-hosted delivery, and the details users meet every day.',
    ecosystemTitle: 'Core owns preview capability. Components own native framework experience.',
    ecosystemIntro:
      'The 2.x architecture no longer treats iframe integration as the primary path. Every standard component depends only on @file-viewer/core and exposes idiomatic props, hooks, refs/controllers, events, and complete types for its ecosystem.',
    architectureTitle: 'Clear architecture, light first load, heavy renderers on demand.',
    architectureIntro:
      'The shell loads first, then only the renderer needed by the current file. Office, CAD, PDF, Typst, archives, and media pipelines are lazy-loaded when matched so host applications stay responsive.',
    portalTitle: 'One portal for every essential destination.',
    releaseTitle: 'From npm to static deployment, distribution is ready.',
    footer:
      'Apache-2.0 open source. Maintained by Flyfish Dev for product teams that need reliable browser-native file preview.'
  }
} satisfies Record<Locale, Record<string, any>>

const metrics = computed<MetricItem[]>(() =>
  isZh.value
    ? [
        { title: '文件扩展名', value: '194+', detail: '覆盖业务附件、工程资产、媒体与数据文件', tone: 'green' },
        { title: '预览链路', value: '23', detail: '按格式异步加载，避免首屏被拖慢', tone: 'blue' },
        { title: '生态组件', value: '8', detail: 'Vue、React、Web、jQuery、Svelte 全线可用', tone: 'violet' },
        { title: '分发形态', value: '4', detail: 'npm、Release、Docker、静态资源私有化', tone: 'amber' }
      ]
    : [
        { title: 'Extensions', value: '194+', detail: 'Business attachments, engineering files, media, and data assets', tone: 'green' },
        { title: 'Pipelines', value: '23', detail: 'Lazy renderer loading by matched file type', tone: 'blue' },
        { title: 'Components', value: '8', detail: 'Vue, React, Web, jQuery, and Svelte packages', tone: 'violet' },
        { title: 'Delivery paths', value: '4', detail: 'npm, GitHub Release, Docker, and static self-hosting', tone: 'amber' }
      ]
)

const formatGroups = computed<FormatGroup[]>(() =>
  isZh.value
    ? [
        {
          label: 'Office 与版式文档',
          count: 'Word / Excel / PPT / PDF / OFD / Typst',
          examples: 'docx、doc、xlsx、xls、pptx、pdf、ofd、typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: '工程与设计资产',
          count: 'CAD / EDA / 3D / Drawings',
          examples: 'dwg、dxf、dwf、dwfx、olb、dra、step、stl、excalidraw、drawio',
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
          examples: 'docx, doc, xlsx, xls, pptx, pdf, ofd, typ',
          icon: FileText,
          tone: 'emerald'
        },
        {
          label: 'Engineering and design assets',
          count: 'CAD / EDA / 3D / Drawings',
          examples: 'dwg, dxf, dwf, dwfx, olb, dra, step, stl, excalidraw, drawio',
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
        { title: '低耦合组件生态', detail: 'Vue、React、Web、jQuery、Svelte 组件均只依赖 core，不互相嵌套实现。', icon: Boxes }
      ]
    : [
        { title: 'Unified search and anchors', detail: 'Ctrl/Command + F opens focused search with highlights, next/previous navigation, and reusable page/line anchors.', icon: SearchCheck },
        { title: 'High-fidelity print and export', detail: 'PDF, Word, Markdown, images, and other printable renderers expose print and HTML export only when the output is trustworthy.', icon: Download },
        { title: 'Theme and watermark options', detail: 'light, dark, and system themes are controlled by options; text and image watermarks use one contract.', icon: PanelTop },
        { title: 'Decoupled component ecosystem', detail: 'Vue, React, Web, jQuery, and Svelte packages depend only on core and do not nest framework implementations.', icon: Boxes }
      ]
)

const portalLinks = computed<LinkItem[]>(() =>
  isZh.value
    ? [
        { label: '在线 Demo', href: demoUrl, note: '体验主预览器、上传预览和完整样例矩阵', icon: MonitorPlay, featured: true },
        { label: '官方文档', href: docsUrl, note: 'doc.file-viewer.app，接入、格式、部署与 API', icon: BookOpen, featured: true },
        { label: '文档比对', href: compareUrl, note: '左右并排预览、同步滚动、搜索定位', icon: PanelTop, featured: true },
        { label: 'GitHub 开源总仓', href: githubUrl, note: '源码、Release 下载、构建产物和 issue', icon: FolderGit2, featured: true },
        { label: 'npm 生态包', href: 'https://www.npmjs.com/search?q=%40file-viewer', note: '@file-viewer/* 标准组件与兼容包', icon: PackageCheck },
        { label: 'Docker 部署', href: `${docsUrl}guide/docker`, note: 'amd64 / arm64 一键部署文档与示例', icon: Cloud },
        { label: '飞鱼小铺', href: shopUrl, note: '打赏项目，并获得优先技术支持', icon: HandCoins },
        { label: '飞鱼开源工作室', href: studioUrl, note: '了解 Flyfish Dev 的产品与服务', icon: Building2 }
      ]
    : [
        { label: 'Live demo', href: demoUrl, note: 'Try the main viewer, uploads, and the full sample matrix', icon: MonitorPlay, featured: true },
        { label: 'Documentation', href: docsUrl, note: 'doc.file-viewer.app for integration, formats, deployment, and APIs', icon: BookOpen, featured: true },
        { label: 'Compare demo', href: compareUrl, note: 'Side-by-side preview with sync scroll, search, and anchors', icon: PanelTop, featured: true },
        { label: 'GitHub monorepo', href: githubUrl, note: 'Source, releases, artifacts, and issues', icon: FolderGit2, featured: true },
        { label: 'npm packages', href: 'https://www.npmjs.com/search?q=%40file-viewer', note: '@file-viewer/* standard components and compatibility aliases', icon: PackageCheck },
        { label: 'Docker deployment', href: `${docsUrl}guide/docker`, note: 'amd64 / arm64 deployment for docs and examples', icon: Cloud },
        { label: 'Support shop', href: shopUrl, note: 'Sponsor the project and receive priority technical support', icon: HandCoins },
        { label: 'Flyfish Dev', href: studioUrl, note: 'Explore Flyfish Dev products and services', icon: Building2 }
      ]
)

const ecosystem = [
  '@file-viewer/core',
  '@file-viewer/vue3',
  '@file-viewer/vue2.7',
  '@file-viewer/vue2.6',
  '@file-viewer/react',
  '@file-viewer/react-legacy',
  '@file-viewer/web',
  '@file-viewer/jquery',
  '@file-viewer/svelte'
]

const codeSample = computed(() =>
  isZh.value
    ? `import FileViewer from '@file-viewer/vue3'

app.use(FileViewer)

<file-viewer
  url="/contracts/demo.pdf"
  :options="{
    theme: 'light',
    toolbar: { position: 'bottom-right', zoom: true },
    watermark: { text: 'Internal Preview' }
  }"
/>`
    : `import FileViewer from '@file-viewer/vue3'

app.use(FileViewer)

<file-viewer
  url="/contracts/demo.pdf"
  :options="{
    theme: 'light',
    toolbar: { position: 'bottom-right', zoom: true },
    watermark: { text: 'Internal Preview' }
  }"
/>`
)

const currentCopy = computed(() => copy[locale.value])

function toggleLocale() {
  locale.value = isZh.value ? 'en' : 'zh'
}
</script>

<template>
  <main class="site-shell" :lang="locale">
    <nav class="topbar" aria-label="Primary navigation">
      <a class="brand" href="#top" aria-label="Flyfish File Viewer">
        <img src="/logo.png" alt="" />
        <span>File Viewer</span>
      </a>
      <div class="topbar-links">
        <a href="#formats">{{ currentCopy.nav.formats }}</a>
        <a href="#solutions">{{ currentCopy.nav.solutions }}</a>
        <a href="#ecosystem">{{ currentCopy.nav.ecosystem }}</a>
        <a href="#delivery">{{ currentCopy.nav.delivery }}</a>
        <a :href="docsUrl" target="_blank" rel="noreferrer">{{ currentCopy.nav.docs }}</a>
      </div>
      <div class="topbar-actions">
        <button class="language-toggle" type="button" @click="toggleLocale">
          <Languages :size="16" />
          {{ nextLocaleLabel }}
        </button>
        <a class="topbar-action" :href="demoUrl" target="_blank" rel="noreferrer">
          {{ currentCopy.nav.demo }}
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
        <h1>{{ currentCopy.hero.title }}</h1>
        <p class="hero-subtitle">{{ currentCopy.hero.subtitle }}</p>
        <div class="hero-actions">
          <a class="button primary" :href="demoUrl" target="_blank" rel="noreferrer">
            {{ currentCopy.hero.primary }}
            <MonitorPlay :size="18" />
          </a>
          <a class="button secondary" :href="docsUrl" target="_blank" rel="noreferrer">
            {{ currentCopy.hero.secondary }}
            <BookOpen :size="18" />
          </a>
        </div>
        <div class="hero-badges" aria-label="Highlights">
          <span v-for="item in currentCopy.hero.proof" :key="item">
            <BadgeCheck :size="15" />
            {{ item }}
          </span>
        </div>
      </div>

      <div class="hero-visual" aria-label="Flyfish File Viewer product preview">
        <div class="visual-frame">
          <img class="hero-media" src="/home-hero-premium.webp" alt="Business files previewed in layered browser panels" />
          <div class="floating-panel panel-a">
            <FileSpreadsheet :size="18" />
            <span>{{ isZh ? '表格分页保持可读' : 'Readable spreadsheet tabs' }}</span>
          </div>
          <div class="floating-panel panel-b">
            <Boxes :size="18" />
            <span>{{ isZh ? 'CAD / 压缩包 / 邮件' : 'CAD / archives / email' }}</span>
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

    <section id="ecosystem" class="band ecosystem-section" aria-labelledby="ecosystem-title">
      <div class="ecosystem-copy">
        <p class="section-kicker">Native components</p>
        <h2 id="ecosystem-title">{{ currentCopy.ecosystemTitle }}</h2>
        <p>{{ currentCopy.ecosystemIntro }}</p>
        <div class="ecosystem-tags">
          <span v-for="item in ecosystem" :key="item">{{ item }}</span>
        </div>
      </div>
      <div class="code-panel" aria-label="Usage example">
        <div class="code-toolbar">
          <span />
          <span />
          <span />
          <strong>{{ isZh ? '原生组件接入' : 'native component' }}</strong>
        </div>
        <pre><code>{{ codeSample }}</code></pre>
      </div>
    </section>

    <section class="band architecture-section" aria-labelledby="architecture-title">
      <div class="section-heading compact">
        <p class="section-kicker">Architecture</p>
        <h2 id="architecture-title">{{ currentCopy.architectureTitle }}</h2>
        <p>{{ currentCopy.architectureIntro }}</p>
      </div>
      <div class="capability-grid">
        <article v-for="capability in capabilities" :key="capability.title" class="capability-card">
          <component :is="capability.icon" :size="24" />
          <h3>{{ capability.title }}</h3>
          <p>{{ capability.detail }}</p>
        </article>
      </div>
    </section>

    <section id="delivery" class="band portal-section" aria-labelledby="portal-title">
      <div class="section-heading compact">
        <p class="section-kicker">Portal</p>
        <h2 id="portal-title">{{ currentCopy.portalTitle }}</h2>
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
        <a href="https://github.com/flyfish-dev/file-viewer/releases" target="_blank" rel="noreferrer">
          <Download :size="18" />
          Release
        </a>
        <a :href="githubUrl" target="_blank" rel="noreferrer">
          <FolderGit2 :size="18" />
          GitHub
        </a>
        <a :href="`${docsUrl}guide/docker`" target="_blank" rel="noreferrer">
          <Wrench :size="18" />
          Docker
        </a>
      </div>
    </section>

    <footer class="footer">
      <div>
        <img src="/logo.png" alt="" />
        <strong>Flyfish File Viewer</strong>
      </div>
      <p>{{ currentCopy.footer }}</p>
      <a :href="studioUrl" target="_blank" rel="noreferrer">
        <Rocket :size="16" />
        Flyfish Dev
      </a>
    </footer>
  </main>
</template>
