import { verifyKey } from 'discord-interactions';
import { handleTournamentCommand } from '@/lib/discord/commands';
import { InteractionType, InteractionResponseType } from 'discord-api-types/v10';

// Handle Discord interactions
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  
  if (!signature || !timestamp) {
    return new Response('Missing signature or timestamp', { status: 401 });
  }

  const isValidRequest = verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY!
  );

  if (!isValidRequest) {
    return new Response('Invalid signature', { status: 401 });
  }

  const interaction = JSON.parse(body);

  // Handle ping from Discord (required for setting up interactions)
  if (interaction.type === InteractionType.Ping) {
    return new Response(JSON.stringify({ type: InteractionResponseType.Pong }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle commands
  if (interaction.type === InteractionType.ApplicationCommand) {
    try {
      return await handleTournamentCommand(interaction);
    } catch (error) {
      console.error('Error handling command:', error);
      return new Response(
        JSON.stringify({
          type: InteractionResponseType.ChannelMessageWithSource,
          data: {
            content: 'An error occurred while processing your command.',
            flags: 64, // Ephemeral flag
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Unknown interaction type', { status: 400 });
}

// This endpoint will be pinged by an external service to keep the bot alive
export async function GET() {
  return new Response('Bot is running', { status: 200 });
} 