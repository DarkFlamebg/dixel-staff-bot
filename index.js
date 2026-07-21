// index.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

const app = express();
global.currentStaff = {};

// 1. CONFIGURACIÓN DEL BOT DE DISCORD
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const FOOTER_KEYWORDS = ['miembros del staff'];

async function parseStaffTemplateWithFetch(message) {
    const lines = message.content.split('\n');
    const staffData = {};
    let currentRank = null;
    const guild = message.guild;

    if (guild) {
        await guild.members.fetch().catch(err => console.error("Error cargando miembros:", err));
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

client.once('clientReady', async () => {
    console.log(`🤖 Bot conectado con éxito como: ${client.user.tag}`);

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
});

const handleMessage = async (message) => {
    if (message.channel.id !== process.env.CHANNEL_ID) return;
    if (!message.content.toLowerCase().includes('plantilla')) return;

    global.currentStaff = await parseStaffTemplateWithFetch(message);
    console.log('🔄 ¡Plantilla con menciones indexada y actualizada en vivo!');
};

client.on('messageCreate', handleMessage);
client.on('messageUpdate', async (oldMsg, newMsg) => {
    if (newMsg.partial) await newMsg.fetch();
    handleMessage(newMsg);
});

client.login(process.env.DISCORD_TOKEN);

// 2. SERVIDOR API (EXPRESS) Y RENDERIZADO DEL CANVAS

// Tipografía cursiva
const FONT_FAMILY = 'Georgia, "Times New Roman", serif';

const THEME = {
    bgTop: '#140b16',
    bgBottom: '#08040a',
    cardBg: '#080c14',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    titlePink: '#ff2fa0',
    titleGlow: 'rgba(255, 47, 160, 0.75)',
    subtitleGray: '#b881a0',
    emptyGray: '#665a64'
};

const RANK_COLORS = {
    'desarrollador': '#E3AD1A',
    'administrador global': '#009BEE',
    'administrador': '#9E9E9E',
    'administrador a prueba': '#D8008F',
    'operador': '#1F855C',
    'operador a prueba': '#52D673',
    'moderador': '#E5AC00',
    'moderador a prueba': '#E5E26E',
    'soporte': '#E84D3D',
    'ayudante': '#2A93D5',
    'ayudante a prueba': '#73B5E0'
};

function cleanRankName(name) {
    return name.toLowerCase()
               .replace(/[^a-z0-9áéíóúñ\s]/gi, '')
               .trim();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
}

function drawElegantBackground(ctx, width, height) {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, THEME.bgTop);
    bgGrad.addColorStop(1, THEME.bgBottom);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;

    const gridSize = 32;
    for (let x = -height; x < width + height; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height, height);
        ctx.stroke();
    }
    for (let x = width + height; x > -height; x -= gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x - height, height);
        ctx.stroke();
    }
}

