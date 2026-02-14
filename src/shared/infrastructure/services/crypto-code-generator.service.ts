import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ICodeGeneratorContract } from '@shared/domain/contracts/code-generator.contract';

@Injectable()
export class CryptoCodeGeneratorService implements ICodeGeneratorContract {
  // Same charset as VerificationCodeVO for consistency
  private static readonly CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 6;

  generateVerificationCode(): string {
    const bytes = crypto.randomBytes(CryptoCodeGeneratorService.CODE_LENGTH);
    let code = '';

    for (let i = 0; i < CryptoCodeGeneratorService.CODE_LENGTH; i++) {
      const index = bytes[i] % CryptoCodeGeneratorService.CHARSET.length;
      code += CryptoCodeGeneratorService.CHARSET[index];
    }

    return code;
  }

  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 hex characters
  }

  hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
