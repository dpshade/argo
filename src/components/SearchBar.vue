<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { debounce } from "lodash";
import { ARIO } from "@ar.io/sdk/web";
import { connect } from "@permaweb/aoconnect";
import {
    Wayfinder,
    FastestPingRoutingStrategy,
    NetworkGatewaysProvider,
} from "@ar.io/wayfinder-core";
import { initializeDocs, searchDocs } from "../helpers/docsModule";
import { initializeGlossary, searchGlossary } from "../helpers/glossaryModule";

// No props needed - we use hardcoded special shortcuts

const query = ref("");
const emit = defineEmits(["search"]);
const searchInput = ref(null);
const showSuggestions = ref(true);
const arnsDomains = ref([]);
const hoveredIndex = ref(0);
const lastKeyboardHoveredIndex = ref(0);
const suggestionsRef = ref(null);
const isFullScreen = ref(false);
const isInputFocused = ref(false);
const isMouseHovering = ref(false);
const isKeyboardNavigating = ref(false);
const isMobile = ref(window.innerWidth <= 768);
const arnsProcessIds = ref({});
const arnsUndernameSuggestions = ref([]);
const lastFetchedArnsName = ref(null);
const isLoadingUndernames = ref(false);
const hoveredArnsName = ref(null);
const displayedUnderamesForArns = ref(null); // Track which ArNS has undernames displayed
const lastDisplayedUndernamesCount = ref(0); // Track how many undernames were last displayed
let undernamesFetchTimeout = null; // For debouncing undername fetches
const optimalGateway = ref("ar.io"); // Default gateway, will be updated by Wayfinder
const docsSuggestions = ref([]);
const showGlossaryModal = ref(false);
const selectedGlossaryTerm = ref(null);

// Search modes
const searchMode = ref("all");
const showModeModal = ref(false);
const searchModes = [
    { id: "all", label: "All" },
    { id: "arweave", label: "Arweave" },
    { id: "arns", label: "ArNS" },
    { id: "docs", label: "Docs" },
    { id: "glossary", label: "Glossary" },
];

function toggleModeModal() {
    showModeModal.value = !showModeModal.value;
}

function selectMode(modeId) {
    searchMode.value = modeId;
    showModeModal.value = false;
}

const formatUrl = (url, maxLength = 30) => {
    const formatted = url
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "");
    return formatted.length > maxLength
        ? `${formatted.substring(0, maxLength - 3)}...`
        : formatted;
};

const glossarySuggestionsComp = computed(() => {
    if (query.value.length <= 2) return [];

    const results = searchGlossary(query.value, 10); // Get more results for merging
    return results.map((term) => ({
        text: term.term,
        description: term.category || "Glossary Term",
        type: "glossary",
        termData: term, // Store full term data for modal
        score: term.score, // Preserve score for sorting
    }));
});

const docsSuggestionsComp = computed(() => {
    if (query.value.length <= 2) return [];

    const results = searchDocs(query.value, 10); // Get more results for merging

    // Group results by title to detect duplicates
    const titleCounts = {};
    results.forEach((doc) => {
        titleCounts[doc.title] = (titleCounts[doc.title] || 0) + 1;
    });

    return results.map((doc) => {
        let description = doc.siteName;

        // If title appears multiple times, add breadcrumbs or URL context
        if (titleCounts[doc.title] > 1) {
            if (doc.breadcrumbs && doc.breadcrumbs.length > 0) {
                // Use breadcrumbs for context (last 2 breadcrumbs if available)
                const contextBreadcrumbs = doc.breadcrumbs
                    .slice(-2)
                    .join(" › ");
                description = `${doc.siteName} › ${contextBreadcrumbs}`;
            } else {
                // Fallback to URL path if no breadcrumbs
                const urlPath = new URL(doc.url).pathname
                    .split("/")
                    .filter(Boolean)
                    .slice(-2)
                    .join(" › ");
                if (urlPath) {
                    description = `${doc.siteName} › ${urlPath}`;
                }
            }
        }

        return {
            text: doc.title,
            description: description,
            formattedUrl: formatUrl(doc.url),
            fullUrl: doc.url,
            type: "docs",
            score: doc.score, // Preserve score for sorting
        };
    });
});

