import { ref, onMounted, watch } from "vue";
import { ArweaveWalletConnection as AWC } from "../helpers/arweaveWallet";

export function useWallet(fetchAndLoadDataCallback) {
  const isWalletConnected = ref(false);
  const walletAddress = ref(null);
  const walletConnection = ref(null);

  async function connectWallet(address) {
    try {
      await AWC.checkAndAddUserProcess();
      console.log("User process ID:", AWC.processId);

      if (!AWC.processId) {
        throw new Error("Failed to create or retrieve user process");
      }

      walletAddress.value = address;
      walletConnection.value = AWC;
      isWalletConnected.value = true;

      // Fetch and load data after successful connection
      if (fetchAndLoadDataCallback) {
        await fetchAndLoadDataCallback(AWC);
      }
    } catch (error) {
      console.error("Error during wallet connection:", error);
      disconnectWallet(); // Reset the wallet state if there's an error
    }
  }

  async function disconnectWallet() {
    walletAddress.value = null;
    walletConnection.value = null;
    isWalletConnected.value = false;
  }

  async function reconnectFromCache() {
    const reconnected = await AWC.reconnectFromCache();
    if (reconnected) {
      walletAddress.value = AWC.address;
      walletConnection.value = AWC;
      isWalletConnected.value = true;
      // Fetch and load data after successful reconnection
      if (fetchAndLoadDataCallback) {
        await fetchAndLoadDataCallback(AWC);
      }
      return true;
    }
    return false;
  }

  onMounted(async () => {
    await reconnectFromCache();
  });

  return {
    isWalletConnected,
    walletAddress,
    walletConnection,
    connectWallet,
    disconnectWallet,
    reconnectFromCache,
  };
}
