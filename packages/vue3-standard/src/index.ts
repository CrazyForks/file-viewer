import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type App, type CSSProperties, type PropType } from 'vue'
import {
  createViewerMountedFrameHandle,
  mountViewerFrame,
  toViewerFrameOptions,
  type CreateViewerFrameOptions,
  type FileRef,
  type ViewerFrameHostComponentProps,
  type ViewerMountedFrameHandle,
  type ViewerFrameController,
  type ViewerFrameEventHandler,
  type ViewerFrameEventPayload,
  type ViewerFrameOptions,
  type ViewerRuntimeOptions
} from '@file-viewer/web'

export type {
  CreateViewerFrameOptions,
  FileRef,
  ViewerAiOptions,
  ViewerArchiveOptions,
  ViewerCadOptions,
  ViewerDocxOptions,
  ViewerDirectFrameHandle,
  ViewerFrameComponentBridgeOptions,
  ViewerFrameComponentProps,
  ViewerFrameContainerComponentProps,
  ViewerFrameControllerAccessor,
  ViewerFrameHostComponentProps,
  ViewerFrameIframeComponentProps,
  ViewerMountedFrameHandle,
  ViewerFrameController,
  ViewerFrameControllerHandle,
  ViewerFrameEventHandler,
  ViewerFrameEventPayload,
  ViewerFrameEventType,
  ViewerFrameFilePostController,
  ViewerFrameFilePostControllerOptions,
  ViewerFrameOptions,
  ViewerFrameParamValue,
  ViewerPdfOptions,
  ViewerRuntimeOptions,
  ViewerSearchOptions,
  ViewerThemeMode,
  ViewerToolbarOptions,
  ViewerToolbarPosition,
  ViewerTypstOptions,
  ViewerWatermarkOptions
} from '@file-viewer/web'

export interface FileViewerVue3PluginOptions {
  componentName?: string
}

export interface FileViewerVue3Handle extends ViewerMountedFrameHandle {}

export interface FileViewerVue3Props extends ViewerFrameHostComponentProps {}

const defaultContainerStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  minHeight: '0'
}

export const FileViewer = defineComponent({
  name: 'FileViewer',
  props: {
    viewerUrl: String,
    url: String,
    file: null as unknown as PropType<FileRef | undefined>,
    name: String,
    from: String,
    targetOrigin: String,
    params: Object as PropType<CreateViewerFrameOptions['params']>,
    cacheKey: [String, Boolean] as PropType<CreateViewerFrameOptions['cacheKey']>,
    options: Object as PropType<ViewerRuntimeOptions>,
    onViewerEvent: Function as PropType<ViewerFrameEventHandler>,
    iframeClassName: String,
    iframeStyle: Object as PropType<Partial<CSSStyleDeclaration>>,
    iframeTitle: String,
    containerClass: [String, Array, Object] as PropType<unknown>,
    containerStyle: [String, Array, Object] as PropType<unknown>
  },
  emits: ['viewer-event', 'viewerEvent'],
  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLElement | null>(null)
    const controllerRef = ref<ViewerFrameController | null>(null)

    const getFrameOptions = (): CreateViewerFrameOptions => toViewerFrameOptions(props, {
      onEvent: (payload, event) => {
        emit('viewer-event', { payload, event })
        emit('viewerEvent', payload, event)
      }
    })

    const mountViewer = () => {
      if (!containerRef.value || controllerRef.value) {
        return
      }
      controllerRef.value = mountViewerFrame(containerRef.value, getFrameOptions())
    }

    const updateViewer = () => {
      if (controllerRef.value) {
        controllerRef.value.update(getFrameOptions())
        return
      }
      mountViewer()
    }

    const disposeViewer = () => {
      controllerRef.value?.destroy()
      controllerRef.value = null
    }

    const publicApi: FileViewerVue3Handle = createViewerMountedFrameHandle(
      () => controllerRef.value,
      disposeViewer
    )

    expose(publicApi)

    onMounted(mountViewer)
    onBeforeUnmount(disposeViewer)

    watch(
      () => [
        props.viewerUrl,
        props.url,
        props.file,
        props.name,
        props.from,
        props.targetOrigin,
        props.params,
        props.cacheKey,
        props.options,
        props.iframeClassName,
        props.iframeStyle,
        props.iframeTitle
      ],
      updateViewer,
      { deep: true }
    )

    return () => h('div', {
      ref: containerRef,
      class: ['ff-file-viewer-vue3', props.containerClass],
      style: [defaultContainerStyle, props.containerStyle]
    })
  }
})

export const install = (
  app: App,
  options: FileViewerVue3PluginOptions = {}
) => {
  app.component(options.componentName || 'FileViewer', FileViewer)
}

export const FileViewerPlugin = {
  install
}

export default FileViewerPlugin
