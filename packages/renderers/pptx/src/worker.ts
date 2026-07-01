import type { PptxWorkerFactoryOptions } from './types';

const defaultPptxWorkerUrl = new URL('./worker/pptx.worker.js', import.meta.url);
const viteDevPptxWorkerUrl = new URL(
  '/node_modules/@file-viewer/pptx/dist/worker/pptx.worker.js',
  defaultPptxWorkerUrl
);
const viteOptimizedWorkerPath = '/node_modules/.vite/deps/worker/pptx.worker.js';
const viteOptimizedPptxSourcePattern =
  /\/\/\s+(node_modules\/(?:\.pnpm\/[^\n]+?\/node_modules\/)?@file-viewer\/pptx\/dist\/worker\.js)\b/;

const resolveViteOptimizedPptxWorkerUrl = () => {
  if (typeof XMLHttpRequest === 'undefined') {
    return null;
  }

  try {
    const request = new XMLHttpRequest();
    // Vite dev-only fallback: inspect the optimized module to recover the real
    // package path when @file-viewer/pptx is only a transitive pnpm dependency.
    request.open('GET', import.meta.url, false);
    request.send(null);

    if ((request.status > 0 && request.status < 200) || request.status >= 400) {
      return null;
    }

    const match = viteOptimizedPptxSourcePattern.exec(request.responseText || '');
    if (!match) {
      return null;
    }

    const workerPath = match[1].replace(/dist\/worker\.js$/, 'dist/worker/pptx.worker.js');
    const origin = typeof location !== 'undefined' && location.origin
      ? location.origin
      : defaultPptxWorkerUrl.origin;
    return `${origin}/${workerPath}`;
  } catch {
    return null;
  }
};

const resolveDefaultPptxWorkerUrl = () => {
  // Vite dep optimization rewrites import.meta.url into .vite/deps, away from this package's worker file.
  if (defaultPptxWorkerUrl.pathname.includes(viteOptimizedWorkerPath)) {
    return resolveViteOptimizedPptxWorkerUrl() || viteDevPptxWorkerUrl;
  }
  return defaultPptxWorkerUrl;
};

export const createPptxWorker = (options: PptxWorkerFactoryOptions = {}) => {
  if (options.workerFactory) {
    return options.workerFactory();
  }

  if (options.workerUrl) {
    return new Worker(options.workerUrl, {
      type: options.workerType ?? 'module',
    });
  }

  return new Worker(resolveDefaultPptxWorkerUrl(), {
    type: 'module',
  });
};
