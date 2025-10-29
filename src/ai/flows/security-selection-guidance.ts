'use server';
/**
 * @fileOverview This file defines a Genkit flow for providing security level guidance based on message content and recipient.
 *
 * It exports:
 * - `getSecurityLevelGuidance`: An async function that takes message content and recipient as input and returns security level guidance.
 * - `SecurityLevelGuidanceInput`: The input type for the `getSecurityLevelGuidance` function.
 * - `SecurityLevelGuidanceOutput`: The output type for the `getSecurityLevelGuidance` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SecurityLevelGuidanceInputSchema = z.object({
  messageContent: z.string().describe('The content of the message being composed.'),
  recipient: z.string().describe('The email address of the recipient.'),
});
export type SecurityLevelGuidanceInput = z.infer<typeof SecurityLevelGuidanceInputSchema>;

const SecurityLevelGuidanceOutputSchema = z.object({
  guidance: z.string().describe('Guidance on which security level is most appropriate.'),
});
export type SecurityLevelGuidanceOutput = z.infer<typeof SecurityLevelGuidanceOutputSchema>;

export async function getSecurityLevelGuidance(
  input: SecurityLevelGuidanceInput
): Promise<SecurityLevelGuidanceOutput> {
  return securityLevelGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'securityLevelGuidancePrompt',
  input: {schema: SecurityLevelGuidanceInputSchema},
  output: {schema: SecurityLevelGuidanceOutputSchema},
  prompt: `You are an AI assistant providing security level guidance for an email.
  Based on the content and recipient, recommend a security level:
  - Quantum Secure - OTP: Max security for highly sensitive data.
  - Quantum-aided AES: Strong security for sensitive data.
  - PQC: Long-term security against quantum attacks.
  - No Quantum security: For non-sensitive communication.

  Message Content: {{{messageContent}}}
  Recipient: {{{recipient}}}

  Provide a single, concise sentence explaining the best choice for a general user.
`,
});

const securityLevelGuidanceFlow = ai.defineFlow(
  {
    name: 'securityLevelGuidanceFlow',
    inputSchema: SecurityLevelGuidanceInputSchema,
    outputSchema: SecurityLevelGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
