import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class InvitationTokenVO extends StringVO {
  private static readonly MAX_LENGTH = 255;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): InvitationTokenVO {
    return new InvitationTokenVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Invitation token cannot be empty');
    }
    if (this.value.length > InvitationTokenVO.MAX_LENGTH) {
      throw new Error(`Invitation token cannot exceed ${InvitationTokenVO.MAX_LENGTH} characters`);
    }
  }
}
