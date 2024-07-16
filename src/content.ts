import "@dialectlabs/blinks/index.css";
import { ActionConfig, type ActionAdapter } from "@dialectlabs/blinks";
import { proxify } from "./utils/proxify";
import {
  resolveTwitterShortenedUrl,
  findElementByTestId,
} from "./utils/twitter";
import { ActionsURLMapper, type ActionsJsonConfig } from "./utils/url-mapper";
import { isInterstitial } from "./utils/interstitial-url";
import { setupTwitterObserver, ObserverOptions } from "./twitterObserver";
import { parseEther } from "viem";

import "./index.css";

declare global {
  interface Window {
    ethereum: any;
    solana: any;
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
  const ethereumActionConfig = new ActionConfig(
    "https://eth-mainnet.g.alchemy.com/v2/<replace with id>",
    {
      signTransaction: async (tx: string) => {
        if (!pageScriptLoaded) {
          throw new Error("Ethereum not loaded");
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
          }, 60000); // 60 second timeout

          const handler = (event: MessageEvent) => {
            if (event.data.type === "TRANSACTION_SIGNED_ETHEREUM") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              resolve({ signature: event.data.txHash });
            } else if (event.data.type === "TRANSACTION_SIGN_ERROR_ETHEREUM") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              reject(new Error(event.data.error));
            }
          };

          window.addEventListener("message", handler);

          window.postMessage(
            {
              type: "SIGN_TRANSACTION_ETHEREUM",
              transaction: JSON.stringify(transactionParameters),
            },
            "*"
          );
        });
      },
      connect: async () => {
        if (!pageScriptLoaded) {
          throw new Error("Solana not loaded");
        }
        window.postMessage({ type: "CONNECT_WALLET_ETHEREUM" }, "*");
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Wallet connection timed out"));
          }, 60000); // 60 second timeout

          window.addEventListener("message", function handler(event) {
            if (event.data.type === "WALLET_CONNECTED_ETHEREUM") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              resolve(event.data.account);
            } else if (event.data.type === "WALLET_CONNECTION_ERROR_ETHEREUM") {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              reject(new Error(event.data.error));
            }
          });
        });
      },
    }
  );

  class SolanaActionAdapter implements ActionAdapter {
    async connect(): Promise<string | null> {
      if (!pageScriptLoaded) {
        throw new Error("Page script not loaded");
      }
      window.postMessage({ type: "CONNECT_WALLET_SOLANA" }, "*");
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Wallet connection timed out"));
        }, 30000); // 30 second timeout

        window.addEventListener("message", function handler(event) {
          if (event.data.type === "WALLET_CONNECTED_SOLANA") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve(event.data.account);
          } else if (event.data.type === "WALLET_CONNECTION_ERROR_SOLANA") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            reject(new Error(event.data.error));
          }
        });
      });
    }
    async signTransaction(
      tx: string
    ): Promise<{ signature: string } | { error: string }> {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Transaction signing timed out"));
        }, 30000); // 30 second timeout

        const handler = (event: MessageEvent) => {
          if (event.data.type === "TRANSACTION_SIGNED_SOLANA") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            resolve({ signature: event.data.signature });
          } else if (event.data.type === "TRANSACTION_SIGN_ERROR_SOLANA") {
            clearTimeout(timeout);
            window.removeEventListener("message", handler);
            reject(new Error(event.data.error));
          }
        };

        window.addEventListener("message", handler);

        window.postMessage(
          {
            type: "SIGN_TRANSACTION_SOLANA",
            transaction: tx,
          },
          "*"
        );
      });
    }
    async confirmTransaction(signature: string) {
      return Promise.resolve();
    }
  }

  setupTwitterObserver(
    ethereumActionConfig,
    new SolanaActionAdapter(),
    {},
    options
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
