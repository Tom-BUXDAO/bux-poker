import { APIChatInputApplicationCommandInteraction, APIApplicationCommandInteractionDataOption, ApplicationCommandOptionType, APIApplicationCommandInteractionDataStringOption, APIApplicationCommandInteractionDataIntegerOption, APIApplicationCommandInteractionDataNumberOption, APIApplicationCommandInteractionDataBooleanOption } from 'discord-api-types/v10';
import { InteractionResponseType } from 'discord-api-types/v10';
import { createTournament, getTournamentById, registerPlayerForTournament, unregisterPlayerFromTournament } from '@/lib/db';

function getOptionValue(options: APIApplicationCommandInteractionDataOption[] | undefined, name: string): any {
  const option = options?.find(opt => opt.name === name);
  if (!option) return undefined;
  
  switch (option.type) {
    case ApplicationCommandOptionType.String:
      return (option as APIApplicationCommandInteractionDataStringOption).value;
    case ApplicationCommandOptionType.Integer:
      return (option as APIApplicationCommandInteractionDataIntegerOption).value;
    case ApplicationCommandOptionType.Number:
      return (option as APIApplicationCommandInteractionDataNumberOption).value;
    case ApplicationCommandOptionType.Boolean:
      return (option as APIApplicationCommandInteractionDataBooleanOption).value;
    default:
      return undefined;
  }
}

export async function handleTournamentCommand(interaction: APIChatInputApplicationCommandInteraction) {
  if (interaction.type !== 2) return; // Not a command interaction

  const { data: command } = interaction;
  if (!command) return;

  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Could not determine user ID.',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    switch (command.name) {
      case 'create-tournament': {
        const startTime = getOptionValue(command.options, 'start-time') as string;
        const maxPlayers = (getOptionValue(command.options, 'max-players') as number) || 100;
        const playersPerTable = (getOptionValue(command.options, 'players-per-table') as number) || 6;
        const startingChips = (getOptionValue(command.options, 'starting-chips') as number) || 10000;
        const blindRoundMinutes = (getOptionValue(command.options, 'blind-round-minutes') as number) || 15;

        const tournament = await createTournament({
          start_time: new Date(startTime),
          max_players: maxPlayers,
          players_per_table: playersPerTable,
          starting_chips: startingChips,
          blind_round_minutes: blindRoundMinutes,
          status: 'pending',
          created_by: userId
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
        const tournamentId = getOptionValue(command.options, 'tournament-id') as string;
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
          userId,
          interaction.user.username,
          interaction.user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${interaction.user.avatar}.png` : undefined
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
        const tournamentId = getOptionValue(command.options, 'tournament-id') as string;
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

        const unregistered = await unregisterPlayerFromTournament(tournamentId, userId);

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