/**
 * Backend proxy so the OpenAI API key never goes to the browser.
 * Run: npm start (or node server.js with OPENAI_API_KEY in env)
 * Open: http://localhost:3000
 */
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';

app.use(express.json({ limit: '1mb' }));

// Do not serve the key file to the client
app.get('/config-keys.js', (req, res) => res.status(404).end());

// Serve static files (index.html, config.js, etc.)
app.use(express.static(path.join(__dirname), { index: 'index.html' }));

// Proxy chat requests to OpenAI; key stays on server
app.post('/api/chat', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: { message: 'Server missing OPENAI_API_KEY. Set it in .env or environment.' }
    });
  }
  const { model, messages } = req.body || {};
  if (!model || !Array.isArray(messages)) {
    return res.status(400).json({ error: { message: 'Missing model or messages' } });
  }
  try {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model, messages })
    });
    const text = await response.text();
    res.status(response.status).set('Content-Type', response.headers.get('content-type') || 'application/json').send(text);
  } catch (err) {
    console.error('[api/chat]', err.message);
    res.status(502).json({ error: { message: 'Proxy request failed', detail: err.message } });
  }
});

app.listen(PORT, () => {
  if (!OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY not set. Set it in .env or the app will return 500 for chat.');
  }
  console.log(`Persona Debate server: http://localhost:${PORT}`);
});
