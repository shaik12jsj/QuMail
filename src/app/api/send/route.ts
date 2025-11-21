// src/app/api/send/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { kyberEncapsulate, deriveAesKeyFromSecret, symEncrypt } from "@/lib/pqc";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, body: plaintextBody, attachments = [], securityLevel } = body;

    if (!to || !subject || !plaintextBody) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // find recipient pubkey
    const userRef = adminDb.collection("users").doc(to);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Recipient not registered" }, { status: 404 });
    }
    const user = userSnap.data() as any;
    const recipientPub = user?.pubkeys?.kyberPublic;
    if (!recipientPub) {
      return NextResponse.json({ error: "Recipient has no public key" }, { status: 400 });
    }

    // 1) Kyber encapsulation (single kem for the entire message & attachments)
    const { kemCipherB64, sharedSecret } = await kyberEncapsulate(recipientPub);
    const aesKey = deriveAesKeyFromSecret(sharedSecret);

    // 2) Encrypt message body
    const encryptedBody = symEncrypt(plaintextBody, aesKey); // returns { nonce, ciphertext } base64

    // 3) Encrypt attachments (attachments are expected as { name, contentB64 } from client)
    //    store as array: { filename, iv, ct }
    const encryptedAttachments: Array<any> = [];
    for (const f of attachments) {
      // f: { name: string, contentB64: string }
      // We'll encrypt the base64 string of file bytes as plaintext (works fine)
      const encryptedFile = symEncrypt(f.contentB64, aesKey);
      encryptedAttachments.push({
        filename: f.name,
        iv: encryptedFile.nonce,
        ct: encryptedFile.ciphertext,
      });
    }

    // 4) Store the secure message document
    const messagesCol = adminDb.collection("secureMessages");
    const docRef = await messagesCol.add({
      to,
      subject,
      sender: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
      securityLevel: securityLevel || "PQC",
      payload: {
        kem: kemCipherB64,
        iv: encryptedBody.nonce,
        ct: encryptedBody.ciphertext,
      },
      attachments: encryptedAttachments,
      createdAt: Date.now(),
    });

    // 5) send email with read link (like your existing flow)
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    if (process.env.VERCEL_URL) baseUrl = `https://${process.env.VERCEL_URL}`;

    const readUrl = `${baseUrl}/read/${docRef.id}`;
    const emailHtml = `
      <p>You have received a secure message.</p>
      <p>Security: <strong>${securityLevel || "PQC"}</strong></p>
      <p><a href="${readUrl}" style="padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">View Secure Message</a></p>
      <p>If the button doesn't work, open: ${readUrl}</p>
    `;

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject: `[Secure Message] ${subject}`,
      html: emailHtml,
    });

    return NextResponse.json({ success: true, id: docRef.id }, { status: 200 });
  } catch (err: any) {
    console.error("Send API error:", err);
    return NextResponse.json({ error: err.message || "internal" }, { status: 500 });
  }
}
