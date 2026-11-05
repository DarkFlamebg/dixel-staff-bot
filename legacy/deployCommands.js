// deployCommands.js
//
// Registra (o actualiza) el comando /duda en tu servidor de Discord.
// Corre esto una vez despues de crear/modificar el comando.
//
//   node deployCommands.js

import { REST, Routes } from 'discord.js';
import * as dudaCommand from './commands/duda.js';

const commands = [dudaCommand.data.toJSON()];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registrando comandos...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log('Comandos registrados correctamente.');
} catch (error) {
  console.error(error);
}
