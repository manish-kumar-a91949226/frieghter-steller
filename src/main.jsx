import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Send,
  Wallet
} from "lucide-react";
import {
  Networks,
  TransactionBuilder,
  BASE_FEE,
  Asset,
  Account,
  Operation
} from "@stellar/stellar-sdk";
import {
  getAddress,
  isConnected,
  isAllowed,
  requestAccess,
  signTransaction
} from "@stellar/freighter-api";
import "./styles.css";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const EXPLORER_URL = "https://stellar.expert/explorer/testnet/tx";
const FRIENDBOT_URL = "https://friendbot.stellar.org";

function shortAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
}

function parseFreighterResult(result) {
  if (typeof result === "string") return result;
  return result?.address || result?.publicKey || "";
}

function getXlmBalance(account) {
  const nativeBalance = account.balances.find((balance) => balance.asset_type === "native");
  return nativeBalance ? Number(nativeBalance.balance).toFixed(4) : "0.0000";
}

async function horizonFetch(path, options) {
  const response = await fetch(`${HORIZON_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body?.extras?.result_codes
      ? JSON.stringify(body.extras.result_codes)
      : body?.detail || body?.title || "Horizon request failed";
    throw new Error(message);
  }

  return body;
}

function App() {
  const [publicKey, setPublicKey] = useState("");
  const [balance, setBalance] = useState(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState({ type: "idle", message: "Connect Freighter to begin." });
  const [isBusy, setIsBusy] = useState(false);
  const [isFunding, setIsFunding] = useState(false);

  const accountExplorerUrl = useMemo(
    () => (publicKey ? `https://stellar.expert/explorer/testnet/account/${publicKey}` : ""),
    [publicKey]
  );

  const refreshBalance = useCallback(async (address = publicKey) => {
    if (!address) return;

    try {
      const account = await horizonFetch(`/accounts/${address}`);
      setBalance(getXlmBalance(account));
    } catch (error) {
      setBalance("0.0000");
      setStatus({
        type: "error",
        message: `Could not load balance. ${error.message}`
      });
    }
  }, [publicKey]);

  const connectWallet = useCallback(async () => {
    setIsBusy(true);
    setStatus({ type: "loading", message: "Waiting for Freighter approval..." });

    try {
      const connectedResult = await isConnected();
      const isFreighterConnected = typeof connectedResult === "object" ? connectedResult.isConnected : connectedResult;
      if (!isFreighterConnected) {
        throw new Error("Freighter is not installed or enabled in this browser.");
      }

      const allowedResult = await isAllowed();
      const isUserAllowed = typeof allowedResult === "object" ? allowedResult.isAllowed : allowedResult;
      const accessResult = isUserAllowed ? await getAddress() : await requestAccess();
      const address = parseFreighterResult(accessResult);

      if (accessResult?.error) throw new Error(accessResult.error);
      if (!address) throw new Error("Freighter did not return a public key.");

      setPublicKey(address);
      setStatus({ type: "success", message: "Wallet connected on Stellar testnet." });
      await refreshBalance(address);
    } catch (error) {
      setStatus({ type: "error", message: error.message });
    } finally {
      setIsBusy(false);
    }
  }, [refreshBalance]);

  const disconnectWallet = () => {
    setPublicKey("");
    setBalance(null);
    setRecipient("");
    setAmount("");
    setStatus({ type: "idle", message: "Wallet disconnected." });
  };

  const fundTestnetWallet = async () => {
    if (!publicKey) return;
    setIsFunding(true);
    setStatus({ type: "loading", message: "Requesting testnet XLM from Friendbot..." });

    try {
      await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(publicKey)}`).then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
      });
      await refreshBalance(publicKey);
      setStatus({ type: "success", message: "Testnet wallet funded successfully." });
    } catch (error) {
      setStatus({ type: "error", message: `Friendbot funding failed. ${error.message}` });
    } finally {
      setIsFunding(false);
    }
  };

  const sendPayment = async (event) => {
    event.preventDefault();
    if (!publicKey) return;

    setIsBusy(true);
    setStatus({ type: "loading", message: "Building Stellar testnet transaction..." });

    try {
      if (!recipient.trim()) throw new Error("Enter a destination Stellar public key.");
      if (!amount || Number(amount) <= 0) throw new Error("Enter an XLM amount greater than 0.");

      const sourceAccount = await horizonFetch(`/accounts/${publicKey}`);
      const transaction = new TransactionBuilder(
        new Account(sourceAccount.account_id, sourceAccount.sequence),
        {
          fee: BASE_FEE,
          networkPassphrase: Networks.TESTNET
        }
      )
        .addOperation(
          Operation.payment({
            destination: recipient.trim(),
            asset: Asset.native(),
            amount: Number(amount).toFixed(7)
          })
        )
        .setTimeout(180)
        .build();

      setStatus({ type: "loading", message: "Approve the payment in Freighter..." });
      const signedXdr = await signTransaction(transaction.toXDR(), {
        networkPassphrase: Networks.TESTNET
      });

      if (signedXdr?.error) throw new Error(signedXdr.error);

      setStatus({ type: "loading", message: "Submitting transaction to Stellar testnet..." });
      const result = await horizonFetch("/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ tx: typeof signedXdr === "string" ? signedXdr : signedXdr.signedTxXdr })
      });

      setAmount("");
      await refreshBalance(publicKey);
      setStatus({
        type: "success",
        message: "Payment sent successfully.",
        hash: result.hash
      });
    } catch (error) {
      setStatus({ type: "error", message: `Transaction failed. ${error.message}` });
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  const statusIcon =
    status.type === "success" ? <CheckCircle2 /> :
    status.type === "error" ? <AlertCircle /> :
    status.type === "loading" ? <Loader2 className="spin" /> :
    <Wallet />;

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Stellar Testnet</p>
          <h1>White Belt XLM Payment dApp</h1>
          <p>
            Connect Freighter, inspect your testnet XLM balance, fund your account, and send a live
            payment on Stellar testnet.
          </p>
        </div>
        <div className="network-pill">TESTNET</div>
      </section>

      <section className="workspace">
        <aside className="wallet-panel">
          <div className="panel-heading">
            <div>
              <span>Wallet</span>
              <h2>{publicKey ? "Connected" : "Not connected"}</h2>
            </div>
            <Wallet aria-hidden="true" />
          </div>

          {publicKey ? (
            <>
              <div className="address-box">
                <span>Public key</span>
                <strong title={publicKey}>{shortAddress(publicKey)}</strong>
              </div>

              <div className="balance-box">
                <span>XLM Balance</span>
                <strong>{balance ?? "Loading..."}</strong>
              </div>

              <div className="button-grid">
                <button type="button" onClick={() => refreshBalance()} disabled={isBusy}>
                  <RefreshCw size={18} />
                  Refresh
                </button>
                <button type="button" onClick={fundTestnetWallet} disabled={isFunding || isBusy}>
                  {isFunding ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
                  Fund
                </button>
              </div>

              <a href={accountExplorerUrl} target="_blank" rel="noreferrer" className="explorer-link">
                View account <ExternalLink size={16} />
              </a>

              <button type="button" className="ghost-button" onClick={disconnectWallet}>
                <LogOut size={18} />
                Disconnect
              </button>
            </>
          ) : (
            <button type="button" className="primary-button" onClick={connectWallet} disabled={isBusy}>
              {isBusy ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
              Connect Freighter
            </button>
          )}
        </aside>

        <section className="payment-panel">
          <div className="panel-heading">
            <div>
              <span>Payment</span>
              <h2>Send testnet XLM</h2>
            </div>
            <Send aria-hidden="true" />
          </div>

          <form onSubmit={sendPayment}>
            <label>
              Destination address
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                placeholder="G..."
                disabled={!publicKey || isBusy}
              />
            </label>

            <label>
              Amount
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                type="number"
                min="0"
                step="0.0000001"
                placeholder="10"
                disabled={!publicKey || isBusy}
              />
            </label>

            <button type="submit" className="primary-button" disabled={!publicKey || isBusy}>
              {isBusy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              Send XLM
            </button>
          </form>

          <div className={`status-box ${status.type}`}>
            {statusIcon}
            <div>
              <span>Status</span>
              <p>{status.message}</p>
              {status.hash && (
                <a href={`${EXPLORER_URL}/${status.hash}`} target="_blank" rel="noreferrer">
                  {status.hash}
                </a>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
