// buildIndex.js
//
// Corre esto una vez (o cada vez que actualices preguntas.json) para
// pre-generar embeddings.cache.json. Asi el arranque del bot en Render
// es instantaneo y no depende de generar embeddings en caliente.
//
//   npm run build-index

import { initFaqEngine } from './faqEngine.js';

await initFaqEngine();
console.log('Indice de embeddings listo.');
