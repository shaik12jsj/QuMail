'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import app from '@/lib/firebase';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, Loader2 } from 'lucide-react';

export default function ReadPage() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<any>(null);
  const [decrypted, setDecrypted] = useState(false);
  const [decrypting, setDecrypting] = useState(false);

  const db = getFirestore(app);

  // Load message from Firestore
  useEffect(() => {
    async function fetchMessage() {
      try {
        const ref = doc(db, 'secureMessages', id as string);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setMessage(snap.data());
        }
      } catch (err) {
        console.error('Error loading message:', err);
      }
      setLoading(false);
    }

    fetchMessage();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-center">Loading secure message...</div>;
  }

  if (!message) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Card className="p-6 max-w-lg text-center">
          <CardTitle>Message Not Found</CardTitle>
          <CardDescription>This link may be invalid or the message was deleted.</CardDescription>
        </Card>
      </div>
    );
  }

  const handleDecrypt = async () => {
    setDecrypting(true);
    setTimeout(() => {
      setDecrypting(false);
      setDecrypted(true);
    }, 1500);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            {decrypted ? <Unlock className="h-6 w-6 text-green-500" /> : <Lock className="h-6 w-6 text-red-500" />}
            <div>
              <CardTitle>{message.subject}</CardTitle>
              <CardDescription>Encrypted using {message.securityLevel}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!decrypted ? (
            <div className="flex flex-col items-center gap-4">
              <p>This message is securely encrypted. Click below to decrypt.</p>

              <Button onClick={handleDecrypt} disabled={decrypting}>
                {decrypting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Decrypting...
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4 mr-2" /> Decrypt Message
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="mt-4">
              <p className="font-semibold mb-2">Decrypted Payload:</p>
              <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded">
                {JSON.stringify(message.payload, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
