// src/apelaciones/tablero.js
//
// Mantiene un mensaje fijado en el canal de apelaciones con el resumen general
// y pone en el estado del bot cuántas apelaciones hay pendientes.
//
// Variables de entorno:
//   APELACIONES_CANAL_ID     Canal donde va el tablero (vacío = sin tablero, solo el estado)
//   APELACIONES_TABLERO_MIN  Cada cuántos minutos se actualiza (por defecto 5)

import { ActivityType } from 'discord.js';
import { apiGet } from './api.js';
import { embedResumen, MARCA_TABLERO } from './embeds.js';

let mensajeTablero = null;

export function iniciarTablero(client) {
    const minutos = Math.max(1, Number(process.env.APELACIONES_TABLERO_MIN) || 5);
    actualizar(client);
    setInterval(() => actualizar(client), minutos * 60_000);
}

async function actualizar(client) {
    let resumen;
    try {
        resumen = await apiGet({ accion: 'resumen' });
    } catch (error) {
        console.error('Tablero de apelaciones: no se pudo leer la API:', error.message);
        return;
    }

    const pendientes = resumen.totales.pendiente ?? 0;
    client.user.setActivity(`${pendientes} apelaciones pendientes`, { type: ActivityType.Watching });

    const canalId = process.env.APELACIONES_CANAL_ID;
    if (!canalId) return;

    try {
        const canal = await client.channels.fetch(canalId);
        const payload = { embeds: [embedResumen(resumen, { tablero: true })] };

        mensajeTablero ??= await buscarTablero(canal, client.user.id);
        if (mensajeTablero) {
            try {
                await mensajeTablero.edit(payload);
                return;
            } catch {
                mensajeTablero = null; // lo borraron: se crea uno nuevo
            }
        }

        mensajeTablero = await canal.send(payload);
        await mensajeTablero.pin().catch((e) => console.warn('Tablero: no se pudo fijar el mensaje:', e.message));
    } catch (error) {
        console.error('Tablero de apelaciones: error al publicar:', error.message);
    }
}

// Busca el tablero ya existente (primero entre los fijados) para no duplicarlo tras reiniciar
async function buscarTablero(canal, botId) {
    const esTablero = (m) =>
        m.author?.id === botId && m.embeds[0]?.footer?.text?.startsWith(MARCA_TABLERO);

    const fijados = await canal.messages.fetchPins().catch(() => null);
    const enFijados = fijados?.items.map((p) => p.message).find(esTablero);
    if (enFijados) return enFijados;

    const recientes = await canal.messages.fetch({ limit: 50 }).catch(() => null);
    return recientes?.find(esTablero) ?? null;
}
