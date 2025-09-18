import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";

import { useState, useEffect } from "react";
import "./App.css";
import { FileType } from "./walrusUtils";
import toast from "react-hot-toast";
import { useWalrusUpload } from "./hooks/walrusUpload";
import { useCheckWalBalance } from "./hooks/checkWalBalance";

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

function WalrusUpload() {
  const [text, setText] = useState("");
  const [epochs, setEpochs] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { uploadFiles, quiltId, uploadResults } = useWalrusUpload();
  const walBalance = useCheckWalBalance();

  const account = useCurrentAccount();

  const handleUpload = async () => {
    if (!text.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      if (!account?.address) {
        throw new Error("Please connect your wallet first");
      }

      await uploadFiles(
        [
          {
            fileIdentifier: "user-upload.txt",
            contentType: FileType.TEXT,
            bytes: new TextEncoder().encode(text),
          },
        ],
        epochs
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
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
        />
        <div style={{ fontSize: "12px", color: "#666" }}>
          Longer storage = higher WAL cost
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
          !text.trim() || isUploading || !account || Number(walBalance) === 0
        }
        style={{
          padding: "10px 20px",
          backgroundColor:
            text.trim() &&
            !isUploading &&
            account &&
            !(Number(walBalance) === 0)
              ? "#007bff"
              : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor:
            text.trim() &&
            !isUploading &&
            account &&
            !(Number(walBalance) === 0)
              ? "pointer"
              : "not-allowed",
        }}
      >
        {isUploading
          ? "Creating Transaction..."
          : `Pay with WAL & Upload (${epochs} epochs)`}
      </button>

      {error && (
        <div style={{ marginTop: "10px", color: "red", fontSize: "14px" }}>
          Error: {error}
        </div>
      )}

      {uploadResults.length > 0 && (
        // show quilt id
        <>
          <div>
            <h4>Quilt ID: {quiltId}</h4>
          </div>

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
            🔗 Content is now accessible on the decentralized network
            {uploadResults.map((result) => (
              <div key={result.id}>
                <h5>{result.fileIdentifier}</h5>
                <p>{result.contentType}</p>
                <p>{result.bytes.toString()}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
