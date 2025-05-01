const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { testServer } = require('../data/config.json');
const { Client, GatewayIntentBits } = require('discord.js');
const { generateThumbnail } = require('./thumbnail.js');
const client = require('../client.js');
const announcement = require('./public.js');
const fs = require('fs');
const axios = require('axios');

async function getUploadChannel() {

    const regex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)/;
    const match = testServer.match(regex);

    if (match) {
        const guildId = match[1];
        const channelId = match[2];

        // console.log(guildId, channelId)

        try {
            // Fetch the guild
            const guild = client.guilds.cache.get(guildId);
            if (!guild) {
                throw new Error("Guild not found or the bot is not a member.");
            }

            // Fetch the channel within the guild
            const channel = guild.channels.cache.get(channelId);
            // Check if the channel is a text channel
            if (!channel) {
                return console.error("Channel not found or it is not a text channel.");
            }

            return channel;
        } catch (error) {
            console.error("Error fetching the message:", error);
        }
    } else {
        console.error("Invalid message link format in config.");
    }
}

async function notifyNewRequest(renderID) {
    // try {
    console.log(renderID);
    const channel = await getUploadChannel();
    const [videoMessage, embedMessage, a, b] = await generateRequestEmbed(renderID, [], true);

    await channel.send(videoMessage);
    await channel.send(embedMessage);
    await announcement.publishNewRequest(renderID);
}

async function createRequestListener(renderID) {
    try {
        const confirm = new ButtonBuilder()
            .setCustomId('confirm')
            .setLabel('Confirm')
            .setStyle(ButtonStyle.Success);
        const cancel = new ButtonBuilder()
            .setCustomId('cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);
        const row = new ActionRowBuilder()
            .addComponents(confirm, cancel)
        return await generateRequestEmbed(renderID, [row]);
    } catch (error) {
        console.error(`createRequestListener Error: ${error}`);
    }
}

async function generateRequestEmbed(renderID, components = [], mention = false) {
    try {
        const { getPostData } = require('./ordr.js');
        const { getUserDataSet } = require('./osu.js');
        const { getEntryByRenderID } = require('./googlesheet.js');
        const renderData = await getPostData(renderID);
        const entryData = await getEntryByRenderID(renderID);
        const userData = await getUserDataSet(entryData[0][1]);
        const timestamp = new Date(entryData[0][0]).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });;
        // console.log(timestamp); // outputs the timestamp in milliseconds
        let embed = new EmbedBuilder()
            .setAuthor({
                name: `OMR Request by ${userData.username}`,
                url: `https://osu.ppy.sh/users/${userData.user_id}`,
            })
            .setTitle(renderData.title)
            .setDescription(`[Map Link](https://osu.ppy.sh/beatmapsets/${renderData.mapID}) · [Replay Link](${renderData.videoUrl})\n▸**Bancho Rank:** #${Number(userData.pp_rank).toLocaleString()}\n▸**Country Rank:** ${userData.country}#${Number(userData.pp_country_rank).toLocaleString()}\n▸**Playcount:** ${Number(userData.playcount).toLocaleString()}\n▸**Accuracy:** ${Number(userData.accuracy).toFixed(2)}%\n▸**Join Date:** ${userData.join_date}\n`)
            .setThumbnail(`http://s.ppy.sh/a/${userData.user_id}?751`)
            .setColor("#8accec")
            .setFooter({
                text: `Request made at ${timestamp} · Render ID: ${renderID}`,
                iconURL: "https://lous.s-ul.eu/lOdCVZYI",
            });

        if (entryData[0][4] != "") {
            embed.addFields(
                {
                    name: "Request Reason",
                    value: entryData[0][4],
                    inline: false
                },
            );
        }

        const videoMessage = { content: `${mention ? "<@308083236071014402> <@162747663396241408> " : ""}${renderData.videoUrl}`, embeds: [], components: [] };
        const embedMessage = { content: "", embeds: [embed], components: components };
        return [videoMessage, embedMessage, embed, components];
    } catch (error) {
        console.error(`generateRequestEmbed Error: ${error}`);
        return [null, null, null, null];
    }
}

