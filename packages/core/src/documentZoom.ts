import { createFileViewerZoomState } from './document';
import { findFileViewerZoomProvider } from './documentDom';
import type {
  FileViewerOperationType,
  FileViewerZoomProvider,
  FileViewerZoomState,
} from './types';

export type FileViewerZoomOperation = Extract<
  FileViewerOperationType,
  'zoom-in' | 'zoom-out' | 'zoom-reset'
>;

export interface CreateFileViewerZoomControllerOptions {
  root: () => HTMLElement | null | undefined;
  enabled?: () => boolean;
  beforeZoom?: (operation: FileViewerZoomOperation) => Promise<boolean> | boolean;
}

export const cloneFileViewerZoomState = (state: FileViewerZoomState): FileViewerZoomState => ({
  scale: state.scale,
  label: state.label,
  canZoomIn: state.canZoomIn,
  canZoomOut: state.canZoomOut,
  canReset: state.canReset,
  minScale: state.minScale,
  maxScale: state.maxScale,
});

const getMutationObserverConstructor = (root: HTMLElement | null | undefined) => {
  return root?.ownerDocument.defaultView?.MutationObserver ||
    (typeof MutationObserver !== 'undefined' ? MutationObserver : undefined);
};

export const createFileViewerZoomController = ({
  root,
  enabled,
  beforeZoom,
}: CreateFileViewerZoomControllerOptions) => {
  let provider: FileViewerZoomProvider | null = null;
  let unsubscribe: (() => void) | null = null;
  let observer: MutationObserver | null = null;
  const state = createFileViewerZoomState();

  const applyState = (nextState?: FileViewerZoomState | null) => {
    const normalized = createFileViewerZoomState(nextState || {});
    state.scale = normalized.scale;
    state.label = normalized.label;
    state.canZoomIn = normalized.canZoomIn;
    state.canZoomOut = normalized.canZoomOut;
    state.canReset = normalized.canReset;
    state.minScale = normalized.minScale;
    state.maxScale = normalized.maxScale;
  };

  const clearProvider = () => {
    unsubscribe?.();
    unsubscribe = null;
    provider = null;
    applyState(null);
  };

  const syncProvider = () => {
    if (enabled?.() === false) {
      clearProvider();
      return null;
    }

    const nextProvider = findFileViewerZoomProvider(root());
    if (nextProvider !== provider) {
      unsubscribe?.();
      provider = nextProvider;
      unsubscribe = nextProvider?.subscribe?.(() => {
        applyState(nextProvider.getState());
      }) || null;
    }
    applyState(nextProvider?.getState?.() || null);
    return nextProvider;
  };

  const disconnectObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const runZoomAction = async (
    operation: FileViewerZoomOperation,
    action: (nextProvider: FileViewerZoomProvider) => FileViewerZoomState | Promise<FileViewerZoomState>
  ) => {
    const nextProvider = syncProvider();
    if (!nextProvider) {
      return cloneFileViewerZoomState(state);
    }

    if (beforeZoom && await beforeZoom(operation) === false) {
      return cloneFileViewerZoomState(state);
    }

    const nextState = await action(nextProvider);
    applyState(nextState || nextProvider.getState());
    return cloneFileViewerZoomState(state);
  };

  return {
    get provider() {
      return provider;
    },
    state,
    hasProvider() {
      return !!syncProvider();
    },
    refreshProvider: syncProvider,
    observe() {
      disconnectObserver();
      const currentRoot = root();
      const MutationObserverCtor = getMutationObserverConstructor(currentRoot);
      if (!currentRoot || !MutationObserverCtor) {
        syncProvider();
        return;
      }
      observer = new MutationObserverCtor(() => {
        syncProvider();
      });
      observer.observe(currentRoot, {
        childList: true,
        subtree: true,
      });
      syncProvider();
    },
    clearProvider,
    getState() {
      return cloneFileViewerZoomState(state);
    },
    zoomIn: () => runZoomAction('zoom-in', nextProvider => nextProvider.zoomIn()),
    zoomOut: () => runZoomAction('zoom-out', nextProvider => nextProvider.zoomOut()),
    resetZoom: () => runZoomAction('zoom-reset', nextProvider => nextProvider.resetZoom()),
    destroy() {
      disconnectObserver();
      clearProvider();
    },
  };
};
