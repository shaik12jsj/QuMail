'use server';

/**
 * FINAL Gmail-Safe send-email-flow (Option A)
 * - PQC encryption for body + attachments
 * - Attachments supported (encrypted)
 * - OTP mode forbids attachments
 * - Uses Vercel URL (Option A)
 * - Safe FROM (mail@qumail.dpdns.org)
 * - Minimal plain wording (Gmail friendly)
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

import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY || '');

const AttachmentSchema = z.object({
  name: z.string(),
  contentB64: z.string(),
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

if (!process.env.RESEND_API_KEY) console.error('❌ RESEND_API_KEY missing');
if (!process.env.RESEND_FROM_EMAIL) console.error('❌ RESEND_FROM_EMAIL missing');

export async function sendEmail(input: SendEmailInput) {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow_gmail_safe_final',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },

  async (input) => {
    try {
      // -------- BASE URL (Option A) --------
      const baseUrl = 'https://qu-mail-taupe.vercel.app';

      // -------- Find recipient --------
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
        return { success: false, message: 'Recipient missing PQC public key.' };
      }

      // -------- OTP mode -> no attachments --------
      if (input.securityLevel === 'Quantum Secure - OTP' && input.attachments?.length) {
        return {
          success: false,
          message: 'Quantum Secure - OTP does not support attachments.',
        };
      }

      // -------- Encrypt body --------
      const encryptedBody = await encryptForRecipient(input.body, recipientPub);

      // -------- Encrypt attachments --------
      const encryptedAttachments: any[] = [];

      if (input.attachments?.length) {
        for (const att of input.attachments) {
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

      // -------- Save message --------
      const docRef = await addDoc(collection(db, 'secureMessages'), {
        to: input.to,
        originalSubject: input.subject,
        sender: process.env.RESEND_FROM_EMAIL,
        securityLevel: input.securityLevel || 'PQC',
        payload: encryptedBody,
        attachments: encryptedAttachments,
        createdAt: Date.now(),
      });

      const readUrl = `${baseUrl}/read/${docRef.id}`;

      // -------- Gmail-safe subject / Option A --------
      const gmailSafeSubject = 'Hi, I wanted to share something';

      // -------- Gmail-safe HTML --------
      const html = `
        <p>Hi,</p>
        <p>I wanted to share something with you. Please open the link below:</p>
        <p><a href="${readUrl}">${readUrl}</a></p>
        <p>If the link doesn’t open, copy and paste it into your browser.</p>
        <p>Thanks.</p>
      `.trim();

      // -------- Plain text backup --------
      const text = `Hi,

I wanted to share something with you. Please open the link below:

${readUrl}

If the link doesn't open, copy and paste it into your browser.

Thanks.`;

      // -------- Send via Resend --------
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: input.to,
        subject: gmailSafeSubject,
        html,
        text,
      });

      return { success: true, message: 'Message saved & email sent.' };

    } catch (err: any) {
      console.error('❌ sendEmailFlow error', err);
      return {
        success: false,
        message: err?.message || 'Email send failed.',
      };
    }
  }
);
