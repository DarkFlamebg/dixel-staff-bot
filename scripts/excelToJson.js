// scripts/excelToJson.js
//
// Convierte data/Dudas samp.xlsx → data/preguntas.json
// Correr esto cada vez que actualices el Excel con nuevas dudas.
//
//   npm run excel-to-json

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH  = path.resolve(__dirname, '../data/Dudas samp.xlsx');
const OUTPUT_PATH = path.resolve(__dirname, '../data/preguntas.json');

const wb   = XLSX.readFile(EXCEL_PATH);
const hoja = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(hoja, { header: 1 });

const preguntas = rows
    .filter(r => r[1] && r[2])                       // descartar filas incompletas
    .map(r => ({
        pregunta:  String(r[1]).trim(),
        respuesta: String(r[2]).trim(),
    }));

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(preguntas, null, 2), 'utf-8');
console.log(`✅ ${preguntas.length} preguntas exportadas a data/preguntas.json`);
console.log(`   Fuente: ${EXCEL_PATH}`);
