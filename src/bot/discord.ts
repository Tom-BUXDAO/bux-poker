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
  ChannelType
} from 'discord.js';
import { 
  createUser, 
  createTournament, 
  getTournamentById,
  registerPlayerForTournament,
  updateTournamentMessage,
  updateTournamentStatus
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
  blindLevels: Array.from({length: 15}, (_, i) => i + 1) // 1-15 minutes
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
client.on(Events.MessageCreate, async (message) => {
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

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const userId = interaction.user.id;
  const creation = activeCreations.get(userId);
  if (!creation) return;

  try {
    switch (interaction.customId) {
      case 'date': {
        creation.date = interaction.values[0];
        creation.step = 'time';
        await interaction.update({
          content: '**Select tournament time:**',
          components: createTimeOptions()
        });
        break;
      }
      case 'hour': {
        creation.hour = parseInt(interaction.values[0]);
        if (!creation.minute) {
          await interaction.update({
            content: '**Select minute:**',
            components: createTimeOptions().slice(1) // Show only minute selector
          });
        } else {
          creation.step = 'players';
          const date = new Date(`${creation.date}T${creation.hour.toString().padStart(2, '0')}:${creation.minute.toString().padStart(2, '0')}:00`);
          creation.startTime = date;
          await interaction.update({
            content: '**Select players per table:**',
            components: createOptionsMenu('players', TOURNAMENT_OPTIONS.playersPerTable, 'Select players per table')
          });
        }
        break;
      }
      case 'minute': {
        creation.minute = parseInt(interaction.values[0]);
        if (!creation.hour) {
          await interaction.update({
            content: '**Select hour:**',
            components: createTimeOptions().slice(0, 1) // Show only hour selector
          });
        } else {
          creation.step = 'players';
          const date = new Date(`${creation.date}T${creation.hour.toString().padStart(2, '0')}:${creation.minute.toString().padStart(2, '0')}:00`);
          creation.startTime = date;
          await interaction.update({
            content: '**Select players per table:**',
            components: createOptionsMenu('players', TOURNAMENT_OPTIONS.playersPerTable, 'Select players per table')
          });
        }
        break;
      }
      case 'players': {
        creation.playersPerTable = parseInt(interaction.values[0]);
        creation.step = 'chips';
        await interaction.update({
          content: '**Select starting chips:**',
          components: createOptionsMenu('chips', TOURNAMENT_OPTIONS.startingChips, 'Select starting chips')
        });
        break;
      }
      case 'chips': {
        creation.startingChips = parseInt(interaction.values[0]);
        creation.step = 'blinds';
        await interaction.update({
          content: '**Select blind level duration (minutes):**',
          components: createOptionsMenu('blinds', TOURNAMENT_OPTIONS.blindLevels, 'Select blind level duration')
        });
        break;
      }
      case 'blinds': {
        try {
          const blinds = parseInt(interaction.values[0]);
          
          // First acknowledge the interaction immediately
          await interaction.update({
            content: 'Creating tournament...',
            components: []
          });

          const user = await createUser(userId, interaction.user.username);
          
          const tournament = await createTournament(
            user.id,
            creation.startTime,
            creation.playersPerTable,
            creation.startingChips,
            blinds,
            creation.channelId
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
                value: `${blinds} minutes`, 
                inline: false 
              }
            );

          const registerButton = new ButtonBuilder()
            .setCustomId(`register_${tournament.id}`)
            .setLabel('Register')
            .setStyle(ButtonStyle.Success);

          const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
            .addComponents(registerButton);

          // Send the tournament message
          if (interaction.channel?.type === ChannelType.GuildText) {
            const channel = interaction.channel as TextChannel;
            
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
          if (!interaction.replied) {
            await interaction.followUp({
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
    await interaction.update({
      content: 'An error occurred. Please try again with !poker',
      components: []
    });
    activeCreations.delete(userId);
  }
});

// Button interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  
  const [action, tournamentId] = interaction.customId.split('_');
  if (action !== 'register') return;

  try {
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      await interaction.reply({ 
        content: 'Tournament not found.', 
        ephemeral: true 
      });
      return;
    }

    const discordId = interaction.user.id;
    const user = await createUser(discordId, interaction.user.username);
    
    const result = await registerPlayerForTournament(tournamentId, user.id, discordId);
    if (!result) {
      await interaction.reply({ 
        content: 'You are already registered for this tournament.', 
        ephemeral: true 
      });
      return;
    }

    // Get updated tournament info
    const updatedTournament = await getTournamentById(tournamentId);
    const registeredPlayers = updatedTournament.registered_players || 0;

    // Update the tournament message with new player count
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
    const playerField = embed.data.fields?.find(f => f.name === '👥 Players Registered');
    if (playerField) {
      playerField.value = registeredPlayers.toString();
    }

    // Keep the register button
    const registerButton = new ButtonBuilder()
      .setCustomId(`register_${tournamentId}`)
      .setLabel('Register')
      .setStyle(ButtonStyle.Success);

    const newRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(registerButton);

    try {
      // Preserve the existing thumbnail URL
      await interaction.update({
        embeds: [embed],
        components: [newRow]
      });
    } catch (error) {
      console.error('Error updating tournament message:', error);
      await interaction.update({
        embeds: [embed.setThumbnail(null)],
        components: [newRow]
      });
    }

    await interaction.followUp({ 
      content: 'Successfully registered for tournament!', 
      ephemeral: true 
    });

  } catch (error) {
    console.error('Error handling registration:', error);
    await interaction.reply({ 
      content: 'An error occurred while registering. Please try again.', 
      ephemeral: true 
    });
  }
});

export async function initializeBot() {
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('DISCORD_TOKEN is not set in environment variables');
  }

  try {
    await client.login(process.env.DISCORD_TOKEN);
    console.log('Bot initialized successfully');
    return client;
  } catch (error) {
    console.error('Failed to initialize bot:', error);
    throw error;
  }
} 