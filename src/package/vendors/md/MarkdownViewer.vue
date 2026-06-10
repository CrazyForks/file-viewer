<script setup lang='ts'>
import { marked } from 'marked'
import { computed } from 'vue'
import 'github-markdown-css/github-markdown.css'

const props = defineProps<{
  data: string
}>()

const html = computed(() => {
  return marked(props.data)
})
</script>

<template>
  <div class='markdown-viewer'>
    <article class='markdown-body' v-html='html' />
  </div>
</template>

<style scoped>
.markdown-viewer {
    min-height: 100%;
    padding: 28px 16px 48px;
    background: #eef1f4;
    overflow: auto;
}

.markdown-body {
    color-scheme: light;
    --bgColor-default: #ffffff;
    --bgColor-muted: #f6f8fa;
    --bgColor-neutral-muted: #818b981f;
    --borderColor-default: #d1d9e0;
    --borderColor-muted: #d1d9e0b3;
    --borderColor-neutral-muted: #d1d9e0b3;
    --fgColor-default: #1f2328;
    --fgColor-muted: #59636e;
    --fgColor-accent: #0969da;
    background: var(--bgColor-default);
    border: 1px solid rgba(20, 35, 53, 0.1);
    border-radius: 12px;
    margin: 0 auto;
    box-sizing: border-box;
    min-width: 200px;
    max-width: 980px;
    padding: 45px;
    color: var(--fgColor-default);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.1);
}

:global(.file-viewer[data-viewer-theme='dark'] .markdown-viewer) {
    background: #101820;
}

:global(.file-viewer[data-viewer-theme='dark'] .markdown-body) {
    color-scheme: dark;
    --bgColor-default: #0d1117;
    --bgColor-muted: #151b23;
    --bgColor-neutral-muted: #656c7633;
    --borderColor-default: #3d444d;
    --borderColor-muted: #3d444db3;
    --borderColor-neutral-muted: #3d444db3;
    --fgColor-default: #f0f6fc;
    --fgColor-muted: #9198a1;
    --fgColor-accent: #4493f8;
    background: var(--bgColor-default);
    border-color: rgba(139, 148, 158, 0.26);
    color: var(--fgColor-default);
    box-shadow: 0 24px 56px rgba(0, 0, 0, 0.38);
}

@media (max-width: 767px) {
    .markdown-viewer {
        padding: 14px 10px 28px;
    }

    .markdown-body {
        padding: 22px 18px;
        border-radius: 10px;
    }
}

@media (prefers-color-scheme: dark) {
    :global(.file-viewer[data-viewer-theme='system'] .markdown-viewer) {
        background: #101820;
    }

    :global(.file-viewer[data-viewer-theme='system'] .markdown-body) {
        color-scheme: dark;
        --bgColor-default: #0d1117;
        --bgColor-muted: #151b23;
        --bgColor-neutral-muted: #656c7633;
        --borderColor-default: #3d444d;
        --borderColor-muted: #3d444db3;
        --borderColor-neutral-muted: #3d444db3;
        --fgColor-default: #f0f6fc;
        --fgColor-muted: #9198a1;
        --fgColor-accent: #4493f8;
        background: var(--bgColor-default);
        border-color: rgba(139, 148, 158, 0.26);
        color: var(--fgColor-default);
        box-shadow: 0 24px 56px rgba(0, 0, 0, 0.38);
    }
}

</style>
