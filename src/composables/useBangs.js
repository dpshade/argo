import { ref, watch, inject } from "vue";
import {
  getAllBangs,
  updateFallbackSearchEngine,
  updateArweaveExplorer,
  createBang,
  updateBang,
  deleteBang,
} from "../helpers/bangHelpers";
import { store } from "../store";

export function useBangs(walletAddress, walletConnection, processId) {
  const bangs = ref([]);
  const fallbackSearchEngine = ref("https://google.com/search?q=%s");
  const arweaveExplorer = ref("https://viewblock.io/arweave/tx/%s");
  const CACHE_DURATION = 5 * 60 * 1000;
  const editViewCounter = ref(0);

  function getCacheKey() {
    return `bangsData_${walletAddress.value}`;
  }

  async function fetchAndLoadData(forceUpdate = false) {
    if (!walletConnection.value || !walletConnection.value.processId) {
      console.warn(
        "Wallet not connected or process ID not set, skipping data fetch",
      );

      return;
    }

    const cacheKey = getCacheKey();
    const cachedData = localStorage.getItem(cacheKey);

    if (!forceUpdate && cachedData) {
      const { data, timestamp } = JSON.parse(cachedData);
      if (Date.now() - timestamp < CACHE_DURATION) {
        console.log("Using cached data for wallet:", walletAddress.value);
        updateUIData(data);
        return;
      }
    }

    try {
      const result = await getAllBangs(walletConnection.value);
      updateUIData(result);
      updateCache(result);
      console.log(
        "Data fetched and updated successfully for wallet:",
        walletAddress.value,
      );
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  async function dryRunUpdate() {
    if (!walletConnection.value) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      const result = await getAllBangs(walletConnection.value, true);
      updateUIData(result);
      updateCache(result);
      console.log("Dry run update completed for wallet:", walletAddress.value);
    } catch (error) {
      console.error("Error during dry run update:", error);
    }
  }

  function updateUIData(data) {
    bangs.value = data.Bangs || [];
    fallbackSearchEngine.value =
      data.FallbackSearchEngine || fallbackSearchEngine.value;
    arweaveExplorer.value = data.ArweaveExplorer || arweaveExplorer.value;
  }

  function updateCache(data) {
    const cacheKey = getCacheKey();
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: data,
        timestamp: Date.now(),
      }),
    );
  }

  function incrementEditViewCounter() {
    editViewCounter.value++;
    if (editViewCounter.value % 3 === 0) {
      dryRunUpdate();
    }
  }

  async function updateBangs(newBangs) {
    if (!walletConnection.value) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      for (const bang of newBangs) {
        if (bang.isNew) {
          await createBang(walletConnection.value, bang.name, bang.url);
        } else if (bang.isDeleted) {
          await deleteBang(walletConnection.value, bang.name);
        } else if (bang.isUpdated) {
          await updateBang(
            walletConnection.value,
            bang.oldName,
            bang.name,
            bang.url,
          );
        }
      }

      // Fetch updated data after changes
      await fetchAndLoadData(true);
    } catch (error) {
      console.error("Error updating bangs:", error);
      throw error;
    }
  }

  async function updateFallback(newFallback) {
    if (!walletConnection.value) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      await updateFallbackSearchEngine(walletConnection.value, newFallback);
      fallbackSearchEngine.value = newFallback;
      updateCache({
        ...JSON.parse(localStorage.getItem(getCacheKey())).data,
        FallbackSearchEngine: newFallback,
      });
    } catch (error) {
      console.error("Error updating fallback search engine:", error);
      throw error;
    }
  }

  async function updateExplorer(newExplorer) {
    if (!walletConnection.value) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      await updateArweaveExplorer(walletConnection.value, newExplorer);
      arweaveExplorer.value = newExplorer;
      updateCache({
        ...JSON.parse(localStorage.getItem(getCacheKey())).data,
        ArweaveExplorer: newExplorer,
      });
    } catch (error) {
      console.error("Error updating Arweave explorer:", error);
      throw error;
    }
  }

  // Watch for wallet address changes
  function resetState() {
    bangs.value = [];
    fallbackSearchEngine.value = "https://google.com/search?q=%s";
    arweaveExplorer.value = "https://viewblock.io/arweave/tx/%s";
  }

  return {
    bangs,
    fallbackSearchEngine,
    arweaveExplorer,
    fetchAndLoadData,
    updateBangs,
    updateFallback,
    updateExplorer,
    incrementEditViewCounter,
    resetState,
  };
}
