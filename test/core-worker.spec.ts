import { describe, expect, it, vi } from 'vitest';
import {
  WorkerRefImpl,
  refWorker,
  type FileRenderContext,
  type FileRenderHandler,
} from '../packages/core/src';

describe('@file-viewer/core worker and render contracts', () => {
  it('creates worker refs lazily and reuses the created worker', () => {
    const worker = { terminate: vi.fn() } as unknown as Worker;
    const provider = vi.fn(() => worker);
    const ref = refWorker('demo.worker.js');

    expect(ref.name).toBe('demo.worker.js');
    expect(ref.worker).toBeNull();
    expect(ref.defaults(provider)).toBe(worker);
    expect(ref.defaults(provider)).toBe(worker);
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it('keeps WorkerRefImpl constructible for compatibility wrappers', () => {
    const worker = { postMessage: vi.fn() } as unknown as Worker;
    const ref = new WorkerRefImpl('compat.worker.js', worker);

    expect(ref.name).toBe('compat.worker.js');
    expect(ref.defaults(() => {
      throw new Error('should not replace existing worker');
    })).toBe(worker);
  });

  it('keeps the legacy one-argument WorkerRefImpl constructor working', () => {
    const worker = { postMessage: vi.fn() } as unknown as Worker;
    const ref = new WorkerRefImpl(worker);

    expect(ref.name).toBe('');
    expect(ref.defaults(() => {
      throw new Error('should not replace existing worker');
    })).toBe(worker);
  });

  it('exposes renderer context and handler contracts from core', async () => {
    const context: FileRenderContext = {
      filename: 'demo.pdf',
      url: '/demo.pdf',
      streamUrl: '/demo.pdf',
      onProgressiveRender: vi.fn(),
      registerExportAdapter: vi.fn(),
    };
    const handler: FileRenderHandler<string, HTMLDivElement> = async (_buffer, target, type, nextContext) => {
      nextContext?.onProgressiveRender?.();
      target.dataset.renderedType = type || '';
      return nextContext?.filename || '';
    };
    const target = { dataset: {} } as HTMLDivElement;

    await expect(handler(new ArrayBuffer(1), target, 'pdf', context)).resolves.toBe('demo.pdf');
    expect(target.dataset.renderedType).toBe('pdf');
    expect(context.onProgressiveRender).toHaveBeenCalledTimes(1);
  });
});
