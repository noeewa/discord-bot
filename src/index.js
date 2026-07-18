require('dotenv').config()
require('./keep_alive.js') // Uptime worker
const { groqSearch, groqRequest, getLastMessages, groqRequest_chat } = require('./utility/groq.js')
const { registerCommandsToGuild } = require('./register-command.js')
const { createAllTables } = require('./db/createTabel.js')
const { insertServer, insertUser, insertMultipleUsers, insertList, insertListTask, insertTask, updateServerChannel, updateServerBroadcastChannel, updateServerMusicChannel } = require('./db/insertTabel.js')
const { getServerByServerId, getListsByServerId, getTasksByServerId, getListTasksByListId, getUsersByServerId, getAllServers, getUserByUserIdAndServerId } = require('./db/callTabel.js')
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
const { joinVoiceChannel, VoiceConnectionStatus } = require('@discordjs/voice')
const { handleGplay, handleGpause, handleGresume, handleGskip, handleGnext, handleGqueue, handleGnowplaying, handleGvolume, handleGclear, handleGloop, handleGstop, handleGremove, handleGseek } = require('./utility/musicPlayer.js')

// Store temporary data for multi-step interactions
const interactionData = new Map();

// Store voice connections per guild
const voiceConnections = new Map();

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
    
    // Register commands to all existing servers
    const allServers = getAllServers()
    for (const server of allServers) {
        try {
            await registerCommandsToGuild(server.serverId)
            console.log(`✅ Commands registered to server: ${server.serverId}`)
        } catch (error) {
            console.error(`❌ Failed to register commands to server ${server.serverId}:`, error.message)
        }
    }
    
    // Start live clock scheduler
    scheduleLiveClock(client)
});

// Handle new member joining - auto-add user to database if server is registered
client.on('guildMemberAdd', async (member) => {
    // Skip if member is a bot
    if (member.user.bot) {
        return
    }
    
    const guildId = member.guild.id
    
    // Check if server is registered
    const server = await getServerByServerId(guildId)
    
    if (!server) {
        // Server not registered, skip
        return
    }
    
    // Check if user already exists in database
    const existingUser = getUserByUserIdAndServerId(member.user.id, server.id)
    
    if (existingUser) {
        console.log(`⏭️ User already in database: ${member.user.username} - skipping auto-join`)
        return
    }
    
    // Add user to database
    await insertUser(member.user.username, member.user.id, server.id)
    console.log(`➕ User auto-added to database: ${member.user.username} (ID: ${member.user.id}) in server: ${server.namaServer}`)
});

