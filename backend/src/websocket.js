import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WebSocket] Client connected from ${clientIp}`);
    clients.add(ws);

    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected from ${clientIp}`);
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WebSocket] Client error:', err.message);
      clients.delete(ws);
    });

    ws.send(JSON.stringify({ type: 'connected', message: 'Connected to MikroTik Dashboard' }));
  });

  console.log('[WebSocket] Server initialized on path /ws');
}

export function broadcast(type, data) {
  if (!wss || clients.size === 0) return;

  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  let sent = 0;
  let failed = 0;

  clients.forEach(client => {
    if (client.readyState === 1) {
      try {
        client.send(message);
        sent++;
      } catch (err) {
        console.error('[WebSocket] Failed to send to client:', err.message);
        failed++;
        clients.delete(client);
      }
    } else {
      clients.delete(client);
    }
  });

  if (sent > 0) {
    console.log(`[WebSocket] Broadcasted '${type}' to ${sent} clients${failed > 0 ? ` (${failed} failed)` : ''}`);
  }
}

export function getConnectedClientsCount() {
  return clients.size;
}
