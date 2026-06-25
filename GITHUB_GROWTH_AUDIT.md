# GitHub Growth Audit

Audit date: 2026-06-25

This file tracks the concrete evidence for the long-term GitHub exposure work:

> 精准用户搜得到 -> 第一眼看懂 -> 30 秒愿意试 -> 用完愿意收藏 / Star / 提 issue / 转发。

## Status Summary

| Area | Status | Evidence |
| --- | --- | --- |
| README first screen | Done | `README.md`, `README.en.md` use the internal/private browser-native positioning, clear CTAs, Demo / Docs / Quick Start / Supported Formats. |
| 206+ formats as evidence | Done | README moves 206+ extensions and 24 preview pipelines into positioning/highlights/support matrix evidence, not the only pitch. |
| GitHub Topics | Done | `pnpm github:topics:plan` returns no add/remove changes; GitHub remote topics match the desired discovery set. |
| Social Preview asset | Done | `.github/social-preview.png` is a branded 1280x640 PNG with the File Viewer logo mark; `pnpm github:social-preview:render` verifies dimensions. |
| Social Preview remote upload | Done | `pnpm github:social-preview:check` reports `usesCustomOpenGraphImage: yes`; GitHub remote Open Graph image is the uploaded 1280x640 custom card. |
| Release notes | Done | `RELEASE_TEMPLATE.md` focuses on who should upgrade, highlights, upgrade path, verification, Demo/Docs links. |
| Community health files | Done | `CONTRIBUTING.md`, `SUPPORT.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ROADMAP.md`, `CHANGELOG.md`, `.github/FUNDING.yml`, issue templates, PR template. |
| Content propagation | Done | `CONTENT_DISTRIBUTION_PLAN.md` provides Chinese launch post, technical breakdowns, English entry article, CTA and metrics. |
| Four scenario entrances | Done | README, docs, and Demo expose internal tools/OA, engineering archives, frontend components, private deployment. |
| Comparison page | Done | `docs/guide/compare.md`, `docs/en/guide/compare.md`, and VitePress sidebar links. |
| Demo scenario buttons + copyable code | Done | `apps/viewer-demo/src/components/HelloWorld.vue` includes scenario shortcuts and copyable React snippet. |
| Traffic tracking | Done | `TRAFFIC_TRACKING.md`, `pnpm github:traffic:snapshot`, `pnpm npm:downloads:snapshot`. |
| Four-week cadence | Done | `GITHUB_GROWTH_PLAYBOOK.md` and `CONTENT_DISTRIBUTION_PLAN.md` define week 1-4 operations and content. |
| Description / feedback / star copy | Done | GitHub remote description updated; README has compatibility feedback and non-arrogant star/save guidance. |

## Verification Commands

```bash
pnpm verify:github-growth-assets
pnpm github:topics:plan
pnpm github:social-preview:render
pnpm github:social-preview:check
pnpm verify:github-growth-assets:strict
pnpm github:traffic:snapshot
pnpm npm:downloads:snapshot
pnpm type-check
pnpm docs:build
pnpm verify:format-support
pnpm verify:demo-output
pnpm build-only
```

## Remote Social Preview Status

The generated PNG has been uploaded in the GitHub web UI:

```txt
https://github.com/flyfish-dev/file-viewer/settings
```

Path to upload:

```txt
.github/social-preview.png
```

Keep these checks available for future audits:

```bash
pnpm github:social-preview:check
pnpm verify:github-growth-assets:strict
```

The command should report `Uses custom Open Graph image: yes`. The image should show the branded `File Viewer` card with the blue-green logo mark.
