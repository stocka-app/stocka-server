import { StringVO } from '@shared/domain/value-objects/primitive/string.vo';

export class InvitationCodeVO extends StringVO {
  private static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
    this.ensureValid();
  }

  static create(value: string): InvitationCodeVO {
    return new InvitationCodeVO(value.trim());
  }

  protected ensureValid(): void {
    if (this.value.length === 0) {
      throw new Error('Invitation code cannot be empty');
    }
    if (this.value.length > InvitationCodeVO.MAX_LENGTH) {
      throw new Error(`Invitation code cannot exceed ${InvitationCodeVO.MAX_LENGTH} characters`);
    }
  }
}
