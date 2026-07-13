import assert from 'node:assert/strict';
import {
  clampComicPageIndex,
  getComicBookPages,
  isComicBookExtension,
} from '../dist/comicBook.js';

const entry = (path, extension) => ({ path, extension });
const pages = getComicBookPages([
  entry('ComicInfo.xml', 'xml'),
  entry('bonus/001.jpg', 'jpg'),
  entry('chapter/page10.jpg', 'jpg'),
  entry('chapter/page2.JPG', 'JPG'),
  entry('chapter/page1.webp', 'webp'),
  entry('notes.txt', 'txt'),
]);

assert.equal(isComicBookExtension('CBZ'), true);
assert.equal(isComicBookExtension('cbr'), true);
assert.equal(isComicBookExtension('zip'), false);
assert.deepEqual(
  pages.map(page => page.path),
  ['bonus/001.jpg', 'chapter/page1.webp', 'chapter/page2.JPG', 'chapter/page10.jpg']
);
assert.equal(clampComicPageIndex(-1, pages.length), 0);
assert.equal(clampComicPageIndex(99, pages.length), pages.length - 1);
assert.equal(clampComicPageIndex(0, 0), 0);

console.log('Issue #101 comic-book helpers verified.');
