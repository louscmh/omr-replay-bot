const { google } = require('googleapis');
const youtube = google.youtube('v3');
const axios = require('axios');

async function uploadVideo(videoUrl, thumbnailUrl, title, description) {
  const {authorize}  = require('./auth-youtube');
  const authClient = await authorize();
  google.options({ auth: authClient });
  const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
  const videoStream = videoResponse.data;

  console.log(videoUrl,thumbnailUrl, title);
  
  const videoResponseUpload  = await youtube.videos.insert({
    part: 'snippet,status',
    requestBody: {
      snippet: {
        title: title,
        description: description,
        // Optional: tags and categoryId
        tags: ['example', 'video'],
        categoryId: '22', // People & Blogs; adjust as needed
      },
      status: {
        privacyStatus: 'public' // or 'public' or 'unlisted'
      }
    },
    media: {
      mimeType: 'video/mp4',
      body: videoStream
    }
  });

  const videoId = videoResponseUpload.data.id;
  console.log('Video uploaded with ID:', videoId);

  const thumbnailResponse = await axios.get(thumbnailUrl, { responseType: 'stream' });
  const thumbnailStream = thumbnailResponse.data;
  
  // 2. Upload the thumbnail image for the uploaded video
  const thumbnailUploadResponse = await youtube.thumbnails.set({
    videoId: videoId,
    media: {
      mimeType: 'image/jpeg',
      body: thumbnailStream
    }
  });

  const uploadedThumbnailUrl = thumbnailUploadResponse.data.items[0].default.url;
  console.log('Thumbnail uploaded:', uploadedThumbnailUrl);
  
  return [ videoId, uploadedThumbnailUrl ];
}

module.exports = {
  uploadVideo
};