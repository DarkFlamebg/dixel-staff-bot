// src/commands/apelacion.js
//
// /apelacion <número o personaje> — ficha de solo lectura de una apelación.
// Solo el staff puede usarlo; la respuesta la ve todo el canal.

import { SlashCommandBuilder, InteractionContextType, MessageFlags } from 'discord.js';
import { apiGet } from '../apelaciones/api.js';
import { embedApelacion, embedListaResultados } from '../apelaciones/embeds.js';
import { bloquearSiNoEsStaff } from '../apelaciones/staff.js';

export const data = new SlashCommandBuilder()
    .setName('apelacion')
    .setDescription('Muestra una apelación de desbaneo (solo staff).')
    .addStringOption((option) =>
        option
            .setName('busqueda')
            .setDescription('Número de apelación (ej: 208) o nombre del personaje (ej: Nombre_Apellido)')
            .setRequired(true)
            .setMaxLength(60),
    )
    .setContexts(InteractionContextType.Guild);

export async function execute(interaction) {
    if (await bloquearSiNoEsStaff(interaction)) return;

    const busqueda = interaction.options.getString('busqueda').trim();
    await interaction.deferReply();

    try {
        const { resultados } = await apiGet({ accion: 'buscar', q: busqueda });
        const solicitante = interaction.member ?? interaction.user;

        if (!resultados.length) {
            await interaction.deleteReply().catch(() => {});
            await interaction.followUp({
                content: `No encontré ninguna apelación para **${busqueda}**.`,
                flags: MessageFlags.Ephemeral,
            });
        } else if (resultados.length === 1) {
            await interaction.editReply({ embeds: [embedApelacion(resultados[0], solicitante)] });
        } else {
            await interaction.editReply({ embeds: [embedListaResultados(busqueda, resultados, solicitante)] });
        }
    } catch (error) {
        console.error('Error en /apelacion:', error);
        await interaction.deleteReply().catch(() => {});
        await interaction.followUp({
            content: 'No pude consultar las apelaciones ahora mismo. Inténtalo en un momento.',
            flags: MessageFlags.Ephemeral,
        });
    }
}
