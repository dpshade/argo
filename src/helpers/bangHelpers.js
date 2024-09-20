import { cacheModule } from "./cacheModule";

export async function createBang(walletConnection, name, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  url = ensureHttps(url);

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

  if (result.success) {
    cacheModule.set(name, { url }, "redirect");
  }

  return result;
}

export async function getAllBangs(walletManager, dryRun = true) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  console.log(
    dryRun
      ? "Performing dry run of getAllBangs"
      : "Getting all bangs and defaults",
  );

  const action = dryRun ? "dryRunArweave" : "sendMessageToArweave";

  const result = await walletManager[action](
    [{ name: "Action", value: "ListBangs" }],
    "",
    walletManager.processId,
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

  return {
    success: false,
    Bangs: [],
    FallbackSearchEngine: "https://google.com/search?q=%s",
    ArweaveExplorer: "https://viewblock.io/arweave/tx/%s",
  };
}

export async function updateBang(walletConnection, oldName, newName, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  console.log(`Updating bang: ${oldName} to ${newName} with URL: ${url}`);

  url = ensureHttps(url);

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

    if (result.success) {
      if (oldName !== newName) {
        cacheModule.invalidate(oldName, "redirect");
      }
      cacheModule.set(newName, { url }, "redirect");
    }

    if (result.Error) {
      throw new Error(result.Error);
    }

    return result;
  } catch (error) {
    console.error("Error updating bang:", error);
    throw error;
  }
}

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

  if (result.success) {
    cacheModule.invalidate(name, "redirect");
  }

  return result;
}

export async function updateFallbackSearchEngine(walletConnection, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  url = ensureHttps(url);

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

  url = ensureHttps(url);

  return await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateArweaveExplorer" },
      { name: "URL", value: url },
    ],
    "",
    walletConnection.processId,
  );
}

function ensureHttps(url) {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
}
