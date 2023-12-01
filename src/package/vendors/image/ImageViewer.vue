<script setup lang='ts'>
import { computed } from 'vue'
import { component as VueViewer } from 'v-viewer'
import 'viewerjs/dist/viewer.css'

const props = defineProps<{
  image: string
}>()

const images = computed(() => {
  return props.image ? [{ src: props.image, index: 0 }] : []
})
</script>

<template>
  <vue-viewer :images='images' style='height: 100%;'>
    <img v-for='item in images' alt='图片' :src='item.src' :key='item.index' class='image' />
  </vue-viewer>
</template>

<style scoped>
.image {
  display: block;
  width: auto;
  height: 100%;
  margin: 0 auto;
}
</style>
