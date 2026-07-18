const { joinVoiceChannel, VoiceConnectionStatus, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus, StreamType, VolumeTransformer } = require('@discordjs/voice')
const play = require('play-dl')
const { EmbedBuilder } = require('discord.js')

const queues = new Map()

function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            tracks: [],
            current: null,
            voiceConnection: null,
            audioPlayer: createAudioPlayer(),
            volume: 80,
            loop: 'off', // off, single, queue
            textChannel: null,
            isPlaying: false
        })
    }
    return queues.get(guildId)
}

async function ensureVoiceConnection(guildId, channelId, adapterCreator) {
    const queue = getQueue(guildId)
    
    if (!queue.voiceConnection) {
        const connection = joinVoiceChannel({
            channelId: channelId,
            guildId: guildId,
            adapterCreator: adapterCreator
        })
        
        queue.voiceConnection = connection
        
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            queue.voiceConnection = null
        })
        
        connection.on(VoiceConnectionStatus.Destroyed, () => {
            queue.voiceConnection = null
        })
        
        connection.on('error', (error) => {
            console.error('Voice connection error:', error)
            queue.voiceConnection = null
        })
        
        return connection
    }
    
    return queue.voiceConnection
}

async function playTrack(guildId, track, textChannel) {
    const queue = getQueue(guildId)
    queue.textChannel = textChannel
    queue.current = track
    
    try {
        const streamInfo = await play.stream(track.url)
        const resource = createAudioResource(streamInfo.stream, {
            inputType: streamInfo.type,
            inlineVolume: true
        })
        
        resource.volume?.setVolume(queue.volume / 100)
        
        queue.audioPlayer.play(resource)
        
        const connection = queue.voiceConnection
        if (connection) {
            connection.subscribe(queue.audioPlayer)
        }
        
        queue.isPlaying = true
        
        queue.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
            if (queue.loop === 'single' && queue.current) {
                await playTrack(guildId, queue.current, textChannel)
                return
            }
            
            if (queue.loop === 'queue' && queue.current) {
                queue.tracks.push(queue.current)
            }
            
            queue.current = null
            await playNext(guildId, textChannel)
        })
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('🎵 Now Playing')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: 'Channel', value: track.channel || 'Unknown', inline: true },
                { name: 'Duration', value: track.duration || 'Unknown', inline: true },
                { name: 'Position', value: `${queue.tracks.length + 1} in queue`, inline: true }
            )
            .setThumbnail(track.thumbnail || '')
            .setFooter({ text: `Loop: ${queue.loop}` })
        
        await textChannel.send({ embeds: [embed] })
        
    } catch (error) {
        console.error('Error playing track:', error)
        await textChannel.send(`❌ Gagal memutar: ${track.title}`)
        await playNext(guildId, textChannel)
    }
}

async function playNext(guildId, textChannel) {
    const queue = getQueue(guildId)
    
    if (queue.tracks.length === 0) {
        queue.isPlaying = false
        queue.current = null
        
        if (textChannel) {
            await textChannel.send('✅ Queue selesai. Tidak ada lagu lagi.')
        }
        return
    }
    
    const nextTrack = queue.tracks.shift()
    await playTrack(guildId, nextTrack, textChannel)
}

async function addToQueue(guildId, tracks, interactionOrChannel) {
    const queue = getQueue(guildId)
    const textChannel = interactionOrChannel.channel || interactionOrChannel
    
    if (!Array.isArray(tracks)) {
        tracks = [tracks]
    }
    
    queue.tracks.push(...tracks)
    
    if (!queue.isPlaying) {
        const track = queue.tracks.shift()
        await playTrack(guildId, track, textChannel)
    } else {
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('✅ Added to Queue')
            .setDescription(`Menambahkan ${tracks.length} lagu ke queue.`)
            .addFields(
                { name: 'Total di Queue', value: `${queue.tracks.length} lagu`, inline: true }
            )
        
        await textChannel.send({ embeds: [embed] })
    }
}

