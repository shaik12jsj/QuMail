'use server';
/**
 * send-email-flow.ts — Resend version (attachments added)
 *
 * Uses:
 * - src/lib/pqc.ts for PQC encryption (encryptForRecipient)
 * - firebase/firestore for storing encrypted message + attachments
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

// --- RESEND (correct import) ---
import { Resend } from 'resend';

// --- Create Resend client (correct TS version) ---
const resend = new Resend(process.env.RESEND_API_KEY || '');

const AttachmentSchema = z.object({
  name: z.string(),
  contentB64: z.string(), // file bytes encoded as base64 from client
  size: z.number().optional(),
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

// Validate env (helpful for Vercel logs)
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is missing');
}
if (!process.env.RESEND_FROM_EMAIL) {
  console.error('❌ RESEND_FROM_EMAIL is missing');
}

// Public send function
export async function sendEmail(input: SendEmailInput) {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow_resend_with_attachments',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    try {
      // ---- ENV CHECKS ----
      if (!process.env.RESEND_API_KEY) {
        return { success: false, message: 'Missing RESEND_API_KEY.' };
      }
      if (!process.env.RESEND_FROM_EMAIL) {
        return { success: false, message: 'Missing RESEND_FROM_EMAIL.' };
      }

      // ---- BASE URL ----
      let baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      if (
        process.env.VERCEL_ENV === 'production' &&
        process.env.VERCEL_PROJECT_PRODUCTION_URL
      ) {
        baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
      } else if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      }

      // ---- FIND RECIPIENT PUBKEY ----
      const db = getFirestore(app);
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('email', '==', input.to));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, message: 'Recipient not registered in QuMail.' };
      }

      const recipientData = snap.docs[0].data() as any;
      const recipientPub = recipientData?.pubkeys?.kyberPublic;

      if (!recipientPub) {
        return {
          success: false,
          message: 'Recipient has no PQC public key registered.',
        };
      }

      // ---- PQC ENCRYPTION for body ----
      // Using encryptForRecipient (returns { kem, iv, ct })
      const encryptedBody = await encryptForRecipient(input.body, recipientPub);

      // ---- PQC ENCRYPTION for attachments (if any) ----
      // attachments are expected to be provided as base64-encoded file bytes
      const encryptedAttachments: Array<any> = [];
      if (input.attachments && input.attachments.length > 0) {
        for (const att of input.attachments) {
          // att: { name, contentB64, size? }
          // encrypt the contentB64 string (so plaintext is the base64 string)
          const enc = await encryptForRecipient(att.contentB64, recipientPub);
          encryptedAttachments.push({
            filename: att.name,
            size: att.size ?? null,
            payload: {
              kem: enc.kem,
              iv: enc.iv,
              ct: enc.ct,
            },
          });
        }
      }

      // ---- STORE ENCRYPTED MESSAGE + ATTACHMENTS ----
      const messagesCol = collection(db, 'secureMessages');
      const docRef = await addDoc(messagesCol, {
        to: input.to,
        subject: input.subject,
        sender: process.env.RESEND_FROM_EMAIL,
        securityLevel: input.securityLevel || 'pqc',
        payload: encryptedBody,
        attachments: encryptedAttachments,
        createdAt: Date.now(),
      });

      // ---- READ LINK ----
      const readUrl = `${baseUrl}/read/${docRef.id}`;

      // ---- EMAIL HTML ----
      const emailHtml = `
        <p>You have received a <strong>secure message</strong>.</p>
        <p>Security: <strong>${input.securityLevel || 'PQC (Kyber)'}</strong></p>
        <p>
          <a href="${readUrl}"
            style="padding: 10px 16px; background: #111; color: #fff; 
                   border-radius: 6px; text-decoration: none;">
            View Secure Message
          </a>
        </p>
        <p>If the button doesn't work, open: <br/> ${readUrl}</p>
      `;

      // ---- SEND EMAIL ----
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: input.to,
        subject: `[Secure Message] ${input.subject}`,
        html: emailHtml,
      });

      return { success: true, message: 'Email sent successfully.' };
    } catch (error: any) {
      console.error('❌ Resend send error:', error);
      return {
        success: false,
        message: error?.message || 'Failed to send secure email.',
      };
    }
  }
);
