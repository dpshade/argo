/**
 * Vue composable for HyperBEAM hashpath autocomplete functionality
 * Based on patterns from dpshade's hb-explorer implementation
 */

import { ref, computed, watch, nextTick } from "vue";
import { fetchHyperbeamDevices, searchDevices, isValidHashpath } from "@/helpers/hyperbeamDevices";

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

  // Update suggestions when input or cursor position changes
  watch([hashpathInput, cursorPosition], async () => {
    const segment = currentSegment.value;
    
    // Only show suggestions for device segments
    if (!segment || !isDeviceSegment.value) {
      showDropdown.value = false;
      suggestions.value = [];
      return;
    }

    // Don't show suggestions for very short queries
    if (segment.length < 2) {
      showDropdown.value = false;
      suggestions.value = [];
      return;
    }

    // Search for matching devices
    const matches = searchDevices(segment, 10);
    
    if (matches.length > 0) {
      suggestions.value = matches;
      showDropdown.value = true;
      selectedIndex.value = 0;
    } else {
      showDropdown.value = false;
      suggestions.value = [];
    }
  });

  // Accept suggestion with smart boundary detection
  function acceptSuggestion(deviceName) {
    const input = hashpathInput.value;
    const cursor = cursorPosition.value;

    // Find device boundary at cursor (look backwards for '/')
    let deviceStart = 0;
    for (let i = cursor - 1; i >= 0; i--) {
      if (input[i] === '/') {
        deviceStart = i + 1;
        break;
      }
    }

    // Find end of current device (look forwards for '/' or end of string)
    let deviceEnd = input.length;
    for (let i = cursor; i < input.length; i++) {
      if (input[i] === '/') {
        deviceEnd = i;
        break;
      }
    }

    // Build the new path with device + trailing /
    const beforeDevice = input.substring(0, deviceStart);
    const afterDevice = input.substring(deviceEnd);

    // Add trailing / after device (unless there's already one)
    const deviceWithSlash = afterDevice.startsWith('/') ? deviceName : `${deviceName}/`;

    // Build new input
    let newInput = beforeDevice + deviceWithSlash + afterDevice;

    // Track if we add leading slash for cursor positioning
    let addedLeadingSlash = false;

    // Ensure path starts with / if it's the first device
    if (!newInput.startsWith('/')) {
      newInput = '/' + newInput;
      addedLeadingSlash = true;
    }

    // Calculate cursor position after the inserted device and trailing /
    const newCursorPosition = (addedLeadingSlash ? 1 : 0) +
                              beforeDevice.length +
                              deviceWithSlash.length;

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
          const result = acceptSuggestion(suggestions.value[selectedIndex.value].name);
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
    isValidPath,
    
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