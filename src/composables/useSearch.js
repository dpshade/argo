import { ref } from "vue";
import { handleSearch as performSearch } from "../helpers/searchLogic";

export function useSearch() {
  const searchResult = ref("");
  const isLoading = ref(false);

  async function handleSearch(
    query,
    bangs,
    walletConnection,
    fallbackSearchEngine,
    arweaveExplorer,
  ) {
    isLoading.value = true;
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
      isLoading.value = false;
    }
  }

  return {
    searchResult,
    isLoading,
    handleSearch,
  };
}
