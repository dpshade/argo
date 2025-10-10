import { ref } from "vue";
import { specialShortcuts, defaultSettings } from "../defaults";
import { handleSearch as handleSearchLogic } from "../helpers/searchLogic";

export function useSearch(isLoading) {
  const searchResult = ref("");

  async function performSearch(query) {
    console.log("performSearch called with:", query);

    isLoading.value = true;
    try {
      // Use special shortcuts and default settings
      const result = await handleSearchLogic(
        query,
        specialShortcuts,
        defaultSettings.arweaveExplorer,
      );

      if (result === null) {
        searchResult.value = null;
        console.log("No match found for query:", query);
        return null;
      }

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
