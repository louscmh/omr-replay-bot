const { getFilteredEntries } = require('../../functions/googlesheet.js');
const { createRequestListener, getResponseList, processUpload } = require('../../functions/discord.js');
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('Process approved requests for uploading to Youtube')
        .addStringOption(option =>
            option.setName('videolink')
                .setDescription('video link if manually rendered')
                .setRequired(false)),
    async execute(interaction) {
        const botMessages = [];
        const videolink = interaction.options.getString('videolink', false);
        const isManual = videolink == null ? false : true;
        const approvedEntries = await getFilteredEntries("Approved");
        await interaction.deferReply();
        let currentPage = 1
        console.log(`Amount of requests: ${approvedEntries[0].length}`);

        if (approvedEntries[0].length == 0) {
            return interaction.editReply('There are no pending requests at the moment!');
        }

        if (approvedEntries[0].length == 1) {
            const [videoMessage, embedMessage, embeds, components] = await createRequestListener(approvedEntries[0][0][7]);
            const initialVideoMessage = await interaction.editReply(videoMessage);
            botMessages.push(initialVideoMessage);
            await processUpload(interaction, approvedEntries[0][0],botMessages,isManual,videolink);
        } else {
            let [finalEmbeds, buttons] = await getResponseList(approvedEntries[0], currentPage);

            let listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
            const collectorFilter = i => i.user.id === interaction.user.id;

            while (true) {

                try {
                    let confirmation = await listResults.awaitMessageComponent({ filter: collectorFilter, time: 45_000 });
                    await confirmation.deferUpdate();

                    if (confirmation.customId === 'left_button') {
                        currentPage--;
                        [finalEmbeds, buttons] = await getResponseList(approvedEntries[0], currentPage);
                        listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
                    } else if (confirmation.customId === 'right_button') {
                        currentPage++;
                        [finalEmbeds, buttons] = await getResponseList(approvedEntries[0], currentPage);
                        listResults = await interaction.editReply({ content: "Displaying search results:", embeds: finalEmbeds, components: [buttons] });
                    } else if (/\d/.test(confirmation.customId)) {
                        let index = Number(confirmation.customId.replace(/\D/g, '')) - 1;
                        let selectedEntry = approvedEntries[0][index + ((currentPage - 1) * 3)][7];
                        const [videoMessage, embedMessage, embeds, components] = await createRequestListener(selectedEntry);
                        const initialVideoMessage = await interaction.editReply(videoMessage);
                        botMessages.push(initialVideoMessage);
                        await processUpload(interaction, approvedEntries[0][index + ((currentPage - 1) * 3)],botMessages,isManual,videolink);
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