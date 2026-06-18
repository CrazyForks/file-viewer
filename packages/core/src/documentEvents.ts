import { buildFileViewerDocumentTextChunks } from './document';
import {
  getCurrentFileViewerDocumentAnchor,
  resolveFileViewerScrollContainer,
  scrollToFileViewerDocumentAnchor,
} from './documentDom';
import {
  cloneFileViewerSearchState,
  createFileViewerDomSearchController,
  createFileViewerDomSearchControllerActionHandlers,
  type FileViewerDomSearchControllerStateTarget,
} from './documentSearch';
import {
  postFileViewerLocationChange,
  postFileViewerSearchChange,
} from './operations';
import type {
  FileViewerAiOptions,
  FileViewerDocumentAnchor,
  FileViewerDocumentChunk,
  FileViewerSearchOptions,
  FileViewerSearchState,
} from './types';

export interface ResolveFileViewerLocationChangeAnchorInput {
  root: HTMLElement | null | undefined;
  anchors: FileViewerDocumentAnchor[];
}

export interface CreateFileViewerDocumentChangeSnapshotInput
  extends ResolveFileViewerLocationChangeAnchorInput {
  searchState: FileViewerSearchState;
}

export interface FileViewerDocumentChangeSnapshot {
  searchState: FileViewerSearchState;
  locationAnchor: FileViewerDocumentAnchor | null;
}

