// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { createCanvas } = require('canvas');

const app = express();
// Variable global en caché para que la API sirva los datos de inmediato
global.currentStaff = {};

// 1. CONFIGURACIÓN DEL BOT DE DISCORD (CON TODOS LOS INTENTS NECESARIOS)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Crucial para resolver los nombres de los usuarios
    ]
});

// Palabras que indican que la línea es un cierre/footer y NO un rango real
const FOOTER_KEYWORDS = ['miembros del staff'];

// Función asíncrona para parsear el texto y resolver IDs de roles y usuarios
async function parseStaffTemplateWithFetch(message) {
    const lines = message.content.split('\n');
    const staffData = {};
    let currentRank = null;
    const guild = message.guild;

    // Asegurarnos de que todos los miembros del servidor estén cargados en caché antes de mapear
    if (guild) {
        await guild.members.fetch().catch(err => console.error("Error cargando miembros:", err));
    }

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // 1. DETECTAR Y RESOLVER RANGOS (ROLES DE DISCORD)
        if (line.includes(':') || line.startsWith('@•') || line.startsWith('•') || line.match(/<@&\d+>/)) {
            let rankName = line.split(':')[0].trim();

            const roleMatch = rankName.match(/<@&(\d+)>/);
            if (roleMatch && guild) {
                const roleId = roleMatch[1];
                const role = await guild.roles.fetch(roleId).catch(() => null);
                if (role) rankName = role.name;
            }

            // Limpieza extendida: quita @, •, ▶️, guiones, markdown de negrita/subrayado (**, __)
            currentRank = rankName.replace(/[@•▶️\->]/g, '').replace(/\*\*/g, '').replace(/__/g, '').trim();

            // Si la línea es en realidad el footer "Miembros del STAFF", la ignoramos por completo
            // y cerramos el rango actual para no capturar basura debajo de ella.
            if (FOOTER_KEYWORDS.some(kw => currentRank.toLowerCase().includes(kw))) {
                currentRank = null;
                continue;
            }

            staffData[currentRank] = [];

        } else if (currentRank) {
            // 2. DETECTAR Y RESOLVER MIEMBROS (USUARIOS DE DISCORD)
            // Importante: probamos el match de mención SOBRE LA LÍNEA ORIGINAL,
            // antes de eliminar el '@' — si no, el regex nunca encuentra <@id>
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
                // Fallback: texto plano (ej: "@Dixel" escrito a mano, no una mención real)
                userDisplayName = line.replace(/[@\-]/g, '').trim();
            }

            // Filtro para ignorar líneas inválidas o el texto de "Miembros del STAFF"
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

// Evento de inicialización corregido (clientReady para evitar el Deprecation Warning)
client.once('clientReady', async () => {
    console.log(`🤖 Bot conectado con éxito como: ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID);
        const messages = await channel.messages.fetch({ limit: 10 });
        // Buscamos el último mensaje en el canal que tenga el formato de la plantilla
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
});

// Manejador para actualizaciones en tiempo real
const handleMessage = async (message) => {
    if (message.channel.id !== process.env.CHANNEL_ID) return;
    if (!message.content.toLowerCase().includes('plantilla')) return;

    global.currentStaff = await parseStaffTemplateWithFetch(message);
    console.log('🔄 ¡Plantilla con menciones indexada y actualizada en vivo!');
};

client.on('messageCreate', handleMessage);
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (newMsg.partial) await newMsg.fetch(); // Forzar la descarga del mensaje si viene incompleto
    handleMessage(newMsg);
});

client.login(process.env.DISCORD_TOKEN);

// 2. SERVIDOR API (EXPRESS) Y RENDERIZADO DEL CANVAS

// ---- Paleta de colores estilo Dixel RP (tonos rosados) ----
const THEME = {
    bgTop: '#1c0f1c',
    bgBottom: '#120912',
    cardBg: '#241526',
    cardBorder: 'rgba(255, 105, 180, 0.18)',
    titlePink: '#ff2fa0',
    titleGlow: 'rgba(255, 47, 160, 0.55)',
    rankPink: '#ff6ec7',
    accentLine: 'rgba(255, 110, 199, 0.35)',
    memberWhite: '#f5f0f4',
    emptyGray: '#7a6c78',
    subtitleGray: '#c98fb0'
};

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

app.get('/api/staff.png', (req, res) => {
    const ranks = Object.keys(global.currentStaff);
    const width = 600;

    // Imagen provisional si la caché todavía no se ha llenado
    if (ranks.length === 0) {
        const canvas = createCanvas(width, 140);
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 140);
        grad.addColorStop(0, THEME.bgTop);
        grad.addColorStop(1, THEME.bgBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, 140);

        ctx.fillStyle = THEME.titlePink;
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('STAFF DIXEL RP', 30, 55);

        ctx.fillStyle = THEME.subtitleGray;
        ctx.font = '15px sans-serif';
        ctx.fillText('Cargando plantilla y resolviendo menciones...', 30, 90);

        res.setHeader('Content-Type', 'image/png');
        return res.send(canvas.toBuffer());
    }

    // ---- Calcular altura dinámica ----
    const HEADER_HEIGHT = 95;
    const CARD_PADDING = 18;
    const RANK_TITLE_HEIGHT = 32;
    const MEMBER_LINE_HEIGHT = 24;
    const CARD_GAP = 14;
    const FOOTER_HEIGHT = 50;
    const BOTTOM_MARGIN = 30;

    let totalHeight = HEADER_HEIGHT;
    const cardHeights = ranks.map(rank => {
        const memberCount = global.currentStaff[rank].length || 1; // al menos 1 línea para "Ninguno"
        const h = CARD_PADDING * 2 + RANK_TITLE_HEIGHT + memberCount * MEMBER_LINE_HEIGHT;
        totalHeight += h + CARD_GAP;
        return h;
    });

    // Total real de miembros del staff (suma de todos los rangos, sin duplicados por diseño)
    const totalMembers = ranks.reduce((sum, rank) => sum + global.currentStaff[rank].length, 0);

    totalHeight += FOOTER_HEIGHT + BOTTOM_MARGIN;

    const height = Math.max(220, totalHeight);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // ---- Fondo con degradado ----
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, THEME.bgTop);
    bgGrad.addColorStop(1, THEME.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // ---- Encabezado ----
    ctx.shadowColor = THEME.titleGlow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = THEME.titlePink;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('STAFF DIXEL RP', 30, 44);
    ctx.shadowBlur = 0;

    const now = new Date();
    const fecha = now.toLocaleDateString('es-ES');
    const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    ctx.fillStyle = THEME.subtitleGray;
    ctx.font = '14px sans-serif';
    ctx.fillText(`Actualizado: ${fecha} · ${hora}`, 30, 66);

    // Línea divisora con degradado rosa
    const lineGrad = ctx.createLinearGradient(30, 0, width - 30, 0);
    lineGrad.addColorStop(0, 'rgba(255, 47, 160, 0.9)');
    lineGrad.addColorStop(1, 'rgba(255, 47, 160, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(30, 80, width - 60, 2);

    // ---- Tarjetas por rango ----
    let yCursor = HEADER_HEIGHT;
    const cardX = 24;
    const cardWidth = width - 48;

    ranks.forEach((rank, i) => {
        const cardHeight = cardHeights[i];

        // Fondo de la tarjeta
        roundRect(ctx, cardX, yCursor, cardWidth, cardHeight, 14);
        ctx.fillStyle = THEME.cardBg;
        ctx.fill();
        ctx.strokeStyle = THEME.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        let textY = yCursor + CARD_PADDING + 20;

        // Título del rango
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = THEME.rankPink;
        ctx.fillText(`▶  ${rank}`, cardX + 20, textY);
        textY += RANK_TITLE_HEIGHT;

        // Miembros
        ctx.font = '15px sans-serif';
        const members = global.currentStaff[rank];
        if (members.length === 0) {
            ctx.fillStyle = THEME.emptyGray;
            ctx.font = 'italic 15px sans-serif';
            ctx.fillText('Ninguno', cardX + 40, textY);
        } else {
            ctx.fillStyle = THEME.memberWhite;
            members.forEach(member => {
                ctx.fillText(`•  ${member}`, cardX + 40, textY);
                textY += MEMBER_LINE_HEIGHT;
            });
        }

        yCursor += cardHeight + CARD_GAP;
    });

    // ---- Pie de página: total de miembros del staff ----
    const footerLineGrad = ctx.createLinearGradient(30, 0, width - 30, 0);
    footerLineGrad.addColorStop(0, 'rgba(255, 47, 160, 0)');
    footerLineGrad.addColorStop(0.5, 'rgba(255, 47, 160, 0.9)');
    footerLineGrad.addColorStop(1, 'rgba(255, 47, 160, 0)');
    ctx.fillStyle = footerLineGrad;
    ctx.fillRect(30, yCursor + 4, width - 60, 1.5);

    const footerText = `Miembros del STAFF: ${totalMembers}`;
    ctx.font = 'bold 17px sans-serif';
    ctx.shadowColor = THEME.titleGlow;
    ctx.shadowBlur = 8;
    ctx.fillStyle = THEME.titlePink;
    const footerTextWidth = ctx.measureText(footerText).width;
    ctx.fillText(footerText, (width - footerTextWidth) / 2, yCursor + 34);
    ctx.shadowBlur = 0;

    // Enviar el búfer de la imagen al foro
    res.setHeader('Content-Type', 'image/png');
    res.send(canvas.toBuffer());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor API corriendo en el puerto ${PORT}`));