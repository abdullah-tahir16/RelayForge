import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { buildDataSourceOptions } from './database/data-source-options';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        buildDataSourceOptions(
          configService.get<string>(
            'database.url',
            'postgres://relayforge:relayforge@localhost:5432/relayforge',
          ),
        ),
    }),
    AuthModule,
  ],
})
export class AppModule {}
