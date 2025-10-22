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
 */
export const DEVICE_DESCRIPTIONS = {
    '~compute@1.0': 'Computational unit device',
    '~json@1.0': 'JSON codec and parser',
    '~lua@5.3a': 'Lua interpreter runtime',
    '~wasm64@1.0': 'WebAssembly 64-bit runtime',
    '~cache@1.0': 'In-memory caching device',
    '~router@1.0': 'Request routing device',
    '~serialize@1.0': 'Data serialization',
    '~deserialize@1.0': 'Data deserialization',
    '~http@1.0': 'HTTP client/server',
    '~https@1.0': 'HTTPS secure client/server',
    '~fs@1.0': 'File system operations',
    '~db@1.0': 'Database operations',
    '~auth@1.0': 'Authentication and authorization',
    '~crypto@1.0': 'Cryptographic operations',
    '~hash@1.0': 'Hashing functions',
    '~encode@1.0': 'Data encoding',
    '~decode@1.0': 'Data decoding',
    '~compress@1.0': 'Data compression',
    '~decompress@1.0': 'Data decompression'
}