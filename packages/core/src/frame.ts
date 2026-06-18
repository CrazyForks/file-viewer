import {
  setFileViewerOptionsSearchParam,
  type FileViewerSerializableOptions,
} from './options';
import {
  isFileViewerFrameEvent,
  type FileViewerFrameEventHandler,
  type FileViewerFrameEventPayload,
} from './operations';
import { DEFAULT_FILE_VIEWER_SOURCE_FILENAME } from './source';
import type { FileViewerFileRef } from './types';

export type FileViewerFrameParamValue = string | number | boolean | null | undefined;
export type FileViewerFrameTimer = ReturnType<typeof globalThis.setTimeout>;

export interface FileViewerFrameOptions {
  /**
   * 私有化部署后的基线预览器页面地址。
   *
   * 默认使用安装后复制到宿主项目的 `/file-viewer/index.html`。
   */
  viewerUrl?: string;
  /**
   * 远端文件地址。会透传为预览器的 `url` 查询参数。
   */
  url?: string;
  /**
   * 本地二进制输入。优先级高于 `url`，会通过 postMessage 推送给 iframe。
   */
  file?: FileViewerFileRef;
  /**
   * 当 file 是 Blob 或 ArrayBuffer 时用于识别扩展名。
   */
  name?: string;
  /**
   * 允许推送二进制的宿主 origin。默认取当前页面 origin。
   */
  from?: string;
  /**
   * postMessage 的目标 origin。默认从 viewerUrl 推导。
   */
  targetOrigin?: string;
  /**
   * 预留给基线页面扩展的查询参数。
   */
  params?: Record<string, FileViewerFrameParamValue>;
  /**
   * iframe 入口页的缓存标识。传入 false 可关闭自动追加。
   */
  cacheKey?: string | false;
  /**
   * 透传给基线预览器的运行时选项，例如水印、工具栏和压缩包缓存限制。
   */
  options?: FileViewerSerializableOptions;
  /**
   * iframe 模式下接收基线预览器抛出的生命周期和操作事件。
   */
  onEvent?: FileViewerFrameEventHandler<Record<string, unknown> | null>;
}

export interface FileViewerFrameComponentProps extends Omit<FileViewerFrameOptions, 'onEvent'> {
  /**
   * Lifecycle and operation events emitted by the iframe viewer.
   *
   * Framework wrappers expose this friendlier prop name while mapping it to the
   * core iframe protocol's `onEvent` callback internally.
   */
  onViewerEvent?: FileViewerFrameOptions['onEvent'];
}

export interface FileViewerFrameIframeComponentProps {
  /**
   * Class name applied to the iframe created by the wrapper.
   */
  iframeClassName?: string;
  /**
   * Inline style merged into the iframe created by the wrapper.
   */
  iframeStyle?: Partial<CSSStyleDeclaration>;
  /**
   * Accessible title applied to the iframe created by the wrapper.
   */
  iframeTitle?: string;
}

export interface FileViewerFrameContainerComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> {
  /**
   * Class value applied to the wrapper's outer container.
   */
  containerClass?: ContainerClass;
  /**
   * Style value applied to the wrapper's outer container.
   */
  containerStyle?: ContainerStyle;
}

export interface FileViewerFrameHostComponentProps<
  ContainerClass = unknown,
  ContainerStyle = unknown
> extends
    FileViewerFrameComponentProps,
    FileViewerFrameIframeComponentProps,
    FileViewerFrameContainerComponentProps<ContainerClass, ContainerStyle> {}

export interface FileViewerFrameComponentBridgeOptions {
  /**
   * Additional event bridge used by framework wrappers to emit native events.
   *
   * `onViewerEvent` from component props is always called first when present.
   */
  onEvent?: FileViewerFrameOptions['onEvent'];
}

