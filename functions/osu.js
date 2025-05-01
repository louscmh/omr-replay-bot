const { osuAPI } = require('../data/config.json');
const axios = require('axios');

async function getUserDataSet(user_id) {
    // console.log(user_id);
    try {
        const data = (
            await axios.get("/get_user", {
                baseURL: "https://osu.ppy.sh/api",
                params: {
                    k: osuAPI,
                    u: user_id,
                    m: 0,
                },
            })
        )["data"];
        // console.log(data);
        return data.length !== 0 ? data[0] : null;
    } catch (error) {
        console.error(error);
    }
}

async function getUserDataSet(user_id) {
    // console.log(user_id);
    try {
        const data = (
            await axios.get("/get_user", {
                baseURL: "https://osu.ppy.sh/api",
                params: {
                    k: osuAPI,
                    u: user_id,
                    m: 0,
                },
            })
        )["data"];
        // console.log(data);
        return data.length !== 0 ? data[0] : null;
    } catch (error) {
        console.error(error);
    }
}

async function getDataSet(beatmapset_id) {
    try {
        const data = (
            await axios.get("/get_beatmaps", {
                baseURL: "https://osu.ppy.sh/api",
                params: {
                    k: osuAPI,
                    s: beatmapset_id,
                },
            })
        )["data"];
        return data.length !== 0 ? data[0] : null;
    } catch (error) {
        console.error(error);
    }
};

module.exports = {
    getUserDataSet,
    getDataSet
};