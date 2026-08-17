import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeyEntity } from './entities/api-key.entity';
import { ApiKeysRepository } from './repositories/api-keys.repository';
import { ApiKeyGeneratorService } from './services/api-key-generator.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectsModule } from '../projects/projects.module';
import { GenerateApiKeyHandler } from './commands/handlers/generate-api-key.handler';
import { RevokeApiKeyHandler } from './commands/handlers/revoke-api-key.handler';
import { GetApiKeysHandler } from './queries/handlers/get-api-keys.handler';

const commandHandlers = [GenerateApiKeyHandler, RevokeApiKeyHandler];
const queryHandlers = [GetApiKeysHandler];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    WorkspacesModule,
    ProjectsModule,
    TypeOrmModule.forFeature([ApiKeyEntity]),
  ],
  controllers: [ApiKeysController],
  providers: [
    ApiKeysRepository,
    ApiKeyGeneratorService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class ApiKeysModule {}
