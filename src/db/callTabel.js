const { openDB } = require('./initSq.js')

async function showList() {
    //tampilkan task dan jam aktif tabel
}

async function getAllServers() {
    const db = await openDB()
    const servers = await db.all('SELECT * FROM server')
    return servers
}

async function getServerById(id) {
    const db = await openDB()
    const server = await db.get('SELECT * FROM server WHERE id = ?', [id])
    return server
}

async function getServerByServerId(serverId) {
    const db = await openDB()
    const server = await db.get('SELECT * FROM server WHERE serverId = ?', [serverId])
    return server
}

async function getAllUsers() {
    const db = await openDB()
    const users = await db.all('SELECT * FROM user')
    return users
}

async function getUserById(id) {
    const db = await openDB()
    const user = await db.get('SELECT * FROM user WHERE id = ?', [id])
    return user
}

async function getUserByUserId(userId) {
    const db = await openDB()
    const user = await db.get('SELECT * FROM user WHERE userId = ?', [userId])
    return user
}

async function getUsersByServerId(serverId) {
    const db = await openDB()
    const users = await db.all('SELECT * FROM user WHERE serverId = ?', [serverId])
    return users
}

async function getListsByServerId(serverId) {
    const db = await openDB()
    const lists = await db.all('SELECT * FROM list WHERE serverId = ?', [serverId])
    return lists
}

async function getTasksByServerId(serverId) {
    const db = await openDB()
    const tasks = await db.all('SELECT * FROM task WHERE serverId = ?', [serverId])
    return tasks
}

async function getListTasksByListId(listId) {
    const db = await openDB()
    const tasks = await db.all('SELECT * FROM list_task WHERE listId = ?', [listId])
    return tasks
}

// Get all list tasks from all servers
async function getAllListTasks() {
    const db = await openDB()
    const tasks = await db.all('SELECT * FROM list_task')
    return tasks
}

// Get all tasks from all servers
async function getAllTasks() {
    const db = await openDB()
    const tasks = await db.all('SELECT * FROM task')
    return tasks
}

// Get all lists from all servers
async function getAllLists() {
    const db = await openDB()
    const lists = await db.all('SELECT * FROM list')
    return lists
}

module.exports = {
    getAllServers,
    getServerById,
    getServerByServerId,
    getAllUsers,
    getUserById,
    getUserByUserId,
    getUsersByServerId,
    getListsByServerId,
    getTasksByServerId,
    getListTasksByListId,
    getAllListTasks,
    getAllTasks,
    getAllLists
}