async function getResponseList(data, page) {
    const pageAmount = 3;
    const amountToDisplay = Math.min(data.length - ((page - 1) * pageAmount), pageAmount);
    // console.log(amountToDisplay);

    let finalEmbeds = [];
    let buttons = new ActionRowBuilder()

    if (page != 1) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId('left_button')
                .setLabel('<')
                .setStyle(ButtonStyle.Secondary));
    }

    for (let i = 0; i < amountToDisplay; i++) {
        const entry = data[i + pageAmount * (page - 1)]
        const [a, b, embedMessage, c] = await generateRequestEmbed(entry[7]);
        finalEmbeds.push(embedMessage);
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId(`response_${i + 1}`)
                .setLabel(`Request ${i + 1}`)
                .setStyle(ButtonStyle.Secondary));
    }

    if (data.length - ((page - 1) * pageAmount) > pageAmount) {
        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId('right_button')
                .setLabel('>')
                .setStyle(ButtonStyle.Secondary));
    }

    return [finalEmbeds, buttons]
}

async function processRequestResults(interaction, data, embeds, status, notes, components) {
    const { processRequestResults } = require('./googlesheet.js');
    try {
        const confirmationEmbeds = [];
        let confirmationEmbed = new EmbedBuilder()
            .setAuthor({
                name: "Request Confirmation",
            })
            .setTitle(`Results: ${status == "approved" ? "Approved" : "Rejected"}`)
            .setDescription(`**Additional Notes: **${notes == null ? "N.A" : `${notes}${notes == "" ? "" : ` - <@${interaction.user.id}>`}`}`)
            .setColor(`#${status == "approved" ? "008000" : "ff0000"}`);

        confirmationEmbeds.push(confirmationEmbed);
        confirmationEmbeds.push(embeds);
        let embedMessage = { content: "", embeds: confirmationEmbeds, components: components }

        targettedRequestResponse = await interaction.channel.send(embedMessage);
        const collectorFilter = i => i.user.id === interaction.user.id;
        let confirmation = await targettedRequestResponse.awaitMessageComponent({ filter: collectorFilter, time: 45_000 });
        await confirmation.deferUpdate();

        if (confirmation.customId === 'confirm') {
            await processRequestResults(status == "approved" ? true : false, data, notes);
            await interaction.editReply({ content: "Request processed successfully!", embeds: [], components: [] });
            await status == "approved" ? announcement.publishApprovedRequest(data[7], notes == null ? "N.A" : notes, interaction.user.tag) : announcement.publishFailedRequest(data[7], notes == null ? "N.A" : notes, interaction.user.tag);
            await targettedRequestResponse.delete();
            return;
        } else if (confirmation.customId === 'cancel') {
            await targettedRequestResponse.delete();
            await interaction.editReply({ content: "Canceled operation.", embeds: [], components: [] });
            return;
        }
    } catch (e) {
        console.error(`Error: ${e}`);
    }
}

