declare module 'three' {
  type AnyRecord = Record<string, any>

  export class Color {
    constructor(...args: any[])
  }

  export class Vector3 {
    x: number
    y: number
    z: number
    constructor(...args: any[])
    add(vector: Vector3): this
    copy(vector: Vector3): this
    set(x: number, y: number, z: number): this
    sub(vector: Vector3): this
  }

  export class Object3D {
    [key: string]: any
    animations?: AnimationClip[]
    position: Vector3
    visible: boolean
    add(...objects: Object3D[]): this
    remove(...objects: Object3D[]): this
    traverse(callback: (object: Object3D) => void): void
  }

  export class Scene extends Object3D {
    background: Color | null
  }

  export class PerspectiveCamera extends Object3D {
    aspect: number
    far: number
    fov: number
    near: number
    constructor(...args: any[])
    updateProjectionMatrix(): void
  }

  export class Material {
    [key: string]: any
    dispose(): void
  }

  export class BufferGeometry {
    [key: string]: any
    computeBoundingSphere(): void
    computeVertexNormals(): void
    dispose(): void
  }

  export class Mesh extends Object3D {
    geometry?: BufferGeometry
    isMesh?: boolean
    material?: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material | Material[])
  }

  export class Points extends Object3D {
    geometry?: BufferGeometry
    isPoints?: boolean
    material?: Material | Material[]
    constructor(geometry?: BufferGeometry, material?: Material | Material[])
  }

  export class GridHelper extends Object3D {
    scale: AnyRecord
    constructor(...args: any[])
  }

  export class AxesHelper extends Object3D {
    constructor(...args: any[])
  }

  export class HemisphereLight extends Object3D {
    constructor(...args: any[])
  }

  export class DirectionalLight extends Object3D {
    constructor(...args: any[])
  }

  export class Box3 {
    getCenter(target: Vector3): Vector3
    getSize(target: Vector3): Vector3
    isEmpty(): boolean
    setFromObject(object: Object3D): this
  }

  export class WebGLRenderer {
    domElement: HTMLCanvasElement
    outputColorSpace: any
    toneMapping: any
    constructor(options?: AnyRecord)
    dispose(): void
    render(scene: Scene, camera: PerspectiveCamera): void
    setClearColor(color: number, alpha?: number): void
    setPixelRatio(value: number): void
    setSize(width: number, height: number, updateStyle?: boolean): void
  }

  export class Timer {
    connect(document: Document): void
    dispose(): void
    getDelta(): number
    update(timestamp?: number): this
  }

  export class AnimationClip {}

  export class AnimationMixer {
    constructor(root: Object3D)
    clipAction(clip: AnimationClip): { play(): void }
    update(delta: number): void
  }

  export class MeshStandardMaterial extends Material {
    constructor(options?: AnyRecord)
  }

  export class PointsMaterial extends Material {
    constructor(options?: AnyRecord)
  }

  export const DoubleSide: any
  export const SRGBColorSpace: any
  export const MathUtils: {
    degToRad(value: number): number
  }
}

declare module 'three/addons/controls/OrbitControls.js' {
  import type { PerspectiveCamera, Vector3 } from 'three'

  export class OrbitControls {
    autoRotate: boolean
    autoRotateSpeed: number
    dampingFactor: number
    enableDamping: boolean
    screenSpacePanning: boolean
    target: Vector3
    constructor(camera: PerspectiveCamera, domElement: HTMLElement)
    dispose(): void
    update(): void
  }
}

declare module 'three/addons/loaders/GLTFLoader.js' {
  import type { AnimationClip, Object3D } from 'three'

  export class GLTFLoader {
    parse(
      data: ArrayBuffer | string,
      path: string,
      onLoad: (result: { animations?: AnimationClip[], scene: Object3D }) => void,
      onError?: (event: unknown) => void
    ): void
  }
}

declare module 'three/addons/loaders/OBJLoader.js' {
  import type { Object3D } from 'three'

  export class OBJLoader {
    parse(data: string): Object3D
  }
}

declare module 'three/addons/loaders/STLLoader.js' {
  import type { BufferGeometry } from 'three'

  export class STLLoader {
    parse(data: ArrayBuffer | string): BufferGeometry
  }
}

declare module 'three/addons/loaders/PLYLoader.js' {
  import type { BufferGeometry } from 'three'

  export class PLYLoader {
    parse(data: ArrayBuffer | string): BufferGeometry
  }
}

declare module 'three/addons/loaders/FBXLoader.js' {
  import type { Object3D } from 'three'

  export class FBXLoader {
    parse(data: ArrayBuffer, path: string): Object3D
  }
}

declare module 'three/addons/loaders/ColladaLoader.js' {
  import type { Object3D } from 'three'

  export class ColladaLoader {
    parse(data: string, path: string): { scene: Object3D }
  }
}

declare module 'three/addons/loaders/TDSLoader.js' {
  import type { Object3D } from 'three'

  export class TDSLoader {
    parse(data: ArrayBuffer, path: string): Object3D
  }
}

declare module 'three/addons/loaders/3MFLoader.js' {
  import type { Object3D } from 'three'

  export class ThreeMFLoader {
    parse(data: ArrayBuffer): Object3D
  }
}

declare module 'three/addons/loaders/AMFLoader.js' {
  import type { Object3D } from 'three'

  export class AMFLoader {
    parse(data: ArrayBuffer): Object3D
  }
}

declare module 'three/addons/loaders/USDLoader.js' {
  import type { Object3D } from 'three'

  export class USDLoader {
    parse(data: ArrayBuffer): Object3D
  }
}

declare module 'three/addons/loaders/KMZLoader.js' {
  import type { Object3D } from 'three'

  export class KMZLoader {
    parse(data: ArrayBuffer): { scene: Object3D }
  }
}

declare module 'three/addons/loaders/PCDLoader.js' {
  import type { Points } from 'three'

  export class PCDLoader {
    parse(data: ArrayBuffer | string, url: string): Points
  }
}

declare module 'three/addons/loaders/VRMLLoader.js' {
  import type { Object3D } from 'three'

  export class VRMLLoader {
    parse(data: string, path: string): Object3D
  }
}

declare module 'three/addons/loaders/XYZLoader.js' {
  import type { BufferGeometry } from 'three'

  export class XYZLoader {
    parse(data: string): BufferGeometry
  }
}

declare module 'three/addons/loaders/VTKLoader.js' {
  import type { BufferGeometry } from 'three'

  export class VTKLoader {
    parse(data: ArrayBuffer | string): BufferGeometry
  }
}
