import { Client, Events, GatewayIntentBits, Interaction } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isCommand()) return;

  try {
    // Handle commands through a separate command handler
    const commandName = interaction.commandName;
    switch (commandName) {
      case 'ping':
        await interaction.reply('Pong!');
        break;
      default:
        await interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});

export default client; 