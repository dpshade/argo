<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { walletManager } from "../helpers/walletManager";

const props = defineProps({
    customBangs: {
        type: Array,
        default: () => [],
    },
});

const query = ref("");
const emit = defineEmits(["search"]);
const searchInput = ref(null);
const showSuggestions = ref(false);
const arnsDomains = ref([]);
const hoveredIndex = ref(0);

function formatUrl(url, maxLength = 30) {
    let formatted = url
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "");
    if (formatted.length > maxLength) {
        return formatted.substring(0, maxLength - 3) + "...";
    }
    return formatted;
}

const filteredSuggestions = computed(() => {
    const globalSuggestions = [
        {
            text: "tx",
            description: "Search Arweave explorer for transaction",
            url: "https://ao.link/#/message/tx/",
            type: "tx",
        },
        {
            text: "!tx",
            description: "View transaction data",
            url: "https://arweave.net/tx/",
            type: "txData",
        },
    ].map((suggestion) => ({
        ...suggestion,
        formattedUrl: suggestion.url ? formatUrl(suggestion.url) : null,
    }));

    const customBangSuggestions = props.customBangs.map((bang) => ({
        text: `${bang.name}`,
        description: `Custom: Search using ${bang.name}`,
        formattedUrl: formatUrl(bang.url),
        type: "bang",
    }));

    const arnsSuggestions =
        query.value.length > 1
            ? arnsDomains.value.map((domain) => ({
                  text: domain,
                  description: `ArNS domain: ${domain}`,
                  formattedUrl: formatUrl(`https://${domain}.ar.io`),
                  type: "arns",
              }))
            : [];

    const allSuggestions = [
        ...globalSuggestions,
        ...customBangSuggestions,
        ...arnsSuggestions,
    ];

    if (query.value.length === 43 || query.value.length === 44) {
        return globalSuggestions;
    }

    if (!query.value) return allSuggestions;

    return allSuggestions.filter(
        (suggestion) =>
            suggestion.text.toLowerCase().includes(query.value.toLowerCase()) ||
            suggestion.description
                .toLowerCase()
                .includes(query.value.toLowerCase()) ||
            (suggestion.formattedUrl &&
                suggestion.formattedUrl
                    .toLowerCase()
                    .includes(query.value.toLowerCase())),
    );
});

const suggestions = computed(() => {
    const filtered = filteredSuggestions.value;
    if (filtered.length > 0) {
        hoveredIndex.value = 0;
    }
    return filtered;
});

function onSubmit(event) {
    event.preventDefault();
    if (suggestions.value.length > 0) {
        const firstSuggestion = suggestions.value[0];
        if (firstSuggestion.type === "arns") {
            window.open(`https://${firstSuggestion.text}.ar.io`, "_blank");
            query.value = "";
            showSuggestions.value = false;
            return;
        }
    }

    if (
        suggestions.value.length > 0 &&
        suggestions.value[hoveredIndex.value].type === "arns"
    ) {
        const arnsUrl = `${suggestions.value[hoveredIndex.value].text}`;
        emit("search", arnsUrl);
    } else {
        emit("search", query.value);
    }
    query.value = "";
    showSuggestions.value = false;
}

function onKeyDown(event) {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        hoveredIndex.value =
            (hoveredIndex.value + 1) % suggestions.value.length;
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        hoveredIndex.value =
            (hoveredIndex.value - 1 + suggestions.value.length) %
            suggestions.value.length;
    }
}

function focusInput() {
    if (searchInput.value) {
        searchInput.value.focus();
    }
}

function onInputFocus() {
    showSuggestions.value = true;
}

function onInputBlur() {
    setTimeout(() => {
        showSuggestions.value = false;
    }, 200);
}

function selectSuggestion(suggestion) {
    query.value = suggestion.text;
    if (suggestion.type === "arns") {
        window.open(`https://${suggestion.text}.ar.io`, "_blank");
    } else {
        emit("search", suggestion.text);
    }
    showSuggestions.value = false;
    searchInput.value.focus();
}

onMounted(async () => {
    focusInput();
    try {
        arnsDomains.value = await walletManager.dryRunAllArns();
    } catch (error) {
        console.error("Failed to load ArNS domains:", error);
    }
});