export interface BuildFileViewerFrameSrcOptions extends FileViewerFrameOptions {
  /**
   * wrapper 包可以用自己的默认入口覆盖 core 默认地址。
   */
  defaultViewerUrl?: string;
  /**
   * wrapper 包注入的默认缓存标识。
   */
  defaultCacheKey?: string;
  /**
   * SSR 或测试环境下解析相对 viewerUrl 的基准地址。
   */
  baseHref?: string;
  /**
   * SSR 或测试环境下本地文件投递使用的宿主 origin。
   */
  currentOrigin?: string;
}

export interface FileViewerFrameFilePostControllerOptions {
  /**
   * 返回当前 iframe。React/Vue 等 wrapper 可用 ref 包一层，避免闭包拿到旧节点。
   */
  getFrame: () => HTMLIFrameElement | null | undefined;
  /**
   * 返回当前 iframe 协议参数。用于文件切换后继续复用同一个控制器。
   */
  getOptions: () => FileViewerFrameOptions;
  /**
   * 最大重试次数。默认兼容历史 wrapper 行为。
   */
  retryLimit?: number;
  /**
   * 两次文件 postMessage 之间的间隔，单位毫秒。
   */
  retryInterval?: number;
  /**
   * 测试或非浏览器封装可注入自己的定时器实现。
   */
  setTimeout?: (callback: () => void, timeout: number) => FileViewerFrameTimer;
  /**
   * 与 setTimeout 配套的清理函数。
   */
  clearTimeout?: (timer: FileViewerFrameTimer) => void;
  /**
   * 自定义文件投递函数。默认使用 core 的 postFileToFileViewerFrame。
   */
  postFile?: (
    frame: HTMLIFrameElement | null | undefined,
    options: FileViewerFrameOptions
  ) => boolean;
}

export interface FileViewerFrameFilePostController {
  /**
   * 立即投递一次当前文件。
   */
  postNow(): boolean;
  /**
   * 从第一次投递开始调度重试，直到收到生命周期事件或达到上限。
   */
  schedule(): void;
  /**
   * 标记 iframe 已发出生命周期事件，并停止后续重试。
   */
  acknowledge(): void;
  /**
   * 处理 iframe 发来的事件。生命周期事件会自动 acknowledge。
   */
  handleFrameEvent(value: unknown): boolean;
  /**
   * 重置 acknowledge 状态并清理已有定时器。
   */
  reset(): void;
  /**
   * 清理已有定时器。
   */
  cancel(): void;
}

export interface FileViewerDirectFrameControllerOptions {
  /**
   * Return the iframe managed by a framework wrapper.
   */
  getFrame: () => HTMLIFrameElement | null | undefined;
  /**
   * Return the latest iframe protocol options.
   */
  getOptions: () => FileViewerFrameOptions;
  /**
   * Return the latest iframe src computed by the wrapper.
   */
  getSrc: () => string;
  /**
   * Optional event callback getter for wrappers that keep callbacks outside
   * frame options to avoid rebuilding URLs for callback-only updates.
   */
  getOnEvent?: () => FileViewerFrameOptions['onEvent'] | undefined;
}

export interface FileViewerDirectFrameController {
  readonly ready: boolean;
  postFile(): boolean;
  reload(): void;
  resetForSrcChange(): void;
  syncOptions(): void;
  handleLoad(): void;
  handleMessage(event: MessageEvent): boolean;
  destroy(): void;
}

export type FileViewerDirectFrameControllerAccessor = () => FileViewerDirectFrameController | null | undefined;

export interface CreateFileViewerFrameOptions extends BuildFileViewerFrameSrcOptions {
  /**
   * iframe load 后是否立即尝试投递本地文件。默认开启。
   */
  autoPostFile?: boolean;
  /**
   * 透传给 iframe 的 className。
   */
  className?: string;
  /**
   * 合并到 iframe 默认样式上的行内样式。
   */
  style?: Partial<CSSStyleDeclaration>;
  /**
   * iframe title，便于无障碍和浏览器工具识别。
   */
  title?: string;
}

