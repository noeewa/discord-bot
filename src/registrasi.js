// Registration module - handles server registration flow
const { registerCommandsToGuild } = require('./register-command.js')
const { insertServer, updateServerChannel, updateServerBroadcastChannel } = require('./db/insertTabel.js')
const { getServerByServerId } = require('./db/callTabel.js')
const { EmbedBuilder, ChannelType } = require('discord.js')

async function handleRegistration(interaction, interactionData) {
    const guildId = interaction.guildId
    const guildName = interaction.guild.name
    
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
        // Server already exists - just update and show info
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Server Sudah Terdaftar')
            .addFields(
                { name: 'Server', value: existingServer.namaServer, inline: true },
                { name: 'Channel Bot', value: 'Belum ada (gunakan /addchannel)', inline: true },
                { name: 'Channel Broadcast', value: 'Belum ada (gunakan /addchannel)', inline: true }
            )
            .setDescription('Server ini sudah terdaftar sebelumnya.\nSlash commands telah diperbarui!\nGunakan `/addchannel` untuk membuat channel jika diperlukan.')
        
        await interaction.editReply({ embeds: [embed] })
        return
    }
    
    // New registration - insert server to database
    await interaction.editReply({ content: '✅ Slash commands didaftarkan! Menyimpan data server...' })
    
    const serverId = await insertServer(guildName, guildId)
    
    // Update channel IDs dengan null (tidak ada channel yang dibuat)
    await updateServerBroadcastChannel(serverId, null)
    await updateServerChannel(serverId, null)
    
    console.log(`===== Registered: ${guildName} (ID: ${serverId}) =====`)
    console.log(`📝 Server didaftarkan tanpa membuat channel.`)
    console.log(`Gunakan /addchannel untuk membuat channel jika diperlukan.`)
    
    // Show completion embed
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('✅ Registrasi Selesai!')
        .addFields(
            { name: 'Server', value: guildName, inline: true },
            { name: 'Channel Broadcast', value: 'Belum ada (gunakan /addchannel)', inline: true },
            { name: 'Channel Bot', value: 'Belum ada (gunakan /addchannel)', inline: true }
        )
        .setDescription('Server berhasil didaftarkan!\nGunakan `/addchannel` untuk membuat channel jika diperlukan.')
    
    await interaction.editReply({ embeds: [embed], components: [] })
}

module.exports = {
    handleRegistration
}
