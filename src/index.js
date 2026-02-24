require('dotenv').config()
const { groqSearch, groqRequest, getLastMessages, groqRequest_chat } = require('./utility/groq.js')
const { registerCommandsToGuild } = require('./register-command.js')
const { createAllTables } = require('./db/createTabel.js')
const { insertServer, insertUser, insertMultipleUsers, insertList, insertListTask, insertTask, updateServerChannel, updateServerBroadcastChannel } = require('./db/insertTabel.js')
const { getServerByServerId, getListsByServerId, getTasksByServerId, getListTasksByListId } = require('./db/callTabel.js')
const { deleteList, deleteTask } = require('./db/unsertTabel.js')
const { createBroadcastChannel, sendBroadcastMessage } = require('./utility/broadcast.js')
const { addChannel, deleteChannel, listChannels } = require('./utility/channelManager.js')
const { scheduleLiveClock, getIndonesiaTime, getIndonesiaDayHour } = require('./timegenerator.js')
const { handleRegistration } = require('./registrasi.js')
const { handleCreateListCountModal, handleCreateListContinueBtn, handleCreateListTasksModal, handleCreateListDaysModal, handleCreateListTimeBtn, handleCreateListTimeModal } = require('./interaction/createlist.js')
const { handleCreateTaskModal } = require('./interaction/createtask.js')
const { handleAskCommand, handleSearchCommand } = require('./interaction/ask.js')
const { handleClearCommand, handleClearYouCommand, handleShowAllCommand, handleDeleteListCommand, handleDeleteTaskCommand } = require('./interaction/message.js')
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ModalActionRowComponentBuilder, EmbedBuilder, StringSelectMenuBuilder, ChannelType } = require('discord.js')

// Store temporary data for multi-step interactions
const interactionData = new Map();

// Define slash commands (kept for reference, actual registration in register-command.js)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
})


client.login(process.env.TOKEN);

client.on('ready', async (c) => {
    console.log(`✅ ${c.user.username} is online!`)
    await createAllTables() //database
    
    // Start live clock scheduler
    scheduleLiveClock(client)
});

// Handle incoming messages
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return
    
    console.log(`📩 Message from ${message.author.username}: ${message.content}`)
    
    // Check if message is in a broadcast channel
    const guildId = message.guildId
    const server = await getServerByServerId(guildId)
    
    if (server && server.broadcastChannelId && message.channelId === server.broadcastChannelId) {
        // Delete non-bot messages in broadcast channel
        try {
            await message.delete()
            console.log(`🗑️ Deleted user message in broadcast channel: "${message.content}"`)
        } catch (error) {
            console.error('Error deleting message in broadcast channel:', error)
        }
        return
    }
    
    // Get message content in lowercase
    const messageContent = message.content.toLowerCase().trim()
    
    // Check if bot is mentioned
    const botMention = message.mentions.has(client.user.id)
    
    // Check if message contains "start-gdrive" as a standalone word
    // This ensures "start-gdrive" is not part of another word
    const hasStartGdrive = /\bstart-gdrive\b/.test(messageContent)
    
    // Registration only triggers when BOTH conditions are met:
    // 1. Bot is mentioned AND
    // 2. Message contains "start-gdrive"
    if (botMention && hasStartGdrive && guildId) {
        message.channel.sendTyping()
        // Create register button
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('register_guild')
                    .setLabel('Daftar Server Ini')
                    .setStyle(ButtonStyle.Success)
            )
        
        // Send response with register button
        await message.reply({
            content: `Halo! Saya adalah G-Drive Bot.\n\nKetik "/ask" untuk bertanya tanpa pencarian Google\nKetik "/search" untuk bertanya dengan pencarian Google\n\nKlik tombol di bawah untuk mendaftarkan server ini!`,
            components: [row]
        })
        return
    }
    if (botMention) {
        await message.channel.sendTyping()
        const channelId = message.channelId;
        const messages = await getLastMessages(client, channelId, 20);
        
        // Extract question from message content (remove bot mention)
        const question = message.content.replace(/<@!?\d+>/g, '').trim();
        
        // Call groqRequest to get the answer
        const answer = await groqRequest_chat(question, messages);
        
        // Send the answer
        await message.reply(`${answer}`);
        return;
    }
    
    // If bot is mentioned without "start-gdrive", ignore
    
    // Skip commands (messages starting with !)
    if (message.content.startsWith('!')) return
    
    // Show typing indicator while AI responds
    
})