export interface FileViewerFrameController {
  readonly frame: HTMLIFrameElement;
  readonly src: string;
  destroy(): void;
  postFile(): boolean;
  reload(): void;
  update(options: FileViewerFrameOptions): string;
}

export type FileViewerFrameControllerAccessor = () => FileViewerFrameController | null | undefined;

export interface FileViewerDirectFrameHandle {
  readonly iframe: HTMLIFrameElement | null;
  postFile(): boolean;
  reload(): void;
}

export interface FileViewerMountedFrameHandle {
  getController(): FileViewerFrameController | null;
  getIframe(): HTMLIFrameElement | null;
  update(options: FileViewerFrameOptions): string;
  postFile(): boolean;
  reload(): void;
  destroy(): void;
}

export interface FileViewerFrameControllerHandle {
  readonly controller: FileViewerFrameController | null;
  readonly iframe: HTMLIFrameElement | null;
  update(options: FileViewerFrameOptions): string;
  postFile(): boolean;
  reload(): void;
  destroy(): void;
}

export const DEFAULT_FILE_VIEWER_PUBLIC_DIR = '/file-viewer';
export const DEFAULT_FILE_VIEWER_URL = `${DEFAULT_FILE_VIEWER_PUBLIC_DIR}/index.html`;
export const DEFAULT_FILE_VIEWER_FRAME_TITLE = 'Flyfish Viewer 文件预览';
export const DEFAULT_FILE_VIEWER_FRAME_FILE_POST_RETRY_LIMIT = 8;
export const DEFAULT_FILE_VIEWER_FRAME_FILE_POST_RETRY_INTERVAL = 120;

export const canUseFileViewerDom = () => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

const isFile = (value: unknown): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

const isBlob = (value: unknown): value is Blob => {
  return typeof Blob !== 'undefined' && value instanceof Blob;
};

const isArrayBuffer = (value: unknown): value is ArrayBuffer => {
  return typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer;
};

export const normalizeFileViewerFrameUrl = (
  viewerUrl?: string,
  defaultViewerUrl = DEFAULT_FILE_VIEWER_URL
) => {
  const value = viewerUrl || defaultViewerUrl;
  return value.endsWith('/') ? `${value}index.html` : value;
};

export const isFileViewerAbsoluteUrl = (value?: string) => {
  return !!value && (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) || value.startsWith('//'));
};

export const createFileViewerFrameUrl = (
  viewerUrl?: string,
  defaultViewerUrl = DEFAULT_FILE_VIEWER_URL,
  baseHref?: string
) => {
  const normalizedViewerUrl = normalizeFileViewerFrameUrl(viewerUrl, defaultViewerUrl);
  if (canUseFileViewerDom()) {
    return new URL(normalizedViewerUrl, baseHref || window.location.href);
  }
  return new URL(normalizedViewerUrl, baseHref || 'http://localhost');
};

export const serializeFileViewerFrameUrl = (url: URL, viewerUrl?: string) => {
  if (isFileViewerAbsoluteUrl(viewerUrl)) {
    return url.toString();
  }
  return url.pathname + url.search + url.hash;
};

export const appendFileViewerFrameSearchParam = (
  target: URL,
  key: string,
  value: FileViewerFrameParamValue
) => {
  if (value === undefined || value === null || value === '') {
    target.searchParams.delete(key);
    return;
  }
  target.searchParams.set(key, String(value));
};

export const getFileViewerCurrentOrigin = () => {
  return canUseFileViewerDom() ? window.location.origin : '';
};

export const getFileViewerFrameUrl = (viewerUrl?: string, defaultViewerUrl = DEFAULT_FILE_VIEWER_URL) => {
  return normalizeFileViewerFrameUrl(viewerUrl, defaultViewerUrl);
};

