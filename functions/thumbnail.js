const { getUserDataSet, getDataSet } = require('./osu.js');
const { getPostData } = require('./ordr.js');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
const { cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret } = require('../data/config.json');
cloudinary.config({
  cloud_name: cloudinary_cloud_name,
  api_key: cloudinary_api_key,
  api_secret: cloudinary_api_secret
});

async function generateThumbnail(entryData, ppValue) {
  // Fetch data from your APIs
  const userdata = await getUserDataSet(entryData[1]);
  const renderdata = await getPostData(entryData[7]);
  const mapdata = await getDataSet(renderdata.mapID);
  const hasImage = await checkImageLoad(renderdata.mapID);

  // Extract accuracy from the title. Use a fallback if the regex fails.
  const accMatch = renderdata.title.match(/\d+(?:\.\d{1,2})?(?=%)/);
  const accuracy = accMatch ? accMatch[0] : "0.00";

  // Extract mods from the title. Expecting a string like "+HDHR" and remove the "+"
  const modsMatch = renderdata.title.match(/\+(\w+)/);
  const mods = modsMatch ? modsMatch[1] : "NM";

  // Build query parameters for your thumbnail HTML.
  // Including autogen=1 tells your page to immediately display canvasF.
  const thumbnailParams = new URLSearchParams({
    username: userdata.username,
    pp: ppValue,
    accuracy: accuracy,
    bg: hasImage ? `https://assets.ppy.sh/beatmaps/${renderdata.mapID}/covers/fullsize.jpg` : "https://lous.s-ul.eu/3iszF72i",
    mods: mods,
    status: mapdata.approved == 1 || mapdata.approved == 2 ? "ranked" : mapdata.approved == 4 ? "loved" : "unranked",
    gamemode: 'osu',     // Default gamemode; adjust as needed
    twitch: 'false',     // Default twitch flag; adjust if necessary
    autogen: '1'
  });

  console.log("Thumbnail Params:", thumbnailParams.toString());

  // Get the absolute path to your thumbnail generator HTML file.
  const thumbnailPath = path.join(__dirname, 'OMR-Thumbnail/index.html');
  const fileUrl = `file://${thumbnailPath}?${thumbnailParams.toString()}`;

  console.log("Thumbnail Path:", thumbnailPath);
  console.log("File URL:", fileUrl);

  // Launch Puppeteer (with sandbox args for environments like Heroku)
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });
  const page = await browser.newPage();

  // Navigate to the HTML page that will generate the thumbnail
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });
  console.log("Page loaded");

  // Wait until the canvas is rendered with nonzero dimensions.
  await page.waitForFunction(() => {
    const canvas = document.getElementById('canvasF');
    return canvas && canvas.getBoundingClientRect().width > 0 && canvas.getBoundingClientRect().height > 0;
  });
  console.log("Canvas is rendered");

  // Extract the image data directly from the canvas using toDataURL
  const dataUrl = await page.evaluate(() => {
    const canvas = document.getElementById('canvasF');
    return canvas.toDataURL('image/jpeg');
  });
  console.log("Canvas image extracted");

  // Convert the data URL to a Buffer
  const imageBuffer = Buffer.from(dataUrl.split(',')[1], 'base64');
  console.log("Image buffer ready");

  await browser.close();

  try {
    const uploadResponse = await cloudinary.uploader.upload(dataUrl, {
      folder: 'thumbnails' // Optional: specify a folder in your Cloudinary account
      // You can also set a public_id or other options here
    });
    console.log('Thumbnail uploaded:', uploadResponse.secure_url);
    return [uploadResponse.secure_url, userdata, renderdata, mapdata];
  } catch (err) {
    console.error('Error uploading thumbnail:', err);
    throw err;
  }
}

async function checkImageLoad(mapID) {
  const url = `https://assets.ppy.sh/beatmaps/${mapID}/covers/fullsize.jpg`;
  
  try {
      const response = await fetch(url, { method: "HEAD" }); // HEAD request to check existence
      if (response.ok) {
          console.log(`Image exists: ${url}`);
          return true;
      } else {
          console.log(`Image does not exist: ${url}`);
          return false;
      }
  } catch (error) {
      console.error(`Error fetching image: ${error}`);
      return false;
  }
}

module.exports = {
  generateThumbnail,
}