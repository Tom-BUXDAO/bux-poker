import dotenv from 'dotenv';
import { startServer } from './server/app';
import { initializeBot } from './bot/discord';

dotenv.config();

async function main() {
  try {
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