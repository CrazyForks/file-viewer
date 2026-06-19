<script setup lang="ts">
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
  Globe2,
  HandCoins,
  Layers3,
  LockKeyhole,
  Mail,
  MonitorPlay,
  PackageCheck,
  Radar,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Wrench
} from '@lucide/vue'

type LinkItem = {
  label: string
  href: string
  note: string
}

type MatrixItem = {
  title: string
  value: string
  detail: string
  color: string
}

type FormatGroup = {
  label: string
  count: string
  examples: string
  icon: unknown
  accent: string
}

type Scenario = {
  title: string
  summary: string
  icon: unknown
}

const primaryLinks: LinkItem[] = [
  {
    label: '在线 Demo',
    href: 'https://viewer.flyfish.dev/',
    note: '体验主预览器、样例矩阵、上传预览和文档比对'
  },
  {
    label: '官方文档',
    href: 'https://doc.flyfish-viewer.app/',
    note: '主文档域名，覆盖所有生态组件和部署方式'
  },
  {
    label: 'GitHub',
    href: 'https://github.com/flyfish-dev/file-viewer',
    note: '开源总仓库、Release 下载和源码入口'
  }
]

const resourceLinks: LinkItem[] = [
  {
    label: '备用文档域名',
    href: 'https://doc.flyfish.dev/',
    note: 'doc.flyfish.dev 继续保留作为辅助入口'
  },
  {
    label: '飞鱼小铺',
    href: 'https://dev.flyfish.group/shop',
    note: '打赏项目并获得优先技术支持'
  },
  {
    label: '飞鱼开源工作室',
    href: 'https://flyfish.dev/',
    note: '了解 Flyfish Dev 的开源产品与服务'
  },
  {
    label: '商业支持',
    href: 'https://dev.flyfish.group/shop',
    note: '私有化部署、优先排障和定制集成协助'
  }
]

const matrix: MatrixItem[] = [
  { title: '文件扩展名', value: '194+', detail: '业务附件常见格式集中覆盖', color: 'green' },
  { title: '预览链路', value: '23', detail: '按格式异步加载，首屏轻巧', color: 'blue' },
  { title: '生态组件', value: '8', detail: 'Vue、React、Web、jQuery、Svelte', color: 'violet' },
  { title: '部署形态', value: '4', detail: 'npm、Release、Docker、静态站', color: 'amber' }
]

const formatGroups: FormatGroup[] = [
  {
    label: 'Office 与版式文档',
    count: 'Word / Excel / PPT / PDF / OFD / Typst',
    examples: 'docx、doc、xlsx、xls、pptx、pdf、ofd、typ',
    icon: FileText,
    accent: 'emerald'
  },
  {
    label: '工程与设计资产',
    count: 'CAD / EDA / 3D / Drawings',
    examples: 'dwg、dxf、dwf、dwfx、olb、dra、step、stl、excalidraw、drawio',
    icon: Layers3,
    accent: 'cyan'
  },
  {
    label: '归档与沟通文件',
    count: 'Archives / Email / Ebooks',
    examples: 'zip、7z、rar、tar、eml、msg、mbox、epub、umd',
    icon: FileArchive,
    accent: 'orange'
  },
  {
    label: '代码、数据与媒体',
    count: 'Code / Data / Media / Geo',
    examples: 'md、json、ts、py、sqlite、parquet、mp4、mp3、geojson、kml',
    icon: FileCode2,
    accent: 'indigo'
  }
]

const scenarios: Scenario[] = [
  {
    title: 'OA 审批与合同归档',
    summary: 'PDF、Word、OFD、图片和压缩包都能在审批流中直接打开，减少下载和外部应用跳转。',
    icon: ShieldCheck
  },
  {
    title: '知识库与附件中心',
    summary: '让知识文档、表格、演示稿、代码片段和媒体附件在同一阅读体验中被检索、定位和复用。',
    icon: SearchCheck
  },
  {
    title: '工程图纸协同',
    summary: 'CAD/DWG/DXF/DWF、EDA 和 3D 模型进入浏览器，适合工程、制造和图纸审核场景。',
    icon: Radar
  },
  {
    title: '客服与工单平台',
    summary: '邮件、附件包、截图、录音和文档在线预览，支持快速判断问题来源和完整追踪。',
    icon: Mail
  },
  {
    title: '私有化与离线部署',
    summary: '前端静态资源即可运行，支持 npm、Docker、Release tarball 和内网静态站分发。',
    icon: LockKeyhole
  },
  {
    title: 'AI 文档工作台',
    summary: '搜索、高亮、定位、导出 HTML 和文本切片为溯源、向量化与知识提取留好接口。',
    icon: Sparkles
  }
]

