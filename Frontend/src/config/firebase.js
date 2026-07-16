import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yourstatus-1e928'}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yourstatus-1e928',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'yourstatus-1e928'}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let auth = null;
let googleProvider = null;

try {
  if (firebaseConfig.apiKey) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
  } else {
    console.warn('⚠️ VITE_FIREBASE_API_KEY is not defined. Google sign-in will not be available.');
  }
} catch (error) {
  console.error('❌ Error initializing Firebase client auth:', error);
}

export { auth, googleProvider };
