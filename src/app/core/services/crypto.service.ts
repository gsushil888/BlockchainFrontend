import { Injectable } from '@angular/core';

// Must match backend app.encryption.passphrase
const PASSPHRASE = 'blockchain-hashing-secret-passphrase';

interface DerivedCrypto {
  key: CryptoKey;
  iv: Uint8Array<ArrayBuffer>;
}

@Injectable({ providedIn: 'root' })
export class CryptoService {

  private cache: DerivedCrypto | null = null;

  /**
   * SHA-256 hash the passphrase → 32-byte digest.
   * AES-256 key  = full 32 bytes of digest.
   * IV           = first 16 bytes of digest.
   * Mirrors AesEncryptionUtil.java exactly.
   */
  private async deriveKeyAndIv(): Promise<DerivedCrypto> {
    if (this.cache) return this.cache;

    const passphraseBytes = new TextEncoder().encode(PASSPHRASE) as Uint8Array<ArrayBuffer>;
    const hashBuffer: ArrayBuffer = await window.crypto.subtle.digest('SHA-256', passphraseBytes);
    const hashBytes: Uint8Array<ArrayBuffer> = new Uint8Array(hashBuffer);

    const key: CryptoKey = await window.crypto.subtle.importKey(
      'raw',
      hashBytes,
      { name: 'AES-CBC' },
      false,
      ['encrypt', 'decrypt']
    );

    const iv: Uint8Array<ArrayBuffer> = new Uint8Array(hashBuffer.slice(0, 16));

    this.cache = { key, iv };
    return this.cache;
  }

  async encrypt(plainText: string): Promise<string> {
    const { key, iv } = await this.deriveKeyAndIv();
    const encoded = new TextEncoder().encode(plainText) as Uint8Array<ArrayBuffer>;
    const encrypted: ArrayBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      key,
      encoded
    );
    return this.arrayBufferToBase64(encrypted);
  }

  async decrypt(base64CipherText: string): Promise<string> {
    const { key, iv } = await this.deriveKeyAndIv();
    const cipherBytes: ArrayBuffer = this.base64ToArrayBuffer(base64CipherText);
    const decrypted: ArrayBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      cipherBytes
    );
    return new TextDecoder().decode(decrypted);
  }

  // Safe base64 encoding — avoids stack overflow from spread operator on large arrays
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
