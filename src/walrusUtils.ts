// Create const object for file types (compatible with erasableSyntaxOnly)
export const FileType = {
  TEXT: "text/plain",
  JSON: "application/json",
  IMAGE: "image/jpeg",
  VIDEO: "video/mp4",
  AUDIO: "audio/mpeg",
} as const;

export type ContentType = (typeof FileType)[keyof typeof FileType];
export interface UploadResult {
  id: string;
  contentType: ContentType;
  fileIdentifier: string | null;
  bytes: Uint8Array;
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

    if (result.newlyCreated) {
      blobId = result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified) {
      blobId = result.alreadyCertified.blobId;
    } else {
      throw new Error("Unexpected response format");
    }

    return {
      id: blobId,
      contentType: FileType.TEXT,
      fileIdentifier: "user-upload.txt",
      bytes: new Uint8Array(),
    };
  } else {
    const errorText = await response.text();
    throw new Error(
      `Upload failed with status ${response.status}: ${errorText}`
    );
  }
};
