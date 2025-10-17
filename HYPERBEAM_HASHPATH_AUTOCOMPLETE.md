# HyperBEAM Hashpath Autocomplete Implementation

## Overview

This document provides a detailed analysis of the hashpath autocomplete implementation in the [HyperBEAM Explorer](https://github.com/permaweb/hb-explorer) project, implemented by Dylan Shade (dpshade). This implementation serves as a reference for building similar autocomplete functionality in Argo.

**Context**: HyperBEAM is an implementation of the AO-Core protocol that enables decentralized computing. Hashpaths are a mechanism for referencing locations in a program's state-space and are accessed via structured HTTP URLs (e.g., `~compute@1.0/process/123/serialize~json@1.0`).

## Architecture

The autocomplete system consists of three main components:

1. **useDeviceAutocomplete Hook** - State management and keyboard interactions
2. **AutocompleteDropdown Component** - UI rendering and display
3. **Device Names Helper** - Data fetching, caching, and search

## Component Deep Dive

### 1. useDeviceAutocomplete Hook

**Location**: `src/hooks/useDeviceAutocomplete.tsx`

**Purpose**: Manages autocomplete state, keyboard navigation, and path manipulation logic.

#### Key Features

- **Path Parsing**: Splits input by `/` to identify the current segment being typed
- **Real-time Filtering**: Updates suggestions as user types
- **Keyboard Navigation**: Arrow keys, Tab, Enter, Escape
- **Cursor Management**: Maintains cursor position after autocomplete
- **Mid-word Completion**: Handles Tab completion even when cursor is in middle of device name

#### Interface

```typescript
export interface UseDeviceAutocompleteProps {
    inputValue: string;
    cursorPosition: number;
    inputRef: React.RefObject<HTMLInputElement>;
    onValueChange: (value: string, cursorPosition: number) => void;
    onAutoSubmit?: (completedPath?: string) => void;
}

export interface UseDeviceAutocompleteReturn {
    showAutocomplete: boolean;
    autocompleteOptions: string[];
    selectedOptionIndex: number;
    handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    acceptAutocomplete: (deviceName: string) => void;
    setShowAutocomplete: (show: boolean) => void;
}
```

#### Core Logic

**Path Segment Detection**:
```typescript
// Extract the segment being typed at cursor position
const beforeCursor = inputValue.substring(0, cursorPosition);
const segments = beforeCursor.split('/');
const currentSegment = segments[segments.length - 1];
```

**Search and Filter**:
```typescript
if (currentSegment && currentSegment.length > 0) {
    const matches = searchDeviceNamesSync(currentSegment);
    if (matches.length > 0) {
        setAutocompleteOptions(matches);
        setShowAutocomplete(true);
        setSelectedOptionIndex(0);
    }
}
```

**Tab Completion Logic** (handles mid-word completion):
```typescript
const acceptAutocomplete = (deviceName: string) => {
    // Find device boundaries
    let deviceStart = 0;
    let deviceEnd = inputValue.length;

    // Look backwards for '/'
    for (let i = cursorPosition - 1; i >= 0; i--) {
        if (inputValue[i] === '/') {
            deviceStart = i + 1;
            break;
        }
    }

    // Look forwards for '/'
    for (let i = cursorPosition; i < inputValue.length; i++) {
        if (inputValue[i] === '/') {
            deviceEnd = i;
            break;
        }
    }

    // Replace entire device name
    const beforeDevice = inputValue.substring(0, deviceStart);
    const afterDevice = inputValue.substring(deviceEnd);
    const newPath = beforeDevice + deviceName + afterDevice;

    const newCursorPosition = deviceStart + deviceName.length;
    onValueChange(newPath, newCursorPosition);
};
```

**Keyboard Navigation**:
```typescript
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete && autocompleteOptions.length > 0) {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedOptionIndex((prev) =>
                    prev < autocompleteOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedOptionIndex((prev) =>
                    prev > 0 ? prev - 1 : autocompleteOptions.length - 1
                );
                break;
            case 'Tab':
                e.preventDefault();
                e.stopPropagation();
                acceptAutocompleteAndSubmit(autocompleteOptions[selectedOptionIndex]);
                return;
            case 'Enter':
                if (selectedOptionIndex >= 0) {
                    e.preventDefault();
                    acceptAutocompleteAndSubmit(autocompleteOptions[selectedOptionIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowAutocomplete(false);
                break;
        }
    }
};
```

**Auto-Submit Feature**:
After accepting autocomplete, the system can automatically submit the completed path:
```typescript
const acceptAutocompleteAndSubmit = (selectedOption: string) => {
    acceptAutocomplete(selectedOption);
    if (onAutoSubmit) {
        setTimeout(() => {
            // Calculate completed path and trigger submission
            const completedPath = /* ... path calculation ... */;
            onAutoSubmit(completedPath);
        }, 0);
    }
};
```

### 2. AutocompleteDropdown Component

**Location**: `src/components/molecules/AutocompleteDropdown/AutocompleteDropdown.tsx`

**Purpose**: Renders the visual dropdown menu with suggestions.

#### Key Features

- **Portal Rendering**: Uses `createPortal` to render dropdown in document.body
- **Fixed Positioning**: Calculates absolute position based on input field
- **Dynamic Updates**: Re-positions on scroll/resize
- **Visual Hints**: Shows "Tab" hint on selected option
- **Hover Support**: Highlights options on mouse hover

#### Interface

```typescript
export interface AutocompleteDropdownProps {
    options: string[];
    selectedIndex: number;
    onSelect: (option: string) => void;
    visible: boolean;
    showTabHint?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
}
```

#### Position Calculation

```typescript
const updatePosition = React.useCallback(() => {
    if (visible && inputRef?.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setPosition({
            top: rect.bottom + 7.5,
            left: rect.left,
            width: rect.width,
        });
    }
}, [visible, inputRef]);
```

#### Render Logic

```typescript
return createPortal(
    <S.Dropdown
        style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
        }}
    >
        {options.map((option, index) => (
            <S.Option
                key={option}
                isSelected={index === selectedIndex}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option);
                }}
            >
                {option}
                {showTabHint && index === selectedIndex && (
                    <S.TabHint>Tab</S.TabHint>
                )}
            </S.Option>
        ))}
    </S.Dropdown>,
    document.body
);
```

#### Styling

**Dropdown Container**:
```typescript
export const Dropdown = styled.div`
    position: absolute;
    top: calc(100% - 2px);
    left: 0;
    width: 100%;
    max-height: 200px;
    overflow-y: auto;
    background: ${(props) => props.theme.colors.container.primary.background};
    border: 2px solid ${(props) => props.theme.colors.form.border};
    border-top: none;
    border-radius: 0 0 ${STYLING.dimensions.radius.primary} ${STYLING.dimensions.radius.primary};
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;
```

**Option Item**:
```typescript
export const Option = styled.div<{ isSelected: boolean }>`
    padding: 10px 12.5px;
    cursor: pointer;
    font-size: ${(props) => props.theme.typography.size.xSmall};
    font-family: ${(props) => props.theme.typography.family.alt1};
    color: ${(props) => props.theme.colors.font.primary};
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: ${(props) =>
        props.isSelected
            ? props.theme.colors.container.alt2.background
            : 'transparent'
    };

    &:hover {
        background: ${(props) => props.theme.colors.container.alt2.background};
    }
`;
```

**Tab Hint Badge**:
```typescript
export const TabHint = styled.span`
    background: ${(props) => props.theme.colors.container.alt1.background};
    color: ${(props) => props.theme.colors.font.alt1};
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;
```

### 3. Device Names Helper

**Location**: `src/helpers/deviceNames.ts`

**Purpose**: Manages device name data - fetching, caching, and searching.

#### Key Features

- **API Integration**: Fetches from `HB_ENDPOINTS.devices`
- **Caching**: In-memory cache with fallback to hardcoded list
- **Fallback Data**: 45+ built-in device names
- **Sync/Async APIs**: Provides both async and synchronous access
- **Search Function**: Case-insensitive substring matching

#### Device Data Structure

```typescript
export interface DeviceInfo {
    module: string;
    name: string;
}
```

#### Built-in Devices (Fallback)

The system includes 45 fallback device names:

```typescript
const FALLBACK_DEVICE_NAMES: Record<string, DeviceInfo> = {
    '1': { module: 'dev_apply', name: '~apply@1.0' },
    '2': { module: 'dev_codec_ans104', name: '~ans104@1.0' },
    '3': { module: 'dev_cu', name: '~compute@1.0' },
    '4': { module: 'dev_cache', name: '~cache@1.0' },
    '5': { module: 'dev_cacheviz', name: '~cacheviz@1.0' },
    '6': { module: 'dev_cron', name: '~cron@1.0' },
    '7': { module: 'dev_dedup', name: '~dedup@1.0' },
    '8': { module: 'dev_delegated_compute', name: '~delegated-compute@1.0' },
    '9': { module: 'dev_faff', name: '~faff@1.0' },
    '10': { module: 'dev_codec_flat', name: '~flat@1.0' },
    // ... 35 more devices
};
```

Common devices include:
- `~compute@1.0` - Computational unit device
- `~json@1.0` - JSON codec
- `~lua@5.3a` - Lua interpreter
- `~wasm64@1.0` - WebAssembly runtime
- `~cache@1.0` - Caching device
- `~router@1.0` - Routing device
- `~scheduler@1.0` - Scheduler device

#### Data Fetching

```typescript
async function fetchDeviceNames(): Promise<Record<string, DeviceInfo>> {
    if (deviceNamesCache) {
        return deviceNamesCache;
    }

    try {
        const data = await hbFetch(HB_ENDPOINTS.devices, {
            json: true,
            rawBodyOnly: true
        });

        if (data && typeof data === 'object') {
            // Process and ensure ~ prefix
            const processedData: Record<string, DeviceInfo> = {};
            Object.entries(data).forEach(([key, device]: [string, any]) => {
                if (device && device.name) {
                    processedData[key] = {
                        module: device.module,
                        name: device.name.startsWith('~')
                            ? device.name
                            : `~${device.name}`,
                    };
                }
            });

            deviceNamesCache = processedData;
            deviceNamesList = Object.values(processedData)
                .map((device: any) => device.name)
                .sort();
            return processedData;
        }
    } catch (error) {
        console.warn('Failed to fetch device names, using fallback:', error);
        deviceNamesCache = FALLBACK_DEVICE_NAMES;
        deviceNamesList = Object.values(FALLBACK_DEVICE_NAMES)
            .map((device) => device.name)
            .sort();
        return FALLBACK_DEVICE_NAMES;
    }
}
```

#### Search Implementation

```typescript
export function searchDeviceNamesSync(query: string): string[] {
    if (!query) return [];

    const deviceList = getDeviceNameListSync();
    const lowerQuery = query.toLowerCase();

    // Don't show suggestions if there's an exact match
    const exactMatch = deviceList.find(
        (name) => name && name.toLowerCase() === lowerQuery
    );
    if (exactMatch) return [];

    // Return up to 10 matches
    return deviceList
        .filter((name) => name && name.toLowerCase().includes(lowerQuery))
        .slice(0, 10);
}
```

#### Proxy for Lazy Loading

```typescript
export const DEVICE_NAMES = new Proxy({} as Record<string, DeviceInfo>, {
    get(_target, prop) {
        if (deviceNamesCache) {
            return deviceNamesCache[prop as string];
        }
        return FALLBACK_DEVICE_NAMES[prop as string];
    },
    ownKeys() {
        return Object.keys(deviceNamesCache || FALLBACK_DEVICE_NAMES);
    },
    has(_target, prop) {
        return prop in (deviceNamesCache || FALLBACK_DEVICE_NAMES);
    },
});
```

## Integration Example

Here's how the autocomplete is integrated into the HyperPath component:

```typescript
export default function HyperPath(props: { path: string; onPathChange: Function }) {
    const [inputPath, setInputPath] = React.useState<string>(props.path);
    const [cursorPosition, setCursorPosition] = React.useState<number>(0);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Initialize autocomplete hook
    const {
        showAutocomplete,
        autocompleteOptions,
        selectedOptionIndex,
        handleKeyDown,
        acceptAutocomplete,
        setShowAutocomplete
    } = useDeviceAutocomplete({
        inputValue: inputPath,
        cursorPosition,
        inputRef,
        onValueChange: (value, newCursorPosition) => {
            setInputPath(value);
            setCursorPosition(newCursorPosition);
        },
        onAutoSubmit: (completedPath) => {
            // Optional: auto-submit completed path
            handleSubmit(completedPath);
        }
    });

    // Track cursor position
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPosition = e.target.selectionStart || 0;
        setInputPath(newValue);
        setCursorPosition(newCursorPosition);
    };

    const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement;
        setCursorPosition(target.selectionStart || 0);
    };

    return (
        <div>
            <FormField
                ref={inputRef}
                value={inputPath}
                onChange={handleInputChange}
                onClick={handleInputClick}
                onKeyDown={handleKeyDown}
                onKeyPress={handleKeyPress}
            />
            <AutocompleteDropdown
                visible={showAutocomplete}
                options={autocompleteOptions}
                selectedIndex={selectedOptionIndex}
                onSelect={acceptAutocomplete}
                showTabHint={true}
                inputRef={inputRef}
            />
        </div>
    );
}
```

## Additional Features

### Path Validation

Real-time path validation with visual feedback:

```typescript
const [cacheStatus, setCacheStatus] =
    React.useState<'default' | 'success' | 'error'>('default');

React.useEffect(() => {
    if (!inputPath) {
        setCacheStatus('default');
        return;
    }

    const checkPath = async () => {
        try {
            const validationPath = `${inputPath}/~cacheviz@1.0/index`;
            const mainRes = await fetch(`${window.hyperbeamUrl}/${validationPath}`);

            if (mainRes.status === 200) {
                setCacheStatus('success'); // Green border
            } else {
                setCacheStatus('error'); // Red border
            }
        } catch (e: any) {
            setCacheStatus('error');
        }
    };

    const timeoutId = setTimeout(checkPath, 300); // Debounce
    return () => clearTimeout(timeoutId);
}, [inputPath]);
```

### Keyboard Shortcuts

Additional keyboard enhancements:

```typescript
// Cmd/Ctrl + K to focus search
React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            inputRef.current?.focus();
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Sample Paths

Quick access to common paths:

```typescript
const SAMPLE_PATHS = [
    {
        path: '~meta@1.0/info',
        label: 'Node Info',
        description: 'Get information about this HyperBEAM node',
        icon: ASSETS.info,
    },
    {
        path: '~meta@1.0/devices',
        label: 'Available Devices',
        description: 'List computational devices available on this node',
        icon: ASSETS.tools,
    },
    {
        path: '~meta@1.0/info/address',
        label: 'Operator Address',
        description: 'Get the wallet address of the node operator',
        icon: ASSETS.wallet,
    },
];
```

## User Experience Highlights

### 1. Smart Device Detection
- Autocomplete only shows when typing a device segment
- Automatically hides when exact match is found
- Updates in real-time as user types

### 2. Tab Completion Anywhere
- Works even when cursor is in the middle of a device name
- Replaces the entire device name intelligently
- Preserves surrounding path structure

### 3. Auto-Submit After Completion
- Optional automatic submission after accepting suggestion
- 1-second delay with loading spinner for better UX
- Smooth transition from completion to results

### 4. Visual Feedback
- Green/red border indicates path validity
- "Tab" hint badge on selected suggestion
- Hover states for mouse users
- Keyboard selection highlighting

### 5. Graceful Fallback
- Works offline with 45 built-in device names
- Seamlessly upgrades to API data when available
- No errors if API is unavailable

## Implementation Timeline

Key commits from Dylan Shade (dpshade):

1. **July 30, 2025 - Initial Implementation**
   - Commit: `38ea896` - "feat: implement autocomplete dropdown component for device names and enhance form field interactions"
   - Added AutocompleteDropdown component
   - Enhanced FormField with keyboard handlers
   - Integrated device name search

2. **July 30, 2025 - Device Caching**
   - Commit: `3273442` - "feat: implement device names caching and fetching mechanism"
   - Added async device fetching
   - Implemented caching layer
   - Preload on app startup

3. **July 30, 2025 - UX Polish**
   - Commit: `d3dd6c4` - "feat: cmd + k focus search"
   - Commit: `2942c5f` - "fix: natural waiting time after submit"

4. **July 31, 2025 - Mid-word Completion**
   - Commit: `3bad40e` - "fix: tab to complete in the middle of a device name"
   - Improved device boundary detection
   - Enhanced cursor management

5. **July 31, 2025 - Auto-Submit**
   - Commit: `0a313ef` - "feat: implement auto-submit functionality with spinner after 1 sec"
   - Commit: `a3eb53c` - "fix: enhance HyperPath auto-submit logic and update spinner animations"

## Application to Argo

### Relevance

This autocomplete system is directly applicable to Argo's planned **Hyperbeam Integration** feature (mentioned in README.md). The same patterns can be adapted for:

1. **Device Name Autocomplete**: Help users discover and navigate HyperBEAM devices
2. **Hashpath Building**: Intelligently construct valid hashpaths
3. **Quick Navigation**: Fast access to common HyperBEAM endpoints
4. **Path Validation**: Real-time feedback on path validity

### Adaptation Strategy

**For Argo Implementation**:

1. **Convert to Vue 3 Composition API**
   - Transform React hooks to Vue composables
   - Use `ref`, `computed`, `watch` instead of React state
   - Replace `useEffect` with `watchEffect`

2. **Integrate with Existing Filters**
   - Add "HyperBEAM" as a filter mode
   - Reuse filter selection UI patterns
   - Maintain consistent keyboard navigation

3. **Leverage Existing Patterns**
   - Similar to ArNS undername autocomplete
   - Use existing dropdown styling
   - Follow Argo's Vue component structure

4. **Data Source**
   - Create `useHyperbeamDevices` composable
   - Fetch from HyperBEAM node API
   - Cache in localStorage for offline use

5. **URL Generation**
   - Convert hashpath to full HyperBEAM URL
   - Handle redirection to HyperBEAM node
   - Support local node configuration

### Example Vue Composable

```javascript
// composables/useHyperbeamAutocomplete.js
import { ref, computed, watch } from 'vue'
import { searchHyperbeamDevices } from '@/helpers/hyperbeam'

export function useHyperbeamAutocomplete(inputValue, cursorPosition) {
  const suggestions = ref([])
  const selectedIndex = ref(0)
  const showDropdown = ref(false)

  // Parse current segment at cursor
  const currentSegment = computed(() => {
    const beforeCursor = inputValue.value.substring(0, cursorPosition.value)
    const segments = beforeCursor.split('/')
    return segments[segments.length - 1]
  })

  // Update suggestions when segment changes
  watch(currentSegment, async (segment) => {
    if (!segment) {
      showDropdown.value = false
      return
    }

    const matches = await searchHyperbeamDevices(segment)
    if (matches.length > 0) {
      suggestions.value = matches
      showDropdown.value = true
      selectedIndex.value = 0
    } else {
      showDropdown.value = false
    }
  })

  const acceptSuggestion = (deviceName) => {
    // Find device boundaries and replace
    // Similar logic to React implementation
    // Return new value and cursor position
  }

  const handleKeyDown = (event) => {
    if (!showDropdown.value) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length
        break
      case 'ArrowUp':
        event.preventDefault()
        selectedIndex.value = selectedIndex.value === 0
          ? suggestions.value.length - 1
          : selectedIndex.value - 1
        break
      case 'Tab':
        event.preventDefault()
        acceptSuggestion(suggestions.value[selectedIndex.value])
        break
      case 'Escape':
        event.preventDefault()
        showDropdown.value = false
        break
    }
  }

  return {
    suggestions,
    selectedIndex,
    showDropdown,
    acceptSuggestion,
    handleKeyDown
  }
}
```

## Performance Considerations

### Optimization Strategies

1. **Debouncing**: 300ms debounce on validation checks
2. **Caching**: In-memory cache prevents repeated API calls
3. **Lazy Loading**: Device list loaded on first use
4. **Limited Results**: Maximum 10 suggestions shown
5. **Portal Rendering**: Dropdown in document.body prevents overflow issues

### Memory Management

- Single cache instance shared across components
- Fallback data included in bundle (small footprint)
- No memory leaks from event listeners (proper cleanup)

## Accessibility

### Keyboard Support

- ✅ Full keyboard navigation (arrows, tab, enter, escape)
- ✅ Cmd/Ctrl+K to focus search
- ✅ Clear visual indication of selected item
- ✅ No mouse required

### Screen Reader Support

To enhance accessibility, consider adding:

```typescript
// ARIA attributes for dropdown
<S.Dropdown
    role="listbox"
    aria-label="Device name suggestions"
