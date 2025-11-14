// Firebase Admin SDK configuration
import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL,
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  });
}

// Configure Firestore settings for better performance and stability
export const db = admin.firestore();

// Set Firestore settings to prevent connection issues
const firestoreSettings = {
  ignoreUndefinedProperties: true,
  // Increase timeout for slow connections
  timestampsInSnapshots: true
};

db.settings(firestoreSettings);

// Enable longer timeouts for queries (helps with slow connections)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔥 Firebase Admin SDK initialized');
  console.log(`📦 Project: ${process.env.FIREBASE_PROJECT_ID}`);
}

export const auth = admin.auth();
export const storage = admin.storage();
export const realtimeDb = admin.database();

export default admin;