const arnsSuggestionsComp = computed(() => {
    if (query.value.length <= 1) return [];

    const lowerQuery = query.value.toLowerCase();
    const filteredDomains = arnsDomains.value
        .filter((domain) => domain.toLowerCase().includes(lowerQuery))
        .map((domain) => ({
            text: domain,
            description: `ArNS domain`,
            formattedUrl: formatUrl(
                `https://${domain}.${optimalGateway.value}`,
            ),
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

// Check if query is a valid TX ID (43 chars, alphanumeric + - and _)
const isTxId = computed(() => {
    const q = query.value.trim();
    return q.length === 43 && /^[a-zA-Z0-9_-]+$/.test(q);
});

const filteredSuggestions = computed(() => {
    const queryLower = query.value.toLowerCase().trim();

    // Only show special shortcuts if it's a TX ID
    if (isTxId.value) {
        const txId = query.value.trim();
        return [
            {
                text: "viewblock.io",
                description: `viewblock.io/arweave/tx/${txId.substring(0, 8)}...`,
                fullUrl: `https://viewblock.io/arweave/tx/${txId}`,
                shortcut: "tx",
                type: "shortcut",
            },
            {
                text: "arweave.net",
                description: `arweave.net/${txId.substring(0, 8)}...`,
                fullUrl: `https://arweave.net/${txId}`,
                shortcut: "data",
                type: "shortcut",
            },
            {
                text: "arweave.net/raw",
                description: `arweave.net/raw/${txId.substring(0, 8)}...`,
                fullUrl: `https://arweave.net/raw/${txId}`,
                shortcut: "raw",
                type: "shortcut",
            },
            {
                text: "ao.link",
                description: `ao.link/#/message/${txId.substring(0, 8)}...`,
                fullUrl: `https://ao.link/#/message/${txId}`,
                shortcut: "msg",
                type: "shortcut",
            },
        ];
    }

    // Combine ArNS, glossary, and docs suggestions
    const arns = arnsSuggestionsComp.value;
    const glossary = glossarySuggestionsComp.value;
    const docs = docsSuggestionsComp.value;

    // Merge glossary and docs by relevance score (interleave them)
    const mergedDocsGlossary = [...glossary, ...docs]
        .sort((a, b) => b.score - a.score) // Sort by score descending
        .slice(0, 5); // Limit to top 5 results

    // Priority order: ArNS first, then merged docs/glossary by relevance
    return [...arns, ...mergedDocsGlossary];
});

const suggestions = computed(() => {
    let filtered = filteredSuggestions.value;

    // Filter by search mode
    if (searchMode.value !== "all") {
        filtered = filtered.filter((suggestion) => {
            switch (searchMode.value) {
                case "arweave":
                    return ["tx", "txData", "rawTx", "shortcut"].includes(
                        suggestion.type,
                    );
                case "arns":
                    return ["arns", "arns_undername"].includes(suggestion.type);
                case "docs":
                    return suggestion.type === "docs";
                case "glossary":
                    return suggestion.type === "glossary";
                default:
                    return true;
            }
        });
    }

    // Insert undernames directly after each ArNS suggestion
    const result = [];
    for (let i = 0; i < filtered.length; i++) {
        const suggestion = filtered[i];
        result.push(suggestion);

        // If this is an ArNS suggestion, insert its undernames immediately after
        if (suggestion.type === "arns") {
            // Show undernames if they exist for this ArNS and we should display them
            if (
                arnsUndernameSuggestions.value.length > 0 &&
                displayedUnderamesForArns.value === suggestion.text
            ) {
                result.push(...arnsUndernameSuggestions.value);
            }
        }
    }

    return result;
});

const handleSuggestionAction = {
    arns: (text) => {
        window.open(`https://${text}.${optimalGateway.value}`, "_blank");
        query.value = "";
        showSuggestions.value = false;
    },
    arns_undername: (text) => {
        const [undername, domain] = text.split("_");
        const url = `https://${undername}_${domain}.${optimalGateway.value}`;
        console.log("Opening ArNS undername URL:", url);
        window.open(url, "_blank");
        query.value = "";
        showSuggestions.value = false;
    },
    shortcut: (suggestion) => {
        const url = suggestion.fullUrl;
        if (url) {
            console.log(`Opening shortcut:`, url);
            window.open(url, "_blank");
            query.value = "";
            showSuggestions.value = false;
        }
    },
    docs: (suggestion) => {
        const url = suggestion.fullUrl;
        if (url) {
            console.log(`Opening docs:`, url);
            window.open(url, "_blank");
            query.value = "";
            showSuggestions.value = false;
        }
    },
    glossary: (suggestion) => {
        console.log("Opening glossary term:", suggestion.termData);
        selectedGlossaryTerm.value = suggestion.termData;
        showGlossaryModal.value = true;
        query.value = "";
        showSuggestions.value = false;
    },
};

async function onSubmit(event) {
    event.preventDefault();
    const trimmedQuery = query.value.trim();

    // If there are suggestions, use the selected one
    if (suggestions.value.length > 0) {
        const selectedSuggestion =
            suggestions.value[isMobile.value ? 0 : hoveredIndex.value];
        const action = handleSuggestionAction[selectedSuggestion.type];
        if (action) {
            // Pass the full suggestion object for shortcuts, docs, and glossary, just text for others
            action(
                ["shortcut", "docs", "glossary"].includes(
                    selectedSuggestion.type,
                )
                    ? selectedSuggestion
                    : selectedSuggestion.text,
            );
            return;
        }
    }

    // Otherwise pass to parent search handler
    emit("search", trimmedQuery);

    query.value = "";
    showSuggestions.value = false;
    exitFullScreen();
}

function onKeyDown(event) {
    if (
        !isMobile.value &&
        (event.key === "ArrowDown" || event.key === "ArrowUp")
    ) {
        event.preventDefault();
        isKeyboardNavigating.value = true; // Enable keyboard mode
        const direction = event.key === "ArrowDown" ? 1 : -1;
        // Navigate through the full suggestions array (including undernames)
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
        showSuggestions.value = false;
        exitFullScreen();
    }
}

function scrollSuggestionIntoView() {
    nextTick(() => {
        const suggestionElements =
            suggestionsRef.value.querySelectorAll(".suggestion");
        if (suggestionElements[isMobile.value ? 0 : hoveredIndex.value]) {
            suggestionElements[
                isMobile.value ? 0 : hoveredIndex.value
            ].scrollIntoView({
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

const debouncedOnInputFocus = debounce(() => {
    showSuggestions.value = true;
    isFullScreen.value = true;
    isInputFocused.value = true;
    if (isMobile.value) {
        nextTick(() => {
            hoveredIndex.value = 0;
            scrollSuggestionIntoView();
        });
    }
}, 200);

const onInputTouchStart = (event) => {
    debouncedOnInputFocus();
    setTimeout(() => {
        requestAnimationFrame(() => {
            searchInput.value.focus();
            window.scrollTo(0, 0);
        });
    }, 150);
};

const onInputBlur = (event) => {
    // Don't close on blur - only close when clicking outside (handled by mousedown on suggestions)
    // This allows alt-tabbing without closing the results
    isInputFocused.value = false;
};

async function selectSuggestion(suggestion) {
    console.log("Selecting suggestion:", suggestion);
    const { type } = suggestion;

    const action = handleSuggestionAction[type];
    if (action) {
        // Pass the full suggestion object for shortcuts, docs, and glossary, just text for others
        action(
            ["shortcut", "docs", "glossary"].includes(type)
                ? suggestion
                : suggestion.text,
        );
    }
}

function handleBangSearch(bangName, searchQuery = "") {
    console.log("Handling bang search:", bangName, searchQuery);
    const bangs = props.customBangs;
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
            emit("search", query.value, false);
            query.value = "";
        }

        query.value = prefix + clipboardText.trim();
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
    }
}

function getTagLabel(type) {
    const tagMap = {
        arns: "ArNS",
        arns_undername: "Under_name",
        shortcut: "TxID",
        tx: "TxID",
        txData: "Data",
        rawTx: "Raw",
        docs: "Docs",
        glossary: "Glossary",
    };
    return tagMap[type] || type.toUpperCase();
}

function exitFullScreen() {
    isFullScreen.value = false;
}

function searchRelatedTerm(term) {
    showGlossaryModal.value = false;
    query.value = term;
    showSuggestions.value = true;
    nextTick(() => {
        focusInput();
    });
}

// Watch for suggestions array changes and clamp index when needed
watch(suggestions, (newSuggestions, oldSuggestions) => {
    // Only clamp if the array actually shrunk (e.g., undernames disappeared)
    if (newSuggestions.length < oldSuggestions?.length) {
        if (hoveredIndex.value >= newSuggestions.length) {
            hoveredIndex.value = Math.max(0, newSuggestions.length - 1);
            lastKeyboardHoveredIndex.value = hoveredIndex.value;
        }
    }
    // If array is empty, reset indices
    if (newSuggestions.length === 0) {
        hoveredIndex.value = 0;
        lastKeyboardHoveredIndex.value = 0;
    }
});

onMounted(async () => {
    focusInput();

    // Initialize docs and glossary modules
    initializeDocs().catch((error) => {
        console.error("Failed to initialize docs:", error);
    });
    initializeGlossary().catch((error) => {
        console.error("Failed to initialize glossary:", error);
    });

    // Add click outside handler to close suggestions
    const handleClickOutside = (event) => {
        const searchBar = document.querySelector(".search-bar");
        if (searchBar && !searchBar.contains(event.target)) {
            showSuggestions.value = false;
            isFullScreen.value = false;
        }
    };
    document.addEventListener("mousedown", handleClickOutside);

    // Initialize Wayfinder with fastest ping strategy
    try {
        const wayfinder = new Wayfinder({
            routingStrategy: new FastestPingRoutingStrategy(),
            gatewaysProvider: new NetworkGatewaysProvider(),
        });

        // Get all gateways and select the optimal one
        const gatewaysProvider = new NetworkGatewaysProvider();
        const gateways = await gatewaysProvider.getGateways();
        const routingStrategy = new FastestPingRoutingStrategy();
        const optimalGatewayUrl = await routingStrategy.selectGateway({
            gateways,
        });

        optimalGateway.value = optimalGatewayUrl.hostname;
        console.log(
            `✅ Wayfinder selected optimal gateway: ${optimalGateway.value}`,
        );
    } catch (error) {
        console.error(
            "❌ Failed to initialize Wayfinder, using default gateway:",
            error,
        );
    }

    try {
        // Fetch ArNS domains using @ar.io/sdk/web with real-time updates
        const ario = ARIO.mainnet();
        let cursor = undefined;
        let pageCount = 0;

        console.log(
            "Starting to fetch ArNS records (real-time updates enabled)...",
        );

        // Paginate through records and update in real-time
        do {
            pageCount++;
            const response = await ario.getArNSRecords({
                limit: 1000,
                cursor: cursor,
                sortBy: "name",
                sortOrder: "asc",
            });

            console.log(
                `Page ${pageCount}: Fetched ${response.items.length} records`,
            );

            // Update domains and process IDs immediately as each page loads
            const newDomains = response.items.map((record) => record.name);
            arnsDomains.value = [...arnsDomains.value, ...newDomains];

            // Update process IDs for undernames
            response.items.forEach((record) => {
                if (record.processId) {
                    arnsProcessIds.value[record.name] = record.processId;
                }
            });

            console.log(
                `Total records loaded so far: ${arnsDomains.value.length}`,
            );

            // Update cursor for next iteration
            cursor = response.nextCursor;

            // Continue if there's a nextCursor (meaning more pages exist)
        } while (cursor);

        console.log(
            `✅ Finished! Total ArNS domains loaded: ${arnsDomains.value.length}`,
        );
    } catch (error) {
        console.error("❌ Failed to load ArNS domains:", error);
    }
    window.addEventListener("resize", () => {
        isMobile.value = window.innerWidth <= 768;
    });
});

watch(
    query,
    () => {
        showSuggestions.value = true;
        hoveredIndex.value = 0;
        lastKeyboardHoveredIndex.value = 0;
        isKeyboardNavigating.value = false; // Reset keyboard mode when typing
    },
    { immediate: true },
);

// Watch for hovered index changes to fetch undernames for hovered ArNS
watch([hoveredIndex, filteredSuggestions], ([newIndex]) => {
    // Clear any pending fetch timeout
    if (undernamesFetchTimeout) {
        clearTimeout(undernamesFetchTimeout);
        undernamesFetchTimeout = null;
    }

    // Use the final suggestions array (which includes undernames)
    const currentSuggestion = suggestions.value[newIndex];

    // If hovering over an undername, keep the current undernames displayed
    if (currentSuggestion && currentSuggestion.type === "arns_undername") {
        // Don't change anything - keep showing the undernames
        return;
    }

    // If hovering over an ArNS suggestion
    if (currentSuggestion && currentSuggestion.type === "arns") {
        const arnsName = currentSuggestion.text;
        hoveredArnsName.value = arnsName;

        // If we already fetched this ArNS and it's displayed, just keep it
        if (arnsName === displayedUnderamesForArns.value) {
            return;
        }

        // If we already fetched this ArNS before (cached), show it immediately without delay
        if (
            arnsName === lastFetchedArnsName.value &&
            arnsUndernameSuggestions.value.length > 0
        ) {
            displayedUnderamesForArns.value = arnsName;
            lastDisplayedUndernamesCount.value = arnsUndernameSuggestions.value.length;
            return;
        }

        // Add a delay before fetching to avoid fetching when user is navigating quickly
        undernamesFetchTimeout = setTimeout(async () => {
            // Clear previous undernames and start loading
            arnsUndernameSuggestions.value = [];
            displayedUnderamesForArns.value = null;
            lastFetchedArnsName.value = arnsName;
            isLoadingUndernames.value = true;

            const processId = arnsProcessIds.value[arnsName];

            if (!processId) {
                console.warn(`No process ID found for ArNS: ${arnsName}`);
                isLoadingUndernames.value = false;
                return;
            }

            try {
                console.log(`Fetching undernames for: ${arnsName}`);
                const ao = connect();
                const result = await ao.dryrun({
                    process: processId,
                    tags: [{ name: "Action", value: "Records" }],
                });

                if (result.Messages && result.Messages.length > 0) {
                    const dataField = JSON.parse(result.Messages[0].Data);
                    arnsUndernameSuggestions.value = Object.keys(dataField)
                        .filter((key) => key !== "@")
                        .map((key) => ({
                            text: `${key}_${arnsName}`,
                            description: `ArNS undername for ${arnsName}`,
                            formattedUrl: formatUrl(
                                `https://${key}_${arnsName}.${optimalGateway.value}`,
                            ),
                            type: "arns_undername",
                        }));
                    console.log(
                        `Loaded ${arnsUndernameSuggestions.value.length} undernames for ${arnsName}`,
                    );

                    // Mark this ArNS as having displayed undernames and save the count
                    displayedUnderamesForArns.value = arnsName;
                    lastDisplayedUndernamesCount.value = arnsUndernameSuggestions.value.length;
                }

                // Wait for next tick to ensure undernames are rendered before hiding loading
                await nextTick();
                isLoadingUndernames.value = false;
            } catch (error) {
                console.error("Error handling ArNS suggestion:", error);
                isLoadingUndernames.value = false;
            }
        }, 500); // 500ms delay before fetching
        return;
    }

    // Safety check: ensure hoveredIndex is valid
    if (!suggestions.value || suggestions.value.length === 0 || hoveredIndex.value >= suggestions.value.length || isNaN(hoveredIndex.value)) {
        console.log('Invalid state - suggestions not ready or invalid index');
        return;
    }

    // Hovering over something else (shortcut, etc) - clear undernames immediately
    const finalSuggestion = suggestions.value[hoveredIndex.value];
    console.log('About to clear - hoveredIndex:', hoveredIndex.value, 'suggestion:', finalSuggestion?.text);

    if (!finalSuggestion || (finalSuggestion.type !== "arns" && finalSuggestion.type !== "arns_undername")) {
        // Use the LAST displayed undernames count (not the current one which might be for new ArNS)
        const undernamesCount = lastDisplayedUndernamesCount.value;
        console.log('Undernames to remove (from last displayed):', undernamesCount);

        if (undernamesCount > 0) {
            // Find the FIRST undername in the suggestions array
            const firstUndernameIndex = suggestions.value.findIndex(s => s.type === 'arns_undername');
            console.log('First undername at index:', firstUndernameIndex, 'current hoveredIndex:', hoveredIndex.value);

            // PROACTIVELY adjust index BEFORE clearing undernames
            // If we're positioned after the undernames, calculate and set the new index now
            if (firstUndernameIndex !== -1 && hoveredIndex.value > firstUndernameIndex) {
                const newIndex = Math.max(0, hoveredIndex.value - undernamesCount);
                console.log('BEFORE clearing - adjusting index from', hoveredIndex.value, 'to', newIndex);
                hoveredIndex.value = newIndex;
                lastKeyboardHoveredIndex.value = newIndex;
            } else {
                console.log('No adjustment needed - not after undernames');
            }
        }

        // Now clear the undernames and reset the count
        arnsUndernameSuggestions.value = [];
        hoveredArnsName.value = null;
        displayedUnderamesForArns.value = null;
        isLoadingUndernames.value = false;
        lastDisplayedUndernamesCount.value = 0; // Reset count after clearing
    }
});

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

            <!-- Filter Button -->
            <button
                type="button"
                class="filter-button"
                @click="toggleModeModal"
                :class="{ active: searchMode !== 'all' || showModeModal }"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    width="18"
                    height="18"
                >
                    <polygon
                        points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"
                    ></polygon>
                </svg>
            </button>

            <input
                ref="searchInput"
                type="text"
                v-model="query"
                placeholder="Search, bang, or ArNS domain..."
                required
                @focus="debouncedOnInputFocus"
                @touchstart="onInputTouchStart"
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

        <!-- Mode Selection Popup -->
        <div
            v-if="showModeModal"
            class="mode-modal-overlay"
            @click="showModeModal = false"
        ></div>
        <div v-if="showModeModal" class="mode-modal" @click.stop>
            <div class="mode-modal-header">
                <span>Filter by</span>
                <button
                    type="button"
                    class="close-button"
                    @click="showModeModal = false"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="16"
                        height="16"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="mode-list">
                <button
                    v-for="mode in searchModes"
                    :key="mode.id"
                    type="button"
                    class="mode-option"
                    :class="{ active: searchMode === mode.id }"
                    @click="selectMode(mode.id)"
                >
                    {{ mode.label }}
                    <svg
                        v-if="searchMode === mode.id"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="3"
                        width="16"
                        height="16"
                    >
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </button>
            </div>
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
                    :class="{
                        hovered: index === hoveredIndex,
                        'is-shortcut': suggestion.type === 'shortcut',
                    }"
                    @mousedown="selectSuggestion(suggestion)"
                    @mousemove="
                        if (!isKeyboardNavigating) {
                            hoveredIndex = index;
                            isMouseHovering = true;
                        }
                    "
                    @mouseleave="
                        if (!isKeyboardNavigating) {
                            isMouseHovering = false;
                            hoveredIndex = lastKeyboardHoveredIndex;
                        }
                    "
                >
                    <div class="suggestion-main">
                        <div class="suggestion-text-wrapper">
                            <div class="suggestion-title-row">
                                <strong
                                    :class="{
                                        'arns-name': suggestion.type === 'arns',
                                    }"
                                    >{{ suggestion.text }}</strong
                                >
                                <svg
                                    v-if="
                                        suggestion.type === 'docs' &&
                                        index === hoveredIndex
                                    "
                                    class="external-arrow external-arrow-inline"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    width="16"
                                    height="16"
                                >
                                    <line x1="7" y1="17" x2="17" y2="7"></line>
                                    <polyline
                                        points="7 7 17 7 17 17"
                                    ></polyline>
                                </svg>
                            </div>
                            <span
                                v-if="
                                    suggestion.type === 'docs' &&
                                    suggestion.description
                                "
                                class="suggestion-description"
                            >
                                {{ suggestion.description }}
                            </span>
                        </div>
                        <div
                            v-if="
                                suggestion.type === 'arns' &&
                                index === hoveredIndex &&
                                isLoadingUndernames
                            "
                            class="loading-dots"
                        >
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </div>
                        <svg
                            v-if="
                                suggestion.type !== 'docs' &&
                                index === hoveredIndex
                            "
                            class="external-arrow"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            width="16"
                            height="16"
                        >
                            <line x1="7" y1="17" x2="17" y2="7"></line>
                            <polyline points="7 7 17 7 17 17"></polyline>
                        </svg>
                    </div>
                    <span
                        class="result-tag"
                        :class="`tag-${suggestion.type.replace('_', '-')}`"
                    >
                        {{ getTagLabel(suggestion.type) }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Glossary Modal -->
        <div
            v-if="showGlossaryModal"
            class="glossary-modal-overlay"
            @click="showGlossaryModal = false"
        ></div>
        <div
            v-if="showGlossaryModal && selectedGlossaryTerm"
            class="glossary-modal"
            @click.stop
        >
            <div class="glossary-modal-header">
                <div class="glossary-title-section">
                    <h3>{{ selectedGlossaryTerm.term }}</h3>
                    <p
                        v-if="selectedGlossaryTerm.category"
                        class="glossary-category"
                    >
                        {{ selectedGlossaryTerm.category }}
                    </p>
                </div>
                <button
                    type="button"
                    class="close-button"
                    @click="showGlossaryModal = false"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="20"
                        height="20"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div class="glossary-definition-container">
                <p class="glossary-definition">
                    {{ selectedGlossaryTerm.definition }}
                </p>
            </div>

            <div class="glossary-modal-footer">
                <div class="glossary-meta-content-wrapper">
                    <div
                        v-if="
                            selectedGlossaryTerm.aliases &&
                            selectedGlossaryTerm.aliases.length > 0
                        "
                        class="glossary-meta-section"
                    >
                        <strong>Also known as:</strong>
                        <span class="glossary-meta-content">{{
                            selectedGlossaryTerm.aliases.join(", ")
                        }}</span>
                    </div>
                    <div
                        v-if="
                            selectedGlossaryTerm.related &&
                            selectedGlossaryTerm.related.length > 0
                        "
                        class="glossary-meta-section"
                    >
                        <strong>Related terms:</strong>
                        <span class="glossary-meta-content">
                            <span
                                v-for="(
                                    term, index
                                ) in selectedGlossaryTerm.related"
                                :key="index"
                            >
                                <a
                                    href="#"
                                    class="related-term-link"
                                    @click.prevent="searchRelatedTerm(term)"
                                >
                                    {{ term }}
                                </a>
                                <span
                                    v-if="
                                        index <
                                        selectedGlossaryTerm.related.length - 1
                                    "
                                    >,
                                </span>
                            </span>
                        </span>
                    </div>
                </div>
                <button
                    v-if="
                        selectedGlossaryTerm.docs &&
                        selectedGlossaryTerm.docs.length > 0
                    "
                    type="button"
                    class="open-source-icon-button"
                    @click="window.open(selectedGlossaryTerm.docs[0], '_blank')"
                    title="Open source documentation"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        width="20"
                        height="20"
                    >
                        <line x1="7" y1="17" x2="17" y2="7"></line>
                        <polyline points="7 7 17 7 17 17"></polyline>
                    </svg>
                </button>
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
    border-radius: 0;
    background-color: var(--input-bg);
    color: var(--text-color);
    transition: border-radius 0.3s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.input-wrapper:has(.filter-button.active) input {
    border-radius: 0;
}

input.with-suggestions {
    border-radius: 0;
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

/* Filter Button styles */
.filter-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.6rem 0.8rem;
    background-color: var(--input-bg);
    border: none;
    border-radius: 5px 0 0 5px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-color);
    position: relative;
}

.filter-button:hover {
    background-color: var(--input-focus-bg);
}

.filter-button.active {
    background-color: var(--input-bg);
    color: var(--text-color);
    border-radius: 0;
}

.input-wrapper:has(~ .suggestions-wrapper.visible) .filter-button {
    border-radius: 5px 0 0 0;
}

.filter-button svg {
    display: block;
}

/* Mode Popup styles */
.mode-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    background-color: transparent;
}

.mode-modal {
    position: absolute;
    top: 100%;
    left: 0;
    background-color: var(--input-bg);
    border-radius: 0 0 12px 12px;
    padding: 16px;
    min-width: 220px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    animation: popupSlideIn 0.2s ease-out;
    z-index: 1000;
    border: none;
}

@keyframes popupSlideIn {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.mode-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--text-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.8;
}

.close-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
    opacity: 0.6;
}

.close-button:hover {
    background-color: var(--input-bg);
    opacity: 1;
}

.mode-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.mode-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background-color: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-color);
    text-align: left;
}

.mode-option:hover {
    background-color: var(--input-bg);
}

.mode-option.active {
    background-color: var(--button-bg);
    color: white;
}

.mode-option svg {
    flex-shrink: 0;
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
    gap: 12px;
}

.suggestion.hovered,
.suggestion:hover {
    background-color: var(--button-bg);
}

.suggestion.hovered,
.suggestion:hover {
    & strong,
    .description,
    .url,
    .external-arrow {
        color: white;
    }
}

.suggestion-main {
    display: flex;
    align-items: center;
    gap: 6px;
}

.suggestion-text-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.suggestion-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.external-arrow-inline {
    flex-shrink: 0;
}

.suggestion-description {
    font-size: 0.75rem;
    color: var(--text-color);
    opacity: 0.7;
    font-weight: normal;
}

.suggestion.hovered .suggestion-description,
.suggestion:hover .suggestion-description {
    color: white;
    opacity: 0.9;
}

/* Loading Dots */
.loading-dots {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    height: 16px;
    justify-content: center;
}

.loading-dots .dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: var(--text-color);
    opacity: 0.4;
    animation: bounce 1.4s infinite ease-in-out both;
}

.loading-dots .dot:nth-child(1) {
    animation-delay: -0.32s;
}

.loading-dots .dot:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes bounce {
    0%,
    80%,
    100% {
        transform: translateY(0);
        opacity: 0.4;
    }
    40% {
        transform: translateY(-4px);
        opacity: 0.8;
    }
}

.suggestion.hovered .loading-dots .dot,
.suggestion:hover .loading-dots .dot {
    background-color: white;
    opacity: 0.6;
}

.suggestion.hovered .loading-dots .dot,
.suggestion:hover .loading-dots .dot {
    animation: bounceHover 1.4s infinite ease-in-out both;
}

.suggestion.hovered .loading-dots .dot:nth-child(1),
.suggestion:hover .loading-dots .dot:nth-child(1) {
    animation-delay: -0.32s;
}

.suggestion.hovered .loading-dots .dot:nth-child(2),
.suggestion:hover .loading-dots .dot:nth-child(2) {
    animation-delay: -0.16s;
}

@keyframes bounceHover {
    0%,
    80%,
    100% {
        transform: translateY(0);
        opacity: 0.6;
    }
    40% {
        transform: translateY(-4px);
        opacity: 1;
    }
}

/* Tag Styles */
.result-tag {
    display: inline-flex;
    align-items: center;
    padding: 4px 12px;
    font-size: 0.7rem;
    font-weight: 600;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    flex-shrink: 0;
}

.tag-arns {
    background-color: #e3f2fd;
    color: #1976d2;
}

.tag-arns-undername {
    background-color: #f3e5f5;
    color: #7b1fa2;
}

.tag-shortcut {
    background-color: #fff3e0;
    color: #e65100;
}

.tag-tx {
    background-color: #fff3e0;
    color: #e65100;
}

.tag-txdata {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.tag-rawtx {
    background-color: #fce4ec;
    color: #c2185b;
}

.tag-docs {
    background-color: #e8eaf6;
    color: #3f51b5;
}

.tag-glossary {
    background-color: #fff9c4;
    color: #f57f17;
}

/* Tag colors when suggestion is hovered - high contrast */
.suggestion.hovered .result-tag,
.suggestion:hover .result-tag {
    background-color: white;
    color: var(--button-bg);
    font-weight: 700;
    border: 2px solid white;
    padding: 2px 10px;
}

.external-arrow {
    color: var(--text-color);
    opacity: 0.6;
    flex-shrink: 0;
}

.suggestion.is-shortcut strong {
    font-weight: 500;
}

.suggestion.is-shortcut .description {
    font-weight: normal;
    font-size: 0.85em;
    opacity: 0.8;
}

.suggestion strong {
    color: var(--text-color);
    padding: 2px 4px 2px 0;
    border-radius: 3px;
}

.suggestion strong.arns-name {
    max-width: 300px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
            background-color: var(--input-bg);
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

        input:focus {
            background-color: var(--input-bg);
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

        .result-tag {
            font-size: 0.75rem;
            padding: 4px 10px;
        }
    }

    .input-wrapper {
        flex-direction: row;
    }

    input {
        font-size: 16px;
        padding: 12px 16px;
    }

    .full-screen input.with-suggestions {
        padding: 26px 26px 26px 0;
    }

    button.back-button {
        border-radius: 0;
    }

    .suggestions-wrapper {
        background-color: var(--input-bg);
        order: 1;
    }

    .suggestions {
        position: static;
        border-radius: 0 0 5px 5px;
        border-top: none;
    }
}

/* Glossary Modal Styles */
.glossary-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    z-index: 9998;
    animation: fadeIn 0.2s ease-out;
}

.glossary-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: var(--input-bg);
    border-radius: 12px;
    width: 90%;
    max-width: 700px;
    max-height: 60vh;
    z-index: 9999;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s ease-out;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translate(-50%, -45%);
    }
    to {
        opacity: 1;
        transform: translate(-50%, -50%);
    }
}

