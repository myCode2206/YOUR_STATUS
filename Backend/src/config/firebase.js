const path = require('path');
const fs = require('fs');

let bucket = null;

// ── Method 1: Local JSON file (best for local dev) ──────────────────────────
const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
const hasJsonFile = fs.existsSync(serviceAccountPath);

// ── Method 2: Base64-encoded JSON (best for Vercel / CI) ─────────────────────
// Set FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel env vars.
// Generate with: node -e "console.log(Buffer.from(fs.readFileSync('firebase-service-account.json')).toString('base64'))"
const hasBase64 = !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

// ── Method 3: Individual env vars (legacy fallback) ──────────────────────────
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
const rawKey = process.env.FIREBASE_PRIVATE_KEY;
const privateKey = rawKey
  ? rawKey.includes('\\n')
    ? rawKey.replace(/\\n/g, '\n')
    : rawKey
  : undefined;
const hasEnvCreds = !!(projectId && clientEmail && privateKey && storageBucket);

if (hasJsonFile || hasBase64 || hasEnvCreds) {
  try {
    const { cert, initializeApp } = require('firebase-admin/app');
    const { getStorage } = require('firebase-admin/storage');

    let serviceAccount, bucketName;

    if (hasBase64) {
      // Vercel: decode from base64 env var
      serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
      bucketName = storageBucket || `${serviceAccount.project_id}.firebasestorage.app`;
    } else if (hasJsonFile) {
      // Local: load from JSON file
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      bucketName = storageBucket || `${serviceAccount.project_id}.firebasestorage.app`;
    } else {
      // Legacy: build from individual env vars
      serviceAccount = { projectId, clientEmail, privateKey };
      bucketName = storageBucket;
    }

    const app = initializeApp({ credential: cert(serviceAccount), storageBucket: bucketName });
    bucket = getStorage(app).bucket();
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
  }
} else {
  console.warn('⚠️ Firebase not configured. File uploads will use local storage fallback.');
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
