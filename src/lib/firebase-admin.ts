// src/lib/firebase-admin.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminApp;

if (!getApps().length) {
  const serviceJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!serviceJson) {
    console.error("❌ Missing GOOGLE_APPLICATION_CREDENTIALS_JSON");
    throw new Error("Missing Firebase admin credentials env");
  }

  const serviceAccount = JSON.parse(serviceJson);

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
