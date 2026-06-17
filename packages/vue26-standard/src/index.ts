import Vue from 'vue'
import type { CreateElement, PluginObject, VueConstructor, VNode } from 'vue'
import {
  mountViewerFrame,
  type CreateViewerFrameOptions,
  type FileRef,
  type ViewerFrameController,
  type ViewerFrameEventHandler,
  type ViewerFrameEventPayload,
  type ViewerFrameOptions,
  type ViewerRuntimeOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerFrameController,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameOptions,
  ViewerRuntimeOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition
} from '@file-viewer/web'

export interface FileViewerVue26PluginOptions {
  componentName?: string
}

export interface FileViewerVue26PublicInstance extends Vue {
  getController(): ViewerFrameController | null
  getIframe(): HTMLIFrameElement | null
  update(options: ViewerFrameOptions): string
  postFile(): boolean
  reload(): void
  destroy(): void
}

interface FileViewerVue26Props {
  viewerUrl?: string
  url?: string
  file?: FileRef
  name?: string
  from?: string
  targetOrigin?: string
  params?: CreateViewerFrameOptions['params']
  cacheKey?: CreateViewerFrameOptions['cacheKey']
  options?: ViewerRuntimeOptions
  onViewerEvent?: ViewerFrameEventHandler
  iframeClassName?: string
  iframeStyle?: Partial<CSSStyleDeclaration>
  iframeTitle?: string
  containerClass?: unknown
  containerStyle?: unknown
}

type FileViewerVue26Vm = Vue & FileViewerVue26Props & {
  controller: ViewerFrameController | null
  getFrameOptions(): CreateViewerFrameOptions
  handleViewerEvent(payload: ViewerFrameEventPayload, event: MessageEvent): void
  mountViewer(): void
  updateViewer(): void
  disposeViewer(): void
}

const defaultContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '0'
}

const toVm = (value: Vue) => value as FileViewerVue26Vm

export const FileViewer = Vue.extend({
  name: 'FileViewer',
  props: {
    viewerUrl: String,
    url: String,
    file: null,
    name: String,
    from: String,
    targetOrigin: String,
    params: Object,
    cacheKey: [String, Boolean],
    options: Object,
    onViewerEvent: Function,
    iframeClassName: String,
    iframeStyle: Object,
    iframeTitle: String,
    containerClass: [String, Array, Object],
    containerStyle: [String, Array, Object]
  } as any,
  data() {
    return {
      controller: null as ViewerFrameController | null
    }
  },
  mounted() {
    toVm(this).mountViewer()
  },
  beforeDestroy() {
    toVm(this).disposeViewer()
  },
  watch: {
    viewerUrl: 'updateViewer',
    url: 'updateViewer',
    file: 'updateViewer',
    name: 'updateViewer',
    from: 'updateViewer',
    targetOrigin: 'updateViewer',
    cacheKey: 'updateViewer',
    iframeClassName: 'updateViewer',
    iframeTitle: 'updateViewer',
    params: {
      handler: 'updateViewer',
      deep: true
    },
    options: {
      handler: 'updateViewer',
      deep: true
    },
    iframeStyle: {
      handler: 'updateViewer',
      deep: true
    }
  },
  methods: {
    getFrameOptions(): CreateViewerFrameOptions {
      const vm = toVm(this)
      return {
        viewerUrl: vm.viewerUrl,
        url: vm.url,
        file: vm.file,
        name: vm.name,
        from: vm.from,
        targetOrigin: vm.targetOrigin,
        params: vm.params,
        cacheKey: vm.cacheKey,
        options: vm.options,
        className: vm.iframeClassName,
        style: vm.iframeStyle,
        title: vm.iframeTitle,
        onEvent: (payload, event) => vm.handleViewerEvent(payload, event)
      }
    },
    handleViewerEvent(payload: ViewerFrameEventPayload, event: MessageEvent) {
      const vm = toVm(this)
      vm.onViewerEvent?.(payload, event)
      this.$emit('viewer-event', { payload, event })
      this.$emit('viewerEvent', payload, event)
    },
    mountViewer() {
      const vm = toVm(this)
      const container = this.$refs.container as HTMLElement | undefined
      if (!container || vm.controller) {
        return
      }
      vm.controller = mountViewerFrame(container, vm.getFrameOptions())
    },
    updateViewer() {
      const vm = toVm(this)
      if (vm.controller) {
        vm.controller.update(vm.getFrameOptions())
        return
      }
      vm.mountViewer()
    },
    disposeViewer() {
      const vm = toVm(this)
      vm.controller?.destroy()
      vm.controller = null
    },
    getController() {
      return toVm(this).controller
    },
    getIframe() {
      return toVm(this).controller?.frame ?? null
    },
    update(options: ViewerFrameOptions) {
      return toVm(this).controller?.update(options) ?? ''
    },
    postFile() {
      return toVm(this).controller?.postFile() ?? false
    },
    reload() {
      toVm(this).controller?.reload()
    },
    destroy() {
      toVm(this).disposeViewer()
    }
  },
  render(h: CreateElement): VNode {
    const vm = toVm(this)
    return h('div', {
      ref: 'container',
      class: ['ff-file-viewer-vue26', vm.containerClass],
      style: [defaultContainerStyle, vm.containerStyle]
    } as Record<string, unknown>)
  }
})

export const install = (
  VueCtor: VueConstructor,
  options: FileViewerVue26PluginOptions = {}
) => {
  VueCtor.component(options.componentName || 'FileViewer', FileViewer)
}

export const FileViewerPlugin: PluginObject<FileViewerVue26PluginOptions> = {
  install
}

export default FileViewerPlugin
