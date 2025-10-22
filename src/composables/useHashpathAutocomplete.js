/**
 * Vue composable for HyperBEAM hashpath autocomplete functionality
 * Based on patterns from dpshade's hb-explorer implementation
 */

import { ref, computed, watch, nextTick } from "vue";
import { fetchHyperbeamDevices, searchDevices, isValidHashpath, searchOperations, deviceHasOperations } from "@/helpers/hyperbeamDevices";

export function useHashpathAutocomplete() {
  const hashpathInput = ref("");
  const cursorPosition = ref(0);
  const suggestions = ref([]);
  const showDropdown = ref(false);
  const selectedIndex = ref(0);
  const isLoading = ref(false);

  // Parse current segment at cursor position
  const currentSegment = computed(() => {
    const beforeCursor = hashpathInput.value.substring(0, cursorPosition.value);
    const segments = beforeCursor.split("/");
    return segments[segments.length - 1] || "";
  });

  // Check if current segment looks like a device name
  const isDeviceSegment = computed(() => {
    return currentSegment.value.startsWith("~");
  });

  // Extract the device name from the path (for operation autocomplete)
  const currentDevice = computed(() => {
    const beforeCursor = hashpathInput.value.substring(0, cursorPosition.value);
    const segments = beforeCursor.split("/").filter(s => s.length > 0);

    // Find the last device segment (starts with ~)
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].startsWith("~")) {
        return segments[i];
      }
    }
    return null;
  });

  // Check if we're at the operation level (typing after a device name)
  const isOperationSegment = computed(() => {
    const beforeCursor = hashpathInput.value.substring(0, cursorPosition.value);
    const segments = beforeCursor.split("/").filter(s => s.length > 0);

    // We're at operation level if:
    // 1. Current segment doesn't start with ~ (not a device)
    // 2. There's a device segment before this one
    // 3. We have a device in the path

    // Special case: if path ends with / after a device (e.g., /~json@1.0/)
    // and cursor is at the end, we're ready to show operations
    if (beforeCursor.endsWith('/') && currentDevice.value && segments.length >= 1) {
      return true;
    }

    // Normal case: typing in a segment after a device
    if (segments.length < 2) return false;
    if (currentSegment.value.startsWith("~")) return false;

    // Check if there's a device in the path
    return currentDevice.value !== null;
  });

  // Operation suggestions based on current device and operation query
  const operationSuggestions = computed(() => {
    console.log('[Autocomplete] operationSuggestions computed:', {
      isOperationSegment: isOperationSegment.value,
      currentDevice: currentDevice.value,
      currentSegment: currentSegment.value
    });

    if (!isOperationSegment.value || !currentDevice.value) {
      console.log('[Autocomplete] Early return: not operation segment or no device');
      return [];
    }

    const device = currentDevice.value;
    const query = currentSegment.value;

    // Check if device has operations
    const hasOps = deviceHasOperations(device);
    console.log('[Autocomplete] Device has operations?', device, hasOps);
    if (!hasOps) return [];

    // If no query, show all operations for the device
    if (!query || query.length === 0) {
      const ops = searchOperations(device, "", 10);
      console.log('[Autocomplete] Empty query, showing all operations:', ops.length);
      return ops.map(op => ({
        name: op.name,
        description: op.description,
        params: op.params || [],
        type: "operation",
        device: device
      }));
    }

    // Search operations by query
    const ops = searchOperations(device, query, 10);
    console.log('[Autocomplete] Search results for query:', query, ops.length);
    return ops.map(op => ({
      name: op.name,
      description: op.description,
      params: op.params || [],
      type: "operation",
      device: device
    }));
  });

  // Update suggestions when input or cursor position changes
  watch([hashpathInput, cursorPosition], async () => {
    const segment = currentSegment.value;

    console.log('[Autocomplete] Watcher triggered:', {
      hashpathInput: hashpathInput.value,
      cursorPosition: cursorPosition.value,
      segment,
      currentDevice: currentDevice.value,
      isOperationSegment: isOperationSegment.value
    });

    // Priority 1: Check for operation suggestions
    if (isOperationSegment.value && currentDevice.value) {
      const opSuggestions = operationSuggestions.value;
      console.log('[Autocomplete] Operation suggestions:', opSuggestions.length, opSuggestions);
      if (opSuggestions.length > 0) {
        suggestions.value = opSuggestions;
        showDropdown.value = true;
        selectedIndex.value = 0;
        return;
      }
    }

    // Priority 2: Check for device suggestions
    if (segment) {
      // Prepend ~ if user didn't type it (for convenience)
      const searchQuery = segment.startsWith('~') ? segment : `~${segment}`;

      // Don't show suggestions for very short queries
      if (segment.length < 1) {
        showDropdown.value = false;
        suggestions.value = [];
        return;
      }

      // Search for matching devices
      const matches = searchDevices(searchQuery, 10);

      if (matches.length > 0) {
        suggestions.value = matches.map(device => ({
          ...device,
          type: "device"
        }));
        showDropdown.value = true;
        selectedIndex.value = 0;
        return;
      }
    }

    // No suggestions
    showDropdown.value = false;
    suggestions.value = [];
  });

  // Accept suggestion with smart boundary detection (handles both devices and operations)
  function acceptSuggestion(suggestionText, suggestionType = "device") {
    const input = hashpathInput.value;
    const cursor = cursorPosition.value;

    // Find segment boundary at cursor (look backwards for '/')
    let segmentStart = 0;
    for (let i = cursor - 1; i >= 0; i--) {
      if (input[i] === '/') {
        segmentStart = i + 1;
        break;
      }
    }

    // Find end of current segment (look forwards for '/' or end of string)
    let segmentEnd = input.length;
    for (let i = cursor; i < input.length; i++) {
      if (input[i] === '/') {
        segmentEnd = i;
        break;
      }
    }

    // Build the new path with segment + trailing /
    const beforeSegment = input.substring(0, segmentStart);
    const afterSegment = input.substring(segmentEnd);

    // Add trailing / after segment (unless there's already one)
    const segmentWithSlash = afterSegment.startsWith('/') ? suggestionText : `${suggestionText}/`;

    // Build new input
    let newInput = beforeSegment + segmentWithSlash + afterSegment;

    // Track if we add leading slash for cursor positioning
    let addedLeadingSlash = false;

    // Ensure path starts with / if it's the first segment and it's a device
    if (!newInput.startsWith('/') && suggestionType === "device") {
      newInput = '/' + newInput;
      addedLeadingSlash = true;
    }

    // Calculate cursor position after the inserted segment and trailing /
    const newCursorPosition = (addedLeadingSlash ? 1 : 0) +
                              beforeSegment.length +
                              segmentWithSlash.length;

    hashpathInput.value = newInput;
    showDropdown.value = false;

    return {
      newInput,
      newCursorPosition
    };
  }

  // Handle keyboard navigation for autocomplete
  function handleKeyDown(event) {
    if (!showDropdown.value) {
      return false;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length;
        return true;
        
      case "ArrowUp":
        event.preventDefault();
        selectedIndex.value = selectedIndex.value === 0 
          ? suggestions.value.length - 1 
          : selectedIndex.value - 1;
        return true;
        
      case "Tab":
      case "Enter":
        event.preventDefault();
        if (suggestions.value[selectedIndex.value]) {
          const suggestion = suggestions.value[selectedIndex.value];
          const suggestionText = suggestion.name;
          const suggestionType = suggestion.type || "device";
          const result = acceptSuggestion(suggestionText, suggestionType);
          // Update cursor position after Vue reactivity
          nextTick(() => {
            cursorPosition.value = result.newCursorPosition;
          });
        }
        return true;
        
      case "Escape":
        event.preventDefault();
        showDropdown.value = false;
        return true;
    }
    
    return false;
  }

  // Handle input changes and track cursor position
  function handleInput(event) {
    hashpathInput.value = event.target.value;
    cursorPosition.value = event.target.selectionStart || 0;
  }

  // Handle cursor position changes (for click/selection)
  function handleCursorChange(event) {
    cursorPosition.value = event.target.selectionStart || 0;
  }

  // Validate the current hashpath
  const isValidPath = computed(() => {
    return isValidHashpath(hashpathInput.value);
  });

  // Execute the hashpath (open in new tab)
  function executeHashpath() {
    const path = hashpathInput.value.trim();
    if (!path) {
      console.warn("Empty hashpath provided");
      return;
    }

    if (!isValidPath.value) {
      console.warn("Invalid hashpath:", path);
      return;
    }

    // Open hashpath in forward.computer
    const url = `https://forward.computer/${path}`;
    console.log("Opening hashpath:", url);
    window.open(url, "_blank");
  }

  // Initialize device cache
  async function initializeDevices() {
    if (isLoading.value) return;
    
    isLoading.value = true;
    try {
      await fetchHyperbeamDevices();
      console.log("HyperBEAM devices initialized successfully");
    } catch (error) {
      console.error("Failed to initialize HyperBEAM devices:", error);
    } finally {
      isLoading.value = false;
    }
  }

  // Reset the autocomplete state
  function reset() {
    hashpathInput.value = "";
    cursorPosition.value = 0;
    suggestions.value = [];
    showDropdown.value = false;
    selectedIndex.value = 0;
  }

  // Initialize devices on composable creation
  initializeDevices();

  return {
    // State
    hashpathInput,
    cursorPosition,
    suggestions,
    showDropdown,
    selectedIndex,
    isLoading,
    currentSegment,
    isDeviceSegment,
    isOperationSegment,
    currentDevice,
    isValidPath,
    operationSuggestions,

    // Methods
    acceptSuggestion,
    handleKeyDown,
    handleInput,
    handleCursorChange,
    executeHashpath,
    reset,
    initializeDevices,
    searchDevices
  };
}