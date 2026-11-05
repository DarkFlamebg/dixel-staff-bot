// scripts/buildIndex.js
//
// Pre-genera embeddings.cache.json en data/ antes de desplegar.
// Así el arranque del bot en Render es instantáneo.
//
//   npm run build-index

import { initFaqEngine } from '../src/faq/faqEngine.js';

await initFaqEngine();
console.log('✅ Índice de embeddings listo en data/embeddings.cache.json');
