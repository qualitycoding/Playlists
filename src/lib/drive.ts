export interface DriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

/**
 * Creates or retrieves a folder named "Discogs Streaming Sync" in the user's Drive.
 */
export async function getOrCreateFolder(
  accessToken: string,
  folderName = 'Discogs Streaming Sync'
): Promise<string> {
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create folder in Google Drive: ${await createRes.text()}`);
  }

  const folderData = await createRes.json();
  return folderData.id;
}

/**
 * Uploads a binary Blob (such as a ZIP archive) to Google Drive using multipart upload.
 */
export async function uploadZipToDrive(
  accessToken: string,
  zipBlob: Blob,
  fileName = 'discogs-streaming-sync.zip',
  folderId?: string
): Promise<DriveFileResponse> {
  const metadata: { name: string; mimeType: string; parents?: string[] } = {
    name: fileName,
    mimeType: 'application/zip',
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;

  const binaryHeader = `${delimiter}Content-Type: application/zip\r\n\r\n`;

  const zipArrayBuffer = await zipBlob.arrayBuffer();

  // Combine into single multipart body
  const multipartBlob = new Blob(
    [metadataPart, binaryHeader, zipArrayBuffer, closeDelimiter],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBlob,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload to Google Drive: ${errorText}`);
  }

  return (await res.json()) as DriveFileResponse;
}
