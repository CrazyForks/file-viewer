# OpenAI Build Week 2026

Uploading a private document just to preview it is awful. A browser demo that works from a CDN and then breaks inside an offline network is almost as bad.

File Viewer existed before this hackathon. Work on the idea began in 2022. This submission is limited to the extension built during the OpenAI Build Week submission period, starting July 13, 2026 at 9:00 AM PT.

## What Existed Before Build Week

- The framework-independent core API.
- Browser-side preview pipelines for many document and media formats.
- Framework packages for Web Components, Vue, React, Svelte, and jQuery.
- The basic demo, documentation, npm packages, and private-deployment support.

Those parts provide context. They are not claimed as Build Week work.

## What Was Added During Build Week

- A new responsive preview workspace with an immersive document surface, format-aware controls, recent-file memory, a compact mobile mode, and real light and dark rendering.
- Local STEP/STP, IGES/IGS, and BREP preview through a packaged OCCT Worker/WASM path.
- Native PowerPoint 97-2003 `.ppt` preview through the packaged `@file-viewer/ppt` engine, alongside the separate PPTX Worker pipeline.
- A bundled EPUB engine with a pinned safe XML parser and no runtime CDN dependency.
- Version-aligned Worker, WASM, font, and vendor asset delivery for full packages, Vite, other bundlers, Docker, and offline networks.
- Browser regression checks that click every built-in sample in both languages and fail on loading states, page errors, bad assets, or missing renderer output.

The released result is File Viewer v2.2.2: 208 registered extensions, 25 preview pipelines, and 54 npm targets.

## How I Used Codex and GPT-5.6

The primary Codex session used GPT-5.6 Sol.

`019f68bb-b7ae-7ab2-8a32-9a9569b8043f`

Codex helped me trace Worker and WASM failures across Vite, package tarballs, Docker, and offline builds. It split the demo refactor into focused components, wrote regression harnesses for real rendering paths, ran browser checks, and kept repairing failures until the checked matrix passed.

I made the product and engineering decisions: keep files in the browser, keep the core framework-independent, separate binary PPT from PPTX, ship OCCT and EPUB assets locally, preserve upstream licenses, and refuse to call a format supported until a real browser path passed.

No OpenAI model or API is called by File Viewer at runtime. GPT-5.6 was used through Codex to build and validate this extension.

## Public Evidence

- [Resolve renderer assets from stable owners](https://github.com/flyfish-dev/file-viewer/commit/8417a99999be203c54a87c01519fcdfbcf4e0bda)
- [Stabilize paged rendering, fit, and lifecycle behavior](https://github.com/flyfish-dev/file-viewer/commit/34d99b1c1f14fdc8c08abae642d898988941fefc)
- [Make full packages deployment-complete](https://github.com/flyfish-dev/file-viewer/commit/a662bb07647d30bfb2647c14654cbfc3040d6a66)
- [Ship native PPT and the hardened v2.2 preview paths](https://github.com/flyfish-dev/file-viewer/commit/9d8b8deb07a1df308bfef2140be43e9553edcbd1)
- [Harden offline EPUB and Docker delivery](https://github.com/flyfish-dev/file-viewer/commit/4701c24eaa895ad15f3ca3fdbd787d37a347fdb2)
- [Publish the final DOCX, PPTX, DWG, and STEP demo](https://github.com/flyfish-dev/file-viewer/commit/12526b43f91609209a6f67de4e63c6b98a77ae03)

## Verification

- 232 of 232 built-in sample-card clicks passed across the English and Chinese demos.
- All 25 preview pipelines rendered through the release checks.
- All 54 npm targets passed the release matrix.
- 28,557 offline runtime assets were scanned without a public-network fallback.
- The desktop, mobile, dark-theme, explicit-URL, Docker, and full-package paths were checked in real browsers.

## Try It

- [Live demo](https://demo.file-viewer.app/?locale=en-US)
- [Source](https://github.com/flyfish-dev/file-viewer)
- [v2.2.2 release](https://github.com/flyfish-dev/file-viewer/releases/tag/v2.2.2)
- [Documentation](https://doc.file-viewer.app/en/)
- [Docker image](https://hub.docker.com/r/flyfishdev/file-viewer)

The demo requires no account. Upload a local file or choose a sample. The file stays in the browser.
