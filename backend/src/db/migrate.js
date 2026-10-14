const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool(config.migrationMysql);

async function runMigrations() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  const migrationsDirectory = path.join(__dirname, 'migrations');
  const filenames = (await fs.readdir(migrationsDirectory))
    .filter(filename => /^\d+.*\.sql$/.test(filename))
    .sort();

  for (const filename of filenames) {
    const [rows] = await pool.execute(
      'SELECT filename FROM schema_migrations WHERE filename = ?',
      [filename]
    );
    if (rows.length > 0) continue;

    const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
    const statements = sql.split(';').map(statement => statement.trim()).filter(Boolean);
    const connection = await pool.getConnection();

    try {
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.execute(
        'INSERT INTO schema_migrations (filename) VALUES (?)',
        [filename]
      );
      console.log(`Applied migration ${filename}`);
    } finally {
      connection.release();
    }
  }
}

runMigrations()
  .catch(error => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());