#!/usr/bin/env tsx
import dotenv from 'dotenv';
import path from 'path';
import { PostgresDatabase, buildPostgresConfigFromEnv } from '../server/db/postgres.ts';
import { JsonToDatabaseMigrator } from '../server/db/migrator.ts';

dotenv.config();

async function main() {
  console.log('====================================================');
  console.log(' CareerSupport: JSON to PostgreSQL Data Migrator');
  console.log('====================================================\n');

  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sourcePathArg = args.find(a => a.startsWith('--source='));
  const sourceFile = sourcePathArg ? sourcePathArg.split('=')[1] : path.resolve(process.cwd(), 'data/careersupport_db.json');

  if (dryRun) {
    console.log(' Mode: DRY RUN (Validating records without writing to database)\n');
  }

  const pgConfig = buildPostgresConfigFromEnv();
  const targetDesc = pgConfig.connectionString
    ? `PostgreSQL URL (${pgConfig.connectionString.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@')})`
    : `PostgreSQL ${pgConfig.user}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}`;

  console.log(`Source File: ${sourceFile}`);
  console.log(`Target DB:   ${targetDesc}\n`);

  try {
    const pgDb = new PostgresDatabase(pgConfig);
    console.log('Connecting to target PostgreSQL database...');
    await pgDb.init();
    console.log('Connected successfully. Database tables verified.\n');

    console.log('Starting migration pass...');
    const report = await JsonToDatabaseMigrator.runMigration({
      sourceFilePath: sourceFile,
      targetDb: pgDb,
      dryRun,
    });

    console.log('\n----------------- MIGRATION RESULTS -----------------');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Status:    ${report.success ? 'SUCCESS' : 'COMPLETED WITH WARNINGS'}`);
    console.log('-----------------------------------------------------');
    console.table(report.counts);

    if (report.errors.length > 0) {
      console.log('\nWarnings / Issues encountered:');
      report.errors.forEach(err => console.warn(` - ${err}`));
    } else {
      console.log('\nAll entities migrated cleanly with zero errors.');
    }

    console.log(`\nNote: Source file at "${sourceFile}" was preserved intact and NOT deleted.`);
    console.log('====================================================\n');

    await pgDb.close();
    process.exit(report.success ? 0 : 1);
  } catch (err: any) {
    console.error('\n[Fatal Migration Error]:', err.message);
    process.exit(1);
  }
}

main();
