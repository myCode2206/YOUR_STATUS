const { v2: cloudinary } = require('cloudinary');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = !!(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.warn('⚠️ Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.');
}

/**
 * Uploads a file buffer to Cloudinary and returns the secure URL.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} folder - Cloudinary folder (e.g. 'posts' or 'avatars')
 * @param {string} mimeType - The file mimetype (used to detect images vs video)
 * @returns {Promise<string>} The secure download URL
 */
const uploadToCloudinary = (fileBuffer, folder = '', mimeType = '') => {
  return new Promise((resolve, reject) => {
    const resourceType = mimeType.startsWith('video') ? 'video' : 'auto';

    const stream = cloudinary.uploader.upload_stream(
      { folder: folder || undefined, resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(fileBuffer);
  });
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured: isConfigured,
  uploadToCloudinary,
};
