<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue'

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
  <SpeedInsights />
  <GlobalLoading />
  <div v-if="isReady">
    <router-view />
  </div>
</template>
