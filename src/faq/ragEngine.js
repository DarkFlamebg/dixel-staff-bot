// src/faq/ragEngine.js
//
// Motor RAG (Retrieval-Augmented Generation) para Raquel Staff.
// Combina el buscador semántico local (faqEngine) con la API de Gemini
// para generar respuestas contextualizadas y naturales.
//
// Flujo:
//   1. searchFaqContext() recupera las 4 respuestas más similares del Excel
//   2. Se arma un prompt con el contexto + la pregunta del usuario
//   3. Gemini genera una respuesta como "Raquel Staff"
//   4. Si la API falla, hay un fallback al mejor match directo del Excel

import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchFaqContext, searchFaq } from './faqEngine.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });

// ─── Personalidad y reglas de Raquel ────────────────────────────────────────

const SYSTEM_PROMPT = `Eres Raquel Staff, la asistente virtual amigable del servidor de GTA SAMP "Dixel RP".
Tu personalidad es la de un amigo del servidor: cercana, simpática, directa y siempre dispuesta a ayudar.

REGLAS QUE DEBES SEGUIR SIEMPRE:
1. Responde ÚNICAMENTE en español.
2. Usa un tono amigable e informal, como si fueras un compañero del servidor que conoce todo.
3. Basa tus respuestas EXCLUSIVAMENTE en el contexto que se te proporciona. No inventes comandos, mecánicas, precios ni reglas.
4. NUNCA reveles información del equipo de staff: nombres de administradores, sus IDs de Discord, decisiones internas, ni cómo funcionan los sistemas de administración.
5. NUNCA prometas cosas que solo un staff humano puede decidir (como dar objetos, desbanear jugadores, o cambiar rangos).
6. Si la pregunta trata sobre sanciones, baneos, problemas con staff u otros jugadores, indica amablemente que ese tema requiere la atención directa de un staff humano y sugiere abrir un ticket de soporte.
7. Si el contexto no contiene información suficiente para responder con seguridad, di que no tienes esa información por el momento y sugiere consultar en el canal de soporte o abrir un ticket.
8. Usa formato de Discord Markdown cuando sea útil (ej: \`/comando\` para comandos, **negrita** para resaltar algo importante).
9. Tus respuestas deben ser concisas: no más de 3-4 oraciones salvo que la pregunta lo requiera.`;

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Genera una respuesta contextualizada usando Gemini + el contexto del Excel.
 * Si la API falla, hace fallback al mejor match directo del faqEngine.
 *
 * @param {string} pregunta - La pregunta del usuario en Discord
 * @returns {Promise<{ respuesta: string, fuenteIA: boolean }>}
 */
export async function askRaquel(pregunta) {
    // 1. Buscar contexto relevante en el Excel
    const contexto = await searchFaqContext(pregunta, 4);

    // 2. Si no hay ningún contexto relevante, responder directamente sin llamar a la API
    if (contexto.length === 0) {
        return {
            respuesta: '¡Hola! No tengo información sobre ese tema en mi base de datos. ' +
                       'Te recomiendo abrir un **ticket de soporte** o consultar en el canal correspondiente ' +
                       'para que un staff pueda ayudarte directamente. 😊',
            fuenteIA: false,
        };
    }

    // 3. Armar el bloque de contexto para el prompt
    const bloqueContexto = contexto
        .map((item, i) => `[${i + 1}] Pregunta: "${item.pregunta}"\n    Respuesta: "${item.respuesta}"`)
        .join('\n\n');

    const prompt = `${SYSTEM_PROMPT}

---
CONTEXTO DE LA BASE DE DATOS DE DIXEL RP:
${bloqueContexto}
---

PREGUNTA DEL JUGADOR: "${pregunta}"

Responde como Raquel Staff basándote en el contexto anterior:`;

    // 4. Llamar a Gemini
    try {
        const result = await model.generateContent(prompt);
        const texto = result.response.text().trim();

        return { respuesta: texto, fuenteIA: true };

    } catch (error) {
        console.error('[ragEngine] Error al llamar a Gemini, usando fallback:', error.message);

        // 5. Fallback: si la API falla, usar la respuesta directa del mejor match
        const fallback = await searchFaq(pregunta);
        if (fallback) {
            return { respuesta: fallback.respuesta, fuenteIA: false };
        }

        return {
            respuesta: 'En este momento no puedo procesar tu consulta. ' +
                       'Por favor abre un **ticket de soporte** y un staff te ayudará. 🙏',
            fuenteIA: false,
        };
    }
}
