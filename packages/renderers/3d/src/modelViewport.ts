export interface ModelViewportRenderer {
  getPixelRatio(): number;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number, updateStyle: boolean): void;
}

export interface ModelViewportCamera {
  aspect: number;
  updateProjectionMatrix(): void;
}

export interface SyncModelViewportInput {
  renderer: ModelViewportRenderer;
  camera: ModelViewportCamera;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  devicePixelRatio?: number;
}

export interface ModelViewportState {
  width: number;
  height: number;
  pixelRatio: number;
  resized: boolean;
}

const resolveCssSize = (
  stage: HTMLElement,
  canvas: HTMLCanvasElement
) => {
  return {
    width: Math.max(
      1,
      Math.floor(
        stage.clientWidth ||
        canvas.clientWidth ||
        stage.getBoundingClientRect().width ||
        canvas.getBoundingClientRect().width
      )
    ),
    height: Math.max(
      1,
      Math.floor(
        stage.clientHeight ||
        canvas.clientHeight ||
        stage.getBoundingClientRect().height ||
        canvas.getBoundingClientRect().height
      )
    )
  }
}

export const syncModelViewport = ({
  renderer,
  camera,
  stage,
  canvas,
  devicePixelRatio = 1
}: SyncModelViewportInput): ModelViewportState => {
  const { width, height } = resolveCssSize(stage, canvas)
  const pixelRatio = Math.min(
    2,
    Math.max(1, Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1)
  )
  const pixelRatioChanged = Math.abs(renderer.getPixelRatio() - pixelRatio) > 0.001

  if (pixelRatioChanged) {
    renderer.setPixelRatio(pixelRatio)
  }

  const expectedWidth = Math.max(1, Math.floor(width * pixelRatio))
  const expectedHeight = Math.max(1, Math.floor(height * pixelRatio))
  const resized = (
    pixelRatioChanged ||
    canvas.width !== expectedWidth ||
    canvas.height !== expectedHeight
  )

  if (resized) {
    renderer.setSize(width, height, false)
  }

  const aspect = width / height
  if (Math.abs(camera.aspect - aspect) > 0.0001) {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }

  return {
    width,
    height,
    pixelRatio,
    resized
  }
}
