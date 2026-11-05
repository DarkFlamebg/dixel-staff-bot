// faqEngine.js
//
// Motor de busqueda semantica local para el modulo de FAQ de Raquel Staff.
// No depende de ninguna API externa: el modelo de embeddings se descarga
// una sola vez (la primera ejecucion) y luego corre 100% local.
//
// Uso tipico:
//   import { initFaqEngine, searchFaq } from './faqEngine.js';
//   await initFaqEngine();
//   const resultado = await searchFaq('donde consigo laburo de trailero');

import { pipeline } from '@xenova/transformers';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.resolve('./preguntas.json');
const CACHE_PATH = path.resolve('./embeddings.cache.json');
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Umbral de similitud de coseno por debajo del cual consideramos que
// "no hay match confiable" y el bot debe responder que no encontro
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
 * (si estan normalizados, el producto punto ES la similitud de coseno).
 */
function cosineSim(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * Calcula un hash simple del archivo de preguntas para saber si el
 * cache de embeddings sigue siendo valido o hay que regenerarlo.
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
  console.log('[faqEngine] Embeddings generados y cacheados en embeddings.cache.json');
}

/**
 * Busca la pregunta mas parecida semanticamente a la consulta del usuario.
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
 * Util para recargar preguntas.json en caliente (por ejemplo desde un
 * comando /recargar-faq de staff) sin reiniciar el proceso del bot.
 */
export async function reloadFaqData() {
  try {
    await fs.unlink(CACHE_PATH);
  } catch {
    // no habia cache, no pasa nada
  }
  await initFaqEngine();
}
