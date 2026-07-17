import ePub from 'epubjs';

// The build replaces this bridge with the same pinned, self-contained browser
// engine used by the EPUB renderer. The public declaration stays dependency-free.
const bundledEpubJs: unknown = ePub;

export default bundledEpubJs;
