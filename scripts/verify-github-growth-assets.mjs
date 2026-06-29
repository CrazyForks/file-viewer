import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const sourceRoot = resolve(scriptDir, '..')
const args = process.argv.slice(2)
const offline = args.includes('--offline')
const strictSocialPreview = args.includes('--strict-social-preview')

const requiredFiles = [
  'README.md',
  'README.en.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'CODE_OF_CONDUCT.md',
  'ROADMAP.md',
  'CHANGELOG.md',
  'RELEASE_TEMPLATE.md',
  'GITHUB_GROWTH_PLAYBOOK.md',
  'GITHUB_GROWTH_AUDIT.md',
  'GITHUB_SETTINGS_CHECKLIST.md',
  'TRAFFIC_TRACKING.md',
  'CONTENT_DISTRIBUTION_PLAN.md',
  '.github/FUNDING.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/compatibility.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/social-preview.svg',
  '.github/social-preview.png',
  'docs/guide/compare.md',
  'docs/en/guide/compare.md'
]

const desiredTopics = [
  'file-viewer',
  'document-viewer',
  'document-preview',
  'file-preview',
  'office-viewer',
  'pdf-viewer',
  'docx',
  'pptx',
  'xlsx',
  'cad-viewer',
  'dwg',
  'dxf',
  'vue',
  'react',
  'typescript',
  'web-components',
  'wasm',
  'offline-first',
  'self-hosted',
  'private-deployment'
]

const expectedDescription =
  'Browser-native Office / PDF / CAD / archive viewer for internal web apps, with Vue, React, Svelte, jQuery, Web Components, and no server-side conversion.'

const failures = []
const pass = message => console.log(`ok - ${message}`)
const fail = message => failures.push(message)

const assertFile = file => {
  if (existsSync(resolve(sourceRoot, file))) {
    pass(`${file} exists`)
  } else {
    fail(`${file} is missing`)
  }
}

const readText = async file => readFile(resolve(sourceRoot, file), 'utf8')

for (const file of requiredFiles) {
  assertFile(file)
}

const readme = await readText('README.md')
const readmeEn = await readText('README.en.md')
const demo = await readText('apps/viewer-demo/src/components/HelloWorld.vue')
const playbook = await readText('GITHUB_GROWTH_PLAYBOOK.md')

const requiredTextChecks = [
  [readme, '面向企业后台、内网和私有化系统的纯前端文件预览组件', 'Chinese README first-screen positioning'],
  [readme, '无需服务端转码', 'Chinese README no server-side conversion'],
  [readme, '当前内置 206 个扩展名映射和 24 条预览链路', 'Chinese README format evidence'],
  [readme, '按场景选择入口', 'Chinese README scenario entrances'],
  [readme, '尤其需要真实业务文件来验证兼容性', 'Chinese README compatibility feedback'],
  [readmeEn, 'browser-native file viewer for private and internal web apps', 'English README first-screen positioning'],
  [readmeEn, 'without server-side conversion', 'English README no server-side conversion'],
  [readmeEn, '206 extensions across 24 preview pipelines', 'English README format evidence'],
  [readmeEn, 'Choose By Scenario', 'English README scenario entrances'],
  [demo, '试试 Word 合同', 'Demo Word scenario shortcut'],
  [demo, '试试 DWG 图纸', 'Demo CAD scenario shortcut'],
  [demo, 'copySnippet', 'Demo copyable integration snippet'],
  [playbook, 'pnpm github:topics:update', 'Playbook has topics execution command'],
  [playbook, 'CONTENT_DISTRIBUTION_PLAN.md', 'Playbook links content distribution plan']
]

for (const [source, needle, label] of requiredTextChecks) {
  if (source.includes(needle)) {
    pass(label)
  } else {
    fail(`${label} missing text: ${needle}`)
  }
}

const socialPreview = await readFile(resolve(sourceRoot, '.github/social-preview.png'))
if (socialPreview.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
  fail('Social preview is not a PNG')
} else {
  const width = socialPreview.readUInt32BE(16)
  const height = socialPreview.readUInt32BE(20)
  if (width === 1280 && height === 640) {
    pass('Social preview PNG is 1280x640')
  } else {
    fail(`Social preview PNG expected 1280x640, got ${width}x${height}`)
  }
}

const runGhJson = commandArgs => {
  const result = spawnSync('gh', commandArgs, {
    cwd: sourceRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  if (result.status !== 0) {
    const details = [result.stderr, result.stdout].filter(Boolean).join('\n')
    throw new Error(`Command failed: gh ${commandArgs.join(' ')}${details ? `\n${details}` : ''}`)
  }
  return JSON.parse(result.stdout || '{}')
}

if (!offline) {
  const remote = runGhJson([
    'repo',
    'view',
    'flyfish-dev/file-viewer',
    '--json',
    'description,homepageUrl,repositoryTopics'
  ])
  if (remote.description === expectedDescription) {
    pass('GitHub remote description matches growth positioning')
  } else {
    fail(`GitHub remote description mismatch: ${remote.description}`)
  }
  const remoteTopics = (remote.repositoryTopics || []).map(topic => topic.name).sort()
  const expectedTopics = [...desiredTopics].sort()
  if (JSON.stringify(remoteTopics) === JSON.stringify(expectedTopics)) {
    pass('GitHub remote topics match desired discovery set')
  } else {
    fail(`GitHub remote topics mismatch: ${remoteTopics.join(', ')}`)
  }
  if (remote.homepageUrl === 'https://file-viewer.app') {
    pass('GitHub remote homepage is file-viewer.app')
  } else {
    fail(`GitHub remote homepage mismatch: ${remote.homepageUrl}`)
  }
  const openGraph = runGhJson([
    'api',
    'graphql',
    '-F',
    'owner=flyfish-dev',
    '-F',
    'name=file-viewer',
    '-f',
    'query=query($owner:String!, $name:String!) { repository(owner:$owner, name:$name) { usesCustomOpenGraphImage } }'
  ])
  const usesCustomOpenGraphImage = Boolean(openGraph.data?.repository?.usesCustomOpenGraphImage)
  if (usesCustomOpenGraphImage) {
    pass('GitHub remote custom social preview is configured')
  } else if (strictSocialPreview) {
    fail('GitHub remote custom social preview is not configured')
  } else {
    console.warn('warn - GitHub remote custom social preview is not configured; run with --strict-social-preview after uploading the image.')
  }
}

if (failures.length) {
  console.error('\nGitHub growth asset verification failed:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('\nGitHub growth assets verified.')
