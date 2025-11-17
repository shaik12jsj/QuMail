'use server';
/**
 * send-email-flow.ts
 * Rewritten to use Kyber PQC (encryptForRecipient) and store encrypted payload in Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import sgMail from '@sendgrid/mail';

import { getFirestore, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import app  from '@/lib/firebase'; // make sure src/lib/firebase exports the initialized app
import { encryptForRecipient } from '@/lib/pqc';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient.'),
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The plain text body of the email.'),
  securityLevel: z.string().describe('The security level applied.'),
  securityKey: z.string().optional().describe('(ignored) legacy field - not used for PQC'),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; message: string }> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    // Ensure SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.log("Vercel SendGrid Key:", !!process.env.SENDGRID_API_KEY, process.env.SENDGRID_ENV);

      console.error('SENDGRID_API_KEY is not set.');
      return { success: false, message: 'Email service is not configured. Missing API Key.' };
    }
    if (!process.env.SENDGRID_FROM_EMAIL) {
      console.error('SENDGRID_FROM_EMAIL is not set.');
      return { success: false, message: 'Email sender is not configured.' };
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    // Determine base URL
    let baseUrl;
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }

    try {
      // 1) Find recipient in Firestore and get their Kyber public key
      const db = getFirestore(app);
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('email', '==', input.to));
      const snap = await getDocs(q);
      if (snap.empty) {
        return { success: false, message: 'Recipient not found or not registered.' };
      }
      const recipientDoc = snap.docs[0].data() as any;
      const recipientPub = recipientDoc?.pubkeys?.kyberPublic;
      if (!recipientPub) {
        return { success: false, message: 'Recipient has no PQC public key registered.' };
      }

      // 2) Encrypt body using Kyber KEM + symmetric encryption
      // encryptForRecipient returns { kem, iv, ct }
      const encryptedPayload = await encryptForRecipient(input.body, recipientPub);

      // 3) Store encrypted payload in Firestore
      const messagesCol = collection(db, 'secureMessages');
      const docRef = await addDoc(messagesCol, {
        to: input.to,
        subject: input.subject,
        sender: process.env.SENDGRID_FROM_EMAIL,
        securityLevel: input.securityLevel || 'pqc',
        payload: encryptedPayload,
        createdAt: Date.now(),
      });

      // 4) Build read URL with the message id only
      const readUrl = `${baseUrl}/read/${docRef.id}`;

      // 5) Send SendGrid mail with the secure link (no keys in URL)
      const emailBody = `
        You have received a secure message.
        <br/><br/>
        Security level used: <strong>${input.securityLevel || 'PQC (Kyber)'}</strong>
        <br/><br/>
        Click below to open the secure message:
        <br/><br/>
        <a href="${readUrl}" style="background-color: #095de7; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Secure Message</a>
        <br/><br/>
        If the button doesn't work, copy and paste the following URL into your browser:
        <br/>
        ${readUrl}
      `;

      const msg = {
        to: input.to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: 'QuMail',
        },
        subject: `[Secure Message] ${input.subject}`,
        text: `You have received a secure message. View: ${readUrl}`,
        html: `<p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
      };

      await sgMail.send(msg);
      return { success: true, message: 'Email sent successfully.' };
    } catch (error: any) {
      console.error('SendGrid/Encryption Error:', error?.response?.body || error?.message || error);
      const errorMessage = error?.response?.body?.errors?.[0]?.message || (error?.message ?? 'Failed to send secure email.');
      return { success: false, message: errorMessage };
    }
  }
);

