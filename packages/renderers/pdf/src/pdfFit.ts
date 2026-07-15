import type { FileViewerFitRequest } from '@file-viewer/core';

export const PDF_FIT_MIN_VIEWPORT_SIZE = 96;
export const PDF_FIT_HORIZONTAL_PADDING = 28;
export const PDF_PAGE_BORDER_WIDTH = 18;

export interface ResolvePdfFitViewportSizeInput {
  containerWidth: number;
  containerHeight: number;
  fallbackWidth: number;
  fallbackHeight: number;
  request: Pick<FileViewerFitRequest, 'viewportWidth' | 'viewportHeight' | 'padding'>;
}

const normalizePadding = (padding: number | undefined) => (
  Number.isFinite(padding) && Number(padding) > 0 ? Number(padding) : 0
);

/**
 * Resolves the PDF page viewport after the navigation pane has been laid out.
 * Core request dimensions already exclude fit.padding; live container and
 * window fallback dimensions do not, so only those branches subtract it.
 */
export const resolvePdfFitViewportSize = ({
  containerWidth,
  containerHeight,
  fallbackWidth,
  fallbackHeight,
  request,
}: ResolvePdfFitViewportSizeInput) => {
  const padding = normalizePadding(request.padding);
  const requestWidth = Number(request.viewportWidth) || 0;
  const requestHeight = Number(request.viewportHeight) || 0;
  const hasContainerWidth = containerWidth > 0;
  const hasContainerHeight = containerHeight > 0;
  const width = hasContainerWidth
    ? containerWidth - padding * 2
    : requestWidth || fallbackWidth - padding * 2;
  const height = hasContainerHeight
    ? containerHeight - padding * 2
    : requestHeight || fallbackHeight - padding * 2;

  return {
    width: Math.max(
      PDF_FIT_MIN_VIEWPORT_SIZE,
      width - PDF_FIT_HORIZONTAL_PADDING - PDF_PAGE_BORDER_WIDTH
    ),
    height: Math.max(
      PDF_FIT_MIN_VIEWPORT_SIZE,
      height - PDF_PAGE_BORDER_WIDTH
    ),
  };
};
