export function getDemoSource(defaultUrl = '/example/word.docx') {
  const params = new URLSearchParams(window.location.search)
  const url = params.get('url') || defaultUrl
  const pathname = url.split(/[?#]/)[0]
  const filename = decodeURIComponent(pathname.split('/').pop() || 'word.docx')
  return {
    url,
    filename
  }
}
