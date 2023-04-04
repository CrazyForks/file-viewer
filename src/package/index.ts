import FileViewer from './components/FileViewer'
import type { App, Component } from 'vue'

const components: [[string, Component]] = [
  ['file-viewer', FileViewer]
]

/**
 * 安装器
 */
class Installer {

  private installed: boolean = false

  public install(app: App): void {
    if (this.installed) return
    components.forEach(([name, component]) => app.component(name, component))
    this.installed = true
  }
}

export default new Installer()

export {
  FileViewer
}
