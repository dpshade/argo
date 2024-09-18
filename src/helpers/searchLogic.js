import { resolveArNSDomain, checkArNSRecord } from "./arnsResolver";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCachedRedirect(query) {
  // Try session storage first
  let cachedRedirects = JSON.parse(
    sessionStorage.getItem("cachedRedirects") || "{}",
  );

  // If not found in session storage, check local storage
  if (Object.keys(cachedRedirects).length === 0) {
    cachedRedirects = JSON.parse(
      localStorage.getItem("cachedRedirects") || "{}",
    );
  }

  const currentTime = Date.now();

  // Check for an exact match first
  if (
    cachedRedirects[query] &&
    currentTime - cachedRedirects[query].timestamp < CACHE_DURATION
  ) {
    return cachedRedirects[query].url.replace("%s", encodeURIComponent(query));
  }

  // If no exact match, check for bang matches
  const words = query.split(/\s+/);
  for (const word of words) {
    if (
      cachedRedirects[word] &&
      currentTime - cachedRedirects[word].timestamp < CACHE_DURATION
    ) {
      const searchTerm = query.replace(word, "").trim();
      return cachedRedirects[word].url.replace(
        "%s",
        encodeURIComponent(searchTerm),
      );
    }
  }

  return null;
}

function cacheRedirect(key, url) {
  const sessionCachedRedirects = JSON.parse(
    sessionStorage.getItem("cachedRedirects") || "{}",
  );
  const localCachedRedirects = JSON.parse(
    localStorage.getItem("cachedRedirects") || "{}",
  );

  const newCache = { url, timestamp: Date.now() };

  sessionCachedRedirects[key] = newCache;
  localCachedRedirects[key] = newCache;

  sessionStorage.setItem(
    "cachedRedirects",
    JSON.stringify(sessionCachedRedirects),
  );
  localStorage.setItem("cachedRedirects", JSON.stringify(localCachedRedirects));
}

export async function handleSearch(
  query,
  bangs = [],
  walletConnection,
  fallbackSearchEngine = "https://google.com/search?q=%s",
) {
  const trimmedQuery = query.trim();
  console.log("Searching:", trimmedQuery);

  // Check cache first for exact match
  const cachedRedirect = getCachedRedirect(trimmedQuery);
  if (cachedRedirect) {
    return `Redirecting to: ${cachedRedirect}`;
  }

  const words = trimmedQuery.split(/\s+/);

  // Check bangs
  if (bangs && bangs.length > 0) {
    // Check if the first word matches any of the defined bangs
    const bang = bangs.find(
      (b) => words[0].toLowerCase() === b.name.toLowerCase(),
    );

    if (bang) {
      const searchTerm = words.slice(1).join(" ");
      const redirectUrl = bang.url.replace(
        "%s",
        encodeURIComponent(searchTerm),
      );
      cacheRedirect(bang.name, bang.url);
      return `Redirecting to: ${redirectUrl}`;
    } else {
      // Check if any word in the query matches a bang
      for (let i = 0; i < words.length; i++) {
        const potentialBang = bangs.find(
          (b) => words[i].toLowerCase() === b.name.toLowerCase(),
        );
        if (potentialBang) {
          const searchTerm = [...words.slice(0, i), ...words.slice(i + 1)].join(
            " ",
          );
          const redirectUrl = potentialBang.url.replace(
            "%s",
            encodeURIComponent(searchTerm),
          );
          cacheRedirect(potentialBang.name, potentialBang.url);
          return `Redirecting to: ${redirectUrl}`;
        }
      }
    }
  }

  // If no bang is found, check for ArNS domain
  if (!trimmedQuery.includes(" ") && /^[a-zA-Z0-9_-]+$/.test(trimmedQuery)) {
    console.log("Checking for ArNS record:", trimmedQuery);
    const isArNS = await checkArNSRecord(trimmedQuery);
    console.log("Is ArNS record:", isArNS);
    if (isArNS) {
      console.log("Resolving ArNS domain:", trimmedQuery);
      const resolvedDomain = await resolveArNSDomain(trimmedQuery);
      console.log("Resolved domain:", resolvedDomain);
      if (resolvedDomain) {
        cacheRedirect(trimmedQuery, resolvedDomain);
        return `Redirecting to: ${resolvedDomain}`;
      } else {
        console.log("Failed to resolve ArNS domain");
      }
    }
  }

  // Check if it's a 43-character string (typical Arweave transaction ID length)
  if (trimmedQuery.length === 43 && /^[a-zA-Z0-9_-]+$/.test(trimmedQuery)) {
    const viewBlockUrl = `https://viewblock.io/arweave/tx/${trimmedQuery}`;
    return `Redirecting to: ${viewBlockUrl}`;
  }

  // If no bang or ArNS domain is found, use the fallback search engine
  const searchUrl = fallbackSearchEngine.replace(
    "%s",
    encodeURIComponent(trimmedQuery),
  );
  return `Redirecting to: ${searchUrl}`;
}

// You might want to keep this function for use in other parts of your application
export async function getFallbackSearchEngineUrl(walletConnection) {
  if (!walletConnection) {
    return "https://google.com/search?q=%s"; // Default fallback
  }

  try {
    const fallbackResult = await getFallbackSearchEngineUrl(walletConnection);
    if (
      fallbackResult &&
      fallbackResult.Messages &&
      fallbackResult.Messages.length > 0
    ) {
      const fallbackData = JSON.parse(fallbackResult.Messages[0].Data);
      if (fallbackData.success && fallbackData.url) {
        return fallbackData.url;
      }
    }
  } catch (error) {
    console.error("Error fetching fallback search engine:", error);
  }

  return "https://google.com/search?q=%s";
}
