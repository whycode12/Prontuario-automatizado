// Servico de criptografia ponta a ponta (AES-GCM de 256 bits) usando a Web Crypto API nativa do navegador
// Os dados sao criptografados antes de sair do navegador do medico.
// No Firebase, os dados sao armazenados apenas como texto ilegivel codificado em Base64.

const SALT = new Uint8Array([77, 101, 100, 105, 99, 105, 110, 97, 83, 101, 99, 117, 114, 101, 80, 65]);

async function deriveKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plainText: string, masterKey: string): Promise<string> {
  if (!masterKey || !plainText) return plainText;
  const key = await deriveKey(masterKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Converte para Base64 seguro
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export async function decryptData(cipherBase64: string, masterKey: string): Promise<string> {
  if (!masterKey || !cipherBase64) return cipherBase64;
  try {
    const binary = atob(cipherBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await deriveKey(masterKey);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    throw new Error('Falha ao descriptografar. Senha mestra incorreta.');
  }
}
