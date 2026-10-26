// Loads the sample catalogue into the local database. Run: pnpm db:seed
import { createDatabase } from '@edulaunch/nest-kit';
import { env } from '../config.js';
import * as schema from '../infrastructure/db/schema.js';
import { CatalogueSeeder } from './catalogue-seeder.js';
import { sampleCatalogue } from './sample-catalogue.js';

if (env.NODE_ENV === 'production') {
  console.error('Refusing to load sample data into production.');
  process.exit(1);
}

const { db, close } = createDatabase(env.DATABASE_URL, schema);
try {
  const summary = await new CatalogueSeeder(db).run(sampleCatalogue);
  console.log('Sample catalogue loaded:');
  for (const [table, count] of Object.entries(summary)) console.log(`  ${table.padEnd(15)} ${count}`);
} finally {
  await close();
}
