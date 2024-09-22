<script setup>
import { ref, provide, nextTick, onMounted, watch, watchEffect } from "vue";
import { walletManager } from "./helpers/walletManager";
import { useWallet } from "./composables/useWallet";
import { useSearch } from "./composables/useSearch";
import { useBangs } from "./composables/useBangs";
import { useAppState } from "./composables/useAppState";
import { useKeyboardShortcuts } from "./composables/useKeyboardShortcuts";
import { debounce } from "lodash";
import SearchBar from "./components/SearchBar.vue";
import BangEditor from "./components/BangEditor.vue";
import ArweaveWalletConnection from "./components/ArweaveWalletConnection.vue";
import HeadlessRedirect from "./components/HeadlessRedirect.vue";
import LoadingScreen from "./components/LoadingScreen.vue";
import KeyboardShortcuts from "./components/KeyboardShortcuts.vue";

import { store } from "./store";

const searchBarRef = ref(null);
const bangEditorRef = ref(null);
const isDataLoaded = ref(false);
const showResult = ref(false);
const isBangEditorLoading = ref(false);
const isLoading = ref(false);
const loadingMessage = ref("");

const {
    isWalletConnected,
    walletAddress,
    processId,
    connectWallet,
    disconnectWallet,
    reconnectFromCache,
} = useWallet();

const {
    bangs,
    fallbackSearchEngine,
    arweaveExplorer,
    updateFallback,
    updateBangs,
    updateExplorer,
    fetchAndLoadData,
    resetState,
    isLoading: isBangsLoading,
} = useBangs();

const { searchResult, handleSearch: originalHandleSearch } =
    useSearch(isLoading);
const {
    currentView,
    isHeadless,
    isDarkMode,
    showBangEditor,
    toggleDarkMode,
    handleUrlParams,
} = useAppState();

provide("isWalletConnected", isWalletConnected);
provide("wallet", {
    isWalletConnected,
    walletAddress,
    walletManager,
    processId,
    connectWallet,
    disconnectWallet,
    reconnectFromCache,
});

provide("cachedBangsData", ref(null));
provide("isLoading", isLoading);

const handleSearch = async (query) => {
    isLoading.value = true;
    showResult.value = false;
    try {
        await originalHandleSearch(query);
        showResult.value = true;
    } finally {
        isLoading.value = false;
    }
};

function handleSearchShortcut() {
    currentView.value = "search";
    nextTick(() => {
        if (searchBarRef.value) {
            searchBarRef.value.focusInput();
        }
    });
}

function handleEditorShortcut() {
    if (isWalletConnected.value) {
        currentView.value = "bangEditor";
        nextTick(() => {
            if (bangEditorRef.value) {
                bangEditorRef.value.focusNewBangInput();
            }
        });
    } else {
        console.log("Please connect your wallet to access the bang editor");
    }
}

useKeyboardShortcuts({ handleSearchShortcut, handleEditorShortcut });

function toggleView() {
    currentView.value =
        currentView.value === "search" ? "bangEditor" : "search";
    if (currentView.value === "bangEditor") {
        isBangEditorLoading.value = true;
    }
    nextTick(() => {
        if (currentView.value === "search" && searchBarRef.value) {
            searchBarRef.value.focusInput();
        } else if (currentView.value === "bangEditor" && bangEditorRef.value) {
            bangEditorRef.value.focusNewBangInput();
        }
    });
}

async function onWalletConnected(method, address) {
    console.log("Wallet connected:", address, "with method:", method);
    isLoading.value = true;
    try {
        await fetchAndLoadData();
        if (searchBarRef.value) {
            searchBarRef.value.focusInput();
        }
    } catch (error) {
        console.error("Error during wallet connection:", error);
    } finally {
        isLoading.value = false;
    }
}

async function onWalletDisconnected() {
    console.log("Wallet disconnected");
    isLoading.value = true;
    try {
        await disconnectWallet();
        resetState();
        isDataLoaded.value = false;
    } finally {
        isLoading.value = false;
    }
}

