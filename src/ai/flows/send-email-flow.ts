'use server';
/**
 * FINAL PRODUCTION VERSION
 * - PQC encryption
 * - Attachments support
 * - Strong deliverability
 * - Forced custom domain URLs
 * - Gmail-compatible content
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
} from 'firebase/firestore';

import app from '@/lib/firebase';
import { encryptForRecipient } from '@/lib/pqc';

// --- RESEND ---
import { Resend } from 'resend';

// --- CLIENT ---
const resend = new Resend(process.env.RESEND_API_KEY || '');

/* ------------------------------------------------------------------------- */
/*  Schema Setup                                                             */
/* ------------------------------------------------------------------------- */

const AttachmentSchema = z.object({
  name: z.string(),
  contentB64: z.string(),    // Base64 bytes from client
  size: z.number().optional()
});

const SendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  securityLevel: z.string().optional(),
  securityKey: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
});

export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

/* ------------------------------------------------------------------------- */
/*  Verify ENV                                                               */
/* ------------------------------------------------------------------------- */

if (!process.env.RESEND_API_KEY) console.error("❌ Missing RESEND_API_KEY");
if (!process.env.RESEND_FROM_EMAIL) console.error("❌ Missing RESEND_FROM_EMAIL");
if (!process.env.NEXT_PUBLIC_BASE_URL) console.warn("⚠️ Missing NEXT_PUBLIC_BASE_URL");

/* ------------------------------------------------------------------------- */
/*  Public API                                                               */
/* ------------------------------------------------------------------------- */

export async function sendEmail(input: SendEmailInput) {
  return sendEmailFlow(input);
}

/* ------------------------------------------------------------------------- */
/*  Flow                                                                     */
/* ------------------------------------------------------------------------- */

const sendEmailFlow = ai.defineFlow(
  {
    name: "sendEmailFlow_final_rewrite",
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },

  async (input) => {
    try {
      /* ------------------------------------------------------------- */
      /* 1. Force BASE URL (Fixes Gmail spam)                          */
      /* ------------------------------------------------------------- */
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://qumail.dpdns.org";

      /* ------------------------------------------------------------- */
      /* 2. Load Recipient Key                                         */
      /* ------------------------------------------------------------- */

      const db = getFirestore(app);
      const usersCol = collection(db, "users");
      const q = query(usersCol, where("email", "==", input.to));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: "Recipient not registered in QuMail." };
      }

      const recipientData = snap.docs[0].data() as any;
      const recipientPub = recipientData?.pubkeys?.kyberPublic;

      if (!recipientPub) {
        return { success: false, message: "Recipient missing PQC public key." };
      }

      /* ------------------------------------------------------------- */
      /* 3. OTP mode → forbid attachments                              */
      /* ------------------------------------------------------------- */

      if (
        input.securityLevel === "Quantum Secure - OTP" &&
        input.attachments &&
        input.attachments.length > 0
      ) {
        return {
          success: false,
          message: "Quantum Secure - OTP does NOT support attachments.",
        };
      }

      /* ------------------------------------------------------------- */
      /* 4. Encrypt Body                                                */
      /* ------------------------------------------------------------- */

      const encryptedBody = await encryptForRecipient(input.body, recipientPub);

      /* ------------------------------------------------------------- */
      /* 5. Encrypt Attachments                                         */
      /* ------------------------------------------------------------- */

      const encryptedAttachments = [];
      if (input.attachments?.length) {
        for (const f of input.attachments) {
          const enc = await encryptForRecipient(f.contentB64, recipientPub);
          encryptedAttachments.push({
            filename: f.name,
            size: f.size || null,
            payload: {
              kem: enc.kem,
              iv: enc.iv,
              ct: enc.ct,
            },
          });
        }
      }

      /* ------------------------------------------------------------- */
      /* 6. Save to Firestore                                           */
      /* ------------------------------------------------------------- */

      const docRef = await addDoc(collection(db, "secureMessages"), {
        to: input.to,
        subject: input.subject,
        sender: process.env.RESEND_FROM_EMAIL,
        securityLevel: input.securityLevel || "PQC",
        payload: encryptedBody,
        attachments: encryptedAttachments,
        createdAt: Date.now(),
      });

      const readUrl = `${baseUrl}/read/${docRef.id}`;

      /* ------------------------------------------------------------- */
      /* 7. Clean HTML (No tracking, no scripts → safe for Gmail)       */
      /* ------------------------------------------------------------- */

      const html = `
        <p>You have received a <strong>secure message</strong> via <b>QuMail</b>.</p>
        <p>Encryption: <strong>${input.securityLevel}</strong></p>

        <p style="margin-top: 20px;">
          <a href="${readUrl}" 
             style="display: inline-block; padding: 12px 20px; 
                    background: #111; color: #fff; text-decoration: none; 
                    border-radius: 6px;">
             🔐 View Secure Message
          </a>
        </p>

        <p>If the button doesn't work, open this link:<br/>
        <a href="${readUrl}">${readUrl}</a></p>
      `.trim();

      const text = `
You have received a secure message via QuMail.

Encryption: ${input.securityLevel}

Open your secure message:
${readUrl}
`.trim();

      /* ------------------------------------------------------------- */
      /* 8. Send Email (No tracking enabled)                            */
      /* ------------------------------------------------------------- */

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: input.to,
        subject: `[Secure Message] ${input.subject}`,
        html,
        text,
        // disable tracking → required for new domains
        tags: [{ name: "disable_open_tracking", value: "true" }],
      });

      return { success: true, message: "Email sent." };

    } catch (err: any) {
      console.error("❌ Send email error:", err);
      return {
        success: false,
        message: err?.message || "Failed to send email.",
      };
    }
  }
);
