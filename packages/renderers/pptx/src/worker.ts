import type { PptxWorkerFactoryOptions } from './types';

const defaultPptxWorkerUrl = new URL('./worker/pptx.worker.js', import.meta.url);

export const createPptxWorker = (options: PptxWorkerFactoryOptions = {}) => {
  if (options.workerFactory) {
    return options.workerFactory();
  }

  if (options.workerUrl) {
    return new Worker(options.workerUrl, {
      type: options.workerType ?? 'module',
    });
  }

  return new Worker(defaultPptxWorkerUrl, {
    type: 'module',
  });
};
