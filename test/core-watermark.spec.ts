import { describe, expect, it } from 'vitest';
import {
  buildFileViewerWatermarkBackgroundImage,
  buildFileViewerWatermarkInlineStyle,
  buildFileViewerWatermarkStyle,
  normalizeFileViewerWatermark,
  resolveFileViewerWatermarkPresentationState,
} from '../packages/core/src';

describe('@file-viewer/core watermark helpers', () => {
  it('normalizes watermark options and builds framework-neutral style payloads', () => {
    expect(normalizeFileViewerWatermark(false)).toBeNull();
    expect(normalizeFileViewerWatermark({ text: '' })).toBeNull();
    expect(normalizeFileViewerWatermark(true)).toMatchObject({
      enabled: true,
      text: 'Flyfish Viewer',
    });

    const watermark = {
      text: 'Confidential',
      color: '#123456',
      opacity: 0.2,
    };
    const backgroundImage = buildFileViewerWatermarkBackgroundImage(watermark);

    expect(backgroundImage).toContain('data:image/svg+xml');
    expect(backgroundImage).toContain('Confidential');
    expect(buildFileViewerWatermarkStyle(watermark)).toEqual({
      backgroundImage,
    });
    expect(buildFileViewerWatermarkStyle(undefined)).toBeUndefined();
    expect(buildFileViewerWatermarkInlineStyle(watermark)).toContain(`background-image:${backgroundImage}`);

    const presentation = resolveFileViewerWatermarkPresentationState(watermark);
    expect(presentation.normalizedWatermark).toMatchObject(watermark);
    expect(presentation.watermarkStyle).toEqual({ backgroundImage });
    expect(presentation.watermarkInlineStyle).toBe(buildFileViewerWatermarkInlineStyle(watermark));
    expect(resolveFileViewerWatermarkPresentationState(false)).toEqual({
      normalizedWatermark: null,
      watermarkStyle: undefined,
      watermarkInlineStyle: '',
    });
  });
});
