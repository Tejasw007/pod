import { google } from "googleapis";
import { Readable } from "stream";

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuthClient() });
}

/**
 * Uploads a file buffer to Google Drive.
 */
export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in environment variables.");
  }

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id, webViewLink",
  });

  return {
    fileId: response.data.id!,
    webViewLink: response.data.webViewLink!,
  };
}

/**
 * Deletes a file from Google Drive by its file ID.
 * Used for post-print cleanup.
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDrive();
  await drive.files.delete({ fileId });
}
