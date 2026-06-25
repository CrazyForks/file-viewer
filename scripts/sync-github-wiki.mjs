import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const docsRoot = join(sourceRoot, 'docs')
const defaultWikiDir = resolve(sourceRoot, '..', 'file-viewer.wiki')
const wikiDir = resolve(process.env.FILE_VIEWER_WIKI_DIR || defaultWikiDir)
const wikiRemote = process.env.FILE_VIEWER_WIKI_REMOTE || 'https://github.com/flyfish-dev/file-viewer.wiki.git'
const shouldPush = process.argv.includes('--push')
const noClone = process.argv.includes('--no-clone')

const pages = [
  { source: 'index.md', file: 'Docs-Home.md', title: '文档首页', group: '中文文档' },
  { source: 'guide/index.md', file: 'Guide.md', title: '文档导览', group: '中文文档' },
  { source: 'guide/overview.md', file: 'Overview.md', title: '概述', group: '中文文档' },
  { source: 'guide/quickstart.md', file: 'Quickstart.md', title: '快速开始', group: '中文文档' },
  { source: 'guide/quickstart-web.md', file: 'Vanilla-JS.md', title: '纯 JS / Script 标签', group: '生态接入' },
  { source: 'guide/quickstart-vue3.md', file: 'Vue3.md', title: 'Vue 3', group: '生态接入' },
  { source: 'guide/quickstart-vue2.md', file: 'Vue2.md', title: 'Vue 2.7 / 2.6', group: '生态接入' },
  { source: 'guide/quickstart-react.md', file: 'React.md', title: 'React', group: '生态接入' },
  { source: 'guide/quickstart-svelte.md', file: 'Svelte.md', title: 'Svelte', group: '生态接入' },
  { source: 'guide/ecosystem.md', file: 'Ecosystem.md', title: '生态组件总览', group: '生态接入' },
  { source: 'guide/usage.md', file: 'Usage.md', title: '组件用法与 API', group: '生态接入' },
  { source: 'guide/on-demand-renderers.md', file: 'On-Demand-Renderers.md', title: '模块化与按需装配', group: '架构与能力' },
  { source: 'guide/formats.md', file: 'Supported-Formats.md', title: '支持格式', group: '架构与能力' },
  { source: 'guide/format-fidelity.md', file: 'Format-Fidelity.md', title: '格式完整度', group: '架构与能力' },
  { source: 'guide/compare.md', file: 'Comparison.md', title: '方案对比', group: '架构与能力' },
  { source: 'guide/demo.md', file: 'Demo.md', title: 'Demo 说明', group: '交付与运营' },
  { source: 'guide/development.md', file: 'Development.md', title: '本地开发', group: '交付与运营' },
  { source: 'guide/docker.md', file: 'Docker.md', title: 'Docker 部署', group: '交付与运营' },
  { source: 'guide/distribution.md', file: 'Distribution.md', title: '发布与分发', group: '交付与运营' },
  { source: 'guide/faq.md', file: 'FAQ.md', title: '常见问题', group: '交付与运营' },
  { source: 'changelog.md', file: 'Changelog.md', title: '更新日志', group: '交付与运营' },
  { source: 'donate.md', file: 'Sponsor.md', title: '捐赠与支持', group: '交付与运营' },
  { source: 'en/index.md', file: 'EN-Docs-Home.md', title: 'Docs Home', group: 'English Docs' },
  { source: 'en/guide/index.md', file: 'EN-Guide.md', title: 'Guide', group: 'English Docs' },
  { source: 'en/guide/overview.md', file: 'EN-Overview.md', title: 'Overview', group: 'English Docs' },
  { source: 'en/guide/quickstart.md', file: 'EN-Quickstart.md', title: 'Quickstart', group: 'English Docs' },
  { source: 'en/guide/quickstart-web.md', file: 'EN-Vanilla-JS.md', title: 'Vanilla JS / Script Tag', group: 'English Ecosystem' },
  { source: 'en/guide/quickstart-vue3.md', file: 'EN-Vue3.md', title: 'Vue 3', group: 'English Ecosystem' },
  { source: 'en/guide/quickstart-vue2.md', file: 'EN-Vue2.md', title: 'Vue 2.7 / 2.6', group: 'English Ecosystem' },
  { source: 'en/guide/quickstart-react.md', file: 'EN-React.md', title: 'React', group: 'English Ecosystem' },
  { source: 'en/guide/quickstart-svelte.md', file: 'EN-Svelte.md', title: 'Svelte', group: 'English Ecosystem' },
  { source: 'en/guide/ecosystem.md', file: 'EN-Ecosystem.md', title: 'Ecosystem Packages', group: 'English Ecosystem' },
  { source: 'en/guide/usage.md', file: 'EN-Usage.md', title: 'Usage And API', group: 'English Ecosystem' },
  { source: 'en/guide/on-demand-renderers.md', file: 'EN-On-Demand-Renderers.md', title: 'Modular Assembly', group: 'English Capability' },
  { source: 'en/guide/formats.md', file: 'EN-Supported-Formats.md', title: 'Supported Formats', group: 'English Capability' },
  { source: 'en/guide/format-fidelity.md', file: 'EN-Format-Fidelity.md', title: 'Format Fidelity', group: 'English Capability' },
  { source: 'en/guide/compare.md', file: 'EN-Comparison.md', title: 'Comparison', group: 'English Capability' },
  { source: 'en/guide/demo.md', file: 'EN-Demo.md', title: 'Demo Guide', group: 'English Delivery' },
  { source: 'en/guide/development.md', file: 'EN-Development.md', title: 'Local Development', group: 'English Delivery' },
  { source: 'en/guide/docker.md', file: 'EN-Docker.md', title: 'Docker Deployment', group: 'English Delivery' },
  { source: 'en/guide/distribution.md', file: 'EN-Distribution.md', title: 'Distribution', group: 'English Delivery' },
  { source: 'en/guide/faq.md', file: 'EN-FAQ.md', title: 'FAQ', group: 'English Delivery' }
]

