import { REST, Routes, Collection, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('create-tournament')
    .setDescription('Create a new poker tournament')
    .addStringOption(option =>
      option
        .setName('name')
        .setDescription('The name of the tournament')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('max-players')
        .setDescription('Maximum number of players')
        .setRequired(true)
        .setMinValue(2)
        .setMaxValue(100)
    )
    .addStringOption(option =>
      option
        .setName('start-time')
        .setDescription('When the tournament starts (ISO string)')
        .setRequired(true)
    ),
];

export async function registerCommands() {
  const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!),
      { body: commands }
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
}

// Command handlers
export const commandHandlers = new Collection();

commandHandlers.set('create-tournament', {
  async execute(interaction: any) {
    // Check if user has admin role
    if (!interaction.member.permissions.has('ADMINISTRATOR')) {
      return interaction.reply({
        content: 'You need to be an administrator to create tournaments.',
        ephemeral: true,
      });
    }

    const name = interaction.options.getString('name');
    const maxPlayers = interaction.options.getInteger('max-players');
    const startTime = new Date(interaction.options.getString('start-time'));

    // TODO: Create tournament in database
    
    await interaction.reply({
      content: `Tournament "${name}" created! Starting at ${startTime.toLocaleString()} with max ${maxPlayers} players.`,
      ephemeral: false,
    });
  },
}); 