import { config } from 'dotenv';
import { resolve } from 'path';
import { initializeDatabase } from '../database/connection';

// Load environment variables from root .env file
config({ path: resolve(__dirname, '../../.env') });

import { 
  Client, 
  GatewayIntentBits, 
  Events,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ButtonInteraction,
  TextChannel,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  Message,
  Interaction,
  StringSelectMenuInteraction
} from 'discord.js';
import { 
  createUser, 
  createTournament, 
  getTournamentById,
  registerPlayerForTournament,
  updateTournamentMessage,
  updateTournamentStatus,
  unregisterPlayerFromTournament,
  isRegistered
} from '../database/db';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Direct URL to the logo
const LOGO_URL = 'https://raw.githubusercontent.com/Tom-BUXDAO/bux-poker/main/assets/BUX_logo_small.png';

// Tournament creation options
const TOURNAMENT_OPTIONS = {
  playersPerTable: [6, 8],
  startingChips: [1000, 1500, 2000, 2500, 3000],
  blindLevels: Array.from({length: 15}, (_, i) => i + 1), // 1-15 minutes
  maxPlayers: [8, 16, 32, 64, 100]
};

// Track active tournament creations
const activeCreations = new Map();

function createDateOptions() {
  const options = [];
  const now = new Date();
  
  // Add next 14 days as options
  for (let i = 0; i < 14; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
    options.push(
      new StringSelectMenuOptionBuilder()
        .setLabel(date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }))
        .setValue(date.toISOString().split('T')[0])
    );
  }

  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('date')
        .setPlaceholder('Select tournament date')
        .addOptions(options)
    );

  return [row];
}

function createTimeOptions() {
  // Hours select (0-23)
  const hourRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('hour')
        .setPlaceholder('Select hour (00-23)')
        .addOptions(Array.from({length: 24}, (_, i) => 
          new StringSelectMenuOptionBuilder()
            .setLabel(i.toString().padStart(2, '0'))
            .setValue(i.toString())
        ))
    );

  // Minutes select (0-55, 5 min increments)
  const minuteRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('minute')
        .setPlaceholder('Select minute (00-55)')
        .addOptions(Array.from({length: 12}, (_, i) => 
          new StringSelectMenuOptionBuilder()
            .setLabel((i * 5).toString().padStart(2, '0'))
            .setValue((i * 5).toString())
        ))
    );

  return [hourRow, minuteRow];
}

function createOptionsMenu(type: string, options: number[], placeholder: string) {
  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(type)
        .setPlaceholder(placeholder)
        .addOptions(options.map(opt => 
          new StringSelectMenuOptionBuilder()
            .setLabel(opt.toString())
            .setValue(opt.toString())
        ))
    );

  return [row];
}

// Single event handler for messages
client.on(Events.MessageCreate, async (message: Message) => {
  if (message.author.bot || message.content.toLowerCase() !== '!poker') return;

  console.log('Received !poker command from', message.author.username);
  
  try {
    const userId = message.author.id;
    if (activeCreations.has(userId)) {
      await message.reply('You already have an active tournament creation in progress.');
      return;
    }

    activeCreations.set(userId, {
      step: 'date',
      channelId: message.channel.id
    });

    await message.reply({
      content: '**Select tournament date:**',
      components: createDateOptions()
    });

  } catch (error) {
    console.error('Error starting tournament creation:', error);
    await message.reply('An error occurred. Please try again.');
  }
});

