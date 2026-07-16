const fs = require('fs');
const path = require('path');
const { bucket, uploadToFirebase } = require('../config/firebase');

// Resolve standard uploads directory safely (with Vercel fallback)
let uploadsDir = path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  uploadsDir = path.join(require('os').tmpdir(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

/**
 * Saves a file (from multer memoryStorage) either to Firebase Storage (if configured)
 * or to the local disk (as a fallback for local development).
 * 
 * @param {object} file - The multer file object containing buffer, originalname, mimetype
 * @param {string} folder - Subfolder name (e.g. 'avatars' or 'posts')
 * @returns {Promise<string>} The file URL (either storage.googleapis.com URL or local /uploads/... path)
 */
const saveUploadedFile = async (file, folder = '') => {
  if (!file) return null;

  const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
  const destinationPath = folder ? `${folder}/${uniqueFilename}` : uniqueFilename;

  // 1. If Firebase is configured, upload to Firebase Storage
  if (bucket) {
    try {
      const publicUrl = await uploadToFirebase(file.buffer, destinationPath, file.mimetype);
      return publicUrl;
    } catch (error) {
      console.error('❌ Firebase upload failed, falling back to local storage:', error);
    }
  }

  // 2. Fallback to Local Disk Storage
  const targetDir = folder ? path.join(uploadsDir, folder) : uploadsDir;
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (e) {}
  }

  const localFilePath = path.join(targetDir, uniqueFilename);
  fs.writeFileSync(localFilePath, file.buffer);

  // Return the path served statically by Express
  return folder ? `/uploads/${folder}/${uniqueFilename}` : `/uploads/${uniqueFilename}`;
};

module.exports = {
  saveUploadedFile,
  uploadsDir,
};
