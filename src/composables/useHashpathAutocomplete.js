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
  const fetchedKeysCache = ref(new Map()); // Cache for fetched keys at each path

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

  // Get the current path up to cursor (for fetching available keys)
  const currentPath = computed(() => {
    const beforeCursor = hashpathInput.value.substring(0, cursorPosition.value);
    const atEndOfInput = cursorPosition.value === hashpathInput.value.length;

    // If we're at the end of a complete device segment (e.g., "/~meta@1.0"),
    // the path is complete - don't pop
    if (atEndOfInput && currentSegment.value.startsWith("~") && currentSegment.value.includes("@")) {
      return beforeCursor;
    }

    // If we're at the end of a complete operation segment (e.g., "/~meta@1.0/info"),
    // the path is complete - don't pop
    if (atEndOfInput && currentSegment.value.length > 0 && !currentSegment.value.startsWith("~")) {
      return beforeCursor;
    }

    // If we're at the end and current segment is empty (e.g., after typing a trailing /),
    // don't pop - the path is complete
    if (currentSegment.value.length === 0 && !beforeCursor.endsWith('/')) {
      return beforeCursor;
    }

    // Otherwise, remove the current incomplete segment
    const segments = beforeCursor.split("/");
    segments.pop(); // Remove last (incomplete) segment
    return segments.join("/");
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

  // Check if we're at the operation level (typing after a device or operation)
  const isOperationSegment = computed(() => {
    const beforeCursor = hashpathInput.value.substring(0, cursorPosition.value);
    const segments = beforeCursor.split("/").filter(s => s.length > 0);
    const atEndOfInput = cursorPosition.value === hashpathInput.value.length;

    // Special case: if path ends with / (e.g., /~json@1.0/ or /~meta@1.0/info/)
    // We're ready to show operations if there's at least one segment
    if (beforeCursor.endsWith('/') && segments.length >= 1) {
      return true;
    }

    // Special case: at end of input after a complete device segment (e.g., /~meta@1.0)
    // Check if current segment is a device pattern (~name@version)
    if (atEndOfInput && currentSegment.value.startsWith("~") && currentSegment.value.includes("@")) {
      return true;
    }

    // Special case: at end of input after a complete operation segment (e.g., /~meta@1.0/info)
    // Current segment is non-empty and doesn't start with ~
    if (atEndOfInput && currentSegment.value.length > 0 && !currentSegment.value.startsWith("~")) {
      return true;
    }

    // If current segment starts with ~ but doesn't match above, we're still typing a device
    if (currentSegment.value.startsWith("~")) {
      return false;
    }

    // Also trigger when cursor is at the end of input after a complete operation segment
    // (e.g., cursor at end of "/~meta@1.0/info/")
    const currentSegmentEmpty = currentSegment.value.length === 0;
    if (atEndOfInput && currentSegmentEmpty && segments.length >= 1) {
      return true;
    }

    // We're at operation level if we have at least one segment before current
    // and the current segment doesn't start with ~
    return segments.length >= 1;
  });

  /**
   * Fetch available keys/operations from forward.computer for the current path
   */
  async function fetchAvailableKeys(path) {
    // Return cached keys if available
    if (fetchedKeysCache.value.has(path)) {
      console.log('[Autocomplete] Using cached keys for:', path);
      return fetchedKeysCache.value.get(path);
    }

    try {
      // Clean path: remove leading slash
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;

      // Skip empty paths
      if (!cleanPath) {
        return [];
      }

      const keysUrl = `https://forward.computer/${cleanPath}/keys/serialize~json@1.0`;
      console.log('[Autocomplete] Fetching keys from:', keysUrl);

      const response = await fetch(keysUrl);

      if (!response.ok) {
        console.log('[Autocomplete] Keys fetch failed:', response.status);
        fetchedKeysCache.value.set(path, []); // Cache empty result
        return [];
      }

      const data = await response.json();
      console.log('[Autocomplete] Keys fetched:', data);

      // Build breadcrumb path from the current path
      const pathSegments = cleanPath.split('/').filter(s => s.length > 0);
      const breadcrumb = pathSegments.join(' › ');

      // Extract operation names from VALUES (not keys)
      // Keys are just indices, values are the actual operation names
      const keys = Object.values(data)
        .filter(value => value !== 'json@1.0' && typeof value === 'string') // Filter out device indicator
        .map(operationName => ({
          name: operationName,
          description: breadcrumb ? `${breadcrumb} › ${operationName}` : operationName,
          type: 'operation',
          breadcrumb: breadcrumb
        }));

      // Cache the results
      fetchedKeysCache.value.set(path, keys);
      return keys;

    } catch (error) {
      console.warn('[Autocomplete] Error fetching keys:', error.message);
      fetchedKeysCache.value.set(path, []); // Cache empty result
      return [];
    }
  }

  // Operation suggestions based on current path and dynamically fetched keys
  const operationSuggestions = computed(() => {
    console.log('[Autocomplete] operationSuggestions computed:', {
      isOperationSegment: isOperationSegment.value,
      currentDevice: currentDevice.value,
      currentSegment: currentSegment.value,
      currentPath: currentPath.value
    });

    if (!isOperationSegment.value) {
      console.log('[Autocomplete] Early return: not operation segment');
      return [];
    }

    const path = currentPath.value;
    const pathSegments = path.split('/').filter(s => s.length > 0);
    const breadcrumb = pathSegments.join(' › ');

    // Check if we're at device level - true when the last segment in the path is a device
    // Examples: /~meta@1.0/ or /~meta@1.0/info/~json@1.0/
    const lastSegment = pathSegments[pathSegments.length - 1] || '';
    const isAtDeviceLevel = lastSegment.startsWith('~');

    // Determine the query for filtering operations
    // If current segment is a complete device (contains @) or complete operation (non-empty, no ~),
    // we're ready to show all nested operations (empty query)
    // Otherwise use the current segment as the query
    const atEndOfInput = cursorPosition.value === hashpathInput.value.length;
    const currentSegmentIsCompleteDevice = currentSegment.value.startsWith("~") && currentSegment.value.includes("@");
    const currentSegmentIsCompleteOperation = atEndOfInput && currentSegment.value.length > 0 && !currentSegment.value.startsWith("~");
    const query = (atEndOfInput && (currentSegmentIsCompleteDevice || currentSegmentIsCompleteOperation)) ? "" : currentSegment.value;

    // For device level, ALWAYS use static catalog operations (don't fetch from /keys)
    if (isAtDeviceLevel && currentDevice.value) {
      const device = currentDevice.value;
      const hasOps = deviceHasOperations(device);

      if (!hasOps) {
        console.log('[Autocomplete] Device has no operations in catalog');
        return [];
      }

      const ops = query ? searchOperations(device, query, 10) : searchOperations(device, "", 10);
      console.log('[Autocomplete] Using static catalog operations:', ops.length);

      return ops.map(op => ({
        name: op.name,
        description: breadcrumb ? `${breadcrumb} › ${op.name}` : op.description,
        params: op.params || [],
        type: "operation",
        device: device,
        breadcrumb: breadcrumb
      }));
    }

    // For nested operation levels, use fetched keys from /keys endpoint
    const cachedKeys = fetchedKeysCache.value.get(path);
    if (cachedKeys && cachedKeys.length > 0) {
      console.log('[Autocomplete] Using cached keys for nested path:', cachedKeys.length);

      // Filter by query if we have one
      if (query && query.length > 0) {
        return cachedKeys.filter(key =>
          key.name.toLowerCase().includes(query.toLowerCase())
        );
      }

      return cachedKeys;
    }

    console.log('[Autocomplete] No suggestions available');
    return [];
  });

  // Update suggestions when input or cursor position changes
  watch([hashpathInput, cursorPosition], async () => {
    const segment = currentSegment.value;

    console.log('[Autocomplete] Watcher triggered:', {
      hashpathInput: hashpathInput.value,
      cursorPosition: cursorPosition.value,
      segment,
      currentDevice: currentDevice.value,
      isOperationSegment: isOperationSegment.value,
      currentPath: currentPath.value
    });

    // Priority 1: Check for operation suggestions
    if (isOperationSegment.value) {
      const path = currentPath.value;
      const pathSegments = path.split('/').filter(s => s.length > 0);
      const lastSegment = pathSegments[pathSegments.length - 1] || '';
      const isAtDeviceLevel = lastSegment.startsWith('~');

      // Only fetch keys for nested operation paths, not device-level paths
      if (!isAtDeviceLevel && path && !fetchedKeysCache.value.has(path)) {
        console.log('[Autocomplete] Fetching keys for nested path:', path);
        await fetchAvailableKeys(path);
      }

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
      // Skip device suggestions if current segment is already a complete device (e.g., ~compute@1.0)
      // At that point, we should only show operations
      const atEndOfInput = cursorPosition.value === hashpathInput.value.length;
      const currentSegmentIsCompleteDevice = segment.startsWith("~") && segment.includes("@");

      if (atEndOfInput && currentSegmentIsCompleteDevice) {
        // Don't show device suggestions for complete devices
        showDropdown.value = false;
        suggestions.value = [];
        return;
      }

      // Prepend ~ if user didn't type it (for convenience)
      const searchQuery = segment.startsWith('~') ? segment : `~${segment}`;

      // Don't show suggestions for very short queries
      if (segment.length < 1) {
        showDropdown.value = false;
        suggestions.value = [];
        return;
      }

      // Build breadcrumb for context
      const pathForBreadcrumb = currentPath.value;
      const pathSegments = pathForBreadcrumb.split('/').filter(s => s.length > 0);
      const breadcrumb = pathSegments.join(' › ');

      // Search for matching devices
      const matches = searchDevices(searchQuery, 10);

      if (matches.length > 0) {
        suggestions.value = matches.map(device => ({
          ...device,
          description: breadcrumb ? `${breadcrumb} › ${device.name}` : device.description,
          type: "device",
          breadcrumb: breadcrumb
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
    const atEndOfInput = cursor === input.length;

    // Special case: if current segment is a complete device (e.g., ~meta@1.0) or complete operation (e.g., info),
    // and we're selecting an OPERATION suggestion, append instead of replace
    const currentSegmentIsCompleteDevice = currentSegment.value.startsWith("~") && currentSegment.value.includes("@");
    const currentSegmentIsCompleteOperation = atEndOfInput && currentSegment.value.length > 0 && !currentSegment.value.startsWith("~");

    // Only append when selecting an operation after a complete segment
    // When selecting a device, always replace (even if current segment looks like complete operation)
    if (atEndOfInput && (currentSegmentIsCompleteDevice || currentSegmentIsCompleteOperation) && suggestionType === "operation") {
      // Append the suggestion after the current segment
      const newInput = input + '/' + suggestionText;
      const newCursorPosition = newInput.length;

      hashpathInput.value = newInput;
      showDropdown.value = false;

      return {
        newInput,
        newCursorPosition
      };
    }

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

    // Build the new path
    const beforeSegment = input.substring(0, segmentStart);
    const afterSegment = input.substring(segmentEnd);

    // Check if we need a separator before the suggestion
    // Add '/' if beforeSegment exists and doesn't end with '/'
    const needsLeadingSeparator = beforeSegment.length > 0 && !beforeSegment.endsWith('/');
    const segmentWithSeparator = needsLeadingSeparator ? `/${suggestionText}` : suggestionText;

    // Build new input
    let newInput = beforeSegment + segmentWithSeparator + afterSegment;

    // Track if we add leading slash for cursor positioning
    let addedLeadingSlash = false;

    // Ensure path starts with / if it's the first segment and it's a device
    if (!newInput.startsWith('/') && suggestionType === "device") {
      newInput = '/' + newInput;
      addedLeadingSlash = true;
    }

    // Calculate cursor position after the inserted segment (no trailing /)
    const newCursorPosition = (addedLeadingSlash ? 1 : 0) +
                              beforeSegment.length +
                              segmentWithSeparator.length;

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
    currentPath,
    isValidPath,
    operationSuggestions,
    fetchedKeysCache,

    // Methods
    acceptSuggestion,
    handleKeyDown,
    handleInput,
    handleCursorChange,
    executeHashpath,
    reset,
    initializeDevices,
    searchDevices,
    fetchAvailableKeys
  };
}