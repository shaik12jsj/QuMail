// (Full file with small edits — replace your current compose-form.tsx)
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Paperclip,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { fetchSecurityGuidance, sendEmailAction, generateKeyAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { type GenerateSecurityKeyOutput } from '@/ai/flows/generate-security-key-flow';

const formSchema = z.object({
  to: z.string().regex(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    { message: "Invalid email address." }
  ),

  cc: z.string().optional(),
  bcc: z.string().optional(),
  subject: z.string().min(1, { message: 'Subject is required.' }),
  body: z.string().min(1, { message: 'Message body cannot be empty.' }),
  securityLevel: z.string(),
});

type UIAttachment = {
  name: string;
  size: number;
  file: File;
};

export function ComposeForm() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [securityLevelToConfirm, setSecurityLevelToConfirm] = useState('');
  const [guidance, setGuidance] = useState('');
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [attachments, setAttachments] = useState<UIAttachment[]>([]);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      securityLevel: 'Quantum-aided AES',
    },
  });

  const recipient = form.watch('to');
  const messageContent = form.watch('body');
  const securityLevel = form.watch('securityLevel');

  // Convert File → base64
  async function fileToBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arr = new Uint8Array(reader.result as ArrayBuffer);
        const b64 = window.btoa(String.fromCharCode(...arr));
        resolve(b64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  const getGuidance = useCallback(async () => {
    if (recipient && messageContent) {
      setIsGuidanceLoading(true);
      try {
        const result = await fetchSecurityGuidance({
          recipient,
          messageContent,
        });
        setGuidance(result);
      } catch (error) {
        setGuidance('Could not retrieve guidance.');
      } finally {
        setIsGuidanceLoading(false);
      }
    }
  }, [recipient, messageContent]);

  useEffect(() => {
    if (recipient && messageContent) {
      const handler = setTimeout(() => {
        getGuidance();
      }, 1000);
      return () => clearTimeout(handler);
    }
  }, [recipient, messageContent, getGuidance]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    startTransition(async () => {
      // If OTP selected, attachments are not allowed
      if (values.securityLevel === 'Quantum Secure - OTP' && attachments.length > 0) {
        toast({
          variant: 'destructive',
          title: 'OTP mode cannot include attachments',
          description: 'Quantum Secure - OTP does not support attachments for security reasons. Remove attachments or choose another security level.',
        });
        return;
      }

      // Convert attachments → base64 for sending
      const encryptedAttachments = [];
      for (const a of attachments) {
        const contentB64 = await fileToBase64(a.file);
        encryptedAttachments.push({
          name: a.name,
          size: a.size,
          contentB64,
        });
      }

      const keyResult: GenerateSecurityKeyOutput = await generateKeyAction({
        securityLevel: values.securityLevel,
      });

      toast({
        title: `Security Applied: ${values.securityLevel}`,
        description: `${keyResult.description}`,
      });

      const result = await sendEmailAction({
        to: values.to,
        subject: values.subject,
        body: values.body,
        securityLevel: values.securityLevel,
        securityKey: keyResult.key,
        attachments: encryptedAttachments,
      });

      if (result.success) {
        toast({
          title: 'Secure Email Link Sent',
          description: 'A link to the secure message has been sent.',
        });
        form.reset();
        setAttachments([]);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to send email',
          description: result.message,
        });
      }
    });
  };

  const handleSend = () => {
    const securityLevel = form.getValues('securityLevel');
    if (securityLevel === 'Quantum Secure - OTP') {
      setSecurityLevelToConfirm(securityLevel);
      setShowConfirmDialog(true);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  const handleConfirmSend = () => {
    setShowConfirmDialog(false);
    form.handleSubmit(onSubmit)();
  };

  const handleFileAttach = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;

    // If OTP selected, disallow attaching
    const currentSec = form.getValues('securityLevel');
    if (currentSec === 'Quantum Secure - OTP') {
      toast({
        variant: 'destructive',
        title: 'Cannot attach files in OTP mode',
        description: 'Quantum Secure - OTP does not support attachments.',
      });
      return;
    }

    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      name: file.name,
      size: file.size,
      file,
    }));
    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const handleRemoveAttachment = (name: string) => {
    setAttachments(prev => prev.filter(att => att.name !== name));
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="to"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To</FormLabel>
                  <FormControl>
                    <Input placeholder="recipient@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Email subject" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Compose your secure message..."
                    className="min-h-[250px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4 rounded-lg border bg-secondary/50 p-4">
            <FormField
              control={form.control}
              name="securityLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Security Level</FormLabel>
                  <div className="flex items-center gap-4">
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a security level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Quantum Secure - OTP">
                          Quantum Secure - OTP
                        </SelectItem>
                        <SelectItem value="Quantum-aided AES">
                          Quantum-aided AES
                        </SelectItem>
                        <SelectItem value="PQC">PQC</SelectItem>
                        <SelectItem value="No Quantum security">
                          No Quantum security
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isGuidanceLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Getting guidance...</span>
              </div>
            ) : guidance ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                {guidance}
              </p>
            ) : null}
          </div>
          
          <div className="space-y-2">
            <FormLabel>Attachments</FormLabel>
            <div className="flex items-center gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                asChild
                disabled={securityLevel === 'Quantum Secure - OTP'} // disable button visually
              >
                <label htmlFor="file-upload" className={securityLevel === 'Quantum Secure - OTP' ? 'opacity-50 cursor-not-allowed' : ''}>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach Files
                </label>
              </Button>
              <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileAttach} />
            </div>
            {securityLevel === 'Quantum Secure - OTP' && (
              <p className="text-sm text-muted-foreground">Attachments are disabled for OTP mode.</p>
            )}
            {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between rounded-md border p-2 text-sm">
                            <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveAttachment(file.name)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="button" size="lg" onClick={handleSend} disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Security Level</AlertDialogTitle>
            <AlertDialogDescription>
              You selected Quantum Secure - OTP. This is extremely secure but slower.
              Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