app.get('/api/staff.png', async (req, res) => {
    const ranks = Object.keys(global.currentStaff);
    const width = 600;

    if (ranks.length === 0) {
        const canvas = createCanvas(width, 140);
        const ctx = canvas.getContext('2d');
        drawElegantBackground(ctx, width, 140);

        // Encabezado con Brillo
        ctx.shadowColor = THEME.titleGlow;
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffffff';
        ctx.font = `italic bold 24px ${FONT_FAMILY}`;
        ctx.fillText('STAFF DIXEL RP', 30, 55);

        // Apagar brillo
        ctx.shadowBlur = 0;
        ctx.fillStyle = THEME.subtitleGray;
        ctx.font = `italic 14px ${FONT_FAMILY}`;
        ctx.fillText('Cargando plantilla y resolviendo menciones...', 30, 90);

        res.setHeader('Content-Type', 'image/png');
        return res.send(canvas.toBuffer());
    }

    // Calcular altura dinámica
    const HEADER_HEIGHT = 100;
    const CARD_PADDING = 16;
    const RANK_TITLE_HEIGHT = 28;
    const MEMBER_LINE_HEIGHT = 24;
    const CARD_GAP = 14;
    const FOOTER_HEIGHT = 50;
    const BOTTOM_MARGIN = 30;

    let totalHeight = HEADER_HEIGHT;
    const cardHeights = ranks.map(rank => {
        const memberCount = global.currentStaff[rank].length || 1;
        const h = CARD_PADDING * 2 + RANK_TITLE_HEIGHT + memberCount * MEMBER_LINE_HEIGHT;
        totalHeight += h + CARD_GAP;
        return h;
    });

    const totalMembers = ranks.reduce((sum, rank) => sum + global.currentStaff[rank].length, 0);
    totalHeight += FOOTER_HEIGHT + BOTTOM_MARGIN;

    const height = Math.max(220, totalHeight);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo
    drawElegantBackground(ctx, width, height);

    // Encabezado: TÍTULO PRINCIPAL
    ctx.shadowColor = THEME.titleGlow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic bold 28px ${FONT_FAMILY}`;

    const titleText = 'STAFF DIXEL RP';
    const titleWidth = ctx.measureText(titleText).width;
    const titleX = (width - titleWidth) / 2;
    ctx.fillText(titleText, titleX, 46);

    // Apagar brillo para el resto del encabezado
    ctx.shadowBlur = 0;

    const now = new Date();
    const fecha = now.toLocaleDateString('es-ES');
    ctx.fillStyle = THEME.subtitleGray;
    ctx.font = `italic 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(`Actualizado: ${fecha}`, width / 2, 68);
    ctx.textAlign = 'left';

    const lineGrad = ctx.createLinearGradient(40, 0, width - 40, 0);
    lineGrad.addColorStop(0, 'rgba(255, 47, 160, 0.8)');
    lineGrad.addColorStop(1, 'rgba(255, 47, 160, 0)');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(40, 82, width - 80, 1.5);

    // Tarjetas de Rango
    let yCursor = HEADER_HEIGHT;
    const cardX = 28;
    const cardWidth = width - 56;

    ranks.forEach((rank, i) => {
        const cardHeight = cardHeights[i];
        const members = global.currentStaff[rank];
        const count = members.length;

        const cleanedKey = cleanRankName(rank);
        const rankColor = RANK_COLORS[cleanedKey] || '#ff6ec7';

        // 1. Sombra suave para la carta
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;

        // 2. Fondo de la Carta
        roundRect(ctx, cardX, yCursor, cardWidth, cardHeight, 8);
        ctx.fillStyle = THEME.cardBg;
        ctx.fill();

        ctx.strokeStyle = THEME.cardBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // 3. Tira vertical + Marca de agua del Logo
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, cardX, yCursor, cardWidth, cardHeight, 8);
        ctx.clip();

        ctx.fillStyle = rankColor;
        ctx.fillRect(cardX, yCursor, 4, cardHeight);
        ctx.restore();

        let textY = yCursor + CARD_PADDING + 18;

        // 4. Título del Rango (Nítido / Cursiva)
        ctx.font = `italic bold 17px ${FONT_FAMILY}`;
        ctx.fillStyle = rankColor;
        ctx.fillText(`${rank.toUpperCase()}  (${count})`, cardX + 22, textY);

        textY += RANK_TITLE_HEIGHT;

        // 5. Lista de Miembros (Nítido / Cursiva)
        ctx.font = `italic bold 15px ${FONT_FAMILY}`;
        if (count === 0) {
            ctx.fillStyle = THEME.emptyGray;
            ctx.font = `italic 14px ${FONT_FAMILY}`;
            ctx.fillText('Sin asignaciones', cardX + 38, textY);
        } else {
            members.forEach(member => {
                ctx.fillStyle = rankColor;
                ctx.fillText('•', cardX + 24, textY);
                ctx.fillText(member, cardX + 38, textY);

                textY += MEMBER_LINE_HEIGHT;
            });
        }

        yCursor += cardHeight + CARD_GAP;
    });

    // ---- Pie de Página: MIEMBROS DEL STAFF (CON BRILLO) ----
    const footerLineGrad = ctx.createLinearGradient(40, 0, width - 40, 0);
    footerLineGrad.addColorStop(0, 'rgba(255, 47, 160, 0)');
    footerLineGrad.addColorStop(0.5, 'rgba(255, 47, 160, 0.8)');
    footerLineGrad.addColorStop(1, 'rgba(255, 47, 160, 0)');
    ctx.fillStyle = footerLineGrad;
    ctx.fillRect(40, yCursor + 2, width - 80, 1.5);

    const footerText = `Miembros del STAFF: ${totalMembers}`;
    ctx.font = `italic bold 16px ${FONT_FAMILY}`;
    
    // Activar brillo para el pie de página
    ctx.shadowColor = THEME.titleGlow;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    
    const footerTextWidth = ctx.measureText(footerText).width;
    ctx.fillText(footerText, (width - footerTextWidth) / 2, yCursor + 30);
    ctx.shadowBlur = 0; // Apagar para finalizar

    res.setHeader('Content-Type', 'image/png');
    res.send(canvas.toBuffer());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Servidor API corriendo en el puerto ${PORT}`));