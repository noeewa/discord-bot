// Createlist interaction handlers
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js')
const { getServerByServerId } = require('../db/callTabel.js')
const { insertList, insertListTask } = require('../db/insertTabel.js')

// Days of the week
const DAYS = [
    { label: 'Senin', value: 'senin' },
    { label: 'Selasa', value: 'selasa' },
    { label: 'Rabu', value: 'rabu' },
    { label: 'Kamis', value: 'kamis' },
    { label: 'Jumat', value: 'jumat' },
    { label: 'Sabtu', value: 'sabtu' },
    { label: 'Minggu', value: 'minggu' }
]

/**
 * Handle createlist_count_modal - get list name and task count
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListCountModal(interaction, interactionData) {
    // Get the list name and task count from modal
    const listName = interaction.fields.getTextInputValue('list_name')
    const taskCount = parseInt(interaction.fields.getTextInputValue('task_count'))
    
    if (isNaN(taskCount) || taskCount < 1 || taskCount > 20) {
        await interaction.reply({ content: '❌ Jumlah task harus antara 1-20. Silakan coba lagi.', ephemeral: true })
        return
    }
    
    // Store the data and show message with button to proceed
    interactionData.set(interaction.user.id, { listName, taskCount })
    
    // Show message with button to proceed
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('createlist_continue_btn')
                .setLabel('Lanjut Input Task')
                .setStyle(ButtonStyle.Primary)
        )
    
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📝 Input Task')
        .setDescription(`List: **${listName}**\nJumlah Task: **${taskCount}**\n\nKlik tombol di bawah untuk memasukkan task.`)
    
    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
}

/**
 * Handle createlist_continue_btn - show task input modal
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListContinueBtn(interaction, interactionData) {
    try {
        // Get the stored data from the message
        const message = interaction.message
        const content = message.embeds[0]?.description || ''
        
        // Extract list name and task count from the embed description
        const listNameMatch = content.match(/List: \*\*(.+?)\*\*/)
        const taskCountMatch = content.match(/Jumlah Task: \*\*(\d+)\*\*/)
        
        if (!listNameMatch || !taskCountMatch) {
            await interaction.reply({ content: '❌ Data tidak valid. Silakan mulai lagi dengan /createlist', ephemeral: true })
            return
        }
        
        const listName = listNameMatch[1]
        const taskCount = parseInt(taskCountMatch[1])
        
        // Store data in the Map with user ID as key
        interactionData.set(interaction.user.id, { listName, taskCount })
        
        // Show modal with task inputs
        const tasksModal = new ModalBuilder()
            .setCustomId('createlist_tasks_modal')
            .setTitle('Masukkan Task')
        
        // Add input fields for each task
        for (let i = 1; i <= taskCount; i++) {
            const taskInput = new TextInputBuilder()
                .setCustomId(`task_${i}`)
                .setLabel(`Task ${i}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Contoh: Task ${i}`)
                .setRequired(true)
            
            const taskRow = new ActionRowBuilder().addComponents(taskInput)
            tasksModal.addComponents(taskRow)
        }
        
        await interaction.showModal(tasksModal)
    } catch (error) {
        console.error('Error showing tasks modal:', error)
        await interaction.reply({ content: '❌ Gagal membuka form. Silakan coba lagi.', ephemeral: true })
    }
}

