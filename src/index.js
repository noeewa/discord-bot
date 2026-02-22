require('dotenv').config()
const { groqSearch, groqRequest } = require('./utility/groq.js')
const { registerCommandsToGuild } = require('./register-command.js')
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

// Define slash commands (kept for reference, actual registration in register-command.js)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
})


client.login(process.env.TOKEN);

client.on('ready', (c) => {
    console.log(`✅ ${c.user.username} is online!`)
});

// Handle incoming messages
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return
    
    console.log(`📩 Message from ${message.author.username}: ${message.content}`)
    
    // Get message content in lowercase
    const messageContent = message.content.toLowerCase().trim()
    const guildId = message.guildId
    
    // Check if bot is mentioned
    const botMention = message.mentions.has(client.user.id)
    
    // Check if message contains "start-gdrive" as a standalone word
    // This ensures "start-gdrive" is not part of another word
    const hasStartGdrive = /\bstart-gdrive\b/.test(messageContent)
    
    // Registration only triggers when BOTH conditions are met:
    // 1. Bot is mentioned AND
    // 2. Message contains "start-gdrive"
    if (botMention && hasStartGdrive && guildId) {
        // Create register button
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('register_guild')
                    .setLabel('Daftar Server Ini')
                    .setStyle(ButtonStyle.Success)
            )
        
        // Send response with register button
        await message.reply({
            content: `👋 Halo! Saya adalah G-Drive Bot.\n\nKetik "/ask" untuk bertanya tanpa pencarian Google\nKetik "/search" untuk bertanya dengan pencarian Google\n\nKlik tombol di bawah untuk mendaftarkan server ini!`,
            components: [row]
        })
        return
    }
    
    // If bot is mentioned without "start-gdrive", ignore
    if (botMention) {
        return
    }
    
    // Skip commands (messages starting with !)
    if (message.content.startsWith('!')) return
    
    // Show typing indicator while AI responds
    message.channel.sendTyping()
    
})

client.on('interactionCreate', async (interaction) => {
    // Handle button interactions
    if (interaction.isButton()) {
        if (interaction.customId === 'register_guild') {
            const guildId = interaction.guildId
            
            await interaction.reply('🔄 Mendaftarkan perintah ke server...')
            
            const success = await registerCommandsToGuild(guildId)
            
            if (success) {
                await interaction.editReply(`✅ Berhasil! Server ini telah terdaftar.\n\nSekarang kamu bisa menggunakan:\n- \`/ask\` - Bertanya tanpa pencarian Google\n- \`/search\` - Bertanya dengan pencarian Google`)
            } else {
                await interaction.editReply('❌ Gagal mendaftarkan server. Silakan coba lagi.')
            }
            return
        }
    }
    
    if (!interaction.isChatInputCommand()) return;
    
    const userName = interaction.user.username;
    const userId = interaction.user.id;
    
    console.log(`⚡ Command from ${userName} (${userId}): /${interaction.commandName}`)
    
    const question = interaction.options.getString('question');
    
    // Reply to the user
    if (interaction.commandName === 'ask') {
        // Show thinking indicator
        await interaction.reply('Thinking...');
        
        // Call groqRequest to get the answer (without Google search)
        const answer = await groqRequest(question);
        
        // Send the answer
        await interaction.editReply(`**Question:** ${question}\n\n**Answer:** ${answer}`);
    } else if (interaction.commandName === 'search') {
        // Show thinking indicator
        await interaction.reply('🔍 Searching and thinking...');
        
        // Call groqSearch to get the answer (with Google search)
        const answer = await groqSearch(question);
        
        // Send the answer
        await interaction.editReply(`**Question:** ${question}\n\n**Answer:** ${answer}`);
    } else if (interaction.commandName === 'clear') {
        // Handle /clear slash command - delete specified number of bot messages
        try {
            const channel = interaction.channel
            
            // Get the count parameter (default to 5 if not provided)
            const count = interaction.options.getInteger('count') || 4
            
            // Fetch messages from the channel
            const messages = await channel.messages.fetch()
            
            // Filter bot messages and take only the specified number
            const botMessages = messages.filter(msg => msg.author.bot).first(count + 1)
            
            // Delete the bot messages
            let deletedCount = 0
            for (const msg of botMessages) {
                await msg.delete()
                deletedCount++
            }
            
            await interaction.editReply(`🗑️ Cleared ${deletedCount} bot messages`)
            console.log(`🗑️ Cleared ${deletedCount} bot messages`)
        } catch (error) {
            console.error('Error clearing messages:', error)
            await interaction.reply('❌ Gagal menghapus pesan bot. | Pesan melebihi batas.')
        }
    }
})

client.on('error', (error) => {
    console.error('❌ Bot error:', error)
})
