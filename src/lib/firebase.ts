// src/lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

/**
 * Use environment variables to provide the Firebase config.
 * We prefix with NEXT_PUBLIC_ so the config is available client-side.
 * Make sure to add these values to .env.local (see instructions below).
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID as string,
};

// Initialize app only once (handles hot reloads)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Export auth so other modules can import { auth } from "@/lib/firebase"
export const auth = getAuth(app);

// Export analytics only in browser environment (avoid server errors)
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;
