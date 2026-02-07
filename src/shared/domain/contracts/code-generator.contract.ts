export interface ICodeGeneratorContract {
  /**
   * Generates a 6-character alphanumeric verification code
   * Uses charset: A-Z (without O, I, L) + 2-9 = 32 characters
   * @returns A 6-character verification code string
   */
  generateVerificationCode(): string;

  /**
   * Generates a secure random token (64 hex characters)
   * Used for password reset links, magic links, etc.
   * @returns A 64-character hex token string
   */
  generateSecureToken(): string;

  /**
   * Creates a SHA256 hash of the provided code
   * Used to securely store verification codes and tokens
   * @param code The code to hash
   * @returns SHA256 hash as hex string
   */
  hashCode(code: string): string;
}
