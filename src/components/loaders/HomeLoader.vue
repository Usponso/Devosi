<script>
import { ContentLoader } from "vue-content-loader"

export default {
  components: { ContentLoader }
}
</script>

<template>
  <content-loader
    viewBox="0 0 400 160"
    :speed="2"
    primaryColor="#b5b5b5"
    secondaryColor="#ffffff"
  >
    <rect x="47" y="59" rx="3" ry="3" width="300" height="6" />
    <rect x="447" y="230" rx="3" ry="3" width="178" height="6" />
    <rect x="70" y="77" rx="3" ry="3" width="250" height="6" />
  </content-loader>
</template>