const io = require("socket.io-client");
const socketUrl = "https://apis.issou.best";
const ioClient = io.connect(socketUrl, { path: "/ordr/ws" });
const axios = require('axios');
const FormData = require('form-data');

const pendingRenders = new Map();

async function uploadReplay(data, index) {
    const { updateResponseSheet } = require('./googlesheet.js');
    let isCustom = /^[0-9]+$/.test(String(data[3]));
    const customSkin = isCustom ? await getCustomSkinInfo(Number(data[3])) : null;
    const normalSkin = await getClosestSkinFile(data[3]);
    isCustom = customSkin == null ? false : true;
    try {
        const { getUserDataSet } = require('./osu.js');
        const skinID = isCustom ? data[3] : normalSkin;
        const fileResponse = await axios.get(data[2], { responseType: 'stream' });
        const userData = await getUserDataSet(data[1]);

        let filename = 'default.osr';
        const disposition = fileResponse.headers['content-disposition'];
        if (disposition && disposition.includes('filename=')) {
            filename = disposition
                .split('filename=')[1]
                .split(';')[0]
                .trim()
                .replace(/"/g, '');
        }

        const formData = new FormData();
        formData.append('replayFile', fileResponse.data, {
            filename
        });

        formData.append('username', userData.username);
        formData.append('resolution', '1280x720');
        formData.append('skin', String(skinID));
        // formData.append('skin', "28805");
        formData.append('globalVolume', '75');
        formData.append('hitsoundVolume', '75');
        formData.append('useSkinHitsounds', 'false');
        formData.append('inGameBGDim', '90');
        formData.append('breakBGDim', '50');
        formData.append('showDanserLogo', 'false');
        formData.append('showHitCounter', 'true');
        formData.append('showStrainGraph', 'true');
        formData.append('showScoreboard', 'true');
        formData.append('customSkin', String(isCustom));
        // formData.append('verificationKey', 'devmode_success');

        const uploadResponse = await axios.post(
            'https://apis.issou.best/ordr/renders',
            formData,
            { headers: { ...formData.getHeaders() } }
        );

        console.log('Replay uploaded successfully:', uploadResponse.data);
        const renderID = uploadResponse.data.renderID;
        pendingRenders.set(renderID, index);
        updateResponseSheet("H", index, renderID);
    } catch (error) {
        console.error('Error uploading replay:', error.response?.data || error.message);
        const errorCode = error.response?.data.errorCode;
        updateResponseSheet("F", index, "Submission Error");
        updateResponseSheet("J", index, `Error: ${error.response?.data.message || error.message}`);
    }
}

async function getPostData(renderID) {
    try {
        const data = (
            await axios.get("/ordr/renders", {
                baseURL: "https://apis.issou.best",
                params: {
                    pageSize: 1,
                    page: 1,
                    renderID
                },
            })
        )["data"];
        // console.log(data["skins"]);
        return data["renders"].length !== 0 ? data["renders"][0] : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getClosestSkinFile(search) {
    search = search.trimEnd();
    if (search == "") return "aristia_edit_trail";
    try {
        const data = (
            await axios.get("/ordr/skins", {
                baseURL: "https://apis.issou.best",
                params: {
                    pageSize: 1,
                    page: 1,
                    search
                },
            })
        )["data"];
        console.log(data["skins"]);
        return data["skins"].length !== 0 ? data["skins"][0]["skin"] : "aristia_edit_trail";
    } catch (error) {
        console.error(error);
        return "aristia_edit_trail";
    }
}

async function getFullSkinInfo(input) {
    input = input.trimEnd();
    const search = input == "" ? "Aristia (edit +trail)" : input;

    try {
        const data = (
            await axios.get("/ordr/skins", {
                baseURL: "https://apis.issou.best",
                params: {
                    pageSize: 1,
                    page: 1,
                    search: search
                },
            })
        )["data"];
        console.log(data["skins"]);
        return data["skins"].length !== 0 ? data["skins"][0] : {
            "skin": "aristia_edit_trail",
            "presentationName": "Aristia (edit +trail)",
            "url": "https://dl.issou.best/ordr/skins/aristia_edit_trail.osk",
            "highResPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/high-res.webp",
            "lowResPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/low-res.webp",
            "gridPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/grid.webp",
            "id": 16,
            "hasCursorMiddle": false,
            "author": "Unknown",
            "modified": false,
            "version": "Normal",
            "alphabeticalId": 32,
            "timesUsed": 169551
        };
    } catch (error) {
        console.error(error);
        return {
            "skin": "aristia_edit_trail",
            "presentationName": "Aristia (edit +trail)",
            "url": "https://dl.issou.best/ordr/skins/aristia_edit_trail.osk",
            "highResPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/high-res.webp",
            "lowResPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/low-res.webp",
            "gridPreview": "https://dl.issou.best/ordr/skinpreview/aristia_edit_trail/grid.webp",
            "id": 16,
            "hasCursorMiddle": false,
            "author": "Unknown",
            "modified": false,
            "version": "Normal",
            "alphabeticalId": 32,
            "timesUsed": 169551
        };
    }
}

async function getCustomSkinInfo(id) {
    try {
        const data = (
            await axios.get("/ordr/skins/custom", {
                baseURL: "https://apis.issou.best",
                params: {
                    id
                },
            })
        )["data"];
        console.table(data);
        return data.found && !data.removed ? data : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getClosestSkinFileName(search) {
    if (search == "") return "Aristia (edit +trail)";

    try {
        const data = (
            await axios.get("/ordr/skins", {
                baseURL: "https://apis.issou.best",
                params: {
                    pageSize: 1,
                    page: 1,
                    search
                },
            })
        )["data"];
        console.log(data["skins"]);
        return data["skins"].length !== 0 ? data["skins"][0]["presentationName"] : "Aristia (edit +trail)";
    } catch (error) {
        console.error(error);
        return "Aristia (edit +trail)";
    }
}

async function generateDownloadLink(renderID) {
    try {
        const data = (
            await axios.get("/dynlink/ordr/gen", {
                baseURL: "https://apis.issou.best",
                params: {
                    id: renderID
                },
            })
        )["data"];
        return data.length !== 0 ? data.url : null;
    } catch (error) {
        console.error(error);
        return null;
    }
}

ioClient.on("render_done_json", async data => {
    // console.log("Websocket event received:", data);
    const { renderID, videoUrl } = data;
    if (pendingRenders.has(renderID)) {
        const { updateResponseSheet } = require('./googlesheet.js');
        const { notifyNewRequest } = require('./discord.js');
        const index = pendingRenders.get(renderID);
        console.log(`Render with ID ${renderID} and URL ${videoUrl} is done!`);
        try {
            const renderData = await getPostData(renderID);
            updateResponseSheet("F", index, "Pending Approval");
            updateResponseSheet("G", index, renderData.videoUrl);
            updateResponseSheet("I", index, renderData.title);
            setTimeout(async function () {
                notifyNewRequest(renderID)
                pendingRenders.delete(renderID);
            }, 5000);
        } catch (error) {
            console.log(`Error: ${error}`);
        }

    }
});

async function forceLoad(renderID) {
    const { updateResponseSheet, getEntryByRenderID } = require('./googlesheet.js');
    const { notifyNewRequest } = require('./discord.js');
    try {
        const renderData = await getPostData(renderID);
        const entryData = await getEntryByRenderID(renderID);
        updateResponseSheet("F", entryData[1], "Pending Approval");
        updateResponseSheet("G", entryData[1], renderData.videoUrl);
        updateResponseSheet("I", entryData[1], renderData.title);
        setTimeout(async function () {
            notifyNewRequest(renderID)
            pendingRenders.delete(renderID);
        }, 5000);
    } catch (error) {
        console.log(`Error: ${error}`);
    }
}

module.exports = {
    uploadReplay,
    getPostData,
    getClosestSkinFile,
    getClosestSkinFileName,
    generateDownloadLink,
    getFullSkinInfo,
    getCustomSkinInfo,
    forceLoad
};