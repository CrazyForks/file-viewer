import ePub from 'epubjs';

// `build-epub-engine.mjs` replaces this bridge with a self-contained browser
// bundle. Keeping the source bridge typed makes regular TypeScript checks work
// without exposing epubjs types from the package's public declarations.
const bundledEpubJs: unknown = ePub;

export default bundledEpubJs;
