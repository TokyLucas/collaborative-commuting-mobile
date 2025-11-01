require('dotenv').config();
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8787;
const wss = new WebSocketServer({ port: PORT });
console.log(`WS signaling on :${PORT}`);

const clients = new Map(); // userId -> ws

function safeSend(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

wss.on('connection', (ws) => {
  let uid = null;

  ws.on('message', (buf) => {
    let msg; try { msg = JSON.parse(buf.toString()); } catch { return; }

    if (msg.type === 'register' && msg.userId) {
      uid = msg.userId; clients.set(uid, ws);
      safeSend(ws, { type: 'registered', userId: uid });
      return;
    }
    const dest = msg.to && clients.get(msg.to);
    if (!dest) return;
    if (!msg.from && uid) msg.from = uid;
    safeSend(dest, msg);
  });

  ws.on('close', () => { if (uid) clients.delete(uid); });
});
