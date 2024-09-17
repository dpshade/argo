<template>
    <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
    </div>
</template>

<script>
import { computed } from "vue";
import { useStore } from "vuex";

export default {
    name: "LoadingScreen",
    setup() {
        const store = useStore();
        const isLoading = computed(() => store.state.isLoading);

        return {
            isLoading,
        };
    },
};
</script>

<style scoped>
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(5px);
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid #ffffff;
    border-top: 3px solid var(--button-bg);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}
</style>
