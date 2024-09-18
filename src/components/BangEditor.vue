<script setup>
import { ref, watch, nextTick } from "vue";
import {
    createBang,
    updateBang,
    deleteBang,
    updateFallbackSearchEngine,
} from "../helpers/bangHelpers.js";
import { ArweaveWalletConnection } from "../helpers/arweaveWallet";

const props = defineProps({
    bangs: {
        type: Array,
        default: () => [],
    },
    fallbackSearchEngine: {
        type: String,
        default: "",
    },
    walletConnection: {
        type: Object,
        required: true,
    },
});

const emit = defineEmits(["update:bangs", "force-update"]);

const localBangs = ref([]);
const fallbackSearchEngine = ref("");
const newBangName = ref("");
const newBangUrl = ref("");
const showFallbackSuccess = ref(false);

watch(
    () => props.bangs,
    (newBangs) => {
        localBangs.value = JSON.parse(JSON.stringify(newBangs));
    },
    { immediate: true },
);

watch(
    () => props.fallbackSearchEngine,
    (newFallback) => {
        fallbackSearchEngine.value = newFallback;
    },
    { immediate: true },
);

const newBangNameInput = ref(null);

function focusNewBangInput() {
    if (newBangNameInput.value) {
        newBangNameInput.value.focus();
    }
}

function getClickPosition(element, x) {
    const rect = element.getBoundingClientRect();
    const leftPadding = parseInt(getComputedStyle(element).paddingLeft, 10);
    return Math.round((x - rect.left - leftPadding) / 7); // Assuming average char width of 7px
}

function editBang(index, field, event) {
    const bang = localBangs.value[index];
    bang.editing = true;
    bang.editName = bang.name;
    bang.editUrl = bang.url;

    nextTick(() => {
        const inputElement = document.getElementById(`bang-${field}-${index}`);
        if (inputElement) {
            inputElement.focus();
            const clickPosition = getClickPosition(event.target, event.clientX);
            inputElement.setSelectionRange(clickPosition, clickPosition);
        }
    });
}

function cancelEdit(index) {
    const bang = localBangs.value[index];
    bang.editing = false;
    delete bang.editName;
    delete bang.editUrl;
}

async function addNewBang() {
    if (newBangName.value && newBangUrl.value) {
        try {
            await createBang(
                ArweaveWalletConnection,
                newBangName.value,
                newBangUrl.value,
            );
            newBangName.value = "";
            newBangUrl.value = "";
            emit("force-update");
        } catch (error) {
            console.error("Error adding bang:", error);
        }
    }
}

async function saveBang(index) {
    const bang = localBangs.value[index];
    try {
        console.log(
            `Saving bang: ${bang.name} to ${bang.editName} with URL: ${bang.editUrl}`,
        );
        const result = await updateBang(
            ArweaveWalletConnection,
            bang.name,
            bang.editName,
            bang.editUrl,
        );
        console.log("Save bang result:", result);

        if (result.Error) {
            throw new Error(result.Error);
        }

        bang.name = bang.editName;
        bang.url = bang.editUrl;
        bang.editing = false;
        delete bang.editName;
        delete bang.editUrl;
        emit("force-update");
    } catch (error) {
        console.error("Error saving bang:", error);
        alert(`Failed to save bang: ${error.message}`);
    }
}

async function removeBang(index) {
    const bang = localBangs.value[index];
    try {
        await deleteBang(ArweaveWalletConnection, bang.name);
        emit("force-update");
    } catch (error) {
        console.error("Error deleting bang:", error);
    }
}

function updateBangs() {
    emit("update:bangs", JSON.parse(JSON.stringify(localBangs.value)));
}

async function saveFallbackSearchEngine() {
    try {
        await updateFallbackSearchEngine(
            ArweaveWalletConnection,
            fallbackSearchEngine.value,
        );
        showFallbackSuccess.value = true;
        setTimeout(() => {
            showFallbackSuccess.value = false;
        }, 3000);
        emit("force-update");
    } catch (error) {
        console.error("Error updating fallback search engine:", error);
        alert(`Failed to update fallback search engine: ${error.message}`);
    }
}

defineExpose({ focusNewBangInput });
</script>

