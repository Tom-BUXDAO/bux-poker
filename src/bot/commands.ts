import { Message } from 'discord.js';
import { createTournament, registerPlayerForTournament, getTournamentById, getActiveTournaments } from '../database/db';

export async function handleTournamentCreate(message: Message, args: string[]) {
  try {
    // Expected format: !poker create "Tournament Name" buyIn startingChips maxPlayers smallBlind bigBlind
    const tournamentName = args[0]?.replace(/"/g, '');
    const buyIn = parseInt(args[1] || '100');
    const startingChips = parseInt(args[2] || '1000');
    const maxPlayers = parseInt(args[3] || '9');
    const smallBlind = parseInt(args[4] || '10');
    const bigBlind = parseInt(args[5] || '20');

    if (!tournamentName) {
      return message.reply('Please provide a tournament name: !poker create "Tournament Name" [buyIn] [startingChips] [maxPlayers] [smallBlind] [bigBlind]');
    }

    const tournament = await createTournament(
      tournamentName,
      message.author.id,
      buyIn,
      startingChips,
      maxPlayers,
      smallBlind,
      bigBlind
    );

    return message.reply(`
Tournament created successfully!
🏆 Name: ${tournament.name}
💰 Buy-in: ${tournament.buy_in} chips
🎮 Starting chips: ${tournament.starting_chips}
👥 Max players: ${tournament.max_players}
🔄 Blinds: ${tournament.small_blind}/${tournament.big_blind}

Use !poker join ${tournament.id} to join this tournament!
    `);
  } catch (error) {
    console.error('Error creating tournament:', error);
    return message.reply('Failed to create tournament. Please try again.');
  }
}

export async function handleTournamentJoin(message: Message, args: string[]) {
  try {
    const tournamentId = args[0];
    if (!tournamentId) {
      return message.reply('Please provide a tournament ID: !poker join <tournament_id>');
    }

    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return message.reply('Tournament not found.');
    }

    if (tournament.status !== 'PENDING') {
      return message.reply('This tournament has already started or ended.');
    }

    const registration = await registerPlayerForTournament(tournamentId, message.author.id);
    return message.reply(`You have successfully registered for ${tournament.name}!`);
  } catch (error) {
    console.error('Error joining tournament:', error);
    return message.reply('Failed to join tournament. Please try again.');
  }
}

export async function handleTournamentStatus(message: Message, args: string[]) {
  try {
    const tournamentId = args[0];
    if (tournamentId) {
      // Show specific tournament status
      const tournament = await getTournamentById(tournamentId);
      if (!tournament) {
        return message.reply('Tournament not found.');
      }

      const playerList = tournament.players
        .map((p: any) => `${p.username} - ${p.chips_remaining || tournament.starting_chips} chips`)
        .join('\n');

      return message.reply(`
Tournament: ${tournament.name}
Status: ${tournament.status}
Players: ${tournament.registered_players}/${tournament.max_players}
Current Blinds: ${tournament.small_blind}/${tournament.big_blind}

Players List:
${playerList}
      `);
    } else {
      // Show list of active tournaments
      const tournaments = await getActiveTournaments();
      if (tournaments.length === 0) {
        return message.reply('No active tournaments found. Create one with !poker create "Tournament Name"');
      }

      const tournamentList = tournaments
        .map(t => `ID: ${t.id}\nName: ${t.name}\nPlayers: ${t.registered_players}/${t.max_players}\nBuy-in: ${t.buy_in}\nStatus: ${t.status}\n`)
        .join('\n');

      return message.reply(`
Active Tournaments:
${tournamentList}
      `);
    }
  } catch (error) {
    console.error('Error getting tournament status:', error);
    return message.reply('Failed to get tournament status. Please try again.');
  }
} 