const { openDB } = require('./initSq.js')

// Delete function for list_task table
async function deleteItemList(id) {
    const db = await openDB()
    const result = await db.run(
        `DELETE FROM list_task WHERE id = ?`,
        [id]
    )
    console.log(`List task with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for task table
async function deleteTask(id, serverId) {
    const db = await openDB()
    const result = await db.run(
        `DELETE FROM task WHERE id = ? AND serverId = ?`,
        [id, serverId]
    )
    console.log(`Task with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for list table
async function deleteList(id, serverId) {
    const db = await openDB()
    // First delete all related list_task entries
    await db.run(`DELETE FROM list_task WHERE listId = ?`, [id])
    // Then delete the list itself
    const result = await db.run(
        `DELETE FROM list WHERE id = ? AND serverId = ?`,
        [id, serverId]
    )
    console.log(`List with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for user table
async function deleteUser(id, serverId) {
    const db = await openDB()
    const result = await db.run(
        `DELETE FROM user WHERE id = ? AND serverId = ?`,
        [id, serverId]
    )
    console.log(`User with id ${id} deleted successfully`)
    return result.changes
}

// Delete function for server table
async function deleteServer(serverId) {
    const db = await openDB()
    // First delete all related users
    await db.run(`DELETE FROM user WHERE serverId = ?`, [serverId])
    // Then delete all related lists (which will cascade to list_task)
    const lists = await db.all(`SELECT id FROM list WHERE serverId = ?`, [serverId])
    for (const list of lists) {
        await db.run(`DELETE FROM list_task WHERE listId = ?`, [list.id])
    }
    await db.run(`DELETE FROM list WHERE serverId = ?`, [serverId])
    // Delete all related tasks
    await db.run(`DELETE FROM task WHERE serverId = ?`, [serverId])
    // Finally delete the server
    const result = await db.run(
        `DELETE FROM server WHERE serverId = ?`,
        [serverId]
    )
    console.log(`Server with id ${serverId} deleted successfully`)
    return result.changes
}

// Update status for list_task
async function updateListTaskStatus(id, status) {
    const db = await openDB()
    const result = await db.run(
        `UPDATE list_task SET status = ? WHERE id = ?`,
        [status, id]
    )
    console.log(`List task ${id} status updated to ${status}`)
    return result.changes
}

// Update status for task
async function updateTaskStatus(id, status) {
    const db = await openDB()
    const result = await db.run(
        `UPDATE task SET status = ? WHERE id = ?`,
        [status, id]
    )
    console.log(`Task ${id} status updated to ${status}`)
    return result.changes
}

// Reset all task statuses to pending
async function resetAllTaskStatuses() {
    const db = await openDB()
    await db.run(`UPDATE list_task SET status = 'pending'`)
    await db.run(`UPDATE task SET status = 'pending'`)
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