.glossary-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px 24px 0 24px;
    border-bottom: 1px solid var(--input-focus-bg);
    background-color: var(--input-bg);
    flex-shrink: 0;
}

.glossary-title-section {
    flex: 1;
}

.glossary-modal-header h3 {
    margin: 0 0 6px 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-color);
}

.glossary-category {
    font-size: 0.75rem;
    font-weight: 600;
    color: #f57f17;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 0;
}

.glossary-modal-header .close-button {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s;
    opacity: 0.7;
    min-width: auto;
    flex-shrink: 0;
    margin-left: 16px;
}

.glossary-modal-header .close-button:hover {
    background-color: var(--input-focus-bg);
    opacity: 1;
}

.glossary-definition-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.glossary-definition {
    font-size: 1rem;
    line-height: 1.6;
    color: var(--text-color);
    margin: 0;
}

.glossary-modal-footer {
    padding: 20px 24px;
    border-top: 1px solid var(--input-focus-bg);
    background-color: var(--input-bg);
    flex-shrink: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
}

.glossary-meta-content-wrapper {
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
}

.glossary-meta-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.glossary-meta-section strong {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-color);
    opacity: 0.7;
}

.glossary-meta-content {
    font-size: 0.9rem;
    color: var(--text-color);
}

.related-term-link {
    color: var(--button-bg);
    text-decoration: none;
    transition: opacity 0.2s;
    cursor: pointer;
}

.related-term-link:hover {
    text-decoration: underline;
    opacity: 0.8;
}

.open-source-icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    background-color: transparent;
    color: var(--text-color);
    border: 1px solid var(--input-focus-bg);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    min-width: auto;
}

.open-source-icon-button:hover {
    background-color: var(--input-focus-bg);
    border-color: var(--button-bg);
    color: var(--button-bg);
    transform: translateY(-1px);
}

.open-source-icon-button svg {
    display: block;
}
</style>
