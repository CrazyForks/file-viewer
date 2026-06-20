import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { normalizeReleaseError } from './release-error-normalizer.mjs'

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: options.timeout ?? 20_000
  })
  const error = result.error instanceof Error ? result.error.message : ''
  return {
    ok: result.status === 0,
    status: result.status,
    signal: result.signal || '',
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    error
  }
}

function commandError(result) {
  return normalizeReleaseError(result.error || result.stderr || result.stdout || result.signal || 'unknown error')
}

export function localHeadTree(repoDir) {
  const head = runGit(['rev-parse', 'HEAD'], { cwd: repoDir })
  const tree = runGit(['rev-parse', 'HEAD^{tree}'], { cwd: repoDir })
  return {
    ok: head.ok && tree.ok && Boolean(head.stdout) && Boolean(tree.stdout),
    hash: head.stdout,
    tree: tree.stdout,
    error: head.ok && tree.ok ? '' : commandError(head.ok ? tree : head)
  }
}

export function remoteHeadTree(url, branch = 'main', options = {}) {
  const workdir = mkdtempSync(join(tmpdir(), 'file-viewer-remote-tree-'))
  try {
    const init = runGit(['init', '-q'], { cwd: workdir, timeout: options.timeout })
    if (!init.ok) {
      return {
        ok: false,
        tree: '',
        error: commandError(init)
      }
    }

    const fetch = runGit(
      [
        '-c',
        'protocol.version=2',
        'fetch',
        '--quiet',
        '--depth=1',
        '--filter=blob:none',
        '--no-tags',
        url,
        `refs/heads/${branch}`
      ],
      { cwd: workdir, timeout: options.timeout }
    )
    if (!fetch.ok) {
      return {
        ok: false,
        tree: '',
        error: commandError(fetch)
      }
    }

    const tree = runGit(['rev-parse', 'FETCH_HEAD^{tree}'], { cwd: workdir, timeout: options.timeout })
    return {
      ok: tree.ok && Boolean(tree.stdout),
      tree: tree.stdout,
      error: tree.ok && tree.stdout ? '' : commandError(tree)
    }
  } finally {
    rmSync(workdir, { recursive: true, force: true })
  }
}

export function comparePublicMirrorTrees({ publicRepoDir, githubHead, giteeHead, giteeUrl, branch = 'main', timeout }) {
  if (!githubHead.ok || !giteeHead.ok) {
    return {
      inSync: false,
      mode: 'missing',
      checked: false,
      referenceTree: '',
      giteeTree: '',
      error: 'missing public repository head'
    }
  }

  if (githubHead.hash === giteeHead.hash) {
    return {
      inSync: true,
      mode: 'commit',
      checked: false,
      referenceTree: '',
      giteeTree: '',
      error: ''
    }
  }

  const reference = localHeadTree(publicRepoDir)
  if (!reference.ok || reference.hash !== githubHead.hash) {
    return {
      inSync: false,
      mode: 'unchecked',
      checked: false,
      referenceTree: reference.tree,
      giteeTree: '',
      error: reference.ok
        ? `local public repository ${reference.hash.slice(0, 12)} does not match GitHub ${githubHead.hash.slice(0, 12)}`
        : reference.error
    }
  }

  const gitee = remoteHeadTree(giteeUrl, branch, { timeout })
  if (!gitee.ok) {
    return {
      inSync: false,
      mode: 'unchecked',
      checked: false,
      referenceTree: reference.tree,
      giteeTree: '',
      error: gitee.error
    }
  }

  return {
    inSync: reference.tree === gitee.tree,
    mode: reference.tree === gitee.tree ? 'tree' : 'stale',
    checked: true,
    referenceTree: reference.tree,
    giteeTree: gitee.tree,
    error: ''
  }
}
