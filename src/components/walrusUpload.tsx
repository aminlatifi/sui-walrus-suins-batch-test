import { useState } from "react";
import { UploadItemsForm, type UploadItem } from "./uploadItemsForm";
import { useWalrusUpload } from "../hooks/walrusUpload";
import { useCheckWalBalance } from "../hooks/checkWalBalance";
import { useCurrentAccount } from "@mysten/dapp-kit";
import toast from "react-hot-toast";
import { FileType } from "../utils/walrusUtils";
import { EpochSlider } from "./epochSlider";
import { WalBalance } from "./walBalance";

export const WalrusUpload = () => {
  const [epochs, setEpochs] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UploadItem[]>([
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
      <WalBalance />

      <EpochSlider epochs={epochs} setEpochs={setEpochs} />

      <UploadItemsForm items={items} setItems={setItems} />

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
            <div>
              <h4>Quilt ID: {quiltId}</h4>
            </div>
            <table
              style={{
                width: "100%",
                marginTop: "15px",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      border: "1px solid #007bff",
                      padding: "8px",
                      color: "#007bff",
                    }}
                  >
                    Key
                  </th>
                  <th
                    style={{
                      border: "1px solid #007bff",
                      padding: "8px",
                      color: "#007bff",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      border: "1px solid #007bff",
                      padding: "8px",
                      color: "#007bff",
                    }}
                  >
                    Content
                  </th>
                </tr>
              </thead>
              <tbody>
                {uploadResults.map((result) => (
                  <tr key={result.id}>
                    <td style={{ border: "1px solid #007bff", padding: "8px" }}>
                      {result.fileIdentifier}
                    </td>
                    <td style={{ border: "1px solid #007bff", padding: "8px" }}>
                      {result.contentType}
                    </td>
                    <td style={{ border: "1px solid #007bff", padding: "8px" }}>
                      {result.contentType === FileType.IMAGE ? (
                        <img
                          src={`data:image/jpeg;base64,${btoa(
                            String.fromCharCode(...result.bytes)
                          )}`}
                          alt={result.fileIdentifier ?? ""}
                          style={{
                            maxWidth: "120px",
                            maxHeight: "120px",
                            borderRadius: "4px",
                          }}
                        />
                      ) : (
                        <span style={{ whiteSpace: "pre-wrap" }}>
                          {new TextDecoder().decode(result.bytes)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
