'use server';

import {
  getSecurityLevelGuidance,
  type SecurityLevelGuidanceInput,
} from '@/ai/flows/security-selection-guidance';

import {
  sendEmail,
  type SendEmailInput,
} from '@/ai/flows/send-email-flow';

import {
  generateSecurityKey,
  type GenerateSecurityKeyInput,
  type GenerateSecurityKeyOutput,
} from '@/ai/flows/generate-security-key-flow';

// --------------------------------------
// 1) ADD EXTENDED TYPE FOR ATTACHMENTS
// --------------------------------------
export type AttachmentInput = {
  name: string;
  contentB64: string;
  size?: number;
};

export type ExtendedSendEmailInput = SendEmailInput & {
  attachments?: AttachmentInput[];
};

// --------------------------------------
// 2) KEEP fetchSecurityGuidance AS IS
// --------------------------------------
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

// --------------------------------------
// 3) FIX sendEmailAction TO ACCEPT ATTACHMENTS
// --------------------------------------
export async function sendEmailAction(
  input: ExtendedSendEmailInput
): Promise<{ success: boolean; message: string }> {
  return await sendEmail(input);
}

// --------------------------------------
// 4) Key generation stays the same
// --------------------------------------
export async function generateKeyAction(
  input: GenerateSecurityKeyInput
): Promise<GenerateSecurityKeyOutput> {
  return await generateSecurityKey(input);
}
