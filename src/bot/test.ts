import dotenv from 'dotenv';
import { initializeBot } from './discord';
import { initializeDatabase } from '../database/connection';
import { initializeSchema } from '../database/db';

dotenv.config();

async function testBot() {
  try {
    // Initialize database
    await initializeDatabase();
    console.log('Database connection established');

    // Initialize schema
    await initializeSchema();
    console.log('Database schema initialized');

    // Initialize bot
    const bot = await initializeBot();
    console.log('Bot initialized successfully');
    console.log('Bot username:', bot.user?.tag);
    console.log('Bot is ready to receive commands (!poker)');
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
}

testBot(); 