<template>
  <div class="demo" :class="{ 'demo--dark': theme === 'dark' }">
    <aside class="demo-side">
      <div class="brand">
        <span class="brand-mark">FV</span>
        <div>
          <strong>File Viewer</strong>
          <small>Vue 2.6 / CLI 3 / Webpack 4</small>
        </div>
      </div>

      <div class="stack-tags">
        <a-tag color="blue">Vue 2.6</a-tag>
        <a-tag color="green">Element UI</a-tag>
        <a-tag color="orange">重点格式最小集</a-tag>
        <a-tag color="purple">CAD / 3D / 图片 / 视频</a-tag>
      </div>

      <el-upload
        class="upload"
        action=""
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept=".pdf,.doc,.docx,.docm,.dot,.dotx,.dotm,.xls,.xlsx,.xlsm,.xlsb,.xlt,.xltx,.xltm,.csv,.tsv,.ppt,.pptx,.pptm,.potx,.potm,.ppsx,.ppsm,.dwg,.dxf,.dwf,.dwfx,.xps,.glb,.gltf,.obj,.stl,.ply,.fbx,.dae,.3ds,.3mf,.amf,.usd,.usda,.usdc,.usdz,.kmz,.pcd,.wrl,.vrml,.xyz,.vtk,.vtp,.step,.stp,.iges,.igs,.brep,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg,.ico,.avif,.heic,.heif,.mp4,.webm,.m3u8"
      >
        <el-button type="primary" size="small">选择文件</el-button>
      </el-upload>

      <el-button class="sample-button" size="small" @click="loadDemoPdf">
        内置 PDF 样例
      </el-button>

      <div class="switch-row">
        <span>主题</span>
        <el-switch
          v-model="dark"
          active-text="深色"
          inactive-text="浅色"
        />
      </div>

      <dl class="meta">
        <dt>当前文件</dt>
        <dd>{{ currentName }}</dd>
        <dt>事件</dt>
        <dd>{{ lastEvent }}</dd>
      </dl>
    </aside>

    <main class="demo-main">
      <file-viewer
        class="viewer"
        :file="file"
        :buffer="buffer"
        :filename="filename"
        :type="type"
        :options="viewerOptions"
        @viewer-event="handleViewerEvent"
      />
    </main>
  </div>
</template>

<script>
import { createDemoPdfBuffer } from './demoPdf'
import { createViewerOptions } from './fileViewerOptions'

export default {
  name: 'App',
  data() {
    return {
      dark: false,
      file: null,
      buffer: null,
      filename: '',
      type: '',
      lastEvent: 'ready'
    }
  },
  computed: {
    theme() {
      return this.dark ? 'dark' : 'light'
    },
    viewerOptions() {
      return createViewerOptions(this.theme)
    },
    currentName() {
      return this.filename || (this.file && this.file.name) || 'file-viewer-vue26-demo.pdf'
    }
  },
  created() {
    this.loadDemoPdf()
  },
  methods: {
    loadDemoPdf() {
      this.file = null
      this.buffer = createDemoPdfBuffer()
      this.filename = 'file-viewer-vue26-demo.pdf'
      this.type = 'pdf'
      this.lastEvent = 'sample'
    },
    handleFileChange(uploadFile) {
      const raw = uploadFile && uploadFile.raw
      if (!raw) {
        return
      }
      this.file = raw
      this.buffer = null
      this.filename = raw.name
      this.type = ''
      this.lastEvent = 'file'
    },
    handleViewerEvent(event) {
      this.lastEvent = event && event.type ? event.type : 'event'
      if (event && event.type === 'error') {
        console.error(event)
      }
    }
  }
}
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

body {
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #213043;
}

.demo {
  display: grid;
  grid-template-columns: 304px minmax(0, 1fr);
  width: 100%;
  height: 100%;
  background: #eef3f7;
}

.demo--dark {
  background: #101820;
  color: #d9e6f2;
}

.demo-side {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 18px;
  overflow-y: auto;
  border-right: 1px solid rgba(31, 95, 139, 0.12);
  background: #ffffff;
}

.demo--dark .demo-side {
  border-color: rgba(148, 163, 184, 0.18);
  background: #151f2b;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #1f5f8b;
  color: #ffffff;
  font-weight: 700;
}

.brand strong,
.brand small {
  display: block;
}

.brand small {
  margin-top: 3px;
  color: #6a7c8f;
}

.demo--dark .brand small {
  color: #9fb0c1;
}

.stack-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.upload .el-upload,
.sample-button {
  width: 100%;
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(31, 95, 139, 0.12);
  border-bottom: 1px solid rgba(31, 95, 139, 0.12);
}

.demo--dark .switch-row {
  border-color: rgba(148, 163, 184, 0.18);
}

.meta {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 8px 12px;
  margin: 0;
  font-size: 13px;
}

.meta dt {
  color: #6a7c8f;
}

.meta dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
}

.demo-main {
  min-width: 0;
  min-height: 0;
}

.viewer {
  width: 100%;
  height: 100%;
}

@media (max-width: 760px) {
  .demo {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .demo-side {
    max-height: 220px;
    border-right: 0;
    border-bottom: 1px solid rgba(31, 95, 139, 0.12);
  }
}
</style>
