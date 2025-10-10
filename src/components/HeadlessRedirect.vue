<template>
    <div></div>
</template>

<script setup>
import { onMounted } from "vue";
import { handleSearch } from "../helpers/searchLogic.js";
import { defaultSettings } from "../defaults.js";

async function performSearch(query) {
    console.log("Performing headless search with query:", query);
    const result = await handleSearch(
        query,
        quicklinks,
        defaultSettings.fallbackSearchEngine,
        defaultSettings.arweaveExplorer,
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

onMounted(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get("q");
    console.log("HeadlessRedirect mounted, query:", query);

    if (query) {
        try {
            await performSearch(query);
        } catch (error) {
            console.error("Error during headless redirect:", error);
            const fallbackUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            console.log("Falling back to:", fallbackUrl);
            window.location.replace(fallbackUrl);
        }
    } else {
        console.log("No query parameter found");
    }
});
</script>
