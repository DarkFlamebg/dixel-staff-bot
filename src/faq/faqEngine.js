// src/faq/faqEngine.js
//
// Motor de búsqueda semántica local para el módulo de FAQ de Raquel Staff.
// No depende de ninguna API externa: el modelo de embeddings se descarga
// una sola vez (la primera ejecución) y luego corre 100% local.
//
// Uso típico:
//   import { initFaqEngine, searchFaq } from '../faq/faqEngine.js';
//   await initFaqEngine();
//   const resultado = await searchFaq('donde consigo laburo de trailero');

import { pipeline } from '@xenova/transformers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Los datos y cache viven en /data, separados del código fuente
const DATA_PATH  = path.resolve(__dirname, '../../data/preguntas.json');
const CACHE_PATH = path.resolve(__dirname, '../../data/embeddings.cache.json');
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Umbral de similitud de coseno por debajo del cual consideramos que
// "no hay match confiable" y el bot debe responder que no encontró
// la respuesta (en vez de inventar o devolver algo poco relacionado).
const SIMILARITY_THRESHOLD = 0.55;

let extractor = null;
let faqData = []; // [{ pregunta, respuesta, embedding: number[] }]

/**
 * Convierte un texto en su vector de embedding (normalizado).
 */
async function embed(text) {
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Similitud de coseno entre dos vectores ya normalizados
 * (si están normalizados, el producto punto ES la similitud de coseno).
 */
function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Calcula un hash simple del archivo de preguntas para saber si el
 * cache de embeddings sigue siendo válido o hay que regenerarlo.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return hash.toString(16);
}

/**
 * Inicializa el motor: carga el modelo, carga preguntas.json y
 * genera (o reutiliza desde cache) los embeddings de cada pregunta.
 */
export async function initFaqEngine() {
  console.log('[faqEngine] Cargando modelo de embeddings...');
  extractor = await pipeline('feature-extraction', MODEL_NAME);

  const raw = await fs.readFile(DATA_PATH, 'utf-8');
  const preguntas = JSON.parse(raw);
  const rawHash = simpleHash(raw);

  // Intenta reutilizar el cache si existe y corresponde al mismo JSON
  let cache = null;
  try {
    const cacheRaw = await fs.readFile(CACHE_PATH, 'utf-8');
    cache = JSON.parse(cacheRaw);
  } catch {
    cache = null;
  }

  if (cache && cache.hash === rawHash) {
    console.log('[faqEngine] Usando embeddings cacheados.');
    faqData = cache.items;
    return;
  }

  console.log(`[faqEngine] Generando embeddings para ${preguntas.length} preguntas...`);
  faqData = [];
  for (const item of preguntas) {
    const embedding = await embed(item.pregunta);
    faqData.push({ pregunta: item.pregunta, respuesta: item.respuesta, embedding });
  }

  await fs.writeFile(
    CACHE_PATH,
    JSON.stringify({ hash: rawHash, items: faqData }),
    'utf-8'
  );
  console.log('[faqEngine] Embeddings generados y cacheados en data/embeddings.cache.json');
}

/**
 * Busca la pregunta más parecida semánticamente a la consulta del usuario.
 * Devuelve { respuesta, preguntaOriginal, score } o null si no hay match confiable.
 */
export async function searchFaq(query) {
  if (!extractor) {
    throw new Error('faqEngine no inicializado: llama a initFaqEngine() primero.');
  }
  if (!query || !query.trim()) return null;

  const queryEmbedding = await embed(query);

  let best = null;
  let bestScore = -Infinity;

  for (const item of faqData) {
    const score = cosineSim(queryEmbedding, item.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < SIMILARITY_THRESHOLD) {
    return null;
  }

  return {
    respuesta: best.respuesta,
    preguntaOriginal: best.pregunta,
    score: bestScore,
  };
}

/**
 * Devuelve los top N resultados más similares a la consulta, con un umbral
 * más bajo (0.40) para maximizar el contexto disponible para la IA.
 * Usado por ragEngine para alimentar el contexto de Gemini.
 *
 * @param {string} query
 * @param {number} topN - cuántos resultados devolver (default: 4)
 * @returns {Promise<Array<{pregunta, respuesta, score}>>}
 */
export async function searchFaqContext(query, topN = 4) {
  if (!extractor) {
    throw new Error('faqEngine no inicializado: llama a initFaqEngine() primero.');
  }
  if (!query?.trim()) return [];

  const queryEmbedding = await embed(query);

  return faqData
    .map(item => ({ ...item, score: cosineSim(queryEmbedding, item.embedding) }))
    .filter(item => item.score >= 0.40)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Util para recargar preguntas.json en caliente (por ejemplo desde un
 * comando /recargar-faq de staff) sin reiniciar el proceso del bot.
 */
export async function reloadFaqData() {
  try {
    await fs.unlink(CACHE_PATH);
  } catch {
    // no había cache, no pasa nada
  }
  await initFaqEngine();
}
