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
  const config: UserConfigExport = {
    plugins: [viewerQueryFallbackPlugin(), vue(), vueJsx()],
    base: './',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
  if (ctx.mode === 'lib') {
    config.plugins?.push(dts({ rollupTypes: true }));
    config.build = {
      target: 'es2015',
      copyPublicDir: false,
      emptyOutDir: true,
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: fileURLToPath(new URL('src/package/index.ts', import.meta.url)),
        name: 'file-viewer3',
        formats: ['es', 'umd'],
        fileName: format => format === 'es' ? 'index.mjs' : 'index.umd.js'
      },
      rollupOptions: {
        // 确保外部化处理那些你不想打包进库的依赖
        external: ['vue'],
        output: {
          // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
          globals: {
            vue: 'Vue'
          },
          // 如果同时导出default和named，需要指定声明
          exports: 'named',
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
  }

  return config
})
