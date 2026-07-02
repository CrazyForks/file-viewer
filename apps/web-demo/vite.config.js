import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, normalize, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const demoDir = fileURLToPath(new URL('.', import.meta.url))
const repoDir = resolve(demoDir, '../..')
const viewerDemoPublic = resolve(repoDir, 'apps/viewer-demo/public')
const viewerDemoLogo = resolve(repoDir, 'apps/viewer-demo/src/assets/logo.png')
const webViewerAssets = resolve(repoDir, 'packages/components/web/viewer')

const mimeTypes = new Map([
  ['.bcmap', 'application/octet-stream'],
  ['.css', 'text/css; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.doc', 'application/msword'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.dwg', 'application/octet-stream'],
  ['.dwf', 'application/octet-stream'],
  ['.dwfx', 'application/octet-stream'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.mp3', 'audio/mpeg'],
  ['.mp4', 'video/mp4'],
  ['.ofd', 'application/octet-stream'],
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.ttf', 'font/ttf'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.zip', 'application/zip']
])

function resolveStaticFile(root, requestPath) {
  const safePath = normalize(decodeURIComponent(requestPath)).replace(/^(\.\.(\/|\\|$))+/, '')
  const candidate = resolve(root, safePath)
  if (!candidate.startsWith(root) || relative(root, candidate).startsWith('..')) {
    return null
  }
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    return null
  }
  return candidate
}

function serveFile(response, filePath) {
  response.writeHead(200, {
    'Content-Type': mimeTypes.get(extname(filePath).toLowerCase()) || 'application/octet-stream'
  })
  createReadStream(filePath).pipe(response)
}

function fileViewerAssetPlugin() {
  return {
    name: 'file-viewer-web-demo-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = new URL(request.url || '/', 'http://127.0.0.1')
        const path = url.pathname

        if (path === '/logo.png') {
          if (existsSync(viewerDemoLogo) && statSync(viewerDemoLogo).isFile()) {
            serveFile(response, viewerDemoLogo)
            return
          }
        }

        if (path.startsWith('/example/')) {
          const file = resolveStaticFile(viewerDemoPublic, path.slice(1))
          if (file) {
            serveFile(response, file)
            return
          }
        }

        if (path.startsWith('/file-viewer/')) {
          const file = resolveStaticFile(webViewerAssets, path.slice('/file-viewer/'.length))
          if (file) {
            serveFile(response, file)
            return
          }
        }

        if (path.startsWith('/vendor/') || path.startsWith('/wasm/')) {
          const asset = resolveStaticFile(webViewerAssets, path.slice(1)) ||
            resolveStaticFile(viewerDemoPublic, path.slice(1))
          if (asset) {
            serveFile(response, asset)
            return
          }
        }

        next()
      })
    }
  }
}

export default defineConfig({
  publicDir: false,
  plugins: [fileViewerAssetPlugin()],
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  }
})
