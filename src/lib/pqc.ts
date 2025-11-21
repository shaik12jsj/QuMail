// src/lib/pqc.ts
import { kyber } from "kyber-crystals";
import nacl from "tweetnacl";
import { Base64 } from "js-base64";

const toB64 = (u8: Uint8Array) => Base64.fromUint8Array(u8);
const fromB64 = (s: string) => Base64.toUint8Array(s);

// Derive 32-byte AES key from shared secret
function deriveAesKey(secret: Uint8Array): Uint8Array {
  return secret.slice(0, 32);
}

// ------------------------------
// Symmetric encryption (AES-like)
// ------------------------------
export function symEncrypt(plaintext: string, key32: Uint8Array) {
  const nonce = nacl.randomBytes(24);
  const ptU8 = new TextEncoder().encode(plaintext);
  const ct = nacl.secretbox(ptU8, nonce, key32);

  return {
    nonce: toB64(nonce),
    ciphertext: toB64(ct),
  };
}

export function symDecrypt(nonceB64: string, cipherB64: string, key32: Uint8Array) {
  const nonce = fromB64(nonceB64);
  const ct = fromB64(cipherB64);

  const pt = nacl.secretbox.open(ct, nonce, key32);
  if (!pt) throw new Error("Decryption failed");

  return new TextDecoder().decode(pt);
}

// ------------------------------
// Generate Kyber Keypair
// ------------------------------
export async function generateKyberKeypair() {
  const { publicKey, privateKey } = await kyber.keyPair();

  return {
    publicKeyB64: toB64(publicKey),
    privateKeyB64: toB64(privateKey),
  };
}

// ------------------------------
// Encapsulation (KEM Encrypt)
// ------------------------------
export async function kyberEncapsulate(recipientPubB64: string) {
  const pub = fromB64(recipientPubB64);

  // ✔ Correct structure: cyphertext + secret
  const { cyphertext, secret } = await kyber.encrypt(pub);

  return {
    kemCipherB64: toB64(cyphertext),
    sharedSecret: secret,
  };
}

// ------------------------------
// Decapsulation (KEM Decrypt)
// ------------------------------
export async function kyberDecapsulate(kemCipherB64: string, recipientPrivB64: string) {
  const kem = fromB64(kemCipherB64);
  const priv = fromB64(recipientPrivB64);

  // ✔ returns raw shared secret
  const secret = await kyber.decrypt(kem, priv);

  return secret;
}

// Add these near other exports in src/lib/pqc.ts
export function deriveAesKeyFromSecret(secret: Uint8Array) {
  return deriveAesKey(secret);
}

// Re-export kyberDecapsulate if not already exported (you already have it)
// export async function kyberDecapsulate(...) { ... } (you showed it earlier)



// ------------------------------
// Encrypt for recipient
// ------------------------------
export async function encryptForRecipient(plaintext: string, recipientPubB64: string) {
  const { kemCipherB64, sharedSecret } = await kyberEncapsulate(recipientPubB64);

  const aesKey = deriveAesKey(sharedSecret);
  const encrypted = symEncrypt(plaintext, aesKey);

  return {
    kem: kemCipherB64,
    iv: encrypted.nonce,
    ct: encrypted.ciphertext,
  };
}

// ------------------------------
// Decrypt using recipient private key
// ------------------------------
export async function decryptFromPayload(
  payload: { kem: string; iv: string; ct: string },
  recipientPrivB64: string
) {
  const sharedSecret = await kyberDecapsulate(payload.kem, recipientPrivB64);
  const aesKey = deriveAesKey(sharedSecret);

  return symDecrypt(payload.iv, payload.ct, aesKey);
}
