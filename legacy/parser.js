// parser.js
function parseStaffTemplate(text) {
    const lines = text.split('\n');
    const staffData = {};
    let currentRank = null;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue; // Ignorar líneas vacías

        // Detectar los encabezados de rango (ej: "@• Desarrollador : 2" o similar)
        if (line.includes(':') || line.startsWith('@•') || line.startsWith('•')) {
            // Limpiamos el nombre del rango quitando emojis o menciones decorativas
            const rawRank = line.split(':')[0].replace(/[@•]/g, '').trim();
            currentRank = rawRank;
            staffData[currentRank] = [];
        } else if (currentRank) {
            // Si no es un rango y tenemos un rango activo, es un usuario
            const user = line.replace(/[@]/g, '').trim(); // Limpiar el arroba si viene como mención de texto
            staffData[currentRank].push(user);
        }
    }
    return staffData;
}

module.exports = { parseStaffTemplate };