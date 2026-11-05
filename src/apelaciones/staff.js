// src/apelaciones/staff.js
//
// Quién puede usar los comandos de apelaciones.
// APELACIONES_ROLES_STAFF: IDs de roles separados por comas (ej: el rol "Staff").
// Los administradores del servidor siempre pueden. Si la variable está vacía,
// se permite a quien tenga el permiso "Gestionar mensajes".

import { PermissionFlagsBits, MessageFlags } from 'discord.js';

export function esStaff(interaction) {
    const member = interaction.member;
    if (!member) return false;

    const permisos = interaction.memberPermissions;
    if (permisos?.has(PermissionFlagsBits.Administrator)) return true;

    const roles = (process.env.APELACIONES_ROLES_STAFF || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    if (!roles.length) return permisos?.has(PermissionFlagsBits.ManageMessages) ?? false;

    // member puede ser GuildMember (roles.cache) o datos crudos de la API (array de IDs)
    const delMiembro = member.roles?.cache ? [...member.roles.cache.keys()] : (member.roles ?? []);
    return roles.some((id) => delMiembro.includes(id));
}

/** Responde en privado que el comando es solo para staff. Devuelve true si se bloqueó. */
export async function bloquearSiNoEsStaff(interaction) {
    if (esStaff(interaction)) return false;
    await interaction.reply({
        content: '🔒 Este comando es solo para el staff.',
        flags: MessageFlags.Ephemeral,
    });
    return true;
}
