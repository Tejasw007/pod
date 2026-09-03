import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

// 1. Initialize the Google Auth Client using the credentials from .env
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob' // Redirect URI (use a real one if building an API, or this for out-of-band)
);

// NOTE: To get a Refresh Token, you must authenticate once using oauth2Client.generateAuthUrl()
// For this example, we assume you have generated a refresh token and stored it in .env
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

/**
 * Uploads a file to a specific Google Drive folder.
 * 
 * The folder location is managed by the GOOGLE_DRIVE_FOLDER_ID environment variable.
 * To get this ID:
 * 1. Open Google Drive in your browser.
 * 2. Open the folder you want to use for uploads.
 * 3. Look at the URL: https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID
 * 4. Paste that ID into your .env file as GOOGLE_DRIVE_FOLDER_ID.
 */
export async function uploadFileToDrive(filePath: string, fileName: string) {
  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
      throw new Error("Missing GOOGLE_DRIVE_FOLDER_ID in environment variables.");
    }

    // Determine the MIME type dynamically based on the file name/extension
    // This allows students to upload PDFs, Word docs, images, etc.
    const mimeType = mime.lookup(fileName) || 'application/octet-stream';

    // Set up the file metadata (name and parent folder)
    const fileMetadata = {
      name: fileName,
      parents: [folderId], 
    };

    // Prepare the file media
    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath),
    };

    // Execute the upload
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    console.log('File uploaded successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw error;
  }
}
