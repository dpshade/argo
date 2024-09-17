export const BANG_PROCESS_ID = "KdLdVvKmcmb3vqh9nVXH3IUVb8w3r5M_n8cdv67ZvmI";

// Create: Add a new bang
export async function createBang(walletConnection, name, url) {
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
      { name: "Action", value: "CreateBang" },
      { name: "Name", value: name },
      { name: "URL", value: url },
    ],
    "",
    BANG_PROCESS_ID,
  );
}

// Read: Get a specific bang by name
export async function getBang(walletConnection, name) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }
  return await walletConnection.dryRunArweave(
    [
      { name: "Action", value: "ReadBang" },
      { name: "Name", value: name },
    ],
    "",
    BANG_PROCESS_ID,
  );
}

// Read: Get all bangs
export async function getAllBangs(walletConnection) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }
  return await walletConnection.dryRunArweave(
    [{ name: "Action", value: "ListBangs" }],
    "",
    BANG_PROCESS_ID,
  );
}

// Update: Modify an existing bang
export async function updateBang(walletConnection, oldName, newName, url) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }

  console.log(
    `Attempting to update bang: ${oldName} to ${newName} with URL: ${url}`,
  );

  // Check if the URL starts with http:// or https://
  if (!/^https?:\/\//i.test(url)) {
    // If not, add https:// to the beginning
    url = "https://" + url;
  }

  try {
    const result = await walletConnection.sendMessageToArweave(
      [
        { name: "Action", value: "UpdateBang" },
        { name: "OldName", value: oldName },
        { name: "NewName", value: newName },
        { name: "URL", value: url },
      ],
      "",
      BANG_PROCESS_ID,
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
  return await walletConnection.sendMessageToArweave(
    [
      { name: "Action", value: "DeleteBang" },
      { name: "Name", value: name },
    ],
    "",
    BANG_PROCESS_ID,
  );
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
    BANG_PROCESS_ID,
  );
}

export async function getFallbackSearchEngine(walletConnection) {
  if (!walletConnection) {
    throw new Error("Wallet not connected");
  }
  return await walletConnection.dryRunArweave(
    [{ name: "Action", value: "GetFallbackSearchEngine" }],
    "",
    BANG_PROCESS_ID,
  );
}
