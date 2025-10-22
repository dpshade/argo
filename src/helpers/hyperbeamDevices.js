/**
 * HyperBEAM device discovery and management utilities
 */

import { HYPERBEAM_CONFIG, FALLBACK_DEVICES, DEVICE_DESCRIPTIONS } from '@/config/hyperbeam'

let deviceCache = null
let isFetching = false
let fetchPromise = null

/**
 * Fetches available devices from HyperBEAM node
 * @returns {Promise<string[]>} - Array of device names
 */
export async function fetchHyperbeamDevices() {
    // Return cached result if available
    if (deviceCache) {
        console.log('Returning cached devices:', deviceCache.length)
        return deviceCache
    }

    // Return existing promise if fetch is in progress
    if (fetchPromise) {
        console.log('Fetch already in progress, returning existing promise')
        return fetchPromise
    }

    // Create fetch promise
    console.log('Starting device fetch...')
    fetchPromise = performDeviceFetch()
    return fetchPromise
}

/**
 * Internal function to perform the actual fetch
 * @returns {Promise<string[]>} - Array of device names
 */
async function performDeviceFetch() {
    isFetching = true
    
    try {
        console.log(`Fetching devices from ${HYPERBEAM_CONFIG.baseUrl}${HYPERBEAM_CONFIG.endpoints.devices}`)
        
        const response = await fetch(`${HYPERBEAM_CONFIG.baseUrl}${HYPERBEAM_CONFIG.endpoints.devices}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        console.log('Raw device data:', data)

        // Process device data and ensure ~ prefix
        const devices = Object.values(data)
            .map(device => {
                const name = device.name || device
                return name.startsWith('~') ? name : `~${name}`
            })
            .filter(name => name && name.length > 1) // Filter out invalid entries
            .sort()

        console.log(`Successfully fetched ${devices.length} devices:`, devices.slice(0, 10))
        
        deviceCache = devices
        return devices

    } catch (error) {
        console.warn('Failed to fetch devices from HyperBEAM node, using fallback:', error.message)
        
        // Use fallback devices
        const fallbackDevices = [...FALLBACK_DEVICES]
        deviceCache = fallbackDevices
        return fallbackDevices

    } finally {
        isFetching = false
        fetchPromise = null
    }
}

/**
 * Searches devices by query string
 * @param {string} query - Search query
 * @param {number} limit - Maximum results to return
 * @returns {Array<{name: string, description: string}>} - Matching devices with descriptions
 */
export function searchDevices(query, limit = 10) {
    const devices = deviceCache || FALLBACK_DEVICES
    const lowerQuery = query.toLowerCase()

    console.log('Searching devices for query:', query, 'using', deviceCache ? 'cached' : 'fallback', 'devices')

    if (!query || query.length < 1) {
        console.log('Query too short, returning empty results')
        return []
    }

    const matches = devices
        .filter(name => name.toLowerCase().includes(lowerQuery))
        .slice(0, limit)
        .map(name => ({
            name,
            description: DEVICE_DESCRIPTIONS[name] || 'HyperBEAM device'
        }))

    console.log('Found matches:', matches.length, matches)
    return matches
}

/**
 * Gets device description for a given device name
 * @param {string} deviceName - Device name
 * @returns {string} - Device description
 */
export function getDeviceDescription(deviceName) {
    return DEVICE_DESCRIPTIONS[deviceName] || 'HyperBEAM device'
}

/**
 * Checks if a string looks like a device name (starts with ~)
 * @param {string} text - Text to check
 * @returns {boolean} - True if looks like device name
 */
export function isDeviceName(text) {
    return text && text.startsWith('~')
}

/**
 * Checks if a string looks like an Arweave transaction ID
 * @param {string} text - Text to check
 * @returns {boolean} - True if looks like a txID
 */
export function isTransactionId(text) {
    return text && text.length === 43 && /^[a-zA-Z0-9_-]+$/.test(text)
}

/**
 * Parses a hashpath to extract device segments
 * @param {string} hashpath - Full hashpath string
 * @returns {Array<string>} - Array of device segments
 */
export function parseHashpathDevices(hashpath) {
    if (!hashpath) return []
    
    return hashpath
        .split('/')
        .filter(segment => isDeviceName(segment))
}

/**
 * Validates a hashpath structure
 * @param {string} hashpath - Hashpath to validate
 * @returns {boolean} - True if valid structure
 */
export function isValidHashpath(hashpath) {
    if (!hashpath || typeof hashpath !== 'string') {
        return false
    }

    // Remove leading slash if present for validation
    const path = hashpath.startsWith('/') ? hashpath.substring(1) : hashpath
    const segments = path.split('/').filter(s => s.length > 0)

    // Must have at least one segment
    if (segments.length === 0) {
        return false
    }

    // First segment can be either a txID or a device
    const firstSegment = segments[0]
    const isTxId = isTransactionId(firstSegment)
    const isDevice = isDeviceName(firstSegment) && /^~([^@]+)@(.+)$/.test(firstSegment)

    if (!isTxId && !isDevice) {
        return false
    }

    // All remaining segments must be valid devices
    for (let i = 1; i < segments.length; i++) {
        if (!isDeviceName(segments[i])) {
            return false
        }
        // Basic device name validation: ~name@version format
        const match = segments[i].match(/^~([^@]+)@(.+)$/)
        if (!match || !match[1] || !match[2]) {
            return false
        }
    }

    return true
}

/**
 * Clears the device cache (useful for testing or refresh)
 */
export function clearDeviceCache() {
    deviceCache = null
    isFetching = false
    fetchPromise = null
}

/**
 * Gets cache status information
 * @returns {Object} - Cache status
 */
export function getCacheStatus() {
    return {
        isCached: !!deviceCache,
        isFetching,
        deviceCount: deviceCache ? deviceCache.length : 0,
        hasFetchPromise: !!fetchPromise
    }
}