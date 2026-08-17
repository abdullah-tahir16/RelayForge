export interface AppConfig {
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    accessExpiresIn: string;
    refreshExpiresDays: number;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url:
      process.env.DATABASE_URL ??
      'postgres://relayforge:relayforge@localhost:5432/relayforge',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresDays: parseInt(
      process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30',
      10,
    ),
  },
});
