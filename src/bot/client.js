// src/bot/client.js
//
// Instancia singleton del Client de discord.js.
// Importar este módulo desde cualquier parte del proyecto garantiza
// que siempre se usa el mismo cliente, sin duplicados.

import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

export default client;
