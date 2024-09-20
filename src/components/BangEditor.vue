<script setup>
import { ref, computed, watch, inject } from "vue";
import {
    createBang,
    updateBang,
    deleteBang,
    updateFallbackSearchEngine,
    updateArweaveExplorer,
} from "../helpers/bangHelpers.js";

const HARDCODED_DEFAULTS = {
    fallbackSearchEngine: "https://duckduckgo.com/?q=%s",
    arweaveExplorer: "https://viewblock.io/arweave/tx/",
};

const props = defineProps([
    "bangs",
    "fallbackSearchEngine",
    "arweaveExplorer",
    "walletConnection",
]);
const emit = defineEmits([
    "update:bangs",
    "update:fallbackSearchEngine",
    "update:arweaveExplorer",
    "force-update",
]);

const cachedBangsData = inject("cachedBangsData");
const bangs = ref([]);
const newBang = ref({ name: "", url: "" });
const defaults = ref({
    fallbackSearchEngine:
        props.fallbackSearchEngine || HARDCODED_DEFAULTS.fallbackSearchEngine,
    arweaveExplorer:
        props.arweaveExplorer || HARDCODED_DEFAULTS.arweaveExplorer,
});

const editingBang = ref(null);

const sortedBangs = computed(() =>
    [...bangs.value].sort((a, b) => a.name.localeCompare(b.name)),
);

watch(
    () => props.bangs,
    (newBangs) => {
        bangs.value = newBangs.map((bang) => ({ ...bang }));
    },
    { immediate: true },
);

watch(
    () => props.fallbackSearchEngine,
    (newValue) => {
        defaults.value.fallbackSearchEngine =
            newValue || HARDCODED_DEFAULTS.fallbackSearchEngine;
    },
);

watch(
    () => props.arweaveExplorer,
    (newValue) => {
        defaults.value.arweaveExplorer =
            newValue || HARDCODED_DEFAULTS.arweaveExplorer;
    },
);

function formatUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, "");
}

async function addBang() {
    if (newBang.value.name && newBang.value.url) {
        try {
            const result = await createBang(
                props.walletConnection,
                newBang.value.name,
                newBang.value.url,
            );
            if (result && !result.Error) {
                bangs.value.push({ ...newBang.value });
                updateCachedBangs();
                newBang.value = { name: "", url: "" };
                emit("update:bangs", bangs.value);
                emit("force-update");
            } else {
                throw new Error(result.Error || "Unknown error");
            }
        } catch (error) {
            console.error("Error adding bang:", error);
            alert(`Failed to add bang: ${error.message}`);
        }
    }
}

async function saveBang() {
    if (editingBang.value) {
        try {
            const result = await updateBang(
                props.walletConnection,
                editingBang.value.name,
                editingBang.value.editName,
                editingBang.value.editUrl,
            );
            if (result.Error) throw new Error(result.Error);

            const index = bangs.value.findIndex(
                (b) => b.name === editingBang.value.name,
            );
            if (index !== -1) {
                bangs.value[index] = {
                    name: editingBang.value.editName,
                    url: editingBang.value.editUrl,
                };
            }

            updateCachedBangs();
            emit("update:bangs", bangs.value);
            emit("force-update");
            closeEditModal();
        } catch (error) {
            console.error("Error saving bang:", error);
            alert(`Failed to save bang: ${error.message}`);
        }
    }
}

async function removeBang(bang) {
    try {
        await deleteBang(props.walletConnection, bang.name);
        bangs.value = bangs.value.filter((b) => b.name !== bang.name);
        updateCachedBangs();
        emit("update:bangs", bangs.value);
        emit("force-update");
    } catch (error) {
        console.error("Error deleting bang:", error);
        alert(`Failed to delete bang: ${error.message}`);
    }
}

function openEditModal(bang) {
    editingBang.value = {
        ...bang,
        editName: bang.name,
        editUrl: bang.url,
    };
}

function closeEditModal() {
    editingBang.value = null;
}

