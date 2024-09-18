import { getFallbackSearchEngine } from "./bangHelpers.js";

export async function handleSearch(query, bangs, walletConnection) {
  // Split the query into words
  const words = query.trim().split(/\s+/);

  // Check if the first word matches any of the defined bangs
  const bang = bangs.Bangs.find(
    (b) => words[0].toLowerCase() === b.name.toLowerCase(),
  );

  if (bang) {
    // Remove the bang from the query
    const searchTerm = words.slice(1).join(" ");
    const redirectUrl = bang.url.replace("%s", encodeURIComponent(searchTerm));
    return `Redirecting to: ${redirectUrl}`;
  } else {
    // Check if any word in the query matches a bang
    for (let i = 0; i < words.length; i++) {
      const potentialBang = bangs.Bangs.find(
        (b) => words[i].toLowerCase() === b.name.toLowerCase(),
      );
      if (potentialBang) {
        // Remove the bang from the query
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

    // If no bang is found, use the fallback search engine
    const fallbackResult = await getFallbackSearchEngine(walletConnection);
    let fallbackSearchEngine = "https://google.com/search?q=%s";
    if (
      fallbackResult &&
      fallbackResult.Messages &&
      fallbackResult.Messages.length > 0
    ) {
      const fallbackData = JSON.parse(fallbackResult.Messages[0].Data);
      if (fallbackData.success && fallbackData.url) {
        fallbackSearchEngine = fallbackData.url;
      }
    }
    const searchUrl = fallbackSearchEngine.replace(
      "%s",
      encodeURIComponent(query),
    );
    return `Redirecting to: ${searchUrl}`;
  }
}
