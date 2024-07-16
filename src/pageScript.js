import { VersionedTransaction } from "@solana/web3.js";

window.postMessage({ type: "PAGE_SCRIPT_LOADED" }, "*");

let connectedAddress = "";

async function connectWalletEthereum() {
  console.log("Attempting to connect wallet...");
  if (typeof window.ethereum === "undefined") {
    console.error("window.ethereum is undefined in pageScript");
    return Promise.reject("No Ethereum provider found");
  }
  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    connectedAddress = accounts[0];
    return connectedAddress;
  } catch (error) {
    console.error("Error in connectWallet:", error);
    return null;
  }
}

async function connectWalletSolana() {
  if (typeof window.solana === "undefined") {
    console.error("window.solana is undefined in pageScript");
    return Promise.reject("No Solana provider found");
  }
  try {
    const response = await window.solana.connect();
    connectedAddress = response.publicKey.toString();
    return connectedAddress;
  } catch (error) {
    console.error("Error in connectWalletSolana:", error);
    return null;
  }
}

window.postMessage({ type: "ETHEREUM_READY" }, "*");

window.addEventListener("message", async (event) => {
  if (event.data.type === "CONNECT_WALLET_ETHEREUM") {
    try {
      const account = await connectWalletEthereum();
      window.postMessage({ type: "WALLET_CONNECTED_ETHEREUM", account }, "*");
    } catch (error) {
      console.error("Error in message handler:", error);
      window.postMessage(
        { type: "WALLET_CONNECTION_ERROR_ETHEREUM", error: error.message },
        "*"
      );
    }
  } else if (event.data.type === "SIGN_TRANSACTION_ETHEREUM") {
    try {
      if (!connectedAddress) {
        connectedAddress = await connectWalletEthereum();
      }
      const transaction = JSON.parse(event.data.transaction);
      const transactionParameters = {
        to: transaction.to,
        from: connectedAddress,
        value: transaction.value,
      };

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [transactionParameters],
      });

      window.postMessage({ type: "TRANSACTION_SIGNED", txHash }, "*");
    } catch (error) {
      console.error("Error signing transaction:", error);
      window.postMessage(
        { type: "TRANSACTION_SIGN_ERROR", error: error.message },
        "*"
      );
    }
  } else if (event.data.type === "CONNECT_WALLET_SOLANA") {
    try {
      const account = await connectWalletSolana();
      window.postMessage({ type: "WALLET_CONNECTED_SOLANA", account }, "*");
    } catch (error) {
      console.error("Error in message handler:", error);
      window.postMessage(
        { type: "WALLET_CONNECTION_ERROR_SOLANA", error: error.message },
        "*"
      );
    }
  } else if (event.data.type === "SIGN_TRANSACTION_SOLANA") {
    try {
      if (!connectedAddress) {
        connectedAddress = await connectWalletSolana();
      }
      const tx = VersionedTransaction.deserialize(
        Buffer.from(event.data.transaction, "base64")
      );
      const { signature } = await window.solana.signTransaction(tx);
      window.postMessage({ type: "TRANSACTION_SIGNED_SOLANA", signature }, "*");
    } catch (error) {
      console.error("Error signing transaction:", error);
      window.postMessage(
        { type: "TRANSACTION_SIGN_ERROR_SOLANA", error: error.message },
        "*"
      );
    }
  }
});
