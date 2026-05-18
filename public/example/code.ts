import { computed, ref } from 'vue'

type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error'

const filename = ref('contract.ofd')
const status = ref<PreviewStatus>('idle')

export const title = computed(() => {
  return `${filename.value} / ${status.value}`
})

export async function openPreview(url: string) {
  status.value = 'loading'

  const response = await fetch(url)
  if (!response.ok) {
    status.value = 'error'
    throw new Error(`Download failed: ${response.status}`)
  }

  status.value = 'ready'
  return response.blob()
}
