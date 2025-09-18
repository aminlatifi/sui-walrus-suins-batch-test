// Create a hook to handle the walrus upload, it must get a list of files with their types and bytes, and return single quilt id and a function to upload the files

import { useMemo, useState } from "react";
import type { UploadResult, ContentType } from "../walrusUtils";
import { WalrusFile, WalrusClient } from "@mysten/walrus";
import { signAndExecuteTransaction } from "@mysten/wallet-standard";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export const useWalrusUpload = () => {
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [quiltId, setQuiltId] = useState<string | null>(null);
  const account = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const suiClient = useSuiClient();
  const walrusClient = useMemo<WalrusClient>(() => {
    return new WalrusClient({
      network: "testnet",
      suiClient,
    });
  }, [suiClient]);

  const uploadFiles = async (
    files: {
      fileIdentifier: string;
      contentType: ContentType;
      bytes: Uint8Array;
    }[],
    epochs: number
  ) => {
    setUploadResults([]);
    setQuiltId(null);

    if (!account) {
      toast.error("Please connect your wallet first");
      return;
    }

    // Step 1: Create the WalrusFile and flow
    // Create the WalrusFile and flow
    const flow = walrusClient.writeFilesFlow({
      files: files.map((file) => {
        return WalrusFile.from({
          contents: file.bytes,
          identifier: file.fileIdentifier,
          tags: {
            "content-type": file.contentType,
          },
        });
      }),
    });

    await flow.encode();

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
    const flowFiles = await flow.listFiles();
    const quiltId = flowFiles[0].blobId;
    setQuiltId(quiltId);

    const blob = await walrusClient.getBlob({ blobId: quiltId });
    console.log("blob:", blob);
    const blobFiles = await blob.files();
    console.log("blobFiles:", blobFiles);

    blobFiles.forEach(async (file) => {
      console.log("file:", file);
      const tags = await file.getTags();
      const fileIdentifier = await file.getIdentifier();
      const bytes = await file.bytes();

      console.log("tags:", tags);
      console.log("fileIdentifier:", fileIdentifier);
      console.log("bytes:", bytes);

      setUploadResults((prev) => [
        ...prev,
        {
          id: quiltId,
          contentType: tags["content-type"] as ContentType,
          fileIdentifier: fileIdentifier,
          bytes,
        },
      ]);
    });
  };

  return { uploadFiles, quiltId, uploadResults };
};
