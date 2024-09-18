<script setup>
import { ref, onMounted, watch } from "vue";
import SearchBar from "./components/SearchBar.vue";
import BangEditor from "./components/BangEditor.vue";
import ArweaveWalletConnection from "./components/ArweaveWalletConnection.vue";
import HeadlessRedirect from "./components/HeadlessRedirect.vue";
import { ArweaveWalletConnection as AWC } from "./helpers/arweaveWallet.js";
import { handleSearch } from "./helpers/searchLogic.js";
import { getFallbackSearchEngine } from "./helpers/bangHelpers.js";

const searchResult = ref("");
const currentView = ref("search");
const bangs = ref([]);
const walletAddress = ref(null);
const walletConnection = ref(null);
const isLoading = ref(false);
const searchBarRef = ref(null);
const initialUrlParamsHandled = ref(false);
const isHeadless = ref(false);

async function onSearch(query) {
    const result = await handleSearch(
        query,
        bangs.value,
        walletConnection.value,
    );
    searchResult.value = result;
    if (result.startsWith("Redirecting to:")) {
        const url = result.split(": ")[1];
        window.open(url, "_blank");
    }
}

function toggleView() {
    if (currentView.value === "search") {
        currentView.value = "bangEditor";
    } else {
        currentView.value = "search";
    }
}

function updateBangs(newBangs) {
    bangs.value = newBangs;
}

async function onWalletConnected(address) {
    walletAddress.value = address;
    walletConnection.value = AWC;

    isLoading.value = true;
    try {
        await Promise.all([fetchBangs(), fetchFallbackSearchEngine()]);
        console.log("Bangs and fallback search engine fetched successfully");
    } catch (error) {
        console.error("Error fetching bangs or fallback search engine:", error);
    } finally {
        isLoading.value = false;
    }

    if (searchBarRef.value) {
        searchBarRef.value.focusInput();
    }
}

async function onWalletDisconnected() {
    walletAddress.value = null;
    walletConnection.value = null;
    bangs.value = { success: true, Bangs: [] };
    fallbackSearchEngine.value = "https://google.com/search?q=%s";
}

async function fetchBangs() {
    if (!walletConnection.value || !walletConnection.value.address) {
        console.log("Wallet not connected. Skipping bang fetch.");
        return;
    }
    try {
        const result = await walletConnection.value.dryRunArweave(
            [{ name: "Action", value: "ListBangs" }],
            "",
            AWC.BANG_PROCESS_ID,
        );
        if (result && result.Messages && result.Messages.length > 0) {
            const bangsData = JSON.parse(result.Messages[0].Data);
            if (bangsData.success && Array.isArray(bangsData.Bangs)) {
                bangs.value = bangsData.Bangs;
            } else {
                console.warn("Unexpected bangs data structure:", bangsData);
                bangs.value = [];
            }
        } else {
            console.warn("No bangs data received");
            bangs.value = [];
        }
    } catch (error) {
        console.error("Error fetching bangs:", error);
        bangs.value = [];
        throw error;
    }
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
    const reconnected = await AWC.reconnectFromCache();
    if (reconnected) {
        await onWalletConnected(AWC.address);
    }
    await handleUrlParams();
}

watch(() => window.location.search, handleUrlParams);

const fallbackSearchEngine = ref("https://google.com/search?q=%s");

async function fetchFallbackSearchEngine() {
    if (!walletConnection.value) {
        console.log(
            "Wallet not connected. Skipping fallback search engine fetch.",
        );
        return;
    }
    try {
        const result = await getFallbackSearchEngine(walletConnection.value);
        console.log("Fallback search engine result:", result);
        if (result && result.Messages && result.Messages.length > 0) {
            const fallbackData = JSON.parse(result.Messages[0].Data);
            if (fallbackData.success && fallbackData.url) {
                fallbackSearchEngine.value = fallbackData.url;
            } else {
                console.warn(
                    "Unexpected fallback search engine data structure:",
                    fallbackData,
                );
            }
        } else {
            console.warn("No fallback search engine data received");
        }
    } catch (error) {
        console.error("Error fetching fallback search engine:", error);
    }
}

onMounted(async () => {
    await initializeApp();
});
</script>

<template>
    <HeadlessRedirect v-if="isHeadless" />
    <template v-else>
        <div class="top-right">
            <button @click="toggleView" class="toggle-button">
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
                v-if="currentView === 'bangEditor'"
                :bangs="bangs"
                :walletConnection="walletConnection"
                @update:bangs="updateBangs"
            />
            <div v-if="searchResult && showResult" class="result fade-out">
                <!-- {{ searchResult }} -->
            </div>
        </div>
        <div v-if="isLoading" class="loading-overlay">
            <div class="loading-spinner"></div>
        </div>
    </template>
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
    margin-bottom: 20px;
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
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 16px; /* Ensure consistent font size */
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

@media screen and (max-width: 768px) {
    #app {
        padding: 10px;
    }

    .container {
        padding: 20px;
        margin-top: 100px;
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
}
</style>
