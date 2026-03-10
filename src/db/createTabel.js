const { openDB } = require('./initSq.js')

function createServerTable() {
    const db = openDB()
    db.exec(`
        CREATE TABLE IF NOT EXISTS server (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            namaServer TEXT,
            serverId TEXT,
            channelId TEXT,
            broadcastChannelId TEXT,
            musicChannelId TEXT
        )
    `)
    
    // Migration: Add channelId column if it doesn't exist (for existing databases)
    try {
        const tableInfo = db.prepare("PRAGMA table_info(server)").all()
        const hasChannelId = tableInfo.some(col => col.name === 'channelId')
        if (!hasChannelId) {
            db.exec(`ALTER TABLE server ADD COLUMN channelId TEXT`)
            console.log('Migrated: Added channelId column to server table')
        }
        
        // Migration: Add broadcastChannelId column if it doesn't exist
        const hasBroadcastChannelId = tableInfo.some(col => col.name === 'broadcastChannelId')
        if (!hasBroadcastChannelId) {
            db.exec(`ALTER TABLE server ADD COLUMN broadcastChannelId TEXT`)
            console.log('Migrated: Added broadcastChannelId column to server table')
        }
        
        // Migration: Add musicChannelId column if it doesn't exist
        const hasMusicChannelId = tableInfo.some(col => col.name === 'musicChannelId')
        if (!hasMusicChannelId) {
            db.exec(`ALTER TABLE server ADD COLUMN musicChannelId TEXT`)
            console.log('Migrated: Added musicChannelId column to server table')
        }
    } catch (e) {
        console.log('Migration check skipped:', e.message)
    }
    
    console.log('Server table created successfully')
}

function createUserTable() {
    const db = openDB()
    db.exec(`
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

function createListTable() {
    const db = openDB()
    db.exec(`
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

function createListTaskTable() {
    const db = openDB()
    db.exec(`
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
    try {
        const tableInfo = db.prepare("PRAGMA table_info(list_task)").all()
        const hasActiveDay = tableInfo.some(col => col.name === 'activeDay')
        if (!hasActiveDay) {
            db.exec(`ALTER TABLE list_task ADD COLUMN activeDay TEXT`)
            console.log('Migrated: Added activeDay column to list_task table')
        }
        
        // Migration: Add status column if it doesn't exist
        const hasStatus = tableInfo.some(col => col.name === 'status')
        if (!hasStatus) {
            db.exec(`ALTER TABLE list_task ADD COLUMN status TEXT DEFAULT 'pending'`)
            console.log('Migrated: Added status column to list_task table')
        }
    } catch (e) {
        console.log('Migration check skipped:', e.message)
    }
    
    console.log('ListTask table created successfully')
}

function createTaskTable() {
    const db = openDB()
    db.exec(`
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
    try {
        const tableInfo = db.prepare("PRAGMA table_info(task)").all()
        const hasActiveDay = tableInfo.some(col => col.name === 'activeDay')
        if (!hasActiveDay) {
            db.exec(`ALTER TABLE task ADD COLUMN activeDay TEXT`)
            console.log('Migrated: Added activeDay column to task table')
        }
        
        // Migration: Add status column if it doesn't exist
        const hasStatus = tableInfo.some(col => col.name === 'status')
        if (!hasStatus) {
            db.exec(`ALTER TABLE task ADD COLUMN status TEXT DEFAULT 'pending'`)
            console.log('Migrated: Added status column to task table')
        }
    } catch (e) {
        console.log('Migration check skipped:', e.message)
    }
    
    console.log('Task table created successfully')
}

function createAllTables() {
    createServerTable()
    createUserTable()
    createListTable()
    createListTaskTable()
    createTaskTable()
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
