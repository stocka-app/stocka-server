import { ApiProperty } from '@nestjs/swagger';

export class ConsentStatusItemDto {
  @ApiProperty({ example: 'privacy_policy', description: 'Type of consent' })
  consentType!: string;

  @ApiProperty({ example: true, description: 'Whether the user granted this consent' })
  granted!: boolean;

  @ApiProperty({ example: 'v1.0', description: 'Version of the document consented to' })
  documentVersion!: string;

  @ApiProperty({
    example: '2026-03-21T10:00:00.000Z',
    description: 'ISO 8601 timestamp of when the consent was recorded',
  })
  grantedAt!: string;
}

export class GetUserConsentsOutDto {
  @ApiProperty({ type: [ConsentStatusItemDto], description: 'Current consent status per type' })
  consents!: ConsentStatusItemDto[];
}