client.on('interactionCreate', async (interaction) => {
    // Handle button interactions
    if (interaction.isButton()) {
        if (interaction.customId === 'register_guild') {
            await handleRegistration(interaction, interactionData)
            return
        }
        
        // Handle createlist continue button - show task input modal
        if (interaction.customId === 'createlist_continue_btn') {
            await handleCreateListContinueBtn(interaction, interactionData)
            return
        }
        
        // Handle createlist time button - show time input modal
        if (interaction.customId === 'createlist_time_btn') {
            await handleCreateListTimeBtn(interaction, interactionData)
            return
        }
    }
    
    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
        // Handle deletechannel selection
        if (interaction.customId === 'deletechannel_select') {
            try {
                const channelId = interaction.values[0]
                const guild = interaction.guild
                
                // Fetch the channel
                const channel = await guild.channels.fetch(channelId)
                
                if (!channel) {
                    await interaction.reply({ content: '❌ Channel tidak ditemukan.', ephemeral: true })
                    return
                }
                
                const channelName = channel.name
                
                // Delete the channel
                await channel.delete()
                
                await interaction.reply({ content: `✅ Channel "${channelName}" berhasil dihapus!`, ephemeral: true })
            } catch (error) {
                console.error('Error deleting channel from select:', error)
                await interaction.reply({ content: '❌ Gagal menghapus channel. Silakan coba lagi.', ephemeral: true })
            }
            return
        }
        
        // Handle setchannel selection
        if (interaction.customId === 'setchannel_select') {
            try {
                const channelId = interaction.values[0]
                const guild = interaction.guild
                
                // Fetch the channel
                const channel = await guild.channels.fetch(channelId)
                
                if (!channel) {
                    await interaction.reply({ content: '❌ Channel tidak ditemukan.', ephemeral: true })
                    return
                }
                
                // Get server info
                const guildId = interaction.guildId
                const server = await getServerByServerId(guildId)
                
                if (!server) {
                    await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
                    return
                }
                
                // Update the broadcast channel in database
                await updateServerBroadcastChannel(server.id, channelId)
                
                // Also set this as bot channel
                await updateServerChannel(server.id, channelId)
                
                // Delete all messages in the channel first
                try {
                    const messages = await channel.messages.fetch()
                    if (messages.size > 0) {
                        await channel.bulkDelete(messages, true)
                        console.log(`🗑️ Deleted ${messages.size} messages in broadcast channel`)
                    }
                } catch (deleteError) {
                    console.log('Note: Could not bulk delete messages:', deleteError.message)
                }
                
                // Send initial broadcast message
                const timeString = getIndonesiaTime()
                const { hour, dayName } = getIndonesiaDayHour()
                
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('=== BROADCAST CHANNEL ===')
                    .setDescription(`Channel ini telah diset sebagai channel broadcast.`)
                    .addFields(
                        { name: 'Jam', value: `${dayName}, ${timeString}`, inline: true },
                        { name: 'Status', value: '✅ Aktif', inline: true }
                    )
                    .setFooter({ text: `Server: ${guild.name}` })
                    .setTimestamp()
                
                await sendBroadcastMessage(channel, embed)
                
                await interaction.reply({ content: `✅ Channel broadcast telah diset ke "#${channel.name}"!\n\n📝 Channel ini akan:\n- Menampilkan pesan broadcast dari bot\n- Menghapus pesan dari user (bukan bot)\n- Mengedit pesan bot yang sudah ada`, ephemeral: true })
            } catch (error) {
                console.error('Error setting channel from select:', error)
                await interaction.reply({ content: '❌ Gagal menyimpan channel. Silakan coba lagi.', ephemeral: true })
            }
            return
        }
    }
    
    // Handle modal submissions
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'createlist_count_modal') {
            await handleCreateListCountModal(interaction, interactionData)
            return
        }
        
        if (interaction.customId === 'createlist_tasks_modal') {
            await handleCreateListTasksModal(interaction, interactionData)
            return
        }
        
        if (interaction.customId === 'createlist_days_modal') {
            await handleCreateListDaysModal(interaction, interactionData)
            return
        }
        
        if (interaction.customId === 'createlist_time_modal') {
            await handleCreateListTimeModal(interaction, interactionData)
            return
        }
    }
    
    if (!interaction.isChatInputCommand()) return;
    
    const userName = interaction.user.username;
    const userId = interaction.user.id;
    
    console.log(`⚡ Command from ${userName} (${userId}): /${interaction.commandName}`)
    
    const question = interaction.options.getString('question');
    
    // Reply to the user
    if (interaction.commandName === 'ask') {
        await handleAskCommand(interaction, client)
    } else if (interaction.commandName === 'search') {
        await handleSearchCommand(interaction)
    } else if (interaction.commandName === 'clear') {
        // Handle /clear slash command - delete specified number of bot messages
        try {
            // Defer the reply first
            await interaction.deferReply({ ephemeral: true })
            
            const channel = interaction.channel
            
            // Get the count parameter (default to 5 if not provided, 2 if 0)
            const count = interaction.options.getInteger('count')
            const deleteCount = count === 0 ? 2 : (count || 5)
            
            // Fetch messages from the channel
            const messages = await channel.messages.fetch()
            
            // Filter bot messages and take only the specified number
            const botMessages = messages.filter(msg => msg.author.bot).first(deleteCount)
            
            // Delete the bot messages
            let deletedCount = 0
            for (const msg of botMessages) {
                if (deleteCount == 0) {
                    continue
                }
                await msg.delete()
                deletedCount++
            }
            
            await interaction.editReply(`🗑️ Cleared ${deletedCount} bot messages`)
            console.log(`🗑️ Cleared ${deletedCount} bot messages`)
        } catch (error) {
            console.error('Error clearing messages:', error)
            if (interaction.deferred) {
                await interaction.editReply('❌ Gagal menghapus pesan bot. | Pesan melebihi batas.')
            } else {
                await interaction.reply('❌ Gagal menghapus pesan bot. | Pesan melebihi batas.', { ephemeral: true })
            }
        }
    } else if (interaction.commandName === 'clearyou') {
        // Handle /clearyou slash command - delete user's own messages
        try {
            // Defer the reply first
            await interaction.deferReply({ ephemeral: true })
            
            const channel = interaction.channel
            const userId = interaction.user.id
            
            // Get the count parameter (default to 5 if not provided, 2 if 0)
            const count = interaction.options.getInteger('count')
            const deleteCount = count === 0 ? 2 : (count || 5)
            
            // Fetch messages from the channel
            const messages = await channel.messages.fetch()
            
            // Filter user's messages and take only the specified number
            const userMessages = messages.filter(msg => msg.author.id === userId).first(deleteCount)
            
            // Delete the user's messages
            let deletedCount = 0
            for (const msg of userMessages) {
                if (deleteCount == 0) {
                    continue
                }
                await msg.delete()
                deletedCount++
            }
            
            await interaction.editReply(`🗑️ Cleared ${deletedCount} of your messages`)
            console.log(`🗑️ Cleared ${deletedCount} of ${interaction.user.username}'s messages`)
        } catch (error) {
            console.error('Error clearing user messages:', error)
            if (interaction.deferred) {
                await interaction.editReply('❌ Gagal menghapus pesan Anda. | Pesan melebihi batas.')
            } else {
                await interaction.reply('❌ Gagal menghapus pesan Anda. | Pesan melebihi batas.', { ephemeral: true })
            }
        }
    } else if (interaction.commandName === 'showall') {
        // Handle /showall slash command - show all lists and tasks
        try {
            const guildId = interaction.guildId
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.', ephemeral: true })
                return
            }
            
            // Get all lists and tasks
            const lists = await getListsByServerId(server.id)
            const tasks = await getTasksByServerId(server.id)
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📋 Semua List dan Task')
                
            if (lists.length === 0 && tasks.length === 0) {
                embed.setDescription('Belum ada list atau task.')
            } else {
                // Add lists to embed
                if (lists.length > 0) {
                    for (const list of lists) {
                        // Get tasks for this list
                        const listTasks = await getListTasksByListId(list.id)
                        const taskNames = listTasks.length > 0 
                            ? listTasks.map((t, i) => `${i + 1}. ${t.namaTask}`).join('\n')
                            : '(tidak ada task)'
                        
                        embed.addFields({
                            name: `📁 ${list.namaList} (${list.activeTime || 'tanpa waktu'})`,
                            value: taskNames,
                            inline: false
                        })
                    }
                }
                
                // Add standalone tasks to embed
                if (tasks.length > 0) {
                    const taskNames = tasks.map(t => `• ${t.namaTask} (${t.activeTime || 'tanpa waktu'})`).join('\n')
                    embed.addFields({
                        name: '📝 Task Tunggal',
                        value: taskNames,
                        inline: false
                    })
                }
            }
            
            await interaction.reply({ embeds: [embed], ephemeral: true })
        } catch (error) {
            console.error('Error showing all:', error)
            await interaction.reply({ content: '❌ Gagal menampilkan data. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'deletelist') {
        // Handle /deletelist slash command - delete a list by name
        try {
            const listName = interaction.options.getString('name')
            const guildId = interaction.guildId
            
            // Get server info
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply('❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.')
                return
            }
            
            // Get all lists for this server
            const lists = await getListsByServerId(server.id)
            
            // Find the list with matching name
            const listToDelete = lists.find(list => list.namaList.toLowerCase() === listName.toLowerCase())
            
            if (!listToDelete) {
                await interaction.reply(`❌ List "${listName}" tidak ditemukan. Gunakan /showall untuk melihat semua list.`)
                return
            }
            
            // Delete the list
            await deleteList(listToDelete.id, server.id)
            
            await interaction.reply(`✅ List "${listToDelete.namaList}" telah dihapus (termasuk semua task di dalamnya)`)
            console.log(`🗑️ List "${listToDelete.namaList}" deleted by ${interaction.user.username}`)
        } catch (error) {
            console.error('Error deleting list:', error)
            await interaction.reply('❌ Gagal menghapus list. Silakan coba lagi.')
        }
    } else if (interaction.commandName === 'deletetask') {
        // Handle /deletetask slash command - delete a task by name
        try {
            const taskName = interaction.options.getString('name')
            const guildId = interaction.guildId
            
            // Get server info
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply('❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.')
                return
            }
            
            // Get all tasks for this server
            const tasks = await getTasksByServerId(server.id)
            
            // Find the task with matching name
            const taskToDelete = tasks.find(task => task.namaTask.toLowerCase() === taskName.toLowerCase())
            
            if (!taskToDelete) {
                await interaction.reply(`❌ Task "${taskName}" tidak ditemukan. Gunakan /showall untuk melihat semua task.`)
                return
            }
            
            // Delete the task
            await deleteTask(taskToDelete.id, server.id)
            
            await interaction.reply(`✅ Task "${taskToDelete.namaTask}" telah dihapus`)
            console.log(`🗑️ Task "${taskToDelete.namaTask}" deleted by ${interaction.user.username}`)
        } catch (error) {
            console.error('Error deleting task:', error)
            await interaction.reply('❌ Gagal menghapus task. Silakan coba lagi.')
        }
    } else if (interaction.commandName === 'createlist') {
        // Handle /createlist slash command - show modal for list creation
        try {
            const guildId = interaction.guildId
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.', ephemeral: true })
                return
            }
            
            // Show modal for list name and number of tasks
            const listModal = new ModalBuilder()
                .setCustomId('createlist_count_modal')
                .setTitle('Buat List Baru')
                
            const listNameInput = new TextInputBuilder()
                .setCustomId('list_name')
                .setLabel('Nama List')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Contoh: Tugas Kuliah')
                .setRequired(true)
                
            const countInput = new TextInputBuilder()
                .setCustomId('task_count')
                .setLabel('Jumlah Task')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Contoh: 3')
                .setRequired(true)
                
            const listNameRow = new ActionRowBuilder().addComponents(listNameInput)
            const countRow = new ActionRowBuilder().addComponents(countInput)
            
            listModal.addComponents(listNameRow, countRow)
            
            await interaction.showModal(listModal)
        } catch (error) {
            console.error('Error showing createlist modal:', error)
            await interaction.reply({ content: '❌ Gagal membuka form. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'createtask') {
        // Handle /createtask slash command - show modal for task creation
        try {
            const guildId = interaction.guildId
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.', ephemeral: true })
                return
            }
            
            // Show modal for task name only
            const taskModal = new ModalBuilder()
                .setCustomId('createtask_name_modal')
                .setTitle('Buat Task Baru')
                
            const taskNameInput = new TextInputBuilder()
                .setCustomId('task_name')
                .setLabel('Nama Task')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Contoh: Meeting Team')
                .setRequired(true)
                
            const taskNameRow = new ActionRowBuilder().addComponents(taskNameInput)
            
            taskModal.addComponents(taskNameRow)
            
            await interaction.showModal(taskModal)
        } catch (error) {
            console.error('Error showing createtask modal:', error)
            await interaction.reply({ content: '❌ Gagal membuka form. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'addchannel') {
        // Handle /addchannel slash command - create a new channel
        try {
            const channelName = interaction.options.getString('name')
            const channelType = interaction.options.getString('type') || 'text'
            const isBroadcast = interaction.options.getBoolean('broadcast') || false
            
            const result = await addChannel(interaction, channelName, channelType, isBroadcast)
            
            await interaction.reply({ content: result.message, ephemeral: true })
        } catch (error) {
            console.error('Error adding channel:', error)
            await interaction.reply({ content: '❌ Gagal membuat channel. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'deletechannel') {
        // Handle /deletechannel slash command - show channel selection to delete
        try {
            // First check role permission
            const { hasAllowedRole, MODERATOR_USER_ID } = require('./utility/channelManager.js')
            
            if (!hasAllowedRole(interaction)) {
                await interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya moderator yang boleh menggunakan fitur ini.', ephemeral: true })
                return
            }
            
            const guild = interaction.guild
            const channels = await guild.channels.fetch()
            
            // Filter only text and voice channels (not categories)
            const selectableChannels = channels.filter(ch => 
                ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice
            )
            
            if (selectableChannels.size === 0) {
                await interaction.reply({ content: '❌ Tidak ada channel yang bisa dihapus.', ephemeral: true })
                return
            }
            
            // Discord has a limit of 25 options per select menu
            const maxOptions = 25
            const channelList = selectableChannels.first(maxOptions)
            
            // Create channel options
            const channelOptions = channelList.map(ch => ({
                label: `${ch.type === ChannelType.GuildVoice ? '🔊' : '#'} ${ch.name}`,
                value: ch.id
            }))
            
            const channelSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('deletechannel_select')
                .setPlaceholder('Pilih channel yang akan dihapus')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(channelOptions)
            
            const row = new ActionRowBuilder().addComponents(channelSelectMenu)
            
            let description = 'Pilih channel yang ingin Anda hapus dari server.'
            if (selectableChannels.size > maxOptions) {
                description += `\n\n⚠️ Hanya menampilkan ${maxOptions} channel pertama. Total channel: ${selectableChannels.size}`
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🗑️ Hapus Channel')
                .setDescription(description)
            
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
        } catch (error) {
            console.error('Error showing delete channel menu:', error)
            await interaction.reply({ content: '❌ Gagal menampilkan menu. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'listchannel') {
        // Handle /listchannel slash command - show all channels
        try {
            const result = await listChannels(interaction)
            
            await interaction.reply({ content: result.message, ephemeral: true })
        } catch (error) {
            console.error('Error listing channels:', error)
            await interaction.reply({ content: '❌ Gagal menampilkan daftar channel. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'setchannel') {
        // Handle /setchannel slash command - select channel to set as bot channel
        try {
            // First check moderator permission
            const { hasAllowedRole } = require('./utility/channelManager.js')
            
            if (!hasAllowedRole(interaction)) {
                await interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya moderator yang boleh menggunakan fitur ini.', ephemeral: true })
                return
            }
            
            // Check if server is registered
            const guildId = interaction.guildId
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar. Ketik "@bot start-gdrive" untuk mendaftarkan server.', ephemeral: true })
                return
            }
            
            const guild = interaction.guild
            const channels = await guild.channels.fetch()
            
            // Filter only text channels
            const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText)
            
            if (textChannels.size === 0) {
                await interaction.reply({ content: '❌ Tidak ada text channel di server ini.', ephemeral: true })
                return
            }
            
            // Discord has a limit of 25 options per select menu
            const maxOptions = 25
            const channelList = textChannels.first(maxOptions)
            
            // Create channel options
            const channelOptions = channelList.map(ch => ({
                label: `# ${ch.name}`,
                value: ch.id
            }))
            
            const channelSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('setchannel_select')
                .setPlaceholder('Pilih channel bot')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(channelOptions)
            
            const row = new ActionRowBuilder().addComponents(channelSelectMenu)
            
            let description = 'Pilih channel yang akan digunakan sebagai channel bot.'
            if (textChannels.size > maxOptions) {
                description += `\n\n⚠️ Hanya menampilkan ${maxOptions} channel pertama. Total: ${textChannels.size}`
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('⚙️ Set Channel Bot')
                .setDescription(description)
            
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
        } catch (error) {
            console.error('Error showing setchannel menu:', error)
            await interaction.reply({ content: '❌ Gagal menampilkan menu. Silakan coba lagi.', ephemeral: true })
        }
    }
    
    // Handle createtask_name_modal - ask for day selection
    if (interaction.isModalSubmit() && interaction.customId === 'createtask_name_modal') {
        const taskName = interaction.fields.getTextInputValue('task_name')
        
        // Store task name and show day selection
        interactionData.set(interaction.user.id + '_taskName', taskName)
        
        const dayRow = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('createtask_days_modal')
                    .setPlaceholder('Pilih hari pengulangan')
                    .setMinValues(1)
                    .setMaxValues(7)
                    .addOptions([
                        { label: 'Senin', value: 'senin' },
                        { label: 'Selasa', value: 'selasa' },
                        { label: 'Rabu', value: 'rabu' },
                        { label: 'Kamis', value: 'kamis' },
                        { label: 'Jumat', value: 'jumat' },
                        { label: 'Sabtu', value: 'sabtu' },
                        { label: 'Minggu', value: 'minggu' }
                    ])
            )
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('📅 Pilih Hari')
            .setDescription(`Task: **${taskName}**\n\nPilih hari dimana task ini akan diulang.`)
        
        await interaction.reply({ embeds: [embed], components: [dayRow], ephemeral: true })
        return
    }
    
    // Handle createtask_days_modal - ask for time
    if (interaction.isStringSelectMenu() && interaction.customId === 'createtask_days_modal') {
        const selectedDays = interaction.values
        const taskName = interactionData.get(interaction.user.id + '_taskName')
        
        if (!taskName) {
            await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createtask', ephemeral: true })
            return
        }
        
        // Store days and show time modal
        interactionData.set(interaction.user.id + '_taskDays', selectedDays)
        
        const timeModal = new ModalBuilder()
            .setCustomId('createtask_time_modal')
            .setTitle('Waktu Aktif Task')
            
        const timeInput = new TextInputBuilder()
            .setCustomId('task_time')
            .setLabel('Waktu Aktif (JJ:MM)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: 14:00')
            .setRequired(true)
            
        const timeRow = new ActionRowBuilder().addComponents(timeInput)
        timeModal.addComponents(timeRow)
        
        const daysLabel = selectedDays.join(', ')
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('⏰ Input Waktu')
            .setDescription(`Task: **${taskName}**\nHari: **${daysLabel}**\n\nMasukkan waktu aktif task.`)
        
        await interaction.update({ embeds: [embed], components: [] })
        await interaction.followUp({ embeds: [embed], components: [timeRow], ephemeral: true })
        return
    }
    
    // Handle createtask_time_modal - save the task
    if (interaction.isModalSubmit() && interaction.customId === 'createtask_time_modal') {
        const activeTime = interaction.fields.getTextInputValue('task_time')
        const taskName = interactionData.get(interaction.user.id + '_taskName')
        const selectedDays = interactionData.get(interaction.user.id + '_taskDays')
        
        if (!taskName || !selectedDays) {
            await interaction.reply({ content: '❌ Sesi expired. Silakan mulai lagi dengan /createtask', ephemeral: true })
            return
        }
        
        try {
            const guildId = interaction.guildId
            const server = await getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
                return
            }
            
            // Create the task with days
            await insertTask(taskName, activeTime, server.id, selectedDays.join(','))
            
            const daysLabel = selectedDays.join(', ')
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Task Dibuat')
                .addFields(
                    { name: 'Nama Task', value: taskName },
                    { name: 'Waktu Aktif', value: activeTime },
                    { name: 'Hari', value: daysLabel }
                )
            
            await interaction.reply({ embeds: [embed], ephemeral: true })
            console.log(`📝 Task "${taskName}" created by ${interaction.user.username} - Days: ${daysLabel}`)
            
            // Clean up
            interactionData.delete(interaction.user.id + '_taskName')
            interactionData.delete(interaction.user.id + '_taskDays')
        } catch (error) {
            console.error('Error creating task:', error)
            await interaction.reply({ content: '❌ Gagal membuat task. Silakan coba lagi.', ephemeral: true })
        }
        return
    }
})

client.on('error', (error) => {
    console.error('❌ Bot error:', error)
})
