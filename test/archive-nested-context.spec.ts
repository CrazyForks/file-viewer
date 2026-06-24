import { describe, expect, it, vi } from 'vitest';
import { buildArchiveNestedRenderContext } from '../packages/renderers/archive/src/archiveShared';
import type { FileRenderContext } from '../packages/core/src';

describe('archive nested render context', () => {
  it('renders extracted children from bytes instead of inheriting the parent archive stream URL', () => {
    const renderNestedBuffer = vi.fn();
    const registerExportAdapter = vi.fn();
    const parentContext: FileRenderContext = {
      filename: 'documents.zip',
      url: '/example/documents.zip',
      streamUrl: '/example/documents.zip',
      options: {
        theme: 'light',
        pdf: {
          streaming: true,
        },
        archive: {
          cache: true,
        },
      },
      registerExportAdapter,
      renderNestedBuffer,
    };

    const nestedContext = buildArchiveNestedRenderContext(
      parentContext,
      { name: 'contract.pdf' },
      parentContext.options?.archive
    );

    expect(nestedContext.filename).toBe('contract.pdf');
    expect(nestedContext.url).toBeUndefined();
    expect(nestedContext.streamUrl).toBeUndefined();
    expect(nestedContext.renderNestedBuffer).toBe(renderNestedBuffer);
    expect(nestedContext.registerExportAdapter).toBe(registerExportAdapter);
    expect(nestedContext.options?.theme).toBe('light');
    expect(nestedContext.options?.pdf?.streaming).toBe(true);
    expect(nestedContext.options?.archive?.cache).toBe(true);
  });
});
