<script setup>
import { onMounted, inject } from "vue";
import { handleSearch } from "../helpers/searchLogic.js";
import { getAllBangs } from "../helpers/bangHelpers.js";
import { cacheModule } from "../helpers/cacheModule";

const wallet = inject("wallet");

onMounted(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    console.log("HeadlessRedirect mounted, query:", query);

    if (query) {
        try {
            let bangs = [];
            let fallbackSearchEngine = "https://google.com/search?q=%s";
            let arweaveExplorer = "https://viewblock.io/arweave/tx/%s";

            // Attempt to reconnect the cached wallet
            const reconnected = await wallet.reconnectFromCache();

            if (reconnected && wallet.walletConnection.value) {
                console.log("Reconnected to cached wallet");
                const result = await getAllBangs(wallet.walletConnection.value);

                if (result.success) {
                    bangs = result.Bangs;
                    fallbackSearchEngine = result.FallbackSearchEngine;
                    arweaveExplorer = result.ArweaveExplorer;
                    cacheModule.set("bangs", bangs, "headless");
                    cacheModule.set(
                        "fallbackSearchEngine",
                        fallbackSearchEngine,
                        "headless",
                    );
                    cacheModule.set(
                        "arweaveExplorer",
                        arweaveExplorer,
                        "headless",
                    );
                }
            } else {
                console.log("No valid wallet connection, using cached data");
                bangs = cacheModule.get("bangs", "headless") || [];
                fallbackSearchEngine =
                    cacheModule.get("fallbackSearchEngine", "headless") ||
                    fallbackSearchEngine;
                arweaveExplorer =
                    cacheModule.get("arweaveExplorer", "headless") ||
                    arweaveExplorer;
            }

            // Perform search
            console.log("Performing search with query:", query);
            const result = await handleSearch(
                query,
                bangs,
                wallet.walletConnection.value,
                fallbackSearchEngine,
                arweaveExplorer,
            );
            console.log("Search result:", result);

            if (result.startsWith("Redirecting to:")) {
                const url = result.split(": ")[1];
                console.log("Redirecting to:", url);
                window.location.replace(url);
            } else {
                console.log("No redirection, result:", result);
            }
        } catch (error) {
            console.error("Error during headless redirect:", error);
            const fallbackUrl = `https://google.com/search?q=${encodeURIComponent(query)}`;
            console.log("Falling back to:", fallbackUrl);
            window.location.replace(fallbackUrl);
        }
    } else {
        console.log("No query parameter found");
    }
});
</script>

<template>
    <!-- This component doesn't need a template as it's purely functional -->
</template>
