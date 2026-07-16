const admin = require('firebase-admin');

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Handle newlines in private key
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

let bucket = null;

if (projectId && clientEmail && privateKey && storageBucket) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket,
    });
    bucket = admin.storage().bucket();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error);
  }
} else {
  console.warn('⚠️ Firebase configuration environment variables are missing. File uploads will fail in production.');
}

/**
 * Uploads a file buffer to Firebase Storage and returns the public download URL.
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} destination - The storage path (e.g. 'avatars/filename.jpg')
 * @param {string} mimeType - The file mimetype
 * @returns {Promise<string>} The public download URL
 */
const uploadToFirebase = async (fileBuffer, destination, mimeType) => {
  if (!bucket) {
    throw new Error('Firebase Storage is not configured.');
  }

  const file = bucket.file(destination);

  await file.save(fileBuffer, {
    metadata: {
      contentType: mimeType,
    },
    resumable: false,
  });

  // Make the file public and return the URL
  await file.makePublic();
  
  // Format the public URL for Firebase Storage
  return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
};

module.exports = {
  bucket,
  uploadToFirebase,
};
