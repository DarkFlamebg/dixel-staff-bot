// src/commands/apelacion.js
//
// /apelacion <número o personaje> — ficha de solo lectura de una apelación.
// La respuesta solo la ve quien usa el comando.

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { apiGet } from '../apelaciones/api.js';
import { embedApelacion, embedListaResultados } from '../apelaciones/embeds.js';

export const data = new SlashCommandBuilder()
    .setName('apelacion')
    .setDescription('Consulta una apelación de desbaneo (solo lectura).')
    .addStringOption((option) =>
        option
            .setName('busqueda')
            .setDescription('Número de apelación (ej: 208) o nombre del personaje (ej: Nombre_Apellido)')
            .setRequired(true)
            .setMaxLength(60),
    )
    // Por defecto solo staff; se puede ajustar en Ajustes del servidor > Integraciones
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const busqueda = interaction.options.getString('busqueda').trim();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const { resultados } = await apiGet({ accion: 'buscar', q: busqueda });

        if (!resultados.length) {
            await interaction.editReply(`No encontré ninguna apelación para **${busqueda}**.`);
        } else if (resultados.length === 1) {
            await interaction.editReply({ embeds: [embedApelacion(resultados[0])] });
        } else {
            await interaction.editReply({ embeds: [embedListaResultados(busqueda, resultados)] });
        }
    } catch (error) {
        console.error('Error en /apelacion:', error);
        await interaction.editReply('No pude consultar las apelaciones ahora mismo. Inténtalo en un momento.');
    }
}
