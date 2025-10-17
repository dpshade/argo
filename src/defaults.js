// Special shortcuts for Arweave/AO ecosystem
import { buildGatewayUrl, getOptimalGatewayHostname } from "./helpers/gatewayService";

/**
 * Get special shortcuts with dynamic gateway URLs
 * @returns {Promise<Array>} Array of shortcut objects with URLs using optimal gateway
 */
export async function getSpecialShortcuts() {
  const gateway = await getOptimalGatewayHostname();

  return [
    { name: "tx", url: "https://viewblock.io/arweave/tx/%s", description: "Open tx in ViewBlock" },
    { name: "data", url: `https://${gateway}/%s`, description: "Open tx data" },
    { name: "vb", url: "https://viewblock.io/arweave/tx/%s", description: "Open in ViewBlock" },
  ];
}

/**
 * Get default settings with dynamic gateway URLs
 * @returns {Promise<Object>} Settings object with URLs using optimal gateway
 */
export async function getDefaultSettings() {
  return {
    arweaveExplorer: "https://viewblock.io/arweave/tx/%s",
  };
}

// Legacy exports for backward compatibility (using default gateway as fallback)
// Note: These are static and won't use the optimal gateway selected by Wayfinder
// Prefer using getSpecialShortcuts() and getDefaultSettings() instead
export const specialShortcuts = [
  { name: "tx", url: "https://viewblock.io/arweave/tx/%s", description: "Open tx in ViewBlock" },
  { name: "data", url: "https://arweave.net/%s", description: "Open tx data (fallback)" },
  { name: "vb", url: "https://viewblock.io/arweave/tx/%s", description: "Open in ViewBlock" },
];

export const defaultSettings = {
  arweaveExplorer: "https://viewblock.io/arweave/tx/%s",
};
