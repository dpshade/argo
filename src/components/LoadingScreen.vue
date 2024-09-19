<template>
    <div v-if="store.isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
    </div>
</template>

<script setup>
import { store } from "../store";

defineProps({
    isLoading: Boolean,
});
</script>