async function processUpload(interaction, entryData, botMessages,isManual=false, customLink=null) {
    const { uploadVideo } = require("./youtube.js");
    const { generateDownloadLink } = require("./ordr.js");
    const { processSheetUpload } = require("./googlesheet.js");
    let buttonMessage;
    try {
        const videoUrl = await generateDownloadLink(entryData[7]);
        const ppMessage = await interaction.followUp('Please enter the PP to be displayed on the thumbnail:');
        botMessages.push(ppMessage);
        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 }); // 30-second timeout

        collector.on('collect', async m => {
            try {
                const ppValue = parseInt(m.content, 10);
                console.log(ppValue);
                if (isNaN(ppValue)) {
                    await m.reply('Reply is not a valid numeral, cancelling...');
                    for (const msg of botMessages) {
                        try {
                            await msg.delete();
                        } catch (err) {
                            console.error(`Failed to delete message: ${err}`);
                        }
                    }
                    return;
                }

                const [thumbnail, userdata, renderdata, mapdata] = await generateThumbnail(entryData, ppValue);
                const [embed, youtubetitle, youtubedesc] = await generateUploadResults(thumbnail, entryData, userdata, renderdata, ppValue);

                const confirm = new ButtonBuilder()
                    .setCustomId('confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success);
                const cancel = new ButtonBuilder()
                    .setCustomId('cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary);
                const row = new ActionRowBuilder().addComponents(confirm, cancel);

                // Capture the reply message that includes the buttons.
                buttonMessage = await m.reply({ content: "", embeds: [embed], components: [row] });

                // Use interaction.user.id for filtering button interactions.
                const collectorFilter = i => i.user.id === interaction.user.id;
                const confirmation = await buttonMessage.awaitMessageComponent({ filter: collectorFilter, time: 45000 });
                await confirmation.deferUpdate();

                if (confirmation.customId === 'confirm') {
                    await buttonMessage.edit({ content: `Uploading video...`, embeds: [], components: [] });
                    const results = await uploadVideo(isManual ? customLink : videoUrl, thumbnail, youtubetitle, youtubedesc);
                    await processSheetUpload(entryData, `https://www.youtube.com/watch?v=${String(results[0])}`)
                    setTimeout(async function () {
                        await buttonMessage.edit({ content: `Video uploaded successfully: https://www.youtube.com/watch?v=${String(results[0])}`, embeds: [], components: [] });
                        await announcement.publishUpload(entryData[7], thumbnail);
                        for (const msg of botMessages) {
                            try {
                                await msg.delete();
                            } catch (err) {
                                console.error(`Failed to delete message: ${err}`);
                            }
                        }
                    }, 20000);
                } else if (confirmation.customId === 'cancel') {
                    await buttonMessage.edit({ content: "Canceled operation.", embeds: [], components: [] });
                    for (const msg of botMessages) {
                        try {
                            await msg.delete();
                        } catch (err) {
                            console.error(`Failed to delete message: ${err}`);
                        }
                    }
                }
            } catch (e) {
                console.error(`Error: ${e}`);
                if (buttonMessage != null) await buttonMessage.edit({ content: "Process has elapsed.", embeds: [], components: [] });
                for (const msg of botMessages) {
                    try {
                        await msg.delete();
                    } catch (err) {
                        console.error(`Failed to delete message: ${err}`);
                    }
                }
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                await interaction.followUp('Process has elapsed.');
            }
        });
    } catch (e) {
        console.error(`Error: ${e}`);
    }
}


async function generateUploadResults(thumbnail, entryData, userdata, renderdata, ppValue) {
    const { getFullSkinInfo, getCustomSkinInfo } = require("./ordr.js");
    let isCustom = /^[0-9]+$/.test(String(entryData[3]));
    const customSkin = isCustom ? await getCustomSkinInfo(Number(entryData[3])) : null;
    const normalSkin = await getFullSkinInfo(entryData[3]);
    console.table(normalSkin);
    isCustom = customSkin == null ? false : true;
    try {
        const skinName = isCustom ? customSkin.downloadLink : normalSkin.url;
        const rawTitle = `${await convertThumbnailString(renderdata.title)} ${ppValue}pp`;
        const youtubeTitle = await shortenString(rawTitle);
        const timestamp = new Date(entryData[0]).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });;
        const youtubeDescription = `PLAY DETAILS \n\n▸ Player: https://osu.ppy.sh/users/${userdata.user_id}\n▸ Map: https://osu.ppy.sh/beatmapsets/${renderdata.mapID}\n▸ Skin: ${skinName}\n▸ Submission link : https://forms.gle/XsvFiKybDXKkKpmN9`

        const embed = new EmbedBuilder()
            .setAuthor({
                name: "Upload confirmation",
            })
            .setDescription(`[Map Link](https://osu.ppy.sh/beatmapsets/${renderdata.mapID}) · [Replay Link](${renderdata.videoUrl})`)
            .addFields(
                {
                    name: "▸ Youtube Title",
                    value: youtubeTitle,
                    inline: false
                },
                {
                    name: "▸ Youtube Description",
                    value: youtubeDescription,
                    inline: false
                },
            )
            .setImage(thumbnail)
            .setColor("#f400c7")
            .setFooter({
                text: `Request made at ${timestamp} · Render ID: ${entryData[7]}`,
                iconURL: "https://lous.s-ul.eu/lOdCVZYI",
            })
            .setTimestamp();

        return [embed, youtubeTitle, youtubeDescription];
    } catch (e) {
        console.error('generateUploadResults Error:', e);
        return null;
    }
}

