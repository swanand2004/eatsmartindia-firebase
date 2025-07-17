import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyARd8PmSp22OUWhwTN_gX-W-iiuJZM0GxA",
  authDomain: "eatsmartindia-16e75.firebaseapp.com",
  projectId: "eatsmartindia-16e75",
  storageBucket: "eatsmartindia-16e75.firebasestorage.app",
  messagingSenderId: "825618368317",
  appId: "1:825618368317:web:d4e84837c44d54fbe66754",
  measurementId: "G-SHNE6XE5CZ"
};

const app = initializeApp(firebaseConfig);

// Initialize analytics only if supported
let analytics;
try {
  const { isSupported } = require('firebase/analytics');
  if (isSupported()) {
    analytics = getAnalytics(app);
  }
} catch (error) {
  // Analytics not supported in this environment
  console.log('Firebase Analytics not supported in this environment');
}

// Initialize auth with AsyncStorage persistence for React Native
import { Auth } from 'firebase/auth';

let auth: Auth;
try {
  const { initializeAuth, getReactNativePersistence } = require('firebase/auth/react-native');
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Fallback to default auth if React Native persistence is not available
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
export { firebaseConfig }; 