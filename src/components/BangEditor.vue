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
const bangs = ref(
    props.bangs.map((bang) => ({
        ...bang,
        originalName: bang.name,
        isSaving: false,
    })),
);
const newBang = ref({ name: "", url: "" });
const defaults = ref({
    fallbackSearchEngine:
        props.fallbackSearchEngine || HARDCODED_DEFAULTS.fallbackSearchEngine,
    arweaveExplorer:
        props.arweaveExplorer || HARDCODED_DEFAULTS.arweaveExplorer,
});

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
                bangs.value.push({
                    ...newBang.value,
                    originalName: newBang.value.name,
                    isSaving: false,
                });
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

function updateBangName(bang, newName) {
    if (!bang.originalName) {
        bang.originalName = bang.name;
    }
    bang.name = newName;
}

function updateBangUrl(bang, newUrl) {
    bang.url = newUrl;
}

async function saveBangChanges(bang) {
    if (bang.isSaving) return;

    bang.isSaving = true;
    try {
        const oldName = bang.originalName || bang.name;
        const result = await updateBang(
            props.walletConnection,
            oldName,
            bang.name,
            bang.url,
        );
        if (result.Error) throw new Error(result.Error);

        bang.originalName = bang.name;

        updateCachedBangs();
        emit("update:bangs", bangs.value);
        emit("force-update");
    } catch (error) {
        console.error("Error saving bang:", error);
        alert(`Failed to save bang: ${error.message}`);
    } finally {
        bang.isSaving = false;
    }
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

const formatInputValue = (value) => {
    if (!value) return "";
    return value.replace(
        /%s/g,
        '<span style="font-weight: bold; color: var(--button-hover-bg);">%s</span>',
    );
};

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
            <li
                v-for="bang in sortedBangs"
                :key="bang.originalName || bang.name"
                class="bang-item"
            >
                <div class="bang-form">
                    <input
                        :value="bang.name"
                        @input="updateBangName(bang, $event.target.value)"
                        placeholder="Bang name"
                        required
                        :disabled="bang.isSaving"
                    />
                    <div
                        class="formatted-input"
                        contenteditable="true"
                        @input="updateBangUrl(bang, $event.target.innerText)"
                        :innerHTML="formatInputValue(bang.url)"
                        placeholder="URL (use %s for query)"
                    ></div>
                    <div class="bang-actions">
                        <button
                            @click="saveBangChanges(bang)"
                            class="icon-button save-button"
                            :title="
                                bang.isSaving ? 'Saving...' : 'Save changes'
                            "
                            :disabled="bang.isSaving"
                        >
                            <template v-if="!bang.isSaving">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="24"
                                    height="24"
                                >
                                    <path fill="none" d="M0 0h24v24H0z" />
                                    <path
                                        d="M7 19v-6h10v6h2V7.828L16.172 5H5v14h2zM4 3h13l4 4v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm5 12v4h6v-4H9z"
                                    />
                                </svg>
                            </template>
                            <template v-else>
                                <svg
                                    class="spinner"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    width="24"
                                    height="24"
                                >
                                    <path fill="none" d="M0 0h24v24H0z" />
                                    <path
                                        d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12h2a8 8 0 1 0 8-8V2z"
                                    />
                                </svg>
                            </template>
                        </button>
                        <button
                            @click="removeBang(bang)"
                            class="icon-button delete-button"
                            title="Delete bang"
                            :disabled="bang.isSaving"
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
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.bang-list li:last-child {
    border-bottom: none;
}

.bang-form {
    display: flex;
    background-color: var(--input-bg);
    border-radius: 8px;
    overflow: hidden;
    width: 100%;
    height: 48px;
}

.bang-form input {
    padding: 16px;
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 16px;
}

.bang-form input:first-child {
    width: 15%;
    font-weight: bold;
    color: var(--button-hover-bg);
    border-right: 1px solid var(--border-color);
}

.bang-form input:nth-child(2) {
    width: 70%;
    font-size: 14px;
}

/* .highlighted-input {
    font-weight: bold;
    font-style: italic;
    color: var(--button-hover-bg);
} */

.formatted-input {
    padding: 16px;
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    outline: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.formatted-input[contenteditable="true"]:empty:before {
    content: attr(placeholder);
    color: #888;
}

.formatted-input strong {
    color: var(--button-hover-bg);
}

.bang-form .formatted-input {
    width: 70%;
}

.add-bang-form .formatted-input,
.default-form .formatted-input {
    flex-grow: 1;
}

.bang-actions {
    display: flex;
}

.bang-actions .save-button {
    margin-top: 2px;
}

.bang-actions .icon-button {
    align-items: center;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
}

.bang-actions .icon-button svg {
    width: 20px;
    height: 20px;
    fill: grey;
}

.spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

.icon-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

input:disabled {
    opacity: 0.7;
    cursor: not-allowed;
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
.default-form {
    display: flex;
    background-color: var(--input-bg);
    border-radius: 8px;
    overflow: hidden;
    height: 48px;
}

.add-bang-form input,
.default-form input {
    padding: 16px;
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 16px;
}

.add-bang-form input:first-child {
    width: 15%;
    font-weight: bold;
    color: var(--button-hover-bg);
    border-right: 1px solid var(--border-color);
}

.add-bang-form input:nth-child(2) {
    width: 70%;
    font-size: 14px;
}

.add-bang-form .full-width-button,
.default-form .full-width-button {
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
.default-form .full-width-button:hover {
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

@media screen and (max-width: 767px) {
    .bang-editor {
        margin-top: 4rem;
    }

    h2,
    h3 {
        font-size: 20px;
    }

    .bang-form {
        flex-direction: column;
        height: auto;
    }

    .bang-form input {
        width: 100%;
    }

    .bang-form input:not(:last-child) {
        display: flex;
        justify-content: center;
        text-align: center;
        width: 90%;
    }

    .bang-actions {
        justify-content: center;
    }

    .add-bang-form,
    .default-form {
        flex-direction: column;
        gap: 0;
        height: auto;
    }

    .add-bang-form input,
    .default-form input,
    .add-bang-form .full-width-button,
    .default-form .full-width-button {
        border-radius: 0;
    }

    .add-bang-form input:first-child,
    .default-form input:first-child {
        border-radius: 8px 8px 0 0;
    }

    .add-bang-form input:not(:last-child),
    .default-form input:not(:last-child) {
        width: 100%;
        border-bottom: 1px solid var(--border-color);
    }

    .add-bang-form .full-width-button,
    .default-form .full-width-button {
        width: 100%;
        border-radius: 0 0 8px 8px;
    }
}
</style>
