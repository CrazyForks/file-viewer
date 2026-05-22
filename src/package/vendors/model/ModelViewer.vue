<script setup lang='ts'>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = defineProps<{
  data: ArrayBuffer,
  type: string,
  sourceUrl?: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const errorMessage = ref('')
const objectSummary = ref('正在加载模型')
const autoRotate = ref(false)
const wireframe = ref(false)
const showGrid = ref(true)
const showAxes = ref(true)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let controls: OrbitControls | null = null
let modelRoot: THREE.Object3D | null = null
let gridHelper: THREE.GridHelper | null = null
let axesHelper: THREE.AxesHelper | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let activeVersion = 0
let mixer: THREE.AnimationMixer | null = null
let timer = new THREE.Timer()

const decoder = new TextDecoder('utf-8')

class ModelPreviewNotice extends Error {}

const normalizeType = () => props.type.toLowerCase()

const getResourcePath = () => {
  if (!props.sourceUrl) {
    return ''
  }

  try {
    return new URL('.', props.sourceUrl).href
  } catch {
    const clean = props.sourceUrl.split(/[?#]/)[0] || props.sourceUrl
    const slashIndex = clean.lastIndexOf('/')
    return slashIndex >= 0 ? clean.slice(0, slashIndex + 1) : ''
  }
}

const normalizeError = (reason: unknown) => {
  if (reason instanceof Error) {
    return reason.message
  }
  return typeof reason === 'string' ? reason : JSON.stringify(reason)
}

const ensureScene = () => {
  const target = canvas.value
  if (!target) {
    return false
  }

  if (!renderer) {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      canvas: target,
      powerPreference: 'high-performance'
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0xf8fafc, 1)
  }

  if (!scene) {
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xd7dee8, 2.4)
    scene.add(hemiLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2)
    keyLight.position.set(8, 10, 8)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9)
    fillLight.position.set(-7, 5, -4)
    scene.add(fillLight)

    gridHelper = new THREE.GridHelper(10, 10, 0xcbd5e1, 0xe2e8f0)
    scene.add(gridHelper)

    axesHelper = new THREE.AxesHelper(3)
    scene.add(axesHelper)
  }

  if (!camera) {
    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100000)
    camera.position.set(5, 4, 6)
  }

  if (!controls && camera && renderer) {
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.screenSpacePanning = true
    controls.autoRotateSpeed = 1.2
  }

  updateHelperVisibility()
  resize()
  return true
}

const disposeMaterial = (material: THREE.Material | THREE.Material[]) => {
  const materials = Array.isArray(material) ? material : [material]
  materials.forEach(item => item.dispose())
}

const disposeObject = (object: THREE.Object3D) => {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    const points = child as THREE.Points
    if (mesh.geometry) {
      mesh.geometry.dispose()
    }
    if (mesh.material) {
      disposeMaterial(mesh.material)
    }
    if (points.material) {
      disposeMaterial(points.material)
    }
  })
}

const clearModel = () => {
  if (modelRoot && scene) {
    scene.remove(modelRoot)
    disposeObject(modelRoot)
  }
  modelRoot = null
  mixer = null
}

const readText = () => decoder.decode(props.data)

const parseGlbOrGltf = async () => {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
  const loader = new GLTFLoader()
  const resourcePath = getResourcePath()
  const input = normalizeType() === 'gltf' ? readText() : props.data

  return new Promise<THREE.Object3D>((resolve, reject) => {
    loader.parse(
      input,
      resourcePath,
      gltf => {
        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(gltf.scene)
          gltf.animations.forEach(clip => mixer?.clipAction(clip).play())
        }
        resolve(gltf.scene)
      },
      reject
    )
  })
}

const parseObj = async () => {
  const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js')
  return new OBJLoader().parse(readText())
}

const parseStl = async () => {
  const { STLLoader } = await import('three/addons/loaders/STLLoader.js')
  const geometry = new STLLoader().parse(props.data)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, createSurfaceMaterial())
}

