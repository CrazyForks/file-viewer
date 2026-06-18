import { describe, expect, it } from 'vitest';
import { resolveFileViewerPresentationState } from '../packages/core/src';

describe('@file-viewer/core presentation helpers', () => {
  it('derives display filename, extension, toolbar and theme as one framework-neutral state', () => {
    expect(resolveFileViewerPresentationState({
      file: new File(['demo'], '合同.docx'),
      url: '/example/%E6%8A%A5%E5%91%8A.pdf?token=1',
      options: {
        theme: 'dark',
        toolbar: {
          download: false,
          position: 'bottom-right',
        },
      },
    })).toMatchObject({
      displayFilename: '合同.docx',
      extension: 'docx',
      theme: 'dark',
      toolbar: {
        download: false,
        print: true,
        exportHtml: true,
        zoom: true,
      },
    });

    expect(resolveFileViewerPresentationState({
      filename: 'manual.PDF',
      options: {
        theme: 'system',
      },
    })).toMatchObject({
      displayFilename: 'manual.PDF',
      extension: 'pdf',
      theme: 'system',
      toolbar: {
        download: true,
        print: true,
        exportHtml: true,
        zoom: true,
      },
    });
  });
});
