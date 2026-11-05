// src/apelaciones/embeds.js
//
// Embeds de solo lectura para las apelaciones (comandos y tablero).
// Mismo estilo que los mensajes que publica la web por webhook.

import { EmbedBuilder, escapeMarkdown } from 'discord.js';

export const MARCA_TABLERO = 'Tablero de apelaciones';
const PIE = 'Dixel RP · Apelaciones';

export const ESTADOS = {
    pendiente: { icono: '🕓', texto: 'Pendiente', plural: 'Pendientes', color: 0x95a5a6 },
    en_revision: { icono: '🔎', texto: 'En revisión', plural: 'En revisión', color: 0xf1c40f },
    aprobada: { icono: '✅', texto: 'Aprobada', plural: 'Aprobadas', color: 0x2ecc71 },
    rechazada: { icono: '❌', texto: 'Rechazada', plural: 'Rechazadas', color: 0xe74c3c },
    desbaneado: { icono: '🔓', texto: 'Desbaneado', plural: 'Desbaneados', color: 0x1abc9c },
};

const VACIO = '​';
const nombre = (a) => escapeMarkdown(a.personaje);
const enlace = (a) => (a.enlace ? `[#${a.id} ${nombre(a)}](${a.enlace})` : `#${a.id} ${nombre(a)}`);
const fecha = (a) => (a.creada ? `<t:${a.creada}:R>` : '—');
const estado = (a) => ESTADOS[a.estado] ?? { icono: '•', texto: a.estado_texto, color: 0x3498db };

function colorApoyo(a) {
    if (a.apoyo === null) return 0x95a5a6;
    return a.apoyo >= 60 ? 0x2ecc71 : a.apoyo <= 40 ? 0xe74c3c : 0xf1c40f;
}

function barraApoyo(a) {
    if (a.apoyo === null) return '⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜\nSin votos todavía';
    const llenos = Math.round(a.apoyo / 10);
    const total = a.a_favor + a.en_contra;
    return `${'🟩'.repeat(llenos)}${'🟥'.repeat(10 - llenos)}\n**${a.apoyo}%** a favor · ${total === 1 ? '1 voto' : `${total} votos`}`;
}

/** Ficha completa de una apelación (/apelacion). */
export function embedApelacion(a, solicitante) {
    const e = estado(a);
    let descripcion = `**Motivo del baneo:** ${escapeMarkdown(a.motivo)}\n\n>>> ${escapeMarkdown(a.explicacion ?? '') || '—'}`;
    if (a.enlace) descripcion += `\n\n🔗 **[Ver apelación completa](${a.enlace})**`;

    const embed = new EmbedBuilder()
        .setAuthor({ name: `Apelación #${a.id}` })
        .setTitle(`👤 ${a.personaje}`)
        .setDescription(descripcion)
        .setColor(colorApoyo(a))
        .addFields(
            { name: 'Estado', value: `${e.icono} **${e.texto}**`, inline: true },
            { name: 'Creada', value: fecha(a), inline: true },
            { name: '💬 Comentarios', value: `**${a.comentarios}**`, inline: true },
            { name: '👍 A favor', value: `**${a.a_favor}**`, inline: true },
            { name: '👎 En contra', value: `**${a.en_contra}**`, inline: true },
            { name: VACIO, value: VACIO, inline: true },
            { name: '📊 Apoyo de la comunidad', value: barraApoyo(a) },
        )
        .setFooter(pie(solicitante));

    if (a.respuesta_oficial) {
        embed.addFields({ name: '📝 Respuesta oficial', value: escapeMarkdown(a.respuesta_oficial) });
    }
    if (a.enlace) embed.setURL(a.enlace);
    return embed;
}

/** Lista corta cuando la búsqueda devuelve varias apelaciones. */
export function embedListaResultados(busqueda, resultados, solicitante) {
    const lineas = resultados.map(
        (a) => `${estado(a).icono} **${enlace(a)}**\n${VACIO} 👍 ${a.a_favor} · 👎 ${a.en_contra} · ${fecha(a)}`,
    );
    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`🔍 Resultados para "${busqueda}"`)
        .setDescription(lineas.join('\n\n'))
        .setFooter(pie(solicitante, 'Usa /apelacion con el número para ver la ficha'));
}

/** Resumen general (/apelaciones y tablero fijado). */
export function embedResumen(resumen, { tablero = false, solicitante = null } = {}) {
    const t = resumen.totales;
    const contador = (clave) => ({
        name: `${ESTADOS[clave].icono} ${ESTADOS[clave].plural}`,
        value: `**${t[clave] ?? 0}**`,
        inline: true,
    });

    const masApoyo = resumen.mas_apoyo.length
        ? resumen.mas_apoyo
              .map((a, i) => `\`${i + 1}.\` ${enlace(a)}\n${VACIO} 👍 ${a.a_favor} · 👎 ${a.en_contra} · **${a.apoyo}%**`)
              .join('\n')
        : 'Ninguna con votos a favor';

    const masAntiguas = resumen.mas_antiguas.length
        ? resumen.mas_antiguas.map((a, i) => `\`${i + 1}.\` ${enlace(a)} · ${fecha(a)}`).join('\n')
        : 'No hay apelaciones pendientes 🎉';

    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📊 Apelaciones de desbaneo')
        .setDescription(`**${resumen.total}** apelaciones en total`)
        .addFields(
            contador('pendiente'),
            contador('en_revision'),
            contador('rechazada'),
            contador('aprobada'),
            contador('desbaneado'),
            { name: VACIO, value: VACIO, inline: true },
            { name: '🔥 Más apoyadas sin resolver', value: masApoyo },
            { name: '⏳ Más antiguas sin revisar', value: masAntiguas },
        )
        .setFooter(tablero ? { text: `${MARCA_TABLERO} · se actualiza solo` } : pie(solicitante))
        .setTimestamp(resumen.generado ? resumen.generado * 1000 : Date.now());
}

function pie(solicitante, extra) {
    const partes = [PIE];
    if (extra) partes.push(extra);
    if (solicitante) {
        const quien = solicitante.displayName ?? solicitante.user?.global_name ?? solicitante.user?.username ?? solicitante.username;
        if (quien) partes.push(`Consultado por ${quien}`);
    }
    return {
        text: partes.join(' · '),
        ...(solicitante?.displayAvatarURL ? { iconURL: solicitante.displayAvatarURL() } : {}),
    };
}
