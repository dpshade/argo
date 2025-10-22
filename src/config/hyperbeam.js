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
 * Based on common HyperBEAM devices from hb-explorer
 */
export const FALLBACK_DEVICES = [
    '~compute@1.0',
    '~json@1.0', 
    '~lua@5.3a',
    '~wasm64@1.0',
    '~cache@1.0',
    '~router@1.0',
    '~serialize@1.0',
    '~deserialize@1.0',
    '~http@1.0',
    '~https@1.0',
    '~fs@1.0',
    '~db@1.0',
    '~sql@1.0',
    '~redis@1.0',
    '~graphql@1.0',
    '~rest@1.0',
    '~websocket@1.0',
    '~auth@1.0',
    '~crypto@1.0',
    '~hash@1.0',
    '~encode@1.0',
    '~decode@1.0',
    '~compress@1.0',
    '~decompress@1.0',
    '~image@1.0',
    '~video@1.0',
    '~audio@1.0',
    '~text@1.0',
    '~csv@1.0',
    '~xml@1.0',
    '~yaml@1.0',
    '~toml@1.0',
    '~pdf@1.0',
    '~email@1.0',
    '~smtp@1.0',
    '~ftp@1.0',
    '~sftp@1.0',
    '~ssh@1.0',
    '~git@1.0',
    '~docker@1.0',
    '~k8s@1.0',
    '~aws@1.0',
    '~gcp@1.0',
    '~azure@1.0',
    '~monitor@1.0',
    '~log@1.0',
    '~metrics@1.0',
    '~trace@1.0',
    '~alert@1.0',
    '~notify@1.0',
    '~webhook@1.0',
    '~queue@1.0',
    '~stream@1.0',
    '~buffer@1.0',
    '~transform@1.0',
    '~validate@1.0',
    '~sanitize@1.0',
    '~filter@1.0',
    '~sort@1.0',
    '~search@1.0',
    '~index@1.0'
]

/**
 * Device descriptions for better UX
 * Based on HyperBEAM README and device catalog analysis
 */
export const DEVICE_DESCRIPTIONS = {
    // Codec devices
    '~json@1.0': 'JSON codec for serialization and deserialization',
    '~ans104@1.0': 'ANS-104 bundle encoding and verification',
    '~httpsig@1.0': 'HTTP signature generation and verification (RFC-9421)',
    '~structured@1.0': 'Structured field encoding/decoding',
    '~flat@1.0': 'Flat file format codec',

    // Core devices
    '~meta@1.0': 'Node configuration, build info, and metadata',
    '~relay@1.0': 'Message relay between nodes and HTTP network',
    '~wasm64@1.0': 'WebAssembly 64-bit runtime (WAMR)',
    '~json-iface@1.0': 'AOS 2.0 JSON to HyperBEAM HTTP translation',
    '~compute-lite@1.0': 'Lightweight WASM executor for legacy AO processes',
    '~snp@1.0': 'Trusted Execution Environment (TEE) attestation',
    '~p4@1.0': 'Pre/post-processor for hardware monetization',
    '~simple-pay@1.0': 'Flat-fee pricing device for p4@1.0',
    '~faff@1.0': 'Access control pricing/ledger for p4@1.0',
    '~scheduler@1.0': 'Linear hashpath assignment for deterministic ordering',
    '~stack@1.0': 'Execute ordered set of devices over same inputs',
    '~process@1.0': 'Persistent shared executions with customizable scheduler',
    '~cron@1.0': 'Schedule messages for one-time or recurring execution',
    '~cache@1.0': 'In-memory caching for messages and state',
    '~message@1.0': 'Core message operations (get, set, commit, keys)',
    '~router@1.0': 'Message routing and path resolution',

    // Compute devices
    '~lua@5.3a': 'Lua 5.3 interpreter runtime',
    '~compute@1.0': 'Computational unit device'
}