const parsePly = async () => {
  const { PLYLoader } = await import('three/addons/loaders/PLYLoader.js')
  const geometry = new PLYLoader().parse(props.data)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, createSurfaceMaterial())
}

const parseFbx = async () => {
  const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js')
  const object = new FBXLoader().parse(props.data, getResourcePath())
  if (object.animations?.length) {
    mixer = new THREE.AnimationMixer(object)
    object.animations.forEach(clip => mixer?.clipAction(clip).play())
  }
  return object
}

const parseDae = async () => {
  const { ColladaLoader } = await import('three/addons/loaders/ColladaLoader.js')
  return new ColladaLoader().parse(readText(), getResourcePath()).scene
}

const parse3ds = async () => {
  const { TDSLoader } = await import('three/addons/loaders/TDSLoader.js')
  return new TDSLoader().parse(props.data, getResourcePath())
}

const parse3mf = async () => {
  const { ThreeMFLoader } = await import('three/addons/loaders/3MFLoader.js')
  return new ThreeMFLoader().parse(props.data)
}

const parseAmf = async () => {
  const { AMFLoader } = await import('three/addons/loaders/AMFLoader.js')
  return new AMFLoader().parse(props.data)
}

const parseUsd = async () => {
  const { USDLoader } = await import('three/addons/loaders/USDLoader.js')
  return new USDLoader().parse(props.data)
}

const parseKmz = async () => {
  const { KMZLoader } = await import('three/addons/loaders/KMZLoader.js')
  return new KMZLoader().parse(props.data).scene
}

const explainEngineeringModel = (type: string): never => {
  const upperType = type.toUpperCase()
  if (type === 'ifc') {
    throw new ModelPreviewNotice('IFC 是 BIM 模型格式，浏览器端完整解析通常依赖 web-ifc 这类 WebAssembly BIM 内核。当前 Apache-2.0 前端包不默认打入这类重型运行时，建议在私有服务端转换为 GLB/GLTF 后预览。')
  }
  if (type === '3dm') {
    throw new ModelPreviewNotice('3DM 是 Rhino/OpenNURBS 模型格式，浏览器端解析需要 rhino3dm WebAssembly 运行时。当前前端包未内置该运行时，建议在私有转换链路输出 GLB/GLTF 后预览。')
  }
  throw new ModelPreviewNotice(`${upperType} 属于 CAD B-Rep / 工程交换格式，浏览器端完整解析通常需要 OpenCascade 等 WebAssembly 几何内核。当前前端包不默认打入这类重型运行时，建议在私有服务端转换为 GLB/GLTF 或轻量网格格式后预览。`)
}

const parsePcd = async () => {
  const { PCDLoader } = await import('three/addons/loaders/PCDLoader.js')
  return new PCDLoader().parse(props.data, props.sourceUrl || 'model.pcd')
}

const parseVrml = async () => {
  const { VRMLLoader } = await import('three/addons/loaders/VRMLLoader.js')
  return new VRMLLoader().parse(readText(), getResourcePath())
}

const parseXyz = async () => {
  const { XYZLoader } = await import('three/addons/loaders/XYZLoader.js')
  const geometry = new XYZLoader().parse(readText())
  geometry.computeBoundingSphere()
  return new THREE.Points(geometry, createPointMaterial())
}

const parseVtk = async () => {
  const { VTKLoader } = await import('three/addons/loaders/VTKLoader.js')
  const geometry = new VTKLoader().parse(props.data)
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, createSurfaceMaterial())
}

const createSurfaceMaterial = () => new THREE.MeshStandardMaterial({
  color: 0x4f8fba,
  metalness: 0.08,
  roughness: 0.78,
  side: THREE.DoubleSide,
  wireframe: wireframe.value
})

const createPointMaterial = () => new THREE.PointsMaterial({
  color: 0x1f7a8c,
  size: 0.035,
  sizeAttenuation: true
})

const applyDefaultMaterials = (object: THREE.Object3D) => {
  object.traverse(child => {
    const mesh = child as THREE.Mesh
    if (mesh.isMesh && !mesh.material) {
      mesh.material = createSurfaceMaterial()
    }
    if (mesh.isMesh && mesh.material) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      materials.forEach(material => {
        if ('wireframe' in material) {
          material.wireframe = wireframe.value
        }
        material.needsUpdate = true
      })
    }
  })
}