async function handleGplay(context, url) {
    try {
        const isInteraction = typeof context.deferReply === 'function'
        const reply = async (content, options) => {
            if (isInteraction) {
                if (typeof content === 'string') {
                    return options 
                        ? context.editReply({ content, ...options })
                        : context.editReply(content)
                }
                return context.editReply(content)
            }
            if (typeof content === 'string') {
                return options 
                    ? context.channel.send({ content, ...options })
                    : context.channel.send(content)
            }
            return context.channel.send(content)
        }
        
        const guildId = context.guildId
        const member = isInteraction ? context.member : context.member
        const voiceChannel = member?.voice?.channel
        
        if (!voiceChannel) {
            await reply('❌ Anda harus berada di voice channel untuk menggunakan perintah ini.')
            return
        }
        
        if (!url) {
            await reply('❌ Harap berikan URL playlist YouTube Music.')
            return
        }
        
        const urlRegex = /(https?:\/\/[^\s]+)/
        const urlMatch = url.match(urlRegex)
        const playlistUrl = urlMatch ? urlMatch[0] : url
        
        const isYoutubePlaylist = playlistUrl.includes('youtube.com/playlist') || 
                                   playlistUrl.includes('youtube.com/watch') ||
                                   playlistUrl.includes('youtu.be/')
        
        if (!isYoutubePlaylist) {
            await reply('❌ URL harus berupa playlist YouTube atau YouTube Music.')
            return
        }
        
        await ensureVoiceConnection(
            guildId,
            voiceChannel.id,
            context.guild.voiceAdapterCreator
        )
        
        const queue = getQueue(guildId)
        queue.textChannel = context.channel
        
        let videos = []
        
        if (playlistUrl.includes('list=')) {
            const playlistInfo = await play.playlist_info(playlistUrl)
            const allVideos = await playlistInfo.all_videos()
            videos = allVideos.slice(0, 50)
        } else {
            const videoInfo = await play.video_info(playlistUrl)
            videos = [videoInfo.video_details]
        }
        
        if (videos.length === 0) {
            await reply('❌ Tidak dapat menemukan video di playlist tersebut.')
            return
        }
        
        const tracks = videos.map(video => ({
            title: video.title || 'Unknown Title',
            url: video.url,
            duration: video.durationRaw || 'Unknown',
            thumbnail: video.thumbnails?.[0]?.url || video.thumbnails?.[video.thumbnails.length - 1]?.url || '',
            channel: video.channel?.name || video.channel?.id || 'Unknown',
            stream: null
        }))
        
        await addToQueue(guildId, tracks, context)
        
        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Playlist Added')
            .setDescription(`Menambahkan **${videos.length}** lagu ke queue.`)
            .addFields(
                { name: 'Source', value: `[YouTube Music Playlist](${playlistUrl})`, inline: false }
            )
        
        await reply({ embeds: [embed] })
        
    } catch (error) {
        console.error('Error in handleGplay:', error)
        const isInteraction = typeof context.editReply === 'function'
        if (isInteraction) {
            await context.editReply(`❌ Gagal memuat playlist: ${error.message}`)
        } else {
            await context.channel.send(`❌ Gagal memuat playlist: ${error.message}`)
        }
    }
}

async function handleGpause(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying) {
        await interaction.reply('❌ Tidak ada lagu yang sedang diputar.')
        return
    }
    
    queue.audioPlayer.pause()
    await interaction.reply('⏸️ Musik dijeda.')
}

async function handleGresume(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying) {
        await interaction.reply('❌ Tidak ada lagu yang sedang dijeda.')
        return
    }
    
    queue.audioPlayer.unpause()
    await interaction.reply('▶️ Musik dilanjutkan.')
}

async function handleGskip(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying) {
        await interaction.reply('❌ Tidak ada lagu yang sedang diputar.')
        return
    }
    
    queue.audioPlayer.stop()
    await interaction.reply('⏭️ Skip ke lagu berikutnya.')
}

async function handleGnext(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (queue.tracks.length === 0) {
        await interaction.reply('❌ Tidak ada lagu berikutnya di queue.')
        return
    }
    
    queue.audioPlayer.stop()
    await interaction.reply('⏭️ Skip ke lagu berikutnya.')
}

