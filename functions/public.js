const { EmbedBuilder, TextChannel } = require('discord.js');
const client = require('../client.js');
const { getPostData } = require('./ordr.js');
const { getUserDataSet } = require('./osu.js');
const { getEntryByRenderID } = require('./googlesheet.js');
const { announcementChannelId,loggingChannelId } = require('../data/config.json');

class PublicAnnouncement {
    constructor(announcementChannel = announcementChannelId, loggingChannel = loggingChannelId) {
        this.announcementChannel = announcementChannel;
        this.loggingChannel = loggingChannel;
    }

    async sendEmbed({ title, description, color = 0x0099ff, fields = [], author = null, footer = null, image = null, thumbnail = null, footertext = "", isAnnouncement = false}) {
        const channel = await this.getChannel(isAnnouncement);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp()

        if (fields.length) embed.addFields(fields);
        if (author) embed.setAuthor(author);
        if (footer) embed.setFooter(footer);
        if (image) embed.setImage(image);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await channel.send({ embeds: [embed] });
    }

    async publishNewRequest(renderID) {
        const [renderData, entryData, userData] = await this.getRenderDetails(renderID);
        const requestData = {
            author: {
                name: `New OMR Request by ${userData.username}`,
                url: `https://osu.ppy.sh/users/${userData.user_id}`,
            },
            title: renderData.title,
            description: `[Map Link](https://osu.ppy.sh/beatmapsets/${renderData.mapID}) · [Replay Link](${renderData.videoUrl}) · [Submission Form](https://forms.gle/XsvFiKybDXKkKpmN9)`,
            color: "#8accec",
            footer: {
                text: `Render ID: ${renderID}`,
                iconURL: `https://lous.s-ul.eu/lOdCVZYI`
            },
            thumbnail: `https://b.ppy.sh/thumb/${renderData.mapID}l.jpg`,
            isAnnouncement: false
        }
        if (entryData[4] != "") {
            requestData.fields = [
                {
                    name: "Request Reason",
                    value: entryData[4],
                    inline: false
                },
            ];
        }
        return this.sendEmbed(requestData);
    }

    async publishApprovedRequest(renderID, notes, usertag) {
        const renderData = await getPostData(renderID);
        const requestData = {
            author: {
                name: `OMR Request has been approved by ${usertag}`
            },
            title: renderData.title,
            description: `[Map Link](https://osu.ppy.sh/beatmapsets/${renderData.mapID}) · [Replay Link](${renderData.videoUrl}) · [Submission Form](https://forms.gle/XsvFiKybDXKkKpmN9)`,
            color: "#008000",
            fields: [
                {
                    name: "Additional Notes",
                    value: notes,
                    inline: false
                }
            ],
            footer: {
                text: `Render ID: ${renderID}`,
                iconURL: `https://lous.s-ul.eu/lOdCVZYI`
            },
            thumbnail: `https://b.ppy.sh/thumb/${renderData.mapID}l.jpg`,
            isAnnouncement: false
        }
        return this.sendEmbed(requestData);
    }

    async publishFailedRequest(renderID, notes, usertag) {
        const renderData = await getPostData(renderID);
        const requestData = {
            author: {
                name: `OMR Request has been rejected by ${usertag}`
            },
            title: renderData.title,
            description: `[Map Link](https://osu.ppy.sh/beatmapsets/${renderData.mapID}) · [Replay Link](${renderData.videoUrl}) · [Submission Form](https://forms.gle/XsvFiKybDXKkKpmN9)`,
            color: "#ff0000",
            fields: [
                {
                    name: "Rejection Reason",
                    value: notes,
                    inline: false
                }
            ],
            footer: {
                text: `Render ID: ${renderID}`,
                iconURL: `https://lous.s-ul.eu/lOdCVZYI`
            },
            thumbnail: `https://b.ppy.sh/thumb/${renderData.mapID}l.jpg`,
            isAnnouncement: false
        }
        return this.sendEmbed(requestData);
    }

    async publishUpload(renderID, thumbnailUrl) {
        const [renderData,entryData,userData] = await this.getRenderDetails(renderID);
        const requestData = {
            author: {
                name: `OMR Request has been uploaded`
            },
            title: entryData[8],
            description: `[Map Link](https://osu.ppy.sh/beatmapsets/${renderData.mapID}) · [Youtube Link](${entryData[10]}) · [Submission Form](https://forms.gle/XsvFiKybDXKkKpmN9)`,
            color: "#ea7724",
            footer: {
                text: `Render ID: ${renderID}`,
                iconURL: `https://lous.s-ul.eu/lOdCVZYI`
            },
            image: thumbnailUrl,
            isAnnouncement: true
        }
        console.log([renderData,entryData,userData]);
        console.table(requestData);
        return this.sendEmbed(requestData);
    }

    async getRenderDetails(renderID) {
        const renderData = await getPostData(renderID);
        const entryData = await getEntryByRenderID(renderID);
        const userData = await getUserDataSet(entryData[0][1]);
        return [renderData, entryData[0], userData];
    }

    async getChannel(isAnnouncement = false) {
        const channel = await client.channels.fetch(isAnnouncement ? this.announcementChannel : this.loggingChannel).catch(() => null);
        if (!channel || !(channel instanceof TextChannel)) {
            console.error(`Invalid or inaccessible announcement channel: ${this.channelId}`);
            return null;
        }
        return channel;
    }
}

const announcement = new PublicAnnouncement();
module.exports = announcement;