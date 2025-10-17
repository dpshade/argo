// Module for managing documentation search from Fuel permawebllms index

import { getGatewayHostnameSync } from "./gatewayService.js";

const DOCS_INDEX_URL = "https://fuel_permawebllms.arweave.net/docs-index.json";

let docsCache = null;
let docsPages = [];
let lastFetchTime = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetches the docs index from the remote URL and caches it
 */
async function fetchDocsIndex() {
  // Return cached data if it's still fresh
  if (docsCache && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
    return docsCache;
  }

  try {
    console.log("Fetching docs index from:", DOCS_INDEX_URL);
    const response = await fetch(DOCS_INDEX_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch docs index: ${response.status}`);
    }

    const data = await response.json();
    docsCache = data;
    lastFetchTime = Date.now();

    // Get the optimal gateway for URL transformation
    const optimalGateway = getGatewayHostnameSync();
    
    // Flatten all pages from all sites into a single searchable array
    docsPages = [];
    if (data.sites) {
      Object.entries(data.sites).forEach(([siteKey, site]) => {
        if (site.pages && Array.isArray(site.pages)) {
          site.pages.forEach(page => {
            // Transform ArNS URLs to use the current gateway
            let transformedUrl = page.url;
            if (page.url) {
              if (page.url.includes('docs.ar.io')) {
                transformedUrl = page.url.replace('docs.ar.io', `docs.${optimalGateway}`);
                console.log(`Transformed docs URL: ${page.url} -> ${transformedUrl}`);
              } else if (page.url.includes('cookbook.arweave.net')) {
                transformedUrl = page.url.replace('cookbook.arweave.net', `cookbook.${optimalGateway}`);
                console.log(`Transformed cookbook URL: ${page.url} -> ${transformedUrl}`);
              } else if (page.url.includes('cookbook_ao.arweave.net')) {
                transformedUrl = page.url.replace('cookbook_ao.arweave.net', `cookbook_ao.${optimalGateway}`);
                console.log(`Transformed cookbook_ao URL: ${page.url} -> ${transformedUrl}`);
              }
            }
            
            docsPages.push({
              url: transformedUrl,
              title: page.title,
              siteName: page.siteName || site.name,
              breadcrumbs: page.breadcrumbs || [],
              estimatedWords: page.estimatedWords || 0,
              siteKey: page.siteKey || siteKey,
            });
          });
        }
      });
    }

    console.log(`Loaded ${docsPages.length} documentation pages from ${Object.keys(data.sites || {}).length} sites`);
    return data;
  } catch (error) {
    console.error("Error fetching docs index:", error);
    return null;
  }
}

/**
 * Searches through the documentation pages for matches
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Array of matching doc pages with relevance scores
 */
function searchDocs(query, limit = 5) {
  if (!query || !docsPages.length) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  // Score each page based on relevance
  const scoredPages = docsPages.map(page => {
    let score = 0;
    const titleLower = page.title.toLowerCase();
    const siteNameLower = page.siteName.toLowerCase();
    const breadcrumbsText = page.breadcrumbs.join(" ").toLowerCase();

    // Exact match in title - highest priority
    if (titleLower === queryLower) {
      score += 1000;
    }

    // Title starts with query
    if (titleLower.startsWith(queryLower)) {
      score += 500;
    }

    // Title contains entire query
    if (titleLower.includes(queryLower)) {
      score += 250;
    }

    // Site name matches
    if (siteNameLower.includes(queryLower)) {
      score += 100;
    }

    // Check each query word
    queryWords.forEach(word => {
      if (word.length < 2) return; // Skip very short words

      // Word matches in title
      if (titleLower.includes(word)) {
        score += 50;
      }

      // Word matches in breadcrumbs
      if (breadcrumbsText.includes(word)) {
        score += 20;
      }

      // Word matches in site name
      if (siteNameLower.includes(word)) {
        score += 10;
      }
    });

    return { ...page, score };
  });

  // Filter to only pages with positive scores, sort by score, and limit results
  return scoredPages
    .filter(page => page.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Initialize the docs module by fetching the index
 */
async function initializeDocs() {
  await fetchDocsIndex();
}

export { fetchDocsIndex, searchDocs, initializeDocs };
