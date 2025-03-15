import dotenv from 'dotenv';
import { startServer } from './server/app';
import { initializeBot } from './bot/discord';
import { initializeDatabase } from './database/connection';
import { initializeSchema } from './database/db';

dotenv.config();

async function main() {
  try {
    // Initialize database connection
    await initializeDatabase();
    console.log('Database connection established');

    // Initialize database schema
    await initializeSchema();
    console.log('Database schema initialized');

    // Start Express server
    const server = await startServer();
    console.log(`Server running on port ${process.env.PORT || 3000}`);

    // Initialize Discord bot
    await initializeBot();
    console.log('Discord bot initialized');
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

main();