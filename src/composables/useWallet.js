import { ref, reactive, computed } from "vue";
import { walletManager } from "../helpers/walletManager";

const state = reactive({
  isConnecting: false,
  isConnected: false,
  address: null,
  processId: null,
});

export function useWallet() {
  const walletConnection = ref(null);

  async function connectWallet(method) {
    if (state.isConnecting || state.isConnected) return;

    state.isConnecting = true;
    try {
      const address = await walletManager.connect(method);
      state.address = address;
      state.processId = walletManager.processId;
      walletConnection.value = walletManager.getWalletConnection();
      state.isConnected = true;
      return address;
    } catch (error) {
      console.error("Error during wallet connection:", error);
      throw error;
    } finally {
      state.isConnecting = false;
    }
  }

  async function disconnectWallet() {
    await walletManager.disconnect();
    state.address = null;
    state.processId = null;
    walletConnection.value = null;
    state.isConnected = false;
  }

  async function reconnectFromCache() {
    if (state.isConnected) return true;
    const reconnected = await walletManager.reconnectFromCache();
    if (reconnected) {
      state.address = walletManager.address;
      state.processId = walletManager.processId;
      walletConnection.value = walletManager.getWalletConnection();
      state.isConnected = true;
    }
    return reconnected;
  }

  return {
    isWalletConnected: computed(() => state.isConnected),
    walletAddress: computed(() => state.address),
    processId: computed(() => state.processId),
    walletConnection,
    connectWallet,
    disconnectWallet,
    reconnectFromCache,
  };
}
