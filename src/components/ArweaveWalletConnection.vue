<script>
import { ref, computed } from "vue";
import {
    createDataItemSigner,
    dryrun,
    message,
    result,
    spawn,
} from "@permaweb/aoconnect";
import { arGql } from "ar-gql";
import { ArConnect } from "arweavekit/auth";
import * as othent from "@othent/kms";
import { QuickWallet } from "quick-wallet";
import { ArweaveWalletConnection as AWC } from "../arweaveWallet";
import { store } from "../store";

const PROCESS_ID = "ZtS3h94Orj7jT94m3uP-n7iC5_56Z9LL24Vx21LW03k";

export default {
    name: "ArweaveWalletConnection",
    emits: ["walletConnected", "walletDisconnected"],
    setup(props, { emit }) {
        const walletAddress = ref(null);
        const signer = ref(null);
        const authMethod = ref(null);
        const isConnecting = ref(false);
        const showModal = ref(false);
        const isMobile = computed(() => {
            return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                navigator.userAgent,
            );
        });

        const options = [
            {
                id: "arconnectOption",
                name: "ArConnect",
                description: isMobile.value
                    ? "Limited mobile support..."
                    : "Non-custodial Arweave wallet for your favorite browser",
                iconStyle: {
                    backgroundImage:
                        "url('https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE')",
                    backgroundColor: "rgb(171, 154, 255)",
                },
                disabled: isMobile.value,
                method: "ArConnect",
            },
            {
                id: "quickWalletOption",
                name: "QuickWallet",
                description: "Creates a new wallet for you, instantly.",
                iconStyle: {
                    backgroundImage:
                        "url('https://arweave.net/aw_3Afim3oQU3JkaeWlh8DXQOcS8ZWt3niRpq-rrECA')",
                    backgroundColor: "rgb(9, 70, 37)",
                },
                disabled: false,
                recommended: true,
                method: "QuickWallet",
            },
            {
                id: "arweaveAppOption",
                name: "Arweave.app",
                description: "Web based wallet software",
                iconStyle: {
                    backgroundImage:
                        "url('https://arweave.net/qVms-k8Ox-eKFJN5QFvrPQvT9ryqQXaFcYbr-fJbgLY')",
                    backgroundColor: "black",
                },
                disabled: false,
                method: "ArweaveApp",
            },
        ];

        const sortedOptions = computed(() => {
            return options.sort((a, b) => {
                if (a.disabled === b.disabled) return 0;
                return a.disabled ? 1 : -1;
            });
        });

        const buttonText = computed(() => {
            return walletAddress.value ? "Disconnect" : "Connect Wallet";
        });

        const openModal = async () => {
            if (walletAddress.value) {
                disconnectWallet();
            } else {
                try {
                    await preloadImages();
                    showModal.value = true;
                } catch (error) {
                    console.error("Failed to load images:", error);
                }
            }
        };

        const closeModal = () => {
            showModal.value = false;
        };

        const closeModalOnOutsideClick = (event) => {
            if (event.target.className === "modal") {
                closeModal();
            }
        };

        const connectWallet = async (method) => {
            if (isConnecting.value) return;
            isConnecting.value = true;

            closeModal();

            try {
                const address = await AWC.connect(method);
                walletAddress.value = address;

                store.walletConnection = AWC;

                console.log("STORE:");
                console.log(store);

                // Emit event for parent component
                emit("walletConnected", address);
            } catch (error) {
                console.error("Wallet connection failed:", error);
                alert("Failed to connect wallet. Please try again.");
            } finally {
                isConnecting.value = false;
            }
        };

        const disconnectWallet = async () => {
            try {
                await AWC.disconnect();
                walletAddress.value = null;
                store.walletConnection = null;
                emit("walletDisconnected");
            } catch (error) {
                console.error("Wallet disconnection failed:", error);
                alert("Failed to disconnect wallet. Please try again.");
            }
        };

        const tryArConnect = async () => {
            try {
                await ArConnect.connect({
                    permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
                });
                walletAddress.value =
                    await window.arweaveWallet.getActiveAddress();
                authMethod.value = "ArConnect";
            } catch (error) {
                console.warn("ArConnect connection failed:", error);
                throw error;
            }
        };

        const tryArweaveApp = async () => {
            try {
                console.log("Connecting to Arweave.app...");
                const arweaveAppWallet = new ArweaveWebWallet();
                arweaveAppWallet.setUrl("https://arweave.app");
                await arweaveAppWallet.connect();

                const arweaveWalletNamespace =
                    arweaveAppWallet.namespaces.arweaveWallet;
                walletAddress.value = arweaveWalletNamespace.getActiveAddress();
                authMethod.value = "ArweaveApp";
            } catch (error) {
                console.error("Arweave.app connection failed:", error);
                throw error;
            }
        };

        const tryQuickWallet = async () => {
            try {
                await QuickWallet.connect();
                walletAddress.value = await QuickWallet.getActiveAddress();
                authMethod.value = "QuickWallet";
            } catch (error) {
                console.warn("Quick wallet connection failed:", error);
                throw error;
            }
        };

        const sendMessageToArweave = async (
            tags,
            data = "",
            processId = PROCESS_ID,
        ) => {
            if (!signer.value && !store.walletConnection) {
                throw new Error(
                    "Signer is not initialized. Please connect wallet first.",
                );
            }

            const currentSigner =
                signer.value || store.walletConnection.sendMessageToArweave;

            try {
                // ... (rest of the function using currentSigner)
            } catch (error) {
                // ... (error handling)
            }
        };

        const dryRunArweave = async (
            tags,
            data = "",
            processId = PROCESS_ID,
        ) => {
            if (!signer.value && !store.walletConnection) {
                throw new Error(
                    "Signer is not initialized. Please connect wallet first.",
                );
            }

            const currentSigner =
                signer.value || store.walletConnection.dryRunArweave;

            try {
                // If dryrun is not available, we'll use message instead
                if (typeof dryrun !== "function") {
                    console.warn("dryrun not available, using message instead");
                    const messageId = await message({
                        process: processId,
                        tags,
                        signer: currentSigner,
                        data,
                    });
                    return await result({
                        process: processId,
                        message: messageId,
                    });
                }

                const { Messages, Error } = await dryrun({
                    process: processId,
                    tags: tags,
                    data: data,
                    signer: currentSigner,
                });

                if (Error) {
                    console.error("Error in dryRunArweave:", Error);
                    throw new Error(Error);
                }

                console.log("Dry run completed successfully");
                return { Messages, Error };
            } catch (error) {
                console.error("Error in dryRunArweave:", error);
                throw error;
            }
        };

        const spawnProcess = async (module, scheduler, tags, data) => {
            if (!signer.value && !store.walletConnection) {
                throw new Error(
                    "Signer is not initialized. Please connect wallet first.",
                );
            }

            const currentSigner =
                signer.value || store.walletConnection.spawnProcess;

            try {
                const processId = await spawn({
                    module,
                    scheduler,
                    signer: currentSigner,
                    tags,
                    data,
                });

                return processId;
            } catch (error) {
                console.error("Error spawning process:", error);
                throw error;
            }
        };

        const preloadImages = async () => {
            const imageSources = [
                "https://arweave.net/aw_3Afim3oQU3JkaeWlh8DXQOcS8ZWt3niRpq-rrECA",
                "https://arweave.net/33nBIUNlGK4MnWtJZQy9EzkVJaAd7WoydIKfkJoMvDs",
                "https://arweave.net/qVms-k8Ox-eKFJN5QFvrPQvT9ryqQXaFcYbr-fJbgLY",
                "https://arweave.net/tQUcL4wlNj_NED2VjUGUhfCTJ6pDN9P0e3CbnHo3vUE",
            ];

            const imagePromises = imageSources.map((src) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = src;
                });
            });

            return Promise.all(imagePromises);
        };

        return {
            walletAddress,
            showModal,
            isMobile,
            sortedOptions,
            buttonText,
            openModal,
            closeModal,
            closeModalOnOutsideClick,
            connectWallet,
            disconnectWallet,
            sendMessageToArweave,
            dryRunArweave,
            spawnProcess,
            store,
        };
    },
};
</script>

