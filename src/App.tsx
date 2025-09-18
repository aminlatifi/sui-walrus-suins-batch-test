import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

import { useEffect } from "react";
import "./App.css";
import toast from "react-hot-toast";
import { WalrusUpload } from "./components/walrusUpload";

function App() {
  return (
    <>
      <div>
        <h1>Walrus File Upload - Sui Testnet</h1>
        <div className="card">
          <ConnectButton />
        </div>
        <ConnectedAccount />
      </div>
    </>
  );
}

function ConnectedAccount() {
  const account = useCurrentAccount();

  useEffect(() => {
    if (account) {
      toast.success(
        `🔗 Wallet connected: ${account.address.slice(
          0,
          8
        )}...${account.address.slice(-6)}`
      );
    }
  }, [account]);

  if (!account) {
    return null;
  }

  return (
    <div>
      <div>Connected to {account.address}</div>
      <WalrusUpload />
    </div>
  );
}

export default App;
