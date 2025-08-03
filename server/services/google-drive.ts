import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';

// Initialize and export the Google Drive auth function
export function getDriveAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: "certain-mission-449118-e0",
      private_key_id: "a7e3da0d7218ebba939fcfbfd0b70b967cf8d0b6",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDSTO8H3X994/7w\nuzNzVnEYj0SwxF4yg22KSQkrQz213W32X52MsOvBrbtm0+Q6bQ/s6wvUeHfYePzg\nuKZ/sL5W6PynMIuyjWCJCqVbMk1v6+TAHuKI0xM0LTsifRmH7Ygfgk+WiMvrqU5d\nJoK1pmuCaA9qs31gVBU6FP0Ip5e4uctttTiViNHjVTDzTip6D1aJOwXFUIDuCABw\n1IE2234fOTmMQ7Flh+4yxd62bEGTmzUJvOxjZ1xjgxkNYOEyLYturp/AkKPG7pNe\nUM11eQXxwpDpeGAACZvXUkCUrdyz7LRgxCqMVSC0hvkKFclIVd6ntOCm4NU0KviV\nzhuLj5czAgMBAAECggEAHPv2e86G2kp4oiQi6LQSvVBNptFBrFOZ3tPHHDvVvwGI\nPMsb0z61F4oCyJ7Ol1Ddv4j7pep+lgrCy5QXeoTZDvBolgBmWJMMqYaamLGbo5/O\n9L2s+i+hN3E+c7frM2VE/BbBMl2jQVUh1EvQ+wk3Sw9dhJa9Ym/kRw+Kek1i51YP\n/TtApug8ybWR5VJoAPin7RmLQs8xySBaI89Bc56yjAAmFlPzOsxPshwgjVbOhBlO\nbuh4BpI4xJf7a9HlSEFMbygtVf7gP23MGuecJBat9mDJJUEdMLJevhW2eINE37cq\noAhoQjENtqMIzsDykDyzAJDZqUlRFSFx+SRY7EJjnQKBgQD4QmTnATtAR7X0BClk\nf8NF28P/u6yE5s1OgOVzV4KVg9qcS8FQ6OxFw6SIg77norB8qKRBdZdzEcpRJFtJ\nVr7CRpVx3w15bxIQzv0k2kvTyrSzMgkoBO0dBHWcdeuGip8eZ/GkmgQS00ffITUt\n2sPjYIVQt/DYWUYZ2PsJ4fI09QKBgQDY241e8CYRi68B5o/FC8BXbShV8C0r9bW/\nuJlMOoUEs9Zirwc6lhnAipIFMnuWMvWA5L+InqVKGTqZ+Sr5ON/WR8DZ7T1v25R6\nQ5rTB1XHxNPdAcEWHhHP6WUmNDiyRgpyqo4DGjpFFbqhvsSYne232D6tItF7LWIG\nnMnw5WTChwKBgQC1jxDuJGdpvkgiejyvZASyfWOdDmrAE29In1mu/evhXrmtHnX1\nrzLEXq1grUEbdE6wDEF8Ifytye/1YaplO0xtFmPLEH5xNbq3kjluDzvvW0rF1qz9\nmIS0eQNudorWLWDrQsdlQsIB5oSkeUvECj7Cdl9pReycvMVYt+f4NUcGVQKBgCRa\nGYaypw8F5V5iMfOMFsARElPloQzfcYoj/b6jiKzTILsGMCYIB2UZVYT9g24YOMNU\nlS7nuTmEpSgudp+0gwE+oftmI4hevLMKJif98Mk+G23O33k/rSi3LTeMRXzM9O9n\n28p1WRM/ozt96SLURocs/sSzM358ixQksE1rhsp9AoGBAMIJ93+fDK2UdFzQR8Ve\nUsbTp+oZSAUwAfacBexVwMlZxdazuwQnvwXHjhEIQ9z7+xEMUDuiyNqhfYw/1vG9\nJ+Q91QKFmQ9mqsJUBN6QZPDHDEQv4jXEZd4qt92l3cXxMmbSGZLGLPoixVz0kW/k\nPbTxLbMVYGk/Gvmshv49Rzg6\n-----END PRIVATE KEY-----\n",
      client_email: "evokeessence1@certain-mission-449118-e0.iam.gserviceaccount.com",
      client_id: "111570536486088359374",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/evokeessence1%40certain-mission-449118-e0.iam.gserviceaccount.com",
      universe_domain: "googleapis.com"
    },
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
}

// Initialize drive with auth
const auth = getDriveAuth();
const drive = google.drive({ version: 'v3', auth });

// Upload a file to Google Drive
export async function uploadToGoogleDrive(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
  userId: number,
  documentType: 'identity' | 'proof_of_address'
) {
  try {
    console.log('Starting Google Drive upload process...', {
      fileName,
      mimeType,
      userId,
      documentType,
      bufferSize: fileBuffer.length
    });

    // Create a folder for the user if it doesn't exist
    const folderName = `kyc_documents_${userId}`;
    console.log('Creating/getting folder:', folderName);
    const folder = await createOrGetFolder(folderName);

    console.log('Folder details:', folder);

    if (!folder || !folder.id) {
      throw new Error('Failed to create or get folder');
    }

    // Upload file to the folder
    const fileMetadata = {
      name: `${documentType}_${fileName}_${Date.now()}${path.extname(fileName)}`,
      parents: [folder.id]
    };

    const media = {
      mimeType,
      body: Readable.from(fileBuffer)
    };

    console.log('Uploading file with metadata:', fileMetadata);

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,webViewLink'
    });

    console.log('File upload response:', file.data);

    if (!file.data.id || !file.data.webViewLink) {
      throw new Error('File upload response missing required fields');
    }

    // Set file permissions for domain-wide access
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      },
      fields: 'id'
    });

    // Grant explicit permissions to each email
    const emailsToGrant = [
      'info@prime-exchange.com',
      'info@evo-exchange.com',
      'instaleis@gmail.com'
    ];

    for (const email of emailsToGrant) {
      try {
        await drive.permissions.create({
          fileId: file.data.id,
          requestBody: {
            role: 'reader',
            type: 'user',
            emailAddress: email
          },
          sendNotificationEmail: false
        });
      } catch (error) {
        console.error(`Failed to grant permission to ${email}:`, error);
      }
    }

    // Get updated file metadata with sharing settings
    const updatedFile = await drive.files.get({
      fileId: file.data.id,
      fields: 'id, webViewLink, webContentLink'
    });

    return {
      fileId: file.data.id,
      viewLink: updatedFile.data.webContentLink || updatedFile.data.webViewLink
    };
  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}

// Create or get a folder for storing KYC documents
async function createOrGetFolder(folderName: string) {
  try {
    console.log('Checking for existing folder:', folderName);

    // Check if folder already exists
    const response = await drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (response.data.files && response.data.files.length > 0) {
      console.log('Found existing folder:', response.data.files[0]);
      return response.data.files[0];
    }

    console.log('Creating new folder:', folderName);

    // Create new folder if it doesn't exist
    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    console.log('Created new folder:', file.data);
    return file.data;
  } catch (error) {
    console.error('Error creating/getting folder:', error);
    if (error instanceof Error) {
      console.error('Folder error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    throw error;
  }
}