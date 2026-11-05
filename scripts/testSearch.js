// scripts/testSearch.js
//
// Prueba rápida del motor FAQ por consola, sin Discord de por medio.
//
//   npm run test-search "donde consigo laburo de trailero"
//   node scripts/testSearch.js "cual es el comando de gps"

import 'dotenv/config';
import { initFaqEngine, searchFaq } from '../src/faq/faqEngine.js';

const consulta = process.argv.slice(2).join(' ') || 'donde consigo laburo de trailero';

await initFaqEngine();
const resultado = await searchFaq(consulta);

console.log('\nConsulta:', consulta);
if (resultado) {
  console.log(`Match (score ${resultado.score.toFixed(3)}): "${resultado.preguntaOriginal}"`);
  console.log('Respuesta:', resultado.respuesta);
} else {
  console.log('Sin match confiable (score por debajo del umbral).');
}
