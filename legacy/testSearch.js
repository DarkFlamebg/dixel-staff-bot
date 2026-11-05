// testSearch.js
// Prueba rapida por consola, sin Discord de por medio.
//   node testSearch.js "donde consigo laburo de trailero"

import { initFaqEngine, searchFaq } from './faqEngine.js';

const consulta = process.argv.slice(2).join(' ') || 'donde consigo laburo de trailero';

await initFaqEngine();
const resultado = await searchFaq(consulta);

console.log('\nConsulta:', consulta);
if (resultado) {
  console.log(`Match (score ${resultado.score.toFixed(3)}): "${resultado.preguntaOriginal}"`);
  console.log('Respuesta:', resultado.respuesta);
} else {
  console.log('Sin match confiable.');
}
