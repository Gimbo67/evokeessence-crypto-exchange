import { google } from 'googleapis';

// Initialize Google Auth client
const auth = new google.auth.GoogleAuth({
  keyFile: './certain-mission-449118-e0-a7e3da0d7218.json',
  scopes: ['https://www.googleapis.com/auth/drive.file']
});

export { auth };