/**
 * Handle createlist_tasks_modal - get all task names and show day selection
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListTasksModal(interaction, interactionData) {
    // Get all task names from modal
    const storedData1 = interactionData.get(interaction.user.id)
    if (!storedData1) {
        await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createlist', ephemeral: true })
        return
    }
    const { listName, taskCount } = storedData1
    const tasks = []
    
    for (let i = 1; i <= taskCount; i++) {
        const taskName = interaction.fields.getTextInputValue(`task_${i}`)
        if (taskName && taskName.trim()) {
            tasks.push(taskName.trim())
        }
    }
    
    if (tasks.length === 0) {
        await interaction.reply({ content: '❌ Task tidak boleh kosong. Silakan coba lagi.', ephemeral: true })
        return
    }
    
    // Store the data and show day selection
    interactionData.set(interaction.user.id, { listName, tasks, taskCount })
    
    // Create day selection dropdown
    const dayRow = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('createlist_days_modal')
                .setPlaceholder('Pilih hari pengulangan (bisa pilih lebih dari 1)')
                .setMinValues(1)
                .setMaxValues(7)
                .addOptions(DAYS)
        )
    
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📅 Pilih Hari Pengulangan')
        .setDescription(`List: **${listName}**\nTask:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nPilih hari dimana task ini akan diulang setiap minggu.`)
    
    await interaction.reply({ embeds: [embed], components: [dayRow], ephemeral: true })
}

/**
 * Handle createlist_days_modal - save tasks with selected days
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListDaysModal(interaction, interactionData) {
    const selectedDays = interaction.values // Array of selected day values
    const storedData = interactionData.get(interaction.user.id)
    
    if (!storedData || !storedData.tasks) {
        await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createlist', ephemeral: true })
        return
    }
    
    const { listName, tasks } = storedData
    
    // Ask for time now
    interactionData.set(interaction.user.id, { listName, tasks, selectedDays })
    
    // Show message with button to proceed to time
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('createlist_time_btn')
                .setLabel('Lanjut ke Waktu')
                .setStyle(ButtonStyle.Primary)
        )
    
    const daysLabel = selectedDays.map(d => {
        const day = DAYS.find(x => x.value === d)
        return day ? day.label : d
    }).join(', ')
    
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('⏰ Input Waktu')
        .setDescription(`List: **${listName}**\nTask:\n${tasks.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nHari: **${daysLabel}**\n\nKlik tombol di bawah untuk memasukkan waktu aktif.`)
    
    await interaction.update({ embeds: [embed], components: [row] })
}

/**
 * Handle createlist_time_btn - show time input modal
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListTimeBtn(interaction, interactionData) {
    try {
        // Get stored data from Map
        const storedData = interactionData.get(interaction.user.id)
        
        if (!storedData || !storedData.tasks) {
            await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createlist', ephemeral: true })
            return
        }
        
        // Show modal for time
        const timeModal = new ModalBuilder()
            .setCustomId('createlist_time_modal')
            .setTitle('Waktu Aktif List')
            
        const timeInput = new TextInputBuilder()
            .setCustomId('list_time')
            .setLabel('Waktu aktif (contoh: 08:00)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('JJ:MM')
            .setRequired(true)
            
        const timeRow = new ActionRowBuilder().addComponents(timeInput)
        timeModal.addComponents(timeRow)
        
        await interaction.showModal(timeModal)
    } catch (error) {
        console.error('Error showing time modal:', error)
        await interaction.reply({ content: '❌ Gagal membuka form. Silakan coba lagi.', ephemeral: true })
    }
}

/**
 * Handle createlist_time_modal - save the list with tasks, days and time
 * @param {object} interaction - Discord interaction object
 * @param {Map} interactionData - Map to store temporary interaction data
 */
async function handleCreateListTimeModal(interaction, interactionData) {
    // Get the time from modal
    const activeTime = interaction.fields.getTextInputValue('list_time')
    const storedData2 = interactionData.get(interaction.user.id)
    if (!storedData2) {
        await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createlist', ephemeral: true })
        return
    }
    const { listName, tasks, selectedDays } = storedData2
    
    try {
        const guildId = interaction.guildId
        const server = await getServerByServerId(guildId)
        
        if (!server) {
            await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
            return
        }
        
        // Create the list
        const listId = await insertList(listName, activeTime, server.id)
        
        // Insert all tasks with days
        for (const taskName of tasks) {
            await insertListTask(taskName, '', listId, selectedDays.join(','))
        }
        
        const daysLabel = selectedDays.map(d => {
            const day = DAYS.find(x => x.value === d)
            return day ? day.label : d
        }).join(', ')
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ List Dibuat')
            .addFields(
                { name: 'Nama List', value: listName, inline: true },
                { name: 'Waktu Aktif', value: activeTime, inline: true },
                { name: 'Hari', value: daysLabel, inline: true },
                { name: 'Jumlah Task', value: tasks.length.toString(), inline: true },
                { name: 'Task', value: tasks.map((t, i) => `${i + 1}. ${t}`).join('\n') }
            )
        
        await interaction.reply({ embeds: [embed], ephemeral: true })
        console.log(`📝 List "${listName}" with ${tasks.length} tasks created by ${interaction.user.username} - Days: ${daysLabel}`)
        
        // Clean up stored data
        interactionData.delete(interaction.user.id)
    } catch (error) {
        console.error('Error creating list:', error)
        await interaction.reply({ content: '❌ Gagal membuat list. Silakan coba lagi.', ephemeral: true })
    }
}

module.exports = {
    handleCreateListCountModal,
    handleCreateListContinueBtn,
    handleCreateListTasksModal,
    handleCreateListDaysModal,
    handleCreateListTimeBtn,
    handleCreateListTimeModal
}