watch(query, () => {
    showSuggestions.value = query.value.length > 0;
});

defineExpose({ focusInput });
</script>

<template>
    <form @submit="onSubmit" class="search-bar">
        <div
            class="input-wrapper"
            :class="{
                'with-suggestions': showSuggestions && suggestions.length > 0,
            }"
        >
            <input
                ref="searchInput"
                type="text"
                v-model="query"
                placeholder="Search, bang, or ArNS domain..."
                required
                @focus="onInputFocus"
                @blur="onInputBlur"
                @keydown="onKeyDown"
                :class="{
                    'with-suggestions':
                        showSuggestions && suggestions.length > 0,
                }"
            />
            <button
                type="submit"
                :class="{
                    'with-suggestions':
                        showSuggestions && suggestions.length > 0,
                }"
            >
                Search
            </button>
        </div>
        <div
            v-if="showSuggestions && suggestions.length > 0"
            class="suggestions-wrapper"
        >
            <div class="suggestions">
                <div
                    v-for="(suggestion, index) in suggestions"
                    :key="index"
                    class="suggestion"
                    :class="{ hovered: index === hoveredIndex }"
                    @mousedown="selectSuggestion(suggestion)"
                    @mouseover="hoveredIndex = index"
                >
                    <strong
                        :class="{ 'arns-name': suggestion.type === 'arns' }"
                        >{{ suggestion.text }}</strong
                    >
                    <div class="suggestion-info">
                        <span class="description">{{
                            suggestion.description
                        }}</span>
                        <span v-if="suggestion.formattedUrl" class="url">{{
                            suggestion.formattedUrl
                        }}</span>
                    </div>
                </div>
            </div>
        </div>
    </form>
</template>

<style scoped>
.search-bar {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 600px;
    margin-bottom: 1rem;
    margin-top: 15px;
    position: relative;
}

.input-wrapper {
    display: flex;
    width: 100%;
}

input {
    flex-grow: 1;
    padding: 0.6rem 1rem;
    font-size: 1rem;
    border: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
    transition: border-radius 0.3s ease;
}

input.with-suggestions {
    border-radius: 5px 0 0 0;
}

input:focus {
    outline: none;
    background-color: var(--input-focus-bg);
}

button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition:
        background-color 0.3s,
        border-radius 0.3s ease;
    height: 44px;
    min-width: 80px;
}

button.with-suggestions {
    border-radius: 0 5px 0 0;
}

button:hover {
    background-color: var(--button-hover-bg);
}

.suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--input-focus-bg);
    border: 1px solid var(--border-color);
    border-top: none;
    border-radius: 0 0 5px 5px;
    max-height: 200px;
    overflow-y: auto;
    overflow-x: hidden;
    z-index: 10;
}

.suggestion {
    padding: 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.suggestion.hovered {
    background-color: var(--input-focus-bg);
}

.suggestion strong {
    color: var(--text-color);
    padding: 2px 4px;
    border-radius: 3px;
}

.suggestion strong.arns-name {
    max-width: 150px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: inline-block;
}

.suggestion-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    max-width: 60%;
}

.suggestion .description {
    color: var(--placeholder-color);
    font-size: 0.9em;
    text-align: right;
    margin-bottom: 2px;
}

.suggestion .url {
    color: var(--url-color, #8a8a8a);
    font-size: 0.8em;
    text-align: right;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: inline-block;
}

@media screen and (max-width: 768px) {
    .search-bar {
        width: 95%;
    }

    .input-wrapper {
        flex-direction: column;
        order: 2; /* Move input wrapper below suggestions */
    }

    input {
        border-radius: 5px 5px 0 0;
        font-size: 16px;
    }

    input.with-suggestions {
        border-radius: 0;
    }

    button {
        border-radius: 0 0 5px 5px;
        width: 100%;
    }

    button.with-suggestions {
        border-radius: 0 0 5px 5px;
    }

    .suggestions-wrapper {
        order: 1; /* Move suggestions above input wrapper */
    }

    .suggestions {
        position: static;
        border-radius: 5px 5px 0 0;
        border: 1px solid var(--border-color);
        border-bottom: none;
    }

    .suggestion-info {
        max-width: 50%;
    }
}
</style>
