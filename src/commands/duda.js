// src/commands/duda.js
//
// Comando /duda para discord.js v14.
// Usa ragEngine (Gemini + FAQ local) para generar respuestas contextualizadas.

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { askRaquel } from '../faq/ragEngine.js';

export const data = new SlashCommandBuilder()
  .setName('duda')
  .setDescription('Pregunta cualquier duda sobre Dixel RP (comandos, trabajos, reglas, economía, etc).')
  .addStringOption((option) =>
    option
      .setName('pregunta')
      .setDescription('Escribe tu duda como si le preguntaras a un amigo del servidor')
      .setRequired(true)
  );

export async function execute(interaction) {
  const pregunta = interaction.options.getString('pregunta');
  await interaction.deferReply();

  const { respuesta, fuenteIA } = await askRaquel(pregunta);

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('💬 Raquel responde')
    .setDescription(respuesta)
    .setFooter({
      text: fuenteIA
        ? 'Respuesta generada por IA · Basada en la base de datos de Dixel RP'
        : 'Respuesta directa de la base de datos de Dixel RP',
    });

  await interaction.editReply({ embeds: [embed] });
}
