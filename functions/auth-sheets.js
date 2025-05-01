const { google } = require('googleapis');
const path = require('path');

// Configure the authentication instance
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, '../data/lous-osu-malaysia-project-8d4fad0ddd2a.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

module.exports = auth;
