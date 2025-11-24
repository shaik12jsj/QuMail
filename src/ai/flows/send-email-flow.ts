'use server';
/**
 * Gmail-Safe send-email-flow (Option A subject)
 * - PQC encryption for body + attachments
 * - Attachments supported (encrypted per-file)
 * - OTP mode forbids attachments
 * - Forced base URL (use NEXT_PUBLIC_BASE_URL)
 * - Safe FROM (use RESEND_FROM_EMAIL; avoid "no-reply")
 * - Minimal, human-like email content (Option A subject)
 * - No tracking, no buttons styling that triggers filters
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
  contentB64: z.string(), // base64 file bytes from client
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
if (!process.env.NEXT_PUBLIC_BASE_URL) console.warn('⚠️ NEXT_PUBLIC_BASE_URL missing — fallback will be used');

export async function sendEmail(input: SendEmailInput) {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow_gmail_safe_optionA',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    try {
      // ---------- Force baseUrl to the verified domain ----------
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qumail.dpdns.org';

      // ---------- Load recipient public key ----------
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
        return { success: false, message: 'Recipient has no PQC public key.' };
      }

      // ---------- OTP mode forbids attachments ----------
      if (input.securityLevel === 'Quantum Secure - OTP' && input.attachments && input.attachments.length > 0) {
        return {
          success: false,
          message: 'Quantum Secure - OTP does not support attachments.',
        };
      }

      // ---------- Encrypt body ----------
      const encryptedBody = await encryptForRecipient(input.body, recipientPub);

      // ---------- Encrypt attachments ----------
      const encryptedAttachments: Array<any> = [];
      if (input.attachments && input.attachments.length > 0) {
        for (const att of input.attachments) {
          // We encrypt the base64 bytes string for the recipient as plain text payload
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

      // ---------- Store encrypted message & attachments ----------
      const messagesCol = collection(db, 'secureMessages');
      const docRef = await addDoc(messagesCol, {
        to: input.to,
        // store original subject for user display but we will override outgoing subject for deliverability
        originalSubject: input.subject,
        sender: process.env.RESEND_FROM_EMAIL,
        securityLevel: input.securityLevel || 'PQC',
        payload: encryptedBody,
        attachments: encryptedAttachments,
        createdAt: Date.now(),
      });

      const readUrl = `${baseUrl}/read/${docRef.id}`;

      // ---------- Gmail-safe subject (Option A) ----------
      // We override subject for outbound email to maximize deliverability.
      const outboundSubject = 'Hi, I wanted to share something';

      // ---------- Minimal, human-like html + text ----------
      const html = `
        <p>Hi,</p>
        <p>I wanted to share something with you. Please open the link below:</p>
        <p><a href="${readUrl}">${readUrl}</a></p>
        <p>If the link doesn’t open, copy and paste it into your browser.</p>
        <p>Thanks.</p>
      `.trim();

      const text = `Hi,

I wanted to share something with you. Please open the link below:

${readUrl}

If the link doesn't open, copy and paste it into your browser.

Thanks.`;

      // ---------- Send email (no tracking, minimal headers) ----------
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: input.to,
        subject: outboundSubject,
        html,
        text,
        // no tracking flags — keep payload minimal
      });

      return { success: true, message: 'Message saved and notification sent.' };
    } catch (err: any) {
      console.error('❌ sendEmailFlow error:', err);
      return { success: false, message: err?.message || 'Failed to send secure email.' };
    }
  }
);
