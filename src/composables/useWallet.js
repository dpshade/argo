import { ref, onMounted, watch } from "vue";
import { ArweaveWalletConnection as AWC } from "../helpers/arweaveWallet";
import { store } from "../store";

export function useWallet() {
  const isWalletConnected = ref(false);
  const walletAddress = ref(null);
  const walletConnection = ref(null);
  const processId = ref(null);

  const isFullyConnected = ref(false);

  async function connectWallet(address) {
    try {
      store.isLoading = true;
      await AWC.checkAndAddUserProcess();
      console.log("User process ID:", AWC.processId);

      if (!AWC.processId) {
        throw new Error("Failed to create or retrieve user process");
      }

      walletAddress.value = address;
      walletConnection.value = AWC;
      processId.value = AWC.processId;
      isWalletConnected.value = true;
      isFullyConnected.value = true;
    } catch (error) {
      console.error("Error during wallet connection:", error);
      disconnectWallet();
    }
  }

  async function disconnectWallet() {
    walletAddress.value = null;
    walletConnection.value = null;
    processId.value = null;
    isWalletConnected.value = false;
    isFullyConnected.value = false;
    await AWC.disconnect();
  }

  async function reconnectFromCache() {
    const reconnected = await AWC.reconnectFromCache();
    if (reconnected) {
      walletAddress.value = AWC.address;
      walletConnection.value = AWC;
      processId.value = AWC.processId;
      isWalletConnected.value = true;
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
    processId,
    connectWallet,
    disconnectWallet,
    reconnectFromCache,
  };
}
