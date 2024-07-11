# Twitter Blink Unfurler for Ethereum

## Introduction

The Twitter Blink Unfurler for Ethereum is a Chrome extension inspired by the [Solana Actions and Blinks protocol](https://docs.dialect.to/documentation). It uses the [Blinks](https://github.com/dialectlabs/blinks) library to detect and unfurl Ethereum Action URLs into interactive experiences.

This extension brings the power of blockchain interactions directly to your Twitter feed by unfurling Ethereum transaction links into interactive experiences.

## What are Blinks?

Blinks, short for Blockchain Links, are similar to link previews but with interactive capabilities. Our extension detects Ethereum Action URLs in tweets and unfurls them into full, interactive experiences right within Twitter.

## Features

- Detects Ethereum Action URLs in tweets
- Unfurls detected links into interactive transaction previews
- Supports various Ethereum transactions, including ETH transfers and ERC-20 token transfers
- Integrates seamlessly with Twitter's user interface

## Installation

To add the Twitter Blink Unfurler for Ethereum to your Chrome browser:

1. Clone the repository: `git clone https://github.com/NethermindEth/blink-extension.git`
2. Navigate to the project directory: `cd blink-extension`
3. Install dependencies: `npm install`
4. Build the extension: `npm run build`
5. Open Chrome and navigate to `chrome://extensions/`
6. Enable "Developer mode" in the top right corner
7. Click "Load unpacked" and select the directory containing the extension files
8. The extension should now appear in your Chrome toolbar

## Usage

Once installed, the extension works automatically:

1. Browse Twitter as usual
2. When you encounter a tweet containing an Ethereum Action URL, the extension will detect it
3. The Action URL will be replaced with an interactive Blink, showing transaction details and allowing you to interact with it directly from Twitter
