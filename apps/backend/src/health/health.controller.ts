import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

interface LivenessResponse {
  status: 'ok';
}

interface ReadinessResponse {
  status: 'ok';
  checks: { postgres: boolean; kafka: boolean };
}

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('live')
  live(): LivenessResponse {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<ReadinessResponse> {
    const [postgres, kafka] = await Promise.all([
      this.healthService.checkPostgres(),
      this.healthService.checkKafka(),
    ]);

    if (!postgres || !kafka) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { postgres, kafka },
      });
    }

    return { status: 'ok', checks: { postgres, kafka } };
  }
}
