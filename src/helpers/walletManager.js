import { ArConnect } from "arweavekit/auth";
import { QuickWallet } from "quick-wallet";
import { ArweaveWebWallet } from "arweave-wallet-connector";
import {
  createDataItemSigner,
  message,
  result,
  spawn,
  dryrun,
} from "@permaweb/aoconnect";

const USER_PROCESS_MAP_ID = "fZnoaLqIP1zk3C1AZ9s546MmOdE-ujjOaGtMzj431cw";
const USER_PROCESS_MODULE = "ffvkmPM1jW71hFlBpVbaIapBa_Wl6UIwfdTkDNqsKNw";
const SCHEDULER_ID = "_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA";

class WalletManager {
  constructor() {
    this.address = null;
    this.connection = null;
    this.signer = null;
    this.authMethod = null;
    this.processId = null;
    this.handlersUploaded = false;
  }

  getWalletConnection() {
    return this.connection;
  }

  async connect(method) {
    try {
      await this._connectWithMethod(method);
      if (this.address) {
        this._createSigner();
        this._cacheWalletInfo();
        await this.checkAndAddUserProcess();
        if (!this.processId) {
          throw new Error("Failed to obtain a valid process ID");
        }
        console.log("Wallet connected successfully:", this.address);
        console.log("Process ID:", this.processId);
        return this.address;
      }
      throw new Error("Failed to obtain wallet address");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this._disconnectWallet();
      this._clearCache();
      this._resetState();
      console.log("Wallet disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  }

  async reconnectFromCache() {
    const cachedMethod = localStorage.getItem("cachedWalletMethod");
    const cachedAddress = localStorage.getItem("cachedWalletAddress");
    const cachedProcessId = localStorage.getItem("cachedProcessId");

    if (cachedMethod && cachedAddress && cachedProcessId) {
      try {
        await this._connectWithMethod(cachedMethod);
        if (this.address === cachedAddress) {
          this._createSigner();
          this.processId = cachedProcessId;
          return true;
        }
        this._clearCache();
      } catch (error) {
        console.error("Failed to reconnect from cache:", error);
        this._clearCache();
      }
    }
    return false;
  }

  async sendMessageToArweave(tags, data = "", processId = this.processId) {
    this._checkWalletConnection();
    if (!processId) {
      throw new Error(
        "Process ID not set. Please ensure the user process is created.",
      );
    }
    const safeTags = this._ensureSafeTags(tags);
    const safeData = this._ensureSafeData(data);

    try {
      const messageId = await message({
        process: processId,
        tags: safeTags,
        signer: this.signer,
        data: safeData,
      });

      console.log(messageId);

      const { Messages, Error } = await result({
        process: processId,
        message: messageId,
        limit: 25,
      });

      if (Error) throw new Error(Error);
      return { Messages, Error };
    } catch (error) {
      console.error("Error in sendMessageToArweave:", error);
      throw error;
    }
  }

  async dryRunArweave(tags, data = "", processId = this.processId) {
    this._checkWalletConnection();
    try {
      const { Messages, Error } = await dryrun({
        process: processId,
        tags,
        data,
        signer: this.signer,
      });

      if (Error) throw new Error(Error);
      return { Messages, Error };
    } catch (error) {
      console.error("Error in dryRunArweave:", error);
      throw error;
    }
  }

  async dryRunAllArns() {
    const processId = "nX64lk5_4R6StOdV3rSb-2zM0t-1FShXNoA_GIdV3ZE";
    try {
      const { Messages, Error } = await dryrun({
        process: processId,
        tags: [{ name: "Action", value: "AllArns" }],
        signer: this.signer,
      });

      if (Error) throw new Error(Error);

      if (Messages && Messages.length > 0) {
        const data = JSON.parse(Messages[0].Data);
        if (data.success && Array.isArray(data.domains)) {
          return data.domains;
        }
      }
      throw new Error("Invalid response format");
    } catch (error) {
      console.error("Error in dryRunAllArns:", error);
      throw error;
    }
  }

  async checkAndAddUserProcess() {
    try {
      let processId = await this.getUserProcessId();
      if (!processId) {
        processId = await this.createUserProcess();
      }
      if (!processId) {
        throw new Error("Failed to obtain a valid process ID");
      }
      this.processId = processId;
      console.log("Process ID set:", this.processId);
      this._cacheWalletInfo();
      await this.uploadHandlers();
    } catch (error) {
      console.error("Error checking and adding user process:", error);
      throw error;
    }
  }

  async getUserProcessId() {
    this._checkWalletConnection();
    try {
      console.log("Fetching user process ID...");
      const { Messages, Error } = await this.sendMessageToArweave(
        [{ name: "Action", value: "GetUser" }],
        "",
        USER_PROCESS_MAP_ID,
      );

      if (Error) throw new Error(Error);

      console.log("GetUser response:", Messages);

      if (Messages && Messages.length > 0) {
        const userData = JSON.parse(Messages[0].Data);
        if (userData.success && userData.processId) {
          console.log("Received process ID:", userData.processId);
          localStorage.setItem("cachedProcessId", userData.processId);
          return userData.processId;
        }
      }
      console.log("No process ID found in response");
      return null;
    } catch (error) {
      console.error("Error in getUserProcessId:", error);
      return null;
    }
  }

  async createUserProcess() {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 2000;
    const TIMEOUT = 30000;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const spawnPromise = new Promise(async (resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Process spawn timed out"));
          }, TIMEOUT);

          try {
            const newProcessId = await this.spawnProcess(
              USER_PROCESS_MODULE,
              SCHEDULER_ID,
              [
                { name: "App-Name", value: "tinyNav" },
                {
                  name: "Authority",
                  value: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY",
                },
              ],
              "Spawning process...",
            );

            clearTimeout(timeoutId);
            resolve(newProcessId);
          } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
          }
        });

        const newProcessId = await spawnPromise;

        const { Error } = await this.sendMessageToArweave(
          [
            { name: "Action", value: "AddUser" },
            { name: "ProcessID", value: newProcessId },
          ],
          "",
          USER_PROCESS_MAP_ID,
        );

        if (Error) throw new Error(Error);

        this.processId = newProcessId;
        return newProcessId;
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        if (attempt === MAX_RETRIES - 1) {
          throw new Error(
            `Failed to create user process after ${MAX_RETRIES} attempts`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  async uploadHandlers() {
    if (this.handlersUploaded) {
      console.log("Handlers already uploaded");
      return;
    }

    if (!this.processId) {
      console.error("Process ID not set. Cannot upload handlers.");
      throw new Error("Process ID not set");
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Uploading handlers... Attempt ${attempt}`);

        const response = await fetch(`./ao/main.lua`);
        const handlersCode = await response.text();

        const evalMessageId = await message({
          process: this.processId,
          tags: [{ name: "Action", value: "Eval" }],
          data: handlersCode,
          signer: this.signer,
        });

        const { Messages, Output, Error } = await result({
          process: this.processId,
          message: evalMessageId,
        });

        if (Error) {
          throw new Error(Error);
        } else {
          console.log("Handlers uploaded successfully");
          this.handlersUploaded = true;
          return;
        }
      } catch (error) {
        console.error(`Error uploading handlers (Attempt ${attempt}):`, error);
        if (attempt === MAX_RETRIES) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  async spawnProcess(moduleId, schedulerId, tags, data) {
    this._checkWalletConnection();
    try {
      return await spawn({
        module: moduleId,
        scheduler: schedulerId,
        signer: this.signer,
        authority: "fcoN_xJeisVsPXA-trzVAuIiqO3ydLQxM-L4XbrQKzY",
        tags,
        data,
      });
    } catch (error) {
      console.error("Error spawning process:", error);
      throw error;
    }
  }

  async _connectWithMethod(method) {
    switch (method) {
      case "ArConnect":
        await this._connectArConnect();
        break;
      case "QuickWallet":
        await this._connectQuickWallet();
        break;
      case "ArweaveApp":
        await this._connectArweaveApp();
        break;
      default:
        throw new Error("Unknown wallet method");
    }
  }

  async _connectArConnect() {
    await ArConnect.connect({
      permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
    });
    this.address = await window.arweaveWallet.getActiveAddress();
    this.connection = window.arweaveWallet;
    this.authMethod = "ArConnect";
  }

  async _connectQuickWallet() {
    await QuickWallet.connect();
    this.address = await QuickWallet.getActiveAddress();
    this.connection = QuickWallet;
    this.authMethod = "QuickWallet";
  }

  async _connectArweaveApp() {
    const arweaveAppWallet = new ArweaveWebWallet();
    arweaveAppWallet.setUrl("https://arweave.app");
    await arweaveAppWallet.connect();
    this.address = arweaveAppWallet.namespaces.arweaveWallet.getActiveAddress();
    this.connection = arweaveAppWallet;
    this.authMethod = "ArweaveApp";
  }

  async _disconnectWallet() {
    switch (this.authMethod) {
      case "ArConnect":
        await window.arweaveWallet.disconnect();
        break;
      case "QuickWallet":
        await QuickWallet.disconnect();
        break;
      case "ArweaveApp":
        if (
          this.connection &&
          typeof this.connection.disconnect === "function"
        ) {
          await this.connection.disconnect();
        }
        break;
    }
  }

  _createSigner() {
    switch (this.authMethod) {
      case "ArConnect":
        this.signer = createDataItemSigner(window.arweaveWallet);
        break;
      case "ArweaveApp":
        this.signer = createDataItemSigner(this.connection);
        break;
      case "QuickWallet":
        this.signer = createDataItemSigner(QuickWallet);
        break;
      default:
        throw new Error("Unknown auth method");
    }

    if (!this.signer) {
      throw new Error("Failed to create signer");
    }
  }

  _cacheWalletInfo() {
    localStorage.setItem("cachedWalletMethod", this.authMethod);
    localStorage.setItem("cachedWalletAddress", this.address);
    localStorage.setItem("cachedProcessId", this.processId);
  }

  _clearCache() {
    localStorage.removeItem("cachedWalletMethod");
    localStorage.removeItem("cachedWalletAddress");
    localStorage.removeItem("cachedProcessId");
  }

  _resetState() {
    this.address = null;
    this.connection = null;
    this.signer = null;
    this.authMethod = null;
    this.processId = null;
    this.handlersUploaded = false;
  }

  _checkWalletConnection() {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
  }

  _ensureSafeTags(tags) {
    const safeTags = Array.isArray(tags) ? tags : [];
    if (safeTags.length === 0) {
      safeTags.push({ name: "Action", value: "Default" });
    }
    return safeTags;
  }

  _ensureSafeData(data) {
    return typeof data === "string" ? data : JSON.stringify(data);
  }
}

export const walletManager = new WalletManager();
