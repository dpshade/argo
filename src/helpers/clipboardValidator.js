/**
 * Clipboard validation utilities for Arweave transaction IDs
 */

/**
 * Validates if the given text is a valid Arweave transaction ID
 * @param {string} text - Text to validate
 * @returns {boolean} - True if valid transaction ID
 */
export function isValidArweaveTransactionId(text) {
    if (!text || typeof text !== 'string') {
        return false
    }
    
    const trimmed = text.trim()
    
    // Arweave transaction IDs are 43-44 characters long
    // and use base64 URL-safe characters (alphanumeric + - and _)
    return /^[a-zA-Z0-9_-]+$/.test(trimmed) && 
           (trimmed.length === 43 || trimmed.length === 44)
}

/**
 * Gets content from system clipboard
 * @returns {Promise<string|null>} - Clipboard content or null if failed
 */
export async function getClipboardContent() {
    try {
        return await navigator.clipboard.readText()
    } catch (err) {
        console.error('Failed to read clipboard contents:', err)
        return null
    }
}

/**
 * Validates and extracts transaction ID from clipboard
 * @returns {Promise<string|null>} - Valid transaction ID or null
 */
export async function getValidTransactionFromClipboard() {
    const clipboardText = await getClipboardContent()
    
    if (!clipboardText) {
        return null
    }
    
    return isValidArweaveTransactionId(clipboardText) 
        ? clipboardText.trim() 
        : null
}