export const getFileViewerFrameOrigin = (
  viewerUrl?: string,
  defaultViewerUrl = DEFAULT_FILE_VIEWER_URL,
  baseHref?: string
) => {
  if (!viewerUrl && !canUseFileViewerDom() && !baseHref) {
    return '';
  }
  return createFileViewerFrameUrl(viewerUrl, defaultViewerUrl, baseHref).origin;
};

export const getFileViewerFrameSourceFilename = (
  options: Pick<FileViewerFrameOptions, 'file' | 'name' | 'url'>
) => {
  if (isFile(options.file) && options.file.name) {
    return options.file.name;
  }
  if (options.name) {
    return options.name;
  }
  if (options.url) {
    const clean = options.url.split('?')[0]?.split('#')[0] || options.url;
    return clean.substring(clean.lastIndexOf('/') + 1) || clean;
  }
  return DEFAULT_FILE_VIEWER_SOURCE_FILENAME;
};

export const buildFileViewerFrameSrc = (options: BuildFileViewerFrameSrcOptions = {}) => {
  const src = createFileViewerFrameUrl(options.viewerUrl, options.defaultViewerUrl, options.baseHref);

  Object.entries(options.params || {}).forEach(([key, value]) => {
    appendFileViewerFrameSearchParam(src, key, value);
  });
  appendFileViewerFrameSearchParam(
    src,
    '__flyfish_viewer_version',
    options.cacheKey === false ? undefined : (options.cacheKey || options.defaultCacheKey)
  );
  setFileViewerOptionsSearchParam(src.searchParams, options.options);

  if (options.file) {
    appendFileViewerFrameSearchParam(src, 'url', undefined);
    appendFileViewerFrameSearchParam(src, 'name', getFileViewerFrameSourceFilename(options));
    appendFileViewerFrameSearchParam(
      src,
      'from',
      options.from || options.currentOrigin || getFileViewerCurrentOrigin()
    );
    return serializeFileViewerFrameUrl(src, options.viewerUrl);
  }

  appendFileViewerFrameSearchParam(src, 'name', undefined);
  appendFileViewerFrameSearchParam(src, 'from', undefined);
  appendFileViewerFrameSearchParam(src, 'url', options.url);
  return serializeFileViewerFrameUrl(src, options.viewerUrl);
};

export const toFileViewerFrameMessageBlob = (file?: FileViewerFileRef) => {
  if (!file) {
    return undefined;
  }
  if (isBlob(file)) {
    return file;
  }
  if (isArrayBuffer(file)) {
    return new Blob([file]);
  }
  return undefined;
};

export const toFileViewerFrameOptions = (
  props: FileViewerFrameHostComponentProps,
  bridgeOptions: FileViewerFrameComponentBridgeOptions = {}
): CreateFileViewerFrameOptions => {
  const onViewerEvent = props.onViewerEvent;
  const bridgeOnEvent = bridgeOptions.onEvent;
  const onEvent: FileViewerFrameOptions['onEvent'] | undefined =
    onViewerEvent || bridgeOnEvent
      ? (payload, event) => {
          onViewerEvent?.(payload, event);
          bridgeOnEvent?.(payload, event);
        }
      : undefined;

  return {
    viewerUrl: props.viewerUrl,
    url: props.url,
    file: props.file,
    name: props.name,
    from: props.from,
    targetOrigin: props.targetOrigin,
    params: props.params,
    cacheKey: props.cacheKey,
    options: props.options,
    className: props.iframeClassName,
    style: props.iframeStyle,
    title: props.iframeTitle,
    onEvent,
  };
};

export const postFileToFileViewerFrame = (
  frame: HTMLIFrameElement | null | undefined,
  options: FileViewerFrameOptions
) => {
  const data = toFileViewerFrameMessageBlob(options.file);
  const targetWindow = frame?.contentWindow;
  if (!data || !targetWindow) {
    return false;
  }

  targetWindow.postMessage(data, options.targetOrigin || getFileViewerFrameOrigin(options.viewerUrl));
  return true;
};

