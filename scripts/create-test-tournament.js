const { PrismaClient, TournamentStatus, TableStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tournament = await prisma.tournament.create({
      data: {
        id: 'dev-tournament',
        name: 'Test Tournament',
        status: 'IN_PROGRESS',
        maxPlayers: 8,
        startTime: new Date(),
        createdById: 'system',
        tables: {
          create: {
            id: 'dev-tournament',
            status: 'ACTIVE',
            smallBlind: 10,
            bigBlind: 20,
            currentRound: 1
          }
        }
      },
      include: { tables: true }
    });

    console.log('Test tournament created:', tournament);

    // Create test player states
    const playerStates = await prisma.playerGameState.createMany({
      data: [
        {
          tableId: 'dev-tournament',
          playerId: 'alice',
          position: 1,
          chips: 1000,
          isActive: true
        },
        {
          tableId: 'dev-tournament',
          playerId: 'bob',
          position: 2,
          chips: 1000,
          isActive: true
        }
      ]
    });
  } catch (error) {
    console.error('Failed to create test tournament:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 