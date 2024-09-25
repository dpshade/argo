<script>
import { ref, computed, onMounted } from "vue";
import { useWallet } from "../composables/useWallet";
import { store } from "../store";

export default {
    name: "ArweaveWalletConnection",
    emits: ["walletConnected", "walletDisconnected"],
    setup(props, { emit }) {
        const {
            isWalletConnected,
            walletAddress,
            connectWallet,
            disconnectWallet,
            reconnectFromCache,
        } = useWallet();

        const showModal = ref(false);
        const isConnecting = ref(false);

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
                recommended: false,
                method: "QuickWallet",
            },
        ];

        const sortedOptions = computed(() => {
            return options.sort((a, b) => {
                if (a.disabled === b.disabled) return 0;
                return a.disabled ? 1 : -1;
            });
        });

        const buttonText = computed(() => {
            return isWalletConnected.value ? "Disconnect" : "Connect Wallet";
        });

        const openModal = async () => {
            if (isWalletConnected.value) {
                disconnectWalletHandler();
            } else {
                showModal.value = true;
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

        const connectWalletHandler = async (method) => {
            if (isConnecting.value) return;
            isConnecting.value = true;
            closeModal();

            try {
                const address = await connectWallet(method);
                emit("walletConnected", method, address);
            } catch (error) {
                console.error("Wallet connection failed:", error);
                alert("Failed to connect wallet. Please try again.");
            } finally {
                isConnecting.value = false;
            }
        };

        const disconnectWalletHandler = async () => {
            try {
                await disconnectWallet();
                emit("walletDisconnected");
            } catch (error) {
                console.error("Wallet disconnection failed:", error);
                alert("Failed to disconnect wallet. Please try again.");
            }
        };

        const checkCachedConnection = async () => {
            const reconnected = await reconnectFromCache();
            if (reconnected) {
                emit("walletConnected", walletAddress.value);
            }
        };

        onMounted(async () => {
            await checkCachedConnection();
        });

        return {
            isWalletConnected,
            walletAddress,
            showModal,
            isMobile,
            sortedOptions,
            buttonText,
            openModal,
            closeModal,
            closeModalOnOutsideClick,
            connectWallet: connectWalletHandler,
            disconnectWallet: disconnectWalletHandler,
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

.modal button,
.connect-button {
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
    font-size: 16px;
}

.modal button:hover,
.connect-button:hover {
    background-color: var(--button-hover-bg);
}

.modal {
    display: flex;
    position: fixed;
    inset: 0;
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
    font-weight: 700;
    line-height: 120%;
    margin-bottom: 24px;
}

.connect-options {
    display: flex;
    flex-direction: column;
}

.connect-option {
    display: flex;
    align-items: center;
    height: 56px;
    padding: 1rem;
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
    font-weight: 400;
    line-height: 1.1;
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

@media screen and (max-width: 768px) {
    .modal-content {
        width: 90%;
        max-width: none;
        margin: 0 auto;
        padding: 20px;
    }

    .connect-options {
        max-height: 70vh;
        overflow-y: auto;
    }

    .connect-option {
        padding: 15px 10px;
    }

    .connect-option-icon {
        flex: 0 0 40px;
        height: 40px;
        margin-right: 15px;
    }

    .connect-option-detail {
        flex: 1;
    }

    .connect-option-name {
        font-size: 16px;
    }

    .connect-option-desc {
        font-size: 12px;
    }

    .connect-button {
        width: 100%;
        margin: 0 auto;
        display: block;
    }
}
</style>