>
    {options.map((option, index) => (
        <S.Option
            key={option}
            role="option"
            aria-selected={index === selectedIndex}
            onClick={...}
        >
            {option}
        </S.Option>
    ))}
</S.Dropdown>
```

## Testing Recommendations

### Unit Tests

1. **Path Parsing**
   - Test segment extraction at various cursor positions
   - Verify device boundary detection
   - Test with multiple slashes

2. **Search Logic**
   - Case-insensitive matching
   - Exact match hiding
   - Result limiting (max 10)

3. **Autocomplete Acceptance**
   - Mid-word replacement
   - Path preservation
   - Cursor positioning

### Integration Tests

1. **Keyboard Navigation**
   - Arrow key movement
   - Tab completion
   - Enter selection
   - Escape dismissal

2. **API Integration**
   - Successful fetch
   - Fallback on failure
   - Cache hit/miss

3. **Visual Updates**
   - Dropdown positioning
   - Scroll/resize handling
   - Theme support

## Resources

### References

- **HyperBEAM Explorer Repository**: https://github.com/permaweb/hb-explorer
- **PR #390**: https://github.com/permaweb/HyperBEAM/pull/390
- **HyperBEAM Documentation**: https://permaweb.github.io/HyperBEAM/
- **AO-Core Protocol**: https://ao.arweave.dev/

### Related Commits

- `38ea896` - Initial autocomplete implementation
- `3bad40e` - Tab-to-complete mid-device-name fix
- `3273442` - Device names caching mechanism
- `0a313ef` - Auto-submit with spinner
- `a3eb53c` - Enhanced auto-submit logic
- `d3dd6c4` - Cmd+K focus search

## Conclusion

The HyperBEAM hashpath autocomplete implementation demonstrates a robust, user-friendly approach to navigating complex computational paths. Its architecture is modular, performant, and provides excellent UX through intelligent keyboard navigation and visual feedback.

Key takeaways for Argo implementation:

1. **Modular Design**: Separate concerns (state, UI, data)
2. **Smart Parsing**: Understand path structure and cursor context
3. **Progressive Enhancement**: Work offline, enhance when online
4. **UX Polish**: Tab hints, validation feedback, keyboard shortcuts
5. **Performance**: Caching, debouncing, limited results

This system can serve as a strong foundation for building similar autocomplete functionality in Argo's planned Hyperbeam integration.
