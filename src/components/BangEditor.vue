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

const sortedBangs = computed(() =>
    [...bangs.value].sort((a, b) => a.name.localeCompare(b.name)),
);

watch(
    () => props.bangs,
    (newBangs) => {
        bangs.value = newBangs.map((bang) => ({ ...bang, editing: false }));
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
                bangs.value.push({ ...newBang.value, editing: false });
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

async function saveBang(bang) {
    try {
        const result = await updateBang(
            props.walletConnection,
            bang.name,
            bang.editName,
            bang.editUrl,
        );
        if (result.Error) throw new Error(result.Error);

        Object.assign(bang, {
            name: bang.editName,
            url: bang.editUrl,
            editing: false,
        });
        delete bang.editName;
        delete bang.editUrl;

        updateCachedBangs();
        emit("update:bangs", bangs.value);
        emit("force-update");
    } catch (error) {
        console.error("Error saving bang:", error);
        alert(`Failed to save bang: ${error.message}`);
        cancelEdit(bang);
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

function editBang(bang) {
    bang.editing = true;
    bang.editName = bang.name;
    bang.editUrl = bang.url;
}

function cancelEdit(bang) {
    bang.editing = false;
    delete bang.editName;
    delete bang.editUrl;
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
            <li
                v-for="bang in sortedBangs"
                :key="bang.name"
                :class="{ editing: bang.editing }"
            >
                <template v-if="!bang.editing">
                    <span class="bang-name" @click="editBang(bang)">{{
                        bang.name
                    }}</span>
                    <span class="bang-url" @click="editBang(bang)">{{
                        formatUrl(bang.url)
                    }}</span>
                    <div class="bang-actions">
                        <button
                            @click="editBang(bang)"
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
                </template>
                <template v-else>
                    <input
                        v-model="bang.editName"
                        placeholder="Bang name"
                        class="bang-name-edit"
                        required
                        @keyup.enter="saveBang(bang)"
                    />
                    <input
                        v-model="bang.editUrl"
                        placeholder="URL"
                        class="bang-url-edit"
                        required
                        @keyup.enter="saveBang(bang)"
                    />
                    <div class="bang-actions">
                        <button
                            @click="saveBang(bang)"
                            class="icon-button save-button"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                            >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path
                                    d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"
                                />
                            </svg>
                        </button>
                        <button
                            @click="cancelEdit(bang)"
                            class="icon-button cancel-button"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                            >
                                <path fill="none" d="M0 0h24v24H0z" />
                                <path
                                    d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-9.414l2.828-2.829 1.415 1.415L13.414 12l2.829 2.828-1.415 1.415L12 13.414l-2.828 2.829-1.415-1.415L10.586 12 7.757 9.172l1.415-1.415L12 10.586z"
                                />
                            </svg>
                        </button>
                    </div>
                </template>
            </li>
        </ul>
        <form @submit.prevent="addBang" class="add-bang-form">
            <input v-model="newBang.name" placeholder="Bang name" required />
            <input
                v-model="newBang.url"
                placeholder="URL (use %s for query)"
                required
            />
            <button type="submit">Add Bang</button>
        </form>
        <div class="divider"></div>
        <ul class="defaults-list">
            <li v-for="(value, key) in defaults" :key="key">
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
                    <button type="submit">Save</button>
                </form>
            </li>
        </ul>
    </div>
</template>
<style scoped>
.bang-editor {
    background-color: var(--container-bg);
    padding: 0 20px;
}

h2 {
    color: var(--header-text-color);
    margin-bottom: 20px;
    margin-top: 0;
}

.bang-list {
    list-style-type: none;
    padding: 0;
    margin-bottom: 20px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 5px;
}

.bang-list li {
    background-color: var(--input-bg);
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.bang-list li:last-child {
    border-bottom: none;
}

.bang-list li.editing {
    background-color: var(--input-bg);
}

.bang-name,
.bang-url {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bang-name {
    font-weight: bold;
    color: var(--header-text-color);
    width: 20%;
    margin-right: 10px;
}

.bang-url {
    color: var(--text-color);
    width: 60%;
    font-size: 12px;
    font-style: italic;
}

.bang-actions {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
}

.bang-name-edit,
.bang-url-edit {
    padding: 5px;
    border: 1px solid var(--border-color);
    border-radius: 3px;
    color: var(--text-color);
}

.bang-name-edit {
    width: 20%;
    margin-right: 10px;
}

.bang-url-edit {
    width: calc(80% - 80px);
    margin-right: 10px;
}

.icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.icon-button svg {
    width: 20px;
    height: 20px;
    padding: 2px;
    fill: var(--text-color);
    transition: fill 0.3s;
}

.icon-button:hover svg {
    fill: var(--button-hover-bg);
}

.save-button {
    transition: all 0.3s ease;
}

.save-button.submitting {
    animation: pulse 1s infinite;
}

.save-button.success {
    background-color: #4caf50;
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
    }
}

.add-bang-form,
.fallback-form,
.arweave-explorer-form {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 10px;
    margin-bottom: 20px;
}

input {
    padding: 10px;
    border: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    border-radius: 5px;
}

input:focus {
    outline: none;
    box-shadow: none;
    background-color: var(--input-bg);
}

button {
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 5px;
}

button:hover {
    background-color: var(--button-hover-bg);
}

.button-pulsing {
    animation: lightPulse 1s infinite;
}

.button-saved {
    animation: heavyPulse 0.3s ease;
}

@keyframes lightPulse {
    0%,
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 rgba(var(--button-bg-rgb), 0);
    }
    50% {
        transform: scale(1.02);
        box-shadow: 0 0 10px rgba(var(--button-bg-rgb), 0.2);
    }
}

@keyframes heavyPulse {
    0% {
        transform: scale(1);
        box-shadow: 0 0 0 rgba(var(--button-bg-rgb), 0);
    }
    50% {
        transform: scale(0.95);
        box-shadow: 0 0 15px rgba(var(--button-bg-rgb), 0.4);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 0 0 rgba(var(--button-bg-rgb), 0);
    }
}

.divider {
    height: 1px;
    background-color: var(--border-color);
    margin: 20px 0;
}

.defaults-list {
    list-style-type: none;
    padding: 0;
    margin-bottom: 20px;
}

.defaults-list li {
    margin-bottom: 10px;
}

.default-name {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: var(--placeholder-color);
    font-style: italic;
}

.default-form {
    display: flex;
    width: 100%;
}

.default-form input {
    flex-grow: 1;
    padding: 0.5rem 1rem;
    font-size: 14px;
    font-style: italic;
    border: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
}

.default-form input:focus {
    outline: none;
    background-color: var(--input-focus-bg);
}

.default-form button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition: background-color 0.3s;
}

.default-form button:hover {
    background-color: var(--button-hover-bg);
}

.default-form button {
    transition: all 0.3s ease;
}

.default-form button.submitting {
    animation: pulse 1s infinite;
}

.default-form button.success {
    background-color: #4caf50;
}

@keyframes pulse {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.1);
    }
    100% {
        transform: scale(1);
    }
}

@media screen and (max-width: 768px) {
    .bang-editor {
        padding: 15px;
    }

    .bang-list {
        max-height: none;
    }

    .bang-list li {
        flex-direction: row;
        align-items: center;
        padding: 12px 15px;
        position: relative;
    }

    .bang-name,
    .bang-url {
        font-size: 16px;
        line-height: 1.2;
    }

    .bang-name {
        width: 25%;
        margin-right: 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .bang-url {
        width: calc(75% - 50px);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .bang-actions {
        position: absolute;
        right: 15px;
        top: 50%;
        transform: translateY(-50%);
    }

    .edit-button {
        display: none;
    }

    .delete-button svg {
        width: 28px;
        height: 28px;
    }

    .add-bang-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-top: 20px;
    }

    .add-bang-form input,
    .add-bang-form button {
        width: 100%;
        font-size: 16px;
        padding: 12px;
    }

    .defaults-list li {
        margin-bottom: 15px;
    }

    .default-name {
        font-size: 16px;
        margin-bottom: 8px;
    }

    .default-form {
        flex-direction: column;
    }

    .default-form input,
    .default-form button {
        width: 100%;
        font-size: 16px;
        padding: 12px;
        border-radius: 5px;
    }

    .default-form button {
        margin-top: 8px;
    }

    /* Styles for editing mode */
    .bang-list li.editing {
        flex-direction: column;
        align-items: stretch;
    }

    .bang-name-edit,
    .bang-url-edit {
        width: 100%;
        margin-right: 0;
        margin-bottom: 8px;
        font-size: 16px;
        padding: 12px;
    }

    .bang-list li.editing .bang-actions {
        position: static;
        transform: none;
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
    }

    .bang-list li.editing .icon-button svg {
        width: 28px;
        height: 28px;
    }
}
</style>