const pageByRoute = new Map([
  ['/', 'Docs-Home'],
  ['/index', 'Docs-Home'],
  ['/guide', 'Guide'],
  ['/guide/', 'Guide'],
  ['/guide/index', 'Guide'],
  ['/changelog', 'Changelog'],
  ['/donate', 'Sponsor'],
  ['/en', 'EN-Docs-Home'],
  ['/en/', 'EN-Docs-Home'],
  ['/en/index', 'EN-Docs-Home'],
  ['/en/guide', 'EN-Guide'],
  ['/en/guide/', 'EN-Guide'],
  ['/en/guide/index', 'EN-Guide'],
  ...pages.map(page => {
    const route = `/${page.source.replace(/\.md$/, '').replace(/\/index$/, '')}`
    return [route, page.file.replace(/\.md$/, '')]
  })
])

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(`Command failed: ${command} ${args.join(' ')}${output ? `\n${output}` : ''}`)
  }
  return options.capture ? (result.stdout || '').trim() : ''
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || sourceRoot,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit'
  })
  return {
    ok: result.status === 0,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim()
  }
}

function ensureWikiRepo() {
  if (existsSync(join(wikiDir, '.git'))) {
    const existingStatus = run('git', ['status', '--porcelain'], { cwd: wikiDir, capture: true })
    if (existingStatus) {
      throw new Error(
        `GitHub Wiki checkout has uncommitted changes at ${wikiDir}. Commit or clean them before syncing.`
      )
    }
    const remote = tryRun('git', ['ls-remote', '--exit-code', 'origin', 'HEAD'], { cwd: wikiDir, capture: true })
    if (!remote.ok) {
      console.warn('[wiki] Remote Wiki repository is not initialized yet; updating the local Wiki checkout only.')
      return
    }
    run('git', ['fetch', 'origin'], { cwd: wikiDir })
    run('git', ['checkout', 'master'], { cwd: wikiDir })
    const pull = tryRun('git', ['pull', '--ff-only', 'origin', 'master'], { cwd: wikiDir })
    if (!pull.ok) {
      console.warn('[wiki] Local Wiki history differs from the initialized remote; resetting local generated Wiki checkout to origin/master.')
      run('git', ['reset', '--hard', 'origin/master'], { cwd: wikiDir })
    }
    return
  }

  mkdirSync(dirname(wikiDir), { recursive: true })
  if (!noClone) {
    const clone = tryRun('git', ['clone', wikiRemote, wikiDir])
    if (clone.ok) {
      return
    }
    console.warn(`[wiki] Clone failed, initializing a first Wiki checkout locally: ${clone.stderr || clone.stdout}`)
  }

  mkdirSync(wikiDir, { recursive: true })
  run('git', ['init', '-b', 'master'], { cwd: wikiDir })
  run('git', ['remote', 'add', 'origin', wikiRemote], { cwd: wikiDir })
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, '')
}

function wikiPageName(pageFile) {
  return pageFile.replace(/\.md$/, '')
}

