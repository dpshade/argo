/**
 * HyperBEAM Device Operations Catalog
 *
 * This catalog contains operation/key definitions for HyperBEAM devices,
 * extracted from the device-keys branch analysis (extracted-keys.md).
 *
 * Structure: Device name → operations array with params and descriptions
 *
 * NOTE: This is a static bandaid solution. Future upgrade path:
 * - Fetch operations dynamically from /~device@version/info/keys endpoints
 * - Parse YAML device specifications when device_yml branch merges
 * - Auto-generate this catalog at build time from HyperBEAM source
 */

export const DEVICE_OPERATIONS = {
    // ============================================
    // CODEC DEVICES
    // ============================================

    '~json@1.0': {
        type: 'codec',
        operations: [
            {
                name: 'serialize',
                description: 'Convert message to JSON string',
                params: ['body', 'status', 'target']
            },
            {
                name: 'deserialize',
                description: 'Parse JSON from path',
                params: ['target']
            },
            {
                name: 'to',
                description: 'Encode message to JSON format',
                params: []
            },
            {
                name: 'from',
                description: 'Decode JSON to message',
                params: []
            }
        ]
    },

    '~ans104@1.0': {
        type: 'codec',
        operations: [
            {
                name: 'committed',
                description: 'Get commitment information from bundle',
                params: ['alg', 'commitment-device', 'commitments', 'committer', 'hashpath', 'original-tags', 'owner', 'signature']
            },
            {
                name: 'content_type',
                description: 'Get content type from bundle',
                params: ['bundle-format', 'bundle-map', 'bundle-version', 'data', 'id', 'manifest', 'owner', 'signature', 'target']
            },
            {
                name: 'from',
                description: 'Decode ANS-104 bundle to message',
                params: ['alg', 'commitments', 'committer']
            },
            {
                name: 'id',
                description: 'Get bundle identifier',
                params: ['body']
            },
            {
                name: 'to',
                description: 'Encode message to ANS-104 bundle format',
                params: ['alg', 'commitment-device', 'commitments', 'committer', 'data', 'id', 'original-tags', 'owner', 'priv', 'signature']
            },
            {
                name: 'verify',
                description: 'Verify bundle signatures and commitments',
                params: ['commitments', 'original-tags', 'trusted-keys']
            }
        ]
    },

    '~httpsig@1.0': {
        type: 'codec',
        operations: [
            {
                name: 'add_content_digest',
                description: 'Add content digest header for HTTP signatures',
                params: ['alg', 'body', 'body-keys', 'commitment-device', 'commitments', 'committer', 'content-digest', 'hashpath', 'priv', 'signature', 'signature-input']
            },
            {
                name: 'add_derived_specifiers',
                description: 'Add derived signature specifiers',
                params: ['alg', 'keyid', 'signature-input']
            },
            {
                name: 'public_keys',
                description: 'Extract public keys from HTTP signature',
                params: ['alg', 'body-keys', 'commitment', 'commitment-device', 'commitments', 'committer', 'id', 'keyid', 'signature', 'signature-input']
            },
            {
                name: 'reset_hmac',
                description: 'Reset HMAC for content',
                params: ['body', 'content-digest']
            },
            {
                name: 'to',
                description: 'Convert to HTTP signature format',
                params: ['authority', 'method', 'path', 'query', 'request-target', 'scheme', 'status', 'target-uri']
            }
        ]
    },

    '~structured@1.0': {
        type: 'codec',
        operations: [
            {
                name: 'decode_value',
                description: 'Decode structured field value',
                params: ['atom', 'binary', 'float', 'integer', 'list']
            },
            {
                name: 'encode_value',
                description: 'Encode value to structured field format',
                params: ['empty-binary', 'empty-list', 'empty-message', 'list']
            },
            {
                name: 'to',
                description: 'Convert to structured field format',
                params: ['empty-binary', 'empty-list', 'empty-message', 'list']
            }
        ]
    },

    '~flat@1.0': {
        type: 'codec',
        operations: [
            {
                name: 'to',
                description: 'Encode to flat file format',
                params: []
            },
            {
                name: 'from',
                description: 'Decode from flat file format',
                params: []
            }
        ]
    },

    // ============================================
    // CORE DEVICES
    // ============================================

    '~cron@1.0': {
        type: 'core',
        operations: [
            {
                name: 'once',
                description: 'Schedule one-time execution at future time',
                params: ['cron-path', 'body', 'description']
            },
            {
                name: 'every',
                description: 'Schedule recurring execution at intervals',
                params: ['cron-path', 'interval', 'path']
            },
            {
                name: 'stop',
                description: 'Stop scheduled task',
                params: ['cron-path', 'interval']
            },
            {
                name: 'info',
                description: 'Get cron device information',
                params: []
            }
        ]
    },

    '~cache@1.0': {
        type: 'core',
        operations: [
            {
                name: 'link',
                description: 'Create cache link',
                params: ['batch', 'body', 'single', 'status', 'type']
            },
            {
                name: 'write',
                description: 'Write to cache',
                params: ['accept', 'body', 'content-type', 'target']
            }
        ]
    },

    '~meta@1.0': {
        type: 'core',
        operations: [
            { name: 'info', description: 'Get node information and configuration', params: [] },
            { name: 'build', description: 'Get build information', params: [] }
        ]
    },

    '~message@1.0': {
        type: 'core',
        operations: [
            {
                name: 'get',
                description: 'Get message value at path',
                params: ['path']
            },
            {
                name: 'set',
                description: 'Set message value at path',
                params: ['path']
            },
            {
                name: 'commit',
                description: 'Create message commitment',
                params: ['commitments', 'committer']
            },
            {
                name: 'committed',
                description: 'Get committed message data',
                params: ['commitment', 'commitment-device', 'commitments', 'device']
            },
            {
                name: 'info',
                description: 'Get message metadata',
                params: ['commitments', 'committers', 'id', 'keys', 'path']
            },
            {
                name: 'keys',
                description: 'List message keys',
                params: []
            }
        ]
    },

    '~process@1.0': {
        type: 'core',
        operations: [
            {
                name: 'compute',
                description: 'Execute process computation',
                params: ['cache-control', 'path', 'process']
            },
            {
                name: 'snapshot',
                description: 'Create process state snapshot',
                params: ['cache-control', 'path', 'process', 'slot', 'store']
            },
            {
                name: 'push',
                description: 'Push messages to process outbox',
                params: []
            },
            {
                name: 'info',
                description: 'Get process information',
                params: []
            }
        ]
    },

    '~scheduler@1.0': {
        type: 'core',
        operations: [
            {
                name: 'checkpoint',
                description: 'Create scheduler checkpoint',
                params: ['assignment', 'assignments', 'block-hash', 'block-height', 'body', 'cache-control', 'location', 'path']
            },
            {
                name: 'assign',
                description: 'Assign message to scheduler',
                params: []
            },
            {
                name: 'assignments',
                description: 'Get scheduler assignments',
                params: []
            }
        ]
    },

    '~relay@1.0': {
        type: 'core',
        operations: [
            {
                name: 'cast',
                description: 'Relay message to another node',
                params: ['body', 'http-client', 'method', 'path', 'relay-body', 'relay-method', 'relay-path', 'requires-sign']
            },
            {
                name: 'send',
                description: 'Send message via relay',
                params: []
            },
            {
                name: 'receive',
                description: 'Receive relayed message',
                params: []
            }
        ]
    },

    '~router@1.0': {
        type: 'core',
        operations: [
            {
                name: 'preprocess',
                description: 'Preprocess routing request',
                params: ['choose', 'explicit', 'match', 'node', 'nodes', 'opts', 'path', 'prefix', 'routes', 'template']
            },
            {
                name: 'register',
                description: 'Register route',
                params: []
            },
            {
                name: 'route',
                description: 'Route message to destination',
                params: []
            },
            {
                name: 'resolve',
                description: 'Resolve routing path',
                params: []
            }
        ]
    }
}

