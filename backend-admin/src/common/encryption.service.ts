import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer {
    const secret = this.config.get<string>('ENCRYPTION_KEY') || 'fallback_key_change_me';
    return createHash('sha256').update(secret).digest();
  }

  encrypt(value?: string | null): string | null {
    if (!value) return null;
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(value?: string | null): string | null {
    if (!value) return null;
    const [ivHex, encryptedHex] = value.split(':');
    const decipher = createDecipheriv('aes-256-cbc', this.getKey(), Buffer.from(ivHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
