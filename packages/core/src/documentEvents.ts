import { getCurrentFileViewerDocumentAnchor } from './documentDom';
import { cloneFileViewerSearchState } from './documentSearch';
import {
  postFileViewerLocationChange,
  postFileViewerSearchChange,
} from './operations';
import type {
  FileViewerDocumentAnchor,
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
