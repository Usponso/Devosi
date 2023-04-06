<script setup lang="ts">
import { ContentLoader } from "vue-content-loader"
</script>

<template>
    <content-loader
            viewBox="0 0 1000 300"
            :speed="2"
            primaryColor="#b5b5b5"
            secondaryColor="#ffffff"
            class="loader"
    >
        <rect x="50" y="10" rx="3" ry="3" width="200" height="10" /> <!-- rank + constructor name -->
        <circle cx="950" cy="50" r="50" /> <!-- constructor -->
        <rect x="0" y="130" rx="0" ry="0" width="500" height="150" /> <!-- car photo -->
        <rect x="750" y="200" rx="0" ry="0" width="100" height="10" /> <!-- points -->
    </content-loader>
</template>

<style scoped>
.loader{
    padding: 2em 2em 1em 0em;
}
</style>
