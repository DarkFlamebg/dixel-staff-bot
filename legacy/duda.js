// commands/duda.js
//
// Comando /duda para discord.js v14. Asume que faqEngine ya fue
// inicializado en el arranque del bot (ver index.js de ejemplo abajo).

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { searchFaq } from '../faqEngine.js';

export const data = new SlashCommandBuilder()
  .setName('duda')
  .setDescription('Pregunta cualquier duda sobre Dixel RP (comandos, trabajos, reglas, economia, etc).')
  .addStringOption((option) =>
    option
      .setName('pregunta')
      .setDescription('Escribe tu duda como si le preguntaras a un staff')
      .setRequired(true)
  );

export async function execute(interaction) {
  const pregunta = interaction.options.getString('pregunta');
  await interaction.deferReply();

  const resultado = await searchFaq(pregunta);

  if (!resultado) {
    await interaction.editReply({
      content:
        'No encontre una respuesta oficial para eso. Puedes reformular tu pregunta o abrir un ticket en #soporte para que un staff te ayude.',
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle('📌 Raquel responde')
    .setDescription(resultado.respuesta)
    .setFooter({ text: `Basado en: "${resultado.preguntaOriginal}"` });

  await interaction.editReply({ embeds: [embed] });
}
