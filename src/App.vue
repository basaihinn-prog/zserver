<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'

const isReady = ref(false)
const appStore = useAppStore()
appStore.showLoading()



// const authStore = useAuthStore()

onMounted(() => {
  // await authStore.init()
  isReady.value = true
})
</script>

<template>
  <GlobalLoading />
  <div v-if="isReady">
    <router-view />
  </div>
  <Analytics />
</template>
