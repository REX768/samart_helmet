// Serve the main HTML page for Vercel
const path = require('path');
const fs = require('fs');

module.exports = (req, res) => {
    // Only serve for root path
    if (req.url !== '/' && req.url !== '/index.html') {
        return res.status(404).json({ error: 'Not found' });
    }
    
    const htmlPath = path.join(__dirname, '../public/index.html');
    
    // Check if file exists
    if (!fs.existsSync(htmlPath)) {
        return res.status(404).json({ error: 'HTML file not found' });
    }
    
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
};

