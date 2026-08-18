import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EndpointsController } from './endpoints.controller';
import { EndpointEntity } from './entities/endpoint.entity';
import { EndpointsRepository } from './repositories/endpoints.repository';
import { EndpointUrlValidatorService } from './services/endpoint-url-validator.service';
import { EndpointAuthorizationService } from './services/endpoint-authorization.service';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectsModule } from '../projects/projects.module';
import { RegisterEndpointHandler } from './commands/handlers/register-endpoint.handler';
import { UpdateEndpointHandler } from './commands/handlers/update-endpoint.handler';
import { EnableEndpointHandler } from './commands/handlers/enable-endpoint.handler';
import { DisableEndpointHandler } from './commands/handlers/disable-endpoint.handler';
import { DeleteEndpointHandler } from './commands/handlers/delete-endpoint.handler';
import { GetEndpointsHandler } from './queries/handlers/get-endpoints.handler';
import { GetEndpointHandler } from './queries/handlers/get-endpoint.handler';
import { GetEndpointsLookupHandler } from './queries/handlers/get-endpoints-lookup.handler';

const commandHandlers = [
  RegisterEndpointHandler,
  UpdateEndpointHandler,
  EnableEndpointHandler,
  DisableEndpointHandler,
  DeleteEndpointHandler,
];
const queryHandlers = [
  GetEndpointsHandler,
  GetEndpointHandler,
  GetEndpointsLookupHandler,
];

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    WorkspacesModule,
    ProjectsModule,
    TypeOrmModule.forFeature([EndpointEntity]),
  ],
  controllers: [EndpointsController],
  providers: [
    EndpointsRepository,
    EndpointUrlValidatorService,
    EndpointAuthorizationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [EndpointsRepository, EndpointAuthorizationService],
})
export class EndpointsModule {}
