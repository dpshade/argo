import { ArConnect } from "arweavekit/auth";
import { QuickWallet } from "quick-wallet";
import { ArweaveWebWallet } from "arweave-wallet-connector";
import {
  createDataItemSigner,
  dryrun,
  message,
  result,
  spawn,
} from "@permaweb/aoconnect";

const PROCESS_ID = "ZtS3h94Orj7jT94m3uP-n7iC5_56Z9LL24Vx21LW03k";
const BANG_PROCESS_ID = "KdLdVvKmcmb3vqh9nVXH3IUVb8w3r5M_n8cdv67ZvmI";

export const ArweaveWalletConnection = {
  address: null,
  connection: null,
  signer: null,
  authMethod: null,
  BANG_PROCESS_ID: "KdLdVvKmcmb3vqh9nVXH3IUVb8w3r5M_n8cdv67ZvmI",

  async connect(method) {
    try {
      switch (method) {
        case "ArConnect":
          await this.connectArConnect();
          break;
        case "QuickWallet":
          await this.connectQuickWallet();
          break;
        case "ArweaveApp":
          await this.connectArweaveApp();
          break;
        default:
          throw new Error("Unknown wallet method");
      }

      if (this.address) {
        console.log(`Wallet connected successfully: ${this.address}`);
        console.log("Auth method:", this.authMethod);

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
      } else {
        console.error("Failed to obtain wallet address");
      }

      return this.address;
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  },

  async disconnect() {
    try {
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
        default:
          console.warn(
            "Unknown auth method, no specific disconnect action taken",
          );
      }

      // Reset the connection state
      this.address = null;
      this.connection = null;
      this.signer = null;
      this.authMethod = null;

      console.log("Wallet disconnected successfully");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
      throw error;
    }
  },

  async connectArConnect() {
    await ArConnect.connect({
      permissions: ["ACCESS_ADDRESS", "SIGN_TRANSACTION"],
    });
    this.address = await window.arweaveWallet.getActiveAddress();
    this.connection = window.arweaveWallet;
    this.authMethod = "ArConnect";
  },

  async connectQuickWallet() {
    await QuickWallet.connect();
    this.address = await QuickWallet.getActiveAddress();
    this.connection = QuickWallet;
    this.authMethod = "QuickWallet";
  },

  async connectArweaveApp() {
    const arweaveAppWallet = new ArweaveWebWallet();
    arweaveAppWallet.setUrl("https://arweave.app");
    await arweaveAppWallet.connect();
    this.address = await arweaveAppWallet.getActiveAddress();
    this.connection = arweaveAppWallet;
    this.authMethod = "ArweaveApp";
  },

  async sendMessageToArweave(tags, data = "", processId = PROCESS_ID) {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }

    console.log("Sending message to Arweave:");
    console.log("Tags:", tags);
    console.log("Data:", data);
    console.log("Process ID:", processId);

    // Ensure tags is always an array
    const safeTags = Array.isArray(tags) ? tags : [];

    // Add a default tag if the array is empty
    if (safeTags.length === 0) {
      safeTags.push({ name: "Action", value: "Default" });
    }

    // Ensure data is always a string
    const safeData = typeof data === "string" ? data : JSON.stringify(data);

    try {
      const messageId = await message({
        process: processId,
        tags: safeTags,
        signer: this.signer,
        data: safeData,
      });

      console.log("Message ID:", messageId);
      let { Messages, Error } = await result({
        process: processId,
        message: messageId,
      });

      console.log("Messages:", Messages);

      if (Error) console.error("Error in Arweave response:", Error);
      else console.log("Arweave action completed successfully");

      return { Messages, Error };
    } catch (error) {
      console.error("Error in sendMessageToArweave:", error);
      throw error;
    }
  },

  async dryRunArweave(tags, data = "", processId = PROCESS_ID) {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
    try {
      const { Messages, Error } = await dryrun({
        process: processId,
        tags: tags,
        data: data,
        signer: this.signer,
      });

      if (Error) {
        console.error("Error in dryRunArweave:", Error);
        throw new Error(Error);
      }

      console.log("Dry run completed successfully");
      console.log(Messages);
      return { Messages, Error };
    } catch (error) {
      console.error("Error in dryRunArweave:", error);
      throw error;
    }
  },

  async spawnProcess(module, scheduler, tags, data) {
    if (!this.signer) {
      throw new Error("Wallet not connected");
    }
    try {
      const processId = await spawn({
        module,
        scheduler,
        signer: this.signer,
        tags,
        data,
      });

      return processId;
    } catch (error) {
      console.error("Error spawning process:", error);
      throw error;
    }
  },
};
