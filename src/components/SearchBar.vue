<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
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
const showSuggestions = ref(true);
const arnsDomains = ref([]);
const hoveredIndex = ref(0);
const suggestionsRef = ref(null);

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
    const txSuggestions = [
        {
            text: "tx",
            description: "Open in tx explorer (paste clipboard)",
            url: "https://ao.link/#/message/tx/",
            type: "tx",
        },
        {
            text: "!tx",
            description: "Open tx data (paste clipboard)",
            url: "https://arweave.net/tx/",
            type: "txData",
        },
    ].map((suggestion) => ({
        ...suggestion,
        formattedUrl: suggestion.url ? formatUrl(suggestion.url) : null,
    }));

    const customBangSuggestions = props.customBangs.map((bang) => ({
        text: `${bang.name}`,
        description: `Search ${bang.name}`,
        formattedUrl: formatUrl(bang.url),
        type: "bang",
    }));

    const arnsSuggestions =
        query.value.length > 1
            ? arnsDomains.value.map((domain) => ({
                  text: domain,
                  description: `ArNS domain`,
                  formattedUrl: formatUrl(`https://${domain}.ar.io`),
                  type: "arns",
              }))
            : [];

    let allSuggestions = [...customBangSuggestions, ...arnsSuggestions];

    // Reorder txSuggestions based on the presence of "!" in the query
    if (query.value.includes("!")) {
        allSuggestions = [...txSuggestions.reverse(), ...allSuggestions];
    } else {
        allSuggestions = [...txSuggestions, ...allSuggestions];
    }

    if (query.value.length === 43 || query.value.length === 44) {
        return txSuggestions;
    }

    if (!query.value) return allSuggestions;

    const matchingBangs = customBangSuggestions.filter((bang) => {
        const bangText = bang.text.toLowerCase();
        const queryLower = query.value.toLowerCase();
        return (
            queryLower === bangText ||
            queryLower.startsWith(bangText + " ") ||
            queryLower.endsWith(" " + bangText) ||
            queryLower.includes(" " + bangText + " ")
        );
    });
    const isBangQuery = matchingBangs.length > 0;

    if (isBangQuery) {
        // If it's a bang query, show matching bang suggestions and global suggestions
        return [...matchingBangs];
    } else {
        // If it's not a bang query, use the existing filter logic
        return allSuggestions.filter(
            (suggestion) =>
                suggestion.text
                    .toLowerCase()
                    .includes(query.value.toLowerCase()) ||
                suggestion.description
                    .toLowerCase()
                    .includes(query.value.toLowerCase()) ||
                (suggestion.formattedUrl &&
                    suggestion.formattedUrl
                        .toLowerCase()
                        .includes(query.value.toLowerCase())),
        );
    }
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
    const trimmedQuery = query.value.trim();

    if (suggestions.value.length > 0 && !trimmedQuery.includes(" ")) {
        const selectedSuggestion = suggestions.value[hoveredIndex.value];
        if (selectedSuggestion.type === "arns") {
            window.open(`https://${selectedSuggestion.text}.ar.io`, "_blank");
            query.value = "";
            showSuggestions.value = false;
            return;
        }
        if (selectedSuggestion.type === "bang") {
            handleBangSearch(selectedSuggestion.text);
            return;
        }
        if (selectedSuggestion.type === "tx") {
            pasteFromClipboard();
            return;
        }
        if (selectedSuggestion.type === "txData") {
            pasteFromClipboard("!");
            return;
        }
    }

    const bangMatch = trimmedQuery.match(/^!(\w+)(\s+(.*))?$/);
    if (bangMatch) {
        const bangName = bangMatch[1];
        const searchQuery = bangMatch[3] || "";
        const spaceAfterBang = bangMatch[2] ? bangMatch[2][0] : "";
        if (searchQuery || trimmedQuery === `!${bangName}${spaceAfterBang}`) {
            handleBangSearch(bangName, searchQuery);
        } else {
            query.value = `!${bangName}${spaceAfterBang}`;
            searchInput.value.focus();
            return;
        }
    } else if (
        !trimmedQuery.includes(" ") &&
        trimmedQuery.length !== 43 &&
        trimmedQuery.length !== 44
    ) {
        emit("search", trimmedQuery + " ");
    } else {
        emit("search", trimmedQuery);
    }

    query.value = "";
    showSuggestions.value = false;
}

