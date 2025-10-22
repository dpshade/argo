<script setup>
import { ref, computed, nextTick } from 'vue';
import { useHashpathAutocomplete } from '../composables/useHashpathAutocomplete';
import { isValidHashpath, isTransactionId } from '../helpers/hyperbeamDevices';

const emit = defineEmits(['exit', 'launch']);

// Use the hashpath autocomplete composable
const hashpathAutocomplete = useHashpathAutocomplete();
const { searchDevices } = hashpathAutocomplete;

// Local state
const query = ref('');
const hashpathCursorPosition = ref(0);
const hoveredIndex = ref(0);
const inputRef = ref(null);

// Device suggestions based on current segment at cursor
const deviceSuggestions = computed(() => {
    if (query.value.length >= 1) {
        // Extract current segment at cursor position
        const beforeCursor = query.value.substring(0, hashpathCursorPosition.value);
        const segments = beforeCursor.split('/');
        const currentSegment = segments[segments.length - 1] || '';

        // Check if current segment is a potential txID (don't autocomplete those)
        const looksLikeTxId = currentSegment.length >= 10 &&
                             /^[a-zA-Z0-9_-]+$/.test(currentSegment) &&
                             !currentSegment.startsWith('~');

        // Only show device suggestions if not typing a txID
        if (!looksLikeTxId && currentSegment && currentSegment.length >= 1) {
            // Prepend ~ if not already present for search
            const searchQuery = currentSegment.startsWith('~')
                ? currentSegment
                : `~${currentSegment}`;

            const devices = searchDevices(searchQuery.toLowerCase(), 8);
            return devices.map(device => ({
                text: device.name,
                description: device.description,
                type: "device"
            }));
        }
    }
    return [];
});

// Handle input changes and track cursor position
function handleInput(event) {
    query.value = event.target.value;
    hashpathCursorPosition.value = event.target.selectionStart || 0;

    // Sync with composable for autocomplete logic
    hashpathAutocomplete.hashpathInput.value = event.target.value;
    hashpathAutocomplete.cursorPosition.value = event.target.selectionStart || 0;
}

// Handle cursor position changes (for click/selection)
function handleCursorChange(event) {
    hashpathCursorPosition.value = event.target.selectionStart || 0;

    // Sync with composable
    hashpathAutocomplete.cursorPosition.value = event.target.selectionStart || 0;
}

// Handle keyboard navigation
function handleKeyDown(event) {
    // Handle Tab/Enter for path-aware completion when suggestions are shown
    if (deviceSuggestions.value.length > 0 && (event.key === 'Tab' || event.key === 'Enter')) {
        event.preventDefault();

        const selectedSuggestion = deviceSuggestions.value[hoveredIndex.value] || deviceSuggestions.value[0];

        if (selectedSuggestion && selectedSuggestion.type === 'device') {
            selectDevice(selectedSuggestion);
        }
        return;
    }

    // Handle Escape to exit launcher
    if (event.key === 'Escape') {
        event.preventDefault();
        emit('exit');
        return;
    }

    // Handle Enter to launch (when no suggestions)
    if (event.key === 'Enter' && deviceSuggestions.value.length === 0) {
        event.preventDefault();
        launchHashpath();
        return;
    }

    // Handle arrow navigation in suggestions
    if (deviceSuggestions.value.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();

        if (event.key === 'ArrowDown') {
            hoveredIndex.value = (hoveredIndex.value + 1) % deviceSuggestions.value.length;
        } else {
            hoveredIndex.value = hoveredIndex.value === 0
                ? deviceSuggestions.value.length - 1
                : hoveredIndex.value - 1;
        }
    }
}

// Select a device and apply path-aware replacement
function selectDevice(suggestion) {
    console.log('Device selected in hashpath mode:', suggestion.text);

    // Update composable state with current input and cursor
    hashpathAutocomplete.hashpathInput.value = query.value;
    hashpathAutocomplete.cursorPosition.value = hashpathCursorPosition.value;

    // Perform smart replacement
    const result = hashpathAutocomplete.acceptSuggestion(suggestion.text);

    // Update query with the new path
    query.value = result.newInput;
    hashpathCursorPosition.value = result.newCursorPosition;

    // Update cursor position in the input field
    nextTick(() => {
        if (inputRef.value) {
            inputRef.value.setSelectionRange(
                result.newCursorPosition,
                result.newCursorPosition
            );
            inputRef.value.focus();
        }
    });
}

