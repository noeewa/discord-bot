const Database = require('better-sqlite3')

function openDB() {
    try {
        const db = new Database('./database.db')
        db.pragma('journal_mode = WAL')
        return db
    } catch (error) {
        console.error('Error opening database:', error)
        throw error
    }
}

module.exports = { openDB }
