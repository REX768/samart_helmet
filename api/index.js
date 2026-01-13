// Vercel serverless function wrapper for Smart Helmet System
// Note: Socket.IO requires persistent connections, which may not work perfectly with serverless
// This wrapper handles HTTP requests and can be extended for WebSocket support via Vercel's WebSocket support

// Import the Express app (which includes Socket.IO setup)
// When running on Vercel, the server.listen() won't execute due to require.main check
const app = require('../server');

// Export handler for Vercel
// Vercel will use this as the serverless function handler
module.exports = app;

