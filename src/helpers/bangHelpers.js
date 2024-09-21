import { walletManager } from "./walletManager";

export async function createBang(name, url) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  if (typeof name !== "string" || typeof url !== "string") {
    throw new Error("Invalid bang data: name and url must be strings");
  }

  console.log(`Creating bang: ${name} with URL: ${url}`);
  const result = await walletManager.sendMessageToArweave(
    [
      { name: "Action", value: "CreateBang" },
      { name: "Name", value: name },
      { name: "URL", value: url },
    ],
    "",
    walletManager.processId,
  );
  console.log("Create bang result:", result);

  if (result.Messages && result.Messages.length > 0) {
    return JSON.parse(result.Messages[0].Data);
  }
  throw new Error("Failed to create bang");
}

export async function getAllBangs() {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  console.log("Getting all bangs and defaults");
  const result = await walletManager.dryRunArweave(
    [{ name: "Action", value: "GetState" }],
    "",
    walletManager.processId,
  );

  console.log("Get all bangs and defaults result:", result);

  if (result.Messages && result.Messages.length > 0) {
    return JSON.parse(result.Messages[0].Data);
  }
  throw new Error("Failed to get bangs and defaults");
}

export async function updateBang(oldName, newName, url) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  if (
    typeof oldName !== "string" ||
    typeof newName !== "string" ||
    typeof url !== "string"
  ) {
    throw new Error(
      "Invalid bang data: oldName, newName, and url must be strings",
    );
  }

  console.log(`Updating bang: ${oldName} to ${newName} with URL: ${url}`);
  const result = await walletManager.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateBang" },
      { name: "OldName", value: oldName },
      { name: "NewName", value: newName },
      { name: "URL", value: url },
    ],
    "",
    walletManager.processId,
  );
  console.log("Update bang result:", result);

  if (result.Messages && result.Messages.length > 0) {
    return JSON.parse(result.Messages[0].Data);
  }
  throw new Error("Failed to update bang");
}

export async function deleteBang(name) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  console.log(`Deleting bang: ${name}`);
  const result = await walletManager.sendMessageToArweave(
    [
      { name: "Action", value: "DeleteBang" },
      { name: "Name", value: name },
    ],
    "",
    walletManager.processId,
  );
  console.log("Delete bang result:", result);

  if (result.Messages && result.Messages.length > 0) {
    return JSON.parse(result.Messages[0].Data);
  }
  throw new Error("Failed to delete bang");
}

export async function updateFallbackSearchEngine(url) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  return await walletManager.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateFallbackSearchEngine" },
      { name: "URL", value: url },
    ],
    "",
    walletManager.processId,
  );
}

export async function updateArweaveExplorer(url) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  return await walletManager.sendMessageToArweave(
    [
      { name: "Action", value: "UpdateArweaveExplorer" },
      { name: "URL", value: url },
    ],
    "",
    walletManager.processId,
  );
}

export async function readBang(name) {
  if (!walletManager.address) {
    throw new Error("Wallet not connected");
  }

  console.log(`Reading bang: ${name}`);
  const result = await walletManager.dryRunArweave(
    [
      { name: "Action", value: "ReadBang" },
      { name: "Name", value: name },
    ],
    "",
    walletManager.processId,
  );
  console.log("Read bang result:", result);

  if (result.Messages && result.Messages.length > 0) {
    return JSON.parse(result.Messages[0].Data);
  }
  throw new Error("Failed to read bang");
}
