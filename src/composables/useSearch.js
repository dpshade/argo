import { ref } from "vue";
import { handleSearch as performSearch } from "../helpers/searchLogic";
import { store } from "../store";

export function useSearch() {
  const searchResult = ref("");

  async function handleSearch(
    query,
    bangs,
    walletConnection,
    fallbackSearchEngine,
    arweaveExplorer,
  ) {
    store.isLoading = true;
    try {
      const result = await performSearch(
        query,
        bangs,
        walletConnection,
        fallbackSearchEngine,
        arweaveExplorer,
      );
      searchResult.value = result;
      if (result.startsWith("Redirecting to:")) {
        const url = result.split(": ")[1];
        window.open(url, "_blank");
      }
      return result;
    } catch (error) {
      console.error("Error during search:", error);
      searchResult.value = "An error occurred during the search.";
    } finally {
      store.isLoading = false;
    }
  }

  return {
    searchResult,
    handleSearch,
  };
}
