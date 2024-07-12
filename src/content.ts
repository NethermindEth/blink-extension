import "@dialectlabs/blinks/index.css";
import { ActionConfig } from "@dialectlabs/blinks";
import { ObserverOptions } from "@dialectlabs/blinks/ext/twitter";
import { parseEther } from "viem";

import "./index.css";

declare global {
  interface Window {
    ethereum: any;
  }
}

const options: ObserverOptions = {
  securityLevel: "all", // TODO: Should support only-trusted or non-malicious
};

let pageScriptLoaded = false;

window.addEventListener("message", (event) => {
  if (event.data.type === "PAGE_SCRIPT_LOADED") {
    pageScriptLoaded = true;
  } else if (event.data.type === "ETHEREUM_READY") {
    console.log("Ethereum provider detected");
  } else if (event.data.type === "WALLET_CONNECTED") {
    console.log("Connected account:", event.data.account);
    connectedAddress = event.data.account;
  } else if (event.data.type === "WALLET_CONNECTION_ERROR") {
    console.error("Wallet connection error:", event.data.error);
  }
});

let connectedAddress: string | null = null;

function injectScript(file: string) {
  const script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", chrome.runtime.getURL(file));
  document.body.appendChild(script);
}

injectScript("pageScript.js");

async function initializeExtension() {
  const actionConfig = new ActionConfig(
    "https://eth-mainnet.g.alchemy.com/v2/<replace with id>",
    {
      signTransaction: async (tx: string) => {
        console.log("Transaction to sign:", tx);
        if (!pageScriptLoaded) {
          console.error("Page script not loaded yet");
          throw new Error("Page script not loaded");
        }
        if (!connectedAddress) {
          console.error("Wallet not connected");
          throw new Error("Wallet not connected");
        }

        const transaction = JSON.parse(tx);
        const transactionParameters = {
          to: transaction.to,
          from: connectedAddress,
          value: parseEther(transaction.value).toString(16), // Convert to hex
        };

        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Transaction signing timed out"));
          }, 30000); // 30 second timeout

          const handler = (event: MessageEvent) => {
            if (event.data.type === "TRANSACTION_SIGNED") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              resolve({ signature: event.data.txHash });
            } else if (event.data.type === "TRANSACTION_SIGN_ERROR") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              reject(new Error(event.data.error));
            }
          };

          window.addEventListener("message", handler);

          window.postMessage(
            {
              type: "SIGN_TRANSACTION",
              transaction: JSON.stringify(transactionParameters),
            },
            "*"
          );
        });
      },
      connect: async () => {
        if (!pageScriptLoaded) {
          console.error("Page script not loaded yet");
          throw new Error("Page script not loaded");
        }
        window.postMessage({ type: "CONNECT_WALLET" }, "*");
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Wallet connection timed out"));
          }, 30000); // 30 second timeout

          window.addEventListener("message", function handler(event) {
            if (event.data.type === "WALLET_CONNECTED") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              resolve(event.data.account);
            } else if (event.data.type === "WALLET_CONNECTION_ERROR") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              reject(new Error(event.data.error));
            }
          });
        });
      },
    }
  );

  // Use a dynamic import for the Twitter module
  import("@dialectlabs/blinks/ext/twitter")
    .then(({ setupTwitterObserver }) => {
      console.log("Setting up Twitter observer");
      setupTwitterObserver(actionConfig, {}, options);
      console.log("Twitter observer setup complete");
    })
    .catch((error) => {
      console.error("Failed to load Twitter observer:", error);
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}

console.log("Content script loaded and running");
