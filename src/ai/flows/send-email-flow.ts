'use server';
/**
 * @fileOverview This file defines a Genkit flow for sending an email using SendGrid.
 *
 * It exports:
 * - `sendEmail`: An async function that sends an email.
 * - `SendEmailInput`: The input type for the `sendEmail` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import sgMail from '@sendgrid/mail';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe('The email address of the recipient.'),
  subject: z.string().describe('The subject of the email.'),
  body: z.string().describe('The plain text body of the email.'),
  securityLevel: z.string().describe('The security level applied.'),
  securityKey: z.string().describe('The generated security key.'),
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
    // IMPORTANT: You need to set your SendGrid API Key as an environment variable.
    // Create a .env file in the root of your project and add:
    // SENDGRID_API_KEY='YOUR_SENDGRID_API_KEY'
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is not set.');
      return { success: false, message: 'Email service is not configured. Missing API Key.' };
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    // Determine the base URL based on the environment
    let baseUrl;
    if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      baseUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
    } else if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Fallback for local development
      baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    }

    const readUrl = new URL('/read', baseUrl);
    readUrl.searchParams.append('body', encodeURIComponent(input.body));
    readUrl.searchParams.append('key', encodeURIComponent(input.securityKey));
    readUrl.searchParams.append('securityLevel', encodeURIComponent(input.securityLevel));

    const emailBody = `
      You have received a secure message.
      <br><br>
      This message was sent using <strong>${input.securityLevel}</strong>.
      <br><br>
      To decrypt and view your message, please click the link below:
      <br><br>
      <a href="${readUrl.toString()}" style="background-color: #095de7; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Secure Message</a>
      <br><br>
      If you cannot click the link, copy and paste this URL into your browser:
      <br>
      ${readUrl.toString()}
    `;

    const msg = {
      to: input.to,
      // IMPORTANT: You must verify a sender email in your SendGrid account.
      from: {
        email: 'bot866256@gmail.com', 
        name: 'QuMail'}, 
      subject: `[Secure Message] ${input.subject}`,
      text: `You have received a secure message. To view it, open the following link in your browser: ${readUrl.toString()}`,
      html: `<p>${emailBody.replace(/\n/g, '<br>')}</p>`,
    };

    try {
      await sgMail.send(msg);
      return { success: true, message: 'Email sent successfully.' };
    } catch (error: any) {
      console.error('SendGrid Error:', error.response?.body || error.message);
      const errorMessage = error.response?.body?.errors?.[0]?.message || 'Failed to send email.';
      return { success: false, message: errorMessage };
    }
  }
);