<template>
    <div>
        <button class="connect-button" @click="openModal">
            {{ buttonText }}
        </button>
        <div v-if="showModal" class="modal" @click="closeModalOnOutsideClick">
            <div class="modal-content">
                <h2>Connect Wallet</h2>
                <div class="connect-options">
                    <div
                        v-for="option in sortedOptions"
                        :key="option.id"
                        :id="option.id"
                        class="connect-option"
                        :class="{ disabled: option.disabled }"
                        @click="connectWallet(option.method)"
                    >
                        <div
                            class="connect-option-icon"
                            :style="option.iconStyle"
                        ></div>
                        <div class="connect-option-detail">
                            <p class="connect-option-name">
                                {{ option.name }}
                                <span
                                    v-if="option.recommended"
                                    class="recommended"
                                    >(Recommended)</span
                                >
                            </p>
                            <p class="connect-option-desc">
                                {{ option.description }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@font-face {
    font-family: "PPNeueBit";
    src: url("/fonts/PPNeueBit-Bold.woff2") format("woff2");
    font-weight: bold;
    font-style: normal;
}

.modal button {
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 16px;
}

.modal button:hover {
    background-color: var(--button-hover-bg);
}

.connect-button {
    padding: 10px 20px;
    font-size: 16px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s ease;
}

.connect-button:hover {
    background-color: var(--button-hover-bg);
}

.modal {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1000;
    background: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: var(--bg-color);
    padding: 16px;
    margin: 0 16px;
    width: 100%;
    max-width: 380px;
    color: var(--text-color);
    text-align: start;
    border-radius: 15px;
}

h2 {
    font-family:
        Plus Jakarta Sans,
        sans-serif;
    font-size: 24px;
    font-style: normal;
    font-weight: 700;
    line-height: 120%;
    letter-spacing: 0;
    margin-bottom: 24px;
}

.connect-options {
    display: flex;
    flex-direction: column;
}

.connect-option {
    display: flex;
    align-items: center;
    margin: 1rem 0;
    height: 56px;
}

.connect-option:hover {
    background: var(--input-bg);
    cursor: pointer;
}

.connect-option-icon {
    flex: 0 0 56px;
    height: 56px;
    border-radius: 12px;
    background-size: 30px 30px;
    background-position: center;
    background-repeat: no-repeat;
}

.connect-option-detail {
    margin-left: 16px;
    align-items: center;
}

.connect-option-name {
    font-family:
        Plus Jakarta Sans,
        sans-serif;
    font-size: 16px;
    font-style: normal;
    font-weight: 700;
    line-height: 120%;
    letter-spacing: -0.16px;
    margin: 4px 0;
}

.connect-option-name .recommended {
    color: #8d90a5;
    font-family:
        Plus Jakarta Sans,
        sans-serif;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    line-height: 1.2;
    letter-spacing: -0.24px;
    vertical-align: top;
    position: relative;
    top: 3px;
    left: 5px;
}

.connect-option-desc {
    font-family:
        Plus Jakarta Sans,
        sans-serif;
    font-size: 14px;
    font-style: normal;
    font-weight: 400;
    line-height: 1.1;
    letter-spacing: 0;
    margin: 0;
    color: #454545;
}

.connect-option.disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.recommended {
    color: #427817;
    font-size: 14px;
    font-family: "PPNeueBit", monospace;
}
</style>
