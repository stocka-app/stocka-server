import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { APP_CONSTANTS } from '@common/constants/app.constants';

export class AuthDomainService {
  static async hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, APP_CONSTANTS.BCRYPT_SALT_ROUNDS);
  }

  static async comparePasswords(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
