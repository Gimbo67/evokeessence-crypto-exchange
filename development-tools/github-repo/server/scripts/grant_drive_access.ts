
import { google } from 'googleapis';

// Initialize the Google Drive API client
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: "certain-mission-449118-e0",
    private_key_id: "a7e3da0d7218ebba939fcfbfd0b70b967cf8d0b6",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDSTO8H3X994/7w\nuzNzVnEYj0SwxF4yg22KSQkrQz213W32X52MsOvBrbtm0+Q6bQ/s6wvUeHfYePzg\nuKZ/sL5W6PynMIuyjWCJCqVbMk1v6+TAHuKI0xM0LTsifRmH7Ygfgk+WiMvrqU5d\nJoK1pmuCaA9qs31gVBU6FP0Ip5e4uctttTiViNHjVTDzTip6D1aJOwXFUIDuCABw\n1IE2234fOTmMQ7Flh+4yxd62bEGTmzUJvOxjZ1xjgxkNYOEyLYturp/AkKPG7pNe\nUM11eQXxwpDpeGAACZvXUkCUrdyz7LRgxCqMVSC0hvkKFclIVd6ntOCm4NU0KviV\nzhuLj5czAgMBAAECggEAHPv2e86G2kp4oiQi6LQSvVBNptFBrFOZ3tPHHDvVvwGI\nPMsb0z61F4oCyJ7Ol1Ddv4j7pep+lgrCy5QXeoTZDvBolgBmWJMMqYaamLGbo5/O\n9L2s+i+hN3E+c7frM2VE/BbBMl2jQVUh1EvQ+wk3Sw9dhJa9Ym/kRw+Kek1i51YP\n/TtApug8ybWR5VJoAPin7RmLQs8xySBaI89Bc56yjAAmFlPzOsxPshwgjVbOhBlO\nbuh4BpI4xJf7a9HlSEFMbygtVf7gP23MGuecJBat9mDJJUEdMLJevhW2eINE37cq\noAhoQjENtqMIzsDykDyzAJDZqUlRFSFx+SRY7EJjnQKBgQD4QmTnATtAR7X0BClk\nf8NF28P/u6yE5s1OgOVzV4KVg9qcS8FQ6OxFw6SIg77norB8qKRBdZdzEcpRJFtJ\nVr7CRpVx3w15bxIQzv0k2kvTyrSzMgkoBO0dBHWcdeuGip8eZ/GkmgQS00ffITUt\n2sPjYIVQt/DYWUYZ2PsJ4fI09QKBgQDY241e8CYRi68B5o/FC8BXbShV8C0r9bW/\nuJlMOoUEs9Zirwc6lhnAipIFMnuWMvWA5L+InqVKGTqZ+Sr5ON/WR8DZ7T1v25R6\nQ5rTB1XHxNPdAcEWHhHP6WUmNDiyRgpyqo4DGjpFFbqhvsSYne232D6tItF7LWIG\nnMnw5WTChwKBgQC1jxDuJGdpvkgiejyvZASyfWOdDmrAE29In1mu/evhXrmtHnX1\nrzLEXq1grUEbdE6wDEF8Ifytye/1YaplO0xtFmPLEH5xNbq3kjluDzvvW0rF1qz9\nmIS0eQNudorWLWDrQsdlQsIB5oSkeUvECj7Cdl9pReycvMVYt+f4NUcGVQKBgCRa\nGYaypw8F5V5iMfOMFsARElPloQzfcYoj/b6jiKzTILsGMCYIB2UZVYT9g24YOMNU\nlS7nuTmEpSgudp+0gwE+oftmI4hevLMKJif98Mk+G23O33k/rSi3LTeMRXzM9O9n\n28p1WRM/ozt96SLURocs/sSzM358ixQksE1rhsp9AoGBAMIJ93+fDK2UdFzQR8Ve\nUsbTp+oZSAUwAfacBexVwMlZxdazuwQnvwXHjhEIQ9z7+xEMUDuiyNqhfYw/1vG9\nJ+Q91QKFmQ9mqsJUBN6QZPDHDEQv4jXEZd4qt92l3cXxMmbSGZLGLPoixVz0kW/k\nPbTxLbMVYGk/Gvmshv49Rzg6\n-----END PRIVATE KEY-----\n",
    client_email: "info@prime-exchange.com",
    client_id: "111570536486088359374",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/evokeessence1%40certain-mission-449118-e0.iam.gserviceaccount.com",
    universe_domain: "googleapis.com"
  },
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

const drive = google.drive({ version: 'v3', auth });

// File ID from the URL
const FILE_ID = '1rxwUAZmbNi83d17nAl_sBavy09fyl0pY';

// Email to grant access to
const USER_EMAIL = 'info@prime-exchange.com';

async function grantAccess() {
  try {
    const permission = {
      type: 'user',
      role: 'reader',
      emailAddress: USER_EMAIL
    };

    const result = await drive.permissions.create({
      fileId: FILE_ID,
      requestBody: permission,
      fields: 'id',
      sendNotificationEmail: false
    });

    console.log(`Access granted to ${USER_EMAIL}. Permission ID: ${result.data.id}`);
  } catch (error) {
    console.error('Error granting access:', error);
  }
}

// Run the function
grantAccess();
