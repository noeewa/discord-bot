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
        .toJSON(),
    new SlashCommandBuilder()
        .setName('clearyou')
        .setDescription('Clear your messages')
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of your messages to delete (default: 5)')
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('createlist')
        .setDescription('Create a new list with tasks')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('createtask')
        .setDescription('Create a new task')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('showall')
        .setDescription('Show all lists and tasks')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('deletelist')
        .setDescription('Delete a list')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('List name to delete')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('deletetask')
        .setDescription('Delete a task')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Task name to delete')
                .setRequired(true)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('addchannel')
        .setDescription('Tambah channel baru (hanya untuk moderator)')
        .addStringOption(option =>
            option.setName('nama')
                .setDescription('Nama channel yang ingin dibuat')
                .setRequired(false)
        )
        .toJSON(),
    new SlashCommandBuilder()
        .setName('deletechannel')
        .setDescription('Hapus channel (hanya untuk role tertentu)')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('listchannel')
        .setDescription('Lihat daftar channel di server (hanya untuk moderator)')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('setchannel')
        .setDescription('Set channel bot yang tersimpan di database (hanya untuk moderator)')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('setchanelmusic')
        .setDescription('Set channel music yang hanya menerima link (hanya untuk moderator)')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('userstats')
        .setDescription('Tampilkan jumlah user terdaftar')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('gjoin')
        .setDescription('Join voice channel')
        .toJSON(),
    new SlashCommandBuilder()
        .setName('gleft')
        .setDescription('Leave voice channel')
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
