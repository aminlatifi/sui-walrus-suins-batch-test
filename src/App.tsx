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

interface Item {
  id: number;
  key: string;
  type: "text" | "image";
  value: string;
  bytes: Uint8Array;
}

function WalrusUpload() {
  const [epochs, setEpochs] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([
    {
      id: Date.now(),
      key: "default",
      type: "text",
      value: "",
      bytes: new Uint8Array(),
    },
  ]);
  const { uploadFiles, quiltId, uploadResults } = useWalrusUpload();

  const walBalance = useCheckWalBalance();

  const account = useCurrentAccount();

  const handleUpload = async () => {
    // Check if we have valid items to upload
    const validItems = items.filter(
      (item) => item.key.trim() && item.bytes.length > 0
    );
    if (validItems.length === 0) {
      toast.error("Please add at least one item with a key and value");
      return;
    }

    setIsUploading(true);
    setError(null);

    // Show loading toast
    const loadingToast = toast.loading(
      `Uploading ${validItems.length} item${
        validItems.length !== 1 ? "s" : ""
      } to Walrus...`
    );

    try {
      if (!account?.address) {
        throw new Error("Please connect your wallet first");
      }

      // Convert items to upload format
      const filesToUpload = validItems.map((item) => ({
        fileIdentifier: item.key,
        contentType: item.type === "image" ? FileType.IMAGE : FileType.TEXT,
        bytes: item.bytes,
      }));

      await uploadFiles(filesToUpload, epochs);

      // Success toast
      toast.success(
        `🎉 Upload successful! ${validItems.length} item${
          validItems.length !== 1 ? "s" : ""
        } stored for ${epochs} epoch${epochs !== 1 ? "s" : ""} (~${
          epochs * 14
        } days)`,
        { id: loadingToast }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);

      // Error toast
      toast.error(`Upload failed: ${errorMessage}`, { id: loadingToast });
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
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            {/* Key input */}
            <input
              type="text"
              value={item.key}
              onChange={(e) => {
                const newItems = [...items];
                newItems[idx].key = e.target.value;
                setItems(newItems);
              }}
              placeholder="Key"
              style={{
                flex: 1,
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            />

            {/* Type dropdown */}
            <select
              value={item.type}
              onChange={(e) => {
                const newItems = [...items];
                newItems[idx].type = e.target.value as "text" | "image";
                // Reset value and bytes when type changes
                newItems[idx].value = "";
                newItems[idx].bytes = new Uint8Array();
                setItems(newItems);
              }}
              style={{
                flex: 0.7,
                padding: "6px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                fontSize: "14px",
              }}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
            </select>

            {/* Value input */}
            {item.type === "text" ? (
              <input
                type="text"
                value={item.value}
                onChange={(e) => {
                  const newItems = [...items];
                  newItems[idx].value = e.target.value;
                  newItems[idx].bytes = new TextEncoder().encode(
                    e.target.value
                  );
                  setItems(newItems);
                }}
                placeholder="Enter value"
                style={{
                  flex: 2,
                  padding: "6px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const arrayBuffer = await file.arrayBuffer();
                    const uint8 = new Uint8Array(arrayBuffer);
                    const newItems = [...items];
                    newItems[idx].value = file.name;
                    newItems[idx].bytes = uint8;
                    setItems(newItems);
                  }
                }}
                style={{
                  flex: 2,
                  padding: "6px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "14px",
                }}
              />
            )}

            {/* Remove item button */}
            <button
              type="button"
              onClick={() => {
                setItems(items.filter((_, i) => i !== idx));
                toast.success("Item removed");
              }}
              style={{
                marginLeft: "5px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                padding: "6px 10px",
                cursor: "pointer",
              }}
              title="Remove item"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            setItems([
              ...items,
              {
                id: Date.now() + Math.random(),
                key: "",
                type: "text",
                value: "",
                bytes: new Uint8Array(),
              },
            ]);
            toast.success("New item added");
          }}
          style={{
            marginBottom: "10px",
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "6px 16px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          + Add Item
        </button>
      </div>
      <button
        onClick={handleUpload}
        disabled={
          items.filter((item) => item.key.trim() && item.bytes.length > 0)
            .length === 0 ||
          isUploading ||
          !account ||
          Number(walBalance) === 0
        }
        style={{
          padding: "10px 20px",
          backgroundColor:
            items.filter((item) => item.key.trim() && item.bytes.length > 0)
              .length > 0 &&
            !isUploading &&
            account &&
            !(Number(walBalance) === 0)
              ? "#007bff"
              : "#ccc",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor:
            items.filter((item) => item.key.trim() && item.bytes.length > 0)
              .length > 0 &&
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
