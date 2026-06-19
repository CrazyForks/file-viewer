import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import { createRequire } from 'node:module';

const coreRequire = createRequire(new URL('./packages/core/package.json', import.meta.url));
const vue3Require = createRequire(new URL('./packages/components/vue3/package.json', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./apps/viewer-demo/src', import.meta.url)),
      '@file-viewer/core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      linkedom: coreRequire.resolve('linkedom'),
      pako: coreRequire.resolve('pako'),
      'msdoc-viewer': coreRequire.resolve('msdoc-viewer'),
      vue: vue3Require.resolve('vue'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'test/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
