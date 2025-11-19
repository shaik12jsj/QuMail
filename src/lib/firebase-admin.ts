import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import fs from "fs";

let adminApp;

if (!getApps().length) {
  const serviceAccountPath = path.join(process.cwd(), "keys/service-account.json");
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
