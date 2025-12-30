/**
 * Secure Storage Utility
 * Provides encrypted localStorage with AES-256-GCM encryption
 *
 * Usage:
 *   SecureStorage.setItem('authToken', token);
 *   const token = SecureStorage.getItem('authToken');
 */

// Sensitive keys that should be encrypted
const ENCRYPTED_KEYS = new Set([
  'authToken',
  'currentUser',
  'adminToken',
  'sessionData',
  'apiKeys',
]);

/**
 * Check if a key should be encrypted
 */
function shouldEncrypt(key: string): boolean {
  return ENCRYPTED_KEYS.has(key);
}

/**
 * Get or generate encryption key for this browser
 * Stored in sessionStorage to ensure it's temporary per session
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyName = '_ek';

  // Try to get existing key from sessionStorage
  const storedKey = sessionStorage.getItem(keyName);
  if (storedKey) {
    try {
      const keyData = JSON.parse(storedKey);
      return await crypto.subtle.importKey(
        'jwk',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    } catch {
      // If import fails, generate new key
    }
  }

  // Generate new key
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Export and store key
  const exportedKey = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(keyName, JSON.stringify(exportedKey));

  return key;
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encode data
    const encoded = new TextEncoder().encode(data);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[SecureStorage] Encryption failed:', error);
    // Fallback: return data as-is (not recommended for production)
    return data;
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    // Decode
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('[SecureStorage] Decryption failed:', error);
    // Fallback: return data as-is
    return encryptedData;
  }
}

/**
 * Secure Storage API
 * Drop-in replacement for localStorage with encryption for sensitive keys
 */
export const SecureStorage = {
  /**
   * Set item in storage (encrypted if sensitive)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (shouldEncrypt(key)) {
        const encrypted = await encrypt(value);
        localStorage.setItem(`_enc_${key}`, encrypted);
        // Mark as encrypted
        localStorage.setItem(`_meta_${key}`, 'encrypted');
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('[SecureStorage] setItem failed:', error);
      // Fallback to regular storage
      localStorage.setItem(key, value);
    }
  },

  /**
   * Get item from storage (decrypted if encrypted)
   */
  async getItem(key: string): Promise<string | null> {
    try {
      // Check if this key is encrypted
      const meta = localStorage.getItem(`_meta_${key}`);
      if (meta === 'encrypted') {
        const encrypted = localStorage.getItem(`_enc_${key}`);
        if (!encrypted) return null;
        return await decrypt(encrypted);
      }

      // Not encrypted, return as-is
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[SecureStorage] getItem failed:', error);
      // Fallback to regular storage
      return localStorage.getItem(key);
    }
  },

  /**
   * Remove item from storage
   */
  removeItem(key: string): void {
    localStorage.removeItem(key);
    localStorage.removeItem(`_enc_${key}`);
    localStorage.removeItem(`_meta_${key}`);
  },

  /**
   * Clear all storage
   */
  clear(): void {
    localStorage.clear();
    sessionStorage.clear();
  },

  /**
   * Synchronous getItem (returns encrypted value if not yet decrypted)
   * Use async getItem() for decrypted values
   */
  getItemSync(key: string): string | null {
    return localStorage.getItem(key);
  },

  /**
   * Synchronous setItem (stores without encryption)
   * Use async setItem() for encrypted storage
   */
  setItemSync(key: string, value: string): void {
    localStorage.setItem(key, value);
  },

  /**
   * Migrate existing unencrypted data to encrypted storage
   */
  async migrateToEncrypted(): Promise<void> {
    for (const key of ENCRYPTED_KEYS) {
      const value = localStorage.getItem(key);
      if (value && !localStorage.getItem(`_meta_${key}`)) {
        // Data exists but not encrypted, migrate it
        await this.setItem(key, value);
        // Remove old unencrypted copy
        localStorage.removeItem(key);
      }
    }
  }
};

/**
 * Synchronous wrapper for backward compatibility
 * NOTE: This does NOT provide encryption, use SecureStorage directly for encrypted storage
 */
export const SyncSecureStorage = {
  setItem(key: string, value: string): void {
    if (shouldEncrypt(key)) {
      // Queue encryption for next tick
      SecureStorage.setItem(key, value).catch(console.error);
    } else {
      localStorage.setItem(key, value);
    }
  },

  getItem(key: string): string | null {
    return localStorage.getItem(key);
  },

  removeItem(key: string): void {
    SecureStorage.removeItem(key);
  }
};

// Auto-migrate on module load
if (typeof window !== 'undefined' && window.crypto?.subtle) {
  SecureStorage.migrateToEncrypted().catch(console.error);
}

export default SecureStorage;
