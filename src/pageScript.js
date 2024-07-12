window.postMessage({ type: "PAGE_SCRIPT_LOADED" }, "*");

let connectedAddress = null;

async function connectWallet() {
    console.log("Attempting to connect wallet...");
    if (typeof window.ethereum === 'undefined') {
      console.error("window.ethereum is undefined in pageScript");
      return Promise.reject("No Ethereum provider found");
    }
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      connectedAddress = accounts[0];
      console.log("Wallet connected successfully:", connectedAddress);
      return connectedAddress;
    } catch (error) {
      console.error("Error in connectWallet:", error);
      return null;
    }
  }
  
  window.postMessage({ type: "ETHEREUM_READY" }, "*");
  
  window.addEventListener("message", async (event) => {
    if (event.data.type === "CONNECT_WALLET") {
      try {
        const account = await connectWallet();
        window.postMessage({ type: "WALLET_CONNECTED", account }, "*");
      } catch (error) {
        console.error("Error in message handler:", error);
        window.postMessage({ type: "WALLET_CONNECTION_ERROR", error: error.message }, "*");
      }
    } else if (event.data.type === "SIGN_TRANSACTION") {
      try {
        if (!connectedAddress) {
          throw new Error("Wallet not connected");
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
        window.postMessage({ type: "TRANSACTION_SIGN_ERROR", error: error.message }, "*");
      }
    }
  });
