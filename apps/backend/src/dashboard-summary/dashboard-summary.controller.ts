import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { ProjectSummaryResponseDto } from './dto/project-summary-response.dto';
import { GetProjectSummaryQuery } from './queries/impl/get-project-summary.query';

@UseGuards(JwtAuthGuard)
@Controller()
export class DashboardSummaryController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('api/v1/projects/:projectId/summary')
  getSummary(
    @CurrentUser() user: UserEntity,
    @Param('projectId') projectId: string,
  ): Promise<ProjectSummaryResponseDto> {
    return this.queryBus.execute(
      new GetProjectSummaryQuery(user.id, projectId),
    );
  }
}
