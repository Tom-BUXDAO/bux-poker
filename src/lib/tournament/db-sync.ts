import prisma from '@/lib/db/client';
import { TournamentStatus, TableStatus, Prisma } from '@prisma/client';
import type { GameState, Player } from '@/types/poker';

export async function syncTestTournament() {
  try {
    // First try to find existing tournament
    const existingTournament = await prisma.tournament.findUnique({
      where: { id: 'dev-tournament' },
      include: { tables: true }
    });

    if (existingTournament) {
      // Just update the table if tournament exists
      const table = await prisma.table.upsert({
        where: { id: 'dev-tournament' },
        create: {
          id: 'dev-tournament',
          status: TableStatus.ACTIVE,
          smallBlind: 10,
          bigBlind: 20,
          currentRound: 1,
          tournamentId: 'dev-tournament'
        },
        update: {
          status: TableStatus.ACTIVE,
          smallBlind: 10,
          bigBlind: 20
        }
      });

      return {
        ...existingTournament,
        tables: [table]
      };
    } else {
      // Create new tournament
      const tournament = await prisma.tournament.create({
        data: {
          id: 'dev-tournament',
          name: 'Test Tournament',
          status: TournamentStatus.IN_PROGRESS,
          maxPlayers: 8,
          startTime: new Date(),
          createdById: 'system',
          tables: {
            create: {
              id: 'dev-tournament',
              status: TableStatus.ACTIVE,
              smallBlind: 10,
              bigBlind: 20,
              currentRound: 1
            }
          }
        },
        include: { tables: true }
      });

      return tournament;
    }
  } catch (error) {
    console.error('Error syncing tournament:', error);
    
    // Try to ensure the table exists even if tournament sync fails
    try {
      const table = await prisma.table.upsert({
        where: { id: 'dev-tournament' },
        create: {
          id: 'dev-tournament',
          status: TableStatus.ACTIVE,
          smallBlind: 10,
          bigBlind: 20,
          currentRound: 1,
          tournamentId: 'dev-tournament'
        },
        update: {
          status: TableStatus.ACTIVE,
          smallBlind: 10,
          bigBlind: 20
        }
      });

      return { id: 'dev-tournament', tables: [table] };
    } catch (tableError) {
      console.error('Failed to ensure table exists:', tableError);
      // Return a minimal tournament object to prevent further errors
      return { 
        id: 'dev-tournament',
        tables: [{
          id: 'dev-tournament',
          status: TableStatus.ACTIVE,
          smallBlind: 10,
          bigBlind: 20,
          currentRound: 1,
          tournamentId: 'dev-tournament'
        }]
      };
    }
  }
}

function serializeCards(cards: any[] | undefined): Prisma.InputJsonValue | { set: null } {
  if (!cards) return { set: null };
  return { set: cards.map(card => ({ rank: card.rank, suit: card.suit })) };
}

export async function syncGameState(tableId: string, gameState: GameState) {
  // First sync the game state
  await prisma.gameState.upsert({
    where: { tableId },
    create: {
      tableId,
      currentHand: { set: null },
      deck: serializeCards(gameState.deck),
      pot: gameState.pot,
      communityCards: serializeCards(gameState.communityCards),
      currentPosition: gameState.currentPosition
    },
    update: {
      deck: serializeCards(gameState.deck),
      pot: gameState.pot,
      communityCards: serializeCards(gameState.communityCards),
      currentPosition: gameState.currentPosition
    }
  });

  // Then sync each player's state separately
  const playersWithPositions = gameState.players.filter(p => typeof p.position === 'number');
  
  for (const player of playersWithPositions) {
    await syncPlayerState(tableId, player);
  }
}

export async function syncPlayerState(tableId: string, player: Player) {
  // Skip sync if position is not assigned yet
  if (typeof player.position !== 'number') {
    console.log(`Skipping sync for player ${player.id} - position not assigned yet`);
    return;
  }

  try {
    // First ensure the player exists in the database
    await prisma.player.upsert({
      where: { id: player.id },
      create: {
        id: player.id,
        discordId: `temp-${player.id}`, // Temporary discord ID for development
        discordUsername: player.name,
        avatarUrl: null
      },
      update: {} // No updates needed
    });

    // Then update player state in database
    await prisma.playerGameState.upsert({
      where: {
        tableId_playerId: {
          tableId,
          playerId: player.id
        }
      },
      create: {
        tableId,
        playerId: player.id,
        position: player.position,
        chips: player.chips,
        cards: serializeCards(player.cards),
        isActive: player.isActive ?? true,
        lastAction: null,
        lastActionTime: null
      },
      update: {
        position: player.position,
        chips: player.chips,
        cards: serializeCards(player.cards),
        isActive: player.isActive ?? true,
        lastAction: null,
        lastActionTime: null
      }
    });
  } catch (error) {
    console.error('Failed to sync player state:', error);
    throw error;
  }
} 