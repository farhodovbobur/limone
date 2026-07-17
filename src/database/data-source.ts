import 'dotenv/config';
import { existsSync } from 'fs';
import { DataSource } from 'typeorm';

// CLI entry point (migration:generate / run / revert). Works from BOTH sides:
// - container: compose injects .env (dotenv is a no-op, it never overrides);
//   DB_HOST=postgres resolves via Docker DNS.
// - Mac/host: dotenv loads .env; "postgres" doesn't resolve here, so we swap
//   to localhost (the published port). /.dockerenv exists only in containers.
const inContainer = existsSync('/.dockerenv');

if (!process.env.DB_PASSWORD) {
  throw new Error('DB env not found — is .env present at the project root?');
}
export default new DataSource({
  type: 'postgres',
  host: inContainer ? process.env.DB_HOST : 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