function onKeyDown(event) {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        hoveredIndex.value =
            (hoveredIndex.value + 1) % suggestions.value.length;
        scrollSuggestionIntoView();
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        hoveredIndex.value =
            (hoveredIndex.value - 1 + suggestions.value.length) %
            suggestions.value.length;
        scrollSuggestionIntoView();
    } else if (event.key === "Enter" && hoveredIndex.value !== -1) {
        event.preventDefault();
        onSubmit(event);
    }
}

function scrollSuggestionIntoView() {
    nextTick(() => {
        const suggestionElements =
            suggestionsRef.value.querySelectorAll(".suggestion");
        if (suggestionElements[hoveredIndex.value]) {
            suggestionElements[hoveredIndex.value].scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }
    });
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
    console.log("Selecting suggestion:", suggestion);
    if (suggestion.type === "bang") {
        const currentQuery = query.value;
        const bangName = suggestion.text;

        console.log("Current query:", currentQuery);
        console.log("Bang name:", bangName);

        if (currentQuery === bangName) {
            // If the query is just the bang name or bang name with a space, perform the search
            console.log("Performing bang search with bang name only");
            handleBangSearch(bangName);
        } else if (currentQuery === "") {
            // If the query is empty, set the bang and focus
            console.log("Setting bang and focusing input");
            query.value = bangName + " ";
            showSuggestions.value = false;
            searchInput.value.focus();
        } else {
            // If there's additional text, perform the search
            console.log("Performing bang search with additional text");
            const searchQuery = currentQuery.replace(
                new RegExp(`^${bangName}\\s*`),
                "",
            );
            handleBangSearch(bangName, searchQuery);
        }
    } else if (suggestion.type === "arns") {
        console.log("Opening ArNS domain:", suggestion.text);
        window.open(`https://${suggestion.text}.ar.io`, "_blank");
    } else if (suggestion.type === "tx") {
        console.log("Pasting from clipboard for tx");
        pasteFromClipboard();
    } else if (suggestion.type === "txData") {
        console.log("Pasting from clipboard for txData");
        pasteFromClipboard("!");
    }
}

function handleBangSearch(bangName, searchQuery = "") {
    console.log("Handling bang search:", bangName, searchQuery);
    const bang = props.customBangs.find((b) => b.name === bangName);
    if (bang) {
        console.log("Found matching bang:", bang);
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery || bangName + " " === query.value) {
            console.log("Performing search with query");
            const url = bang.url.replace(
                "%s",
                encodeURIComponent(trimmedQuery),
            );
            console.log("Opening URL:", url);
            window.open(url, "_blank");
            query.value = ""; // Clear the input after search
            showSuggestions.value = false;
        } else {
            // If there's no search query, just set the bang in the input
            console.log("Setting bang in input");
            query.value = `${bangName} `;
            searchInput.value.focus();
        }
    } else {
        console.log("No matching bang found for:", bangName);
    }
}

async function pasteFromClipboard(prefix = "") {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (query.value.length == 43 || query.value.length == 44) {
            emit("search", query.value);
            query.value = "";
        }

        query.value = prefix + clipboardText.trim();
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
    }
}

onMounted(async () => {
    focusInput();
    try {
        arnsDomains.value = await walletManager.dryRunAllArns();
    } catch (error) {
        console.error("Failed to load ArNS domains:", error);
    }
});

watch(
    query,
    () => {
        showSuggestions.value = true;
        hoveredIndex.value = 0;
    },
    { immediate: true },
);

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
            <div class="suggestions" ref="suggestionsRef">
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
    /* border: 1px solid var(--border-color); */
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

.suggestion.hovered,
.suggestion:hover {
    background-color: var(--button-bg);
}

.suggestion.hovered strong,
.suggestion:hover strong,
.suggestion.hovered .description,
.suggestion:hover .description,
.suggestion.hovered .url,
.suggestion:hover .url {
    color: white;
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
    font-weight: bold;
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
        border-bottom: none;
    }

    .suggestion-info {
        max-width: 50%;
    }
}
</style>
