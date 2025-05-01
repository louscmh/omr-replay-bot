const { getCustomSkinInfo } = require('../../functions/ordr.js');
const { createRequestListener, getResponseList, processRequestResults } = require('../../functions/discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getcustomskin')
        .setDescription('get custom skin')
        .addStringOption(option =>
            option.setName('skin')
                .setDescription('ababa')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const skin = interaction.options.getString('skin', true);
        // console.table(pendingEntries);
        const result = await getCustomSkinInfo(Number(skin));
        // console.table(result);
        await interaction.editReply("```json\n" + JSON.stringify(result, null, 2) + "\n```");
    }
};