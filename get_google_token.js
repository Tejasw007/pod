const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config({ path: '.env' });

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('--------------------------------------------------');
console.log('Authorize this app by visiting this URL:');
console.log(authUrl);
console.log('--------------------------------------------------');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ SUCCESS! Add this to your .env file:\n');
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    console.log('\nThen restart your Next.js server.');
  } catch (err) {
    console.error('Error retrieving access token', err);
  }
});
