# Path-Aware Device Autocomplete - Test Cases

## Overview
This document outlines test cases for the path-aware device autocomplete functionality in HyperBEAM launch mode.

## Test Setup
1. Open Argo in a browser
2. Press Tab with empty search input to enter HyperBEAM launch mode
3. The input placeholder should change to "Enter device name (e.g., compute@1.0)..."

## Test Cases

### Test 1: Basic Device Completion
**Input:** `~com`
**Cursor Position:** End of input (after 'm')
**Action:** Press Tab or select from dropdown
**Expected Result:**
- Input becomes: `~compute@1.0`
- Cursor positioned after the device name

### Test 2: Mid-Path Completion (Single Device)
**Input:** `~cache@1.0/~com/~json@1.0`
**Cursor Position:** Between 'o' and 'm' in `~com` (position 16)
**Action:** Press Tab to complete
**Expected Result:**
- Input becomes: `~cache@1.0/~compute@1.0/~json@1.0`
- Only the middle device name is replaced
- Cursor positioned after `~compute@1.0`

### Test 3: Completion at Start of Path
**Input:** `~com/~json@1.0/~cache@1.0`
**Cursor Position:** After '~com' (position 4)
**Action:** Press Tab to complete
**Expected Result:**
- Input becomes: `~compute@1.0/~json@1.0/~cache@1.0`
- Only the first device name is replaced
- Cursor positioned after `~compute@1.0`

### Test 4: Completion at End of Path
**Input:** `~json@1.0/~cache@1.0/~com`
**Cursor Position:** End of input
**Action:** Press Tab to complete
**Expected Result:**
- Input becomes: `~json@1.0/~cache@1.0/~compute@1.0`
- Only the last device name is replaced
- Cursor positioned at the end

### Test 5: Cursor in Middle of Device Name
**Input:** `~cache@1.0/~compute@1.0/~json@1.0`
**Cursor Position:** Between 'p' and 'u' in `~compute` (position 16)
**Modify to:** `~cache@1.0/~comute@1.0/~json@1.0` (remove 'p')
**Type:** 'c' to make it `~comcute`
**Action:** Press Tab to complete with `~compress@1.0`
**Expected Result:**
- Input becomes: `~cache@1.0/~compress@1.0/~json@1.0`
- The entire `~comcute@1.0` segment is replaced
- Cursor positioned after `~compress@1.0`

### Test 6: Arrow Key Navigation
**Input:** `~com`
**Cursor Position:** End of input
**Action:** Arrow Down to select different suggestion, then Tab
**Expected Result:**
- Selected device name replaces `~com`
- Cursor positioned appropriately

### Test 7: Launch Hashpath
**Input:** `~compute@1.0/~json@1.0`
**Action:** Press Enter
**Expected Result:**
- New tab opens with URL: `https://forward.computer/~compute@1.0/~json@1.0`
- Suggestions dropdown closes

### Test 8: Auto-Add Leading Slash (First Device)
**Input:** `comp` (no leading slash)
**Action:** Select `~compute@1.0` from dropdown
**Expected Result:**
- Input becomes: `/~compute@1.0/`
- Leading `/` is automatically added
- Trailing `/` is automatically added
- Cursor positioned after the trailing `/`

### Test 9: Auto-Add Trailing Slash (Second Device)
**Input:** `/~cache@1.0/json`
**Action:** Select `~json@1.0` from dropdown
**Expected Result:**
- Input becomes: `/~cache@1.0/~json@1.0/`
- Trailing `/` is automatically added after the device
- Cursor positioned after the trailing `/`

### Test 10: Completion Without Tilde Prefix
**Input:** `meta` (no ~ prefix)
**Action:** Select `~meta@1.0` from dropdown
**Expected Result:**
- Input becomes: `/~meta@1.0/`
- Device name is correctly prefixed with `~`
- Leading `/` and trailing `/` are added
- Cursor positioned after the trailing `/`

### Test 11: Multiple Devices Without Prefix
**Input:** `/~compute@1.0/json`
**Action:** Select `~json@1.0`
**Expected Result:**
- Input becomes: `/~compute@1.0/~json@1.0/`
- Second device gets correct `~` prefix
- Trailing `/` is added
- Ready to type the next device name

## Implementation Details

### Key Components Modified

1. **useHashpathAutocomplete.js**
   - Fixed boundary detection bug (deviceStart and deviceEnd initialization)
   - Smart replacement algorithm that finds device boundaries using '/' separators

2. **SearchBar.vue**
   - Integrated full composable functionality
   - Added `hashpathCursorPosition` tracking
   - Updated `handleHashpathInput` to sync with composable
   - Updated `handleHashpathCursorChange` to track cursor movements
   - Enhanced keyboard handlers for Tab/Enter in hashpath mode
   - Updated device suggestion handler to use path-aware replacement

### Algorithm Overview

The path-aware replacement algorithm:

1. **Find device start**: Look backward from cursor position until '/' is found (or start of string)
2. **Find device end**: Look forward from cursor position until '/' is found (or end of string)
3. **Replace segment**: Replace only the text between device start and device end
4. **Position cursor**: Place cursor immediately after the inserted device name

This ensures that only the device name at the cursor position is replaced, preserving the rest of the path structure.

## Manual Testing Instructions

To manually test this implementation:

1. Start the development server:
   ```bash
   bun run dev
   ```

2. Open the browser to the local development URL

3. Press Tab with empty search to enter HyperBEAM launch mode

4. Try each test case above

5. Verify that:
   - Device suggestions appear when typing device names starting with '~'
   - Tab/Enter complete the device at the cursor position
   - Arrow keys navigate suggestions
   - Cursor is positioned correctly after completion
   - Multiple devices in a path are handled independently

## Expected Behavior Summary

The path-aware autocomplete should:
- ✅ Only replace the device segment containing the cursor
- ✅ Preserve other parts of the path
- ✅ Work correctly at the start, middle, or end of a path
- ✅ Handle cursor positions anywhere within a device name
- ✅ Support keyboard navigation (Arrow keys, Tab, Enter, Escape)
- ✅ Launch the complete hashpath when Enter is pressed without suggestions
- ✅ Show suggestions for all devices in the path, not just the first one

## Bug Fix Log

### Issue: No Suggestions After First Device (2025-10-22)

**Problem:**
After entering the first device (e.g., `~compute@1.0/`), typing a second device name showed no suggestions.

**Root Cause:**
The `filteredSuggestions` computed property was searching with the entire query string (`~compute@1.0/~m`) instead of extracting just the current segment at the cursor position (`~m`).

**Solution:**
Updated `filteredSuggestions` to extract the current device segment at cursor position:
```javascript
// Extract current device segment at cursor position
const beforeCursor = query.value.substring(0, hashpathCursorPosition.value);
const segments = beforeCursor.split('/');
const currentSegment = segments[segments.length - 1] || '';

// Search only the current segment
if (currentSegment && currentSegment.startsWith('~') && currentSegment.length >= 2) {
    const devices = searchDevices(currentSegment.toLowerCase(), 8);
    // ... return suggestions
}
```

**Files Modified:**
- `src/components/SearchBar.vue` (lines 206-228)

**Test Case:**
1. Enter HyperBEAM launch mode (Tab with empty input)
2. Type: `~compute@1.0/~m`
3. Expected: Suggestions appear for `~meta@1.0` and `~monitor@1.0`
4. Press Tab to complete
5. Expected: Path becomes `~compute@1.0/~meta@1.0` (or selected device)
