// src/bot/staffParser.js
//
// Lógica de parsing de la plantilla del staff de Discord.
// Lee un mensaje del canal configurado, resuelve menciones de roles y usuarios,
// y devuelve un objeto { [rango]: [miembro, ...] } que se guarda en global.currentStaff.

import client from './client.js';

const FOOTER_KEYWORDS = ['miembros del staff'];

/**
 * Parsea el mensaje de plantilla del staff resolviendo menciones reales
 * de roles (@&ID) y usuarios (<@!ID>) contra la caché del guild.
 *
 * @param {import('discord.js').Message} message
 * @returns {Promise<Record<string, string[]>>}
 */
export async function parseStaffTemplateWithFetch(message) {
    const lines = message.content.split('\n');
    const staffData = {};
    let currentRank = null;
    const guild = message.guild;

    if (guild) {
        await guild.members.fetch().catch(err => console.error('Error cargando miembros:', err));
    }

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.includes(':') || line.startsWith('@•') || line.startsWith('•') || line.match(/<@&\d+>/)) {
            let rankName = line.split(':')[0].trim();

            const roleMatch = rankName.match(/<@&(\d+)>/);
            if (roleMatch && guild) {
                const roleId = roleMatch[1];
                const role = await guild.roles.fetch(roleId).catch(() => null);
                if (role) rankName = role.name;
            }

            currentRank = rankName.replace(/[@•▶️\->]/g, '').replace(/\*\*/g, '').replace(/__/g, '').trim();

            if (FOOTER_KEYWORDS.some(kw => currentRank.toLowerCase().includes(kw))) {
                currentRank = null;
                continue;
            }

            staffData[currentRank] = [];

        } else if (currentRank) {
            const userMatch = line.match(/<@!?(\d+)>/);
            let userDisplayName;

            if (userMatch && guild) {
                const userId = userMatch[1];
                const member = guild.members.cache.get(userId);
                if (member) {
                    userDisplayName = member.displayName;
                } else {
                    const user = await client.users.fetch(userId).catch(() => null);
                    userDisplayName = user ? user.username : null;
                }
            } else {
                userDisplayName = line.replace(/[@\-]/g, '').trim();
            }

            if (
                userDisplayName &&
                !userDisplayName.startsWith('<') &&
                !FOOTER_KEYWORDS.some(kw => userDisplayName.toLowerCase().includes(kw))
            ) {
                staffData[currentRank].push(userDisplayName);
            }
        }
    }
    return staffData;
}

/**
 * Handler para messageCreate / messageUpdate.
 * Solo procesa mensajes del canal configurado que contengan la palabra "plantilla".
 *
 * @param {import('discord.js').Message} message
 */
export async function handleMessage(message) {
    if (message.channel.id !== process.env.CHANNEL_ID) return;
    if (!message.content.toLowerCase().includes('plantilla')) return;

    global.currentStaff = await parseStaffTemplateWithFetch(message);
    console.log('🔄 ¡Plantilla con menciones indexada y actualizada en vivo!');
}