// Interaction handler for select menus
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const selectInteraction = interaction as StringSelectMenuInteraction;
  const userId = selectInteraction.user.id;
  const creation = activeCreations.get(userId);
  if (!creation) return;

  try {
    switch (selectInteraction.customId) {
      case 'date': {
        creation.date = selectInteraction.values[0];
        creation.step = 'time';
        await selectInteraction.update({
          content: '**Select tournament time:**',
          components: createTimeOptions()
        });
        break;
      }
      case 'hour': {
        creation.hour = parseInt(selectInteraction.values[0]);
        if (!creation.minute) {
          await selectInteraction.update({
            content: '**Select minute:**',
            components: createTimeOptions().slice(1) // Show only minute selector
          });
        } else {
          creation.step = 'players';
          const date = new Date(`${creation.date}T${creation.hour.toString().padStart(2, '0')}:${creation.minute.toString().padStart(2, '0')}:00`);
          creation.startTime = date;
          await selectInteraction.update({
            content: '**Select players per table:**',
            components: createOptionsMenu('players', TOURNAMENT_OPTIONS.playersPerTable, 'Select players per table')
          });
        }
        break;
      }
      case 'minute': {
        creation.minute = parseInt(selectInteraction.values[0]);
        if (!creation.hour) {
          await selectInteraction.update({
            content: '**Select hour:**',
            components: createTimeOptions().slice(0, 1) // Show only hour selector
          });
        } else {
          creation.step = 'players';
          const date = new Date(`${creation.date}T${creation.hour.toString().padStart(2, '0')}:${creation.minute.toString().padStart(2, '0')}:00`);
          creation.startTime = date;
          await selectInteraction.update({
            content: '**Select players per table:**',
            components: createOptionsMenu('players', TOURNAMENT_OPTIONS.playersPerTable, 'Select players per table')
          });
        }
        break;
      }
      case 'players': {
        creation.playersPerTable = parseInt(selectInteraction.values[0]);
        creation.step = 'chips';
        await selectInteraction.update({
          content: '**Select starting chips:**',
          components: createOptionsMenu('chips', TOURNAMENT_OPTIONS.startingChips, 'Select starting chips')
        });
        break;
      }
      case 'chips': {
        creation.startingChips = parseInt(selectInteraction.values[0]);
        creation.step = 'blinds';
        await selectInteraction.update({
          content: '**Select blind level duration (minutes):**',
          components: createOptionsMenu('blinds', TOURNAMENT_OPTIONS.blindLevels, 'Select blind level duration')
        });
        break;
      }
      case 'blinds': {
        creation.blindLevels = parseInt(selectInteraction.values[0]);
        creation.step = 'maxPlayers';
        await selectInteraction.update({
          content: '**Select maximum number of players:**',
          components: createOptionsMenu('maxPlayers', TOURNAMENT_OPTIONS.maxPlayers, 'Select max players')
        });
        break;
      }
      case 'maxPlayers': {
        try {
          const maxPlayers = parseInt(selectInteraction.values[0]);
          
          // First acknowledge the interaction immediately
          await selectInteraction.update({
            content: 'Creating tournament...',
            components: []
          });

          const user = await createUser(userId, selectInteraction.user.username);
          
          const tournament = await createTournament(
            user.id,
            creation.startTime,
            creation.playersPerTable,
            creation.startingChips,
            creation.blindLevels,
            creation.channelId,
            maxPlayers
          );

          // Convert to Unix timestamp (in seconds)
          const unixTimestamp = Math.floor(creation.startTime.getTime() / 1000);
          
          const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎮 BUX Poker Tournament')
            .setThumbnail(LOGO_URL)
            .addFields(
              { 
                name: '📅 Start Time', 
                value: `<t:${unixTimestamp}:F>\n*Starts <t:${unixTimestamp}:R>*`,
                inline: false 
              },
              { 
                name: '👥 Players Registered', 
                value: '0', 
                inline: false 
              },
              { 
                name: '🎲 Players per Table', 
                value: creation.playersPerTable.toString(), 
                inline: false 
              },
              { 
                name: '💰 Starting Chips', 
                value: creation.startingChips.toLocaleString(), 
                inline: false 
              },
              { 
                name: '⏱️ Blind Levels', 
                value: `${creation.blindLevels} minutes`, 
                inline: false 
              }
            );

          const registerButton = new ButtonBuilder()
            .setCustomId(`register_${tournament.id}`)
            .setLabel('Register')
            .setStyle(ButtonStyle.Success);

          const lobbyButton = new ButtonBuilder()
            .setCustomId(`lobby_${tournament.id}`)
            .setLabel('Tournament Lobby')
            .setStyle(ButtonStyle.Primary);

          const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(registerButton, lobbyButton);

          // Send the tournament message
          if (selectInteraction.channel?.type === ChannelType.GuildText) {
            const channel = selectInteraction.channel as TextChannel;
            
            try {
              await channel.send({
                content: 'Tournament created! Players can now register:',
                embeds: [embed],
                components: [row]
              });
            } catch (error) {
              console.error('Error sending tournament message:', error);
              // Fallback without logo if there's an error
              await channel.send({
                content: 'Tournament created! Players can now register:',
                embeds: [embed.setThumbnail(null)],
                components: [row]
              });
            }
          }

          activeCreations.delete(userId);
        } catch (error) {
          console.error('Error in tournament creation:', error);
          if (!selectInteraction.replied) {
            await selectInteraction.followUp({
              content: 'An error occurred while creating the tournament. Please try again with !poker',
              ephemeral: true
            });
          }
          activeCreations.delete(userId);
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error in tournament creation:', error);
    await selectInteraction.update({
      content: 'An error occurred. Please try again with !poker',
      components: []
    });
    activeCreations.delete(userId);
  }
});

// Button interaction handler
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (!interaction.isButton()) return;

  try {
    const [action, tournamentId] = interaction.customId.split('_');
    const user = interaction.user;
    const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });

    if (action === 'register') {
      // Create or update user first
      const dbUser = await createUser(user.id, user.username, avatarUrl);
      
      // Then register for tournament using the UUID from the database
      await registerPlayerForTournament(tournamentId, dbUser.id, user.id);
      await interaction.reply({ content: 'You have been registered for the tournament!', ephemeral: true });
      
      // Update tournament message
      await updateTournamentMessage(tournamentId, interaction.message.id);
    } else if (action === 'unregister') {
      const success = await unregisterPlayerFromTournament(tournamentId, user.id);
      if (success) {
        await interaction.reply({ content: 'You have been unregistered from the tournament.', ephemeral: true });
        await updateTournamentMessage(tournamentId, interaction.message.id);
      } else {
        await interaction.reply({ content: 'You were not registered for this tournament.', ephemeral: true });
      }
    } else if (action === 'lobby') {
      const tournament = await getTournamentById(tournamentId);
      if (!tournament) {
        await interaction.reply({ content: 'Tournament not found.', ephemeral: true });
        return;
      }

      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Open Tournament Lobby')
            .setStyle(ButtonStyle.Link)
            .setURL(`http://localhost:3000/tournament/${tournamentId}`)
        );

      await interaction.reply({ 
        content: '🎮 Click below to view the tournament lobby:',
        components: [row],
        ephemeral: true 
      });
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
  }
});

export async function initializeBot() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set in environment variables');
  }

  try {
    // Initialize the database first
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize:', error);
    throw error;
  }
}

// Call initializeBot if this file is being run directly
if (require.main === module) {
  initializeBot().catch(error => {
    console.error('Failed to start bot:', error);
    process.exit(1);
  });
} 