// Handle incoming messages
client.on('messageCreate', async (message) => {
    // Ignore bot messages (except in music channel where we delete them)
    if (message.author.bot) {
        // Check if this is in a music channel - delete bot messages there
        const guildId = message.guildId
        const server = await getServerByServerId(guildId)
        
        if (server && server.musicChannelId && message.channelId === server.musicChannelId) {
            // Delete bot message in music channel after 1 second
            setTimeout(async () => {
                try {
                    await message.delete()
                    console.log(`🗑️ Deleted bot message in music channel: "${message.content}"`)
                } catch (e) {
                    // Message may have been deleted
                }
            }, 1000)
        }
        return
    }
    
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
    
    // Check if message is in a music channel - only allow links
    if (server && server.musicChannelId && message.channelId === server.musicChannelId) {
        const urlRegex = /(https?:\/\/[^\s]+)/g
        const urlMatch = message.content.match(urlRegex)
        const hasLink = urlMatch && urlMatch.length > 0
        
        if (!hasLink) {
            try {
                const guild = message.guild
                const broadcastChannel = server.broadcastChannelId ? await guild.channels.fetch(server.broadcastChannelId) : null
                
                if (broadcastChannel) {
                    await broadcastChannel.send(`${message.author}, ⚠️ chanel khusus link!!`)
                }
                
                setTimeout(async () => {
                    try {
                        await message.delete()
                        console.log(`🗑️ Deleted non-link message in music channel: "${message.content}"`)
                    } catch (delError) {
                    }
                }, 1000)
            } catch (error) {
                console.error('Error handling music channel message:', error)
            }
            return
        }
        
        const url = urlMatch[0]
        try {
            await require('./utility/musicPlayer.js').handleGplay(message, url)
        } catch (error) {
            console.error('Error auto-playing from music channel:', error)
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
        
        // Handle addchannel type button - show channel name modal
        if (interaction.customId.startsWith('addchannel_type_')) {
            try {
                const channelType = interaction.customId.replace('addchannel_type_', '')
                
                // Get stored category data
                const storedData = interactionData.get(interaction.user.id)
                if (!storedData || !storedData.categoryId) {
                    await interaction.reply({ content: '❌ Sesi expired. Silakan ketik /addchannel lagi.', ephemeral: true })
                    return
                }
                
                // Store channel type
                interactionData.set(interaction.user.id, { ...storedData, channelType })
                
                // Check if channel name was provided via command parameter (stored in interactionData)
                const channelName = storedData?.channelName
                
                // If channel name was provided, create channel directly without showing modal
                if (channelName) {
                    const isBroadcast = channelType === 'broadcast'
                    const finalChannelType = channelType === 'broadcast' ? 'text' : channelType
                    
                    // Create the channel
                    const result = await addChannel(interaction, channelName, finalChannelType, isBroadcast, storedData.categoryId === 'none' ? null : storedData.categoryId)
                    
                    await interaction.reply({ content: result.message, ephemeral: true })
                    
                    // Clean up stored data
                    interactionData.delete(interaction.user.id)
                    
                    console.log(`➕ Channel "${channelName}" created by ${interaction.user.username} in category ${storedData.categoryName}`)
                    return
                }
                
                // Show modal for channel name
                const channelNameModal = new ModalBuilder()
                    .setCustomId('addchannel_name_modal')
                    .setTitle('Nama Channel')
                    
                const channelNameInput = new TextInputBuilder()
                    .setCustomId('channel_name')
                    .setLabel('Nama Channel')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: umum, voice-chat-1')
                    .setRequired(true)
                    
                const channelNameRow = new ActionRowBuilder().addComponents(channelNameInput)
                channelNameModal.addComponents(channelNameRow)
                
                await interaction.showModal(channelNameModal)
            } catch (error) {
                console.error('Error showing channel name modal:', error)
                const errorMessage = error.message || ''
                if (errorMessage.includes('Unknown interaction') || errorMessage.includes('already replied')) {
                    // Interaction already handled or expired - ignore
                    return
                }
                try {
                    await interaction.reply({ content: '❌ Gagal membuka form. Silakan ketik /addchannel lagi.', ephemeral: true })
                } catch (e) {
                    // Can't reply - interaction expired
                }
            }
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
                await interaction.deferReply({ ephemeral: true })
                
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
                
                // Get registered users count from database
                const users = getUsersByServerId(server.id)
                const userCount = users.length
                
                // Get bot count from Discord server
                const botCount = guild.members.cache.filter(m => m.user.bot).size
                
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('=== BROADCAST CHANNEL ===')
                    .setDescription(`Channel ini telah diset sebagai channel broadcast.`)
                    .addFields(
                        { name: 'Jam', value: `${dayName}, ${timeString}`, inline: false },
                        { name: 'User Terdaftar', value: userCount.toString(), inline: false },
                        { name: 'Bot Terdaftar', value: botCount.toString(), inline: false },
                        { name: 'Status', value: '✅ Aktif', inline: false }
                    )
                    .setFooter({ text: `Server: ${guild.name}` })
                    .setTimestamp()
                
                await sendBroadcastMessage(channel, embed).catch(err => {
                    console.error('Error sending broadcast message:', err.message)
                })
                
                await interaction.editReply({ content: `✅ Channel broadcast telah diset ke "#${channel.name}"!\n\n📝 Channel ini akan:\n- Menampilkan pesan broadcast dari bot\n- Menghapus pesan dari user (bukan bot)\n- Mengedit pesan bot yang sudah ada` })
            } catch (error) {
                console.error('Error setting channel from select:', error)
                await interaction.editReply({ content: '❌ Gagal menyimpan channel. Silakan coba lagi.' })
            }
            return
        }
        
        // Handle setchanelmusic selection
        if (interaction.customId === 'setchanelmusic_select') {
            try {
                await interaction.deferReply({ ephemeral: true })
                
                const channelId = interaction.values[0]
                const guild = interaction.guild
                
                // Fetch the channel
                const channel = await guild.channels.fetch(channelId)
                
                if (!channel) {
                    await interaction.editReply({ content: '❌ Channel tidak ditemukan.' })
                    return
                }
                
                // Get server info
                const guildId = interaction.guildId
                const server = await getServerByServerId(guildId)
                
                if (!server) {
                    await interaction.editReply({ content: '❌ Server belum terdaftar.' })
                    return
                }
                
                // Update the music channel in database
                await updateServerMusicChannel(server.id, channelId)
                
                await interaction.editReply({ content: `✅ Channel music telah diset ke "#${channel.name}"!\n\n📝 Channel ini akan:\n- Hanya menerima link (URL)\n- Menghapus command bot\n- Menghapus pesan biasa yang bukan link` })
            } catch (error) {
                console.error('Error setting music channel from select:', error)
                await interaction.editReply({ content: '❌ Gagal menyimpan channel. Silakan coba lagi.' })
            }
            return
        }
        
        // Handle addchannel category selection
        if (interaction.customId === 'addchannel_category_select') {
            try {
                const categoryId = interaction.values[0]
                const guild = interaction.guild
                
                // Get category name if not "none"
                let categoryName = 'Tanpa Category'
                let category = null
                if (categoryId !== 'none') {
                    category = await guild.channels.fetch(categoryId)
                    if (category) {
                        categoryName = category.name
                    }
                }
                
                // Store category selection in interactionData
                interactionData.set(interaction.user.id, { categoryId, categoryName, category })
                
                // Create buttons for channel type selection
                const textButton = new ButtonBuilder()
                    .setCustomId('addchannel_type_text')
                    .setLabel('📝 Text Channel')
                    .setStyle(ButtonStyle.Primary)
                
                const voiceButton = new ButtonBuilder()
                    .setCustomId('addchannel_type_voice')
                    .setLabel('🔊 Voice Channel')
                    .setStyle(ButtonStyle.Primary)
                
                const broadcastButton = new ButtonBuilder()
                    .setCustomId('addchannel_type_broadcast')
                    .setLabel('📢 Broadcast Channel')
                    .setStyle(ButtonStyle.Success)
                
                const typeRow = new ActionRowBuilder().addComponents(textButton, voiceButton, broadcastButton)
                
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('➕ Buat Channel Baru')
                    .setDescription(`Category: **${categoryName}**\n\nPilih tipe channel yang ingin dibuat:`)
                
                await interaction.update({ embeds: [embed], components: [typeRow] })
            } catch (error) {
                console.error('Error handling category selection:', error)
                await interaction.reply({ content: '❌ Gagal memproses pilihan. Silakan coba lagi.', ephemeral: true })
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
        
        // Handle addchannel name modal
        if (interaction.customId === 'addchannel_name_modal') {
            try {
                const storedData = interactionData.get(interaction.user.id)
                
                if (!storedData || !storedData.categoryId || !storedData.channelType) {
                    await interaction.reply({ content: '❌ Sesi expired. Silakan ketik /addchannel lagi.', ephemeral: true })
                    return
                }
                
                // Check if channel name was provided via command parameter, otherwise get from modal
                let channelName = storedData?.channelName
                if (!channelName) {
                    channelName = interaction.fields.getTextInputValue('channel_name')
                }
                
                const { categoryId, channelType } = storedData
                const isBroadcast = channelType === 'broadcast'
                const finalChannelType = channelType === 'broadcast' ? 'text' : channelType
                
                // Create the channel
                const result = await addChannel(interaction, channelName, finalChannelType, isBroadcast, categoryId === 'none' ? null : categoryId)
                
                await interaction.reply({ content: result.message, ephemeral: true })
                
                // Clean up stored data
                interactionData.delete(interaction.user.id)
                
                console.log(`➕ Channel "${channelName}" created by ${interaction.user.username} in category ${storedData.categoryName}`)
            } catch (error) {
                console.error('Error creating channel:', error)
                await interaction.reply({ content: '❌ Gagal membuat channel. Silakan coba lagi.', ephemeral: true })
            }
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
        // Handle /addchannel slash command - show category selection first
        try {
            // First check moderator permission
            const { hasAllowedRole } = require('./utility/channelManager.js')
            
            if (!hasAllowedRole(interaction)) {
                await interaction.reply({ content: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya moderator yang boleh menggunakan fitur ini.', ephemeral: true })
                return
            }
            
            // Get channel name if provided as parameter
            const channelName = interaction.options.getString('nama')
            
            const guild = interaction.guild
            const channels = await guild.channels.fetch()
            
            // Get all categories
            const categories = channels.filter(ch => ch.type === ChannelType.GuildCategory)
            
            // Create options for category selection
            const categoryOptions = []
            
            // Add "Tanpa Category" option
            categoryOptions.push({
                label: 'Tanpa Category',
                value: 'none'
            })
            
            // Add existing categories (limit to 24 due to Discord limit)
            const categoryArray = Array.from(categories.values()).slice(0, 24)
            for (const category of categoryArray) {
                categoryOptions.push({
                    label: category.name,
                    value: category.id
                })
            }
            
            // Create select menu for category
            const categorySelectMenu = new StringSelectMenuBuilder()
                .setCustomId('addchannel_category_select')
                .setPlaceholder('Pilih category untuk channel baru')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(categoryOptions)
            
            const categoryRow = new ActionRowBuilder().addComponents(categorySelectMenu)
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('➕ Buat Channel Baru')
                .setDescription(channelName 
                    ? `Nama channel: **${channelName}**\nPilih category terlebih dahulu untuk channel baru.` 
                    : 'Pilih category terlebih dahulu untuk channel baru.')
            
            // Store channel name in interactionData for later use
            if (channelName) {
                const existingData = interactionData.get(interaction.user.id) || {}
                interactionData.set(interaction.user.id, { ...existingData, channelName })
            }
            
            await interaction.reply({ embeds: [embed], components: [categoryRow], ephemeral: true })
        } catch (error) {
            console.error('Error showing addchannel menu:', error)
            const errorMessage = error.message || ''
            if (errorMessage.includes('Unknown interaction') || errorMessage.includes('already replied')) {
                // Ignore - interaction already handled
                return
            }
            try {
                await interaction.reply({ content: '❌ Gagal menampilkan menu. Silakan coba lagi.', ephemeral: true })
            } catch (e) {
                console.log('Cannot reply to interaction:', e.message)
            }
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
            
            // Filter only text, voice and announcement channels (not categories)
            const selectableChannels = channels.filter(ch => 
                ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildAnnouncement
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
            
            // Filter only text channels and announcement channels
            const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
            
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
    } else if (interaction.commandName === 'userstats') {
        // Handle /userstats slash command - show registered user count
        try {
            const guildId = interaction.guildId
            const server = getServerByServerId(guildId)
            
            if (!server) {
                await interaction.reply({ content: '❌ Server belum terdaftar.', ephemeral: true })
                return
            }
            
            const users = getUsersByServerId(server.id)
            const userCount = users.length
            
            const embed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('📊 Statistik User Terdaftar')
                .setDescription(`Jumlah user yang terdaftar di database:`)
                .addFields(
                    { name: 'Total Terdaftar', value: userCount.toString(), inline: true }
                )
                .setTimestamp()
            
            await interaction.reply({ embeds: [embed], ephemeral: true })
        } catch (error) {
            console.error('Error showing userstats:', error)
            await interaction.reply({ content: '❌ Gagal menampilkan statistik user.', ephemeral: true })
        }
    } else if (interaction.commandName === 'setchanelmusic') {
        // Handle /setchanelmusic slash command - set music channel that only accepts links
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
            
            // Filter only text channels and announcement channels
            const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement)
            
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
                .setCustomId('setchanelmusic_select')
                .setPlaceholder('Pilih channel music')
                .setMinValues(1)
                .setMaxValues(1)
                .addOptions(channelOptions)
            
            const row = new ActionRowBuilder().addComponents(channelSelectMenu)
            
            let description = 'Pilih channel yang akan digunakan sebagai channel music.\nHanya link yang diizinkan di channel ini, command dan pesan lain akan dihapus secara otomatis.'
            if (textChannels.size > maxOptions) {
                description += `\n\n⚠️ Hanya menampilkan ${maxOptions} channel pertama. Total: ${textChannels.size}`
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('🎵 Set Channel Music')
                .setDescription(description)
            
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })
        } catch (error) {
            console.error('Error showing setchanelmusic menu:', error)
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

    if (interaction.commandName === 'gjoin') {
        try {
            const voiceChannel = interaction.member.voice.channel
            if (!voiceChannel) {
                await interaction.reply({ content: '❌ Anda harus berada di voice channel untuk menggunakan perintah ini.', ephemeral: true })
                return
            }

            const guildId = interaction.guildId
            const queue = require('./utility/musicPlayer.js').getQueue(guildId)
            
            if (queue.voiceConnection) {
                await interaction.reply({ content: '❌ Bot sudah terhubung ke voice channel di server ini.', ephemeral: true })
                return
            }

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            })

            queue.voiceConnection = connection
            
            connection.on(VoiceConnectionStatus.Disconnected, () => {
                queue.voiceConnection = null
            })

            connection.on(VoiceConnectionStatus.Destroyed, () => {
                queue.voiceConnection = null
            })

            await interaction.reply({ content: `✅ Bot bergabung ke voice channel: **${voiceChannel.name}**` })
            console.log(`🔊 Bot joined voice channel: ${voiceChannel.name} in guild: ${interaction.guild.name}`)
        } catch (error) {
            console.error('Error joining voice channel:', error)
            await interaction.reply({ content: '❌ Gagal join ke voice channel. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'gleft') {
        try {
            const guildId = interaction.guildId
            const queue = require('./utility/musicPlayer.js').getQueue(guildId)

            if (!queue.voiceConnection) {
                await interaction.reply({ content: '❌ Bot tidak sedang terhubung ke voice channel di server ini.', ephemeral: true })
                return
            }

            queue.voiceConnection.destroy()
            queue.voiceConnection = null

            await interaction.reply({ content: '✅ Bot meninggalkan voice channel.' })
            console.log(`🔊 Bot left voice channel in guild: ${interaction.guild.name}`)
        } catch (error) {
            console.error('Error leaving voice channel:', error)
            await interaction.reply({ content: '❌ Gagal meninggalkan voice channel. Silakan coba lagi.', ephemeral: true })
        }
    } else if (interaction.commandName === 'gplay') {
        const url = interaction.options.getString('url')
        await handleGplay(interaction, url)
    } else if (interaction.commandName === 'gpause') {
        await handleGpause(interaction)
    } else if (interaction.commandName === 'gresume') {
        await handleGresume(interaction)
    } else if (interaction.commandName === 'gskip' || interaction.commandName === 'gnext') {
        await handleGskip(interaction)
    } else if (interaction.commandName === 'gqueue') {
        await handleGqueue(interaction)
    } else if (interaction.commandName === 'gnowplaying') {
        await handleGnowplaying(interaction)
    } else if (interaction.commandName === 'gvolume') {
        const volume = interaction.options.getInteger('volume')
        await handleGvolume(interaction, volume)
    } else if (interaction.commandName === 'gshuffle') {
        await interaction.reply('🔀 Fitur shuffle belum diimplementasikan.')
    } else if (interaction.commandName === 'gclear') {
        await handleGclear(interaction)
    } else if (interaction.commandName === 'gloop') {
        const mode = interaction.options.getString('mode') || 'off'
        await handleGloop(interaction, mode)
    } else if (interaction.commandName === 'gremove') {
        await interaction.reply('❌ Fitur remove belum diimplementasikan.')
    } else if (interaction.commandName === 'gseek') {
        await interaction.reply('❌ Fitur seek belum diimplementasikan.')
    } else if (interaction.commandName === 'gstop') {
        await handleGstop(interaction)
    }
})

client.on('error', (error) => {
    console.error('❌ Bot error:', error)
})
