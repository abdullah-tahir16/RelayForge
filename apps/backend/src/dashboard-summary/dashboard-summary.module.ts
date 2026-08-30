import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardSummaryController } from './dashboard-summary.controller';
import { EventEntity } from '../events/entities/event.entity';
import { EndpointEntity } from '../endpoints/entities/endpoint.entity';
import { DeliveryEntity } from '../deliveries/entities/delivery.entity';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { GetProjectSummaryHandler } from './queries/handlers/get-project-summary.handler';

@Module({
  imports: [
    CqrsModule,
    PassportModule,
    ProjectsModule,
    WorkspacesModule,
    TypeOrmModule.forFeature([EventEntity, EndpointEntity, DeliveryEntity]),
  ],
  controllers: [DashboardSummaryController],
  providers: [GetProjectSummaryHandler],
})
export class DashboardSummaryModule {}
