const { PrismaClient, TournamentStatus, TableStatus } = require('@prisma/client');
const prisma = new PrismaClient();

const TOURNAMENT_ID = 'dev-tournament'; // Match the UI's expected path
const TABLE_ID = 'dev-tournament'; // Use same ID for table to keep it consistent

async function main() {
  try {
    console.log('Checking existing tournament...');
    const existingTournament = await prisma.tournament.findFirst({
      where: {
        id: TOURNAMENT_ID
      },
      include: {
        tables: true
      }
    });

    if (existingTournament) {
      console.log('Current tournament status:', existingTournament.status);
      console.log('Current tournament startTime:', existingTournament.startTime);
      
      console.log('Deleting existing tournament data...');
      
      // Delete all game states and player states first
      await prisma.gameState.deleteMany({
        where: {
          tableId: TABLE_ID
        }
      });

      await prisma.playerGameState.deleteMany({
        where: {
          tableId: TABLE_ID
        }
      });

      // Delete tournament players
      await prisma.tournamentPlayer.deleteMany({
        where: {
          tournamentId: TOURNAMENT_ID
        }
      });

      // Delete tables
      await prisma.table.deleteMany({
        where: {
          tournamentId: TOURNAMENT_ID
        }
      });

      // Now delete tournament
      await prisma.tournament.delete({
        where: {
          id: TOURNAMENT_ID
        }
      });

      console.log('Successfully deleted existing tournament data');
    }

    const startTime = new Date();
    startTime.setSeconds(0, 0); // Reset seconds and milliseconds

    console.log('Creating new tournament...');
    // Create fresh tournament
    const tournament = await prisma.tournament.create({
      data: {
        id: TOURNAMENT_ID,
        name: 'Test Tournament',
        status: TournamentStatus.SCHEDULED,
        maxPlayers: 8,
        startTime: startTime,
        createdById: 'system',
        tables: {
          create: {
            id: TABLE_ID,
            status: TableStatus.ACTIVE,
            smallBlind: 10,
            bigBlind: 20,
            currentRound: 1
          }
        }
      },
      include: {
        tables: true
      }
    });

    console.log('Tournament reset successfully:', tournament);
    console.log('New tournament status:', tournament.status);
    console.log('New tournament startTime:', tournament.startTime);
  } catch (error) {
    console.error('Failed to reset tournament:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();