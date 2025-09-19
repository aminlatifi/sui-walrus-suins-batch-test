// Create a hook to handle the walrus upload, it must get a list of files with their types and bytes, and return single quilt id and a function to upload the files

import { useMemo, useState } from "react";
import type { UploadResult, ContentType } from "../utils/walrusUtils";
import { WalrusFile, WalrusClient } from "@mysten/walrus";
import { signAndExecuteTransaction } from "@mysten/wallet-standard";
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClient,
} from "@mysten/dapp-kit";
import toast from "react-hot-toast";

export type UploadFileData = {
  fileIdentifier: string;
  contentType: ContentType;
  bytes: Uint8Array;
};

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

  const uploadFiles = async (files: UploadFileData[], epochs: number) => {
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

    const registerToast = toast.loading("Registering blob...");
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
      toast.error("No wallet connected");
      return;
    }

    const { digest } = await signAndExecuteTransaction(currentWallet, {
      transaction: registerTx,
      account: account,
      chain: "sui:testnet",
    });
    toast.success("Blob registered", { id: registerToast });

    console.log("digest:", digest);
    const uploadToast = toast.loading("Uploading blob...");
    // Step 3: Upload the data to storage nodes
    await flow.upload({ digest });
    toast.success("Blob uploaded", { id: uploadToast });

    const certifyToast = toast.loading("Certifying blob...");
    // Step 4: Certify the blob
    const certifyTx = flow.certify();

    console.log("certifyTx:", certifyTx);

    // Set the sender and build the transaction with the Sui client
    certifyTx.setSender(account.address);
    await certifyTx.build({ client: suiClient });

    await signAndExecuteTransaction(currentWallet, {
      transaction: certifyTx,
      account: account,
      chain: "sui:testnet",
    });
    toast.success("Blob certified", { id: certifyToast });

    const getFilesToast = toast.loading("Reading files info...");
    // Step 5: Get the new files
    const flowFiles = await flow.listFiles();
    const quiltId = flowFiles[0].blobId;
    setQuiltId(quiltId);

    const blob = await walrusClient.getBlob({ blobId: quiltId });
    const blobFiles = await blob.files();
    toast.success("Files info read", { id: getFilesToast });

    const setUploadResultsToast = toast.loading("Setting upload results...");
    blobFiles.forEach(async (file) => {
      const tags = await file.getTags();
      const fileIdentifier = await file.getIdentifier();
      const bytes = await file.bytes();

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
    toast.success("Upload results set", { id: setUploadResultsToast });
  };

  return { uploadFiles, quiltId, uploadResults };
};
