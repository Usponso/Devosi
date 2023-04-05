<script setup lang="ts">
import { ContentLoader } from "vue-content-loader"
</script>

<template>
    <content-loader
            viewBox="0 0 450 530"
            :speed="2"
            primaryColor="#b5b5b5"
            secondaryColor="#ffffff"
            class="loader"
    >
        <rect x="25" y="50" rx="0" ry="0" width="400" height="280" />
        <rect x="100" y="10" rx="0" ry="0" width="250" height="10" />
        <rect x="25" y="350" rx="0" ry="0" width="100" height="10" />
        <rect x="325" y="350" rx="0" ry="0" width="100" height="10" />
        <rect x="25" y="380" rx="0" ry="0" width="300" height="10" />
        <rect x="25" y="410" rx="0" ry="0" width="300" height="10" />
        <rect x="25" y="440" rx="0" ry="0" width="300" height="10" />
        <rect x="25" y="470" rx="0" ry="0" width="300" height="10" />
        <rect x="25" y="500" rx="0" ry="0" width="300" height="10" />
    </content-loader>
</template>