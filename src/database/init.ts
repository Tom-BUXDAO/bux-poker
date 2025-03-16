import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeDatabase } from './connection';
import { initializeSchema } from './db';

// Load environment variables from root .env file
config({ path: resolve(__dirname, '../../.env') });

async function init() {
  try {
    await initializeDatabase();
    await initializeSchema();
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

init(); 