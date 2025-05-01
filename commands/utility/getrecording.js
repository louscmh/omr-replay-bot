const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { reprocessAttachment, downloadFile } = require('../../functions/discord.js');
const { SlashCommandBuilder } = require('discord.js');
const { getEntryByRenderID } = require('../../functions/googlesheet.js');
const { getPostData, getFullSkinInfo, getCustomSkinInfo } = require('../../functions/ordr.js');
const AdmZip = require('adm-zip');

const paths = {
    songs: "C:\\Users\\louis\\AppData\\Local\\osu_record\\Songs",
    skins: "C:\\Users\\louis\\AppData\\Local\\osu_record\\Skins",
    replays: "C:\\Users\\louis\\AppData\\Local\\osu_record\\Replays"
};

// Ensure the directories exist
Object.values(paths).forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getrecording')
        .setDescription('Get recording')
        .addStringOption(option =>
            option.setName('renderid')
                .setDescription('Enter the Render ID')
                .setRequired(true)),
    async execute(interaction) {
        await interaction.deferReply();
        const renderID = interaction.options.getString('renderid', true);

        try {
            const entryData = await getEntryByRenderID(renderID);
            const postData = await getPostData(renderID);
            let isCustom = /^[0-9]+$/.test(String(entryData[0][3]));
            const customSkin = isCustom ? await getCustomSkinInfo(Number(entryData[0][3])) : null;
            const normalSkin = await getFullSkinInfo(entryData[0][3]);
            isCustom = customSkin != null;

            // File paths
            const songPath = path.join(paths.songs, `${renderID}.osz`);
            const replayPath = path.join(paths.replays, `${renderID}.osr`);
            const skinPath = path.join(paths.skins, isCustom ? `${renderID}_custom.osk` : `${renderID}_normal.osk`);

            // Download files
            await downloadFile(postData.mapLink, songPath);
            await downloadFile(entryData[0][2], replayPath);
            await downloadFile(isCustom ? customSkin.downloadLink : normalSkin.url, skinPath);
            // After downloading the skin file to skinPath...
            await extractSkinFolder(skinPath, paths.skins);

            await interaction.editReply(`Downloaded files:\n-**Map Link:** ${postData.mapLink}\n-**Replay Link:** ${entryData[0][2]}\n-**Skin Link:** ${isCustom ? customSkin.downloadLink : normalSkin.url}`);
        } catch (error) {
            console.error(error);
            await interaction.editReply("Failed to download.");
        }
    },
};

async function extractSkinFolder(skinFilePath, destination) {
    try {
        const zip = new AdmZip(skinFilePath);
        // Use the base name of the .osk file as the folder name
        const baseName = path.basename(skinFilePath, path.extname(skinFilePath));
        const extractionPath = path.join(destination, baseName);

        // If the extraction path exists and is a file, remove it
        if (fs.existsSync(extractionPath)) {
            if (fs.lstatSync(extractionPath).isFile()) {
                fs.unlinkSync(extractionPath);
            }
        }
        // Create the folder (this will have no effect if it already exists as a folder)
        fs.mkdirSync(extractionPath, { recursive: true });

        // Extract the zip contents into the newly created folder
        zip.extractAllTo(extractionPath, true);
        console.log(`Skin extracted to folder: ${extractionPath}`);
    } catch (error) {
        console.error('Error extracting skin folder:', error);
    }
}
