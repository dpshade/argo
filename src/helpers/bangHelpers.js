// Create: Add a new bang
export async function createBang(walletConnection, name, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  url = ensureHttpsWww(url);

  console.log(`Creating bang: ${name} with URL: ${url}`);
  const result = await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "CreateBang" },
      { name: "Name", value: name },
      { name: "URL", value: url },
    ],
    "",
    walletConnection.processId,
  );
  console.log("Create bang result:", result);
  return result;
}

// Read: Get a specific bang by name
export async function getBang(walletConnection, name) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }
  console.log(`Getting bang: ${name}`);
  const result = await walletConnection.dryRunArweave(
    [
      { name: "Action", value: "ReadBang" },
      { name: "Name", value: name },
    ],
    "",
    walletConnection.processId,
  );
  console.log("Get bang result:", result);
  return result;
}

// Read: Get all bangs
export async function getAllBangs(walletConnection, dryRun = true) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  console.log(
    dryRun
      ? "Performing dry run of getAllBangs"
      : "Getting all bangs and defaults",
  );

  const action = dryRun ? "dryRunArweave" : "sendMessageToArweave";

  const result = await walletConnection[action](
    [{ name: "Action", value: "ListBangs" }],
    "",
    walletConnection.processId,
  );

  console.log("Get all bangs and defaults result:", result);

  if (result && result.Messages && result.Messages.length > 0) {
    try {
      const data = JSON.parse(result.Messages[0].Data);
      if (data.success) {
        return {
          success: true,
          Bangs: data.Bangs || [],
          FallbackSearchEngine:
            data.FallbackSearchEngine || "https://google.com/search?q=%s",
          ArweaveExplorer:
            data.ArweaveExplorer || "https://viewblock.io/arweave/tx/%s",
        };
      }
    } catch (error) {
      console.error("Error parsing bangs data:", error);
    }
  }

  // Return default values if parsing fails or data is not in expected format
  return {
    success: false,
    Bangs: [],
    FallbackSearchEngine: "https://google.com/search?q=%s",
    ArweaveExplorer: "https://viewblock.io/arweave/tx/%s",
  };
}

// Update: Modify an existing bang
export async function updateBang(walletConnection, oldName, newName, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  console.log(`Updating bang: ${oldName} to ${newName} with URL: ${url}`);

  // Check if the URL starts with http:// or https://
  url = ensureHttpsWww(url);

  try {
    const result = await walletConnection.sendMessageToArweave(
      [
        { name: "Action", value: "UpdateBang" },
        { name: "OldName", value: oldName },
        { name: "NewName", value: newName },
        { name: "URL", value: url },
      ],
      "",
      walletConnection.processId,
    );

    console.log("Update bang result:", result);

    if (result.Error) {
      throw new Error(result.Error);
    }

    return result;
  } catch (error) {
    console.error("Error updating bang:", error);
    throw error;
  }
}

// Delete: Remove a bang
export async function deleteBang(walletConnection, name) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }
  console.log(`Deleting bang: ${name}`);
  const result = await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "DeleteBang" },
      { name: "Name", value: name },
    ],
    "",
    walletConnection.processId,
  );
  console.log("Delete bang result:", result);

  // Clean up cached redirects
  cleanupCachedRedirects(name);

  return result;
}

function cleanupCachedRedirects(bangName) {
  // Clean up session storage
  let sessionCachedRedirects = JSON.parse(
    sessionStorage.getItem("cachedRedirects") || "{}",
  );
  delete sessionCachedRedirects[bangName];
  sessionStorage.setItem(
    "cachedRedirects",
    JSON.stringify(sessionCachedRedirects),
  );

  // Clean up local storage
  let localCachedRedirects = JSON.parse(
    localStorage.getItem("cachedRedirects") || "{}",
  );
  delete localCachedRedirects[bangName];
  localStorage.setItem("cachedRedirects", JSON.stringify(localCachedRedirects));

  console.log(`Cleaned up cached redirects for bang: ${bangName}`);
}

export async function updateFallbackSearchEngine(walletConnection, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  // Check if the URL starts with http:// or https://
  if (!/^https?:\/\//i.test(url)) {
    // If not, add https:// to the beginning
    url = "https://" + url;
  }

  return await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateFallbackSearchEngine" },
      { name: "URL", value: url },
    ],
    "",
    walletConnection.processId,
  );
}

export async function updateArweaveExplorer(walletConnection, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  // Check if the URL starts with http:// or https://
  if (!/^https?:\/\//i.test(url)) {
    // If not, add https:// to the beginning
    url = "https://" + url;
  }

  return await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateArweaveExplorer" },
      { name: "URL", value: url },
    ],
    "",
    walletConnection.processId,
  );
}

function ensureHttpsWww(url) {
  if (!/^https?:\/\//i.test(url)) {
    url = "https://www." + url;
  } else if (!/^https?:\/\/www\./i.test(url)) {
    url = url.replace(/^(https?:\/\/)/, "$1www.");
  }
  return url;
}
