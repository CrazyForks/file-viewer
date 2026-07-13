# Distribution

File Viewer is distributed through npm, GitHub Releases, Docker and the hosted demo/documentation sites.

| Need | Recommended channel |
| --- | --- |
| Application integration | npm packages under `@file-viewer/*` |
| One-step framework integration | Matching `@file-viewer/*-full` package |
| Static/iframe/offline archives | [GitHub Releases](https://github.com/flyfish-dev/file-viewer/releases) |
| Ready-to-run container | `flyfishdev/file-viewer` on Docker Hub |
| Source development | This GitHub repository |

Large release archives and npm tarballs are not committed to Git history. `artifacts/` contains only machine-readable release manifests, status, matrix and schemas; each release record links to its downloadable GitHub Release asset.

## Public source build

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm docs:build
```

See [Development](./development.md) for the complete public quality gate and [Docker](./docker.md) for the published image.

## Maintainer boundary

<!-- FILE_VIEWER_MAINTAINER_COMMANDS -->

Versioning, npm publication, official Docker publication, Cloudflare deployment, repository synchronization and release signing are maintainer-only operations in the complete private workspace. This separation keeps public commands accurate and prevents private operational tooling from leaking into the open-source boundary.
