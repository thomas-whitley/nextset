import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// SecureStore (iOS Keychain / Android Keystore) caps individual values at
// ~2048 bytes, which Supabase session payloads can exceed. Following
// Supabase's recommended pattern: each write generates a fresh AES-256 key
// stored in SecureStore, used to encrypt the session blob stored in
// AsyncStorage (unbounded size, but not itself secure at rest). The key is
// never generated on read — if it's missing, the session is treated as
// gone (forcing a clean re-login) rather than decrypted into garbage.
class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) {
      return null;
    }

    const encryptionKey = aesjs.utils.hex.toBytes(encryptionKeyHex);
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // SecureStore has no web implementation; the browser's own
    // localStorage-backed default storage is used there instead.
    storage: Platform.OS === 'web' ? undefined : (new LargeSecureStore() as any),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
