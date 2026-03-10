const { openDB } = require('./initSq.js')

// Server functions
function insertServer(namaServer, serverId, channelId = null) {
    const db = openDB()
    const result = db.prepare(
        `INSERT INTO server (namaServer, serverId, channelId) VALUES (?, ?, ?)`
    ).run([namaServer, serverId, channelId])
    console.log('Server inserted successfully')
    return result.lastInsertRowid
}

// Update server channel
function updateServerChannel(serverId, channelId) {
    const db = openDB()
    db.prepare(
        `UPDATE server SET channelId = ? WHERE id = ?`
    ).run([channelId, serverId])
    console.log('Server channel updated successfully')
}

// Update server broadcast channel
function updateServerBroadcastChannel(serverId, broadcastChannelId) {
    const db = openDB()
    db.prepare(
        `UPDATE server SET broadcastChannelId = ? WHERE id = ?`
    ).run([broadcastChannelId, serverId])
    console.log('Server broadcast channel updated successfully')
}

// Update server music channel
function updateServerMusicChannel(serverId, musicChannelId) {
    const db = openDB()
    db.prepare(
        `UPDATE server SET musicChannelId = ? WHERE id = ?`
    ).run([musicChannelId, serverId])
    console.log('Server music channel updated successfully')
}

// User functions
function insertUser(namaUser, userId, serverId) {
    const db = openDB()
    const result = db.prepare(
        `INSERT INTO user (namaUser, userId, serverId) VALUES (?, ?, ?)`
    ).run([namaUser, userId, serverId])
    console.log('User inserted successfully')
    return result.lastInsertRowid
}

// Bot functions - store bot as user with bot_ prefix
function insertBot(namaBot, botId, serverId) {
    const db = openDB()
    // Prefix bot userId with 'bot_' to identify it
    const result = db.prepare(
        `INSERT INTO user (namaUser, userId, serverId) VALUES (?, ?, ?)`
    ).run([namaBot, 'bot_' + botId, serverId])
    console.log('Bot inserted successfully')
    return result.lastInsertRowid
}

function insertMultipleUsers(users, serverId) {
    const db = openDB()
    const stmt = db.prepare(
        `INSERT INTO user (namaUser, userId, serverId) VALUES (?, ?, ?)`
    )
    
    const insertMany = db.transaction((users) => {
        for (const user of users) {
            stmt.run([user.namaUser, user.userId, serverId])
        }
    })
    
    insertMany(users)
    console.log(`${users.length} users inserted successfully`)
}

// List functions
function insertList(namaList, activeTime, serverId) {
    const db = openDB()
    const result = db.prepare(
        `INSERT INTO list (namaList, activeTime, serverId) VALUES (?, ?, ?)`
    ).run([namaList, activeTime, serverId])
    console.log('List inserted successfully')
    return result.lastInsertRowid
}

// ListTask functions
function insertListTask(namaTask, target, listId, activeDay = null) {
    const db = openDB()
    const result = db.prepare(
        `INSERT INTO list_task (namaTask, target, activeDay, listId) VALUES (?, ?, ?, ?)`
    ).run([namaTask, target, activeDay, listId])
    console.log('ListTask inserted successfully')
    return result.lastInsertRowid
}

// Task functions (daily reminder)
function insertTask(namaTask, activeTime, serverId, activeDay = null) {
    const db = openDB()
    const result = db.prepare(
        `INSERT INTO task (namaTask, activeTime, activeDay, serverId) VALUES (?, ?, ?, ?)`
    ).run([namaTask, activeTime, activeDay, serverId])
    console.log('Task inserted successfully')
    return result.lastInsertRowid
}

module.exports = { 
    insertServer, 
    insertUser, 
    insertBot,
    insertMultipleUsers,
    insertList,
    insertListTask,
    insertTask,
    updateServerChannel,
    updateServerBroadcastChannel,
    updateServerMusicChannel
}
