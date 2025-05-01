const { getFilteredEntries } = require('../../functions/googlesheet.js');
const { createRequestListener, getResponseList, processRequestResults } = require('../../functions/discord.js');
const { ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('review')
        .setDescription('Review an OMR Request')
        .addStringOption(option =>
            option.setName('status')
                .setDescription('Select whether the request is approved or rejected')
                .setRequired(true)
                .addChoices(
                    { name: 'Approved', value: 'approved' },
                    { name: 'Rejected', value: 'rejected' }
                ))
        .addStringOption(option =>
            option.setName('notes')
                .setDescription('Additional notes to add')
                .setRequired(false)),
    async execute(interaction) {

        const pendingEntries = await getFilteredEntries("Pending Approval");
        const status = interaction.options.getString('status', true);
        const notes = interaction.options.getString('notes', false);
        // console.table(pendingEntries);
        await interaction.deferReply();
        let currentPage = 1
        // console.log(`Amount of requests: ${pendingEntries[0].length}`);

        if (pendingEntries[0].length == 0) {
            return interaction.editReply('There are no pending requests at the moment!');
        }

        if (pendingEntries[0].length == 1) {
            const [videoMessage, embedMessage, embeds, components] = await createRequestListener(pendingEntries[0][0][7]);
            await interaction.editReply(videoMessage);
            await processRequestResults(interaction, pendingEntries[0][0], embeds, status, notes, components);
        } else {
            let [finalEmbeds, buttons] = await getResponseList(pendingEntries[0], currentPage);

            let listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
            const collectorFilter = i => i.user.id === interaction.user.id;

            while (true) {

                try {
                    let confirmation = await listResults.awaitMessageComponent({ filter: collectorFilter, time: 45_000 });
                    await confirmation.deferUpdate();

                    if (confirmation.customId === 'left_button') {
                        currentPage--;
                        [finalEmbeds, buttons] = await getResponseList(pendingEntries[0], currentPage);
                        listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
                    } else if (confirmation.customId === 'right_button') {
                        currentPage++;
                        [finalEmbeds, buttons] = await getResponseList(pendingEntries[0], currentPage);
                        listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
                    } else if (/\d/.test(confirmation.customId)) {
                        let index = Number(confirmation.customId.replace(/\D/g, '')) - 1;
                        // console.log(index);
                        // console.log(currentPage);
                        // console.log(index + ((currentPage - 1) * 3));
                        let selectedEntry = pendingEntries[0][index + ((currentPage - 1) * 3)][7];
                        const [videoMessage, embedMessage, embeds, components] = await createRequestListener(selectedEntry);
                        await interaction.editReply(videoMessage);
                        await processRequestResults(interaction, pendingEntries[0][index + ((currentPage - 1) * 3)], embeds, status, notes, components);
                        return;
                    }
                } catch (e) {
                    console.error(`Error: ${e}`);
                    await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [] });
                    return;
                }
            }
        }
    }
};