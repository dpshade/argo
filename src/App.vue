<script setup>
import { ref, nextTick, onMounted } from "vue";
import { useSearch } from "./composables/useSearch";
import { useAppState } from "./composables/useAppState";
import { useKeyboardShortcuts } from "./composables/useKeyboardShortcuts";
import SearchBar from "./components/SearchBar.vue";
import HeadlessRedirect from "./components/HeadlessRedirect.vue";
import LoadingScreen from "./components/LoadingScreen.vue";
import KeyboardShortcuts from "./components/KeyboardShortcuts.vue";

const searchBarRef = ref(null);
const isLoading = ref(false);
const loadingMessage = ref("");
const showResult = ref(false);

const { searchResult, performSearch } = useSearch(isLoading);

const { isHeadless, isDarkMode, toggleDarkMode, handleUrlParams } =
    useAppState();

async function handleSearch(query) {
    if (isLoading.value) return;

    isLoading.value = true;
    showResult.value = false;
    try {
        const result = await performSearch(query);

        if (result === null) {
            // No match found - do nothing
            searchResult.value = "No match found";
            showResult.value = true;
            return;
        }

        searchResult.value = result;
        showResult.value = true;

        // Extract the URL from the result
        const url = result.replace("Redirecting to: ", "");
        window.open(url, "_blank");
    } catch (error) {
        console.error("Error during search:", error);
        searchResult.value = "An error occurred during the search.";
    } finally {
        isLoading.value = false;
    }
}

function handleSearchShortcut() {
    nextTick(() => {
        if (searchBarRef.value) {
            searchBarRef.value.focusInput();
        }
    });
}

useKeyboardShortcuts({ handleSearchShortcut });

onMounted(async () => {
    await handleUrlParams();
});
</script>

<template>
    <HeadlessRedirect v-if="isHeadless" />
    <template v-else>
        <button
            @click="toggleDarkMode"
            class="dark-mode-toggle"
            :aria-label="
                isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'
            "
        >
            <svg
                v-if="isDarkMode"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg
                v-else
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                ></path>
            </svg>
        </button>
        <div class="container" :class="{ 'dark-mode': isDarkMode }">
            <div class="search-section">
                <h1 class="title" style="margin-bottom: 4px">Argo</h1>
                <SearchBar ref="searchBarRef" @search="handleSearch" />
                <a
                    v-show="showResult"
                    :key="searchResult"
                    class="result"
                    @animationend="showResult = false"
                    :href="searchResult"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {{ searchResult }}
                </a>
            </div>
        </div>
        <KeyboardShortcuts />
    </template>
    <LoadingScreen v-if="isLoading" :message="loadingMessage" />
</template>
<style>
/* Variables */
:root {
    --bg-color: #ffffff;
    --container-bg: #fafafa;
    --input-bg: #f0f0f0;
    --input-focus-bg: #f0f0f0;
    --button-bg: #d2c0a6;
    --button-hover-bg: #c0ab8e;
    --header-text-color: #bba077;
    --text-color: #333333;
    --placeholder-color: #999999;
    --link-color: #8b7355;
    --link-hover-color: #6b5a40;
    --border-color: #e0e0e0;
}

body.dark-mode {
    --bg-color: #121212;
    --container-bg: #1e1e1e;
    --input-bg: #2a2a2a;
    --input-focus-bg: #333333;
    --button-bg: #623ba5;
    --button-hover-bg: #9575cd;
    --header-text-color: #b39ddb;
    --text-color: #ffffff;
    --placeholder-color: #888888;
    --link-color: #ce93d8;
    --link-hover-color: #e1bee7;
    --border-color: #333333;
}

/* Global Styles */
body,
html {
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    font-family:
        -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial,
        sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
    overflow-y: hidden;
}

#app {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: relative;
    overflow-y: hidden;
}

/* Layout Components */
.container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: var(--container-bg);
    padding: 30px;
    position: relative;
    width: 100%;
    box-sizing: border-box;
}

.search-section {
    margin-top: 30vh;
    position: relative;
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* Typography */
h1,
.title {
    color: var(--text-color);
    text-align: center;
    margin-bottom: 20px;
    font-size: 2.5rem;
    font-weight: 300;
}

/* UI Components */
button {
    padding: 10px 16px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 16px;
    border-radius: 5px;
}

button:hover {
    background-color: var(--button-hover-bg);
}

.dark-mode-toggle {
    position: fixed;
    top: 20px;
    left: 20px;
    z-index: 1000;
    background: none;
    border: none;
    cursor: pointer;
    padding: 5px;
    border-radius: 50%;
    transition: background-color 0.3s;
    color: var(--text-color);
}

.dark-mode-toggle:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

.dark-mode-toggle svg {
    display: block;
}

.result {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 20px;
    padding: 15px 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    line-height: 1.4;
    text-align: center;
    color: var(--button-hover-bg);
    text-overflow: ellipsis;
    width: 80%;
    animation: fadeInOut 4s ease-out;
}

/* Loading */
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

/* Animations */
@keyframes fadeInOut {
    0% {
        opacity: 0;
        transform: translate(-50%, -10px);
    }
    10%,
    90% {
        opacity: 1;
        transform: translate(-50%, 0);
    }
    100% {
        opacity: 0;
        transform: translate(-50%, -10px);
    }
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* Media Queries */
@media screen and (max-width: 768px) {
    body {
        font-size: 14px;
        -webkit-text-size-adjust: 100%;
        overflow-y: auto;
    }

    .container {
        overflow-x: hidden;
        padding: 0;
        height: 100vh;
        justify-content: center;
    }

    .hide-on-mobile {
        display: none;
    }

    h1 {
        font-size: 1.8rem;
        margin-bottom: 15px;
    }

    .dark-mode-toggle {
        top: 20px;
        left: 15px;
    }

    .search-section {
        width: 95%;
        margin-top: 0;
        height: 100vh;
        justify-content: center;
        margin-bottom: 10rem;
    }

    input[type="text"],
    input[type="url"],
    textarea {
        font-size: 16px;
        padding: 12px 16px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
    }

    button {
        touch-action: manipulation;
    }
}
</style>
