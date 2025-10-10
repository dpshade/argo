// Module for managing glossary search from Arweave glossary index

const GLOSSARY_INDEX_URL = "https://glossary.arweave.net/data/glossary.json";

let glossaryCache = null;
let glossaryTerms = [];
let lastFetchTime = null;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

/**
 * Fetches the glossary index from the remote URL and caches it
 */
async function fetchGlossaryIndex() {
  // Return cached data if it's still fresh
  if (glossaryCache && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
    return glossaryCache;
  }

  try {
    console.log("Fetching glossary index from:", GLOSSARY_INDEX_URL);
    const response = await fetch(GLOSSARY_INDEX_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch glossary index: ${response.status}`);
    }

    const data = await response.json();
    glossaryCache = data;
    lastFetchTime = Date.now();

    // Store terms array
    glossaryTerms = data.terms || [];

    console.log(`Loaded ${glossaryTerms.length} glossary terms`);
    return data;
  } catch (error) {
    console.error("Error fetching glossary index:", error);
    return null;
  }
}

/**
 * Searches through the glossary terms for matches
 * @param {string} query - The search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Array} Array of matching glossary terms with relevance scores
 */
function searchGlossary(query, limit = 5) {
  if (!query || !glossaryTerms.length) {
    return [];
  }

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  // Score each term based on relevance
  const scoredTerms = glossaryTerms.map(term => {
    let score = 0;
    const termLower = term.term.toLowerCase();
    const definitionLower = (term.definition || "").toLowerCase();
    const categoryLower = (term.category || "").toLowerCase();
    const aliasesText = (term.aliases || []).join(" ").toLowerCase();

    // Exact match on term - highest priority
    if (termLower === queryLower) {
      score += 1000;
    }

    // Exact match on alias
    if (term.aliases && term.aliases.some(alias => alias.toLowerCase() === queryLower)) {
      score += 900;
    }

    // Term starts with query
    if (termLower.startsWith(queryLower)) {
      score += 500;
    }

    // Term contains entire query
    if (termLower.includes(queryLower)) {
      score += 250;
    }

    // Alias contains query
    if (aliasesText.includes(queryLower)) {
      score += 200;
    }

    // Category matches
    if (categoryLower.includes(queryLower)) {
      score += 100;
    }

    // Check each query word
    queryWords.forEach(word => {
      if (word.length < 2) return; // Skip very short words

      // Word matches in term
      if (termLower.includes(word)) {
        score += 50;
      }

      // Word matches in definition
      if (definitionLower.includes(word)) {
        score += 20;
      }

      // Word matches in category
      if (categoryLower.includes(word)) {
        score += 15;
      }

      // Word matches in aliases
      if (aliasesText.includes(word)) {
        score += 10;
      }
    });

    return { ...term, score };
  });

  // Filter to only terms with positive scores, sort by score, and limit results
  return scoredTerms
    .filter(term => term.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Initialize the glossary module by fetching the index
 */
async function initializeGlossary() {
  await fetchGlossaryIndex();
}

export { fetchGlossaryIndex, searchGlossary, initializeGlossary };
