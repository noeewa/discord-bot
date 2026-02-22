require('dotenv').config()
const { SlashCommandBuilder, REST, Routes } = require('discord.js')

const commands = [
    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask to bot (without Google search)')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search with Google and ask to bot')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Your question')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear bot messages')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of messages to delete (default: 5)')
                .setRequired(false)
        )
        .toJSON()
    
]

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN)

console.log('CLIENT_ID:', process.env.CLIENT_ID)

/**
 * Register commands to a specific guild
 * @param {string} guildId - The Discord guild ID to register commands to
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
async function registerCommandsToGuild(guildId) {
    try {
        console.log(`Registering slash Command to guild: ${guildId}`)
        
        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                guildId
            ),
            { body: commands }
        )

        console.log(`✅ Commands registered successfully to guild: ${guildId}`)
        return true
    } catch (error) {
        console.error('Error details:', error)
        if (error.response) {
            console.error('Response data:', error.response.data)
            console.error('Response status:', error.response.status)
        }
        return false
    }
}

module.exports = { registerCommandsToGuild }
