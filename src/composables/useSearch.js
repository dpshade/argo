import { ref } from "vue";
import { walletManager } from "../helpers/walletManager";

export function useSearch(isLoading) {
  const searchResult = ref("");

  async function handleSearch(query, forceFallback = false) {
    isLoading.value = true;
    try {
      const tags = [
        { name: "Action", value: "Search" },
        { name: "Query", value: query },
      ];

      if (forceFallback) {
        tags.push({ name: "ForceFallback", value: "true" });
      }

      const result = await walletManager.dryRunArweave(
        tags,
        "",
        walletManager.processId,
      );

      console.log(result.Messages);

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
      isLoading.value = false;
    }
  }

  return {
    searchResult,
    handleSearch,
  };
}
