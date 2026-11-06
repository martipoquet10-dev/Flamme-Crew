/*
 * Crew server — one process per client company (tenant).
 *
 *   npm start            → http://localhost:8090  (phones on the same Wi-Fi: http://<this-pc-ip>:8090)
 *
 * What it does
 *   - serves the app (index.html, src/, assets/, tenants/)
 *   - sign-in with name + PIN, session tokens
 *   - runs every change through the platform code as the signed-in user (engine.mjs)
 *   - stores the data in server/data/<tenant>.db.json
 *   - pushes "something changed" to every open phone instantly (Server-Sent Events)
 *   - AI assistant endpoint that calls Claude with the company documents (assistant.mjs)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createEngine } from './engine.mjs';
import { scopeFor } from './scope.mjs';
import { ask, aiConfigured } from './assistant.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// ---- config (.env next to this file, then real environment variables win) ----
try {
  fs.readFileSync(path.join(here, '.env'), 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch { /* no .env */ }
const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || '0.0.0.0';
const TENANT = process.env.CREW_TENANT || 'flamme-burger';
const DEMO_PIN = process.env.CREW_DEMO_PIN === undefined ? '1234' : process.env.CREW_DEMO_PIN; // '' = disabled
const dataDir = process.env.CREW_DATA_DIR || path.join(here, 'data'); // point at a persistent disk when hosted
fs.mkdirSync(dataDir, { recursive: true });

// ---- live updates ----
let version = Date.now();
const streams = new Set();
let pushTimer = null;
function changed() {
  version++;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    for (const s of streams) s.res.write(`event: change\ndata: ${version}\n\n` + ':' + ' '.repeat(1024) + '\n\n');
    for (const w of waiters) w(version);
    waiters.clear();
  }, 60);
}
// Long-poll waiters: each open phone asks "anything newer than v?" and gets an answer as soon as
// something changes (or after 25 s). Unlike a stream, every answer is a complete response, so it
// passes through any proxy, tunnel or mobile network without being held back.
const waiters = new Set();

const engine = createEngine({ root, tenant: TENANT, dataDir, onChange: changed });
const isMember = (c, u) => engine.App.api.chat.isMember(c, u);

// ---- auth: PIN hashes + sessions (kept apart from the app data, never sent to phones) ----
const authFile = path.join(dataDir, TENANT + '.auth.json');
let auth = { pins: {}, sessions: {}, fails: {} };
try { auth = Object.assign(auth, JSON.parse(fs.readFileSync(authFile, 'utf8'))); } catch { /* first start */ }
const saveAuth = () => fs.writeFileSync(authFile, JSON.stringify(auth));
const hashPin = (pin, salt) => crypto.scryptSync(String(pin), salt, 32).toString('hex');
function checkPin(userId, pin) {
  const rec = auth.pins[userId];
  if (rec) return crypto.timingSafeEqual(Buffer.from(rec.hash, 'hex'), Buffer.from(hashPin(pin, rec.salt), 'hex'));
  return !!DEMO_PIN && String(pin) === DEMO_PIN;
}
function setPin(userId, pin) { const salt = crypto.randomBytes(16).toString('hex'); auth.pins[userId] = { salt, hash: hashPin(pin, salt) }; saveAuth(); }
const staffUsers = () => engine.db().users.filter((u) => u.role === 'staff' || u.role === 'admin');
function userFromReq(req) {
  const m = (req.headers.authorization || '').match(/^Bearer ([a-f0-9]{48})$/);
  const s = m && auth.sessions[m[1]];
  if (!s) return null;
  const u = staffUsers().find((x) => x.id === s.userId);
  return u ? { user: u, token: m[1] } : null;
}

// ---- helpers ----
function send(req, res, status, body, headers) {
  const json = JSON.stringify(body);
  const h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers || {});
  if (json.length > 2048 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    h['Content-Encoding'] = 'gzip'; res.writeHead(status, h); res.end(zlib.gzipSync(json));
  } else { res.writeHead(status, h); res.end(json); }
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 1e6) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch { reject(new Error('bad_json')); } });
    req.on('error', reject);
  });
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const top = rel.split('/')[0];
  if (!['index.html', 'sw.js', 'src', 'assets', 'tenants'].includes(top)) { res.writeHead(404); return res.end(); }
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': type.startsWith('image/') ? 'public, max-age=3600' : 'no-cache' });
  fs.createReadStream(file).pipe(res);
}

