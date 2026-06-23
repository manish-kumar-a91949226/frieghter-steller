# Stellar White Belt Payment dApp

A Level 1 White Belt Stellar dApp for testnet. The app connects to Freighter, shows the connected wallet address and XLM balance, can fund the wallet with Friendbot, and sends XLM payments on Stellar testnet with success/failure feedback and a transaction hash.

## Features

- Freighter wallet connect and disconnect
- Stellar testnet network configuration
- XLM balance fetch from Horizon testnet
- Friendbot testnet funding helper
- Send XLM to any Stellar testnet address
- Transaction success/failure state in the UI
- Transaction hash with Stellar Expert testnet explorer link

## Tech Stack

- React
- Vite
- `@stellar/freighter-api`
- `@stellar/stellar-sdk`
- Horizon testnet

## Run Locally

1. Install [Freighter](https://www.freighter.app/) in your browser.
2. In Freighter, switch the network to **Testnet**.
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

5. Open the local URL printed by Vite, usually `http://localhost:5173`.

## How To Test

1. Click **Connect Freighter** and approve access.
2. Click **Fund** if your testnet account needs XLM.
3. Confirm the XLM balance is displayed.
4. Enter a destination testnet public key and amount.
5. Click **Send XLM** and approve the transaction in Freighter.
6. Confirm the success state and transaction hash appear in the app.

## Screenshots

Add these screenshots before final submission:

- Wallet connected state: `screenshots/wallet-connected.png`
- Balance displayed: `screenshots/balance-displayed.png`
- Successful testnet transaction: `screenshots/successful-transaction.png`
- Transaction result shown to the user: `screenshots/transaction-result.png`

## Deployment

This Vite app can be deployed to Vercel, Netlify, GitHub Pages, or any static hosting provider.

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Submission Checklist

- [x] Public GitHub repository ready project files
- [x] README with project description
- [x] Local setup instructions
- [x] Freighter wallet setup
- [x] Wallet connect
- [x] Wallet disconnect
- [x] XLM balance display
- [x] XLM transaction flow on testnet
- [x] Success/failure transaction feedback
- [x] Transaction hash display
- [ ] Screenshots added after running with Freighter
- [ ] Deployed public app URL added after hosting
