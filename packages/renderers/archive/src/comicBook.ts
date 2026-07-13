import type { ArchiveEntryView } from './archiveShared.js';

const COMIC_IMAGE_EXTENSIONS = new Set([
  'avif', 'bmp', 'gif', 'heic', 'heif', 'jpe', 'jpeg', 'jpg', 'jxl', 'png', 'tif', 'tiff', 'webp',
]);

export const comicBookStyle = `
.archive-comic-page{min-width:64px;color:#64748b!important;text-align:center;font-variant-numeric:tabular-nums}
.archive-comic-nav:disabled{cursor:not-allowed;opacity:.42}
`;

export const isComicBookExtension = (extension: string) => {
  const normalized = extension.trim().toLowerCase();
  return normalized === 'cbz' || normalized === 'cbr';
};

export const isComicBookPage = (entry: Pick<ArchiveEntryView, 'extension'>) => (
  COMIC_IMAGE_EXTENSIONS.has(entry.extension.toLowerCase())
);

export const naturalComicPageCompare = (
  left: Pick<ArchiveEntryView, 'path'>,
  right: Pick<ArchiveEntryView, 'path'>
) => left.path.localeCompare(right.path, undefined, { numeric: true, sensitivity: 'base' });

export const getComicBookPages = (entries: readonly ArchiveEntryView[]) => entries
  .filter(isComicBookPage)
  .sort(naturalComicPageCompare);

export const clampComicPageIndex = (index: number, pageCount: number) => (
  Math.max(0, Math.min(index, Math.max(0, pageCount - 1)))
);

interface ComicBookControllerOptions {
  document: Document;
  extension: string;
  root: HTMLElement;
  stage: HTMLElement;
  previousLabel: string;
  nextLabel: string;
  getEntries(): readonly ArchiveEntryView[];
  openEntry(entry: ArchiveEntryView): void;
}

export interface ComicBookController {
  enabled: boolean;
  badge: string;
  toolbarElements: readonly HTMLElement[];
  getVisibleEntries(entries: readonly ArchiveEntryView[]): ArchiveEntryView[];
  sortEntries(entries: ArchiveEntryView[]): ArchiveEntryView[];
  onEntriesReady(): void;
  onEntrySelected(entry: ArchiveEntryView): void;
  sync(): void;
  dispose(): void;
}

const createButton = (documentRef: Document, text: string, title: string) => {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = 'archive-comic-nav';
  button.textContent = text;
  button.title = title;
  button.setAttribute('aria-label', title);
  return button;
};

export const createComicBookController = (
  options: ComicBookControllerOptions
): ComicBookController => {
  const enabled = isComicBookExtension(options.extension);
  const previousButton = createButton(options.document, '‹', options.previousLabel);
  const pageText = options.document.createElement('span');
  pageText.className = 'archive-comic-page';
  pageText.setAttribute('role', 'status');
  pageText.setAttribute('aria-live', 'polite');
  pageText.setAttribute('aria-atomic', 'true');
  const nextButton = createButton(options.document, '›', options.nextLabel);
  const toolbarElements = [previousButton, pageText, nextButton];
  const cleanups: Array<() => void> = [];
  const timers = new Set<number>();
  let pageIndex = -1;
  let pointerStartX: number | null = null;

  toolbarElements.forEach(element => {
    element.hidden = !enabled;
  });
  if (enabled) {
    options.root.tabIndex = 0;
  }

  const pages = () => getComicBookPages(options.getEntries());
  const openPage = (index: number) => {
    const currentPages = pages();
    if (!currentPages.length) {
      return;
    }
    pageIndex = clampComicPageIndex(index, currentPages.length);
    options.openEntry(currentPages[pageIndex]);
  };
  const listen = <K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void
  ) => {
    element.addEventListener(event, listener as EventListener);
    cleanups.push(() => element.removeEventListener(event, listener as EventListener));
  };

  if (enabled) {
    listen(previousButton, 'click', () => openPage(pageIndex - 1));
    listen(nextButton, 'click', () => openPage(pageIndex + 1));
    listen(options.root, 'keydown', event => {
      const eventTarget = event.target as Element | null;
      if (eventTarget?.closest('input, button, select, textarea, [contenteditable="true"]')) {
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        openPage(pageIndex - 1);
      } else if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault();
        openPage(pageIndex + 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        openPage(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        openPage(pages().length - 1);
      }
    });
    listen(options.stage, 'pointerdown', event => {
      if (event.isPrimary) {
        options.root.focus({ preventScroll: true });
        pointerStartX = event.clientX;
      }
    });
    listen(options.stage, 'pointerup', event => {
      if (pointerStartX === null || !event.isPrimary) {
        pointerStartX = null;
        return;
      }
      const distance = event.clientX - pointerStartX;
      pointerStartX = null;
      if (Math.abs(distance) >= 56) {
        openPage(pageIndex + (distance < 0 ? 1 : -1));
      }
    });
    listen(options.stage, 'pointercancel', () => {
      pointerStartX = null;
    });
  }

  return {
    enabled,
    badge: enabled ? options.extension.toUpperCase() : 'ARCHIVE',
    toolbarElements,
    getVisibleEntries: entries => enabled ? getComicBookPages(entries) : [...entries],
    sortEntries: entries => entries.sort(enabled
      ? naturalComicPageCompare
      : (left, right) => left.path.localeCompare(right.path)),
    onEntriesReady() {
      if (!enabled || !pages().length) {
        return;
      }
      const timer = options.document.defaultView?.setTimeout(() => {
        timers.delete(timer || 0);
        openPage(0);
      }, 0);
      if (timer !== undefined) {
        timers.add(timer);
      }
    },
    onEntrySelected(entry) {
      if (enabled) {
        pageIndex = pages().findIndex(page => page.id === entry.id);
      }
    },
    sync() {
      if (!enabled) {
        return;
      }
      const pageCount = pages().length;
      pageText.textContent = pageCount ? `${pageIndex + 1} / ${pageCount}` : '0 / 0';
      previousButton.disabled = pageIndex <= 0;
      nextButton.disabled = pageIndex < 0 || pageIndex >= pageCount - 1;
    },
    dispose() {
      cleanups.splice(0).forEach(cleanup => cleanup());
      timers.forEach(timer => options.document.defaultView?.clearTimeout(timer));
      timers.clear();
    },
  };
};