async function handleGqueue(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying && queue.tracks.length === 0) {
        await interaction.reply('❌ Queue kosong.')
        return
    }
    
    const currentTrack = queue.current
    let description = ''
    
    if (currentTrack) {
        description += `**Now Playing:**\n[${currentTrack.title}](${currentTrack.url}) - ${currentTrack.duration || 'Unknown'}\n\n`
    }
    
    if (queue.tracks.length > 0) {
        description += `**Up Next:**\n`
        queue.tracks.slice(0, 10).forEach((track, index) => {
            description += `${index + 1}. [${track.title}](${track.url}) - ${track.duration || 'Unknown'}\n`
        })
        
        if (queue.tracks.length > 10) {
            description += `\n... dan ${queue.tracks.length - 10} lagu lainnya.`
        }
    }
    
    const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('📜 Music Queue')
        .setDescription(description || 'Queue kosong')
        .addFields(
            { name: 'Total di Queue', value: `${queue.tracks.length} lagu`, inline: true },
            { name: 'Volume', value: `${queue.volume}%`, inline: true },
            { name: 'Loop', value: queue.loop, inline: true }
        )
        .setFooter({ text: `Loop mode: ${queue.loop}` })
    
    await interaction.reply({ embeds: [embed] })
}

async function handleGnowplaying(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying || !queue.current) {
        await interaction.reply('❌ Tidak ada lagu yang sedang diputar.')
        return
    }
    
    const track = queue.current
    const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle('🎵 Now Playing')
        .setDescription(`[${track.title}](${track.url})`)
        .addFields(
            { name: 'Channel', value: track.channel || 'Unknown', inline: true },
            { name: 'Duration', value: track.duration || 'Unknown', inline: true },
            { name: 'Volume', value: `${queue.volume}%`, inline: true }
        )
        .setThumbnail(track.thumbnail || '')
        .setFooter({ text: `Loop: ${queue.loop}` })
    
    await interaction.reply({ embeds: [embed] })
}

async function handleGvolume(interaction, volume) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    if (!queue.isPlaying) {
        await interaction.reply('❌ Tidak ada lagu yang sedang diputar.')
        return
    }
    
    const newVolume = Math.max(0, Math.min(100, parseInt(volume)))
    queue.volume = newVolume
    
    const resource = queue.audioPlayer.state.resource
    if (resource && resource.volume) {
        resource.volume.setVolume(newVolume / 100)
    }
    
    await interaction.reply(`🔊 Volume diset ke **${newVolume}%**`)
}

async function handleGclear(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    queue.tracks = []
    await interaction.reply('🗑️ Queue dibersihkan.')
}

async function handleGloop(interaction, mode) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    const validModes = ['off', 'single', 'queue']
    const newMode = mode?.toLowerCase() || 'off'
    
    if (!validModes.includes(newMode)) {
        await interaction.reply('❌ Mode loop tidak valid. Gunakan: off, single, queue')
        return
    }
    
    queue.loop = newMode
    await interaction.reply(`🔁 Loop mode diset ke: **${newMode}**`)
}

async function handleGstop(interaction) {
    const guildId = interaction.guildId
    const queue = getQueue(guildId)
    
    queue.tracks = []
    queue.current = null
    queue.isPlaying = false
    queue.loop = 'off'
    
    if (queue.audioPlayer) {
        queue.audioPlayer.stop()
    }
    
    if (queue.voiceConnection) {
        queue.voiceConnection.destroy()
        queue.voiceConnection = null
    }
    
    queues.delete(guildId)
    
    await interaction.reply('⏹️ Musik dihentikan dan bot meninggalkan voice channel.')
}

function resetQueueState(guildId) {
    const queue = getQueue(guildId)
    queue.tracks = []
    queue.current = null
    queue.isPlaying = false
    queue.loop = 'off'
    queue.textChannel = null
    if (queue.audioPlayer) {
        queue.audioPlayer.stop()
    }
    if (queue.voiceConnection) {
        try {
            queue.voiceConnection.destroy()
        } catch (e) {
            // ignore
        }
        queue.voiceConnection = null
    }
}

module.exports = {
    handleGplay,
    handleGpause,
    handleGresume,
    handleGskip,
    handleGnext,
    handleGqueue,
    handleGnowplaying,
    handleGvolume,
    handleGclear,
    handleGloop,
    handleGstop,
    getQueue,
    queues,
    resetQueueState
}
