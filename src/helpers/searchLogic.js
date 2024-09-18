import { resolveArNSDomain, checkArNSRecord } from "./arnsResolver";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

function getCachedRedirect(query) {
  const cachedRedirects = JSON.parse(
    localStorage.getItem("cachedRedirects") || "{}",
  );
  const currentTime = Date.now();

  for (const [key, value] of Object.entries(cachedRedirects)) {
    if (
      query.toLowerCase().includes(key.toLowerCase()) &&
      currentTime - value.timestamp < CACHE_DURATION
    ) {
      return value.url.replace("%s", encodeURIComponent(query));
    }
  }

  return null;
}

function cacheRedirect(key, url) {
  const cachedRedirects = JSON.parse(
    localStorage.getItem("cachedRedirects") || "{}",
  );
  cachedRedirects[key] = { url, timestamp: Date.now() };
  localStorage.setItem("cachedRedirects", JSON.stringify(cachedRedirects));
}

export async function handleSearch(
  query,
  bangs = [],
  walletConnection,
  fallbackSearchEngine = "https://google.com/search?q=%s",
) {
  const trimmedQuery = query.trim();
  console.log("Searching:", trimmedQuery);

  // Check cache first
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
  if (!trimmedQuery.includes(" ")) {
    const isArNS = await checkArNSRecord(trimmedQuery);
    if (isArNS) {
      const resolvedDomain = await resolveArNSDomain(trimmedQuery);
      if (resolvedDomain) {
        cacheRedirect(trimmedQuery, resolvedDomain);
        return `Redirecting to: ${resolvedDomain}`;
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
    encodeURIComponent(query),
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
