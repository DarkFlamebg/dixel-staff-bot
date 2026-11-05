// src/apelaciones/embeds.js
//
// Embeds de solo lectura para las apelaciones (comandos y tablero).

import { EmbedBuilder, escapeMarkdown } from 'discord.js';

export const MARCA_TABLERO = 'Tablero de apelaciones';

const ICONOS = {
    pendiente: '🕓',
    en_revision: '🔎',
    aprobada: '✅',
    rechazada: '❌',
    desbaneado: '🔓',
};

const COLORES = {
    pendiente: 0x95a5a6,
    en_revision: 0xf1c40f,
    aprobada: 0x2ecc71,
    rechazada: 0xe74c3c,
    desbaneado: 0x1abc9c,
};

const nombre = (a) => escapeMarkdown(a.personaje);
const titulo = (a) => (a.enlace ? `[#${a.id} ${nombre(a)}](${a.enlace})` : `#${a.id} ${nombre(a)}`);
const fecha = (a) => (a.creada ? `<t:${a.creada}:R>` : '—');

function barraApoyo(a) {
    if (a.apoyo === null) return 'Sin votos todavía';
    const llenos = Math.round(a.apoyo / 10);
    return `${'🟩'.repeat(llenos)}${'🟥'.repeat(10 - llenos)} **${a.apoyo}%** (${a.a_favor + a.en_contra} votos)`;
}

/** Ficha completa de una apelación. */
export function embedApelacion(a) {
    const embed = new EmbedBuilder()
        .setColor(COLORES[a.estado] ?? 0x3498db)
        .setTitle(`Apelación #${a.id} · ${a.personaje}`)
        .addFields(
            { name: 'Estado', value: `${ICONOS[a.estado] ?? ''} ${a.estado_texto}`, inline: true },
            { name: 'Creada', value: fecha(a), inline: true },
            { name: 'Comentarios', value: String(a.comentarios), inline: true },
            { name: 'Motivo del baneo', value: escapeMarkdown(a.motivo) || '—' },
            { name: 'Explicación', value: escapeMarkdown(a.explicacion ?? '') || '—' },
            { name: '👍 A favor', value: String(a.a_favor), inline: true },
            { name: '👎 En contra', value: String(a.en_contra), inline: true },
            { name: 'Apoyo de la comunidad', value: barraApoyo(a) },
        )
        .setFooter({ text: 'Solo lectura · se gestiona desde el panel' });

    if (a.respuesta_oficial) {
        embed.addFields({ name: 'Respuesta oficial', value: escapeMarkdown(a.respuesta_oficial) });
    }
    if (a.enlace) embed.setURL(a.enlace);
    return embed;
}

/** Lista corta cuando la búsqueda devuelve varias apelaciones. */
export function embedListaResultados(busqueda, resultados) {
    const lineas = resultados.map(
        (a) => `${ICONOS[a.estado] ?? ''} ${titulo(a)} · 👍 ${a.a_favor} 👎 ${a.en_contra} · ${fecha(a)}`,
    );
    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`Resultados para "${busqueda}"`)
        .setDescription(lineas.join('\n'))
        .setFooter({ text: 'Usa /apelacion con el número para ver la ficha completa' });
}

/** Resumen general (comando /apelaciones y tablero fijado). */
export function embedResumen(resumen, { tablero = false } = {}) {
    const t = resumen.totales;
    const estados = Object.keys(ICONOS)
        .map((e) => `${ICONOS[e]} ${e === 'en_revision' ? 'En revisión' : e[0].toUpperCase() + e.slice(1)}: **${t[e] ?? 0}**`)
        .join('\n');

    const masApoyo = resumen.mas_apoyo.length
        ? resumen.mas_apoyo.map((a) => `${titulo(a)} · 👍 ${a.a_favor} 👎 ${a.en_contra} · ${a.apoyo}%`).join('\n')
        : 'Ninguna con votos a favor';

    const masAntiguas = resumen.mas_antiguas.length
        ? resumen.mas_antiguas.map((a) => `${titulo(a)} · ${fecha(a)}`).join('\n')
        : 'No hay apelaciones pendientes 🎉';

    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('📊 Apelaciones de desbaneo')
        .setDescription(`${estados}\n**Total:** ${resumen.total}`)
        .addFields(
            { name: '🔥 Más apoyadas (sin resolver)', value: masApoyo },
            { name: '⏳ Más antiguas sin revisar', value: masAntiguas },
        )
        .setFooter({ text: tablero ? `${MARCA_TABLERO} · se actualiza solo` : 'Solo lectura · se gestiona desde el panel' })
        .setTimestamp(resumen.generado ? resumen.generado * 1000 : Date.now());
}
