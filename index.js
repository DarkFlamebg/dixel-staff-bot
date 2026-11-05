// index.js
//
// Punto de entrada del bot Raquel Staff — Dixel RP
//
// Responsabilidades:
//   1. Arrancar el cliente de Discord y escuchar eventos del bot
//   2. Arrancar el servidor Express con el endpoint /api/staff.png
//   3. Inicializar el motor de FAQ antes de aceptar comandos

import 'dotenv/config';
import express from 'express';
import { Events } from 'discord.js';

import client from './src/bot/client.js';
import { parseStaffTemplateWithFetch, handleMessage } from './src/bot/staffParser.js';
import { initFaqEngine } from './src/faq/faqEngine.js';
import * as dudaCommand from './src/commands/duda.js';
import * as apelacionCommand from './src/commands/apelacion.js';
import * as apelacionesCommand from './src/commands/apelaciones.js';
import { iniciarTablero } from './src/apelaciones/tablero.js';
import { registerStaffImageRoute } from './src/api/staffImage.js';

// Comandos slash por nombre
const commands = {
    [dudaCommand.data.name]: dudaCommand,
    [apelacionCommand.data.name]: apelacionCommand,
    [apelacionesCommand.data.name]: apelacionesCommand,
};

// Estado global del staff (compartido con src/api/staffImage.js)
global.currentStaff = {};

// ─── Bot de Discord ───────────────────────────────────────────────────────────

client.once(Events.ClientReady, async () => {
    console.log(`🤖 Bot conectado con éxito como: ${client.user.tag}`);

    // Carga inicial de la plantilla del staff desde el canal configurado
    try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID);
        const messages = await channel.messages.fetch({ limit: 10 });
        const targetMessage = messages.find(m => m.content.toLowerCase().includes('plantilla'));

        if (targetMessage) {
            global.currentStaff = await parseStaffTemplateWithFetch(targetMessage);
            console.log('✅ Caché inicial del Staff cargada y traducida con éxito.');
        } else {
            console.log('⚠️ No se encontró ningún mensaje con la palabra "plantilla" en el canal.');
        }
    } catch (error) {
        console.error('Error al cargar el mensaje inicial:', error);
    }

    // Inicializa el motor de FAQ (carga modelo + embeddings) antes de aceptar comandos
    try {
        await initFaqEngine();
        console.log('🧠 Motor de FAQ listo.');
    } catch (error) {
        console.error('Error al inicializar faqEngine:', error);
    }

    // Tablero de apelaciones (solo lectura) y estado del bot
    if (process.env.APELACIONES_API_URL) {
        iniciarTablero(client);
        console.log('📊 Tablero de apelaciones iniciado.');
    }
});

// Actualiza la plantilla en vivo cuando se edita o postea un nuevo mensaje
client.on(Events.MessageCreate, handleMessage);
client.on(Events.MessageUpdate, async (oldMsg, newMsg) => {
    if (newMsg.partial) await newMsg.fetch();
    handleMessage(newMsg);
});

// Router de slash commands
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands[interaction.commandName];
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error en /${interaction.commandName}:`, error);
    }
});

client.login(process.env.DISCORD_TOKEN);

// ─── Servidor Express (API) ───────────────────────────────────────────────────

const app = express();
registerStaffImageRoute(app);

// Ruta ligera para que un servicio externo (ej. UptimeRobot) mantenga despierto el servicio en Render
app.get('/health', (req, res) => res.send('ok'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor API corriendo en el puerto ${PORT}`));