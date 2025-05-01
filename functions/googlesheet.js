const { google } = require('googleapis');
const sheets = google.sheets('v4');
const auth = require('./auth-sheets');
const { spreadsheetId } = require('../data/config.json');
const { uploadReplay } = require('./ordr.js');

async function getSheetEntry() {
  const client = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range: "OMR Replay responses",
  });
  // console.table(res.data.values);
  return res.data.values;
}

async function getFirstProcessingEntry() {
  const data = await getSheetEntry();
  const firstProcessingEntry = data.find(row => row[5] === "Processing");
  const rowIndex = data.findIndex(row => row[5] === "Processing");
  // console.log(firstProcessingEntry, rowIndex);
  return [firstProcessingEntry, rowIndex];
}

async function getFilteredEntries(filterKey) {
  const data = await getSheetEntry();
  // Filter rows that have "Processing" at index 5.
  const processingEntries = data.filter(row => row[5] === filterKey);
  
  // Get the indices of the matching rows.
  const processingIndices = data.reduce((indices, row, index) => {
    if (row[5] === filterKey) indices.push(index);
    return indices;
  }, []);
  
  return [processingEntries, processingIndices];
}


async function getEntryByRenderID(renderID) {
  const data = await getSheetEntry();
  const firstProcessingEntry = data.find(row => row[7] == renderID);
  const rowIndex = data.findIndex(row => row[7] == renderID);
  // console.log(firstProcessingEntry, rowIndex);
  return [firstProcessingEntry, rowIndex];
}

async function processEntry() {
  const [data, index] = await getFirstProcessingEntry();
  if (index == -1) return;

  try {
    uploadReplay(data, index);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function updateResponseSheet(column, index, string) {
  try {
    const client = await auth.getClient();
    const rangeToUpdate = `OMR Replay responses!${column}${index + 1}`;
  
    await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId,
      range: rangeToUpdate,
      valueInputOption: "RAW",
      resource: {
        values: [[string]]
      }
    });
  
    console.log(`Updated row ${index + 1}, column ${column} to ${string}`);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function processRequestResults(isApproved, entry, notes) {
  try {
    const [firstProcessingEntry, rowIndex] = await getEntryByRenderID(entry[7]);
    await updateResponseSheet("F", rowIndex, isApproved ? "Approved" : "Rejected");
    await updateResponseSheet("J", rowIndex, notes == null ? "N.A" : notes);
  } catch (e) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function processSheetUpload(entry, youtubeUrl) {
  try {
    const [firstProcessingEntry, rowIndex] = await getEntryByRenderID(entry[7]);
    await updateResponseSheet("F", rowIndex, "Uploaded");
    await updateResponseSheet("K", rowIndex, youtubeUrl);
  } catch (e) {
    console.error('Error:', error.response?.data || error.message);
  }
}

module.exports = {
  processEntry,
  updateResponseSheet,
  getEntryByRenderID,
  getFilteredEntries,
  processRequestResults,
  processSheetUpload
};