#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DEFAULT_ORIGIN = 'http://divyeshs-macbook-pro.local:3000';
const ORIGIN_FILE = path.join(__dirname, '.last_origin');

let memoryOrigin = DEFAULT_ORIGIN;

function getSavedOrigin() {
  try {
    if (fs.existsSync(ORIGIN_FILE)) {
      const saved = fs.readFileSync(ORIGIN_FILE, 'utf8').trim();
      if (saved && (saved.startsWith('http://') || saved.startsWith('https://'))) {
        return saved;
      }
    }
  } catch (err) {
    // ignore
  }
  return memoryOrigin || DEFAULT_ORIGIN;
}

function saveOrigin(origin) {
  try {
    if (origin && (origin.startsWith('http://') || origin.startsWith('https://'))) {
      const clean = origin.replace(/\/+$/, '');
      memoryOrigin = clean;
      fs.writeFileSync(ORIGIN_FILE, clean, 'utf8');
      return clean;
    }
  } catch (err) {
    console.error('[Zerodha Redirect] Failed to persist origin to disk', err);
  }
  return memoryOrigin;
}

const server = http.createServer((req, res) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);

    // Endpoint to dynamically register where the user is browsing from
    if (parsedUrl.pathname === '/__set_origin') {
      const newOrigin = parsedUrl.searchParams.get('origin');
      if (newOrigin) {
        saveOrigin(newOrigin);
        console.log(`[Zerodha Redirect] Updated preferred target origin to: ${newOrigin}`);
      }
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify({ status: 'ok', origin: getSavedOrigin() }));
      return;
    }

    const currentOrigin = getSavedOrigin();
    let targetPath = parsedUrl.pathname;

    // If returning from Zerodha OAuth with request_token on root path, land directly on /zerodha
    if (parsedUrl.searchParams.has('request_token') && (targetPath === '/' || targetPath === '')) {
      targetPath = '/zerodha';
    }

    const targetUrl = `${currentOrigin}${targetPath}${parsedUrl.search}`;
    console.log(`[Zerodha Redirect] Forwarding ${req.method} ${req.url} -> ${targetUrl}`);

    res.writeHead(302, {
      'Location': targetUrl,
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${targetUrl}">
  <title>Redirecting to TradeJournal Zerodha...</title>
  <script>window.location.replace("${targetUrl}");</script>
</head>
<body style="font-family: sans-serif; background: #0b101c; color: #fff; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="text-align: center;">
    <h2>Authenticating Zerodha Kite...</h2>
    <p>Redirecting to <a href="${targetUrl}" style="color: #f6461a;">TradeJournal Zerodha</a>...</p>
  </div>
</body>
</html>`);
  } catch (err) {
    console.error('[Zerodha Redirect Error]', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Redirect error');
  }
});

server.on('error', (err) => {
  console.error('[Zerodha Redirect Server Error]', err);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Zerodha Kite OAuth redirect listener active on http://0.0.0.0:${PORT} -> target: ${getSavedOrigin()}`);
});
