import { VersionedTransaction } from "@solana/web3.js";
import { connect as starkConnect } from "get-starknet";
import { parseTransaction, Address } from "viem";

// Global state
let connectedAddress: Address;
let starknetAccount: any = null;

// Interfaces for the wallet handlers
interface EthereumHandlers {
  connect: () => Promise<Address>;
  sign: (serializedTx: Address) => Promise<string>;
}

interface SolanaHandlers {
  connect: () => Promise<string>;
  sign: (transaction: string) => Promise<any>;
}

interface StarknetHandlers {
  connect: () => Promise<string>;
  sign: (transaction: string) => Promise<string>;
}

interface WalletHandlers {
  ethereum: EthereumHandlers;
  solana: SolanaHandlers;
  starknet: StarknetHandlers;
}

interface MessageHandlers {
  CONNECT_WALLET_ETHEREUM: () => Promise<{ type: string; account: Address }>;
  CONNECT_WALLET_SOLANA: () => Promise<{ type: string; account: string }>;
  CONNECT_WALLET_STARKNET: () => Promise<{ type: string; account: string }>;
  SIGN_TRANSACTION_ETHEREUM: (data: { transaction: Address }) => Promise<{ type: string; txHash: string }>;
  SIGN_TRANSACTION_SOLANA: (data: { transaction: string }) => Promise<{ type: string; signature: any }>;
  SIGN_TRANSACTION_STARKNET: (data: { transaction: string }) => Promise<{ type: string; txHash: string }>;
}

const walletHandlers: WalletHandlers = {
  ethereum: {
    connect: async (): Promise<Address> => {
      if (typeof window.ethereum === "undefined") {
        throw new Error("No Ethereum provider found");
      }
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      return accounts[0] as Address;
    },
    sign: async (serializedTx: Address): Promise<string> => {
      const tx = parseTransaction(serializedTx);
      const transactionParameters = {
        from: connectedAddress as Address,
        to: tx.to as Address,
        value: tx.value,
        data: tx.data,
      };

      return window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      });
    },
  },
  solana: {
    connect: async (): Promise<string> => {
      if (typeof window.solana === "undefined") {
        throw new Error("No Solana provider found");
      }
      const response = await window.solana.connect();
      return response.publicKey.toString();
    },
    sign: async (transaction: string): Promise<any> => {
      const tx = VersionedTransaction.deserialize(
        Buffer.from(transaction, "base64")
      );
      return window.solana.signTransaction(tx);
    },
  },
  starknet: {
    connect: async (): Promise<string> => {
      if (typeof window.starknet === "undefined") {
        throw new Error("No Starknet provider found");
      }

      starknetAccount = await starkConnect();

      if (!starknetAccount) {
        throw new Error("No Starknet account found");
      }

      return starknetAccount.selectedAddress || starknetAccount.account.address;
    },
    sign: async (transaction: string): Promise<string> => {
      const tx = JSON.parse(transaction);
      const { transaction_hash: txHash } = await starknetAccount.account.execute(tx);
      return txHash;
    },
  },
};

const messageHandlers: MessageHandlers = {
  CONNECT_WALLET_ETHEREUM: async () => {
    const account = await walletHandlers.ethereum.connect();
    return { type: "WALLET_CONNECTED_ETHEREUM", account };
  },
  CONNECT_WALLET_SOLANA: async () => {
    const account = await walletHandlers.solana.connect();
    return { type: "WALLET_CONNECTED_SOLANA", account };
  },
  CONNECT_WALLET_STARKNET: async () => {
    const account = await walletHandlers.starknet.connect();
    return { type: "WALLET_CONNECTED_STARKNET", account };
  },
  SIGN_TRANSACTION_ETHEREUM: async (data: { transaction: Address }) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.ethereum.connect();
    }
    const txHash = await walletHandlers.ethereum.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED", txHash };
  },
  SIGN_TRANSACTION_SOLANA: async (data: { transaction: string }) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.solana.connect() as Address;
    }
    const { signature } = await walletHandlers.solana.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED_SOLANA", signature };
  },
  SIGN_TRANSACTION_STARKNET: async (data: { transaction: string }) => {
    if (!starknetAccount) {
      await walletHandlers.starknet.connect();
    }
    const txHash = await walletHandlers.starknet.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED_STARKNET", txHash };
  },
};

// Initialize
window.postMessage({ type: "PAGE_SCRIPT_LOADED" }, "*");
window.postMessage({ type: "ETHEREUM_READY" }, "*");

// Message listener
window.addEventListener("message", async (event: MessageEvent) => {
  const { type, ...data } = event.data;
  if (type in messageHandlers) {
    try {
      const response = await messageHandlers[type as keyof MessageHandlers](data);
      window.postMessage(response, "*");
    } catch (error) {
      console.error(`Error in ${type} handler:`, error);
      window.postMessage({ type: `${type}_ERROR`, error: (error as Error).message }, "*");
    }
  }
});
