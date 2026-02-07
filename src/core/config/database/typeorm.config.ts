import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get<string>('database.host'),
    port: configService.get<number>('database.port'),
    username: configService.get<string>('database.username'),
    password: configService.get<string>('database.password'),
    database: configService.get<string>('database.database'),
    entities: [__dirname + '/../../../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../../infrastructure/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: configService.get<string>('NODE_ENV') === 'development',
  }),
  inject: [ConfigService],
};
