import { cacheModule } from "./cacheModule";
import { resolveArNSDomain, checkArNSRecord } from "./arnsResolver";

export async function handleSearch(
  query,
  specialShortcuts = [],
  arweaveExplorer = "https://viewblock.io/arweave/tx/%s",
) {
  const trimmedQuery = query.trim();
  console.log("Searching:", trimmedQuery);

  // Check cache first for exact match
  const cachedRedirect = cacheModule.get(trimmedQuery, "redirect");
  if (cachedRedirect) {
    return `Redirecting to: ${cachedRedirect.url.replace("%s", encodeURIComponent(trimmedQuery))}`;
  }

  const words = trimmedQuery.split(/\s+/);

  // Check special shortcuts (tx, data, msg, vb)
  if (specialShortcuts && specialShortcuts.length > 0) {
    // Check for exact match with first word
    const exactShortcut = specialShortcuts.find(
      (s) => words[0].toLowerCase() === s.name.toLowerCase(),
    );
    if (exactShortcut) {
      const searchTerm = words.slice(1).join(" ");
      const redirectUrl = exactShortcut.url.replace(
        "%s",
        encodeURIComponent(searchTerm),
      );
      cacheModule.set(exactShortcut.name, { url: exactShortcut.url }, "redirect");
      return `Redirecting to: ${redirectUrl}`;
    }
  }

  // Check for ArNS domain only if no shortcuts matched
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

  // Nothing matched - return null
  return null;
}
