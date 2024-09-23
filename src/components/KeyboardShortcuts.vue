<template>
    <div class="keyboard-shortcuts-container">
        <div
            class="keyboard-shortcuts"
            :class="{ 'show-shortcuts': showShortcuts }"
        >
            <span class="shortcut">
                Search <kbd>{{ modifierKey }}</kbd> + <kbd>K</kbd>
            </span>
            <span class="shortcut">
                Edit Bangs <kbd>{{ modifierKey }}</kbd> + <kbd>E</kbd>
            </span>
            <span class="shortcut default-engine">
                Set as default search engine:
                <strong>nav_tiny4vr.ar.io?q=%s</strong>
            </span>
        </div>
        <div
            class="shortcut-toggle"
            @mouseenter="showShortcuts = true"
            @mouseleave="showShortcuts = false"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12" y2="17"></line>
            </svg>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from "vue";

const showShortcuts = ref(false);

const isMac = computed(() => {
    return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
});

const modifierKey = computed(() => {
    return isMac.value ? "Cmd" : "Ctrl";
});
</script>

<style scoped>
.keyboard-shortcuts-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.keyboard-shortcuts {
    font-size: 12px;
    color: var(--text-color);
    opacity: 0;
    transform: translateY(10px);
    transition:
        opacity 0.3s,
        transform 0.3s;
    pointer-events: none;
    text-align: right;
    margin-bottom: 15px;
}

.show-shortcuts {
    opacity: 1;
    transform: translateY(0);
}

.shortcut {
    display: block;
    margin-bottom: 5px;
    padding: 6px 0;
}

.shortcut:last-child {
    margin-bottom: 0;
}

kbd {
    background-color: var(--input-bg);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    padding: 2px 4px;
    font-size: 11px;
}

.default-engine {
    font-style: italic;
    opacity: 0.8;
}

.default-engine strong {
    font-style: normal;
    opacity: 1;
}

.shortcut-toggle {
    width: 20px;
    height: 20px;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.3s;
}

.shortcut-toggle:hover {
    opacity: 1;
}

.shortcut-toggle svg {
    width: 100%;
    height: 100%;
    color: var(--text-color);
}

/* Hide on mobile devices */
@media (max-width: 768px) {
    .keyboard-shortcuts-container {
        display: none;
    }
}
</style>
