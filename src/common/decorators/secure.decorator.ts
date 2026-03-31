import { SetMetadata } from '@nestjs/common';
import { SECURE_KEY } from '@common/security/security.types';

export const Secure = (): MethodDecorator => SetMetadata(SECURE_KEY, true);
