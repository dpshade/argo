<template>
    <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-message">{{ message }}</p>
    </div>
</template>

<script setup>
import { inject } from "vue";

const isLoading = inject("isLoading");
</script>
