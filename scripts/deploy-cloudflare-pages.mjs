import { spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || 'flyfish-file-viewer'
// Wrangler direct upload publishes to the production deployment when no branch
// is supplied. Keep branch deployments explicit so custom domains are updated
// by the default release commands.
const branch = process.env.CLOUDFLARE_PAGES_BRANCH
const outputDir = process.env.CLOUDFLARE_PAGES_OUTPUT_DIR || 'apps/viewer-demo/dist'

function commandExists(command, args = ['--version']) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    shell: false,
    stdio: 'pipe'
  })
  return result.status === 0
}

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const usePnpmDlx = commandExists(pnpmCommand)
const command = usePnpmDlx ? pnpmCommand : npxCommand
const maxFileBytes = Number.parseInt(
  process.env.CLOUDFLARE_PAGES_MAX_FILE_BYTES || String(25 * 1024 * 1024),
  10
)
const resolvedOutputDir = resolve(outputDir)
const uploadDir = resolve('.release', 'cloudflare-pages', projectName)
const skippedFiles = []

function copyDeployableFiles(sourceDir, targetDir) {
  if (!existsSync(sourceDir)) {
    throw new Error(`Cloudflare Pages output directory does not exist: ${sourceDir}`)
  }

  rmSync(targetDir, { force: true, recursive: true })
  mkdirSync(targetDir, { recursive: true })

  const visit = (source, target) => {
    const stat = statSync(source)

    if (stat.isDirectory()) {
      mkdirSync(target, { recursive: true })
      for (const entry of readdirSync(source)) {
        visit(join(source, entry), join(target, entry))
      }
      return
    }

    if (!stat.isFile()) {
      return
    }

    if (stat.size > maxFileBytes) {
      skippedFiles.push({
        path: relative(sourceDir, source),
        size: stat.size
      })
      return
    }

    mkdirSync(join(target, '..'), { recursive: true })
    cpSync(source, target)
  }

  visit(sourceDir, targetDir)
}

copyDeployableFiles(resolvedOutputDir, uploadDir)

if (skippedFiles.length) {
  console.warn(
    `[cloudflare-pages] Skipped ${skippedFiles.length} oversized file(s) above ${maxFileBytes} bytes while preparing ${basename(uploadDir)}:`
  )
  for (const file of skippedFiles) {
    console.warn(`  - ${file.path} (${file.size} bytes)`)
  }
}

const args = [
  ...(usePnpmDlx ? ['dlx'] : ['--yes']),
  'wrangler',
  'pages',
  'deploy',
  uploadDir,
  '--project-name',
  projectName
]

if (branch) {
  args.push('--branch', branch)
}

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: false
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
