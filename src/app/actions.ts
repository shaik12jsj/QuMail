
'use server';

import {
  getSecurityLevelGuidance,
  type SecurityLevelGuidanceInput,
} from '@/ai/flows/security-selection-guidance';
import { sendEmail, type SendEmailInput } from '@/ai/flows/send-email-flow';
import {
  generateSecurityKey,
  type GenerateSecurityKeyInput,
  type GenerateSecurityKeyOutput,
} from '@/ai/flows/generate-security-key-flow';

export async function fetchSecurityGuidance(
  input: SecurityLevelGuidanceInput
): Promise<string> {
  try {
    const result = await getSecurityLevelGuidance(input);
    return result.guidance;
  } catch (error) {
    console.error('Error fetching security guidance:', error);
    return 'Could not retrieve guidance at this time.';
  }
}

export async function sendEmailAction(
  input: SendEmailInput
): Promise<{ success: boolean; message: string }> {
    return await sendEmail(input);
}

export async function generateKeyAction(
    input: GenerateSecurityKeyInput
): Promise<GenerateSecurityKeyOutput> {
    return await generateSecurityKey(input);
}