const countMeshes = (object: THREE.Object3D) => {
  let meshes = 0
  let points = 0
  object.traverse(child => {
    if ((child as THREE.Mesh).isMesh) {
      meshes += 1
    }
    if ((child as THREE.Points).isPoints) {
      points += 1
    }
  })
  return { meshes, points }
}

const summarizeModel = (object: THREE.Object3D) => {
  const { meshes, points } = countMeshes(object)
  const parts = []
  if (meshes) {
    parts.push(`${meshes} 个网格`)
  }
  if (points) {
    parts.push(`${points} 个点云`)
  }
  objectSummary.value = parts.length ? parts.join('，') : '模型已加载'
}

const normalizeObject = (object: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(object)
  if (box.isEmpty()) {
    return {
      center: new THREE.Vector3(),
      size: new THREE.Vector3(4, 4, 4)
    }
  }

  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  object.position.sub(center)

  return {
    center: new THREE.Vector3(),
    size
  }
}

const fitToView = () => {
  if (!modelRoot || !camera || !controls) {
    return
  }

  const box = new THREE.Box3().setFromObject(modelRoot)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const radius = Math.max(size.x, size.y, size.z, 1)
  const distance = radius / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.65

  camera.near = Math.max(distance / 1000, 0.01)
  camera.far = Math.max(distance * 1000, 1000)
  camera.position.copy(center).add(new THREE.Vector3(distance, distance * 0.62, distance))
  camera.updateProjectionMatrix()

  controls.target.copy(center)
  controls.update()
}

const addModelToScene = async (object: THREE.Object3D) => {
  if (!scene) {
    return
  }

  clearModel()
  applyDefaultMaterials(object)
  const { size } = normalizeObject(object)
  modelRoot = object
  scene.add(object)
  fitToView()
  summarizeModel(object)

  const maxSize = Math.max(size.x, size.y, size.z, 1)
  if (gridHelper) {
    gridHelper.scale.setScalar(Math.max(maxSize / 10, 1))
  }
}

const loadModel = async () => {
  const version = ++activeVersion
  status.value = 'loading'
  errorMessage.value = ''
  objectSummary.value = '正在加载模型'

  if (!ensureScene()) {
    return
  }

  try {
    const type = normalizeType()
    const object = await parseModel(type)
    if (version !== activeVersion) {
      disposeObject(object)
      return
    }
    await nextTick()
    await addModelToScene(object)
    status.value = 'ready'
  } catch (reason) {
    if (version !== activeVersion) {
      return
    }
    if (!(reason instanceof ModelPreviewNotice)) {
      console.error(reason)
    }
    status.value = 'error'
    errorMessage.value = normalizeError(reason) || `${props.type.toUpperCase()} 模型解析失败`
  }
}

const parseModel = (type: string) => {
  switch (type) {
    case 'glb':
    case 'gltf':
      return parseGlbOrGltf()
    case 'obj':
      return parseObj()
    case 'stl':
      return parseStl()
    case 'ply':
      return parsePly()
    case 'fbx':
      return parseFbx()
    case 'dae':
      return parseDae()
    case '3ds':
      return parse3ds()
    case '3mf':
      return parse3mf()
    case 'amf':
      return parseAmf()
    case 'usd':
    case 'usda':
    case 'usdc':
    case 'usdz':
      return parseUsd()
    case 'kmz':
      return parseKmz()
    case 'step':
    case 'stp':
    case 'iges':
    case 'igs':
    case 'ifc':
    case '3dm':
      return explainEngineeringModel(type)
    case 'pcd':
      return parsePcd()
    case 'wrl':
    case 'vrml':
      return parseVrml()
    case 'xyz':
      return parseXyz()
    case 'vtk':
    case 'vtp':
      return parseVtk()
    default:
      throw new Error(`暂不支持 .${type} 模型格式`)
  }
}

