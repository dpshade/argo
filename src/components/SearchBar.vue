<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { walletManager } from "../helpers/walletManager";
import { defaultBangs } from "../defaults";

const props = defineProps({
    customBangs: {
        type: Array,
        default: () => [],
    },
    isWalletConnected: {
        type: Boolean,
        default: false,
    },
});

const query = ref("");
const emit = defineEmits(["search"]);
const searchInput = ref(null);
const showSuggestions = ref(true);
const arnsDomains = ref([]);
const hoveredIndex = ref(0);
const lastKeyboardHoveredIndex = ref(0);
const suggestionsRef = ref(null);
const forceFallbackEnabled = ref(false);
const isFullScreen = ref(false);
const isInputFocused = ref(false);
const isMouseHovering = ref(false);

function formatUrl(url, maxLength = 30) {
    let formatted = url

        .replace(/^(https?:\/\/)?(www\.)?/, "")

        .replace(/\/$/, "");
    return formatted.length > maxLength
        ? formatted.substring(0, maxLength - 3) + "..."
        : formatted;
}

const arnsSuggestionsComp = computed(() => {
    if (query.value.length <= 1) return [];

    const lowerQuery = query.value.toLowerCase();
    const filteredDomains = arnsDomains.value
        .filter((domain) => domain.toLowerCase().includes(lowerQuery))
        .map((domain) => ({
            text: domain,
            description: `ArNS domain`,
            formattedUrl: formatUrl(`https://${domain}.ar.io`),
            type: "arns",
        }));

    const exactMatch = filteredDomains.find(
        (suggestion) => suggestion.text.toLowerCase() === lowerQuery,
    );

    if (exactMatch) {
        filteredDomains.splice(filteredDomains.indexOf(exactMatch), 1);
        filteredDomains.unshift(exactMatch);
    }

    return filteredDomains.slice(0, 5);
});

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
        {
            text: "!raw",
            description: "Open raw tx data (paste clipboard)",
            url: "https://arweave.net/raw/",
            type: "rawTx",
        },
    ].map((suggestion) => ({
        ...suggestion,
        formattedUrl: suggestion.url ? formatUrl(suggestion.url) : null,
    }));

    const bangs = props.isWalletConnected ? props.customBangs : defaultBangs;
    const customBangSuggestions = bangs.map((bang) => ({
        text: `${bang.name}`,
        description: `Search ${bang.name}`,
        formattedUrl: formatUrl(bang.url),
        type: "bang",
    }));

    const arnsSuggestions = arnsSuggestionsComp.value;

    let allSuggestions = [];

    if (
        !query.value ||
        (query.value.length >= 43 &&
            query.value.length <= 44 &&
            !query.value.includes(" "))
    ) {
        // For empty query or potential transaction IDs, include txSuggestions in normal order
        allSuggestions = [
            ...txSuggestions,
            ...customBangSuggestions,
            ...arnsSuggestions,
        ];
    } else {
        // For all other cases, put txSuggestions at the bottom
        allSuggestions = [
            ...customBangSuggestions,
            ...arnsSuggestions,
            ...txSuggestions,
        ];
    }

    if (query.value.length === 43 || query.value.length === 44) {
        return txSuggestions;
    }

    if (!query.value) return allSuggestions;

    const matchingBangs = customBangSuggestions.filter((bang) => {
        const bangText = bang.text.toLowerCase();
        const queryLower = query.value.toLowerCase();
        return queryLower === bangText || queryLower.startsWith(bangText + " ");
    });

    const filterSuggestion = (suggestion) =>
        [suggestion.text, suggestion.description, suggestion.formattedUrl]
            .filter(Boolean)
            .some((field) =>
                field.toLowerCase().includes(query.value.toLowerCase()),
            );

    const filteredSuggestions = allSuggestions.filter(filterSuggestion);

    const exactMatches = filteredSuggestions.filter(
        (suggestion) =>
            ["bang", "arns"].includes(suggestion.type) &&
            suggestion.text.toLowerCase() === query.value.toLowerCase(),
    );

    const otherSuggestions = filteredSuggestions.filter(
        (suggestion) => !exactMatches.includes(suggestion),
    );

    return [
        ...exactMatches,
        ...otherSuggestions.filter(
            (suggestion) =>
                !matchingBangs.some((bang) => bang.text === suggestion.text),
        ),
    ];
});

const suggestions = computed(() => {
    const filtered = filteredSuggestions.value;
    if (filtered.length > 0 && !isMouseHovering.value)
        hoveredIndex.value = lastKeyboardHoveredIndex.value;

    return filtered;
});

function onSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.value.trim();

    if (forceFallbackEnabled.value) {
        emit("search", trimmedQuery, true);
    } else if (suggestions.value.length > 0 && !trimmedQuery.includes(" ")) {
        const selectedSuggestion = suggestions.value[hoveredIndex.value];
        switch (selectedSuggestion.type) {
            case "arns":
                window.open(
                    `https://${selectedSuggestion.text}.ar.io`,
                    "_blank",
                );
                query.value = "";
                showSuggestions.value = false;
                return;
            case "bang":
                handleBangSearch(selectedSuggestion.text);
                return;
            case "tx":
                pasteFromClipboard();
                return;
            case "txData":
                pasteFromClipboard("!");
                return;
            case "rawTx":
                pasteFromClipboard("!raw ");
                return;
        }
    }

    const bangMatch = trimmedQuery.match(/^!(\w+)(\s+(.*))?$/);
    if (bangMatch) {
        const [, bangName, , searchQuery] = bangMatch;
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
        emit("search", trimmedQuery, false);
    } else {
        emit("search", trimmedQuery, false);
    }

    query.value = "";
    showSuggestions.value = false;
    forceFallbackEnabled.value = false;
    exitFullScreen();
}

function onKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        lastKeyboardHoveredIndex.value =
            (lastKeyboardHoveredIndex.value +
                direction +
                suggestions.value.length) %
            suggestions.value.length;
        hoveredIndex.value = lastKeyboardHoveredIndex.value;
        isMouseHovering.value = false;
        scrollSuggestionIntoView();
    } else if (event.key === "Enter" && hoveredIndex.value !== -1) {
        event.preventDefault();
        onSubmit(event);
    } else if (event.key === "Escape") {
        event.preventDefault();
        forceFallbackEnabled.value = true;
        showSuggestions.value = false;
        exitFullScreen();
        console.log("Force fallback enabled");
    } else if (event.key !== "Enter") {
        forceFallbackEnabled.value = false;
        console.log("Force fallback disabled");
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

const onInputFocus = () => {
    showSuggestions.value = true;
    isFullScreen.value = true;
    isInputFocused.value = true;
};

const onInputBlur = () => {
    showSuggestions.value = false;
    isFullScreen.value = false;
    isInputFocused.value = false;
};

function selectSuggestion(suggestion) {
    console.log("Selecting suggestion:", suggestion);
    const { type, text } = suggestion;
    const currentQuery = query.value;

    if (type === "bang") {
        console.log("Current query:", currentQuery);
        console.log("Bang name:", text);

        if (currentQuery === text) {
            console.log("Performing bang search with bang name only");
            handleBangSearch(text);
        } else if (currentQuery === "") {
            console.log("Setting bang and focusing input");
            query.value = text + " ";
            showSuggestions.value = false;
            searchInput.value.focus();
        } else {
            console.log("Performing bang search with additional text");
            const searchQuery = currentQuery.replace(
                new RegExp(`^${text}\\s*`),
                "",
            );
            handleBangSearch(text, searchQuery);
        }
    } else if (type === "arns") {
        console.log("Opening ArNS domain:", text);
        window.open(`https://${text}.ar.io`, "_blank");
    } else if (type === "tx") {
        console.log("Pasting from clipboard for tx");
        pasteFromClipboard();
    } else if (type === "txData") {
        console.log("Pasting from clipboard for txData");
        pasteFromClipboard("!");
    } else if (type === "rawTx") {
        console.log("Pasting from clipboard for rawTx");
        pasteFromClipboard("!raw ");
    }
}

function handleBangSearch(bangName, searchQuery = "") {
    console.log("Handling bang search:", bangName, searchQuery);
    const bangs = props.isWalletConnected ? props.customBangs : defaultBangs;
    const bang = bangs.find((b) => b.name === bangName);
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
            query.value = "";
            showSuggestions.value = false;
        } else {
            console.log("Setting bang in input");
            query.value = `${bangName} `;
            searchInput.value.focus();
        }
    } else if (bangName === "raw") {
        const url = `https://arweave.net/raw/${searchQuery}`;
        console.log("Opening URL:", url);
        window.open(url, "_blank");
        query.value = "";
        showSuggestions.value = false;
    } else {
        console.log("No matching bang found for:", bangName);
    }
}

async function pasteFromClipboard(prefix = "") {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (query.value.length === 43 || query.value.length === 44) {
            emit("search", query.value, false, props.isWalletConnected);
            query.value = "";
        }

        query.value = prefix + clipboardText.trim();
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
    }
}

