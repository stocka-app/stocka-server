import { Entity, Column, OneToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/infrastructure/base/base.entity';
import { CredentialAccountEntity } from '@user/account/infrastructure/entities/credential-account.entity';
import { SocialAccountEntity } from '@user/account/infrastructure/entities/social-account.entity';

@Entity('accounts')
export class AccountEntity extends BaseEntity {
  @Column({ name: 'user_id', type: 'int', unique: true })
  userId!: number;

  @OneToOne(() => CredentialAccountEntity, (credential) => credential.account)
  credentialAccount!: CredentialAccountEntity | null;

  @OneToMany(() => SocialAccountEntity, (social) => social.account)
  socialAccounts!: SocialAccountEntity[];
}
