const cron = require('node-cron')
const { EmbedBuilder } = require('discord.js')
const { getAllServers, getTasksByServerId, getListTasksByListId, getListsByServerId, getAllListTasks, getAllTasks, getAllLists, getUsersByServerId } = require('./db/callTabel.js')
const { sendBroadcastMessage } = require('./utility/broadcast.js')
const { resetAllTaskStatuses } = require('./db/unsertTabel.js')

// Store active timers
const activeTimers = new Map()

// Day mapping from Indonesia to numeric (cron format)
const DAY_MAP = {
    'senin': '1',
    'selasa': '2',
    'rabu': '3',
    'kamis': '4',
    'jumat': '5',
    'sabtu': '6',
    'minggu': '0'
}

// Indonesia day names
const DAY_NAMES = {
    '0': 'Minggu',
    '1': 'Senin',
    '2': 'Selasa',
    '3': 'Rabu',
    '4': 'Kamis',
    '5': 'Jumat',
    '6': 'Sabtu'
}

/**
 * Get formatted time for Indonesia timezone
 */
function getIndonesiaTime() {
    const now = new Date()
    const options = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }
    return now.toLocaleString('id-ID', options)
}

/**
 * Get current hour and day in Indonesia timezone
 */
function getIndonesiaDayHour() {
    const now = new Date()
    const options = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false,
        weekday: 'short'
    }
    const dayStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'short' })
    const hour = parseInt(now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }))
    
    // Map Indonesian short day to cron day
    const dayMap = {
        'Sen': '1',
        'Sel': '2',
        'Rab': '3',
        'Kam': '4',
        'Jum': '5',
        'Sab': '6',
        'Min': '0'
    }
    
    return {
        hour: hour,
        dayNum: dayMap[dayStr] || '0',
        dayName: DAY_NAMES[dayMap[dayStr]] || 'Minggu'
    }
}

/**
 * Get current time in Indonesia timezone as Date object
 */
function getIndonesiaNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
}

/**
 * Calculate time difference in milliseconds until target time
 * @param {number} targetHour - Target hour (0-23)
 * @param {number} targetMinute - Target minute (0-59)
 * @returns {number|null} - Milliseconds until target, or null if more than 1 hour
 */
function getTimeUntilTarget(targetHour, targetMinute) {
    const now = getIndonesiaNow()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentSecond = now.getSeconds()
    
    let targetDate = new Date(now)
    targetDate.setHours(targetHour, targetMinute, 0, 0)
    
    // If target time has passed today, it means tomorrow
    if (targetHour < currentHour || (targetHour === currentHour && targetMinute <= currentMinute)) {
        targetDate.setDate(targetDate.getDate() + 1)
    }
    
    const diffMs = targetDate.getTime() - now.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    
    // Only return if less than or equal to 60 minutes
    if (diffMinutes <= 60) {
        return diffMs
    }
    return null
}

/**
 * Check all tasks and set timers for tasks within 1 hour
 * @param {Client} client - Discord client
 */