function exitFullScreen() {
    isFullScreen.value = false;
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
        lastKeyboardHoveredIndex.value = 0;
        forceFallbackEnabled.value = false;
    },
    { immediate: true },
);

defineExpose({ focusInput });
</script>
<template>
    <form
        @submit="onSubmit"
        class="search-bar"
        :class="{ 'full-screen': isFullScreen }"
    >
        <div
            class="input-wrapper"
            :class="{
                'with-suggestions': showSuggestions && suggestions.length > 0,
            }"
        >
            <button
                v-if="isFullScreen"
                type="button"
                class="back-button"
                @click="exitFullScreen"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="24"
                    height="24"
                >
                    <path
                        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
                    />
                </svg>
            </button>
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
            :class="{ visible: showSuggestions && suggestions.length > 0 }"
        >
            <div class="suggestions" ref="suggestionsRef">
                <div
                    v-for="(suggestion, index) in suggestions"
                    :key="index"
                    class="suggestion"
                    :class="{ hovered: index === hoveredIndex }"
                    @mousedown="selectSuggestion(suggestion)"
                    @mouseover="
                        hoveredIndex = index;
                        isMouseHovering = true;
                    "
                    @mouseleave="
                        isMouseHovering = false;
                        hoveredIndex = lastKeyboardHoveredIndex;
                    "
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
/* Common styles */
.search-bar,
.input-wrapper,
.suggestion,
.suggestion-info {
    display: flex;
}

.search-bar {
    flex-direction: column;
    width: 100%;
    max-width: 600px;
    margin: 15px 0 1rem;
    position: relative;
}

.input-wrapper {
    width: 100%;
}

/* Input styles */
input,
button[type="submit"] {
    font-size: 1rem;
    border: none;
}

input {
    flex-grow: 1;
    padding: 0.6rem 1rem;
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

/* Button styles */
button[type="submit"] {
    padding: 0.5rem 1rem;
    background-color: var(--button-bg);
    color: white;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition:
        background-color 0.3s,
        border-radius 0.3s ease;
    min-width: 80px;
}

button.with-suggestions {
    border-radius: 0 5px 0 0;
}

button:hover {
    background-color: var(--button-hover-bg);
}

/* Suggestions styles */
.suggestions-wrapper {
    transition:
        opacity 0.1s ease-out,
        visibility 0.1s ease-out;
    opacity: 0;
    visibility: hidden;
}

.suggestions-wrapper.visible {
    opacity: 1;
    visibility: visible;
}

.suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--input-focus-bg);
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
    justify-content: space-between;
    align-items: center;
}

.suggestion.hovered,
.suggestion:hover {
    background-color: var(--button-bg);
}

.suggestion.hovered,
.suggestion:hover {
    & strong,
    .description,
    .url {
        color: white;
    }
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

.back-button {
    display: none;
}

@media screen and (max-width: 768px) {
    .search-bar {
        width: 100%;
    }

    .search-bar.full-screen {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        background-color: var(--input-bg);
        margin: 0;
        padding: 0;
        max-width: none;
        display: flex;
        flex-direction: column;
    }

    .full-screen {
        .input-wrapper {
            flex-direction: row;
            align-items: center;
        }

        .back-button {
            display: block;
            background: none;
            border: none;
            cursor: pointer;
            background-color: var(--input-focus-bg);
            padding: 40px 16px;
            min-width: auto;
            width: 15%;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 44px;

            svg {
                fill: var(--button-bg);
            }
        }

        input {
            flex-grow: 1;
            font-size: 1.5rem;
            border-radius: 0;
            padding: 1.15rem 0rem;
        }

        button[type="submit"] {
            display: none;
        }

        .suggestions-wrapper {
            flex-grow: 1;
            overflow-y: auto;
        }

        .suggestions {
            position: static;
            max-height: none;
            border-radius: 0;
        }

        .suggestion {
            padding: 15px;
            font-size: 1.2rem;
        }

        .suggestion .description {
            width: 100vw;
            font-size: 1rem;
        }

        .suggestion .url {
            font-size: 0.9rem;
        }
    }

    .input-wrapper {
        flex-direction: row;
    }

    input {
        font-size: 12px;
    }

    .full-screen input.with-suggestions {
        padding: 26px 26px 26px 0;
    }

    button.back-button {
        border-radius: 0;
    }

    .suggestions-wrapper {
        background-color: var(--input-focus-bg);
        order: 1;
    }

    .suggestions {
        position: static;
        border-radius: 0 0 5px 5px;
        border-top: none;
    }

    .suggestion-info {
        max-width: 60%;
    }
}
</style>
