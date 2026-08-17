import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://relayforge:relayforge@localhost:5432/relayforge';

export default new DataSource(buildDataSourceOptions(databaseUrl));
