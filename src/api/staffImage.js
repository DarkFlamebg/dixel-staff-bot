// src/api/staffImage.js
//
// Endpoint Express GET /api/staff.png
// Genera dinámicamente la imagen del staff usando node-canvas,
// leyendo la caché de global.currentStaff que actualiza el bot.

import { createCanvas } from '@napi-rs/canvas';

// ─── Tema visual ───────────────────────────────────────────────────────────────
const FONT_FAMILY = 'Georgia, "Times New Roman", serif';

const THEME = {
    bgTop:        '#140b16',
    bgBottom:     '#08040a',
    cardBg:       '#080c14',
    cardBorder:   'rgba(255, 255, 255, 0.08)',
    titlePink:    '#ff2fa0',
    titleGlow:    'rgba(255, 47, 160, 0.75)',
    subtitleGray: '#b881a0',
    emptyGray:    '#665a64',
};

const RANK_COLORS = {
    'desarrollador':          '#E3AD1A',
    'administrador global':   '#009BEE',
    'administrador':          '#9E9E9E',
    'administrador a prueba': '#D8008F',
    'operador':               '#1F855C',
    'operador a prueba':      '#52D673',
    'moderador':              '#E5AC00',
    'moderador a prueba':     '#E5E26E',
    'soporte':                '#E84D3D',
    'ayudante':               '#2A93D5',
    'ayudante a prueba':      '#73B5E0',
};

// ─── Helpers de canvas ────────────────────────────────────────────────────────

function cleanRankName(name) {
    return name.toLowerCase()
               .replace(/[^a-z0-9áéíóúñ\s]/gi, '')
               .trim();
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y,          x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x,         y + height, radius);
    ctx.arcTo(x,         y + height, x,         y,          radius);
    ctx.arcTo(x,         y,          x + width, y,          radius);
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

// ─── Handler Express ──────────────────────────────────────────────────────────

/**
 * Registra el endpoint /api/staff.png en la app Express proporcionada.
 * @param {import('express').Application} app
 */
export function registerStaffImageRoute(app) {
    app.get('/api/staff.png', async (req, res) => {
        const ranks = Object.keys(global.currentStaff);
        const width = 600;

        // Estado de carga: plantilla aún no disponible
        if (ranks.length === 0) {
            const canvas = createCanvas(width, 140);
            const ctx = canvas.getContext('2d');
            drawElegantBackground(ctx, width, 140);

            ctx.shadowColor = THEME.titleGlow;
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ffffff';
            ctx.font = `italic bold 24px ${FONT_FAMILY}`;
            ctx.fillText('STAFF DIXEL RP', 30, 55);

            ctx.shadowBlur = 0;
            ctx.fillStyle = THEME.subtitleGray;
            ctx.font = `italic 14px ${FONT_FAMILY}`;
            ctx.fillText('Cargando plantilla y resolviendo menciones...', 30, 90);

            res.setHeader('Content-Type', 'image/png');
            return res.send(canvas.toBuffer());
        }

        // ── Layout dinámico ──────────────────────────────────────────────────
        const HEADER_HEIGHT    = 100;
        const CARD_PADDING     = 16;
        const RANK_TITLE_HEIGHT = 28;
        const MEMBER_LINE_HEIGHT = 24;
        const CARD_GAP         = 14;
        const FOOTER_HEIGHT    = 50;
        const BOTTOM_MARGIN    = 30;

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

        // ── Encabezado ───────────────────────────────────────────────────────
        ctx.shadowColor = THEME.titleGlow;
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#ffffff';
        ctx.font = `italic bold 28px ${FONT_FAMILY}`;

        const titleText = 'STAFF DIXEL RP';
        const titleWidth = ctx.measureText(titleText).width;
        ctx.fillText(titleText, (width - titleWidth) / 2, 46);

        ctx.shadowBlur = 0;

        const now = new Date();
        ctx.fillStyle = THEME.subtitleGray;
        ctx.font = `italic 13px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText(`Actualizado: ${now.toLocaleDateString('es-ES')}`, width / 2, 68);
        ctx.textAlign = 'left';

        const lineGrad = ctx.createLinearGradient(40, 0, width - 40, 0);
        lineGrad.addColorStop(0, 'rgba(255, 47, 160, 0.8)');
        lineGrad.addColorStop(1, 'rgba(255, 47, 160, 0)');
        ctx.fillStyle = lineGrad;
        ctx.fillRect(40, 82, width - 80, 1.5);

        // ── Tarjetas de rango ────────────────────────────────────────────────
        let yCursor = HEADER_HEIGHT;
        const cardX = 28;
        const cardWidth = width - 56;

        ranks.forEach((rank, i) => {
            const cardHeight = cardHeights[i];
            const members    = global.currentStaff[rank];
            const count      = members.length;
            const cleanedKey = cleanRankName(rank);
            const rankColor  = RANK_COLORS[cleanedKey] || '#ff6ec7';

            // Sombra de la tarjeta
            ctx.shadowColor   = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur    = 8;
            ctx.shadowOffsetY = 3;

            roundRect(ctx, cardX, yCursor, cardWidth, cardHeight, 8);
            ctx.fillStyle = THEME.cardBg;
            ctx.fill();
            ctx.strokeStyle = THEME.cardBorder;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.shadowBlur    = 0;
            ctx.shadowOffsetY = 0;

            // Tira de color lateral
            ctx.save();
            ctx.beginPath();
            roundRect(ctx, cardX, yCursor, cardWidth, cardHeight, 8);
            ctx.clip();
            ctx.fillStyle = rankColor;
            ctx.fillRect(cardX, yCursor, 4, cardHeight);
            ctx.restore();

            let textY = yCursor + CARD_PADDING + 18;

            // Título del rango
            ctx.font = `italic bold 17px ${FONT_FAMILY}`;
            ctx.fillStyle = rankColor;
            ctx.fillText(`${rank.toUpperCase()}  (${count})`, cardX + 22, textY);
            textY += RANK_TITLE_HEIGHT;

            // Lista de miembros
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

        // ── Pie de página ────────────────────────────────────────────────────
        const footerLineGrad = ctx.createLinearGradient(40, 0, width - 40, 0);
        footerLineGrad.addColorStop(0,   'rgba(255, 47, 160, 0)');
        footerLineGrad.addColorStop(0.5, 'rgba(255, 47, 160, 0.8)');
        footerLineGrad.addColorStop(1,   'rgba(255, 47, 160, 0)');
        ctx.fillStyle = footerLineGrad;
        ctx.fillRect(40, yCursor + 2, width - 80, 1.5);

        const footerText = `Miembros del STAFF: ${totalMembers}`;
        ctx.font = `italic bold 16px ${FONT_FAMILY}`;
        ctx.shadowColor = THEME.titleGlow;
        ctx.shadowBlur  = 12;
        ctx.fillStyle   = '#ffffff';
        ctx.fillText(footerText, (width - ctx.measureText(footerText).width) / 2, yCursor + 30);
        ctx.shadowBlur = 0;

        res.setHeader('Content-Type', 'image/png');
        res.send(canvas.toBuffer());
    });
}
