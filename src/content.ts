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

async function initializeExtension() {
  const actionConfig = new ActionConfig(
    "https://eth-mainnet.g.alchemy.com/v2/<replace with id>",
    {
      signTransaction: async (tx: string) => {
        console.log("Transaction to sign:", tx);
        try {
          const transaction = JSON.parse(tx);
          const transactionParameters = {
            to: transaction.to,
            from: (window as any).ethereum.selectedAddress,
            value: parseEther(transaction.value).toString(16), // Convert to hex
          };

          const txHash = await (window as any).ethereum.request({
            method: "eth_sendTransaction",
            params: [transactionParameters],
          });

          return { signature: txHash };
        } catch (error) {
          console.error("Error signing transaction:", error);
          return { error: "Failed to sign transaction" };
        }
      },
      connect: async () => {
        console.log("connecting");
        try {
          const accounts = await (window as any).ethereum.request({
            method: "eth_requestAccounts",
          });
          console.log("Connected account:", accounts[0]);
          return accounts[0];
        } catch (error) {
          console.error("Error connecting:", error);
          return "";
        }
      },
    }
  );

  // Use a dynamic import for the Twitter module
  import("@dialectlabs/blinks/ext/twitter")
    .then(({ setupTwitterObserver }) => {
      setupTwitterObserver(actionConfig, options);
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
