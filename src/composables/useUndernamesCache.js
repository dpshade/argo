/**
 * Composable for managing undernames cache
 */

import { ref } from 'vue';

const undernameCountCache = ref({});
const undernameDataCache = ref({});

export function useUndernamesCache() {
    /**
     * Get cached undernames for an ArNS name
     */
    function getCachedUndernames(arnsName) {
        return undernameDataCache.value[arnsName] || null;
    }

    /**
     * Get cached undername count
     */
    function getCachedCount(arnsName) {
        return undernameCountCache.value[arnsName] || 0;
    }

    /**
     * Check if undernames are cached
     */
    function hasCachedUndernames(arnsName) {
        return !!undernameDataCache.value[arnsName];
    }

    /**
     * Cache undernames data
     */
    function cacheUndernames(arnsName, undernames) {
        // Create new object reference to trigger Vue reactivity
        undernameCountCache.value = {
            ...undernameCountCache.value,
            [arnsName]: undernames.length,
        };
        undernameDataCache.value = {
            ...undernameDataCache.value,
            [arnsName]: undernames,
        };
    }

    /**
     * Clear cache for specific ArNS name
     */
    function clearCache(arnsName) {
        if (arnsName) {
            const { [arnsName]: _, ...restCounts } = undernameCountCache.value;
            const { [arnsName]: __, ...restData } = undernameDataCache.value;
            undernameCountCache.value = restCounts;
            undernameDataCache.value = restData;
        } else {
            // Clear all cache
            undernameCountCache.value = {};
            undernameDataCache.value = {};
        }
    }

    return {
        undernameCountCache,
        undernameDataCache,
        getCachedUndernames,
        getCachedCount,
        hasCachedUndernames,
        cacheUndernames,
        clearCache,
    };
}
