import { ActionAdapter } from "@dialectlabs/blinks";

export class EthereumAdapter implements ActionAdapter {
  private chain: string;

  constructor(chain: string) {
    this.chain = chain;
  }
  async signTransaction(
    tx: string
  ): Promise<{ signature: string } | { error: string }> {
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
          transaction: tx,
          chain: this.chain,
        },
        "*"
      );
    });
  }

  async connect(): Promise<string | null> {
    window.postMessage(
      { type: "CONNECT_WALLET_ETHEREUM", chain: this.chain },
      "*"
    );
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
  }

  async confirmTransaction(signature: string) {
    return Promise.resolve();
  }
}
