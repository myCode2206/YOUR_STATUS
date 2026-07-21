const { isCloudinaryConfigured, uploadToCloudinary } = require('../config/cloudinary');

/**
 * Saves a file (from multer memoryStorage) to Cloudinary and returns its secure URL.
 * Used for all media across the app (feed posts, avatars, banners, etc.).
 *
 * @param {object} file - The multer file object containing buffer, originalname, mimetype
 * @param {string} folder - Cloudinary folder (e.g. 'posts', 'avatars', 'banners')
 * @returns {Promise<string>} The Cloudinary secure URL
 */
const saveUploadedFile = async (file, folder = '') => {
  if (!file) return null;

  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.');
  }

  return uploadToCloudinary(file.buffer, folder, file.mimetype);
};

module.exports = {
  saveUploadedFile,
};
