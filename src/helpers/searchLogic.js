import { cacheModule } from "./cacheModule";
import { resolveArNSDomain, checkArNSRecord } from "./arnsResolver";

export async function handleSearch(
  query,
  bangs = [],
  walletManager,
  fallbackSearchEngine = "https://google.com/search?q=%s",
  arweaveExplorer = "https://viewblock.io/arweave/tx/%s",
  forceFallback = false,
) {
  const trimmedQuery = query.trim();
  console.log("Searching:", trimmedQuery);

  // If forceFallback is true, skip all other checks and use the fallback search engine
  if (forceFallback) {
    const searchUrl = fallbackSearchEngine.replace(
      "%s",
      encodeURIComponent(trimmedQuery),
    );
    return `Redirecting to: ${searchUrl}`;
  }

  // Check cache first for exact match
  const cachedRedirect = cacheModule.get(trimmedQuery, "redirect");
  if (cachedRedirect) {
    return `Redirecting to: ${cachedRedirect.url.replace("%s", encodeURIComponent(trimmedQuery))}`;
  }

  const words = trimmedQuery.split(/\s+/);

  // Check all bangs first
  if (bangs && bangs.length > 0) {
    // Check for exact match with first word
    const exactBang = bangs.find(
      (b) => words[0].toLowerCase() === b.name.toLowerCase(),
    );
    if (exactBang) {
      const searchTerm = words.slice(1).join(" ");
      const redirectUrl = exactBang.url.replace(
        "%s",
        encodeURIComponent(searchTerm),
      );
      cacheModule.set(exactBang.name, { url: exactBang.url }, "redirect");
      return `Redirecting to: ${redirectUrl}`;
    }

    // Check for bang anywhere in the query
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
        cacheModule.set(
          potentialBang.name,
          { url: potentialBang.url },
          "redirect",
        );
        return `Redirecting to: ${redirectUrl}`;
      }
    }
  }

  // Check for ArNS domain only if no bangs matched
  if (!trimmedQuery.includes(" ") && /^[a-zA-Z0-9_-]+$/.test(trimmedQuery)) {
    const isArNS = await checkArNSRecord(trimmedQuery);
    if (isArNS) {
      const resolvedDomain = await resolveArNSDomain(trimmedQuery);
      if (resolvedDomain) {
        cacheModule.set(trimmedQuery, { url: resolvedDomain }, "redirect");
        return `Redirecting to: ${resolvedDomain}`;
      } else {
        console.log("Failed to resolve ArNS domain");
      }
    }
  }

  // Check if it's an Arweave transaction ID
  if (trimmedQuery.length === 43 && /^[a-zA-Z0-9_-]+$/.test(trimmedQuery)) {
    console.log("Found Tx");
    const explorerUrl = arweaveExplorer.replace("%s", trimmedQuery);
    console.log(explorerUrl);
    return `Redirecting to: ${explorerUrl}`;
  }

  // Use fallback search engine
  const searchUrl = fallbackSearchEngine.replace(
    "%s",
    encodeURIComponent(trimmedQuery),
  );
  return `Redirecting to: ${searchUrl}`;
}
