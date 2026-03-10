const { openDB } = require('./initSq.js')

// Delete function for list_task table
function deleteItemList(id) {
    const db = openDB()
    const result = db.prepare(
        `DELETE FROM list_task WHERE id = ?`
    ).run(id)
    console.log(`List task with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for task table
function deleteTask(id, serverId) {
    const db = openDB()
    const result = db.prepare(
        `DELETE FROM task WHERE id = ? AND serverId = ?`
    ).run([id, serverId])
    console.log(`Task with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for list table
function deleteList(id, serverId) {
    const db = openDB()
    // First delete all related list_task entries
    db.prepare(`DELETE FROM list_task WHERE listId = ?`).run(id)
    // Then delete the list itself
    const result = db.prepare(
        `DELETE FROM list WHERE id = ? AND serverId = ?`
    ).run([id, serverId])
    console.log(`List with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for user table
function deleteUser(id, serverId) {
    const db = openDB()
    const result = db.prepare(
        `DELETE FROM user WHERE id = ? AND serverId = ?`
    ).run([id, serverId])
    console.log(`User with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for server table
function deleteServer(serverId) {
    const db = openDB()
    // First delete all related users
    db.prepare(`DELETE FROM user WHERE serverId = ?`).run(serverId)
    // Then delete all related lists (which will cascade to list_task)
    const lists = db.prepare(`SELECT id FROM list WHERE serverId = ?`).all(serverId)
    for (const list of lists) {
        db.prepare(`DELETE FROM list_task WHERE listId = ?`).run(list.id)
    }
    db.prepare(`DELETE FROM list WHERE serverId = ?`).run(serverId)
    // Delete all related tasks
    db.prepare(`DELETE FROM task WHERE serverId = ?`).run(serverId)
    // Finally delete the server
    const result = db.prepare(
        `DELETE FROM server WHERE serverId = ?`
    ).run(serverId)
    console.log(`Server with id ${serverId} deleted successfully`)
    return result.changes
}

// Update status for list_task
function updateListTaskStatus(id, status) {
    const db = openDB()
    const result = db.prepare(
        `UPDATE list_task SET status = ? WHERE id = ?`
    ).run([status, id])
    console.log(`List task ${id} status updated to ${status}`)
    return result.changes
}

// Update status for task
function updateTaskStatus(id, status) {
    const db = openDB()
    const result = db.prepare(
        `UPDATE task SET status = ? WHERE id = ?`
    ).run([status, id])
    console.log(`Task ${id} status updated to ${status}`)
    return result.changes
}

// Reset all task statuses to pending
function resetAllTaskStatuses() {
    const db = openDB()
    db.prepare(`UPDATE list_task SET status = 'pending'`).run()
    db.prepare(`UPDATE task SET status = 'pending'`).run()
    console.log('All task statuses reset to pending')
}

module.exports = {
    deleteItemList,
    deleteTask,
    deleteList,
    deleteUser,
    deleteServer,
    updateListTaskStatus,
    updateTaskStatus,
    resetAllTaskStatuses
}
