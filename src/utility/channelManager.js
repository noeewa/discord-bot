const { ChannelType, PermissionFlagsBits } = require('discord.js')
require('dotenv').config()

// User ID yang diizinkan untuk menggunakan fungsi channel (dari .env)
const MODERATOR_USER_ID = process.env.MODERATOR

/**
 * Memeriksa apakah user adalah moderator (berdasarkan user ID di .env)
 * @param {import('discord.js').CommandInteraction} interaction 
 * @returns {boolean}
 */
function hasAllowedRole(interaction) {
    const userId = interaction.user.id
    
    // Cek jika user ID cocok dengan MODERATOR di .env
    if (MODERATOR_USER_ID && userId === MODERATOR_USER_ID) {
        return true
    }
    
    return false
}

/**
 * Fungsi untuk menambah channel (hanya untuk moderator)
 * @param {import('discord.js').CommandInteraction} interaction 
 * @param {string} channelName - Nama channel yang akan dibuat
 * @param {string} channelType - Tipe channel (text, voice, category)
 * @param {boolean} isBroadcast - Apakah channel broadcast (read-only)
 * @returns {Promise<object>} - Hasil operasi channel
 */
async function addChannel(interaction, channelName, channelType = 'text', isBroadcast = false) {
    // Cek permission
    if (!hasAllowedRole(interaction)) {
        return {
            success: false,
            message: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya moderator yang boleh menggunakan fitur ini.'
        }
    }

    const guild = interaction.guild
    
    try {
        let channel
        
        switch (channelType.toLowerCase()) {
            case 'voice':
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        },
                    ],
                })
                break
                
            case 'category':
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildCategory,
                })
                break
                
            case 'text':
            default:
                if (isBroadcast) {
                    // Broadcast channel - read only (tidak bisa chat)
                    channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                                deny: [PermissionFlagsBits.SendMessages],
                            },
                        ],
                    })
                } else {
                    channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            {
                                id: guild.id,
                                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                            },
                        ],
                    })
                }
                break
        }
        
        return {
            success: true,
            message: `✅ Channel "${channelName}" (${isBroadcast ? 'broadcast' : channelType}) berhasil dibuat!`,
            channel: channel
        }
        
    } catch (error) {
        console.error('Error creating channel:', error)
        return {
            success: false,
            message: `❌ Gagal membuat channel: ${error.message}`
        }
    }
}

/**
 * Fungsi untuk menghapus channel (hanya untuk role tertentu)
 * @param {import('discord.js').CommandInteraction} interaction 
 * @param {string} channelIdOrName - ID atau nama channel yang akan dihapus
 * @returns {Promise<object>} - Hasil operasi channel
 */
async function deleteChannel(interaction, channelIdOrName) {
    // Cek role permission
    if (!hasAllowedRole(interaction)) {
        return {
            success: false,
            message: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya role tertentu yang boleh menggunakan fitur ini.'
        }
    }

    const guild = interaction.guild
    
    try {
        // Coba cari channel berdasarkan ID atau nama
        let channel = null
        
        // Coba cari berdasarkan ID
        if (channelIdOrName.match(/^\d+$/)) {
            channel = await guild.channels.fetch(channelIdOrName)
        }
        
        // Jika tidak ketemu, cari berdasarkan nama
        if (!channel) {
            const channels = await guild.channels.fetch()
            channel = channels.find(ch => 
                ch.name.toLowerCase() === channelIdOrName.toLowerCase()
            )
        }
        
        if (!channel) {
            return {
                success: false,
                message: `❌ Channel "${channelIdOrName}" tidak ditemukan.`
            }
        }
        
        const channelName = channel.name
        
        // Hapus channel
        await channel.delete()
        
        return {
            success: true,
            message: `✅ Channel "${channelName}" berhasil dihapus!`,
            channel: null
        }
        
    } catch (error) {
        console.error('Error deleting channel:', error)
        return {
            success: false,
            message: `❌ Gagal menghapus channel: ${error.message}`
        }
    }
}

/**
 * Fungsi untuk mendapatkan daftar channel di server (hanya untuk role tertentu)
 * @param {import('discord.js').CommandInteraction} interaction 
 * @returns {Promise<object>} - Hasil operasi
 */
async function listChannels(interaction) {
    // Cek role permission
    if (!hasAllowedRole(interaction)) {
        return {
            success: false,
            message: '❌ Anda tidak memiliki izin untuk menggunakan perintah ini. Hanya role tertentu yang boleh menggunakan fitur ini.'
        }
    }

    const guild = interaction.guild
    
    try {
        const channels = await guild.channels.fetch()
        
        const textChannels = channels.filter(ch => ch.type === ChannelType.GuildText).map(ch => `#${ch.name}`)
        const voiceChannels = channels.filter(ch => ch.type === ChannelType.GuildVoice).map(ch => `🔊${ch.name}`)
        const categories = channels.filter(ch => ch.type === ChannelType.GuildCategory).map(ch => `📁${ch.name}`)
        
        const allChannels = [...categories, ...textChannels, ...voiceChannels]
        
        if (allChannels.length === 0) {
            return {
                success: true,
                message: '📋 Tidak ada channel di server ini.',
                channels: []
            }
        }
        
        return {
            success: true,
            message: `📋 **Daftar Channel:**\n${allChannels.join('\n')}`,
            channels: allChannels
        }
        
    } catch (error) {
        console.error('Error listing channels:', error)
        return {
            success: false,
            message: `❌ Gagal mendapatkan daftar channel: ${error.message}`
        }
    }
}

module.exports = {
    addChannel,
    deleteChannel,
    listChannels,
    hasAllowedRole,
    MODERATOR_USER_ID
}
