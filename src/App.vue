<script setup>
import { ref, onMounted, watch } from "vue";
import SearchBar from "./components/SearchBar.vue";
import BangEditor from "./components/BangEditor.vue";
import ArweaveWalletConnection from "./components/ArweaveWalletConnection.vue";
import { ArweaveWalletConnection as AWC } from "./arweaveWallet";
import { getFallbackSearchEngine } from "./components/bangHelpers.js";

const searchResult = ref("");
const currentView = ref("search");
const bangs = ref({ success: true, Bangs: [] });
const walletAddress = ref(null);
const walletConnection = ref(null);
const isLoading = ref(false);
const searchBarRef = ref(null);

function handleSearch(query) {
    // Split the query into words
    const words = query.trim().split(/\s+/);

    // Check if the first word matches any of the defined bangs
    const bang = bangs.value.Bangs.find(
        (b) => words[0].toLowerCase() === b.name.toLowerCase(),
    );

    if (bang) {
        // Remove the bang from the query
        const searchTerm = words.slice(1).join(" ");
        const redirectUrl = bang.url.replace(
            "%s",
            encodeURIComponent(searchTerm),
        );
        searchResult.value = `Redirecting to: ${redirectUrl}`;
        window.open(redirectUrl, "_blank");
    } else {
        // Check if any word in the query matches a bang
        for (let i = 0; i < words.length; i++) {
            const potentialBang = bangs.value.Bangs.find(
                (b) => words[i].toLowerCase() === b.name.toLowerCase(),
            );
            if (potentialBang) {
                // Remove the bang from the query
                const searchTerm = [
                    ...words.slice(0, i),
                    ...words.slice(i + 1),
                ].join(" ");
                const redirectUrl = potentialBang.url.replace(
                    "%s",
                    encodeURIComponent(searchTerm),
                );
                searchResult.value = `Redirecting to: ${redirectUrl}`;
                window.open(redirectUrl, "_blank");
                return;
            }
        }

        // If no bang is found, use the fallback search engine
        const searchUrl = fallbackSearchEngine.value.replace(
            "%s",
            encodeURIComponent(query),
        );
        searchResult.value = `Redirecting to: ${searchUrl}`;
        window.open(searchUrl, "_blank");
    }
}

function toggleView() {
    if (currentView.value === "search") {
        isLoading.value = true;
        currentView.value = "bangEditor";
        // Simulate a delay for the dryRun (remove this in production)
        setTimeout(() => {
            isLoading.value = false;
        }, 1000);
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
    await fetchBangs();
    await fetchFallbackSearchEngine();

    if (searchBarRef.value) {
        searchBarRef.value.focusInput();
    }
}

async function onWalletDisconnected() {
    walletAddress.value = null;
    walletConnection.value = null;
    bangs.value = { success: true, Bangs: [] };
    fallbackSearchEngine.value = "https://google.com/search?q=%s"; // Reset to default
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
            AWC.PROCESS_ID,
        );
        if (result && result.Messages && result.Messages.length > 0) {
            const bangsData = JSON.parse(result.Messages[0].Data);
            if (bangsData.success && Array.isArray(bangsData.Bangs)) {
                bangs.value = { success: true, Bangs: bangsData.Bangs };
            } else {
                console.warn("Unexpected bangs data structure:", bangsData);
                bangs.value = { success: true, Bangs: [] };
            }
        } else {
            console.warn("No bangs data received");
            bangs.value = { success: true, Bangs: [] };
        }
    } catch (error) {
        console.error("Error fetching bangs:", error);
        bangs.value = { success: true, Bangs: [] };
    }
}

function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    if (query) {
        handleSearch(query);
    }
}

watch(() => window.location.search, handleUrlParams);

const fallbackSearchEngine = ref("");

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

onMounted(() => {
    handleUrlParams();
});
</script>

<template>
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
            @search="handleSearch"
            ref="searchBarRef"
        />
        <BangEditor
            v-if="currentView === 'bangEditor'"
            :bangs="bangs"
            :walletConnection="walletConnection"
            @update:bangs="updateBangs"
        />
        <div v-if="searchResult" class="result">{{ searchResult }}</div>
    </div>
    <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
    </div>
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
