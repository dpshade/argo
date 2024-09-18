<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, provide } from "vue";
import SearchBar from "./components/SearchBar.vue";
import BangEditor from "./components/BangEditor.vue";
import ArweaveWalletConnection from "./components/ArweaveWalletConnection.vue";
import HeadlessRedirect from "./components/HeadlessRedirect.vue";
import LoadingScreen from "./components/LoadingScreen.vue";
import { ArweaveWalletConnection as AWC } from "./helpers/arweaveWallet.js";
import { handleSearch } from "./helpers/searchLogic.js";
import { getAllBangs, getFallbackSearchEngine } from "./helpers/bangHelpers.js";
import { store } from "./store";

const searchResult = ref("");
const currentView = ref("search");
const bangs = ref([]);
const walletAddress = ref(null);
const walletConnection = ref(null);
const searchBarRef = ref(null);
const initialUrlParamsHandled = ref(false);
const isHeadless = ref(false);
const isDarkMode = ref(false);
const isWalletConnected = ref(false);
const fallbackSearchEngine = ref("https://google.com/search?q=%s");
const bangEditorRef = ref(null);
const cachedBangsData = ref(null);
const isInitialized = ref(false);
provide("isInitialized", isInitialized);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const lastFetchTime = ref(0);

function handleKeyboardShortcut(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        currentView.value = "search";
        nextTick(() => {
            if (searchBarRef.value) {
                searchBarRef.value.focusInput();
            }
        });
    } else if ((event.metaKey || event.ctrlKey) && event.key === "e") {
        event.preventDefault();
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
}

function checkCachedRedirects(query) {
    const cachedRedirects = JSON.parse(
        localStorage.getItem("cachedRedirects") || "{}",
    );
    const currentTime = Date.now();

    for (const [key, value] of Object.entries(cachedRedirects)) {
        if (
            query.toLowerCase().includes(key.toLowerCase()) &&
            currentTime - value.timestamp < CACHE_DURATION
        ) {
            return value.url.replace("%s", encodeURIComponent(query));
        }
    }

    return null;
}

function cacheRedirect(key, url) {
    const cachedRedirects = JSON.parse(
        localStorage.getItem("cachedRedirects") || "{}",
    );
    cachedRedirects[key] = { url, timestamp: Date.now() };
    localStorage.setItem("cachedRedirects", JSON.stringify(cachedRedirects));
}

async function onSearch(query) {
    store.isLoading = true;
    try {
        const result = await handleSearch(
            query,
            bangs.value,
            walletConnection.value,
            fallbackSearchEngine.value,
        );
        searchResult.value = result;
        if (result.startsWith("Redirecting to:")) {
            const url = result.split(": ")[1];
            window.location.href = url;
        }
    } catch (error) {
        console.error("Error during search:", error);
        searchResult.value = "An error occurred during the search.";
    } finally {
        store.isLoading = false;
    }
}

function toggleView() {
    currentView.value =
        currentView.value === "search" ? "bangEditor" : "search";
}

function updateBangs(newBangs) {
    bangs.value = newBangs;
    saveBangsToCache(newBangs);
}

function saveBangsToCache(bangsToCache) {
    sessionStorage.setItem("currentBangs", JSON.stringify(bangsToCache));
    localStorage.setItem("savedBangs", JSON.stringify(bangsToCache));
    localStorage.setItem("bangsCacheTime", Date.now().toString());
}

function saveFallbackToCache(fallback) {
    sessionStorage.setItem("currentFallbackSearchEngine", fallback);
    localStorage.setItem("savedFallbackSearchEngine", fallback);
    localStorage.setItem("fallbackCacheTime", Date.now().toString());
}

function loadFromCache() {
    const cachedBangs = JSON.parse(
        sessionStorage.getItem("currentBangs") || "null",
    );
    const cachedFallback = sessionStorage.getItem(
        "currentFallbackSearchEngine",
    );

    if (cachedBangs) {
        bangs.value = cachedBangs;
    } else {
        const savedBangs = JSON.parse(
            localStorage.getItem("savedBangs") || "null",
        );
        if (savedBangs) {
            bangs.value = savedBangs;
            sessionStorage.setItem("currentBangs", JSON.stringify(savedBangs));
        }
    }

    if (cachedFallback) {
        fallbackSearchEngine.value = cachedFallback;
    } else {
        const savedFallback = localStorage.getItem("savedFallbackSearchEngine");
        if (savedFallback) {
            fallbackSearchEngine.value = savedFallback;
            sessionStorage.setItem(
                "currentFallbackSearchEngine",
                savedFallback,
            );
        }
    }
}

async function onWalletConnected(address) {
    walletAddress.value = address;
    walletConnection.value = AWC;
    isWalletConnected.value = true;
    await fetchAndLoadData(true);
    if (searchBarRef.value) {
        searchBarRef.value.focusInput();
    }
}

