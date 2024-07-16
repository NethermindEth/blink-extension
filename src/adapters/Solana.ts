import { ActionAdapter } from "@dialectlabs/blinks";

export class SolanaActionAdapter implements ActionAdapter {
  async connect(): Promise<string | null> {
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
      }, 60000); // 60 second timeout

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
