const { EmbedBuilder, Events } = require('discord.js');
const POLL_INTERVAL = 390000; // 5 minutes
const { processEntry } = require('../functions/googlesheet.js');	

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		(async () => {
			try {
				await processEntry();
				setInterval(async () => {
					await processEntry();
				}, POLL_INTERVAL);
			} catch (error) {
				console.error(error);
			}
		})();
	},
};