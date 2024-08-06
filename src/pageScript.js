import { VersionedTransaction } from "@solana/web3.js";
import { parseTransaction } from 'viem';

// Expected chain ID (for example, Ethereum Mainnet is "0x1")
const EXPECTED_CHAIN_ID = "0x2105";

// Wallet connection handlers
const walletHandlers = {
  ethereum: {
    connect: async () => {
      if (typeof window.ethereum === "undefined") {
        throw new Error("No Ethereum provider found");
      }
      
      // Check the current chain ID
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      // If not on the expected chain, switch to it
      if (currentChainId !== EXPECTED_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: EXPECTED_CHAIN_ID }]
          });
        } catch (switchError) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            throw new Error("This network is not available in your MetaMask, please add it manually");
          }
          throw switchError;
        }
      }

      // Request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      return accounts[0];
    },
    sign: async (serializedTx) => {
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
    sign: async (transaction) => {
      const tx = VersionedTransaction.deserialize(
        Buffer.from(transaction, "base64")
      );
      return window.solana.signTransaction(tx);
    },
  },
};

// Message handling
const messageHandlers = {
  CONNECT_WALLET_ETHEREUM: async () => {
    const account = await walletHandlers.ethereum.connect();
    return { type: "WALLET_CONNECTED_ETHEREUM", account };
  },
  CONNECT_WALLET_SOLANA: async () => {
    const account = await walletHandlers.solana.connect();
    return { type: "WALLET_CONNECTED_SOLANA", account };
  },
  SIGN_TRANSACTION_ETHEREUM: async (data) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.ethereum.connect();
    }
    const txHash = await walletHandlers.ethereum.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED", txHash };
  },
  SIGN_TRANSACTION_SOLANA: async (data) => {
    if (!connectedAddress) {
      connectedAddress = await walletHandlers.solana.connect();
    }
    const { signature } = await walletHandlers.solana.sign(data.transaction);
    return { type: "TRANSACTION_SIGNED_SOLANA", signature };
  },
};

// Global state
let connectedAddress = "";

// Initialize
window.postMessage({ type: "PAGE_SCRIPT_LOADED" }, "*");
window.postMessage({ type: "ETHEREUM_READY" }, "*");

// Message listener
window.addEventListener("message", async (event) => {
  const { type, ...data } = event.data;
  if (type in messageHandlers) {
    try {
      const response = await messageHandlers[type](data);
      window.postMessage(response, "*");
    } catch (error) {
      console.error(`Error in ${type} handler:`, error);
      window.postMessage(
        { type: `${type}_ERROR`, error: error.message },
        "*"
      );
    }
  }
});
