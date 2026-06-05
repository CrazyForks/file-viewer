import { spawnSync } from 'node:child_process'

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || 'flyfish-file-viewer'
const branch = process.env.CLOUDFLARE_PAGES_BRANCH || 'v3'
const outputDir = process.env.CLOUDFLARE_PAGES_OUTPUT_DIR || 'dist'

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = [
  'wrangler',
  'pages',
  'deploy',
  outputDir,
  '--project-name',
  projectName,
  '--branch',
  branch
]

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: false
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
