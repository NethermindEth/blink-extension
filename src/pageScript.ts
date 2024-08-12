import { VersionedTransaction } from "@solana/web3.js";
import { connect as starkConnect } from "get-starknet";
import { parseTransaction, Address } from "viem";

// Global state
let connectedAddress: Address | null = null;
let starknetAccount: any = null;

// Wallet connection handlers
const walletHandlers = {
  ethereum: {
    connect: async (chain: string) => {
      if (typeof window.ethereum === "undefined") {
        throw new Error("No Ethereum provider found");
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: chain || "0x1",
          },
        ],
      });

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      return accounts[0];
    },
    sign: async (serializedTx: `0x${string}`) => {
      const tx = parseTransaction(serializedTx);
      const transactionParameters = {
        from: connectedAddress,
        to: tx.to,
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
    connect: async () => {
      if (typeof window.solana === "undefined") {
        throw new Error("No Solana provider found");
      }
      const response = await window.solana.connect();
      return response.publicKey.toString();
    },
    sign: async (transaction: string) => {
      const tx = VersionedTransaction.deserialize(
        Buffer.from(transaction, "base64")
      );
      return window.solana.signTransaction(tx);
    },
  },
  starknet: {
    connect: async () => {
      if (typeof window.starknet === "undefined") {
        throw new Error("No Starknet provider found");
      }

      starknetAccount = await starkConnect();

      starknetAccount.account.execute();
      if (!starknetAccount) {
        throw new Error("No Starknet account found");
      }

      return starknetAccount.selectedAddress || starknetAccount.account.address;
    },

    sign: async (transaction: string) => {
      const tx = JSON.parse(transaction);

      const { transaction_hash: txHash } =
        await starknetAccount.account.execute(tx);

      return txHash;
    },
  },
};

// Message handling
const messageHandlers = {
  CONNECT_WALLET_ETHEREUM: async (data: { chain: string }) => {
    const account = await walletHandlers.ethereum.connect(data.chain);
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
  SIGN_TRANSACTION_ETHEREUM: async (data: {
    transaction: `0x${string}`;
    chain: string;
  }) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.ethereum.connect(data.chain);
    }
    const txHash = await walletHandlers.ethereum.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED", txHash };
  },
  SIGN_TRANSACTION_SOLANA: async (data: { transaction: string }) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.solana.connect();
    }
    const { signature } = await walletHandlers.solana.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED_SOLANA", signature };
  },
  SIGN_TRANSACTION_STARKNET: async (data: { transaction: string }) => {
    if (!starknetAccount) {
      starknetAccount = await walletHandlers.starknet.connect();
    }
    const txHash = await walletHandlers.starknet.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED_STARKNET", txHash };
  },
};

type MessageType = keyof typeof messageHandlers;

// Initialize
window.postMessage({ type: "PAGE_SCRIPT_LOADED" }, "*");
window.postMessage({ type: "ETHEREUM_READY" }, "*");

// Message listener
window.addEventListener("message", async (event) => {
  const { type, ...data } = event.data;
  if (type in messageHandlers) {
    try {
      const response = await messageHandlers[type as MessageType](data);
      window.postMessage(response, "*");
    } catch (error: any) {
      console.error(`Error in ${type} handler:`, error);
      window.postMessage({ type: `${type}_ERROR`, error: error.message }, "*");
    }
  }
});
