import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import firebaseConfigData from '../../firebase-applet-config.json';

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

// Initialize Firestore with the provisioned custom database ID
export const firestore: Firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Auth
export const auth: Auth = getAuth(firebaseApp);
