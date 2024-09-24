import { ref } from "vue";
import { walletManager } from "../helpers/walletManager";
import { defaultBangs, defaultSettings } from "../defaults";
import { handleSearch as handleSearchLogic } from "../helpers/searchLogic";

export function useSearch(isLoading) {
  const searchResult = ref("");

  async function performSearch(
    query,
    forceFallback = false,
    isWalletConnected,
  ) {
    console.log("performSearch called with:", {
      query,
      forceFallback,
      isWalletConnected,
    });

    isLoading.value = true;
    try {
      let result;
      if (isWalletConnected) {
        // Existing wallet-connected logic
        const tags = [
          { name: "Action", value: "Search" },
          { name: "Query", value: query },
        ];

        if (forceFallback) {
          tags.push({ name: "ForceFallback", value: "true" });
        }

        const response = await walletManager.dryRunArweave(
          tags,
          "",
          walletManager.processId,
        );

        if (response.Messages && response.Messages.length > 0) {
          console.log(response.Messages);
          const data = JSON.parse(response.Messages[0].Data);
          result = data.result;
        } else {
          throw new Error("No response from search handler");
        }
      } else {
        // Use default values when wallet is not connected
        result = handleSearchLogic(
          query,
          defaultBangs,
          defaultSettings.fallbackSearchEngine,
          defaultSettings.arweaveExplorer,
          forceFallback,
        );
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
