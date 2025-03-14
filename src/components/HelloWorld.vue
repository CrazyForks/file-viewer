<script setup lang='ts'>
import { onMounted, ref } from 'vue'
import { listenForFile } from '@/components/utils'
import type { FileRef } from '@/package/common/type'

/**
 * 支持嵌入式显示，基于postMessage支持跨域
 * 示例代码：参考Embedded.vue
 */

// 隐藏头部，当基于消息机制渲染，将隐藏
const hidden = ref(false)
// 使用输入框
const input = ref(true)
// 浮层显示
const overlay = ref(true)
// 文件名
const filename = ref('')
// 文件实例
const file = ref<FileRef | undefined>()
// 网址
const url = ref('/example/word.docx')
// 预览网址
const preview = ref('')

// 预置文件列表
const presetFiles = [
  { name: '测试doc文档', url: '/example/test.doc' },
  { name: '测试word文档', url: '/example/word.docx' },
  { name: '测试Excel文档', url: '/example/excel.xlsx' },
  { name: '测试PPT文档', url: '/example/ppt.pptx' },
  { name: '测试PNG图片', url: '/example/pic.png' },
  { name: '测试PDF文档', url: '/example/pdf.pdf' },
  { name: '测试视频', url: '/example/video.mp4' }
]

// 监听文件推送消息，回调后显示
listenForFile((body, target) => {
  hidden.value = true
  if (body) file.value = body
  if (target) url.value = target
})

onMounted(() => {
  // 首次加载，触发预览
  preview.value = url.value
})

/**
 * 处理预置文件选择
 * @param e 事件对象
 */
function handlePresetChange(e: any) {
  const selectedFile = presetFiles.find(file => file.url === e.target.value)
  if (selectedFile) {
    url.value = selectedFile.url
    preview.value = selectedFile.url
  }
}

/**
 * 文件输入框改变事件
 * @param e 事件对象
 */
async function handleChange(e: any) {
  const target: HTMLInputElement = e.target
  if (target.files) {
    const value = target.files.item(0)
    if (value) {
      filename.value = value.name && decodeURIComponent(value.name) || ''
      file.value = value
    }
  }
}

</script>

<template>
  <div :class='{hidden}'>
    <div class='banner'>
      <div class='container'>
        <h1>
          <div class='file-select'>
            <button type='button' style='margin-right: 20px' @click.stop='input = !input'>
              【点击切换】{{ input ? '🐧 输入网址' : '👆🏻 上传预览' }}
            </button>
            <button type='button' @click='overlay = !overlay'>{{ overlay ? '🏄‍隐藏浮层' : '👁显示浮层' }}</button>
          </div>
          <div class='overlay' v-if='overlay'>
            <template v-if='input'>
              <select v-model='url' placeholder='请选择预置文件' @change='handlePresetChange' class='preset-select'>
                <option v-for='file in presetFiles' :key='file.url' :value='file.url'>
                  {{ file.name }}
                </option>
              </select>
              <input type='text' v-model='url' placeholder='http://' class='url-input' />
              <button type='button' @click.stop='preview = url'>预览</button>
            </template>
            <template v-else>
              <input type='file' @change='handleChange' />
              <div class='upload-cover'> 📃 {{ filename || '请选择文件上传' }}</div>
            </template>
          </div>
          <a href='/'>Vue在线文档查看器</a>
        </h1>
      </div>
    </div>
    <div class='viewport'>
      <file-viewer :file='file' :url='preview' />
    </div>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.banner {
    overflow: auto;
    text-align: center;
    background-color: #12b6ff;
    color: #fff;
}

.viewport {
    border: 1px solid #ccc;
    margin: 5px;
    width: calc(100% - 12px);
    height: calc(100vh - 73px);
}

.hidden .banner {
    display: none;
}

.hidden .viewport {
    height: 100vh !important;
}

.hidden .well {
    height: calc(100vh - 12px);
}

.overlay {
    position: absolute;
    transition: all;
    z-index: 1000;
    opacity: 0.4;
    top: 50px;
    left: 112px;
    padding: 20px;
    border-radius: 5px;
    background: white;
    border: 1px solid silver;
}

.overlay:hover {
    opacity: 1;
}

.file-select {
    position: absolute;
    left: 5%;
    line-height: 35px;
    margin-left: 20px;
}

.banner a {
    color: #fff;
    text-decoration: none;
}

.banner h1 {
    font-size: 20px;
    line-height: 2;
    margin: 0.5em 0;
}


.file-select button {
    background: #fafafa;
}

.overlay button {
    background: #12b6ff;
    color: white;
}

button {
    outline: none;
    border-radius: 20px;
    border: 1px solid #e3e3e3;
    line-height: 19px;
    padding: 5px 12px;
    cursor: pointer;
}

.overlay input[type="text"] {
    line-height: 19px;
    height: 30px;
    width: 300px;
    outline: none;
    border: 1px solid silver;
    border-radius: 6px;
    margin-right: 10px;
}

.overlay input[type="file"] {
    position: absolute;
    opacity: 0;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    z-index: 2;
    cursor: pointer;
}

.upload-cover {
    z-index: 1;
    pointer-events: none;
    color: black;
}

.messages .warning {
    color: #cc6600;
}

.preset-select {
  line-height: 19px;
  height: 30px;
  width: 150px;
  outline: none;
  border: 1px solid silver;
  border-radius: 6px;
  margin-right: 10px;
  background: white;
}

.url-input {
  line-height: 19px;
  height: 30px;
  width: 300px;
  outline: none;
  border: 1px solid silver;
  border-radius: 6px;
  margin-right: 10px;
}
</style>
