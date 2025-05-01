const { generateDownloadLink } = require('../../functions/ordr.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generatevideo')
        .setDescription('get video download')
        .addStringOption(option =>
            option.setName('renderid')
                .setDescription('ababa')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const renderID = interaction.options.getString('renderid', true);
        // console.table(pendingEntries);
        const result = await generateDownloadLink(Number(renderID));
        await interaction.editReply(String(result));
    }
};