async function checkAndScheduleTimers(client) {
    try {
        console.log('🔍 Checking tasks for timer scheduling...')
        
        const servers = await getAllServers()
        const { hour: currentHour, dayNum: currentDayNum, dayName: currentDayName } = getIndonesiaDayHour()
        
        for (const server of servers) {
            if (!server.broadcastChannelId) continue
            
            try {
                const guild = await client.guilds.fetch(server.serverId)
                if (!guild) continue
                
                const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
                if (!broadcastChannel) continue
                
                // Check tasks from list table
                const lists = await getListsByServerId(server.id)
                for (const list of lists) {
                    // Get activeTime from list
                    if (list.activeTime) {
                        const [taskHour, taskMinute] = list.activeTime.split(':').map(Number)
                        const timeUntil = getTimeUntilTarget(taskHour, taskMinute)
                        
                        if (timeUntil !== null && timeUntil > 0) {
                            // Check if timer already exists for this list
                            const timerKey = `list_${list.id}`
                            if (!activeTimers.has(timerKey)) {
                                console.log(`⏱️ Scheduling timer for list "${list.namaList}" in ${Math.round(timeUntil/60000)} minutes`)
                                scheduleTaskTimer(client, server, list, null, timeUntil)
                            }
                        }
                    }
                    
                    // Check individual tasks in list
                    const listTasks = await getListTasksByListId(list.id)
                    for (const task of listTasks) {
                        if (task.activeDay) {
                            const days = task.activeDay.split(',')
                            if (days.includes(currentDayNum.toString())) {
                                // Get the list's activeTime for this task
                                if (list.activeTime) {
                                    const [taskHour, taskMinute] = list.activeTime.split(':').map(Number)
                                    const timeUntil = getTimeUntilTarget(taskHour, taskMinute)
                                    
                                    if (timeUntil !== null && timeUntil > 0) {
                                        const timerKey = `task_${task.id}`
                                        if (!activeTimers.has(timerKey)) {
                                            console.log(`⏱️ Scheduling timer for task "${task.namaTask}" in ${Math.round(timeUntil/60000)} minutes`)
                                            scheduleTaskTimer(client, server, list, task, timeUntil)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Check standalone tasks
                const tasks = await getTasksByServerId(server.id)
                for (const task of tasks) {
                    if (!task.activeDay || !task.activeTime) continue
                    
                    const days = task.activeDay.split(',')
                    if (days.includes(currentDayNum.toString())) {
                        const [taskHour, taskMinute] = task.activeTime.split(':').map(Number)
                        const timeUntil = getTimeUntilTarget(taskHour, taskMinute)
                        
                        if (timeUntil !== null && timeUntil > 0) {
                            const timerKey = `standalone_task_${task.id}`
                            if (!activeTimers.has(timerKey)) {
                                console.log(`⏱️ Scheduling timer for standalone task "${task.namaTask}" in ${Math.round(timeUntil/60000)} minutes`)
                                scheduleStandaloneTaskTimer(client, server, task, timeUntil)
                            }
                        }
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error checking timers for server ${server.serverId}:`, error.message)
            }
        }
        
        console.log('✅ Timer check completed')
    } catch (error) {
        console.error('❌ Error in checkAndScheduleTimers:', error)
    }
}

/**
 * Schedule a timer for list task
 * @param {Client} client - Discord client
 * @param {Object} server - Server data
 * @param {Object} list - List data
 * @param {Object|null} task - Task data (null for list-level)
 * @param {number} delayMs - Delay in milliseconds
 */
function scheduleTaskTimer(client, server, list, task, delayMs) {
    const timerKey = task ? `task_${task.id}` : `list_${list.id}`
    
    const timer = setTimeout(async () => {
        console.log(`⏰ Timer triggered for ${task ? task.namaTask : list.namaList}`)
        
        try {
            const guild = await client.guilds.fetch(server.serverId)
            if (!guild) return
            
            const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
            if (!broadcastChannel) return
            
            await sendTaskBroadcast(client, server, list, task)
            
        } catch (error) {
            console.error(`❌ Error in task timer:`, error.message)
        } finally {
            activeTimers.delete(timerKey)
        }
    }, delayMs)
    
    activeTimers.set(timerKey, timer)
}

/**
 * Schedule a timer for standalone task
 * @param {Client} client - Discord client
 * @param {Object} server - Server data
 * @param {Object} task - Task data
 * @param {number} delayMs - Delay in milliseconds
 */
function scheduleStandaloneTaskTimer(client, server, task, delayMs) {
    const timerKey = `standalone_task_${task.id}`
    
    const timer = setTimeout(async () => {
        console.log(`⏰ Timer triggered for standalone task "${task.namaTask}"`)
        
        try {
            const guild = await client.guilds.fetch(server.serverId)
            if (!guild) return
            
            const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
            if (!broadcastChannel) return
            
            await sendStandaloneTaskBroadcast(client, server, task)
            
        } catch (error) {
            console.error(`❌ Error in standalone task timer:`, error.message)
        } finally {
            activeTimers.delete(timerKey)
        }
    }, delayMs)
    
    activeTimers.set(timerKey, timer)
}

/**
 * Send broadcast for list task with ✅/❌ emojis
 * @param {Client} client - Discord client
 * @param {Object} server - Server data
 * @param {Object} list - List data
 * @param {Object|null} task - Task data (null for all tasks in list)
 */
async function sendTaskBroadcast(client, server, list, task) {
    try {
        const guild = await client.guilds.fetch(server.serverId)
        if (!guild) return
        
        const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
        if (!broadcastChannel) return
        
        const { hour: currentHour, dayName: currentDayName } = getIndonesiaDayHour()
        const timeString = `${currentHour}:00`
        
        // Get all tasks in this list
        const listTasks = await getListTasksByListId(list.id)
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('=== RINCIAN TASK ===')
            .setDescription(`Waktu: ${currentDayName}, ${timeString}`)
            .addFields(
                { name: 'List', value: list.namaList, inline: true }
            )
        
        // Add each task with ✅ or ❌ emoji
        if (task) {
            // Single task
            const emoji = task.status === 'completed' ? '✅' : '❌'
            embed.addFields({
                name: 'Task',
                value: `${emoji} ${task.namaTask}${task.target ? ` (Target: ${task.target})` : ''}`
            })
        } else {
            // All tasks in list
            const taskFields = listTasks.map(t => {
                const emoji = t.status === 'completed' ? '✅' : '❌'
                return `${emoji} ${t.namaTask}${t.target ? ` (Target: ${t.target})` : ''}`
            })
            
            embed.addFields({
                name: `Daftar Task (${listTasks.length})`,
                value: taskFields.join('\n')
            })
        }
        
        embed.setFooter({ text: `Server: ${server.namaServer}` })
            .setTimestamp()
        
        await sendBroadcastMessage(broadcastChannel, embed)
        console.log(`✅ Sent task broadcast for "${list.namaList}"`)
        
    } catch (error) {
        console.error('❌ Error sending task broadcast:', error.message)
    }
}

/**
 * Send broadcast for standalone task with ✅/❌ emoji
 * @param {Client} client - Discord client
 * @param {Object} server - Server data
 * @param {Object} task - Task data
 */
async function sendStandaloneTaskBroadcast(client, server, task) {
    try {
        const guild = await client.guilds.fetch(server.serverId)
        if (!guild) return
        
        const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
        if (!broadcastChannel) return
        
        const { hour: currentHour, dayName: currentDayName } = getIndonesiaDayHour()
        const timeString = `${currentHour}:00`
        const emoji = task.status === 'completed' ? '✅' : '❌'
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('=== RINCIAN TASK ===')
            .setDescription(`Waktu: ${currentDayName}, ${timeString}`)
            .addFields(
                { name: 'Task', value: `${emoji} ${task.namaTask}` },
                { name: 'Waktu Aktif', value: task.activeTime || '-', inline: true },
                { name: 'Hari Aktif', value: task.activeDay || '-', inline: true }
            )
            .setFooter({ text: `Server: ${server.namaServer}` })
            .setTimestamp()
        
        await sendBroadcastMessage(broadcastChannel, embed)
        console.log(`✅ Sent standalone task broadcast for "${task.namaTask}"`)
        
    } catch (error) {
        console.error('❌ Error sending standalone task broadcast:', error.message)
    }
}

/**
 * Reset all task statuses at the start of a new day
 * @param {Client} client - Discord client
 */
async function resetDailyTaskStatuses(client) {
    try {
        console.log('🔄 Resetting all task statuses for new day...')
        await resetAllTaskStatuses()
        console.log('✅ All task statuses reset')
    } catch (error) {
        console.error('❌ Error resetting task statuses:', error)
    }
}

/**
 * Schedule live clock updates every hour
 * @param {Client} client - Discord client
 */
function scheduleLiveClock(client) {
    // Schedule task to run every hour at minute 00
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ Live clock update triggered...')
        
        // Reset task statuses at the start of each hour (new day check)
        await resetDailyTaskStatuses(client)
        
        // Check and schedule timers for tasks within 1 hour
        await checkAndScheduleTimers(client)
        
        // Send hourly update
        await sendHourlyUpdate(client)
    }, {
        timezone: 'Asia/Jakarta'
    })
    
    console.log('⏰ Live clock scheduled: Update every hour at XX:00 (Indonesia time)')
}

/**
 * Send hourly update to all broadcast channels
 * @param {Client} client - Discord client
 */
async function sendHourlyUpdate(client) {
    try {
        const servers = await getAllServers()
        const { hour: currentHour, dayNum: currentDayNum, dayName: currentDayName } = getIndonesiaDayHour()
        
        console.log(`⏰ Sending hourly update for ${currentDayName} at ${currentHour}:00`)
        
        for (const server of servers) {
            // Skip if no broadcast channel
            if (!server.broadcastChannelId) {
                continue
            }
            
            try {
                const guild = await client.guilds.fetch(server.serverId)
                if (!guild) {
                    console.log(`⚠️ Could not find guild ${server.serverId}`)
                    continue
                }
                
                const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
                if (!broadcastChannel) {
                    console.log(`⚠️ Broadcast channel not found in guild ${guild.name}`)
                    continue
                }
                
                // Get lists for this server
                const lists = await getListsByServerId(server.id)
                let taskList = []
                
                for (const list of lists) {
                    const listTasks = await getListTasksByListId(list.id)
                    
                    // Filter tasks that match current day and hour
                    const matchingTasks = listTasks.filter(t => {
                        if (!t.activeDay) return false
                        
                        const days = t.activeDay.split(',')
                        const taskHour = t.activeTime ? parseInt(t.activeTime.split(':')[0]) : null
                        
                        // Check if day matches AND hour matches
                        return days.includes(currentDayNum.toString()) && taskHour === currentHour
                    })
                    
                    if (matchingTasks.length > 0) {
                        taskList.push({
                            listName: list.namaList,
                            tasks: matchingTasks.map(t => `- ${t.namaTask}`)
                        })
                    }
                }
                
                // Format time
                const timeString = getIndonesiaTime()
                
                // Get registered users count
                const users = await getUsersByServerId(server.id)
                const userCount = users.length
                
                // Get bot count from Discord
                const botCount = guild.members.cache.filter(m => m.user.bot).size
                
                // Create embed
                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('=== JAM BROADCAST ===')
                    .setDescription(`Waktu saat ini di Indonesia:`)
                    .addFields(
                        { name: 'Hari', value: currentDayName, inline: false },
                        { name: 'Jam', value: `${currentHour}:00`, inline: false },
                        { name: 'User Terdaftar', value: userCount.toString(), inline: false }
                    )
                
                // Add task info if any
                if (taskList.length > 0) {
                    const taskDescription = taskList.map(l => 
                        `**${l.listName}:**\n${l.tasks.join('\n')}`
                    ).join('\n\n')
                    
                    embed.addFields(
                        { name: 'Task Aktif', value: taskDescription }
                    )
                }
                
                embed.setFooter({ text: `Server: ${server.namaServer}` })
                    .setTimestamp()
                
                await sendBroadcastMessage(broadcastChannel, embed)
                console.log(`✅ Sent hourly update to ${guild.name} - #${broadcastChannel.name}`)
                
            } catch (error) {
                console.error(`❌ Error sending update to server ${server.serverId}:`, error.message)
            }
        }
        
        console.log('⏰ Hourly update completed')
    } catch (error) {
        console.error('❌ Error in hourly update:', error)
    }
}

/**
 * Send a test message to a specific broadcast channel
 * @param {Client} client - Discord client
 * @param {string} serverId - Server ID
 */
async function sendTestBroadcast(client, serverId) {
    try {
        const servers = await getAllServers()
        const server = servers.find(s => s.serverId === serverId)
        
        if (!server) {
            return 'Server not found'
        }
        
        if (!server.broadcastChannelId) {
            return 'Broadcast channel not set for this server'
        }
        
        const guild = await client.guilds.fetch(serverId)
        if (!guild) {
            return 'Guild not found'
        }
        
        const broadcastChannel = guild.channels.cache.get(server.broadcastChannelId)
        if (!broadcastChannel) {
            return 'Broadcast channel not found'
        }
        
        const timeString = getIndonesiaTime()
        const { hour: currentHour, dayName: currentDayName } = getIndonesiaDayHour()
        
        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('=== TEST BROADCAST ===')
            .setDescription(`Waktu saat ini di Indonesia:\n${currentDayName}, ${timeString}`)
            .setFooter({ text: `Server: ${server.namaServer}` })
            .setTimestamp()
        
        await sendBroadcastMessage(broadcastChannel, embed)
        return 'Test broadcast sent!'
    } catch (error) {
        return `Error: ${error.message}`
    }
}

module.exports = {
    scheduleLiveClock,
    sendHourlyUpdate,
    sendTestBroadcast,
    getIndonesiaTime,
    getIndonesiaDayHour,
    checkAndScheduleTimers,
    resetDailyTaskStatuses
}
