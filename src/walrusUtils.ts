export interface UploadResult {
  blobId: string;
  url: string;
  suiObjectId: string;
  txDigest: string;
  content?: string;
  cost: string;
  storageEpochs: number;
}

export const handlePublisherFundedUpload = async (
  textBlob: Blob,
  epochs: number,
  accountAddress: string
): Promise<UploadResult> => {
  const publisherUrl = "https://publisher.walrus-testnet.walrus.space";
  const response = await fetch(
    `${publisherUrl}/v1/blobs?epochs=${epochs}&send_object_to=${accountAddress}`,
    {
      method: "PUT",
      body: textBlob,
    }
  );

  if (response.status === 200) {
    const result = await response.json();
    let blobId: string;
    let suiObjectId: string;
    let txDigest: string;
    let cost: string;

    if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId;
      suiObjectId = result.newlyCreated.blobObject.id;
      txDigest = "Publisher-funded";
      cost = `${result.newlyCreated.cost || 0} FROST (paid by publisher)`;
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId;
      suiObjectId = "Already exists";
      txDigest = result.alreadyCertified.event?.txDigest || "N/A";
      cost = "0 FROST (already certified)";
    } else {
      throw new Error("Unexpected response format");
    }

    return {
      blobId,
      url: `https://aggregator.walrus-testnet.walrus.space/v1/blobs/${blobId}`,
      suiObjectId,
      txDigest,
      cost,
      storageEpochs: epochs,
    };
  } else {
    const errorText = await response.text();
    throw new Error(
      `Upload failed with status ${response.status}: ${errorText}`
    );
  }
};
