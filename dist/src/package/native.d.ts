import { ViewerController, ViewerMountOptions, ViewerCoreOptions, ViewerSourceInput } from './controller';
export interface CreateFlyfishFileViewerOptions extends ViewerMountOptions {
    source?: ViewerSourceInput;
    autoLoad?: boolean;
    fetchFile?: ViewerCoreOptions['fetchFile'];
    onError?: ViewerCoreOptions['onError'];
}
export type FlyfishFileViewerNativeController = ViewerController;
export type FlyfishFileViewerNativeSource = ViewerSourceInput;
/**
 * Mount the full Flyfish renderer stack directly into a DOM container.
 *
 * This is the native integration base used by framework component packages. Component packages keep
 * their own component lifecycle and call the shared core controller for loading,
 * teardown, search, zoom, print and export.
 */
export declare const createFlyfishFileViewer: (container: HTMLElement, options?: CreateFlyfishFileViewerOptions) => ViewerController;
export declare const mountFlyfishFileViewer: (container: HTMLElement, options?: CreateFlyfishFileViewerOptions) => ViewerController;
