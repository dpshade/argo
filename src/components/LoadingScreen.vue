<template>
    <div v-if="store.isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
    </div>
</template>

<script setup>
import { inject } from "vue";
import { store } from "../store";

const isInitialized = inject("isInitialized");
defineProps({
    isLoading: Boolean,
});
</script>
