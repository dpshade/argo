<template>
    <WalletConnectModal
        v-if="showWalletModal"
        @walletConnected="onWalletConnected"
    />
</template>

<script setup>
import { ref, onMounted } from "vue";
import { handleSearch } from "../helpers/searchLogic.js";
import { getAllBangs } from "../helpers/bangHelpers.js";
import { cacheModule } from "../helpers/cacheModule";
import { useWallet } from "../composables/useWallet";
import { walletManager } from "../helpers/walletManager";
import WalletConnectModal from "./WalletConnectModal.vue";

const { reconnectFromCache } = useWallet();
const showWalletModal = ref(false);

async function performSearch(
    query,
    bangs,
    fallbackSearchEngine,
    arweaveExplorer,
) {
    console.log("Performing search with query:", query);
    const result = await handleSearch(
        query,
        bangs,
        walletManager,
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
}

async function onWalletConnected(method, address) {
    showWalletModal.value = false;
    await handleSearchWithConnectedWallet();
}

async function handleSearchWithConnectedWallet() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");

    try {
        const result = await getAllBangs(walletManager);

        if (result.success) {
            const bangs = result.Bangs;
            const fallbackSearchEngine = result.FallbackSearchEngine;
            const arweaveExplorer = result.ArweaveExplorer;
            cacheModule.set("bangs", bangs, "headless");
            cacheModule.set(
                "fallbackSearchEngine",
                fallbackSearchEngine,
                "headless",
            );
            cacheModule.set("arweaveExplorer", arweaveExplorer, "headless");

            await performSearch(
                query,
                bangs,
                fallbackSearchEngine,
                arweaveExplorer,
            );
        } else {
            throw new Error("Failed to retrieve user data");
        }
    } catch (error) {
        console.error("Error during headless redirect:", error);
        const fallbackUrl = `https://google.com/search?q=${encodeURIComponent(query)}`;
        console.log("Falling back to:", fallbackUrl);
        window.location.replace(fallbackUrl);
    }
}

onMounted(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    console.log("HeadlessRedirect mounted, query:", query);

    if (query) {
        try {
            const reconnected = await reconnectFromCache();

            if (reconnected && walletManager.address) {
                console.log("Reconnected to cached wallet");
                await handleSearchWithConnectedWallet();
            } else {
                console.log("No valid wallet connection, showing wallet modal");
                showWalletModal.value = true;
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
