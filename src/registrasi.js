// Registration module - handles server registration flow
const { registerCommandsToGuild } = require('./register-command.js')
const { insertServer, updateServerChannel, updateServerBroadcastChannel, insertUser, insertBot } = require('./db/insertTabel.js')
const { getServerByServerId, getUserByUserIdAndServerId, getBotByServerId, getUsersByServerId } = require('./db/callTabel.js')
const { getIndonesiaTime, getIndonesiaDayHour } = require('./timegenerator.js')
const { sendBroadcastMessage } = require('./utility/broadcast.js')
const { EmbedBuilder, ChannelType } = require('discord.js')

async function handleRegistration(interaction, interactionData) {
    const guildId = interaction.guildId
    const guildName = interaction.guild.name
    const clientUser = interaction.client.user
    const botId = clientUser.id
    const botName = clientUser.username
    
    // Get existing server data
    const existingServer = await getServerByServerId(guildId)
    
    // Always register commands first (even if server is already registered)
    await interaction.deferReply({ ephemeral: true })
    
    const success = await registerCommandsToGuild(guildId)
    
    if (!success) {
        await interaction.editReply({ content: '❌ Gagal mendaftarkan slash commands.' })
        return
    }
    
    if (existingServer) {
        // Server already exists - register user and bot (check if exists first)
        const serverId = existingServer.id
        
        // Check and insert user if not exists
        const existingUser = await getUserByUserIdAndServerId(interaction.user.id, serverId)
        if (!existingUser) {
            await insertUser(interaction.user.username, interaction.user.id, serverId)
            console.log(`➕ User registered: ${interaction.user.username} (ID: ${interaction.user.id})`)
        } else {
            console.log(`⏭️ User already exists: ${interaction.user.username} - skipping`)
        }
        
        // Check and insert bot if not exists
        const existingBot = await getBotByServerId(serverId)
        if (!existingBot) {
            await insertBot(botName, botId, serverId)
            console.log(`➕ Bot registered: ${botName} (ID: ${botId})`)
        } else {
            console.log(`⏭️ Bot already exists: ${botName} - skipping`)
        }
        
        // Get updated user count
        const users = getUsersByServerId(serverId)
        const userCount = users.length
        const botCount = 1
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Server Sudah Terdaftar')
            .addFields(
                { name: 'Server', value: existingServer.namaServer, inline: true },
                { name: 'User Terdaftar', value: userCount.toString(), inline: true },
                { name: 'Bot Terdaftar', value: botCount.toString(), inline: true },
                { name: 'Channel Bot', value: existingServer.channelId ? '<#' + existingServer.channelId + '>' : 'Belum ada (gunakan /addchannel)', inline: true },
                { name: 'Channel Broadcast', value: existingServer.broadcastChannelId ? '<#' + existingServer.broadcastChannelId + '>' : 'Belum ada (gunakan /addchannel)', inline: true }
            )
            .setDescription('Server ini sudah terdaftar sebelumnya.\nUser dan Bot telah diverifikasi!\nSlash commands telah diperbarui!\nGunakan `/addchannel` untuk membuat channel jika diperlukan.')
        
        await interaction.editReply({ embeds: [embed] })
        console.log(`===== Re-registered: ${guildName} (ID: ${serverId}) =====`)
        
        // If server has broadcast channel, send broadcast message
        if (existingServer.broadcastChannelId) {
            try {
                const guild = interaction.guild
                const broadcastChannel = await guild.channels.fetch(existingServer.broadcastChannelId)
                
                if (broadcastChannel) {
                    const timeString = getIndonesiaTime()
                    const { hour, dayName } = getIndonesiaDayHour()
                    
                    const broadcastEmbed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle('=== BROADCAST CHANNEL ===')
                        .setDescription(`User baru telah bergabung dan melakukan registrasi.`)
                        .addFields(
                            { name: 'Jam', value: `${dayName}, ${timeString}`, inline: false },
                            { name: 'User Terdaftar', value: userCount.toString(), inline: false },
                            { name: 'Bot Terdaftar', value: botCount.toString(), inline: false },
                            { name: 'Status', value: '✅ Aktif', inline: false }
                        )
                        .setFooter({ text: `Server: ${guild.name}` })
                        .setTimestamp()
                    
                    await sendBroadcastMessage(broadcastChannel, broadcastEmbed)
                    console.log(`📢 Broadcast message sent after re-registration in channel: ${broadcastChannel.name}`)
                }
            } catch (error) {
                console.error('Error sending broadcast message after re-registration:', error)
            }
        }
        
        return
    }
    
    // New registration - insert server, user, and bot to database
    await interaction.editReply({ content: '✅ Slash commands didaftarkan! Menyimpan data server, user, dan bot...' })
    
    const serverId = await insertServer(guildName, guildId)
    
    // Insert user
    await insertUser(interaction.user.username, interaction.user.id, serverId)
    console.log(`➕ User registered: ${interaction.user.username} (ID: ${interaction.user.id})`)
    
    // Insert bot
    await insertBot(botName, botId, serverId)
    console.log(`➕ Bot registered: ${botName} (ID: ${botId})`)
    
    // Update channel IDs dengan null (tidak ada channel yang dibuat)
    await updateServerBroadcastChannel(serverId, null)
    await updateServerChannel(serverId, null)
    
    console.log(`===== Registered: ${guildName} (ID: ${serverId}) =====`)
    console.log(`📝 Server, User, dan Bot berhasil didaftarkan.`)
    console.log(`Gunakan /addchannel untuk membuat channel jika diperlukan.`)
    
    // Show completion embed
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Registrasi Selesai!')
        .addFields(
            { name: 'Server', value: guildName, inline: true },
            { name: 'User Terdaftar', value: '1', inline: true },
            { name: 'Bot Terdaftar', value: '1', inline: true },
            { name: 'Channel Broadcast', value: 'Belum ada (gunakan /addchannel)', inline: true },
            { name: 'Channel Bot', value: 'Belum ada (gunakan /addchannel)', inline: true }
        )
        .setDescription('Server, User, dan Bot berhasil didaftarkan!\nGunakan `/addchannel` untuk membuat channel jika diperlukan.')
    
    await interaction.editReply({ embeds: [embed], components: [] })
}

module.exports = {
    handleRegistration
}
