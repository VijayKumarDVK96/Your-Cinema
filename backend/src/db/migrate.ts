import fs from 'fs';
import path from 'path';
import { pool, isPgConnected } from './index.js';
import { Logger } from '../utils/logger.js';

const migrationsDir = path.resolve(process.cwd(), 'src/db/migrations');

export async function runMigrations() {
  Logger.info('Checking database migrations...');
  if (!isPgConnected) {
    Logger.info('PostgreSQL is not connected. In-memory data store is active; skipping SQL migrations.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      Logger.warn(`Migrations directory ${migrationsDir} not found.`);
      await client.query('COMMIT');
      return;
    }

    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
      if (rows.length === 0) {
        Logger.info(`Applying migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        Logger.info(`Successfully applied migration: ${file}`);
      }
    }

    await client.query('COMMIT');
    Logger.info('Database migrations are up to date.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    Logger.error('Failed to run database migrations', err);
    throw err;
  } finally {
    client.release();
  }
}


