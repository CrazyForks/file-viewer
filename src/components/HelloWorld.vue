<script setup lang='ts'>
import { parse } from 'qs';
import { onMounted, ref } from 'vue'

/**
 * 支持嵌入式显示，基于postMessage支持跨域
 * 示例代码：参考Embedded.vue
 */

// 隐藏头部，当基于消息机制渲染，将隐藏
const hidden = ref(false);
// 使用输入框
const input = ref(false);
// 浮层显示
const overlay = ref(true);
// 文件名
const filename = ref('');
// 文件实例
const file = ref<File | null>(null);
// 网址
const url = ref('http://flyfish.group/%E6%95%B0%E6%8D%AE%E4%B8%AD%E5%8F%B0%E7%AC%94%E8%AE%B0(1).docx');
// 预览网址
const preview = ref('');

// 允许使用预留的消息机制发送二进制数据，必须在url后添加?name=xxx.xxx&from=xxx
const { from, name } = parse(location.search.substring(1))
if (from && typeof name === 'string') {
  window.addEventListener('message', event => {
    const { origin, data: blob } = event
    if (origin === from && blob instanceof Blob) {
      // 构造响应，自动渲染
      const value = new File([ blob ], name, {});
      hidden.value = true;
      file.value = value;
    }
  })
}
onMounted(() => {
  // 首次加载，触发预览
  preview.value = url.value;
})

/**
 * 文件输入框改变事件
 * @param e 事件对象
 */
async function handleChange(e: any) {
  const target: HTMLInputElement = e.target;
  if (target.files) {
    const value = target.files.item(0);
    if (value) {
      filename.value = value.name && decodeURIComponent(value.name) || '';
      file.value = value;
    }
  }
}

</script>

<template>
  <div :class="{hidden}">
    <div class="banner">
      <div class="container">
        <h1>
          <div class="file-select">
            <button type="button" style="margin-right: 20px" @click.stop="input = !input">
              【点击切换】{{input ? '🐧 输入网址' : '👆🏻 上传预览'}}
            </button>
            <button type="button" @click="overlay = !overlay">{{ overlay ? '🏄‍隐藏浮层' : '👁显示浮层' }}</button>
          </div>
          <div class="overlay" v-if="overlay">
            <input v-if="input" type="text" v-model="url" placeholder="http://" />
            <input v-else type="file" @change="handleChange"/>
            <button type="button" v-if="input" @click.stop="preview = url">预览</button>
            <div class="upload-cover" v-else> 📃 {{filename || '请选择文件上传'}}</div>
          </div>
          <a href="/">Vue在线文档查看器</a>
        </h1>
      </div>
    </div>
    <file-viewer :file="file" :url="preview" />
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

.hidden .banner {
  display: none;
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
</style>