// ---- routes ----
const fails = auth.fails;
async function api(req, res, route) {
  const method = req.method;
  if (route === 'health') return send(req, res, 200, { ok: true, tenant: TENANT, ai: aiConfigured(), version, demoPin: !!DEMO_PIN, pos: !!process.env.CREW_POS_KEY });

  // Till (POS) → daily sales. Off unless CREW_POS_KEY is set. Body: {locationId, date, sales} or {entries:[...]}
  if (route === 'pos/sales' && method === 'POST') {
    const key = process.env.CREW_POS_KEY;
    const given = String(req.headers['x-crew-pos-key'] || '');
    if (!key) return send(req, res, 404, { error: 'not_found' });
    if (given.length !== key.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(key))) return send(req, res, 401, { error: 'bad_key' });
    const body = await readBody(req);
    const entries = Array.isArray(body.entries) ? body.entries : [body];
    const saved = [];
    for (const e of entries.slice(0, 400)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) || !isFinite(Number(e.sales))) continue;
      const mgr = engine.db().users.find((u) => u.role === 'admin' && u.locationId === e.locationId) || engine.db().users.find((u) => u.role === 'admin');
      if (!mgr || !engine.App.api.catalog.location(e.locationId)) continue;
      const r = engine.exec(mgr.id, 'labor.setActual', [e.locationId, e.date, Number(e.sales)], [], 'en');
      if (r.ok) saved.push(e.locationId + '|' + e.date);
    }
    return send(req, res, 200, { ok: true, saved: saved.length });
  }

  if (route === 'accounts' && method === 'GET') {
    return send(req, res, 200, staffUsers().map((u) => ({ id: u.id, name: u.name, title: u.title, locationId: u.locationId, role: u.role, color: u.color })));
  }

  if (route === 'login' && method === 'POST') {
    const { userId, pin } = await readBody(req);
    const u = staffUsers().find((x) => x.id === userId);
    const f = fails[userId] || { n: 0, until: 0 };
    if (f.until > Date.now()) return send(req, res, 429, { error: 'too_many_attempts' });
    if (!u || !/^\d{4,8}$/.test(String(pin || '')) || !checkPin(userId, pin)) {
      f.n++; if (f.n >= 5) { f.until = Date.now() + 5 * 60e3; f.n = 0; } fails[userId] = f; saveAuth();
      return send(req, res, 401, { error: 'wrong_pin' });
    }
    delete fails[userId];
    const token = crypto.randomBytes(24).toString('hex');
    auth.sessions[token] = { userId, at: new Date().toISOString() }; saveAuth();
    return send(req, res, 200, { token, userId });
  }

  const who = userFromReq(req);
  if (!who) return send(req, res, 401, { error: 'not_signed_in' });
  const me = who.user;

  if (route === 'logout' && method === 'POST') { delete auth.sessions[who.token]; saveAuth(); return send(req, res, 200, { ok: true }); }

  if (route === 'state' && method === 'GET') return send(req, res, 200, { version, userId: me.id, db: scopeFor(engine.db(), me, isMember) });

  if (route === 'action' && method === 'POST') {
    const { action, args, ids, lang } = await readBody(req);
    const r = engine.exec(me.id, String(action || ''), args || [], ids, lang);
    return send(req, res, r.error ? (r.error === 'forbidden' ? 403 : 400) : 200, Object.assign(r, { version }));
  }

  if (route.startsWith('wait') && method === 'GET') {
    const since = Number(new URL(req.url, 'http://x').searchParams.get('v')) || 0;
    if (version > since) return send(req, res, 200, { version });
    let done = false;
    const finish = (v) => { if (done) return; done = true; clearTimeout(timer); waiters.delete(finish); send(req, res, 200, { version: v }); };
    const timer = setTimeout(() => finish(version), 25000);
    waiters.add(finish);
    req.on('close', () => { if (!done) { done = true; clearTimeout(timer); waiters.delete(finish); } });
    return;
  }

  if (route === 'events' && method === 'GET') {
    // no-transform + padding stop proxies/CDNs (Cloudflare, nginx) from buffering the stream
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Content-Encoding': 'identity' });
    res.flushHeaders();
    res.write(':' + ' '.repeat(2048) + '\n\n');
    res.write(`event: change\ndata: ${version}\n\n`);
    const s = { res, userId: me.id };
    streams.add(s);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => { clearInterval(ping); streams.delete(s); });
    return;
  }

  if (route === 'assistant' && method === 'POST') {
    if (!aiConfigured()) return send(req, res, 501, { error: 'ai_not_configured' });
    const body = await readBody(req);
    try { return send(req, res, 200, await ask(engine, me, body)); } catch (e) {
      console.error('[assistant]', e && e.status, e && e.message);
      return send(req, res, 502, { error: 'ai_unavailable' });
    }
  }

  if (route === 'pin' && method === 'POST') {
    const { userId, pin, current } = await readBody(req);
    const target = userId || me.id;
    if (!/^\d{4,8}$/.test(String(pin || ''))) return send(req, res, 400, { error: 'pin_format' });
    if (target !== me.id && me.role !== 'admin') return send(req, res, 403, { error: 'forbidden' });
    if (target === me.id && !checkPin(me.id, current)) return send(req, res, 401, { error: 'wrong_pin' });
    if (!staffUsers().some((u) => u.id === target)) return send(req, res, 404, { error: 'not_found' });
    setPin(target, pin);
    if (target !== me.id) Object.keys(auth.sessions).forEach((t) => { if (auth.sessions[t].userId === target) delete auth.sessions[t]; });
    saveAuth();
    return send(req, res, 200, { ok: true });
  }

  // Store kiosk: a manager's device; every punch is confirmed with the employee's own PIN
  if (route === 'kiosk' && method === 'POST') {
    if (me.role !== 'admin') return send(req, res, 403, { error: 'forbidden' });
    const { userId, pin, op, lang } = await readBody(req);
    const target = staffUsers().find((u) => u.id === userId);
    if (!target || (op === 'verify' && target.id !== me.id)) return send(req, res, 404, { error: 'not_found' });
    const f = fails[userId] || { n: 0, until: 0 };
    if (f.until > Date.now()) return send(req, res, 429, { error: 'too_many_attempts' });
    if (!/^\d{4,8}$/.test(String(pin || '')) || !checkPin(userId, pin)) {
      f.n++; if (f.n >= 5) { f.until = Date.now() + 5 * 60e3; f.n = 0; } fails[userId] = f; saveAuth();
      return send(req, res, 401, { error: 'wrong_pin' });
    }
    delete fails[userId];
    if (op === 'verify') return send(req, res, 200, { ok: true });
    const action = { in: 'time.clockIn', out: 'time.clockOut', break: 'time.breakToggle' }[op];
    if (!action) return send(req, res, 400, { error: 'bad_request' });
    const r = engine.exec(target.id, action, op === 'in' ? ['Kiosk'] : [], [], lang);
    return send(req, res, r.error ? 400 : 200, Object.assign(r, { name: target.name }));
  }

  if (route === 'reset' && method === 'POST') {
    if (me.role !== 'admin') return send(req, res, 403, { error: 'forbidden' });
    engine.reset(); changed();
    return send(req, res, 200, { ok: true });
  }

  return send(req, res, 404, { error: 'not_found' });
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  try {
    if (p.startsWith('/api/')) return await api(req, res, p.slice(5));
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    return serveStatic(req, res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) send(req, res, e.message === 'bad_json' || e.message === 'too_large' ? 400 : 500, { error: 'generic' });
  }
});
server.listen(PORT, HOST, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i.address);
  console.log(`\n  ${engine.App.tenant.appName} server running`);
  console.log(`  This computer:   http://localhost:${PORT}`);
  ips.forEach((ip) => console.log(`  Same Wi-Fi:      http://${ip}:${PORT}`));
  console.log(`  AI assistant:    ${aiConfigured() ? 'connected (' + (process.env.CREW_AI_MODEL || 'claude-opus-5-5') + ')' : 'not configured — set ANTHROPIC_API_KEY in server/.env'}`);
  console.log(`  Shared PIN:      ${DEMO_PIN ? 'on (CREW_DEMO_PIN in server/.env) for anyone without a personal PIN' : 'off'}\n`);
});
