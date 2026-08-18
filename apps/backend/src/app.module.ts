import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { buildDataSourceOptions } from './database/data-source-options';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { EndpointsModule } from './endpoints/endpoints.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { EventsModule } from './events/events.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { HealthModule } from './health/health.module';

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
    ProjectsModule,
    ApiKeysModule,
    EndpointsModule,
    SubscriptionsModule,
    EventsModule,
    DeliveriesModule,
    HealthModule,
  ],
})
export class AppModule {}
