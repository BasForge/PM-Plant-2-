import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, Firestore, setLogLevel } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

// Silence verbose internal Firestore logs/errors to avoid crashing dev environments on quota backoff
try {
  setLogLevel('silent');
} catch {
  // Ignore if already set or unsupported in runtime
}

// Configuration from provisioned Firebase project
export const firebaseConfig = {
  projectId: firebaseConfigData.projectId || "bold-watch-k98sv",
  appId: firebaseConfigData.appId || "",
  apiKey: firebaseConfigData.apiKey || "",
  authDomain: firebaseConfigData.authDomain || "",
  firestoreDatabaseId: firebaseConfigData.firestoreDatabaseId || "ai-studio-pmtpmplant2-5b0cd9a2-449e-4575-92a6-f4dd212d5492",
  storageBucket: firebaseConfigData.storageBucket || "",
  messagingSenderId: firebaseConfigData.messagingSenderId || "",
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with ignoreUndefinedProperties: true and custom database ID
function initFirestore(): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true
    }, firebaseConfig.firestoreDatabaseId);
  } catch {
    return getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
  }
}

// Initialize Firestore with the provisioned custom database ID
export const firestore: Firestore = initFirestore();

// Initialize Firebase Auth
export const auth: Auth = getAuth(firebaseApp);
