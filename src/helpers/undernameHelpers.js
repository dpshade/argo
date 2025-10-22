/**
 * Helper functions for undername operations
 */

/**
 * Parse undername response data into standardized format
 */
export function parseUndernameResponse(undernameData, arnsName, optimalGateway) {
    let records;

    if (undernameData && undernameData.records && typeof undernameData.records === 'object') {
        // Standard response with records object
        records = undernameData.records;
        console.log('Using standard undername response format');
    } else if (typeof undernameData === 'object' && undernameData !== null) {
        // Direct records response
        records = undernameData;
        console.log('Using direct records format');
    } else {
        throw new Error('Unexpected response format - no records found');
    }

    return Object.keys(records)
        .filter((key) => key !== "@")
        .map((key) => ({
            text: `${key}_${arnsName}`,
            description: `Undername for ${arnsName}`,
            url: `https://${key}_${arnsName}.${optimalGateway}`,
            type: "arns_undername",
        }));
}

/**
 * Log detailed error information for undername fetch failures
 */
export function logUndernameError(error, arnsName, processId) {
    console.error(`Error fetching undernames for ${arnsName} via Wayfinder:`, error);

    // Enhanced error handling for gateway failures
    if (error.message.includes('HTTP 404')) {
        console.log(`Process ${processId} not found on gateway, may be pending`);
    } else if (error.message.includes('HTTP 429')) {
        console.log(`Rate limited, retrying later may help`);
    } else if (error.message.includes('HTTP 5')) {
        console.log(`Gateway server error, retrying later may help`);
    } else if (error.message.includes('CORS')) {
        console.log(`CORS issues detected with gateway`);
    } else if (error.message.includes('Failed to fetch')) {
        console.log(`Gateway unavailable for ${processId}`);
    }
}
