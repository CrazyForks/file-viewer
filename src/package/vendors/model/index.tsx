import { createApp, defineAsyncComponent } from 'vue'
import type { FileRenderContext } from '@/package/common/type'

const ModelViewer = defineAsyncComponent(() => import('./ModelViewer.vue'))

export const MODEL_EXTENSIONS = [
  'glb',
  'gltf',
  'obj',
  'stl',
  'ply',
  'fbx',
  'dae',
  '3ds',
  '3mf',
  'amf',
  'usd',
  'usda',
  'usdc',
  'usdz',
  'kmz',
  'step',
  'stp',
  'iges',
  'igs',
  'ifc',
  '3dm',
  'pcd',
  'wrl',
  'vrml',
  'xyz',
  'vtk',
  'vtp'
]

export default async function renderModel(
  buffer: ArrayBuffer,
  target: HTMLDivElement,
  type?: string,
  context?: FileRenderContext
) {
  const app = createApp({
    render: () => <ModelViewer data={buffer} type={type || 'glb'} sourceUrl={context?.url} />
  })
  app.mount(target)
  return app
}
