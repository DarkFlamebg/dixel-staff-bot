// src/commands/apelaciones.js
//
// /apelaciones — resumen de solo lectura: totales por estado, más apoyadas y más antiguas.
// Solo el staff puede usarlo; la respuesta la ve todo el canal.

import { SlashCommandBuilder, InteractionContextType, MessageFlags } from 'discord.js';
import { apiGet } from '../apelaciones/api.js';
import { embedResumen } from '../apelaciones/embeds.js';
import { bloquearSiNoEsStaff } from '../apelaciones/staff.js';

export const data = new SlashCommandBuilder()
    .setName('apelaciones')
    .setDescription('Resumen de las apelaciones de desbaneo (solo staff).')
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction) {
    if (await bloquearSiNoEsStaff(interaction)) return;

    await interaction.deferReply();
    try {
        const resumen = await apiGet({ accion: 'resumen' });
        const solicitante = interaction.member ?? interaction.user;
        await interaction.editReply({ embeds: [embedResumen(resumen, { solicitante })] });
    } catch (error) {
        console.error('Error en /apelaciones:', error);
        await interaction.deleteReply().catch(() => {});
        await interaction.followUp({
            content: 'No pude consultar las apelaciones ahora mismo. Inténtalo en un momento.',
            flags: MessageFlags.Ephemeral,
        });
    }
}
