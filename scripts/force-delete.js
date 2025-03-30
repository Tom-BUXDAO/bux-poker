const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Delete all game states
    await prisma.$executeRaw`DELETE FROM "game_states"`;
    
    // Delete all player game states
    await prisma.$executeRaw`DELETE FROM "player_game_states"`;
    
    // Delete all tournament players
    await prisma.$executeRaw`DELETE FROM "tournament_players"`;
    
    // Delete all tables
    await prisma.$executeRaw`DELETE FROM "tables"`;
    
    // Delete all tournaments
    await prisma.$executeRaw`DELETE FROM "tournaments"`;
    
    console.log('Successfully deleted all tournament data');
  } catch (error) {
    console.error('Failed to delete tournament data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 