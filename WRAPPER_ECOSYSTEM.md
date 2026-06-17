# File Viewer Wrapper Ecosystem

This document records the public wrapper repository plan. The core source remains private in Gitea; every framework integration is a thin public wrapper that depends on the same `@file-viewer/core` / `@file-viewer/web` runtime path.

## Public Wrappers

| Framework | npm package | GitHub | Gitee | Source directory |
| --- | --- | --- | --- | --- |
| Vue 3 | `@file-viewer/vue3` | `flyfish-dev/file-viewer-vue3` | `flyfish-dev/file-viewer-vue3` | `packages/vue3-standard` |
| Vue 2.7 | `@file-viewer/vue2.7` | `flyfish-dev/file-viewer-vue2.7` | `flyfish-dev/file-viewer-vue2.7` | `packages/vue27-standard` |
| Vue 2.6 | `@file-viewer/vue2.6` | `flyfish-dev/file-viewer-vue2.6` | `flyfish-dev/file-viewer-vue2.6` | `packages/vue26-standard` |
| React 18/19 | `@file-viewer/react` | `flyfish-dev/file-viewer-react` | `flyfish-dev/file-viewer-react` | `packages/react-standard` |
| React 16.8/17 | `@file-viewer/react-legacy` | `flyfish-dev/file-viewer-react-legacy` | `flyfish-dev/file-viewer-react-legacy` | `packages/react-legacy-standard` |
| Pure Web | `@file-viewer/web` | `flyfish-dev/file-viewer-web` | `flyfish-dev/file-viewer-web` | `packages/web-standard` |
| jQuery | `@file-viewer/jquery` | `flyfish-dev/file-viewer-jquery` | `flyfish-dev/file-viewer-jquery` | `packages/jquery-standard` |
| Svelte | `@file-viewer/svelte` | `flyfish-dev/file-viewer-svelte` | `flyfish-dev/file-viewer-svelte` | `packages/svelte-standard` |

The canonical machine-readable matrix is [`ecosystem/wrappers.json`](./ecosystem/wrappers.json).

## Standalone Repo Export

Generate local standalone repository folders for review or push:

```bash
pnpm wrappers:export
```

By default the script writes to `.release/wrapper-repos/<repository>`. Each folder contains:

- package source and package metadata
- Chinese and English README
- root `LICENSE`
- a standalone `.gitignore`
- `wrapper-repo-manifest.json` with source commit and repository metadata

Workspace dependency specifiers such as `workspace:^1.0.26` are rewritten to normal npm ranges before export, so the folders are ready to initialize as standalone public repositories.