// Launch the hashpath
function launchHashpath() {
    const path = query.value.trim();

    if (!path) {
        console.warn('Empty hashpath provided');
        return;
    }

    if (!isValidHashpath(path)) {
        console.warn('Invalid hashpath:', path);
        return;
    }

    // Remove leading slash for the URL (forward.computer doesn't expect it)
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const url = `https://forward.computer/${cleanPath}`;

    console.log('Launching hashpath:', url);
    window.open(url, '_blank');

    emit('launch', path);
}

// Handle form submission
function onSubmit(event) {
    event.preventDefault();
    launchHashpath();
}

// Expose focus method for parent component
defineExpose({
    focus: () => inputRef.value?.focus()
});
</script>

<template>
    <form @submit="onSubmit" class="hyperbeam-launcher">
        <div class="input-wrapper">
            <input
                ref="inputRef"
                type="text"
                v-model="query"
                placeholder="Enter HyperBEAM path (txID or device)..."
                @input="handleInput"
                @keydown="handleKeyDown"
                @mouseup="handleCursorChange"
                @click="handleCursorChange"
                class="hashpath-input"
                :class="{ 'with-suggestions': deviceSuggestions.length > 0 }"
                autofocus
            />
            <button
                type="submit"
                :disabled="!isValidHashpath(query)"
                class="launch-button"
                :class="{ 'with-suggestions': deviceSuggestions.length > 0 }"
            >
                Launch
            </button>
        </div>

        <!-- Device suggestions dropdown -->
        <div
            v-if="deviceSuggestions.length > 0"
            class="suggestions-dropdown"
        >
            <div
                v-for="(device, index) in deviceSuggestions"
                :key="device.text"
                :class="['suggestion-item', { hovered: index === hoveredIndex }]"
                @click="selectDevice(device)"
                @mousemove="hoveredIndex = index"
            >
                <div class="suggestion-main">
                    <div class="suggestion-text-wrapper">
                        <div class="suggestion-title-row">
                            <strong>{{ device.text }}</strong>
                        </div>
                        <div class="suggestion-description">{{ device.description }}</div>
                    </div>
                </div>
                <span class="result-tag tag-device">Device</span>
            </div>
        </div>

        <!-- Mode indicator -->
        <div v-if="!deviceSuggestions.length" class="mode-indicator">
            HyperBEAM Launch Mode • Press Esc to exit
        </div>
    </form>
</template>

<style scoped>
.hyperbeam-launcher {
    width: 100%;
    max-width: 600px;
    margin: 15px 0 1rem;
    position: relative;
}

.input-wrapper {
    display: flex;
    width: 100%;
}

.hashpath-input {
    flex-grow: 1;
    padding: 0.6rem 1rem;
    font-size: 1rem;
    border: none;
    border-radius: 5px 0 0 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
    outline: none;
    transition: border-radius 0.3s ease;
    touch-action: manipulation;
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

.hashpath-input:focus {
    background-color: var(--input-focus-bg);
}

.hashpath-input.with-suggestions {
    border-radius: 5px 0 0 0;
}

.launch-button {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    background-color: var(--button-bg);
    color: white;
    border: none;
    border-radius: 0 5px 5px 0;
    cursor: pointer;
    transition: background-color 0.3s, border-radius 0.3s ease;
    min-width: 85px;
}

.launch-button:hover:not(:disabled) {
    background-color: var(--button-hover-bg);
}

.launch-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.launch-button.with-suggestions {
    border-radius: 0 5px 0 0;
}

.suggestions-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--input-focus-bg);
    border-radius: 0 0 5px 5px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 10;
}

.suggestion-item {
    padding: 10px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    transition: background-color 0.15s;
}

.suggestion-item.hovered,
.suggestion-item:hover {
    background-color: var(--button-bg);
}

.suggestion-item.hovered strong,
.suggestion-item:hover strong {
    color: white;
}

.suggestion-main {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;
}

.suggestion-text-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
}

.suggestion-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.suggestion-item strong {
    color: var(--text-color);
    padding: 2px 4px 2px 0;
    border-radius: 3px;
}

.suggestion-description {
    font-size: 0.75rem;
    color: var(--text-color);
    opacity: 0.7;
    font-weight: normal;
}

.suggestion-item.hovered .suggestion-description,
.suggestion-item:hover .suggestion-description {
    opacity: 0.9;
    color: white;
}

/* Result Tag Styles */
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

.tag-device {
    background-color: #e8f5e9;
    color: #2e7d32;
}

.suggestion-item.hovered .result-tag,
.suggestion-item:hover .result-tag {
    background-color: white;
    color: var(--button-bg);
    font-weight: 700;
    border: 2px solid white;
    padding: 2px 10px;
}

.mode-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    margin-top: 8px;
    background-color: var(--button-bg);
    color: white;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
