if (!process.env.DATABASE_URL_TEST) {
  console.log('DATABASE_URL_TEST is not configured; PostgreSQL integration test skipped.');
  process.exit(0);
}

process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
const db = require('./src/database/db.js');

async function run() {
  await db.health();
  await db.transaction(async client => {
    const result = await client.query('SELECT 1 AS healthy');
    if (result.rows[0].healthy !== 1) throw new Error('PostgreSQL health query failed.');
    throw new Error('__ROLLBACK_TEST__');
  }).catch(error => {
    if (error.message !== '__ROLLBACK_TEST__') throw error;
  });
  console.log('PostgreSQL integration connection test passed.');
  await db.close();
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
