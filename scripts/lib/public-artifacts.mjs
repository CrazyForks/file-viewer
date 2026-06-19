import { existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const publicArtifactForbiddenTopLevel = [
  '.env',
  '.env.local',
  '.eslintrc.cjs',
  '.prettierrc.json',
  '.vscode',
  'build.sh',
  'env.d.ts',
  'index.html',
  'pnpm-lock.yaml',
  'public',
  'scripts',
  'src',
  'yarn.lock'
]

export const publicArtifactDefaultRoots = [
  'README.md',
  'README.en.md',
  'LICENSE',
  'package.json',
  'pnpm-workspace.yaml',
  'apps',
  'packages',
  'dist',
  'demo',
  'component-demo',
  'docs',
  'docs-dist',
  'example',
  'artifacts'
]

export async function assertDirectory(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing directory: ${label}`)
  }
  const info = await stat(path)
  if (!info.isDirectory()) {
    throw new Error(`Not a directory: ${label}`)
  }
}

export async function assertFile(path, label = path) {
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${label}`)
  }
  const info = await stat(path)
  if (!info.isFile()) {
    throw new Error(`Not a file: ${label}`)
  }
}

export async function assertPublicArtifactOnlyRepo(repoDir, options = {}) {
  for (const entry of publicArtifactForbiddenTopLevel) {
    if (existsSync(join(repoDir, entry))) {
      throw new Error(`Forbidden source workspace entry found in public artifact repo: ${entry}`)
    }
  }
  if (existsSync(join(repoDir, 'packages', 'runtime'))) {
    throw new Error('Forbidden removed runtime package found in public artifact repo: packages/runtime')
  }

  if (!options.allowedRoots) {
    return
  }

  const allowedRoots = new Set([
    '.git',
    ...(Array.isArray(options.allowedRoots) ? options.allowedRoots : publicArtifactDefaultRoots)
  ])
  for (const entry of await readdir(repoDir)) {
    if (!allowedRoots.has(entry)) {
      throw new Error(`Unexpected top-level entry in public artifact repo: ${entry}`)
    }
  }
}