function rewriteDocLink(target) {
  if (/^(https?:|mailto:|#)/.test(target)) {
    return target
  }

  const [pathPart, hashPart] = target.split('#')
  const normalized = pathPart
    .replace(/\.md$/, '')
    .replace(/\/index$/, '')
    .replace(/\/$/, '') || '/'
  const route = normalized.startsWith('/') ? normalized : `/${normalized}`
  const pageName = pageByRoute.get(route)
  if (!pageName) {
    return target
  }
  return hashPart ? `${pageName}#${hashPart}` : pageName
}

function transformMarkdown(markdown, page) {
  let output = stripFrontmatter(markdown)
  output = output.replace(/\]\((\/[^)\s]+)(#[^)]+)?\)/g, (_match, pathPart, hashPart = '') => {
    const rewritten = rewriteDocLink(`${pathPart}${hashPart}`)
    return `](${rewritten})`
  })
  output = output.replace(/href="(\/[^"#]+)(#[^"]*)?"/g, (_match, pathPart, hashPart = '') => {
    const rewritten = rewriteDocLink(`${pathPart}${hashPart}`)
    return `href="${rewritten}"`
  })
  output = output.replace(/src="\/_media\//g, 'src="https://doc.file-viewer.app/_media/')
  output = output.replace(/]\(\/_media\//g, '](https://doc.file-viewer.app/_media/')
  return [
    `<!-- Generated from docs/${page.source}. Edit the source docs, then run pnpm docs:wiki:sync. -->`,
    '',
    output.trim(),
    ''
  ].join('\n')
}

function writeIfChanged(filePath, content) {
  if (existsSync(filePath) && readFileSync(filePath, 'utf8') === content) {
    return false
  }
  writeFileSync(filePath, content)
  return true
}

function readDocsPage(page) {
  const sourcePath = join(docsRoot, page.source)
  if (!existsSync(sourcePath)) {
    throw new Error(`Missing docs source: docs/${page.source}`)
  }
  return readFileSync(sourcePath, 'utf8')
}

function buildHome() {
  return `# Flyfish Viewer Documentation

Browser-native file preview infrastructure for internal tools, intranet systems, private deployments, and business attachment centers.

## Start here

- [中文文档首页](Docs-Home)
- [快速开始](Quickstart)
- [支持格式](Supported-Formats)
- [生态组件总览](Ecosystem)
- [发布与分发](Distribution)
- [English documentation](EN-Docs-Home)

## Official links

- [Official site](https://file-viewer.app)
- [Documentation site](https://doc.file-viewer.app)
- [Live demo](https://demo.file-viewer.app)
- [GitHub repository](https://github.com/flyfish-dev/file-viewer)
- [npm packages](https://www.npmjs.com/org/file-viewer)

This Wiki mirrors the main documentation for GitHub readers. The VitePress documentation site remains the canonical polished documentation experience.
`
}

function buildSidebar() {
  const groups = new Map()
  for (const page of pages) {
    if (!groups.has(page.group)) {
      groups.set(page.group, [])
    }
    groups.get(page.group).push(page)
  }

  const lines = [
    '# Flyfish Viewer',
    '',
    '- [Home](Home)',
    '- [Official Docs](https://doc.file-viewer.app)',
    '- [Live Demo](https://demo.file-viewer.app)',
    ''
  ]
  for (const [group, groupPages] of groups) {
    lines.push(`## ${group}`)
    for (const page of groupPages) {
      lines.push(`- [${page.title}](${wikiPageName(page.file)})`)
    }
    lines.push('')
  }
  return `${lines.join('\n').trim()}\n`
}

function buildFooter() {
  return [
    'Flyfish Viewer · [Official site](https://file-viewer.app) · [Docs](https://doc.file-viewer.app) · [Demo](https://demo.file-viewer.app) · [GitHub](https://github.com/flyfish-dev/file-viewer)',
    ''
  ].join('\n')
}

ensureWikiRepo()

mkdirSync(wikiDir, { recursive: true })
writeIfChanged(join(wikiDir, 'Home.md'), buildHome())
writeIfChanged(join(wikiDir, '_Sidebar.md'), buildSidebar())
writeIfChanged(join(wikiDir, '_Footer.md'), buildFooter())

for (const page of pages) {
  const markdown = transformMarkdown(readDocsPage(page), page)
  writeIfChanged(join(wikiDir, page.file), markdown)
}

const status = run('git', ['status', '--short'], { cwd: wikiDir, capture: true })
if (!status) {
  if (shouldPush) {
    const localHead = run('git', ['rev-parse', 'HEAD'], { cwd: wikiDir, capture: true })
    const remoteHeadResult = tryRun('git', ['rev-parse', 'origin/master'], { cwd: wikiDir, capture: true })
    if (!remoteHeadResult.ok || remoteHeadResult.stdout !== localHead) {
      run('git', ['push', 'origin', 'master'], { cwd: wikiDir })
    } else {
      console.log(`GitHub Wiki is already up to date at ${wikiDir}`)
    }
  } else {
    console.log(`GitHub Wiki is already up to date at ${wikiDir}`)
  }
  process.exit(0)
}

console.log(status)
run('git', ['add', '-A'], { cwd: wikiDir })
const commitMessage = `docs: sync wiki documentation from ${basename(sourceRoot)}`
run('git', ['commit', '-m', commitMessage], { cwd: wikiDir })

if (shouldPush) {
  run('git', ['push', 'origin', 'master'], { cwd: wikiDir })
} else {
  console.log(`Wiki changes committed locally at ${wikiDir}. Run with --push to publish.`)
}