<template>
    <div class="bang-editor">
        <h2>Edit Bangs</h2>
        <ul class="bang-list">
            <li
                v-for="(bang, index) in localBangs"
                :key="index"
                :class="{ editing: bang.editing }"
            >
                <template v-if="!bang.editing">
                    <span
                        class="bang-name"
                        @click="(e) => editBang(index, 'name', e)"
                        >{{ bang.name }}</span
                    >
                    <span
                        class="bang-url"
                        @click="(e) => editBang(index, 'url', e)"
                        >{{ bang.url }}</span
                    >
                    <div class="bang-actions">
                        <button
                            @click="(e) => editBang(index, 'name', e)"
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
                            @click="removeBang(index)"
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
                        :id="`bang-name-${index}`"
                        v-model="bang.editName"
                        placeholder="Bang name"
                        class="bang-name-edit"
                        required
                        @keyup.enter="saveBang(index)"
                    />
                    <input
                        :id="`bang-url-${index}`"
                        v-model="bang.editUrl"
                        placeholder="URL"
                        class="bang-url-edit"
                        required
                        @keyup.enter="saveBang(index)"
                    />
                    <div class="bang-actions">
                        <button
                            @click="saveBang(index)"
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
                            @click="cancelEdit(index)"
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
        <form @submit.prevent="addNewBang" class="add-bang-form">
            <input
                v-model="newBangName"
                placeholder="Bang name"
                required
                ref="newBangNameInput"
            />
            <input
                v-model="newBangUrl"
                placeholder="URL (use %s for query)"
                required
            />
            <button type="submit">Add Bang</button>
        </form>
        <div class="fallback-search-engine">
            <h3>Fallback Search Engine</h3>
            <form
                @submit.prevent="saveFallbackSearchEngine"
                class="fallback-form"
            >
                <input
                    v-model="fallbackSearchEngine"
                    placeholder="Enter fallback search URL (use %s for query)"
                    required
                />
                <button type="submit">Save</button>
                <span v-if="showFallbackSuccess" class="success-checkmark"
                    >✓</span
                >
            </form>
        </div>
    </div>
</template>

<style scoped>
.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    backdrop-filter: blur(15px);
}

.loading-spinner {
    width: 50px;
    height: 50px;
    border: 3px solid #ffffff;
    border-top: 3px solid var(--button-bg);
    border-radius: 50%;
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
.bang-editor {
    background-color: var(--container-bg);
    padding: 0 20px;
}

h2 {
    color: var(--header-text-color);
    margin-bottom: 20px;
}

.bang-list {
    list-style-type: none;
    padding: 0;
    margin-bottom: 20px;
}

.bang-list li {
    background-color: var(--input-bg);
    margin-bottom: 10px;
    padding: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 5px;
}

.bang-name {
    font-weight: bold;
    color: var(--header-text-color);
    width: 20%;
}

/* .bang-name,
.bang-url {
} */

/* .bang-name:hover,
.bang-url:hover {
    text-decoration: underline;
} */

.bang-url {
    color: var(--text-color);
    word-break: break-all;
    width: 60%;
    font-size: 12px;
    font-style: italic;
}

.bang-actions {
    display: flex;
    gap: 5px;
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

.icon-button:hover .edit-button svg {
    background-color: var(--button-hover-bg);
    fill: white;
}

.delete-button:hover {
    background-color: red;
    fill: white;
}

.add-bang-form {
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 10px;
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
    background-color: var(--input-focus-bg);
    border-radius: 5px;
}

button {
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    cursor: pointer;
    transition: background-color 0.3s;
}

button:hover {
    background-color: var(--button-hover-bg);
}

.fallback-search-engine {
    margin-top: 20px;
}

.fallback-search-engine h3 {
    color: var(--header-text-color);
    margin-bottom: 20px;
}

.fallback-form {
    display: flex;
    width: 100%;
    align-items: center;
}

.fallback-form input {
    flex-grow: 1;
    padding: 10px;
    border: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
}

.fallback-form input:focus {
    outline: none;
    background-color: var(--input-focus-bg);
}

.fallback-form button {
    padding: 10px 20px;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition: background-color 0.3s;
}

.fallback-form button:hover {
    background-color: var(--button-hover-bg);
}

.success-checkmark {
    color: #4caf50;
    font-size: 24px;
    margin-left: 10px;
    animation: fadeInOut 3s ease-in-out;
}

@keyframes fadeInOut {
    0%,
    100% {
        opacity: 0;
    }
    50% {
        opacity: 1;
    }
}
</style>
