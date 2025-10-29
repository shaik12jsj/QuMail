'use client';

import { useSearchParams } from 'next/navigation';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock, Unlock, KeyRound, Loader2 } from 'lucide-react';

function SecureMessageReader() {
  const searchParams = useSearchParams();
  const body = searchParams.get('body');
  const key = searchParams.get('key');
  const securityLevel = searchParams.get('securityLevel');

  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState(false);

  const handleDecrypt = () => {
    setIsDecrypting(true);
    // Simulate decryption delay
    setTimeout(() => {
      setDecrypted(true);
      setIsDecrypting(false);
    }, 1500);
  };

  if (!body || !key || !securityLevel) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-foreground">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle>Invalid Message Link</CardTitle>
          </CardHeader>
          <CardContent>
            <p>This secure message link is incomplete or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (decrypted) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4 font-display text-foreground">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <Unlock className="h-6 w-6 text-green-500" />
                        <div>
                            <CardTitle>Message Decrypted</CardTitle>
                            <CardDescription>Security Method: {decodeURIComponent(securityLevel)}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="rounded-md border bg-secondary/50 p-4">
                            <p className="font-mono text-sm text-muted-foreground break-all">
                                <strong>Decryption Key:</strong> {decodeURIComponent(key)}
                            </p>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4 whitespace-pre-wrap">
                           {decodeURIComponent(body)}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }


  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4 font-display text-foreground">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="flex flex-col items-center gap-4">
                    <Lock className="h-12 w-12 text-primary" />
                    <CardTitle className="text-2xl">You've Received a Secure Message</CardTitle>
                    <CardDescription>
                        This message was encrypted using <strong>{decodeURIComponent(securityLevel)}</strong>.
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
                <p>Click the button below to use the provided security key and decrypt the content.</p>
                 <div className="rounded-md border bg-secondary/50 p-3 w-full">
                    <p className="font-mono text-xs text-muted-foreground break-all">
                        <KeyRound className="inline-block mr-2 h-4 w-4"/>
                        {decodeURIComponent(key)}
                    </p>
                </div>
                <Button size="lg" onClick={handleDecrypt} disabled={isDecrypting}>
                    {isDecrypting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Decrypting...
                        </>
                    ) : (
                        <>
                            <Unlock className="mr-2 h-5 w-5" />
                            Decrypt and Read Message
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}


export default function ReadPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SecureMessageReader />
        </Suspense>
    )
}
