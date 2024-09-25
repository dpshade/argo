import { ref, watch } from "vue";
import { debounce } from "lodash";
import {
  getAllBangs,
  updateFallbackSearchEngine,
  updateArweaveExplorer,
  createBang,
  updateBang,
  deleteBang,
} from "../helpers/bangHelpers";
import { walletManager } from "../helpers/walletManager";

export function useBangs() {
  const bangs = ref([]);
  const fallbackSearchEngine = ref("https://google.com/search?q=%s");
  const arweaveExplorer = ref("https://viewblock.io/arweave/tx/%s");
  const lastFetchTime = ref(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const debouncedFetchAndLoadData = debounce(async (forceUpdate = false) => {
    if (!walletManager.address || !walletManager.processId) {
      console.warn(
        "Wallet not connected or process ID not set, skipping data fetch",
      );
      return;
    }

    const now = Date.now();
    if (
      !forceUpdate &&
      lastFetchTime.value &&
      now - lastFetchTime.value < CACHE_DURATION
    ) {
      console.log("Using cached data");
      return;
    }

    try {
      const result = await getAllBangs();
      updateUIData(result);
      lastFetchTime.value = now;
      console.log(
        "Data fetched and updated successfully for wallet:",
        walletManager.address,
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, 1000);

  function updateUIData(data) {
    bangs.value = data.Bangs || [];
    fallbackSearchEngine.value =
      data.FallbackSearchEngine || fallbackSearchEngine.value;
    arweaveExplorer.value = data.ArweaveExplorer || arweaveExplorer.value;
  }

  async function updateBangs(newBangs) {
    if (!walletManager.address) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      for (const bang of newBangs) {
        if (bang.isNew) {
          await createBang(bang.name, bang.url);
        } else if (bang.isDeleted) {
          await deleteBang(bang.name);
        } else if (bang.isUpdated) {
          await updateBang(bang.oldName, bang.name, bang.url);
        }
      }

      await debouncedFetchAndLoadData(true);
    } catch (error) {
      console.error("Error updating bangs:", error);
      throw error;
    }
  }

  async function updateFallback(newFallback) {
    if (!walletManager.address) {
      console.warn("Wallet not connected");
      return;
    }

    console.log("NEW FALLBACK");
    console.log(newFallback);

    try {
      const result = await walletManager.sendMessageToArweave(
        [
          { name: "Action", value: "UpdateFallbackSearchEngine" },
          { name: "URL", value: newFallback },
        ],
        "",
        walletManager.processId,
      );

      if (result.Messages && result.Messages.length > 0) {
        const response = JSON.parse(result.Messages[0].Data);
        if (response.success) {
          fallbackSearchEngine.value = response.url;
          // emit("update:fallbackSearchEngine", response.url);
          // emit("force-update");
        } else {
          throw new Error(
            response.error || "Failed to update fallback search engine",
          );
        }
      } else {
        throw new Error(
          "No response from update fallback search engine handler",
        );
      }
    } catch (error) {
      console.error("Error updating fallback search engine:", error);
      throw error;
    }
  }

  async function updateExplorer(newExplorer) {
    if (!walletManager.address) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      const result = await walletManager.sendMessageToArweave(
        [
          { name: "Action", value: "UpdateArweaveExplorer" },
          { name: "URL", value: newExplorer },
        ],
        "",
        walletManager.processId,
      );

      if (result.Messages && result.Messages.length > 0) {
        const response = JSON.parse(result.Messages[0].Data);
        if (response.success) {
          arweaveExplorer.value = response.url;
          // emit("update:arweaveExplorer", response.url);
          // emit("force-update");
        } else {
          throw new Error(
            response.error || "Failed to update Arweave explorer",
          );
        }
      } else {
        throw new Error("No response from update Arweave explorer handler");
      }
    } catch (error) {
      console.error("Error updating Arweave explorer:", error);
      throw error;
    }
  }

  function resetState() {
    bangs.value = [];
    fallbackSearchEngine.value = "https://google.com/search?q=%s";
    arweaveExplorer.value = "https://viewblock.io/arweave/tx/%s";
    lastFetchTime.value = null;
  }

  // Watch for wallet connection changes
  watch(
    () => walletManager.address,
    (newAddress) => {
      if (newAddress) {
        debouncedFetchAndLoadData();
      } else {
        resetState();
      }
    },
  );

  return {
    bangs,
    fallbackSearchEngine,
    arweaveExplorer,
    fetchAndLoadData: debouncedFetchAndLoadData,
    updateBangs,
    updateFallback,
    updateExplorer,
    resetState,
  };
}
