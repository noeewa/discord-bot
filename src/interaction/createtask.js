// Createtask interaction handlers
const { EmbedBuilder } = require('discord.js')
const { getServerByServerId } = require('../db/callTabel.js')
const { insertTask } = require('../db/insertTabel.js')

/**
 * Handle createtask_modal - create a single task
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateTaskModal(interaction, interactionData) {
    // Get task name and time from modal
    const taskName = interaction.fields.getTextInputValue('task_name')
    const activeTime = interaction.fields.getTextInputValue('task_time')
    
    try {
        const guildId = interaction.guildId
        const server = await getServerByServerId(guildId)
        
        if (!server) {
            await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
            return
        }
        
        // Create the task
        await insertTask(taskName, activeTime, server.id)
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Task Dibuat')
            .addFields(
                { name: 'Nama Task', value: taskName },
                { name: 'Waktu Aktif', value: activeTime }
            )
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
        console.log(`📝 Task "${taskName}" created by ${interaction.user.username}`)
    } catch (error) {
        console.error('Error creating task:', error)
        await interaction.reply({ content: '❌ Gagal membuat task. Silakan coba lagi.', ephemeral: true })
    }
}

module.exports = {
    handleCreateTaskModal
}
