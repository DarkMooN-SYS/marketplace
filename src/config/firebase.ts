import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';

// Firebase configuration - Using production credentials
const firebaseConfig = {
  apiKey: "AIzaSyAmvqLGEfK3_Faq5F1KTjsQBF7CV4IqVKI",
  authDomain: "zaraa-8d3a9.firebaseapp.com",
  databaseURL: "https://zaraa-8d3a9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zaraa-8d3a9",
  storageBucket: "zaraa-8d3a9.firebasestorage.app",
  messagingSenderId: "134558958637",
  appId: "1:134558958637:web:329c44a0f40cd430ef64a4",
  measurementId: "G-L6JKLH049J"
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

// Disable App Check for development (set debug token)
if (import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG === 'true') {
  // Enable App Check debug mode
  (self as Window & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  console.log('🔓 Firebase App Check debug mode enabled');
}

try {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('✅ Using existing Firebase app');
  }
  
  // Use initializeAuth with explicit persistence instead of getAuth
  // This gives more control and avoids the internal assertion error
  try {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
    console.log('✅ Firebase Auth initialized with indexedDB persistence');
  } catch {
    // Fallback to getAuth if initializeAuth fails (auth already initialized)
    auth = getAuth(app);
    console.log('✅ Firebase Auth initialized (existing instance)');
  }
  
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { app, auth };
