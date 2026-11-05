// src/commands/apelaciones.js
//
// /apelaciones — resumen de solo lectura: totales por estado, más apoyadas y más antiguas.

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { apiGet } from '../apelaciones/api.js';
import { embedResumen } from '../apelaciones/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('apelaciones')
    .setDescription('Resumen de las apelaciones de desbaneo (solo lectura).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
        const resumen = await apiGet({ accion: 'resumen' });
        await interaction.editReply({ embeds: [embedResumen(resumen)] });
    } catch (error) {
        console.error('Error en /apelaciones:', error);
        await interaction.editReply('No pude consultar las apelaciones ahora mismo. Inténtalo en un momento.');
    }
}
