import Vue from 'vue'
import type { CreateElement, PluginObject, VueConstructor, VNode } from 'vue'
import {
  createViewerMountedFrameHandle,
  mountViewerFrame,
  toViewerFrameOptions,
  type CreateViewerFrameOptions,
  type ViewerFrameHostComponentProps,
  type ViewerMountedFrameHandle,
  type ViewerFrameController,
  type ViewerFrameEventPayload,
  type ViewerFrameOptions,
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerFrameComponentBridgeOptions,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerMountedFrameHandle,
  ViewerFrameController,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
  ViewerFrameOptions,
  ViewerPdfOptions,
  ViewerRuntimeOptions,
  ViewerSearchOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition,
  ViewerTypstOptions,
  ViewerWatermarkOptions
} from '@file-viewer/web'

export interface FileViewerVue27PluginOptions {
  componentName?: string
}

export interface FileViewerVue27PublicInstance extends Vue, ViewerMountedFrameHandle {}

interface FileViewerVue27Props extends ViewerFrameHostComponentProps {}

type FileViewerVue27Vm = Vue & FileViewerVue27Props & {
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

const toVm = (value: Vue) => value as FileViewerVue27Vm
const getVmHandle = (vm: FileViewerVue27Vm): ViewerMountedFrameHandle => {
  return createViewerMountedFrameHandle(() => vm.controller, () => vm.disposeViewer())
}

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
      return toViewerFrameOptions(vm, {
        onEvent: (payload, event) => vm.handleViewerEvent(payload, event)
      })
    },
    handleViewerEvent(payload: ViewerFrameEventPayload, event: MessageEvent) {
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
      return getVmHandle(toVm(this)).getController()
    },
    getIframe() {
      return getVmHandle(toVm(this)).getIframe()
    },
    update(options: ViewerFrameOptions) {
      return getVmHandle(toVm(this)).update(options)
    },
    postFile() {
      return getVmHandle(toVm(this)).postFile()
    },
    reload() {
      getVmHandle(toVm(this)).reload()
    },
    destroy() {
      getVmHandle(toVm(this)).destroy()
    }
  },
  render(h: CreateElement): VNode {
    const vm = toVm(this)
    return h('div', {
      ref: 'container',
      class: ['ff-file-viewer-vue27', vm.containerClass],
      style: [defaultContainerStyle, vm.containerStyle]
    } as Record<string, unknown>)
  }
})

export const install = (
  VueCtor: VueConstructor,
  options: FileViewerVue27PluginOptions = {}
) => {
  VueCtor.component(options.componentName || 'FileViewer', FileViewer)
}

export const FileViewerPlugin: PluginObject<FileViewerVue27PluginOptions> = {
  install
}

export default FileViewerPlugin
