// index.example.js
//
// Ejemplo minimo de como enganchar faqEngine + comando /duda dentro del
// arranque de "Raquel Staff". Adapta esto a la estructura real de tu bot
// (probablemente ya tienes un loader de comandos, un client, etc).

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { initFaqEngine } from './faqEngine.js';
import * as dudaCommand from './commands/duda.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  console.log(`Conectado como ${client.user.tag}`);

  // Genera (o reutiliza) los embeddings ANTES de aceptar comandos,
  // asi la primera consulta de un usuario no tiene que esperar.
  await initFaqEngine();
  console.log('Motor de FAQ listo.');
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'duda') {
    await dudaCommand.execute(interaction);
  }
});

client.login(process.env.DISCORD_TOKEN);
