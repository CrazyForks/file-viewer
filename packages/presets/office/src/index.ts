import type {
  FileRenderHandler,
  FileViewerRenderedInstance,
  FileViewerRendererPreset,
} from '@file-viewer/core';
import { registerFileViewerAutoRendererPreset } from '@file-viewer/core';
import { ofdRenderer } from '@file-viewer/renderer-ofd';
import { pdfRenderer } from '@file-viewer/renderer-pdf';
import { presentationRenderer } from '@file-viewer/renderer-presentation';
import { spreadsheetRenderer } from '@file-viewer/renderer-spreadsheet';
import { wordRenderer } from '@file-viewer/renderer-word';

type BrowserRendererHandler = FileRenderHandler<FileViewerRenderedInstance, HTMLDivElement>;

export const officeRenderers: FileViewerRendererPreset<BrowserRendererHandler> = {
  id: 'file-viewer-preset-office',
  label: 'Flyfish File Viewer office renderer preset',
  renderers: [pdfRenderer, wordRenderer, spreadsheetRenderer, presentationRenderer, ofdRenderer],
};

export const fileViewerPresetOffice = officeRenderers;

registerFileViewerAutoRendererPreset(officeRenderers, {
  id: 'office',
  packageName: '@file-viewer/preset-office',
});

export default officeRenderers;
