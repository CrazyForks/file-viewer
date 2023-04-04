# 基于Vue3实现的文件在线预览 file-viewer
本项目作为当前仓库的vue3构建版本，会跟随vue2版本持续更新，敬请期待，欢迎提交issue和交流技术。

注意，当前版本在`v3`分支。如果要使用Vue2版本，请访问

https://blog.csdn.net/wybaby168/article/details/129264431

本项目是本人基于实际工作共享的第一个小项目，诞生于2022年上旬。目前实现了基本格式的预览。
本项目按计划支持vue3 + vite，并持续优化pptx和word模块。

欢迎各位友友们提交工单和P/R，感谢大家！



> Vue3版本特性：
>
> 1. 高质量的TypeScript代码重构模块，更加优雅的实现等你发现
> 2. 使用极速响应的Vite架构，畅快开发
> 3. 完全重构了部分模块，如Word，Excel，Pptx等组件
> 4. 优化Excel主题颜色解析，完美还原Excel样式
> 5. 优化Pptx响应速度，使用重用逻辑
> 6. 优化Pptx加载项，解耦图表部分，待重构解耦相关NvD3依赖。
> 7. 使用完全的组合式API构建应用，高性能低占用
> 8. 解耦了样式依赖，FileViewer组件依赖父节点进行布局，自动填满



## 快速开始

### 1. 项目安装

```
npm install
```

### 2. 项目编译以及支持热加载的开发模式
```
npm run dev
```

### 3. 编译生产包并最小化文件资源
```
npm run build
```

### 4. 检测并修复 JavaScript 代码中的问题
```
npm run lint
```



## 集成指南

### 1. 项目引用集成

> Tips: 本集成方式将会全量引入本项目的所有代码和依赖，所以可能会在您的项目中产生依赖版本冲突，请注意甄别。如果发生很多的依赖冲突，建议立即更换iframe集成方式，更轻量级，且日后能够无缝升级。

如果您使用了flyfish的私库，请使用以下命令安装依赖即可。

```
npm install --save file-viewer3
```

常规情况下，请使用`npm link`的方式进行集成。

假设您将本项目clone到了`D:\Works\file-viewer`下，接下来请按照下面的步骤进行安装。

首先，打开命令行工具，`cd [你的项目位置]`，然后执行`npm link D:\Works\file-viewer `。最后，在您的项目中引用即可。

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import FileViewer from 'file-viewer3'

createApp(App).use(FileViewer)
  .mount('#app')

```

然后，只需要在您的项目中直接使用组件即可。

注意：您需要自己定义好预览器的父元素，预览器默认会占满父元素。

示例如下，该示例定义了一个全屏的预览控件，并传入了一个url用于展示：

```html
<script setup lang='ts'>
import { onMounted, ref } from 'vue'

const url = ref<string>()

onMounted(() => {
  url.value = 'http://flyfish.group/%E6%95%B0%E6%8D%AE%E4%B8%AD%E5%8F%B0%E7%AC%94%E8%AE%B0(1).docx';
})
</script>
<template>
  <div class='simple-view'>
    <file-viewer :url="url" />
  </div>
</template>

<style scoped>
.simple-view {
  height: 100vh;
}
</style>


```

此外，组件还支持直接传入文件或者二进制进行展示。具体请查看`HelloWord.vue`。

### 2. 使用iframe集成（推荐）

注：本部分示例代码位于`master`分支。

#### 开发集成：

1. 请按照“快速开始”章节运行您的示例项目
2. 打开`example`文件夹中的`embedded.html`，修改目标地址为本地调试地址

```javascript
var context = {
    // 查看器的源，当前示例为在线，本地测试请改为 http://localhost:8900
    origin: 'http://localhost:8900',
    // 目标frame
    frame: null,
    // 文件url
    url: './word.docx'
};
```

3. 直接打开该文件或者使用本地web服务访问。
4. 具体请参考demo代码，原理是基于`iframe`跨域通信机制。

![image-20230228161454443](/Users/wangyu/Library/Application Support/typora-user-images/image-20230228161454443.png)
