import { APIInteraction } from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-api-types/v10';
import { createTournament, getTournamentById, registerPlayerForTournament, unregisterPlayerFromTournament } from '@/lib/db';

export async function handleTournamentCommand(interaction: APIInteraction) {
  if (interaction.type !== 2) return; // Not a command interaction

  const { data: command } = interaction;
  if (!command) return;

  try {
    switch (command.name) {
      case 'create-tournament': {
        const startTime = command.options?.find(opt => opt.name === 'start-time')?.value as string;
        const maxPlayers = (command.options?.find(opt => opt.name === 'max-players')?.value as number) || 100;
        const playersPerTable = (command.options?.find(opt => opt.name === 'players-per-table')?.value as number) || 6;
        const startingChips = (command.options?.find(opt => opt.name === 'starting-chips')?.value as number) || 10000;
        const blindRoundMinutes = (command.options?.find(opt => opt.name === 'blind-round-minutes')?.value as number) || 15;

        const tournament = await createTournament({
          start_time: new Date(startTime),
          max_players: maxPlayers,
          players_per_table: playersPerTable,
          starting_chips: startingChips,
          blind_round_minutes: blindRoundMinutes,
          status: 'pending',
          created_by: interaction.user.id
        });

        const tournamentUrl = `${process.env.NEXT_PUBLIC_APP_URL}/tournament/${tournament.id}`;
        
        return new Response(JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: `Tournament created! View details at: ${tournamentUrl}`,
            flags: 64 // Ephemeral flag
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      case 'register': {
        const tournamentId = command.options?.find(opt => opt.name === 'tournament-id')?.value as string;
        const tournament = await getTournamentById(tournamentId);

        if (!tournament) {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Tournament not found.',
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        const registered = await registerPlayerForTournament(
          tournamentId,
          interaction.user.id,
          interaction.user.username,
          interaction.user.avatar ? `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png` : undefined
        );

        if (registered) {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `You have been registered for the tournament! View details at: ${process.env.NEXT_PUBLIC_APP_URL}/tournament/${tournamentId}`,
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Failed to register for the tournament. You may already be registered or the tournament is full.',
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      case 'unregister': {
        const tournamentId = command.options?.find(opt => opt.name === 'tournament-id')?.value as string;
        const tournament = await getTournamentById(tournamentId);

        if (!tournament) {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Tournament not found.',
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        const unregistered = await unregisterPlayerFromTournament(tournamentId, interaction.user.id);

        if (unregistered) {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'You have been unregistered from the tournament.',
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: 'Failed to unregister from the tournament. You may not be registered.',
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      default:
        return new Response(JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'Unknown command.',
            flags: 64
          }
        }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error handling tournament command:', error);
    return new Response(JSON.stringify({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'An error occurred while processing your command.',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 