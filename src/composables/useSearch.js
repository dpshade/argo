import { ref } from "vue";
import { quicklinks, defaultSettings } from "../defaults";
import { handleSearch as handleSearchLogic } from "../helpers/searchLogic";

export function useSearch(isLoading) {
  const searchResult = ref("");

  async function performSearch(query, forceFallback = false) {
    console.log("performSearch called with:", {
      query,
      forceFallback,
    });

    isLoading.value = true;
    try {
      // Use local quicklinks and default settings
      const result = handleSearchLogic(
        query,
        quicklinks,
        defaultSettings.fallbackSearchEngine,
        defaultSettings.arweaveExplorer,
        forceFallback,
      );

      searchResult.value = result;
      console.log("Search result:", result);
      return result;
    } catch (error) {
      console.error("Error during search:", error);
      searchResult.value = "An error occurred during the search.";
      return searchResult.value;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    searchResult,
    performSearch,
  };
}
