// src/app/api/decrypt/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { decryptFromPayload } from "@/lib/pqc";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing message id" }, { status: 400 });
    }

    // Load message
    const msgRef = adminDb.collection("secureMessages").doc(id);
    const snap = await msgRef.get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const msg = snap.data() as any;

    if (!msg.to) {
      return NextResponse.json({ error: "Message missing recipient" }, { status: 400 });
    }

    // Load recipient user to get their private key
    const userRef = adminDb.collection("users").doc(msg.to);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "Recipient user not found" }, { status: 404 });
    }

    const user = userSnap.data() as any;
    const privateKey = user.pubkeys?.kyberPrivate;

    if (!privateKey) {
      return NextResponse.json({ error: "Recipient has no private key stored" }, { status: 400 });
    }

    // Decrypt body using decryptFromPayload (uses kyberDecapsulate + symDecrypt)
    const plaintext = await decryptFromPayload(msg.payload, privateKey);

    // Decrypt attachments (if any)
    const decryptedAttachments: Array<{ filename: string; contentB64: string }> = [];
    const attachments = msg.attachments || [];
    for (const a of attachments) {
      try {
        const filePlainB64 = await decryptFromPayload(a.payload, privateKey);
        decryptedAttachments.push({
          filename: a.filename,
          contentB64: filePlainB64, // base64 bytes of file
        });
      } catch (err) {
        // if a particular attachment fails to decrypt, skip it but log
        console.error('Attachment decrypt failed for', a.filename, err);
      }
    }

    return NextResponse.json(
      { success: true, plaintext, attachments: decryptedAttachments },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Decrypt API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
