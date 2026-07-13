import JSZip from 'jszip';
import { createViewer, disposeFileViewerRendered } from '@file-viewer/core';
import archiveRenderer, { renderFileViewerArchive } from '../src/index.js';

const output = document.querySelector('[data-testid="result"]') as HTMLElement;
const host = document.querySelector('[data-testid="viewer"]') as HTMLDivElement;

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000) => {
  const startedAt = performance.now();
  while (!predicate()) {
    if (performance.now() - startedAt > timeoutMs) {
      throw new Error('Comic book preview did not become ready in time.');
    }
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  }
};

const createPage = async (label: string, color: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 640;
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  context.fillStyle = color;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#ffffff';
  context.font = '700 64px sans-serif';
  context.textAlign = 'center';
  context.fillText(label, canvas.width / 2, canvas.height / 2);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
    value => value ? resolve(value) : reject(new Error('Unable to create comic fixture.')),
    'image/png'
  ));
  return blob.arrayBuffer();
};

try {
  const zip = new JSZip();
  zip.file('chapter/page10.png', await createPage('PAGE 10', '#7c3aed'));
  zip.file('chapter/page2.png', await createPage('PAGE 2', '#ea580c'));
  zip.file('ComicInfo.xml', '<ComicInfo><Title>Smoke comic</Title></ComicInfo>');
  zip.file('notes.txt', 'This entry must not appear in comic mode.');
  const buffer = await zip.generateAsync({ type: 'arraybuffer' });
  const viewer = createViewer(host, {
    options: {
      renderers: [archiveRenderer],
      archive: {
        cache: false,
        workerUrl: 'data:text/javascript,',
        workerTimeoutMs: 100,
      },
    },
  });
  await viewer.load({ buffer, filename: 'smoke.cbz', type: 'cbz' });

  const pageText = () => host.querySelector('.archive-comic-page')?.textContent?.trim();
  const activeTitle = () => host.querySelector('.archive-preview-toolbar strong')?.textContent?.trim();
  await waitFor(() => pageText() === '1 / 2' && activeTitle() === 'page2.png' && !!host.querySelector('.archive-nested-target img'));

  const paths = Array.from(host.querySelectorAll<HTMLButtonElement>('.archive-entry')).map(entry => entry.title);
  const [previousButton, nextButton] = host.querySelectorAll<HTMLButtonElement>('.archive-comic-nav');
  nextButton.focus();
  nextButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  const buttonSpaceIgnored = pageText() === '1 / 2';
  nextButton.click();
  await waitFor(() => pageText() === '2 / 2' && activeTitle() === 'page10.png');

  const root = host.querySelector('.archive-viewer') as HTMLElement;
  root.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
  await waitFor(() => pageText() === '1 / 2' && activeTitle() === 'page2.png');

  const stage = host.querySelector('.archive-nested-target') as HTMLElement;
  stage.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, isPrimary: true, clientX: 200, bubbles: true }));
  stage.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, isPrimary: true, clientX: 100, bubbles: true }));
  await waitFor(() => pageText() === '2 / 2' && activeTitle() === 'page10.png');

  const badge = host.querySelector('.archive-head-main > span')?.textContent?.trim();
  const raceHost = document.createElement('div');
  raceHost.style.cssText = 'width:800px;height:600px';
  document.body.append(raceHost);
  let nestedCalls = 0;
  let staleDisposals = 0;
  let firstRenderStarted = false;
  const raceRendered = await renderFileViewerArchive(buffer, raceHost, 'cbz', {
    filename: 'race.cbz',
    options: {
      archive: {
        cache: false,
        workerUrl: 'data:text/javascript,',
        workerTimeoutMs: 100,
      },
    },
    renderNestedBuffer: async (_entryBuffer, _type, target) => {
      const call = ++nestedCalls;
      if (call === 1) firstRenderStarted = true;
      await new Promise(resolve => setTimeout(resolve, call === 1 ? 80 : 5));
      const marker = document.createElement('div');
      marker.dataset.racePage = String(call);
      target.replaceChildren(marker);
      return {
        unmount() {
          staleDisposals += 1;
          target.replaceChildren();
        },
      };
    },
  });
  await waitFor(() => firstRenderStarted);
  raceHost.querySelectorAll<HTMLButtonElement>('.archive-comic-nav')[1]?.click();
  await waitFor(() => raceHost.querySelector('[data-race-page="2"]') !== null);
  await new Promise(resolve => setTimeout(resolve, 100));
  const raceStable = raceHost.querySelector('[data-race-page="2"]') !== null &&
    raceHost.querySelector('[data-race-page="1"]') === null && staleDisposals === 1;
  await disposeFileViewerRendered(raceRendered);
  raceHost.remove();

  const passed = badge === 'CBZ' && buttonSpaceIgnored && raceStable &&
    JSON.stringify(paths) === JSON.stringify(['chapter/page2.png', 'chapter/page10.png']);
  await viewer.destroy();
  const remainingViewers = host.querySelectorAll('.archive-viewer').length;
  output.dataset.status = passed && remainingViewers === 0 ? 'passed' : 'failed';
  output.textContent = JSON.stringify({
    passed: passed && remainingViewers === 0,
    badge,
    paths,
    buttonSpaceIgnored,
    raceStable,
    staleDisposals,
    finalPage: '2 / 2',
    remainingViewers,
  }, null, 2);
} catch (error) {
  output.dataset.status = 'failed';
  output.textContent = JSON.stringify({
    passed: false,
    error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
  }, null, 2);
}
