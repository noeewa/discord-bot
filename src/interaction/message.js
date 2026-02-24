// Message management command handlers
const { EmbedBuilder } = require('discord.js')
const { getServerByServerId, getListsByServerId, getTasksByServerId } = require('../db/callTabel.js')
const { deleteList, deleteTask } = require('../db/unsertTabel.js')

/**
 * Handle /clear slash command - delete bot messages
 * @param {object} interaction - Discord interaction object
 */
async function handleClearCommand(interaction) {
    try {
        const jumlah = interaction.options.getInteger('jumlah')
        
        const messages = await interaction.channel.messages.fetch({ limit: jumlah + 1 })
        const botMessages = messages.filter(msg => msg.author.bot)
        
        const deleted = await interaction.channel.bulkDelete(botMessages)
        
        await interaction.reply({ content: `✅ ${deleted.size} pesan bot telah dihapus.`, ephemeral: true })
    } catch (error) {
        console.error('Error in /clear command:', error)
        await interaction.reply({ content: '❌ Gagal menghapus pesan.', ephemeral: true })
    }
}

/**
 * Handle /clearyou slash command - delete user's own messages
 * @param {object} interaction - Discord interaction object
 */
async function handleClearYouCommand(interaction) {
    try {
        const jumlah = interaction.options.getInteger('jumlah')
        
        const messages = await interaction.channel.messages.fetch({ limit: jumlah + 1 })
        const userMessages = messages.filter(msg => msg.author.id === interaction.user.id)
        
        const deleted = await interaction.channel.bulkDelete(userMessages)
        
        await interaction.reply({ content: `✅ ${deleted.size} pesan Anda telah dihapus.`, ephemeral: true })
    } catch (error) {
        console.error('Error in /clearyou command:', error)
        await interaction.reply({ content: '❌ Gagal menghapus pesan.', ephemeral: true })
    }
}

/**
 * Handle /showall slash command - show all lists and tasks
 * @param {object} interaction - Discord interaction object
 */
async function handleShowAllCommand(interaction) {
    try {
        const guildId = interaction.guildId
        const server = await getServerByServerId(guildId)
        
        if (!server) {
            await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
            return
        }
        
        const lists = await getListsByServerId(server.id)
        const tasks = await getTasksByServerId(server.id)
        
        if (lists.length === 0 && tasks.length === 0) {
            await interaction.reply({ content: '❌ Belum ada list atau task.', ephemeral: true })
            return
        }
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('📋 Semua List dan Task')
        
        if (lists.length > 0) {
            const listText = lists.map(l => 
                `- ${l.namaList} (${l.activeTime})`
            ).join('\n')
            embed.addFields({ name: 'Lists', value: listText || 'Tidak ada' })
        }
        
        if (tasks.length > 0) {
            const taskText = tasks.map(t => 
                `- ${t.namaTask} (${t.activeTime})`
            ).join('\n')
            embed.addFields({ name: 'Tasks', value: taskText || 'Tidak ada' })
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
        console.error('Error in /showall command:', error)
        await interaction.reply({ content: '❌ Gagal menampilkan data.', ephemeral: true })
    }
}

/**
 * Handle /deletelist slash command - delete a list
 * @param {object} interaction - Discord interaction object
 */
async function handleDeleteListCommand(interaction) {
    try {
        const namaList = interaction.options.getString('nama')
        
        const guildId = interaction.guildId
        const server = await getServerByServerId(guildId)
        
        if (!server) {
            await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
            return
        }
        
        const lists = await getListsByServerId(server.id)
        const list = lists.find(l => l.namaList.toLowerCase() === namaList.toLowerCase())
        
        if (!list) {
            await interaction.reply({ content: '❌ List tidak ditemukan.', ephemeral: true })
            return
        }
        
        await deleteList(list.id, server.id)
        
        await interaction.reply({ content: `✅ List "${list.namaList}" telah dihapus.`, ephemeral: true })
    } catch (error) {
        console.error('Error in /deletelist command:', error)
        await interaction.reply({ content: '❌ Gagal menghapus list.', ephemeral: true })
    }
}

/**
 * Handle /deletetask slash command - delete a task
 * @param {object} interaction - Discord interaction object
 */
async function handleDeleteTaskCommand(interaction) {
    try {
        const namaTask = interaction.options.getString('nama')
        
        const guildId = interaction.guildId
        const server = await getServerByServerId(guildId)
        
        if (!server) {
            await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
            return
        }
        
        const tasks = await getTasksByServerId(server.id)
        const task = tasks.find(t => t.namaTask.toLowerCase() === namaTask.toLowerCase())
        
        if (!task) {
            await interaction.reply({ content: '❌ Task tidak ditemukan.', ephemeral: true })
            return
        }
        
        await deleteTask(task.id, server.id)
        
        await interaction.reply({ content: `✅ Task "${task.namaTask}" telah dihapus.`, ephemeral: true })
    } catch (error) {
        console.error('Error in /deletetask command:', error)
        await interaction.reply({ content: '❌ Gagal menghapus task.', ephemeral: true })
    }
}

module.exports = {
    handleClearCommand,
    handleClearYouCommand,
    handleShowAllCommand,
    handleDeleteListCommand,
    handleDeleteTaskCommand
}
