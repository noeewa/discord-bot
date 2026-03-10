const { openDB } = require('./initSq.js')

function showList(serverId) {
    const db = openDB()
    const lists = db.prepare(`
        SELECT l.id, l.namaList, l.activeTime, l.serverId,
               COUNT(lt.id) as taskCount,
               SUM(CASE WHEN lt.status = 'completed' THEN 1 ELSE 0 END) as completedCount
        FROM list l
        LEFT JOIN list_task lt ON l.id = lt.listId
        WHERE l.serverId = ?
        GROUP BY l.id
    `).all(serverId)
    return lists
}

function showListWithTasks(listId) {
    const db = openDB()
    const list = db.prepare('SELECT * FROM list WHERE id = ?').get(listId)
    const tasks = db.prepare('SELECT * FROM list_task WHERE listId = ?').all(listId)
    return { list, tasks }
}

function getAllServers() {
    const db = openDB()
    const servers = db.prepare('SELECT * FROM server').all()
    return servers
}

function getServerById(id) {
    const db = openDB()
    const server = db.prepare('SELECT * FROM server WHERE id = ?').get(id)
    return server
}

function getServerByServerId(serverId) {
    const db = openDB()
    const server = db.prepare('SELECT * FROM server WHERE serverId = ?').get(serverId)
    return server
}

function getAllUsers() {
    const db = openDB()
    const users = db.prepare('SELECT * FROM user').all()
    return users
}

function getUserById(id) {
    const db = openDB()
    const user = db.prepare('SELECT * FROM user WHERE id = ?').get(id)
    return user
}

function getUserByUserId(userId) {
    const db = openDB()
    const user = db.prepare('SELECT * FROM user WHERE userId = ?').get(userId)
    return user
}

function getUsersByServerId(serverId) {
    const db = openDB()
    const users = db.prepare('SELECT * FROM user WHERE serverId = ?').all(serverId)
    return users
}

// Check if user exists in a specific server
function getUserByUserIdAndServerId(userId, serverId) {
    const db = openDB()
    const user = db.prepare('SELECT * FROM user WHERE userId = ? AND serverId = ?').get(userId, serverId)
    return user
}

// Check if bot exists in a specific server
function getBotByServerId(serverId) {
    const db = openDB()
    // Bot is identified by userId starting with 'bot_'
    const bot = db.prepare('SELECT * FROM user WHERE userId LIKE ? AND serverId = ?').get('bot_%', serverId)
    return bot
}

function getListsByServerId(serverId) {
    const db = openDB()
    const lists = db.prepare('SELECT * FROM list WHERE serverId = ?').all(serverId)
    return lists
}

function getTasksByServerId(serverId) {
    const db = openDB()
    const tasks = db.prepare('SELECT * FROM task WHERE serverId = ?').all(serverId)
    return tasks
}

function getListTasksByListId(listId) {
    const db = openDB()
    const tasks = db.prepare('SELECT * FROM list_task WHERE listId = ?').all(listId)
    return tasks
}

// Get all list tasks from all servers
function getAllListTasks() {
    const db = openDB()
    const tasks = db.prepare('SELECT * FROM list_task').all()
    return tasks
}

// Get all tasks from all servers
function getAllTasks() {
    const db = openDB()
    const tasks = db.prepare('SELECT * FROM task').all()
    return tasks
}

// Get all lists from all servers
function getAllLists() {
    const db = openDB()
    const lists = db.prepare('SELECT * FROM list').all()
    return lists
}

module.exports = {
    showList,
    showListWithTasks,
    getAllServers,
    getServerById,
    getServerByServerId,
    getAllUsers,
    getUserById,
    getUserByUserId,
    getUserByUserIdAndServerId,
    getUsersByServerId,
    getBotByServerId,
    getListsByServerId,
    getTasksByServerId,
    getListTasksByListId,
    getAllListTasks,
    getAllTasks,
    getAllLists
}
