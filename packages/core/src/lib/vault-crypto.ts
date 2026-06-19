const PBKDF2_ITERATIONS = 200_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

export interface VaultEntry {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface Vault {
  version: 1;
  entries: VaultEntry[];
}

export interface EncryptedVault {
  version: 1;
  salt: string;
  iv: string;
  data: string;
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) {
    arr[i] = raw.charCodeAt(i);
  }
  return arr;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const arr = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(arr);
  return arr;
}

async function deriveKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptVault(
  vault: Vault,
  masterPassword: string
): Promise<EncryptedVault> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = await deriveKey(masterPassword, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(vault))
  );
  return {
    version: 1,
    salt: toBase64(salt.buffer),
    iv: toBase64(iv.buffer),
    data: toBase64(ciphertext),
  };
}

export async function decryptVault(
  encrypted: EncryptedVault,
  masterPassword: string
): Promise<Vault> {
  const salt = fromBase64(encrypted.salt);
  const iv = fromBase64(encrypted.iv);
  const key = await deriveKey(masterPassword, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromBase64(encrypted.data)
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as Vault;
}
