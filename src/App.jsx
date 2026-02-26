import React, { useState, useEffect } from "react";
import * as StellarSdk from "stellar-sdk";
import { getAddress, signTransaction, requestAccess, isConnected } from "@stellar/freighter-api";
import { server } from "./stellar";

function App() {

  // state variables
  const [pubKey, setPubKey] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [memoText, setMemoText] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [xlmBalance, setXlmBalance] = useState(null);

  // jab wallet connect ho jaye tab balance load kare
  useEffect(() => {
    if (pubKey !== "") {
      loadBalance();
    }
  }, [pubKey]);

  // balance fetch karne ke liye
  const loadBalance = async () => {
    try {
      const acc = await server.loadAccount(pubKey);
      const xlm = acc.balances.find(item => item.asset_type === "native");
      setXlmBalance(xlm ? xlm.balance : "0");
    } catch (err) {
      console.log("Error while fetching balance", err);
    }
  };

  // wallet connect function
  const handleConnect = async () => {
    try {
      setLoading(true);
      setMessage("Connecting wallet...");

      const exists = await isConnected();
      if (!exists) {
        setMessage("Freighter wallet not found.");
        setLoading(false);
        return;
      }

      await requestAccess();
      const addrResult = await getAddress();
      const address = typeof addrResult === "string" ? addrResult : addrResult?.address;

      if (!address) {
        setMessage("Permission denied.");
        setLoading(false);
        return;
      }

      setPubKey(address);
      setMessage("Wallet connected!");
    } catch (err) {
      console.log("Wallet connection error", err);
      setMessage("Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  // payment send karne ke liye
  const handlePayment = async () => {

    if (toAddress === "" || sendAmount === "") {
      setMessage("Please enter address and amount.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Creating transaction...");

      // address validate karna
      if (!StellarSdk.StrKey.isValidEd25519PublicKey(toAddress)) {
        setMessage("Invalid address.");
        setLoading(false);
        return;
      }

      const acc = await server.loadAccount(pubKey);

      const tx = new StellarSdk.TransactionBuilder(acc, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: toAddress,
            asset: StellarSdk.Asset.native(),
            amount: sendAmount,
          })
        )
        .addMemo(StellarSdk.Memo.text(memoText || ""))
        .setTimeout(30)
        .build();

      const wrappedTx = new StellarSdk.Transaction(
        tx.toXDR(),
        StellarSdk.Networks.TESTNET
      );

      setMessage("Waiting for wallet signature...");

      const signed = await signTransaction(
        wrappedTx.toEnvelope().toXDR("base64"),
        { networkPassphrase: StellarSdk.Networks.TESTNET }
      );

      const signedXDR = typeof signed === "string" ? signed : signed?.signedTxXdr;

      if (!signedXDR) {
        setMessage("Transaction cancelled.");
        setLoading(false);
        return;
      }

      setMessage("Sending to network...");

      const res = await fetch("https://horizon-testnet.stellar.org/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `tx=${encodeURIComponent(signedXDR)}`
      });

      if (!res.ok) {
        const errText = await res.text();
        console.log("Horizon error:", errText);
        setMessage("Transaction rejected.");
        setLoading(false);
        return;
      }

      await res.json();
      setMessage("Payment successful!");
      loadBalance();
      setSendAmount("");
      setMemoText("");

    } catch (err) {
      console.log("Transaction error", err);
      setMessage("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel">
      <h2 style={{ textAlign: "center" }}>Stellar Pay</h2>

      {!pubKey ? (
        <div style={{ textAlign: "center" }}>
          <button onClick={handleConnect} disabled={loading}>
            {loading ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      ) : (
        <div>

          <p>
            {pubKey.slice(0, 6)}...{pubKey.slice(-4)}
            {xlmBalance && (
              <span style={{ marginLeft: "10px" }}>
                {parseFloat(xlmBalance).toFixed(2)} XLM
              </span>
            )}
          </p>

          <input
            type="text"
            placeholder="Destination Address"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            disabled={loading}
          />

          <input
            type="number"
            placeholder="Amount"
            value={sendAmount}
            onChange={(e) => setSendAmount(e.target.value)}
            disabled={loading}
          />

          <input
            type="text"
            placeholder="Memo (optional)"
            value={memoText}
            onChange={(e) => setMemoText(e.target.value)}
            disabled={loading}
          />

          <button onClick={handlePayment} disabled={loading}>
            {loading ? "Processing..." : "Send Payment"}
          </button>

        </div>
      )}

      {message && (
        <div style={{ marginTop: "15px" }}>
          {message}
        </div>
      )}
    </div>
  );
}

export default App;