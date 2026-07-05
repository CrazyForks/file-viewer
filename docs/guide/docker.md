# Docker Deployment

<div class="doc-kicker">Self-host The Docs And Demo</div>

The Docker image serves the static demo build through nginx. It includes the main viewer at `/`, the zero-dependency iframe entry at `/iframe.html`, and the comparison demo at `/compare.html`.

## Run From Docker Hub

```bash
docker run -d \
  --name file-viewer \
  -p 8080:80 \
  flyfishdev/file-viewer:latest
```

Open:

- Main viewer: `http://localhost:8080/`
- iframe embed: `http://localhost:8080/iframe.html?url=/example/word.docx`
- Comparison demo: `http://localhost:8080/compare.html`
- Health check: `http://localhost:8080/healthz`

## Build Locally

```bash
pnpm docker:build
docker run --rm -p 8080:80 flyfishdev/file-viewer:latest
```

## Multi-arch Publish

```bash
docker login
DOCKER_IMAGE=flyfishdev/file-viewer pnpm docker:publish
```

The Docker flow targets `linux/amd64` and `linux/arm64`.

## Offline Notes

The image serves static demo assets from itself, including offline Worker, WASM, vendor, and example files. Keep `/iframe.html`, `/assets/*`, `/vendor/*`, and `/example/*` on the same static origin when putting another reverse proxy in front of the container. For native component integrations, still copy viewer runtime assets into your own product deployment with:

```bash
npx file-viewer-copy-assets ./public/file-viewer
```
