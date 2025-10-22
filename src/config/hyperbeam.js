/**
 * HyperBEAM configuration and constants
 */

export const HYPERBEAM_CONFIG = {
    baseUrl: 'https://forward.computer',
    endpoints: {
        devices: '/~meta@1.0/info/preloaded_devices',
        info: '/~meta@1.0/info',
        cache: '/~cacheviz@1.0/json',
        metrics: '/~hyperbuddy@1.0/metrics',
        operator: '/~meta@1.0/info/address'
    }
}

/**
 * Fallback devices for offline functionality
 * Preloaded devices from forward.computer/~meta@1.0/info/preloaded_devices
 * Fetched: 2025-10-22
 */
export const FALLBACK_DEVICES = [
    '~ans104@1.0',
    '~apply@1.0',
    '~arweave@2.9-pre',
    '~auth-hook@1.0',
    '~cache@1.0',
    '~cacheviz@1.0',
    '~compute@1.0',
    '~cookie@1.0',
    '~copycat@1.0',
    '~cron@1.0',
    '~dedup@1.0',
    '~delegated-compute@1.0',
    '~faff@1.0',
    '~flat@1.0',
    '~genesis-wasm@1.0',
    '~greenzone@1.0',
    '~hook@1.0',
    '~http-auth@1.0',
    '~httpsig@1.0',
    '~hyperbuddy@1.0',
    '~json@1.0',
    '~json-iface@1.0',
    '~local-name@1.0',
    '~lookup@1.0',
    '~lua@5.3a',
    '~manifest@1.0',
    '~message@1.0',
    '~meta@1.0',
    '~monitor@1.0',
    '~multipass@1.0',
    '~name@1.0',
    '~node-process@1.0',
    '~p4@1.0',
    '~patch@1.0',
    '~poda@1.0',
    '~process@1.0',
    '~profile@1.0',
    '~push@1.0',
    '~query@1.0',
    '~relay@1.0',
    '~router@1.0',
    '~scheduler@1.0',
    '~secret@1.0',
    '~simple-pay@1.0',
    '~snp@1.0',
    '~stack@1.0',
    '~structured@1.0',
    '~test-device@1.0',
    '~trie@1.0',
    '~volume@1.0',
    '~wasi@1.0',
    '~wasm-64@1.0',
    '~whois@1.0'
]

/**
 * Device descriptions for better UX
 * Based on HyperBEAM preloaded devices and catalog
 */
export const DEVICE_DESCRIPTIONS = {
    // Codec devices
    '~ans104@1.0': 'ANS-104 bundle encoding and verification',
    '~cookie@1.0': 'HTTP cookie codec',
    '~flat@1.0': 'Flat file format codec',
    '~http-auth@1.0': 'HTTP authentication codec',
    '~httpsig@1.0': 'HTTP signature generation and verification (RFC-9421)',
    '~json@1.0': 'JSON codec for serialization and deserialization',
    '~structured@1.0': 'Structured field encoding/decoding',

    // Core devices
    '~apply@1.0': 'Apply operations to messages',
    '~arweave@2.9-pre': 'Arweave blockchain integration',
    '~auth-hook@1.0': 'Authentication hooks',
    '~cache@1.0': 'In-memory caching for messages and state',
    '~cacheviz@1.0': 'Cache visualization and monitoring',
    '~compute@1.0': 'Computational unit device',
    '~copycat@1.0': 'Message copying and duplication',
    '~cron@1.0': 'Schedule messages for one-time or recurring execution',
    '~dedup@1.0': 'Message deduplication',
    '~delegated-compute@1.0': 'Delegated computation execution',
    '~faff@1.0': 'Access control pricing/ledger for p4@1.0',
    '~genesis-wasm@1.0': 'Genesis WASM module loading',
    '~greenzone@1.0': 'Green zone execution environment',
    '~hook@1.0': 'Event hooks and triggers',
    '~hyperbuddy@1.0': 'HyperBEAM monitoring and metrics',
    '~json-iface@1.0': 'AOS 2.0 JSON to HyperBEAM HTTP translation',
    '~local-name@1.0': 'Local name resolution',
    '~lookup@1.0': 'Data lookup and retrieval',
    '~lua@5.3a': 'Lua 5.3 interpreter runtime',
    '~manifest@1.0': 'Manifest management',
    '~message@1.0': 'Core message operations (get, set, commit, keys)',
    '~meta@1.0': 'Node configuration, build info, and metadata',
    '~monitor@1.0': 'System monitoring',
    '~multipass@1.0': 'Multi-pass processing',
    '~name@1.0': 'Name resolution and management',
    '~node-process@1.0': 'Node process management',
    '~p4@1.0': 'Pre/post-processor for hardware monetization',
    '~patch@1.0': 'Message patching and modifications',
    '~poda@1.0': 'Proof of Data Access',
    '~process@1.0': 'Persistent shared executions with customizable scheduler',
    '~profile@1.0': 'Profiling and performance analysis',
    '~push@1.0': 'Push message delivery',
    '~query@1.0': 'Query execution',
    '~relay@1.0': 'Message relay between nodes and HTTP network',
    '~router@1.0': 'Message routing and path resolution',
    '~scheduler@1.0': 'Linear hashpath assignment for deterministic ordering',
    '~secret@1.0': 'Secret management',
    '~simple-pay@1.0': 'Flat-fee pricing device for p4@1.0',
    '~snp@1.0': 'Trusted Execution Environment (TEE) attestation',
    '~stack@1.0': 'Execute ordered set of devices over same inputs',
    '~test-device@1.0': 'Testing device',
    '~trie@1.0': 'Trie data structure operations',
    '~volume@1.0': 'Volume and storage management',
    '~wasi@1.0': 'WebAssembly System Interface',
    '~wasm-64@1.0': 'WebAssembly 64-bit runtime (WAMR)',
    '~whois@1.0': 'WHOIS information lookup'
}