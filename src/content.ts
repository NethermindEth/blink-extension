import { ActionConfig } from "@dialectlabs/blinks";
import { createWalletClient, custom } from "viem";
import { mainnet } from "viem/chains";
import "./index.css";

console.log("My Blinks Client: Content script loaded");

declare global {
  interface Window {
    ethereum: any;
  }
}

function initializeExtension() {
  console.log("Initializing extension");

  const config = new ActionConfig("https://api.mainnet-beta.solana.com", {
    signTransaction: async (tx: string) => {
      console.log("Transaction to sign:", tx);
      return { signature: "123" };
    },
    connect: async () => {
      console.log("connecting");

      return "";
    },
  });

  // Use a dynamic import for the Twitter module
  import("@dialectlabs/blinks/ext/twitter")
    .then(({ setupTwitterObserver }) => {
      console.log("Setting up Twitter observer");
      setupTwitterObserver(config);
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

console.log("Content script loaded");
