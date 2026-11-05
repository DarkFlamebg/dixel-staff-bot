require('dotenv').config();
const key = process.env.GEMINI_API_KEY;
console.log('Key (primeros 12):', key?.substring(0, 12) + '...');

import('@google/generative-ai').then(async ({ GoogleGenerativeAI }) => {
    const genAI = new GoogleGenerativeAI(key);

    // Probar los tres modelos disponibles
    const modelos = ['gemini-1.5-flash', 'gemini-1.5-flash-8b', 'gemini-1.5-pro'];

    for (const nombre of modelos) {
        try {
            const m = genAI.getGenerativeModel({ model: nombre });
            const r = await m.generateContent('Di solo "OK"');
            console.log(`✅ ${nombre}: ${r.response.text().trim()}`);
        } catch(e) {
            const status = e.status ?? e.message.match(/\[(\d+)/)?.[1] ?? '?';
            const limit  = e.message.match(/limit: (\d+)/)?.[1] ?? '?';
            console.error(`❌ ${nombre}: HTTP ${status} | limit=${limit}`);
        }
    }
});
