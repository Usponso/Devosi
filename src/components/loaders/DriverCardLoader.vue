<script setup lang="ts">
import { ContentLoader } from "vue-content-loader"
</script>

<template>
    <content-loader
        viewBox="0 0 1000 400"
        :speed="2"
        primaryColor="#b5b5b5"
        secondaryColor="#ffffff"
        class="loader"
    >
        <rect x="10" y="10" rx="3" ry="3" width="50" height="10" /> <!-- rank -->
        <circle cx="950" cy="50" r="50" /> <!-- constructor -->
        <rect x="40" y="130" rx="0" ry="0" width="210" height="270" /> <!-- driver photo -->
        <rect x="400" y="80" rx="0" ry="0" width="150" height="150" /> <!-- helmet -->
        <rect x="800" y="140" rx="3" ry="3" width="60" height="10" /> <!-- points -->
        <rect x="420" y="280" rx="0" ry="0" width="100" height="100" /> <!-- race number -->
        <rect x="550" y="330" rx="3" ry="3" width="300" height="10" /> <!-- presentation -->
    </content-loader>
</template>
