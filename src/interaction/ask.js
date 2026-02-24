// Ask command handler
const { groqSearch, groqRequest, getLastMessages } = require('../utility/groq.js')

/**
 * Handle /ask slash command
 * @param {object} interaction - Discord interaction object
 * @param {Client} client - Discord client
 */
async function handleAskCommand(interaction, client) {
    try {
        const question = interaction.options.getString('question')
        
        // Show thinking indicator
        await interaction.reply('Thinking...')
        const channelId = interaction.channelId
        const message = await getLastMessages(client, channelId, 20)
        
        // Call groqRequest to get the answer (without Google search)
        const answer = await groqRequest(question, message)
        
        // Send the answer
        await interaction.editReply(`**Question:** ${question}\n\n**Answer:** ${answer}`)
    } catch (error) {
        console.error('Error in /ask command:', error)
        await interaction.editReply('❌ Terjadi kesalahan saat memproses pertanyaan Anda.')
    }
}

/**
 * Handle /search slash command
 * @param {object} interaction - Discord interaction object
 */
async function handleSearchCommand(interaction) {
    try {
        const question = interaction.options.getString('question')
        
        // Show thinking indicator
        await interaction.reply('🔍 Searching and thinking...')
        
        // Call groqSearch to get the answer (with Google search)
        const answer = await groqSearch(question)
        
        // Send the answer
        await interaction.editReply(`**Question:** ${question}\n\n**Answer:** ${answer}`)
    } catch (error) {
        console.error('Error in /search command:', error)
        await interaction.editReply('❌ Terjadi kesalahan saat mencari jawaban.')
    }
}

module.exports = { handleAskCommand, handleSearchCommand }