async function saveDefault(key) {
    try {
        const updateFunction =
            key === "fallbackSearchEngine"
                ? updateFallbackSearchEngine
                : updateArweaveExplorer;
        await updateFunction(props.walletConnection, defaults.value[key]);
        emit(`update:${key}`, defaults.value[key]);
        emit("force-update");
    } catch (error) {
        console.error(`Error updating ${key}:`, error);
        alert(`Failed to update ${key}: ${error.message}`);
    }
}

function updateCachedBangs() {
    if (cachedBangsData.value) {
        cachedBangsData.value.Bangs = bangs.value.map(({ name, url }) => ({
            name,
            url,
        }));
    }
}
</script>
<template>
    <div class="bang-editor">
        <h2>Edit Bangs</h2>
        <ul class="bang-list">
            <li v-for="bang in sortedBangs" :key="bang.name">
                <div class="bang-info">
                    <span class="bang-name">{{ bang.name }}</span>
                    <span class="bang-url">{{ formatUrl(bang.url) }}</span>
                </div>
                <div class="bang-actions">
                    <button
                        @click="openEditModal(bang)"
                        class="icon-button edit-button"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                        >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                                d="M15.728 9.686l-1.414-1.414L5 17.586V19h1.414l9.314-9.314zm1.414-1.414l1.414-1.414-1.414-1.414-1.414 1.414 1.414 1.414zM7.242 21H3v-4.243L16.435 3.322a1 1 0 0 1 1.414 0l2.829 2.829a1 1 0 0 1 0 1.414L7.243 21z"
                            />
                        </svg>
                    </button>
                    <button
                        @click="removeBang(bang)"
                        class="icon-button delete-button"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                        >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                                d="M17 6h5v2h-2v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8H2V6h5V3a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3zm1 2H6v12h12V8zm-9 3h2v6H9v-6zm4 0h2v6h-2v-6zM9 4v2h6V4H9z"
                            />
                        </svg>
                    </button>
                </div>
            </li>
        </ul>
        <form @submit.prevent="addBang" class="add-bang-form">
            <input v-model="newBang.name" placeholder="Bang name" required />
            <input
                v-model="newBang.url"
                placeholder="URL (use %s for query)"
                required
            />
            <button type="submit" class="full-width-button">Add Bang</button>
        </form>
        <div class="divider"></div>
        <div class="defaults-section">
            <h3>Default Search Engines</h3>
            <div
                v-for="(value, key) in defaults"
                :key="key"
                class="default-item"
            >
                <span class="default-name">{{
                    key === "fallbackSearchEngine" ? "Search" : "Arweave"
                }}</span>
                <form @submit.prevent="saveDefault(key)" class="default-form">
                    <input
                        :value="formatUrl(value)"
                        @input="defaults[key] = $event.target.value"
                        :placeholder="`Enter ${key} URL`"
                        required
                    />
                    <button type="submit" class="full-width-button">
                        Save
                    </button>
                </form>
            </div>
        </div>

        <!-- Edit Modal -->
        <div v-if="editingBang" class="modal-overlay" @click="closeEditModal">
            <div class="modal-content" @click.stop>
                <form @submit.prevent="saveBang" class="edit-bang-form">
                    <input
                        v-model="editingBang.editName"
                        placeholder="Bang name"
                        required
                    />
                    <input
                        v-model="editingBang.editUrl"
                        placeholder="URL (use %s for query)"
                        required
                    />
                    <button type="submit" class="save-button">Save</button>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.bang-editor {
    background-color: var(--container-bg);
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
    width: 90%;
    max-width: 800px;
    margin: 0 auto;
}

h2,
h3 {
    color: var(--header-text-color);
    margin-top: 0;
    margin-bottom: 16px;
    font-size: 24px;
}

input {
    outline: none;
}

.bang-list {
    list-style-type: none;
    padding: 0;
    margin-bottom: 24px;
    background-color: var(--input-bg);
    border-radius: 8px;
    overflow: hidden;
}

