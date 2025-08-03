import { google } from 'googleapis';
import { Readable } from 'stream';

// Initialize Google Drive client
const auth = new google.auth.GoogleAuth({
  keyFile: './certain-mission-449118-e0-a7e3da0d7218.json',
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });

export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  userId: number,
  documentType: string
) {
  try {
    console.log('Starting Google Drive upload...', { fileName, mimeType, documentType });

    const fileMetadata = {
      name: `${documentType}_${userId}_${fileName}`,
      parents: ['1234567890'] // Replace with your actual folder ID
    };

    const media = {
      mimeType,
      body: Readable.from(fileBuffer)
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    console.log('File uploaded successfully:', file.data);

    return {
      fileId: file.data.id,
      viewLink: file.data.webViewLink
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error('Failed to upload file to storage');
  }
}
