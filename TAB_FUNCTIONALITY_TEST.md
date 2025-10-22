# Tab Key Functionality Test Guide

## Overview
This guide tests the new Tab key functionality that handles both Arweave transaction ID auto-pasting and HyperBEAM hashpath launch mode.

## Test Scenarios

### 1. Valid Transaction ID Auto-Paste
**Steps:**
1. Ensure the search input is empty and not focused
2. Copy a valid Arweave transaction ID (43-44 characters) to clipboard:
   - Example: `abcdefghij1234567890abcdefghij1234567890abcde` (43 chars)
   - Example: `abcdefghij1234567890abcdefghij1234567890abcdef` (44 chars)
3. Press Tab key
4. **Expected Results:**
   - Transaction ID appears in the input field
   - Green feedback message shows: "Transaction ID pasted: abcdef...abcde"
   - Input is focused
   - After ~1.2 seconds, transaction is automatically processed
   - Transaction shortcuts appear in suggestions

### 2. Invalid Clipboard Content → HyperBEAM Mode
**Steps:**
1. Ensure the search input is empty and not focused
2. Copy invalid content to clipboard:
   - "hello world"
   - "short"
   - "invalid+chars"
3. Press Tab key
4. **Expected Results:**
   - HyperBEAM launcher interface appears
   - Blue indicator shows: "⭐ HyperBEAM Launch Mode Active"
   - Search input placeholder changes to "Press Tab to launch HyperBEAM mode..."
   - Hashpath input is focused

### 3. HyperBEAM Device Autocomplete
**Steps:**
1. Enter HyperBEAM launch mode (via scenario 2)
2. In the hashpath input, type: `~comp`
3. **Expected Results:**
   - Autocomplete dropdown appears with device suggestions
   - "~compute@1.0" should be in the list with description "Computational unit device"
   - Use arrow keys to navigate suggestions
   - Press Tab or Enter to accept suggestion
   - Selected device name replaces the partial input

### 4. Hashpath Validation and Execution
**Steps:**
1. In HyperBEAM mode, enter a valid hashpath:
   - `~compute@1.0`
   - `~json@1.0/parse`
   - `~cache@1.0/get`
2. **Expected Results:**
   - Green checkmark appears when hashpath is valid
   - "Launch" button becomes enabled
   - Clicking Launch opens the hashpath in forward.computer

### 5. Existing Keyboard Navigation Preservation
**Steps:**
1. Type any text in the search input (make it non-empty)
2. Press Tab key
3. **Expected Results:**
   - Browser's default Tab behavior should work (focus next element)
   - Should NOT trigger clipboard checking or HyperBEAM mode
4. Test existing shortcuts:
   - Ctrl/Cmd+K: Should focus search input
   - Ctrl/Cmd+E: Should open editor (if available)
   - Arrow keys: Should navigate suggestions when input has content
   - Escape: Should close suggestions

### 6. Visual Feedback Testing
**Auto-paste Feedback:**
- Green bar appears with success message
- Includes checkmark icon
- Auto-dismisses after 3 seconds

**HyperBEAM Mode Indicator:**
- Blue bar appears with star icon
- Shows "HyperBEAM Launch Mode Active"
- Persists while in launch mode

**Input Styling:**
- Normal state: Default appearance
- HyperBEAM mode: Border color changes to theme color
- Auto-paste: Input shows pasted content immediately

### 7. Edge Cases
**Empty Clipboard:**
1. Clear clipboard content
2. Press Tab with empty input
3. **Expected:** Nothing happens

**Mixed Content Focus:**
1. Type some text in input
2. Press Tab (should use browser default)
3. Clear input
4. Press Tab (should trigger our functionality)

**Rapid Tab Pressing:**
1. Press Tab multiple times quickly
2. **Expected:** Only one action triggers, no duplicate processing

## Debug Information

### Console Logs to Watch For:
- `Tab key pressed with empty input - checking clipboard...`
- `Valid transaction ID found in clipboard: [txId]`
- `Invalid transaction ID - entering hashpath launch mode`
- `Starting device fetch...`
- `Searching devices for query: [query]`
- `Found matches: [count]`

### Network Requests:
- GET `https://forward.computer/~meta@1.0/info/preloaded_devices`
- Should return device list or fall back to built-in devices

## Troubleshooting

### Device Autocomplete Not Working:
1. Check browser console for errors
2. Verify network request to forward.computer succeeds
3. Fallback devices should work even if network fails
4. Check that typing starts with `~` and at least 2 characters

### Tab Key Not Working:
1. Ensure input is completely empty (trim whitespace)
2. Ensure input is not focused
3. Check browser console for JavaScript errors
4. Verify clipboard permissions are granted

### Visual Feedback Missing:
1. Check CSS styles are loading
2. Verify reactive state updates
3. Check for console errors in component rendering

## Success Criteria

✅ **All Test Scenarios Pass**
✅ **No Console Errors**
✅ **Visual Feedback Appears Correctly**
✅ **Existing Functionality Unaffected**
✅ **Responsive Design Works on Mobile**
✅ **Build Completes Successfully**

## Implementation Notes

- Uses forward.computer as HyperBEAM base node
- Implements 45+ fallback devices for offline functionality
- Follows dpshade's hb-explorer patterns for autocomplete
- Maintains backward compatibility with all existing features
- Includes comprehensive error handling and user feedback