'use server';
/**
 * @fileOverview This file defines a Genkit flow for simulating the generation of a security key.
 *
 * It exports:
 * - `generateSecurityKey`: An async function that takes a security level and returns a simulated key and description.
 * - `GenerateSecurityKeyInput`: The input type for the `generateSecurityKey` function.
 * - `GenerateSecurityKeyOutput`: The output type for the `generateSecurityKey` function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateSecurityKeyInputSchema = z.object({
  securityLevel: z.string().describe('The selected security level.'),
});
export type GenerateSecurityKeyInput = z.infer<typeof GenerateSecurityKeyInputSchema>;

const GenerateSecurityKeyOutputSchema = z.object({
  key: z.string().describe('The generated pseudo-random security key.'),
  description: z.string().describe('A description of the security being applied.'),
});
export type GenerateSecurityKeyOutput = z.infer<typeof GenerateSecurityKeyOutputSchema>;

export async function generateSecurityKey(
  input: GenerateSecurityKeyInput
): Promise<GenerateSecurityKeyOutput> {
  return generateSecurityKeyFlow(input);
}

function createPseudoRandomKey(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const generateSecurityKeyFlow = ai.defineFlow(
  {
    name: 'generateSecurityKeyFlow',
    inputSchema: GenerateSecurityKeyInputSchema,
    outputSchema: GenerateSecurityKeyOutputSchema,
  },
  async (input) => {
    let key = '';
    let description = '';

    switch (input.securityLevel) {
      case 'Quantum Secure - OTP':
        key = createPseudoRandomKey(64);
        description = 'Generated a 64-character One-Time Pad for Quantum Secure transmission.';
        break;
      case 'Quantum-aided AES':
        key = `AES-256-GCM-QKD-${createPseudoRandomKey(16)}`;
        description = 'Generated a 256-bit AES key using a quantum key distribution method.';
        break;
      case 'PQC':
        key = `CRYSTALS-Dilithium-${createPseudoRandomKey(24)}`;
        description = 'Generated a key using the CRYSTALS-Dilithium Post-Quantum cryptographic algorithm.';
        break;
      case 'No Quantum security':
        key = 'N/A';
        description = 'No quantum security applied. Standard TLS encryption will be used by the transport layer.';
        break;
      default:
        key = 'N/A';
        description = 'Invalid security level selected.';
        break;
    }

    return { key, description };
  }
);
