export interface ApplicationEncryptionService {
  decrypt(ciphertext: string): Promise<string>;
  encrypt(plaintext: string): Promise<string>;
}