const debouncedFetchAndLoadData = debounce(async () => {
    if (!isDataLoaded.value && isWalletConnected.value && processId.value) {
        console.log("Fetching and loading data...");
        isLoading.value = true;
        try {
            await fetchAndLoadData();
            isDataLoaded.value = true;
        } finally {
            isLoading.value = false;
        }
    }
}, 300);

onMounted(async () => {
    await handleUrlParams();
});

watch(isWalletConnected, (newValue) => {
    if (!newValue) {
        isDataLoaded.value = false;
    }
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
            <div class="top-right">
                <button @click="toggleView" v-if="isWalletConnected">
                    {{ currentView === "search" ? "Edit Bangs" : "Search" }}
                </button>
                <ArweaveWalletConnection
                    @walletConnected="onWalletConnected"
                    @walletDisconnected="onWalletDisconnected"
                />
            </div>
            <div class="search-section" v-show="currentView === 'search'">
                <h1 class="title">tinyNav</h1>
                <SearchBar
                    v-if="currentView === 'search'"
                    ref="searchBarRef"
                    @search="handleSearch"
                    :customBangs="bangs"
                />
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
            <BangEditor
                v-if="showBangEditor"
                ref="bangEditorRef"
                :bangs="bangs"
                :fallbackSearchEngine="fallbackSearchEngine"
                :arweaveExplorer="arweaveExplorer"
                :walletManager="walletManager"
                @update:bangs="updateBangs"
                @update:fallbackSearchEngine="updateFallback"
                @update:arweaveExplorer="updateExplorer"
                @force-update="() => fetchAndLoadData(true)"
                @loading-complete="isBangEditorLoading = false"
                :isLoading="isBangEditorLoading"
            />
        </div>
        <KeyboardShortcuts />
    </template>
    <LoadingScreen v-if="isLoading" :message="loadingMessage" />
</template>
<style>
:root {
    --bg-color: #ffffff;
    --container-bg: #fafafa;
    --input-bg: #f5f5f5;
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

body,
html {
    height: 100%;
    margin: 0;
    padding: 0;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
    background-color: var(--bg-color);
    color: var(--text-color);
}

#app {
    width: 100%;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: relative;
}

.container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    /* justify-content: center; */
    background-color: var(--container-bg);
    padding: 30px;
    position: relative;
    width: 100%;
    box-sizing: border-box;
}

.top-right {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
}

h1 {
    color: var(--text-color);
    text-align: center;
    margin-bottom: 20px;
    font-size: 2.5rem;
    font-weight: 300;
}

.search-section {
    margin-top: 30vh;
    position: relative;
    width: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.result {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 20px;
    padding: 15px 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    line-height: 1.4;
    animation: fadeIn 0.3s ease-out;
    transition: opacity 1s ease-out;
    text-align: center;
    animation: fadeInOut 4s ease-out;
    color: var(--button-hover-bg);
    text-overflow: ellipsis;
}

@keyframes fadeInOut {
    0% {
        opacity: 0;
        transform: translateY(-10px);
    }
    10%,
    90% {
        opacity: 1;
        transform: translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateY(-10px);
    }
}

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

.title {
    color: var(--text-color);
    text-align: center;
    margin-bottom: 20px;
    font-size: 2.5rem;
    font-weight: 300;
}

@media screen and (max-width: 768px) {
    body {
        font-size: 14px;
        -webkit-text-size-adjust: 100%;
    }

    .hide-on-mobile {
        display: none;
    }

    .container {
        overflow-x: hidden;
        padding: 0;
    }

    h1 {
        font-size: 1.8rem;
        margin-bottom: 15px;
    }

    .top-right {
        justify-content: end;
        margin-bottom: 15px;
        flex-wrap: wrap;
    }

    .toggle-button {
        margin: 5px;
        flex-grow: 1;
    }

    .dark-mode-toggle {
        top: 10px;
        left: 10px;
    }

    .search-section {
        width: 95%;
        margin-top: 15vh;
    }

    input[type="text"],
    input[type="url"],
    textarea {
        font-size: 16px;
        padding: 1.15rem 1rem;
    }

    button {
        touch-action: manipulation;
    }
}
</style>