const isSerializableFileViewerFrameEvent = (
  value: unknown
): value is FileViewerFrameEventPayload<Record<string, unknown> | null> => {
  return isFileViewerFrameEvent(value);
};

export const createFileViewerFrameFilePostController = (
  controllerOptions: FileViewerFrameFilePostControllerOptions
): FileViewerFrameFilePostController => {
  const retryLimit = controllerOptions.retryLimit ?? DEFAULT_FILE_VIEWER_FRAME_FILE_POST_RETRY_LIMIT;
  const retryInterval = controllerOptions.retryInterval ?? DEFAULT_FILE_VIEWER_FRAME_FILE_POST_RETRY_INTERVAL;
  const scheduleTimer = controllerOptions.setTimeout ?? ((callback, timeout) => {
    return globalThis.setTimeout(callback, timeout);
  });
  const clearTimer = controllerOptions.clearTimeout ?? ((timer) => {
    globalThis.clearTimeout(timer);
  });
  const postFile = controllerOptions.postFile ?? postFileToFileViewerFrame;

  let retryTimer: FileViewerFrameTimer | undefined;
  let retryCount = 0;
  let lifecycleAcknowledged = false;

  const cancel = () => {
    if (retryTimer !== undefined) {
      clearTimer(retryTimer);
      retryTimer = undefined;
    }
  };

  const postNow = () => postFile(controllerOptions.getFrame(), controllerOptions.getOptions());

  const acknowledge = () => {
    lifecycleAcknowledged = true;
    cancel();
  };

  const schedule = () => {
    cancel();
    retryCount = 0;
    lifecycleAcknowledged = false;

    if (!controllerOptions.getOptions().file) {
      return;
    }

    const post = () => {
      if (lifecycleAcknowledged) {
        cancel();
        return;
      }

      postNow();
      retryCount += 1;

      if (retryCount < retryLimit) {
        retryTimer = scheduleTimer(post, retryInterval);
      } else {
        retryTimer = undefined;
      }
    };

    post();
  };

  const handleFrameEvent = (value: unknown) => {
    if (!isFileViewerFrameEvent(value)) {
      return false;
    }
    if (value.type === 'flyfish-viewer:lifecycle') {
      acknowledge();
      return true;
    }
    return false;
  };

  return {
    postNow,
    schedule,
    acknowledge,
    handleFrameEvent,
    reset() {
      lifecycleAcknowledged = false;
      retryCount = 0;
      cancel();
    },
    cancel,
  };
};

export const createFileViewerDirectFrameController = ({
  getFrame,
  getOptions,
  getSrc,
  getOnEvent,
}: FileViewerDirectFrameControllerOptions): FileViewerDirectFrameController => {
  const filePostController = createFileViewerFrameFilePostController({
    getFrame,
    getOptions,
  });
  let frameReady = false;

  const getEventHandler = () => getOnEvent?.() || getOptions().onEvent;

  return {
    get ready() {
      return frameReady;
    },
    postFile() {
      return filePostController.postNow();
    },
    reload() {
      const frame = getFrame();
      if (frame) {
        frame.src = getSrc();
      }
    },
    resetForSrcChange() {
      frameReady = false;
      filePostController.reset();
    },
    syncOptions() {
      if (frameReady) {
        filePostController.schedule();
      }
    },
    handleLoad() {
      frameReady = true;
      filePostController.schedule();
    },
    handleMessage(event: MessageEvent) {
      if (event.source !== getFrame()?.contentWindow || !isSerializableFileViewerFrameEvent(event.data)) {
        return false;
      }
      filePostController.handleFrameEvent(event.data);
      getEventHandler()?.(event.data, event);
      return true;
    },
    destroy() {
      frameReady = false;
      filePostController.cancel();
    },
  };
};

