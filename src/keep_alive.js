const http = require('http');

const PORT = process.env.PORT || 3000;

// Create a simple HTTP server
const server = http.createServer((req, res) => {
    // Respond to all requests
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running!');
});

// Start the server
server.listen(PORT, () => {
    console.log(`🌐 Uptime server is running on port ${PORT}`);
});

// Keep the server running
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Export for use in main bot
module.exports = { server };
