/**
 * Fetch HyperBEAM devices and operations from forward.computer
 *
 * This script fetches:
 * 1. All preloaded devices from ~meta@1.0/info/preloaded_devices
 * 2. All operations/keys from ~meta@1.0/info/keys
 *
 * Usage: node scripts/fetch-hyperbeam-devices.js
 */

const META_BASE = 'https://forward.computer/~meta@1.0/info';

async function fetchJSON(url) {
    console.log(`Fetching: ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${url}`);
    }
    return response.json();
}

async function fetchPreloadedDevices() {
    console.log('\n📦 Fetching preloaded devices...\n');

    // Get the list of device links
    const devicesIndex = await fetchJSON(`${META_BASE}/preloaded_devices/serialize~json@1.0`);

    const devices = [];
    const linkNumbers = Object.keys(devicesIndex)
        .filter(key => key.endsWith('+link'))
        .map(key => key.replace('+link', ''))
        .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`Found ${linkNumbers.length} preloaded devices\n`);

    // Fetch details for each device
    for (const linkNum of linkNumbers) {
        try {
            const deviceInfo = await fetchJSON(
                `${META_BASE}/preloaded_devices/${linkNum}/serialize~json@1.0`
            );

            devices.push({
                linkNum,
                name: deviceInfo.name || `device-${linkNum}`,
                module: deviceInfo.module || 'unknown',
                txId: devicesIndex[`${linkNum}+link`]
            });

            console.log(`  ✓ ${deviceInfo.name || linkNum}: ${deviceInfo.module}`);
        } catch (err) {
            console.error(`  ✗ Failed to fetch device ${linkNum}:`, err.message);
        }
    }

    return devices;
}

async function fetchMetaOperations() {
    console.log('\n🔑 Fetching ~meta@1.0 operations...\n');

    try {
        const keys = await fetchJSON(`${META_BASE}/keys/serialize~json@1.0`);

        console.log(`Found ${Object.keys(keys).length} operations on ~meta@1.0:`);
        Object.keys(keys).sort().forEach(key => {
            console.log(`  - ${key}`);
        });

        return keys;
    } catch (err) {
        console.error('Failed to fetch meta operations:', err.message);
        return null;
    }
}

async function main() {
    console.log('🚀 Fetching HyperBEAM device catalog from forward.computer\n');
    console.log('='.repeat(60));

    try {
        const [devices, metaOps] = await Promise.all([
            fetchPreloadedDevices(),
            fetchMetaOperations()
        ]);

        console.log('\n' + '='.repeat(60));
        console.log('\n✅ Fetch complete!\n');
        console.log(`Devices found: ${devices.length}`);
        console.log(`Meta operations: ${metaOps ? Object.keys(metaOps).length : 0}`);

        // Output results to JSON for manual integration
        const output = {
            devices,
            metaOperations: metaOps,
            fetchedAt: new Date().toISOString()
        };

        console.log('\n📄 Full results:');
        console.log(JSON.stringify(output, null, 2));

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    }
}

main();