.bang-list li {
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.bang-list li:last-child {
    border-bottom: none;
}

.bang-info {
    flex-grow: 1;
    overflow: hidden;
}

.bang-name,
.bang-url {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bang-name {
    font-weight: bold;
    color: var(--header-text-color);
    font-size: 16px;
    margin-bottom: 8px;
}

.bang-url {
    color: var(--text-color);
    font-size: 14px;
}

.bang-actions {
    display: flex;
    gap: 8px;
}

.icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    transition: transform 0.2s;
}

.icon-button:hover {
    transform: scale(1.1);
}

.icon-button svg {
    width: 20px;
    height: 20px;
    fill: var(--text-color);
    transition: fill 0.2s;
}

.icon-button:hover svg {
    fill: var(--button-hover-bg);
}

.add-bang-form,
.edit-bang-form {
    display: flex;
    background-color: var(--input-bg);
    border-radius: 8px;
    overflow: hidden;
    height: 48px;
}

.add-bang-form input,
.edit-bang-form input {
    padding: 16px;
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 16px;
}

.add-bang-form input:first-child,
.edit-bang-form input:first-child {
    width: 15%;
    font-weight: bold;
    color: var(--button-hover-bg);
    border-right: 1px solid var(--border-color);
}

.add-bang-form input:nth-child(2),
.edit-bang-form input:nth-child(2) {
    width: 70%;
    font-size: 14px;
}

/*
.add-bang-form input:not(:last-child),
.edit-bang-form input:not(:last-child) {
} */

.add-bang-form .full-width-button,
.edit-bang-form .save-button {
    width: 15%;
    padding: 16px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
    white-space: nowrap;
    border-radius: 0;
}

.add-bang-form .full-width-button:hover,
.edit-bang-form .save-button:hover {
    background-color: var(--button-hover-bg);
}

.divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 24px 0;
}

.defaults-section {
    margin-top: 24px;
}

.default-item {
    margin-bottom: 16px;
}

.default-name {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: var(--text-color);
    font-size: 16px;
}

.default-form {
    display: flex;
}

.default-form input {
    flex-grow: 1;
    padding: 12px;
    /* border: 1px solid var(--border-color); */
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    border-radius: 6px 0 0 6px;
}

.default-form .full-width-button {
    width: 14%;
    border-radius: 0 6px 6px 0;
}

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    backdrop-filter: blur(5px);
}

.modal-content {
    background-color: var(--container-bg);
    border-radius: 8px;
    width: 60%;
    box-shadow: 0 0 30px 15px rgba(var(--accent-color-rgb), 0.3);
    overflow: hidden;
}

@media screen and (max-width: 767px) {
    h2,
    h3 {
        font-size: 20px;
    }

    .add-bang-form,
    .edit-bang-form,
    .default-form {
        flex-direction: column;
        gap: 0;
    }

    .add-bang-form input,
    .edit-bang-form input,
    .default-form input,
    .add-bang-form .full-width-button,
    .edit-bang-form .save-button,
    .default-form .full-width-button {
        border-radius: 0;
    }

    .add-bang-form input:first-child,
    .edit-bang-form input:first-child,
    .default-form input:first-child {
        border-radius: 8px 8px 0 0;
    }

    .add-bang-form input:not(:last-child),
    .edit-bang-form input:not(:last-child),
    .default-form input:not(:last-child) {
        border-bottom: 1px solid var(--border-color);
    }

    .add-bang-form .full-width-button,
    .edit-bang-form .save-button,
    .default-form .full-width-button {
        border-radius: 0 0 8px 8px;
    }

    .modal-content {
        width: 95%;
        max-width: none;
        border-radius: 8px;
    }

    .edit-bang-form {
        flex-direction: column;
        gap: 8px;
        background-color: transparent;
    }

    .edit-bang-form input,
    .edit-bang-form .save-button {
        width: 100% !important;
        border-radius: 8px;
    }

    .edit-bang-form input {
        border: 1px solid var(--border-color);
    }

    .edit-bang-form input:not(:last-child) {
        border-right: none;
    }

    .edit-bang-form .save-button {
        margin-top: 8px;
    }
}
</style>