async function convertThumbnailString(input) {
    // This regex does the following:
    // 1. ^\[.*?\]         -> Match the opening square bracket, some content (non-greedy), and closing bracket (rating)
    // 2. \s*(.*?)\s*      -> Capture the username (trimmed)
    // 3. \|\s*            -> Match a pipe (|) with optional surrounding whitespace
    // 4. (.*?)            -> Capture the beatmap details (artist, title, difficulty, etc.) non-greedily
    // 5. (?:\s+(\+\w+))?   -> Optionally capture the mods string (e.g. +HDDT)
    // 6. \s+([\d\.]+%)$   -> Capture the accuracy (e.g. 99.11%) at the very end
    const regex = /^\[.*?\]\s*(.*?)\s*\|\s*(.*?)(?:\s+(\+\w+))?\s+([\d\.]+%)$/;
    const match = input.match(regex);

    if (!match) {
        throw new Error("Input string did not match the expected format.");
    }

    const username = match[1].trim();
    const details = match[2].trim();
    const mods = match[3] ? match[3].trim() : "";
    const accuracy = match[4].trim();

    // Build the output:
    // Always start with "osu! | ", then username, then details.
    // If mods exist, append them; finally wrap accuracy in parentheses.
    let output = `osu! | ${username} | ${details}`;
    if (mods) {
        output += ` ${mods}`;
    }
    output += ` (${accuracy})`;

    return output;
}

async function shortenString(input) {
    if (input.length < 100) return input; // If already under 100 characters, return as is.
  
    const endRegex = /(\s\+?[A-Z]*\s?\([\d.]+%\)\s\d+pp)$/; // Match "+EZDT (95.38%) 129pp" or similar
    const match = input.match(endRegex);
  
    if (!match) {
        // If no recognizable ending, just truncate normally
        return input.slice(0, 96) + "...";
    }
  
    const ending = match[0]; // Extract the ending part
    const maxLength = 99 - ending.length - 3; // 99 chars total - ending length - "..."
  
    if (maxLength <= 0) {
        // If the ending itself is too long, return as much as possible
        return input.slice(0, 96) + "...";
    }
  
    return input.slice(0, maxLength) + "..." + ending;
  }

async function reprocessAttachment(url) {
    const channel = await getUploadChannel();
    const sentMessage = await channel.send(url);

    // Wait for Discord to regenerate the preview
    setTimeout(async () => {
        // Fetch the message again to get the refreshed URL
        const fetchedMessage = await channel.messages.fetch(sentMessage.id);
        const newUrl = fetchedMessage.embeds[0]?.url || fetchedMessage.content;

        if (newUrl !== url) {
            console.log(`New URL detected: ${newUrl}`);
            // Retry downloading with the new link
            await downloadFile(newUrl, "C:\\Users\\louis\\AppData\\Local\\osu_record\\Songs");
            await sentMessage.delete();
        } else {
            console.log("Failed to regenerate a valid link.");
        }
    }, 3000); // Wait a few seconds for Discord to process the message
}

async function downloadFile(url, outputPath) {
    try {
        const writer = fs.createWriteStream(outputPath);
        const response = await axios.get(url, { responseType: 'stream' });
        response.data.pipe(writer);
    
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (e) {
        console.error(`Error while trying to download file: ${e}`);
        if (url.startsWith("https://cdn.discordapp.com/attachments/")) {
            await reprocessAttachment(url);
        }
    }
}

module.exports = {
    notifyNewRequest,
    createRequestListener,
    getResponseList,
    processRequestResults,
    processUpload,
    reprocessAttachment,
    downloadFile
};