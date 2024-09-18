export async function handleSearch(
  query,
  bangs = [],
  walletConnection,
  fallbackSearchEngine = "https://google.com/search?q=%s",
) {
  const words = query.trim().split(/\s+/);

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
          return `Redirecting to: ${redirectUrl}`;
        }
      }
    }
  }

  // If no bang is found or no bangs provided, use the fallback search engine
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
