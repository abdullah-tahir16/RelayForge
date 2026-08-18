import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class PgPoolService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor(configService: ConfigService) {
    this.pool = new Pool({
      connectionString: configService.get<string>('database.url'),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
