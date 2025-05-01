const { REST, Routes } = require('discord.js');
const { clientId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

// Get the target file name from the command line argument
const targetFileName = process.argv[2];

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	// Grab all the command files from the commands directory you created earlier
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = !targetFileName 
		? fs.readdirSync(commandsPath).filter(file => file => file.endsWith('.js')) 
		: fs.readdirSync(commandsPath).filter(file => file === targetFileName);
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			commands.push(command.data.toJSON());
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
(async () => {
	try {
		console.log('Fetching existing application (/) commands...');
		const existingCommands = await rest.get(Routes.applicationCommands(clientId));
		const existingCommandNames = new Set(existingCommands.map(cmd => cmd.name));

		// Filter out commands that already exist
		const newCommands = commands.filter(cmd => !existingCommandNames.has(cmd.name));

		if (newCommands.length === 0) {
			console.log('No new commands to add. All commands are already up-to-date.');
			return;
		}

		console.log(`Started adding ${newCommands.length} new application (/) commands.`);

		// Add each new command individually
		for (const command of newCommands) {
			await rest.post(Routes.applicationCommands(clientId), { body: command });
			console.log(`Successfully added command: ${command.name}`);
		}

		console.log(`Successfully reloaded ${newCommands.length} application (/) commands.`);
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();
