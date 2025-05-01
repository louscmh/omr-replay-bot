// auth.js
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtubepartner'
];
const TOKEN_PATH = path.join(__dirname, '../data/token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../data/client_secret_607616003303-6aje7hp38sskh5b4fv3rnpq7nkqtqkae.apps.googleusercontent.com.json');

async function authorize() {
  try {
    const content = await fs.promises.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]
    );

    // Try reading token
    try {
      const token = await fs.promises.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
      
      // Try a simple API call to verify token
      await oAuth2Client.getAccessToken(); // Trigger refresh if needed
      return oAuth2Client;
    } catch (tokenError) {
      console.warn('Token error:', tokenError.message || tokenError);

      // If token is invalid or expired, fetch a new one
      if (tokenError.message?.includes('invalid_grant') || tokenError.message?.includes('invalid_request')) {
        console.log('Token invalid or expired. Requesting new access token...');
      }

      await getAccessToken(oAuth2Client);
      return oAuth2Client;
    }

  } catch (err) {
    throw new Error('Error loading client secret file: ' + err);
  }
}
  

function getAccessToken(oAuth2Client) {
  return new Promise((resolve, reject) => {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) {
          return reject('Error retrieving access token: ' + err);
        }
        oAuth2Client.setCredentials(token);
        // Save the token for future use
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
          if (err) console.error(err);
          console.log('Token stored to', TOKEN_PATH);
        });
        resolve(token);
      });
    });
  });
}

module.exports = { authorize };
