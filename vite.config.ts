import { fileURLToPath, URL } from 'node:url'

import type { UserConfigExport } from 'vite'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import dts from 'vite-plugin-dts'


// https://vitejs.dev/config/
export default defineConfig(ctx => {
  const config: UserConfigExport = {
    plugins: [vue(), vueJsx(), dts()],
    base: './',
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    }
  }
  if (ctx.mode === 'lib') {
    config.build = {
      lib: {
        // Could also be a dictionary or array of multiple entry points
        entry: fileURLToPath(new URL('src/package/index.ts', import.meta.url)),
        name: 'file-viewer3',
        fileName: 'main'
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
          exports: 'auto'
        }
      }
    }
  }
  return config
})
