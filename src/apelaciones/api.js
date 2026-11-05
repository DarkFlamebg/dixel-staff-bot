// src/apelaciones/api.js
//
// Cliente de solo lectura para la API de apelaciones (api-bot.php en la web).
// Variables de entorno: APELACIONES_API_URL y APELACIONES_API_TOKEN.

export async function apiGet(params) {
    const base = process.env.APELACIONES_API_URL;
    const token = process.env.APELACIONES_API_TOKEN;
    if (!base || !token) {
        throw new Error('Faltan APELACIONES_API_URL o APELACIONES_API_TOKEN en el .env');
    }

    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
    }

    const res = await fetch(url, {
        headers: { 'X-Bot-Token': token, 'User-Agent': 'RaquelStaff/1.0 (+discord bot)' },
        signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || `La API respondió HTTP ${res.status}`);
    }
    return data;
}
