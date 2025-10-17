// Centralized Gateway Service using Wayfinder
// Provides optimal gateway selection for all Arweave data access

import {
  Wayfinder,
  FastestPingRoutingStrategy,
  NetworkGatewaysProvider,
} from "@ar.io/wayfinder-core";
import { ARIO } from "@ar.io/sdk";

// Initialize ARIO for accessing AR.IO Network gateway data
const getARIO = async () => {
  return ARIO.mainnet();
};

// State management
let optimalGatewayHostname = "arweave.net"; // Default fallback
let isInitialized = false;
let initializationPromise = null;
let lastRefreshTimestamp = Date.now();

// Minimum time (in milliseconds) before allowing gateway refresh on tab focus
const MIN_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Initialize Wayfinder and select the optimal gateway
 * This is called automatically on first use, but can be called manually for eager initialization
 */
async function initializeGateway() {
  // If already initialized, return immediately
  if (isInitialized) {
    return optimalGatewayHostname;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  initializationPromise = (async () => {
    try {
      console.log("Initializing Wayfinder for optimal gateway selection...");

      // Initialize ARIO for accessing AR.IO Network gateway data
      const ario = await getARIO();

      // Get all gateways from the AR.IO Network
      const gatewaysProvider = new NetworkGatewaysProvider({ ario });
      const gateways = await gatewaysProvider.getGateways();

      console.log(`Fetched ${gateways.length} gateways from AR.IO Network`);

      // Select the fastest gateway using ping strategy
      const routingStrategy = new FastestPingRoutingStrategy();
      const optimalGatewayUrl = await routingStrategy.selectGateway({
        gateways,
      });

      optimalGatewayHostname = optimalGatewayUrl.hostname;
      isInitialized = true;
      lastRefreshTimestamp = Date.now(); // Track when gateway was selected

      console.log(`✅ Wayfinder selected optimal gateway: ${optimalGatewayHostname}`);
      return optimalGatewayHostname;
    } catch (error) {
      console.error(
        "❌ Failed to initialize Wayfinder, using default gateway (arweave.net):",
        error
      );
      // Use default fallback on error
      isInitialized = true; // Mark as initialized to prevent retry loops
      return optimalGatewayHostname;
    }
  })();

  return initializationPromise;
}

/**
 * Get the optimal gateway hostname (e.g., "arweave.net" or "g8way.io")
 * Initializes Wayfinder on first call
 */
export async function getOptimalGatewayHostname() {
  if (!isInitialized) {
    await initializeGateway();
  }
  return optimalGatewayHostname;
}

/**
 * Get the optimal gateway as a full HTTPS URL (e.g., "https://arweave.net")
 * Initializes Wayfinder on first call
 */
export async function getOptimalGatewayUrl() {
  const hostname = await getOptimalGatewayHostname();
  return `https://${hostname}`;
}

/**
 * Build a full URL for accessing Arweave data via the optimal gateway
 * @param {string} path - The path to append (e.g., transaction ID, "/raw/abc123")
 * @returns {Promise<string>} Full URL to access the data
 */
export async function buildGatewayUrl(path) {
  const baseUrl = await getOptimalGatewayUrl();
  // Remove leading slash from path if present to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Get the current gateway hostname synchronously (for use after initialization)
 * Falls back to default if not yet initialized
 */
export function getGatewayHostnameSync() {
  return optimalGatewayHostname;
}

/**
 * Force re-initialization of the gateway (useful for refreshing the optimal gateway)
 */
export async function refreshGateway() {
  isInitialized = false;
  initializationPromise = null;
  return await initializeGateway();
}

// Auto-initialize on module load (non-blocking)
initializeGateway().catch((error) => {
  console.error("Background gateway initialization failed:", error);
});

// Setup automatic refresh when tab comes back into focus after being idle
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    // Only refresh when tab becomes visible (not when it becomes hidden)
    if (document.visibilityState === "visible") {
      const timeSinceLastRefresh = Date.now() - lastRefreshTimestamp;

      // Only refresh if it's been more than MIN_REFRESH_INTERVAL since last refresh
      if (timeSinceLastRefresh > MIN_REFRESH_INTERVAL) {
        console.log(
          `Tab returned after ${Math.round(timeSinceLastRefresh / 60000)} minutes. Refreshing gateway selection...`
        );

        // Refresh in background (don't await, don't block)
        refreshGateway().catch((error) => {
          console.error("Failed to refresh gateway on tab focus:", error);
        });
      }
    }
  });
}

/**
 * Fetch process data via Wayfinder gateway
 * @param {string} processId - The AO process ID
 * @returns {Promise<Object>} Process data response
 */
export async function fetchProcessData(processId) {
  // Prioritize gateways known to work well with CORS
  const corsGateways = [
    'ar-io.dev',     // Most reliable based on testing
    'arweave.net',   // Official gateway
    'g8way.io',      // Alternative gateway
    'arweave.dev'    // Development gateway
  ];
  
  const errors = [];
  
  for (const gateway of corsGateways) {
    try {
      const gatewayUrl = `https://${gateway}/${processId}`;
      console.log(`Trying gateway: ${gatewayUrl}`);
      
      const response = await fetch(gatewayUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });

      if (!response.ok) {
        const error = `Gateway ${gateway} returned ${response.status}`;
        console.warn(error);
        errors.push(error);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Successfully fetched from ${gateway}`);
      return data;
    } catch (error) {
      const errorMsg = `Gateway ${gateway} failed: ${error.message}`;
      console.warn(errorMsg);
      errors.push(errorMsg);
      continue;
    }
  }
  
  // All gateways failed - throw descriptive error
  const errorMessage = `All gateways failed to fetch process data for ${processId}. Errors: ${errors.join('; ')}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export default {
  getOptimalGatewayHostname,
  getOptimalGatewayUrl,
  buildGatewayUrl,
  getGatewayHostnameSync,
  refreshGateway,
  fetchProcessData,
};