const resize = () => {
  const target = canvas.value
  if (!target || !renderer || !camera) {
    return
  }

  const rect = target.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  renderer.setSize(width, height, false)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

const renderFrame = (timestamp?: number) => {
  if (!renderer || !scene || !camera || !controls) {
    return
  }

  controls.autoRotate = autoRotate.value
  controls.update()
  timer.update(timestamp)
  const delta = timer.getDelta()
  mixer?.update(delta)
  renderer.render(scene, camera)
  animationFrame = requestAnimationFrame(renderFrame)
}

const updateWireframe = () => {
  if (!modelRoot) {
    return
  }
  applyDefaultMaterials(modelRoot)
}

const updateHelperVisibility = () => {
  if (gridHelper) {
    gridHelper.visible = showGrid.value
  }
  if (axesHelper) {
    axesHelper.visible = showAxes.value
  }
}

const toggleWireframe = () => {
  wireframe.value = !wireframe.value
  updateWireframe()
}

const toggleGrid = () => {
  showGrid.value = !showGrid.value
  updateHelperVisibility()
}

const toggleAxes = () => {
  showAxes.value = !showAxes.value
  updateHelperVisibility()
}

const cleanup = () => {
  activeVersion += 1
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  resizeObserver = null
  clearModel()
  controls?.dispose()
  controls = null
  renderer?.dispose()
  renderer = null
  timer.dispose()
  timer = new THREE.Timer()
  scene = null
  camera = null
  gridHelper = null
  axesHelper = null
}

onMounted(() => {
  if (ensureScene()) {
    timer.connect(document)
    resizeObserver = new ResizeObserver(resize)
    if (canvas.value) {
      resizeObserver.observe(canvas.value)
    }
    renderFrame()
    void loadModel()
  }
})

onBeforeUnmount(cleanup)

watch(() => [props.data, props.type, props.sourceUrl], () => {
  void loadModel()
})
</script>

<template>
  <div class='model-viewer'>
    <div class='model-toolbar'>
      <div class='model-actions'>
        <button type='button' @click='fitToView'>适配</button>
        <button type='button' :class='{ active: autoRotate }' @click='autoRotate = !autoRotate'>旋转</button>
        <button type='button' :class='{ active: wireframe }' @click='toggleWireframe'>线框</button>
        <button type='button' :class='{ active: showGrid }' @click='toggleGrid'>网格</button>
        <button type='button' :class='{ active: showAxes }' @click='toggleAxes'>坐标</button>
      </div>
      <div class='model-meta'>
        <strong>{{ type.toUpperCase() }}</strong>
        <span>{{ objectSummary }}</span>
      </div>
    </div>

    <div class='model-stage'>
      <canvas ref='canvas' />
      <div v-if='status === "loading"' class='model-state'>正在解析 3D 模型...</div>
      <div v-else-if='status === "error"' class='model-state error'>
        <strong>模型解析失败</strong>
        <span>{{ errorMessage }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-viewer {
  display: flex;
  height: 100%;
  min-height: 100%;
  flex-direction: column;
  background: #f8fafc;
  color: #162333;
}

.model-toolbar {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: #ffffff;
}

.model-actions {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px;
}

.model-actions button {
  min-height: 30px;
  border: 0;
  border-radius: 8px;
  padding: 0 10px;
  background: rgba(15, 23, 42, 0.06);
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.model-actions button.active,
.model-actions button:hover {
  background: rgba(33, 163, 102, 0.14);
  color: #16804f;
}

.model-meta {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
}

.model-meta strong {
  color: #0f766e;
  font-weight: 800;
}

.model-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-stage {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.model-stage canvas {
  display: block;
  width: 100%;
  height: 100%;
  outline: none;
}

.model-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  background: rgba(248, 250, 252, 0.88);
  color: #64748b;
  text-align: center;
  line-height: 1.7;
}

.model-state.error {
  color: #b42318;
}

.model-state strong {
  color: #b42318;
  font-size: 18px;
}

@media (max-width: 720px) {
  .model-toolbar {
    min-height: 64px;
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px;
  }

  .model-meta {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
