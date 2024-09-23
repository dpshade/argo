<script setup>
import { ref, computed, watch, inject, nextTick } from "vue";
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
    "walletManager",
]);

const emit = defineEmits([
    "update:bangs",
    "update:fallbackSearchEngine",
    "update:arweaveExplorer",
    "force-update",
    "toggle-view",
]);

const cachedBangsData = inject("cachedBangsData");
const bangs = ref([]);
const newBang = ref({ name: "", url: "" });
const newBangNameInput = ref(null);
const defaults = ref({
    fallbackSearchEngine:
        props.fallbackSearchEngine || HARDCODED_DEFAULTS.fallbackSearchEngine,
    arweaveExplorer:
        props.arweaveExplorer || HARDCODED_DEFAULTS.arweaveExplorer,
});

watch(
    () => props.bangs,
    (newBangs) => {
        bangs.value = newBangs
            .map((bang, index) => ({
                ...bang,
                originalName: bang.name,
                originalUrl: bang.url,
                isSaving: false,
                isModified: false,
                id: index,
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
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

const searchQuery = ref("");
const isSearchExpanded = ref(false);
const filteredBangs = ref([]);
const isSaving = ref(false);
const searchInputRef = ref(null);

const toggleSearch = () => {
    isSearchExpanded.value = !isSearchExpanded.value;
    if (isSearchExpanded.value) {
        nextTick(() => {
            searchInputRef.value.focus();
        });
    } else if (!searchQuery.value) {
        isSearchExpanded.value = false;
    }
};

const filterBangs = () => {
    if (searchQuery.value) {
        filteredBangs.value = bangs.value.filter(
            (bang) =>
                bang.name
                    .toLowerCase()
                    .includes(searchQuery.value.toLowerCase()) ||
                bang.url
                    .toLowerCase()
                    .includes(searchQuery.value.toLowerCase()),
        );
    } else {
        filteredBangs.value = bangs.value;
    }
};

watch(
    () => props.bangs,
    () => {
        filterBangs();
    },
    { immediate: true },
);

watch(searchQuery, (newValue) => {
    isSearchExpanded.value = true;
});

function formatUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, "");
}

async function addBang() {
    if (newBang.value.name && newBang.value.url) {
        try {
            const result = await createBang(
                newBang.value.name,
                newBang.value.url,
            );
            if (result && !result.Error) {
                bangs.value.push({
                    ...newBang.value,
                    originalName: newBang.value.name,
                    isSaving: false,
                    id: bangs.value.length,
                });
                bangs.value.sort((a, b) => a.name.localeCompare(b.name));
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
    bang.isSaving = true;
    try {
        await deleteBang(bang.name);
        bangs.value = bangs.value.filter((b) => b.id !== bang.id);
        updateCachedBangs();
        emit("update:bangs", bangs.value);
        emit("force-update");
    } catch (error) {
        console.error("Error deleting bang:", error);
        alert(`Failed to delete bang: ${error.message}`);
    } finally {
        bang.isSaving = false;
    }
}

function updateBangName(bang, newName) {
    if (!bang.originalName) {
        bang.originalName = bang.name;
    }
    bang.name = newName;
    bang.isModified =
        bang.name !== bang.originalName || bang.url !== bang.originalUrl;
    bangs.value.sort((a, b) => a.name.localeCompare(b.name));
    focusInput(bang.id);
}

function updateBangUrl(bang, newUrl) {
    bang.url = newUrl;
    bang.isModified =
        bang.name !== bang.originalName || bang.url !== bang.originalUrl;
}

function updateDefault(key, value) {
    defaults.value[key] = value;
}

const hasUnsavedChanges = computed(() => {
    return (
        bangs.value.some((bang) => bang.isModified) ||
        defaults.value.fallbackSearchEngine !== props.fallbackSearchEngine ||
        defaults.value.arweaveExplorer !== props.arweaveExplorer
    );
});

async function saveAllChanges() {
    if (!hasUnsavedChanges.value || isSaving.value) return;

    isSaving.value = true;
    try {
        for (const bang of bangs.value) {
            if (bang.isModified) {
                await updateBang(bang.originalName, bang.name, bang.url);
                bang.originalName = bang.name;
                bang.originalUrl = bang.url;
                bang.isModified = false;
            }
        }

        if (
            defaults.value.fallbackSearchEngine !== props.fallbackSearchEngine
        ) {
            await updateFallbackSearchEngine(
                defaults.value.fallbackSearchEngine,
            );
            emit(
                "update:fallbackSearchEngine",
                defaults.value.fallbackSearchEngine,
            );
        }

        if (defaults.value.arweaveExplorer !== props.arweaveExplorer) {
            await updateArweaveExplorer(defaults.value.arweaveExplorer);
            emit("update:arweaveExplorer", defaults.value.arweaveExplorer);
        }

        updateCachedBangs();
        emit("update:bangs", bangs.value);
        emit("force-update");
    } catch (error) {
        console.error("Error saving changes:", error);
        alert(`Failed to save changes: ${error.message}`);
    } finally {
        isSaving.value = false;
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

function focusNewBangInput() {
    nextTick(() => {
        if (newBangNameInput.value) {
            newBangNameInput.value.focus();
        }
    });
}

function handleKeyDown(event, type, index) {
    if (event.key === "Enter") {
        event.preventDefault();
        if (type === "bang") {
            saveAllChanges();
        } else if (type === "default") {
            saveAllChanges();
        }
    }
}

defineExpose({ focusNewBangInput });
</script>

<template>
    <div class="bang-editor">
        <h2>Edit Bangs</h2>
        <div class="top-actions">
            <div
                class="search-container"
                :class="{ expanded: isSearchExpanded || searchQuery }"
            >
                <input
                    v-show="isSearchExpanded || searchQuery"
                    v-model="searchQuery"
                    @input="filterBangs"
                    @blur="if (!searchQuery) isSearchExpanded = false;"
                    placeholder="Filter bangs..."
                    class="search-input"
                    ref="searchInputRef"
                />
                <button @click="toggleSearch" class="icon-button search-button">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                    >
                        <title>magnify</title>
                        <path
                            d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"
                        />
                    </svg>
                </button>
            </div>
            <button
                @click="saveAllChanges"
                class="icon-button save-all-button"
                :class="{
                    'unsaved-changes': hasUnsavedChanges,
                    saving: isSaving,
                }"
                :disabled="!hasUnsavedChanges || isSaving"
            >
                <svg
                    v-if="!isSaving"
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
                <svg
                    v-else
                    class="spinner"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                >
                    <path fill="none" d="M0 0h24v24H0z" />
                    <path
                        d="M12 2a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1zm8.66-10a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5A1 1 0 0 1 20.66 7zM7.67 14.5a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5a1 1 0 0 1 1.366.366zM20.66 17a1 1 0 0 1-1.366.366l-2.598-1.5a1 1 0 0 1 1-1.732l2.598 1.5A1 1 0 0 1 20.66 17zM7.67 9.5a1 1 0 0 1-1.366-.366l-2.598-1.5a1 1 0 1 1 1-1.732l2.598 1.5A1 1 0 0 1 7.67 9.5z"
                    />
                </svg>
            </button>
        </div>
        <ul class="bang-list">
            <li v-for="bang in filteredBangs" :key="bang.id" class="bang-item">
                <div class="bang-form">
                    <input
                        :id="`bang-name-${bang.id}`"
                        :value="bang.name"
                        @input="updateBangName(bang, $event.target.value)"
                        @keydown="handleKeyDown($event, 'bang', bang.id)"
                        placeholder="Bang name"
                        required
                    />
                    <input
                        :value="bang.url"
                        @input="updateBangUrl(bang, $event.target.value)"
                        @keydown="handleKeyDown($event, 'bang', bang.id)"
                        placeholder="URL (use %s for query)"
                        required
                    />
                    <button
                        @click="removeBang(bang)"
                        class="icon-button delete-button"
                        title="Delete bang"
                    >
                        <svg
                            v-if="!bang.isSaving"
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
                        <svg
                            v-else
                            class="spinner"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            width="24"
                            height="24"
                        >
                            <path fill="none" d="M0 0h24v24H0z" />
                            <path
                                d="M12 2a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 15a1 1 0 0 1 1 1v3a1 1 0 0 1-2 0v-3a1 1 0 0 1 1-1zm8.66-10a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5A1 1 0 0 1 20.66 7zM7.67 14.5a1 1 0 0 1-.366 1.366l-2.598 1.5a1 1 0 1 1-1-1.732l2.598-1.5a1 1 0 0 1 1.366.366zM20.66 17a1 1 0 0 1-1.366.366l-2.598-1.5a1 1 0 0 1 1-1.732l2.598 1.5A1 1 0 0 1 20.66 17zM7.67 9.5a1 1 0 0 1-1.366-.366l-2.598-1.5a1 1 0 1 1 1-1.732l2.598 1.5A1 1 0 0 1 7.67 9.5z"
                            />
                        </svg>
                    </button>
                </div>
            </li>
        </ul>
        <form @submit.prevent="addBang" class="add-bang-form">
            <input
                v-model="newBang.name"
                placeholder="Bang name"
                required
                ref="newBangNameInput"
            />
            <input
                v-model="newBang.url"
                placeholder="URL (use %s for query)"
                required
            />
            <button type="submit" class="full-width-button">Add Bang</button>
        </form>

        <div class="divider"></div>
        <div class="defaults-section">
            <h3>Defaults</h3>
            <div
                v-for="(value, key) in defaults"
                :key="key"
                class="default-item"
            >
                <span class="default-name">{{
                    key === "fallbackSearchEngine" ? "Search" : "Arweave"
                }}</span>
                <form class="default-form">
                    <input
                        :value="formatUrl(value)"
                        @input="updateDefault(key, $event.target.value)"
                        @keydown="handleKeyDown($event, 'default', key)"
                        :placeholder="`Enter ${key} URL`"
                        required
                    />
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
    align-items: center;
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
    margin-top: 6px;
    background-color: var(--input-bg);
    border-radius: 8px;
    max-height: 30vh;
    overflow-x: hidden;
    overflow-y: auto;
}

.bang-list li {
    padding: 0 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    max-height: 40vh;
    overflow-x: hidden;
    overflow-y: auto;
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
    width: 12.2%;
    font-weight: bold;
    color: var(--button-hover-bg);
    border-right: 1px solid var(--border-color);
}

.bang-form input:nth-child(2) {
    width: 74%;
    font-size: 14px;
}

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

.search-container {
    display: flex;
    align-items: center;
    transition: width 0.3s ease;
    width: 24px;
    overflow: hidden;
}

.search-container.expanded {
    width: 200px;
}

.search-input {
    flex-grow: 1;
    padding: 8px;
    border: none;
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
    outline: none;
}

.search-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-button svg {
    fill: var(--text-color);
}

.icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    transition:
        transform 0.2s,
        opacity 0.3s;
}

.icon-button svg {
    width: 24px;
    height: 24px;
    fill: var(--text-color);
    transition: fill 0.2s;
}

.icon-button.delete-button:hover {
    transform: scale(1.1);
}

.icon-button.delete-button:hover svg {
    fill: red;
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
    border-radius: 6px;
}

.top-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
}

.save-all-button {
    margin-left: 8px;
}

.save-all-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.save-all-button.unsaved-changes:not(:disabled) svg {
    fill: orange;
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

.toggle-view-button {
    padding: 8px 16px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.toggle-view-button:hover {
    background-color: var(--button-hover-bg);
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
        width: 100%;
        padding: 8px;
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
