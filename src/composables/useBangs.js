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
import { cacheModule } from "../helpers/cacheModule";
import { walletManager } from "../helpers/walletManager";

export function useBangs() {
  const bangs = ref([]);
  const fallbackSearchEngine = ref("https://google.com/search?q=%s");
  const arweaveExplorer = ref("https://viewblock.io/arweave/tx/%s");
  const lastFetchTime = ref(null);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  function getCacheKey() {
    return `bangsData_${walletManager.address}`;
  }

  const debouncedFetchAndLoadData = debounce(async (forceUpdate = false) => {
    if (!walletManager.address || !walletManager.processId) {
      console.warn(
        "Wallet not connected or process ID not set, skipping data fetch",
      );
      return;
    }

    const now = Date.now();
    const cacheKey = getCacheKey();
    const cachedData = cacheModule.get(cacheKey, "bangs");

    if (
      !forceUpdate &&
      cachedData &&
      now - lastFetchTime.value < CACHE_DURATION
    ) {
      console.log("Using cached data for wallet:", walletManager.address);
      updateUIData(cachedData);
      return;
    }

    try {
      const result = await getAllBangs(walletManager);
      updateUIData(result);
      cacheModule.set(cacheKey, result, "bangs");
      lastFetchTime.value = now;
      console.log(
        "Data fetched and updated successfully for wallet:",
        walletManager.address,
      );

      // Perform dry run update less frequently
      if (
        forceUpdate ||
        !lastFetchTime.value ||
        now - lastFetchTime.value > CACHE_DURATION * 2
      ) {
        await dryRunUpdate();
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, 1000);

  async function dryRunUpdate() {
    if (!walletConnection.value) {
      console.warn("Wallet not connected");
      return;
    }

    try {
      const result = await getAllBangs(walletConnection.value, true);
      updateUIData(result);
      cacheModule.set(getCacheKey(), result, "bangs");
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

      await debouncedFetchAndLoadData(true);
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
      const cachedData = cacheModule.get(getCacheKey(), "bangs");
      if (cachedData) {
        cachedData.FallbackSearchEngine = newFallback;
        cacheModule.set(getCacheKey(), cachedData, "bangs");
      }
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
      const cachedData = cacheModule.get(getCacheKey(), "bangs");
      if (cachedData) {
        cachedData.ArweaveExplorer = newExplorer;
        cacheModule.set(getCacheKey(), cachedData, "bangs");
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
    cacheModule.clear("bangs");
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
