import { fileURLToPath, URL } from 'node:url'

import type { Plugin, UserConfigExport } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from 'vite-plugin-dts'

const viewerQueryFallbackPlugin = (): Plugin => ({
  name: 'viewer-query-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      // Vite 会把根路径 `?url=` 当成资源查询；Demo 需要保留这个 iframe/URL 参数入口。
      if (req.url?.startsWith('/?url=')) {
        req.url = `/index.html${req.url.slice(1)}`
      }
      next()
    })
  }
})

// https://vitejs.dev/config/
export default defineConfig(ctx => {
  const alias: Record<string, string> = {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    events: 'events',
    path: 'path-browserify',
    stream: 'stream-browserify',
    zlib: 'browserify-zlib'
  }

  if (ctx.mode !== 'lib') {
    alias['@file-viewer/core'] = fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url))
  }

  const config: UserConfigExport = {
    plugins: [viewerQueryFallbackPlugin(), vue(), vueJsx()],
    base: './',
    resolve: {
      alias
    }
  }
  if (ctx.mode === 'lib') {
    config.plugins?.push(dts({ rollupTypes: true }))
    config.build = {
      target: 'es2015',
      copyPublicDir: false,
      emptyOutDir: true,
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: fileURLToPath(new URL('src/package/index.ts', import.meta.url)),
        name: 'file-viewer3',
        formats: ['es'],
        fileName: format => format === 'es' ? 'index.mjs' : 'index.umd.js'
      },
      rollupOptions: {
        // 确保外部化处理那些你不想打包进库的依赖
        external: ['vue', '@file-viewer/core'],
        output: {
          // 不输出hash
          chunkFileNames: 'components/[name].js'
        }
      }
    }
    config.worker = {
      rollupOptions: {
        output: {
          // 指定worker输出名称
          entryFileNames: 'worker/[name].js',
        }
      }
    }
  } else {
    config.build = {
      rollupOptions: {
        input: {
          main: fileURLToPath(new URL('index.html', import.meta.url)),
          compare: fileURLToPath(new URL('compare.html', import.meta.url))
        }
      }
    }
  }

  return config
})
