const { openDB } = require('./initSq.js')

// Server functions
async function insertServer(namaServer, serverId, channelId = null) {
    const db = await openDB()
    const result = await db.run(
        `INSERT INTO server (namaServer, serverId, channelId) VALUES (?, ?, ?)`,
        [namaServer, serverId, channelId]
    )
    console.log('Server inserted successfully')
    return result.lastID
}

// Update server channel
async function updateServerChannel(serverId, channelId) {
    const db = await openDB()
    await db.run(
        `UPDATE server SET channelId = ? WHERE serverId = ?`,
        [channelId, serverId]
    )
    console.log('Server channel updated successfully')
}

// Update server broadcast channel
async function updateServerBroadcastChannel(serverId, broadcastChannelId) {
    const db = await openDB()
    await db.run(
        `UPDATE server SET broadcastChannelId = ? WHERE serverId = ?`,
        [broadcastChannelId, serverId]
    )
    console.log('Server broadcast channel updated successfully')
}

// User functions
async function insertUser(namaUser, userId, serverId) {
    const db = await openDB()
    const result = await db.run(
        `INSERT INTO user (namaUser, userId, serverId) VALUES (?, ?, ?)`,
        [namaUser, userId, serverId]
    )
    console.log('User inserted successfully')
    return result.lastID
}

async function insertMultipleUsers(users, serverId) {
    const db = await openDB()
    const stmt = await db.prepare(
        `INSERT INTO user (namaUser, userId, serverId) VALUES (?, ?, ?)`
    )
    
    for (const user of users) {
        await stmt.run([user.namaUser, user.userId, serverId])
    }
    
    await stmt.finalize()
    console.log(`${users.length} users inserted successfully`)
}

// List functions
async function insertList(namaList, activeTime, serverId) {
    const db = await openDB()
    const result = await db.run(
        `INSERT INTO list (namaList, activeTime, serverId) VALUES (?, ?, ?)`,
        [namaList, activeTime, serverId]
    )
    console.log('List inserted successfully')
    return result.lastID
}

// ListTask functions
async function insertListTask(namaTask, target, listId, activeDay = null) {
    const db = await openDB()
    const result = await db.run(
        `INSERT INTO list_task (namaTask, target, activeDay, listId) VALUES (?, ?, ?, ?)`,
        [namaTask, target, activeDay, listId]
    )
    console.log('ListTask inserted successfully')
    return result.lastID
}

// Task functions (daily reminder)
async function insertTask(namaTask, activeTime, serverId, activeDay = null) {
    const db = await openDB()
    const result = await db.run(
        `INSERT INTO task (namaTask, activeTime, activeDay, serverId) VALUES (?, ?, ?, ?)`,
        [namaTask, activeTime, activeDay, serverId]
    )
    console.log('Task inserted successfully')
    return result.lastID
}

module.exports = { 
    insertServer, 
    insertUser, 
    insertMultipleUsers,
    insertList,
    insertListTask,
    insertTask,
    updateServerChannel,
    updateServerBroadcastChannel
}
