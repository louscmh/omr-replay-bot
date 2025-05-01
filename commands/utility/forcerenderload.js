const { forceLoad } = require('../../functions/ordr.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('forcerenderload')
        .setDescription('Force load a render that was not detected')
        .addStringOption(option =>
            option.setName('renderid')
                .setDescription('Enter the Render ID')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const renderID = interaction.options.getString('renderid', true);
        await forceLoad(renderID);
        await interaction.editReply(`Force loaded Render ${renderID}.`);
    }
};