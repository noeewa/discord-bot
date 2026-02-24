const { openDB } = require('./initSq.js')

async function createServerTable() {
    const db = await openDB()
    await db.exec(`
        CREATE TABLE IF NOT EXISTS server (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaServer TEXT,
            serverId TEXT,
            channelId TEXT,
            broadcastChannelId TEXT
        )
    `)
    
    // Migration: Add channelId column if it doesn't exist (for existing databases)
    const tableInfo = await db.all("PRAGMA table_info(server)")
    const hasChannelId = tableInfo.some(col => col.name === 'channelId')
    if (!hasChannelId) {
        await db.exec(`ALTER TABLE server ADD COLUMN channelId TEXT`)
        console.log('Migrated: Added channelId column to server table')
    }
    
    // Migration: Add broadcastChannelId column if it doesn't exist
    const tableInfo2 = await db.all("PRAGMA table_info(server)")
    const hasBroadcastChannelId = tableInfo2.some(col => col.name === 'broadcastChannelId')
    if (!hasBroadcastChannelId) {
        await db.exec(`ALTER TABLE server ADD COLUMN broadcastChannelId TEXT`)
        console.log('Migrated: Added broadcastChannelId column to server table')
    }
    
    console.log('Server table created successfully')
}

async function createUserTable() {
    const db = await openDB()
    await db.exec(`
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaUser TEXT,
            userId TEXT,
            serverId INTEGER,
            FOREIGN KEY (serverId) REFERENCES server(id)
        )
    `)
    console.log('User table created successfully')
}

async function createListTable() {
    const db = await openDB()
    await db.exec(`
        CREATE TABLE IF NOT EXISTS list (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaList TEXT,
            activeTime TEXT,
            serverId INTEGER,
            FOREIGN KEY (serverId) REFERENCES server(id)
        )
    `)
    console.log('List table created successfully')
}

async function createListTaskTable() {
    const db = await openDB()
    await db.exec(`
        CREATE TABLE IF NOT EXISTS list_task (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaTask TEXT,
            target TEXT,
            activeDay TEXT,
            listId INTEGER,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (listId) REFERENCES list(id)
        )
    `)
    
    // Migration: Add activeDay column if it doesn't exist
    const tableInfo = await db.all("PRAGMA table_info(list_task)")
    const hasActiveDay = tableInfo.some(col => col.name === 'activeDay')
    if (!hasActiveDay) {
        await db.exec(`ALTER TABLE list_task ADD COLUMN activeDay TEXT`)
        console.log('Migrated: Added activeDay column to list_task table')
    }
    
    // Migration: Add status column if it doesn't exist
    const tableInfo2 = await db.all("PRAGMA table_info(list_task)")
    const hasStatus = tableInfo2.some(col => col.name === 'status')
    if (!hasStatus) {
        await db.exec(`ALTER TABLE list_task ADD COLUMN status TEXT DEFAULT 'pending'`)
        console.log('Migrated: Added status column to list_task table')
    }
    
    console.log('ListTask table created successfully')
}

async function createTaskTable() {
    const db = await openDB()
    await db.exec(`
        CREATE TABLE IF NOT EXISTS task (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaTask TEXT,
            activeTime TEXT,
            activeDay TEXT,
            serverId INTEGER,
            status TEXT DEFAULT 'pending',
            FOREIGN KEY (serverId) REFERENCES server(id)
        )
    `)
    
    // Migration: Add activeDay column if it doesn't exist
    const tableInfo = await db.all("PRAGMA table_info(task)")
    const hasActiveDay = tableInfo.some(col => col.name === 'activeDay')
    if (!hasActiveDay) {
        await db.exec(`ALTER TABLE task ADD COLUMN activeDay TEXT`)
        console.log('Migrated: Added activeDay column to task table')
    }
    
    // Migration: Add status column if it doesn't exist
    const tableInfo2 = await db.all("PRAGMA table_info(task)")
    const hasStatus = tableInfo2.some(col => col.name === 'status')
    if (!hasStatus) {
        await db.exec(`ALTER TABLE task ADD COLUMN status TEXT DEFAULT 'pending'`)
        console.log('Migrated: Added status column to task table')
    }
    
    console.log('Task table created successfully')
}

async function createAllTables() {
    await createServerTable()
    await createUserTable()
    await createListTable()
    await createListTaskTable()
    await createTaskTable()
    console.log('All tables created successfully')
}

module.exports = { 
    createServerTable, 
    createUserTable, 
    createListTable, 
    createListTaskTable, 
    createTaskTable,
    createAllTables 
}
