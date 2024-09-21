import { ref } from "vue";
import { walletManager } from "../helpers/walletManager";
import { store } from "../store";

export function useSearch() {
  const searchResult = ref("");

  async function handleSearch(query) {
    store.isLoading = true;
    try {
      const result = await walletManager.dryRunArweave(
        [
          { name: "Action", value: "Search" },
          { name: "Query", value: query },
        ],
        "",
        walletManager.processId,
      );

      if (result.Messages && result.Messages.length > 0) {
        const data = JSON.parse(result.Messages[0].Data);
        searchResult.value = data.result;
        console.log("Search result:", searchResult.value);
        let url = searchResult.value;
        window.open(url, "_blank");

        return data.result;
      } else {
        throw new Error("No response from search handler");
      }
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
