"use server";

import { adminDb } from "@/lib/firebase-admin";
import { generateKyberKeypair } from "@/lib/pqc";

export async function saveUserKeys({ name, email }: { name: string; email: string; }) {
  try {
    // 1. generate PQC keys
    const { publicKeyB64, privateKeyB64 } = await generateKyberKeypair();

    // 2. save using ADMIN SDK
    await adminDb
      .collection("users")
      .doc(email)
      .set({
        email,
        name,
        pubkeys: {
          kyberPublic: publicKeyB64,
          kyberPrivate: privateKeyB64,
        },
        createdAt: Date.now(),
      });

    return { success: true };
  } catch (err: any) {
    console.error("Signup action error:", err);
    return { success: false, message: err.message };
  }
}