export const syncFileViewerFrame = (
  frame: HTMLIFrameElement | null | undefined,
  options: BuildFileViewerFrameSrcOptions
) => {
  if (!frame || !canUseFileViewerDom()) {
    return '';
  }
  const nextSrc = buildFileViewerFrameSrc(options);
  if (frame.getAttribute('src') !== nextSrc) {
    frame.setAttribute('src', nextSrc);
  }
  return nextSrc;
};

export const createFileViewerDirectFrameHandle = (
  getFrame: () => HTMLIFrameElement | null | undefined,
  getController: FileViewerDirectFrameControllerAccessor
): FileViewerDirectFrameHandle => ({
  get iframe() {
    return getFrame() ?? null;
  },
  postFile() {
    return getController()?.postFile() ?? false;
  },
  reload() {
    getController()?.reload();
  },
});

export const createFileViewerMountedFrameHandle = (
  getController: FileViewerFrameControllerAccessor,
  destroy: () => void
): FileViewerMountedFrameHandle => ({
  getController() {
    return getController() ?? null;
  },
  getIframe() {
    return getController()?.frame ?? null;
  },
  update(options: FileViewerFrameOptions) {
    return getController()?.update(options) ?? '';
  },
  postFile() {
    return getController()?.postFile() ?? false;
  },
  reload() {
    getController()?.reload();
  },
  destroy,
});

export const createFileViewerFrameControllerHandle = (
  getController: FileViewerFrameControllerAccessor,
  destroy: () => void
): FileViewerFrameControllerHandle => ({
  get controller() {
    return getController() ?? null;
  },
  get iframe() {
    return getController()?.frame ?? null;
  },
  update(options: FileViewerFrameOptions) {
    return getController()?.update(options) ?? '';
  },
  postFile() {
    return getController()?.postFile() ?? false;
  },
  reload() {
    getController()?.reload();
  },
  destroy,
});

export const createFileViewerFrame = (options: CreateFileViewerFrameOptions = {}) => {
  if (!canUseFileViewerDom()) {
    throw new Error('createFileViewerFrame 只能在浏览器环境中使用');
  }

  const frame = document.createElement('iframe');
  frame.setAttribute('src', buildFileViewerFrameSrc(options));
  frame.title = options.title || DEFAULT_FILE_VIEWER_FRAME_TITLE;
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  frame.style.display = 'block';

  if (options.className) {
    frame.className = options.className;
  }
  if (options.style) {
    Object.assign(frame.style, options.style);
  }

  if (options.autoPostFile !== false) {
    frame.addEventListener('load', () => {
      postFileToFileViewerFrame(frame, options);
    });
  }

  return frame;
};

export const mountFileViewerFrame = (
  container: HTMLElement,
  initialOptions: CreateFileViewerFrameOptions = {}
): FileViewerFrameController => {
  let options = initialOptions;
  let src = buildFileViewerFrameSrc(options);
  const frame = createFileViewerFrame({ ...options, autoPostFile: false });
  const filePostController = createFileViewerFrameFilePostController({
    getFrame: () => frame,
    getOptions: () => options,
  });

  const handleLoad = () => {
    filePostController.schedule();
  };
  const handleMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow || !isSerializableFileViewerFrameEvent(event.data)) {
      return;
    }
    filePostController.handleFrameEvent(event.data);
    options.onEvent?.(event.data, event);
  };

  frame.addEventListener('load', handleLoad);
  window.addEventListener('message', handleMessage);
  container.appendChild(frame);

  return {
    frame,
    get src() {
      return src;
    },
    destroy() {
      filePostController.cancel();
      frame.removeEventListener('load', handleLoad);
      window.removeEventListener('message', handleMessage);
      frame.remove();
    },
    postFile() {
      return filePostController.postNow();
    },
    reload() {
      frame.src = src;
    },
    update(nextOptions: FileViewerFrameOptions) {
      options = { ...options, ...nextOptions };
      const previousSrc = frame.src;
      src = syncFileViewerFrame(frame, options);
      if (frame.src === previousSrc) {
        filePostController.schedule();
      }
      return src;
    },
  };
};
