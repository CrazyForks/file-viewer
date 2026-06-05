import type { FileViewerPdfOptions } from './type'

export const DEFAULT_PDF_RANGE_CHUNK_SIZE = 64 * 1024

export const normalizePdfStreamingMode = (
  mode: FileViewerPdfOptions['streaming']
): true | false | 'same-origin' => {
  if (mode === true || mode === false || mode === 'same-origin') {
    return mode
  }
  return 'same-origin'
}

export const isSameOriginUrl = (url: string, pageHref: string) => {
  try {
    const target = new URL(url, pageHref)
    const page = new URL(pageHref)
    return target.origin === page.origin
  } catch {
    return false
  }
}

export const shouldStreamPdfUrl = ({
  extension,
  pageHref,
  streaming,
  url
}: {
  extension: string;
  pageHref: string;
  streaming?: FileViewerPdfOptions['streaming'];
  url: string;
}) => {
  if (extension.toLowerCase() !== 'pdf') {
    return false
  }

  const mode = normalizePdfStreamingMode(streaming)
  if (mode === false) {
    return false
  }
  if (mode === true) {
    return true
  }

  return isSameOriginUrl(url, pageHref)
}