/**
 * Get all operations for a specific device
 * @param {string} deviceName - Device name (e.g., '~json@1.0')
 * @returns {Array<Object>|null} - Array of operation objects or null if device not found
 */
export function getDeviceOperations(deviceName) {
    const device = DEVICE_OPERATIONS[deviceName]
    return device ? device.operations : null
}

/**
 * Search operations for a device by partial name
 * @param {string} deviceName - Device name (e.g., '~json@1.0')
 * @param {string} query - Search query for operation name
 * @param {number} limit - Maximum results to return
 * @returns {Array<Object>} - Filtered operations
 */
export function searchDeviceOperations(deviceName, query, limit = 10) {
    const operations = getDeviceOperations(deviceName)
    if (!operations) return []

    const lowerQuery = query.toLowerCase()
    return operations
        .filter(op => op.name.toLowerCase().includes(lowerQuery))
        .slice(0, limit)
}

/**
 * Check if a device has operations defined
 * @param {string} deviceName - Device name (e.g., '~json@1.0')
 * @returns {boolean} - True if device has operations
 */
export function hasOperations(deviceName) {
    return !!DEVICE_OPERATIONS[deviceName]
}

/**
 * Get all devices with operations
 * @returns {Array<string>} - Array of device names
 */
export function getAllDevicesWithOperations() {
    return Object.keys(DEVICE_OPERATIONS)
}
