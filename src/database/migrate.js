const fs = require('fs');
const path = require('path');
const db = require('./db.js');

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrations = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
  const applied = await db.query('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.rows.map(row => row.version));

  for (const file of migrations) {
    if (appliedVersions.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await db.transaction(async client => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
    });
    console.log(`Applied migration ${file}`);
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => db.close())
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { runMigrations };