export interface DispatchFileViewerSearchChangeInput {
  state: FileViewerSearchState;
  onChange?: (state: FileViewerSearchState) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface DispatchFileViewerLocationChangeInput {
  anchor: FileViewerDocumentAnchor | null;
  onChange?: (anchor: FileViewerDocumentAnchor | null) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface FileViewerDocumentFeatureSearchController {
  getAnchors(): FileViewerDocumentAnchor[];
  getSearchState(): FileViewerSearchState;
  observe(): void;
  refreshAnchors(): Promise<FileViewerDocumentAnchor[]>;
  search(query: string): Promise<unknown>;
  clear(): Promise<unknown>;
  next(): Promise<unknown>;
  previous(): Promise<unknown>;
}

export interface CreateFileViewerDocumentFeatureActionsInput {
  root: () => HTMLElement | null | undefined;
  searchController: FileViewerDocumentFeatureSearchController;
  getAiOptions?: () => boolean | FileViewerAiOptions | undefined;
  onSearchChange?: (state: FileViewerSearchState) => void;
  onLocationChange?: (anchor: FileViewerDocumentAnchor | null) => void;
  targetOrigin?: string;
  targetWindow?: Window;
}

export interface FileViewerDocumentFeatureActions {
  refreshDocumentIndex(): Promise<FileViewerDocumentAnchor[]>;
  clearDocumentState(): void;
  getScrollContainer(): HTMLElement | null;
  searchDocument(query: string): Promise<FileViewerSearchState>;
  clearDocumentSearch(): Promise<FileViewerSearchState>;
  nextSearchResult(): Promise<FileViewerSearchState>;
  previousSearchResult(): Promise<FileViewerSearchState>;
  getSearchState(): FileViewerSearchState;
  collectDocumentAnchors(): Promise<FileViewerDocumentAnchor[]>;
  scrollToAnchor(anchor: FileViewerDocumentAnchor | string): Promise<boolean>;
  scrollToLine(line: number): Promise<boolean>;
  getDocumentTextChunks(): FileViewerDocumentChunk[];
}

export interface CreateFileViewerDocumentFeatureControllerActionHandlersInput
  extends Omit<CreateFileViewerDocumentFeatureActionsInput, 'searchController'> {
  searchTarget: FileViewerDomSearchControllerStateTarget;
  searchOptions?: () => boolean | FileViewerSearchOptions | undefined;
  waitForDomUpdate?: () => Promise<void> | void;
  preferredScrollContainer?: () => HTMLElement | null | undefined;
}

export interface FileViewerDocumentFeatureControllerActionHandlers extends FileViewerDocumentFeatureActions {
  destroyDocumentFeatures(): FileViewerSearchState;
}

export const createFileViewerSearchChangeState = (
  state: FileViewerSearchState
): FileViewerSearchState => {
  return cloneFileViewerSearchState(state);
};

export const resolveFileViewerLocationChangeAnchor = ({
  root,
  anchors,
}: ResolveFileViewerLocationChangeAnchorInput) => {
  return getCurrentFileViewerDocumentAnchor(root || null, anchors);
};

export const createFileViewerDocumentChangeSnapshot = ({
  root,
  anchors,
  searchState,
}: CreateFileViewerDocumentChangeSnapshotInput): FileViewerDocumentChangeSnapshot => {
  return {
    searchState: createFileViewerSearchChangeState(searchState),
    locationAnchor: resolveFileViewerLocationChangeAnchor({ root, anchors }),
  };
};

export const createFileViewerDocumentFeatureControllerActionHandlers = ({
  root,
  searchTarget,
  searchOptions,
  waitForDomUpdate,
  preferredScrollContainer,
  getAiOptions,
  onSearchChange,
  onLocationChange,
  targetOrigin,
  targetWindow,
}: CreateFileViewerDocumentFeatureControllerActionHandlersInput): FileViewerDocumentFeatureControllerActionHandlers => {
  let documentActions: FileViewerDocumentFeatureActions | null = null;
  const searchController = createFileViewerDomSearchController({
    root,
    options: searchOptions,
    waitForDomUpdate,
    preferredScrollContainer: () => preferredScrollContainer?.() ?? documentActions?.getScrollContainer() ?? null,
  });
  const searchActions = createFileViewerDomSearchControllerActionHandlers(searchTarget, searchController);

  documentActions = createFileViewerDocumentFeatureActions({
    root,
    searchController: {
      getAnchors: () => searchTarget.anchors.value,
      getSearchState: () => searchTarget.state,
      observe: searchActions.observe,
      refreshAnchors: searchActions.refreshAnchors,
      search: searchActions.search,
      clear: searchActions.clear,
      next: searchActions.next,
      previous: searchActions.previous,
    },
    getAiOptions,
    onSearchChange,
    onLocationChange,
    targetOrigin,
    targetWindow,
  });

  return {
    ...documentActions,
    destroyDocumentFeatures: searchActions.destroy,
  };
};

export const dispatchFileViewerSearchChange = ({
  state,
  onChange,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerSearchChangeInput) => {
  const payload = createFileViewerSearchChangeState(state);
  onChange?.(payload);
  return postFileViewerSearchChange(payload, targetOrigin, targetWindow);
};

export const dispatchFileViewerLocationChange = ({
  anchor,
  onChange,
  targetOrigin = '*',
  targetWindow = typeof window !== 'undefined' ? window : undefined,
}: DispatchFileViewerLocationChangeInput) => {
  onChange?.(anchor);
  return postFileViewerLocationChange(anchor, targetOrigin, targetWindow);
};

export const createFileViewerDocumentFeatureActions = ({
  root,
  searchController,
  getAiOptions,
  onSearchChange,
  onLocationChange,
  targetOrigin,
  targetWindow,
}: CreateFileViewerDocumentFeatureActionsInput): FileViewerDocumentFeatureActions => {
  const getRoot = () => root() || null;
  const getAnchors = () => searchController.getAnchors();

  const getSearchState = () => createFileViewerSearchChangeState(searchController.getSearchState());

  const notifySearchChange = () => {
    const state = getSearchState();
    dispatchFileViewerSearchChange({
      state,
      onChange: onSearchChange,
      targetOrigin,
      targetWindow,
    });
    return state;
  };

  const notifyLocationChange = () => {
    const anchor = resolveFileViewerLocationChangeAnchor({
      root: getRoot(),
      anchors: getAnchors(),
    });
    dispatchFileViewerLocationChange({
      anchor,
      onChange: onLocationChange,
      targetOrigin,
      targetWindow,
    });
    return anchor;
  };

  const refreshDocumentIndex = async () => {
    searchController.observe();
    const anchors = await searchController.refreshAnchors();
    notifyLocationChange();
    return anchors;
  };

  const ensureAnchors = async () => {
    if (!getAnchors().length) {
      await refreshDocumentIndex();
    }
    return getAnchors();
  };

  return {
    refreshDocumentIndex,
    clearDocumentState() {
      void searchController.clear();
    },
    getScrollContainer() {
      return resolveFileViewerScrollContainer(getRoot());
    },
    async searchDocument(query: string) {
      await searchController.search(query);
      return notifySearchChange();
    },
    async clearDocumentSearch() {
      await searchController.clear();
      return notifySearchChange();
    },
    async nextSearchResult() {
      await searchController.next();
      notifyLocationChange();
      return notifySearchChange();
    },
    async previousSearchResult() {
      await searchController.previous();
      notifyLocationChange();
      return notifySearchChange();
    },
    getSearchState,
    async collectDocumentAnchors() {
      await refreshDocumentIndex();
      return getAnchors();
    },
    async scrollToAnchor(anchor: FileViewerDocumentAnchor | string) {
      await ensureAnchors();
      const result = scrollToFileViewerDocumentAnchor(getRoot(), anchor);
      notifyLocationChange();
      return result;
    },
    async scrollToLine(line: number) {
      await ensureAnchors();
      const result = scrollToFileViewerDocumentAnchor(getRoot(), line);
      notifyLocationChange();
      return result;
    },
    getDocumentTextChunks() {
      return buildFileViewerDocumentTextChunks(getAnchors(), getAiOptions?.());
    },
  };
};
