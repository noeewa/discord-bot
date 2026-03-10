const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const { getUsersByServerId, getServerByServerId } = require('../db/callTabel.js')

/**
 * Send or edit a broadcast message in the channel
 * - If there's an existing bot message, edit it
 * - If there's no bot message, send a new one
 * @param {TextChannel} channel - The Discord text channel
 * @param {string|EmbedBuilder} content - Message content or embed
 * @returns {Promise<Message>} - The sent or edited message
 */
async function sendBroadcastMessage(channel, content) {
    try {
        // Fetch last 10 messages from the channel
        const messages = await channel.messages.fetch({ limit: 10 })
        
        // Find the last bot message
        const botMessage = messages.find(msg => msg.author.bot && msg.author.id === channel.client.user.id)
        
        if (botMessage) {
            // Edit existing bot message
            if (content instanceof EmbedBuilder) {
                await botMessage.edit({ embeds: [content] })
            } else {
                await botMessage.edit({ content: content })
            }
            return botMessage
        } else {
            // Send new message
            if (content instanceof EmbedBuilder) {
                return await channel.send({ embeds: [content] })
            } else {
                return await channel.send(content)
            }
        }
    } catch (error) {
        console.error('Error sending broadcast message:', error)
        throw error
    }
}

/**
 * Create a broadcast channel that cannot be deleted by regular users
 * @param {Guild} guild - The Discord guild
 * @param {string} channelName - Name of the broadcast channel
 * @param {string} parentId - Category ID where the channel should be created (optional)
 * @returns {Promise<TextChannel>} - The created channel
 */
async function createBroadcastChannel(guild, channelName = '📢broadcast', parentId = null) {
    try {
        // Get server info
        const memberCount = guild.memberCount
        const botCount = guild.members.cache.filter(m => m.user.bot).size
        const userCount = memberCount - botCount
        const region = guild.preferredLocale || 'Unknown'
        
        // Create channel with basic options
        const channelOptions = {
            name: channelName,
            type: ChannelType.GuildText,
            reason: 'Broadcast channel created by bot'
        }

        // Add parent category if specified
        if (parentId) {
            channelOptions.parent = parentId
        }

        const broadcastChannel = await guild.channels.create(channelOptions)

        // Set permissions to prevent regular users from deleting
        try {
            await broadcastChannel.lockPermissions()
            await broadcastChannel.permissionOverwrites.edit(guild.roles.everyone, {
                [PermissionFlagsBits.ManageChannels]: false,
                [PermissionFlagsBits.ManageMessages]: false,
                [PermissionFlagsBits.ManageWebhooks]: false
            })
        } catch (permError) {
            console.log('Note: Could not set full permissions, channel created anyway:', permError.message)
        }

        // Send welcome message with server info
        try {
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('=== BROADCAST CHANNEL ===')
                .setDescription(`Channel ini dibuat untuk mengirim pengumuman broadcast ke semua anggota server.`)
                .addFields(
                    { name: 'Total Members', value: memberCount.toString(), inline: true },
                    { name: 'Total Users', value: userCount.toString(), inline: true },
                    { name: 'Bots', value: botCount.toString(), inline: true }
                )
                .setFooter({ text: `Server ID: ${guild.id}` })
                .setTimestamp()
            
            await broadcastChannel.send({ embeds: [embed] })
        } catch (msgError) {
            console.log('Note: Could not send welcome message:', msgError.message)
        }

        console.log(`Broadcast channel created: ${broadcastChannel.name} (ID: ${broadcastChannel.id})`)
        return broadcastChannel
    } catch (error) {
        console.error('Error creating broadcast channel:', error)
        throw new Error(`Gagal membuat channel broadcast: ${error.message}`)
    }
}

/**
 * Broadcast the number of registered users in the server
 * @param {TextChannel} channel - The Discord text channel
 * @param {string} serverId - The Discord server ID
 * @returns {Promise<Message>} - The sent message
 */
async function broadcastUserCount(channel, serverId) {
    try {
        // Get server from database
        const server = getServerByServerId(serverId)
        if (!server) {
            return await channel.send('❌ Server belum terdaftar. Silakan gunakan /setchannel terlebih dahulu.')
        }
        
        // Get registered users count
        const users = getUsersByServerId(server.id)
        const userCount = users.length
        
        // Create embed message
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('📊 Statistik User Terdaftar')
            .setDescription(`Jumlah user yang terdaftar di database:`)
            .addFields(
                { name: 'Total Terdaftar', value: userCount.toString(), inline: true }
            )
            .setTimestamp()
        
        return await sendBroadcastMessage(channel, embed)
    } catch (error) {
        console.error('Error broadcasting user count:', error)
        throw error
    }
}

module.exports = { createBroadcastChannel, sendBroadcastMessage, broadcastUserCount }
