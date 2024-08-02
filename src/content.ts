import "@dialectlabs/blinks/index.css";
import {
  EthereumAdapter,
  SolanaActionAdapter,
  StarknetActionAdapter,
} from "./adapters";
import { ObserverOptions, setupTwitterObserver } from "./twitterObserver";

import "./index.css";

declare global {
  interface Window {
    ethereum: any;
    solana: any;
    starknet: any;
  }
}

const OPTIONS: ObserverOptions = {
  securityLevel: "all", // TODO: Should probably support only-trusted or non-malicious
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
  setupTwitterObserver(
    new EthereumAdapter(),
    new SolanaActionAdapter(),
    new StarknetActionAdapter(),
    {},
    OPTIONS
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
