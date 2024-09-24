<template>
    <div class="wallet-connect-modal">
        <h2>Connect Your Wallet</h2>
        <p>Please connect your wallet to continue with the redirect.</p>
        <ArweaveWalletConnection @walletConnected="onWalletConnected" />
    </div>
</template>

<script setup>
import ArweaveWalletConnection from "./ArweaveWalletConnection.vue";

const emit = defineEmits(["walletConnected"]);

function onWalletConnected(method, address) {
    emit("walletConnected", method, address);
}
</script>

<style scoped>
.wallet-connect-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    width: 65%;
    transform: translate(-50%, -50%);
    background-color: var(--container-bg);
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 1px 24px rgba(0, 0, 0, 0.2);
    z-index: 1000;
}
</style>
