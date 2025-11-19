'use server';
/**
 * send-email-flow.ts — Resend version
 *
 * Replaces SendGrid with Resend (resend.com).
 * Uses:
 * - src/lib/pqc.ts for PQC encryption
 * - src/lib/firebase for Firestore
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

const SendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
  securityLevel: z.string().optional(),
  securityKey: z.string().optional(),
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
    name: 'sendEmailFlow_resend',
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

      // ---- PQC ENCRYPTION ----
      const encryptedPayload = await encryptForRecipient(
        input.body,
        recipientPub
      );

      // ---- STORE ENCRYPTED MESSAGE ----
      const messagesCol = collection(db, 'secureMessages');
      const docRef = await addDoc(messagesCol, {
        to: input.to,
        subject: input.subject,
        sender: process.env.RESEND_FROM_EMAIL,
        securityLevel: input.securityLevel || 'pqc',
        payload: encryptedPayload,
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

