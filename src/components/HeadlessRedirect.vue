<template>
    <!-- Intentionally left empty for truly headless operation -->
</template>

<script setup>
import { onMounted } from "vue";
import { handleSearch } from "../helpers/searchLogic.js";
import { ArweaveWalletConnection as AWC } from "../helpers/arweaveWallet.js";
import {
    getAllBangs,
    getFallbackSearchEngine,
} from "../helpers/bangHelpers.js";

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

            if (reconnected) {
                // Fetch bangs and fallback search engine in parallel
                const [bangsResult, fallbackResult] = await Promise.all([
                    getAllBangs(AWC),
                    getFallbackSearchEngine(AWC),
                ]);

                if (
                    bangsResult &&
                    bangsResult.Messages &&
                    bangsResult.Messages.length > 0
                ) {
                    const bangsData = JSON.parse(bangsResult.Messages[0].Data);
                    if (bangsData.success && Array.isArray(bangsData.Bangs)) {
                        bangs = bangsData.Bangs;
                        setCachedData("bangs", bangs);
                    }
                } else {
                    bangs = getCachedData("bangs") || [];
                }

                if (
                    fallbackResult &&
                    fallbackResult.Messages &&
                    fallbackResult.Messages.length > 0
                ) {
                    const fallbackData = JSON.parse(
                        fallbackResult.Messages[0].Data,
                    );
                    if (fallbackData.success && fallbackData.url) {
                        fallbackSearchEngine = fallbackData.url;
                        setCachedData(
                            "fallbackSearchEngine",
                            fallbackSearchEngine,
                        );
                    }
                } else {
                    fallbackSearchEngine =
                        getCachedData("fallbackSearchEngine") ||
                        fallbackSearchEngine;
                }
            } else {
                // If reconnection failed, use cached data
                bangs = getCachedData("bangs") || [];
                fallbackSearchEngine =
                    getCachedData("fallbackSearchEngine") ||
                    fallbackSearchEngine;
            }

            // Perform search
            const result = await handleSearch(
                query,
                bangs,
                AWC,
                fallbackSearchEngine,
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
