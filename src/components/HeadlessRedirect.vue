<template>
    <!-- Intentionally left empty for truly headless operation -->
</template>

<script setup>
import { onMounted } from "vue";
import { handleSearch } from "../helpers/searchLogic.js";
import { ArweaveWalletConnection as AWC } from "../helpers/arweaveWallet.js";
import { getAllBangs } from "../helpers/bangHelpers.js";

const CACHE_DURATION = 1000 * 60 * 5;

function getCachedData(key) {
    const item = localStorage.getItem(key);
    if (item) {
        const { value, timestamp } = JSON.parse(item);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return value;
        }
    }
    return null;
}

function setCachedData(key, value) {
    localStorage.setItem(key, JSON.stringify({ value, timestamp: Date.now() }));
}

onMounted(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");

    if (query) {
        try {
            // Always attempt to reconnect wallet
            const reconnected = await AWC.reconnectFromCache();

            let bangs = [];
            let fallbackSearchEngine = "https://google.com/search?q=%s";
            let arweaveExplorer = "https://viewblock.io/arweave/tx/%s";

            if (reconnected) {
                const result = await getAllBangs(AWC);

                if (result.success) {
                    bangs = result.Bangs;
                    fallbackSearchEngine = result.FallbackSearchEngine;
                    arweaveExplorer = result.ArweaveExplorer;
                    setCachedData("bangs", bangs);
                    setCachedData("fallbackSearchEngine", fallbackSearchEngine);
                    setCachedData("arweaveExplorer", arweaveExplorer);
                }
            } else {
                // If reconnection failed, use cached data
                bangs = getCachedData("bangs") || [];
                fallbackSearchEngine =
                    getCachedData("fallbackSearchEngine") ||
                    fallbackSearchEngine;
                arweaveExplorer =
                    getCachedData("arweaveExplorer") || arweaveExplorer;
            }

            // Perform search
            const result = await handleSearch(
                query,
                bangs,
                AWC,
                fallbackSearchEngine,
                arweaveExplorer,
            );
            if (result.startsWith("Redirecting to:")) {
                const url = result.split(": ")[1];
                window.location.replace(url);
            }
        } catch (error) {
            console.error("Error during headless redirect:", error);
            const fallbackUrl = `https://google.com/search?q=${encodeURIComponent(query)}`;
            window.location.replace(fallbackUrl);
        }
    }
});
</script>
