// scripts/deployCommands.js
//
// Registra (o actualiza) los comandos /duda, /apelacion y /apelaciones en tu servidor de Discord.
// Correr esto una vez después de crear o modificar un comando.
//
//   npm run deploy-commands

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import * as dudaCommand from '../src/commands/duda.js';
import * as apelacionCommand from '../src/commands/apelacion.js';
import * as apelacionesCommand from '../src/commands/apelaciones.js';

const commands = [dudaCommand, apelacionCommand, apelacionesCommand].map((c) => c.data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log('Registrando comandos slash...');
  await rest.put(
    Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
    { body: commands }
  );
  console.log('✅ Comandos registrados correctamente.');
} catch (error) {
  console.error('Error al registrar comandos:', error);
}
