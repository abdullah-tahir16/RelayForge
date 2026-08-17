import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../auth/entities/user.entity';
import { WorkspaceEntity } from '../auth/entities/workspace.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

export function buildDataSourceOptions(databaseUrl: string): DataSourceOptions {
  return {
    type: 'postgres',
    url: databaseUrl,
    entities: [UserEntity, WorkspaceEntity, RefreshTokenEntity],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
  };
}
