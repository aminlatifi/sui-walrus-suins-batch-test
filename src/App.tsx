import {
  ConnectButton,
  useCurrentAccount,
  useSuiClientQuery,
  useSuiClient,
  useCurrentWallet,
} from "@mysten/dapp-kit";

import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { WalrusClient, WalrusFile } from "@mysten/walrus";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { signAndExecuteTransaction } from "@mysten/wallet-standard";
import { handlePublisherFundedUpload } from "./walrusUtils";
import type { UploadResult } from "./walrusUtils";

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

  if (!account) {
    return null;
  }

  return (
    <div>
      <div>Connected to {account.address}</div>
      <WalrusUpload />
      <OwnedObjects address={account.address} />
    </div>
  );
}

function OwnedObjects({ address }: { address: string }) {
  const { data } = useSuiClientQuery("getOwnedObjects", {
    owner: address,
  });

  if (!data) {
    return <div>Loading objects...</div>;
  }

  return (
    <div>
      <h3>Owned Objects ({data.data.length})</h3>
      <ul>
        {data.data.map((object) => (
          <li key={object.data?.objectId}>
            <a
              href={`https://suiscan.xyz/testnet/object/${object.data?.objectId}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {object.data?.objectId}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WalrusUpload() {
  const [text, setText] = useState("");
  const [epochs, setEpochs] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [walBalance, setWalBalance] = useState<string | null>(null);
  const [useUserPayment, setUseUserPayment] = useState(true);
  const { currentWallet } = useCurrentWallet();

  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const walrusClient = useMemo<WalrusClient>(() => {
    const _suiClient = new SuiClient({
      url: getFullnodeUrl("testnet"),
    });
    return new WalrusClient({
      network: "testnet",
      suiClient: _suiClient,
    });
  }, []);

  // Check WAL balance
  useEffect(() => {
    const checkWalBalance = async () => {
      if (account?.address && suiClient) {
        try {
          // WAL token type for Sui testnet
          const walCoinType =
            "0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL";

          const balance = await suiClient.getBalance({
            owner: account.address,
            coinType: walCoinType,
          });

          setWalBalance((Number(balance.totalBalance) / 1e9).toFixed(3));
        } catch (error) {
          console.log("WAL balance not found or error:", error);
          setWalBalance("0.000");
        }
      }
    };
    checkWalBalance();
  }, [account?.address, suiClient]);

  const handleUpload = async () => {
    if (!text.trim()) return;

    setIsUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      if (!account?.address) {
        throw new Error("Please connect your wallet first");
      }

      const textBlob = new Blob([text], { type: "text/plain" });

      if (useUserPayment) {
        // User-paid storage using Walrus SDK
        await handleUserPaidUpload(text);
      } else {
        // Publisher-funded storage (current method)
        const result = await handlePublisherFundedUpload(
          textBlob,
          epochs,
          account.address
        );
        setUploadResult(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUserPaidUpload = async (text: string) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    console.log("text:", text);
    // Step 1: Create the WalrusFile and flow
    // Create the WalrusFile and flow
    const flow = walrusClient.writeFilesFlow({
      files: [
        WalrusFile.from({
          contents: new TextEncoder().encode(text),
          identifier: "user-upload.txt",
        }),
      ],
    });
    console.log("after flow");

    await flow.encode();

    console.log("flow:", flow);

    // Step 2: Register the blob
    const registerTx = flow.register({
      epochs,
      owner: account.address,
      deletable: true,
    });

    // Set the sender and build the transaction with the Sui client
    registerTx.setSender(account.address);
    await registerTx.build({ client: suiClient });

    if (!currentWallet) {
      throw new Error("No wallet connected");
    }

    const { digest } = await signAndExecuteTransaction(currentWallet, {
      transaction: registerTx,
      account: account,
      chain: "sui:testnet",
    });

    console.log("digest:", digest);
    // Step 3: Upload the data to storage nodes
    await flow.upload({ digest });

    console.log("after flow.upload");

    // Step 4: Certify the blob
    const certifyTx = flow.certify();

    console.log("certifyTx:", certifyTx);

    // Set the sender and build the transaction with the Sui client
    certifyTx.setSender(account.address);
    await certifyTx.build({ client: suiClient });

    console.log("after certifyTx.build");

    await signAndExecuteTransaction(currentWallet, {
      transaction: certifyTx,
      account: account,
      chain: "sui:testnet",
    });

    console.log("after 2# signAndExecuteTransaction");

    // Step 5: Get the new files
    const files = await flow.listFiles();
    const filesContent = await walrusClient.getFiles({
      ids: files.map((file) => file.blobId),
    });

    // Extract info for UI
    if (files.length > 0) {
      const file = files[0];
      const content = filesContent[0];
      setUploadResult({
        blobId: file.blobId,
        url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${file.blobId}`,
        suiObjectId: file.id,
        txDigest: digest,
        content: await content.text(),
        cost: `Paid with WAL (user)`,
        storageEpochs: epochs,
      });
    } else {
      throw new Error("No files returned after upload");
    }
  };

  return (
    <div
      style={{
        margin: "20px 0",
        padding: "20px",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <h3>Upload Text to Walrus</h3>

      {/* Payment Method Selection */}
      <div
        style={{
          marginBottom: "15px",
          padding: "10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "4px",
        }}
      >
        <div style={{ marginBottom: "10px" }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <input
              type="radio"
              name="paymentMethod"
              checked={!useUserPayment}
              onChange={() => setUseUserPayment(false)}
              style={{ marginRight: "8px" }}
            />
            <strong>Publisher-Funded (Free)</strong>
            <span
              style={{ marginLeft: "10px", fontSize: "12px", color: "#666" }}
            >
              Publisher pays storage costs, limited duration
            </span>
          </label>
          <label style={{ display: "flex", alignItems: "center" }}>
            <input
              type="radio"
              name="paymentMethod"
              checked={useUserPayment}
              onChange={() => setUseUserPayment(true)}
              style={{ marginRight: "8px" }}
            />
            <strong>User-Paid</strong>
            <span
              style={{ marginLeft: "10px", fontSize: "12px", color: "#666" }}
            >
              You pay with WAL tokens, choose storage duration
            </span>
          </label>
        </div>

        {walBalance !== null && (
          <div style={{ fontSize: "12px", color: "#666" }}>
            Your WAL balance: <strong>{walBalance} WAL</strong>
            {Number(walBalance) === 0 && (
              <span style={{ color: "#dc3545", marginLeft: "10px" }}>
                (Get WAL tokens from{" "}
                <a
                  href="https://discord.gg/Sui"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Sui Discord #testnet-faucet
                </a>
                )
              </span>
            )}
          </div>
        )}
      </div>

      {/* Storage Duration */}
      <div style={{ marginBottom: "15px" }}>
        <label
          style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}
        >
          Storage Duration: {epochs} epoch{epochs !== 1 ? "s" : ""} (~
          {epochs * 14} days)
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={epochs}
          onChange={(e) => setEpochs(Number(e.target.value))}
          style={{ width: "100%", marginBottom: "5px" }}
          disabled={!useUserPayment}
        />
        <div style={{ fontSize: "12px", color: "#666" }}>
          {useUserPayment
            ? "Longer storage = higher WAL cost"
            : "Publisher-funded storage limited to selected epochs"}
        </div>
      </div>

      <div style={{ marginBottom: "10px" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your text here..."
          style={{
            width: "100%",
            height: "100px",
            padding: "8px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        />
      </div>
      <button
        onClick={handleUpload}
        disabled={
          !text.trim() ||
          isUploading ||
          !account ||
          (useUserPayment && Number(walBalance) === 0)
        }
        style={{
          padding: "10px 20px",
          backgroundColor:
            text.trim() &&
            !isUploading &&
            account &&
            !(useUserPayment && Number(walBalance) === 0)
              ? "#007bff"
              : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor:
            text.trim() &&
            !isUploading &&
            account &&
            !(useUserPayment && Number(walBalance) === 0)
              ? "pointer"
              : "not-allowed",
        }}
      >
        {isUploading
          ? useUserPayment
            ? "Creating Transaction..."
            : "Uploading to Walrus & Sui..."
          : useUserPayment
          ? `Pay with WAL & Upload (${epochs} epochs)`
          : `Upload to Walrus (${epochs} epochs)`}
      </button>

      {error && (
        <div style={{ marginTop: "10px", color: "red", fontSize: "14px" }}>
          Error: {error}
        </div>
      )}

      {uploadResult && (
        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            backgroundColor: "#010407",
            border: "1px solid #007bff",
            borderRadius: "8px",
          }}
        >
          <h4 style={{ color: "#007bff", marginTop: 0 }}>
            Upload Successful! 🎉
          </h4>

          <div style={{ marginBottom: "10px" }}>
            <strong>Blob ID:</strong>
            <code
              style={{
                backgroundColor: "#101b27",
                padding: "2px 4px",
                marginLeft: "5px",
              }}
            >
              {uploadResult.blobId}
            </code>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Sui Object ID:</strong>
            <code
              style={{
                backgroundColor: "#101b27",
                padding: "2px 4px",
                marginLeft: "5px",
              }}
            >
              {uploadResult.suiObjectId}
            </code>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Storage Cost:</strong>
            <span
              style={{
                marginLeft: "5px",
                color: useUserPayment ? "#dc3545" : "#28a745",
              }}
            >
              {uploadResult.cost}
            </span>
          </div>

          <div style={{ marginBottom: "10px" }}>
            <strong>Storage Duration:</strong>
            <span style={{ marginLeft: "5px" }}>
              {uploadResult.storageEpochs} epoch
              {uploadResult.storageEpochs !== 1 ? "s" : ""} (~
              {uploadResult.storageEpochs * 14} days)
            </span>
          </div>

          {uploadResult.txDigest !== "N/A" &&
            uploadResult.txDigest !== "Publisher-funded" && (
              <div style={{ marginBottom: "10px" }}>
                <strong>Transaction:</strong>{" "}
                <a
                  href={`https://suiscan.xyz/testnet/tx/${uploadResult.txDigest}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#007bff" }}
                >
                  View on Suiscan
                </a>
              </div>
            )}

          <div style={{ marginBottom: "10px" }}>
            <strong>View Content:</strong>{" "}
            <a
              href={uploadResult.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#007bff" }}
            >
              Open in Walrus Network
            </a>
          </div>
          <div style={{ marginBottom: "10px" }}>
            <strong>Content:</strong>{" "}
            <code
              style={{
                backgroundColor: "#101b27",
                padding: "2px 4px",
                marginLeft: "5px",
              }}
            >
              {uploadResult.content}
            </code>
          </div>

          <div style={{ fontSize: "12px", color: "#666", marginTop: "10px" }}>
            ✅ File uploaded to Walrus decentralized storage
            <br />
            ✅ Sui blockchain object created and sent to your wallet
            <br />
            {useUserPayment ? (
              <>
                💰 You paid for {uploadResult.storageEpochs} epoch
                {uploadResult.storageEpochs !== 1 ? "s" : ""} of storage with
                your WAL tokens
              </>
            ) : (
              <>
                🆓 Publisher funded storage for {uploadResult.storageEpochs}{" "}
                epoch{uploadResult.storageEpochs !== 1 ? "s" : ""}
              </>
            )}
            <br />
            🔗 Content is now accessible on the decentralized network
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