const ecosystem = [
  '@file-viewer/core',
  '@file-viewer/vue3',
  '@file-viewer/vue2.7',
  '@file-viewer/react',
  '@file-viewer/web',
  '@file-viewer/jquery',
  '@file-viewer/svelte',
  '@flyfish-group/*'
]

const codeSample = `import FileViewer from '@file-viewer/vue3'

app.use(FileViewer)

<file-viewer
  url="/contracts/demo.pdf"
  :options="{
    theme: 'light',
    toolbar: { position: 'bottom-right' },
    watermark: { text: 'Internal Preview' }
  }"
/>`
</script>

<template>
  <main class="site-shell">
    <nav class="topbar" aria-label="主导航">
      <a class="brand" href="#top" aria-label="Flyfish File Viewer">
        <img src="/logo.png" alt="" />
        <span>Flyfish File Viewer</span>
      </a>
      <div class="topbar-links">
        <a href="#matrix">支持矩阵</a>
        <a href="#scenarios">应用落地</a>
        <a href="#ecosystem">生态组件</a>
        <a href="https://doc.flyfish-viewer.app/" target="_blank" rel="noreferrer">文档</a>
      </div>
      <a class="topbar-action" href="https://viewer.flyfish.dev/" target="_blank" rel="noreferrer">
        打开 Demo
        <ArrowRight :size="16" />
      </a>
    </nav>

    <section id="top" class="hero-section">
      <div class="hero-copy">
        <p class="eyebrow">
          <Sparkles :size="17" />
          Pure frontend file preview super component
        </p>
        <h1>One viewer. Every business file. Native in every framework.</h1>
        <p class="hero-subtitle">
          Flyfish File Viewer 把 Office、PDF、OFD、CAD、压缩包、邮件、电子书、代码、媒体、3D 和数据资产带进浏览器，
          以按需加载、专业版式和完整生态组件服务真实业务系统。
        </p>
        <div class="hero-actions">
          <a class="button primary" href="https://viewer.flyfish.dev/" target="_blank" rel="noreferrer">
            体验在线 Demo
            <MonitorPlay :size="18" />
          </a>
          <a class="button secondary" href="https://doc.flyfish-viewer.app/" target="_blank" rel="noreferrer">
            阅读官方文档
            <BookOpen :size="18" />
          </a>
        </div>
        <div class="hero-badges" aria-label="核心能力">
          <span><BadgeCheck :size="15" /> 194+ extensions</span>
          <span><PackageCheck :size="15" /> 23 lazy pipelines</span>
          <span><Cloud :size="15" /> Cloudflare ready</span>
        </div>
      </div>

      <div class="hero-visual" aria-label="Flyfish File Viewer product preview">
        <div class="visual-frame">
          <img class="hero-media" src="/home-hero-premium.webp" alt="Business files previewed in layered browser panels" />
          <div class="floating-panel panel-a">
            <FileSpreadsheet :size="18" />
            Excel sheets stay readable
          </div>
          <div class="floating-panel panel-b">
            <Boxes :size="18" />
            CAD / Archive / Email
          </div>
        </div>
      </div>
    </section>

    <section id="matrix" class="metrics-band" aria-labelledby="matrix-title">
      <div class="section-heading">
        <p class="section-kicker">Coverage matrix</p>
        <h2 id="matrix-title">不是“能打开”，而是能交付。</h2>
        <p>面向业务附件的复杂性，从格式识别、懒加载、打印导出到多框架接入都保持同一套能力口径。</p>
      </div>
      <div class="metric-grid">
        <article v-for="item in matrix" :key="item.title" class="metric-card" :class="`metric-${item.color}`">
          <span>{{ item.title }}</span>
          <strong>{{ item.value }}</strong>
          <p>{{ item.detail }}</p>
        </article>
      </div>
    </section>

    <section class="format-section" aria-label="支持格式">
      <article v-for="group in formatGroups" :key="group.label" class="format-card" :class="`accent-${group.accent}`">
        <component :is="group.icon" :size="26" />
        <h3>{{ group.label }}</h3>
        <strong>{{ group.count }}</strong>
        <p>{{ group.examples }}</p>
      </article>
    </section>

    <section id="scenarios" class="scenario-section" aria-labelledby="scenarios-title">
      <div class="section-heading compact">
        <p class="section-kicker">In production</p>
        <h2 id="scenarios-title">落地在真正高频的业务工作台里。</h2>
      </div>
      <div class="scenario-grid">
        <article v-for="scenario in scenarios" :key="scenario.title" class="scenario-card">
          <component :is="scenario.icon" :size="24" />
          <h3>{{ scenario.title }}</h3>
          <p>{{ scenario.summary }}</p>
        </article>
      </div>
    </section>

    <section id="ecosystem" class="ecosystem-section" aria-labelledby="ecosystem-title">
      <div class="ecosystem-copy">
        <p class="section-kicker">Native components</p>
        <h2 id="ecosystem-title">Core 是底座，上层是生产可用组件。</h2>
        <p>
          Core 专注纯 TypeScript 预览能力和 API；Vue、React、Web、jQuery、Svelte 等生态组件负责原生状态管理、事件、类型和交互体验。
          iframe 只是可参考的集成方式，不再是核心路径。
        </p>
        <div class="ecosystem-tags">
          <span v-for="item in ecosystem" :key="item">{{ item }}</span>
        </div>
      </div>
      <div class="code-panel" aria-label="Vue usage example">
        <div class="code-toolbar">
          <span />
          <span />
          <span />
          <strong>native component</strong>
        </div>
        <pre><code>{{ codeSample }}</code></pre>
      </div>
    </section>

    <section class="portal-section" aria-labelledby="portal-title">
      <div class="section-heading compact">
        <p class="section-kicker">Portal</p>
        <h2 id="portal-title">一个入口，找到所有必备站点。</h2>
      </div>
      <div class="portal-grid">
        <a v-for="link in primaryLinks" :key="link.href" class="portal-card primary-card" :href="link.href" target="_blank" rel="noreferrer">
          <Globe2 :size="22" />
          <strong>{{ link.label }}</strong>
          <span>{{ link.note }}</span>
        </a>
        <a v-for="link in resourceLinks" :key="link.href" class="portal-card" :href="link.href" target="_blank" rel="noreferrer">
          <template v-if="link.label.includes('小铺')">
            <HandCoins :size="22" />
          </template>
          <template v-else-if="link.label.includes('商业')">
            <Building2 :size="22" />
          </template>
          <template v-else-if="link.label.includes('工作室')">
            <FolderGit2 :size="22" />
          </template>
          <template v-else>
            <BookOpen :size="22" />
          </template>
          <strong>{{ link.label }}</strong>
          <span>{{ link.note }}</span>
        </a>
      </div>
    </section>

    <section class="release-strip" aria-label="下载与部署">
      <div>
        <p class="section-kicker">Ship anywhere</p>
        <h2>npm、GitHub Release、Docker 和静态部署都准备好了。</h2>
      </div>
      <div class="release-actions">
        <a href="https://github.com/flyfish-dev/file-viewer/releases" target="_blank" rel="noreferrer">
          <Download :size="18" />
          Release 下载
        </a>
        <a href="https://github.com/flyfish-dev/file-viewer" target="_blank" rel="noreferrer">
          <FolderGit2 :size="18" />
          开源总仓库
        </a>
        <a href="https://doc.flyfish-viewer.app/guide/docker" target="_blank" rel="noreferrer">
          <Wrench :size="18" />
          Docker 部署
        </a>
      </div>
    </section>

    <footer class="footer">
      <div>
        <img src="/logo.png" alt="" />
        <strong>Flyfish File Viewer</strong>
      </div>
      <p>Released under Apache-2.0. Built by Flyfish Dev for teams who need reliable browser-native document preview.</p>
      <a href="https://flyfish.dev/" target="_blank" rel="noreferrer">
        <Rocket :size="16" />
        flyfish.dev
      </a>
    </footer>
  </main>
</template>