async function fetchAndLoadData(forceUpdate = false) {
    if (!forceUpdate && cachedBangsData.value) {
        console.log("Using cached data for this session");
        bangs.value = cachedBangsData.value.bangs;
        fallbackSearchEngine.value = cachedBangsData.value.fallbackSearchEngine;
        return;
    }

    if (!forceUpdate) {
        loadFromCache();
        if (bangs.value.length > 0 && fallbackSearchEngine.value) {
            return;
        }
    }

    try {
        store.isLoading = true;
        const [bangsResult, fallbackResult] = await Promise.all([
            getAllBangs(walletConnection.value),
            getFallbackSearchEngine(walletConnection.value),
        ]);

        if (
            bangsResult &&
            bangsResult.success &&
            Array.isArray(bangsResult.Bangs)
        ) {
            bangs.value = bangsResult.Bangs;
            saveBangsToCache(bangsResult.Bangs);
        }

        if (fallbackResult && fallbackResult.success && fallbackResult.url) {
            fallbackSearchEngine.value = fallbackResult.url;
            saveFallbackToCache(fallbackResult.url);
        }

        cachedBangsData.value = {
            bangs: bangs.value,
            fallbackSearchEngine: fallbackSearchEngine.value,
        };

        console.log("Bangs and fallback search engine fetched successfully");
    } catch (error) {
        console.error("Error fetching bangs or fallback search engine:", error);
    } finally {
        store.isLoading = false;
    }
}

async function onWalletDisconnected() {
    walletAddress.value = null;
    walletConnection.value = null;
    isWalletConnected.value = false;
    bangs.value = [];
    fallbackSearchEngine.value = "https://google.com/search?q=%s";
    currentView.value = "search";
    cachedBangsData.value = null;
    sessionStorage.clear();
}

async function handleUrlParams() {
    if (initialUrlParamsHandled.value) return;

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    console.log("URL Params", urlParams);

    if (query) {
        isHeadless.value = true;
    }

    initialUrlParamsHandled.value = true;
}

async function initializeApp() {
    if (isInitialized.value) return;

    loadFromCache();

    const reconnected = await AWC.reconnectFromCache();
    if (reconnected) {
        walletAddress.value = AWC.address;
        walletConnection.value = AWC;
        isWalletConnected.value = true;
        await fetchAndLoadData(false);
    } else {
        // If not reconnected, still try to load data from cache
        loadFromCache();
    }

    await handleUrlParams();
    isInitialized.value = true;
}

function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    document.body.classList.toggle("dark-mode", isDarkMode.value);
    localStorage.setItem("darkMode", isDarkMode.value);
}

watch(() => window.location.search, handleUrlParams);

onMounted(async () => {
    await initializeApp();

    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode !== null) {
        isDarkMode.value = JSON.parse(savedDarkMode);
        document.body.classList.toggle("dark-mode", isDarkMode.value);
    }

    window.addEventListener("keydown", handleKeyboardShortcut);
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeyboardShortcut);
});

// Handle the popstate event for browser back/forward buttons
window.addEventListener("popstate", () => {
    if (!isInitialized.value) {
        initializeApp();
    }
});

// Expose necessary methods and data
defineExpose({
    onSearch,
    bangs,
    fallbackSearchEngine,
    isWalletConnected,
    walletAddress,
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
        <div class="top-right">
            <button
                @click="toggleView"
                class="toggle-button"
                v-if="isWalletConnected"
            >
                {{ currentView === "search" ? "Edit Bangs" : "Search" }}
            </button>
            <ArweaveWalletConnection
                @walletConnected="onWalletConnected"
                @walletDisconnected="onWalletDisconnected"
            />
        </div>
        <div class="container">
            <h1>tinyNav</h1>
            <SearchBar
                v-if="currentView === 'search'"
                @search="onSearch"
                ref="searchBarRef"
            />
            <BangEditor
                v-if="currentView === 'bangEditor' && isWalletConnected"
                :bangs="bangs"
                :fallbackSearchEngine="fallbackSearchEngine"
                :walletConnection="walletConnection"
                @update:bangs="updateBangs"
                @force-update="fetchAndLoadData(true)"
                ref="bangEditorRef"
            />
            <div v-if="searchResult && showResult" class="result fade-out">
                <!-- {{ searchResult }} -->
            </div>
        </div>
    </template>
    <LoadingScreen />
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

/* Dark mode styles with purple-ish accents */
body.dark-mode {
    --bg-color: #121212;
    --container-bg: #1e1e1e;
    --input-bg: #2a2a2a;
    --input-focus-bg: #333333;
    --button-bg: #623ba5; /* Purple-ish button color */
    --button-hover-bg: #9575cd; /* Lighter purple for button hover */
    --header-text-color: #b39ddb; /* Light purple for header text */
    --text-color: #ffffff;
    --placeholder-color: #888888;
    --link-color: #ce93d8; /* Light purple for links */
    --link-hover-color: #e1bee7; /* Lighter purple for link hover */
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
    justify-content: center;
    background-color: var(--container-bg);
    padding: 30px;
}

.toggle-button {
    margin-left: 10px;
}

h1 {
    color: var(--text-color);
    text-align: center;
    margin-bottom: 40px;
    font-size: 2.5rem;
    font-weight: 300;
}

.result {
    margin-top: 20px;
    padding: 15px 0;
    border-bottom: 1px solid var(--border-color);
    font-size: 14px;
    line-height: 1.4;
    animation: fadeIn 0.3s ease-out;
    transition: opacity 1s ease-out;
}

.fade-out {
    animation: fadeOut 1s ease-out 3s forwards;
}

.top-right {
    position: absolute;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
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

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
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

@media screen and (max-width: 768px) {
    /* #app {
    } */

    .container {
        padding: 20px;
    }

    .top-right {
        flex-direction: column;
        align-items: flex-end;
    }

    .toggle-button {
        margin-left: 0;
        margin-top: 10px;
    }

    h1 {
        font-size: 2rem;
    }

    .dark-mode-toggle {
        top: 10px;
        left: 10px;
    }
}
</style>
