// src/app/api/decrypt/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { decryptFromPayload } from "@/lib/pqc";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: "Missing message id" },
        { status: 400 }
      );
    }

    // Load message document
    const msgRef = adminDb.collection("secureMessages").doc(id);
    const snap = await msgRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const msg = snap.data() as any;

    if (!msg.to) {
      return NextResponse.json(
        { error: "Message missing recipient" },
        { status: 400 }
      );
    }

    // Load recipient user & private key
    const userRef = adminDb.collection("users").doc(msg.to);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json(
        { error: "Recipient user not found" },
        { status: 404 }
      );
    }

    const user = userSnap.data() as any;
    const privateKey = user.pubkeys?.kyberPrivate;

    if (!privateKey) {
      return NextResponse.json(
        { error: "Recipient has no private key stored" },
        { status: 400 }
      );
    }

    // Perform decryption (Kyber + AES)
    const plaintext = await decryptFromPayload(msg.payload, privateKey);

    return NextResponse.json(
      { success: true, plaintext },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("Decrypt API error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
