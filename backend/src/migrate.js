import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { query } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runMigrations() {
  try {
    console.log('Running database migrations...');

    await query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const migrationFile = '001_init.sql';
    const result = await query('SELECT filename FROM migrations WHERE filename = $1', [migrationFile]);

    if (result.rows.length > 0) {
      console.log(`Migration ${migrationFile} already applied, skipping`);
      return;
    }

    const migrationPath = join(__dirname, '../migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log(`Applying migration: ${migrationFile}`);
    await query(migrationSQL);

    await query('INSERT INTO migrations (filename) VALUES ($1)', [migrationFile]);

    console.log(`Migration ${migrationFile} applied successfully`);
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}
