/*
 * Engine: runs the SAME platform code the app uses (src/services/*, tenant data)
 * inside an isolated VM context on the server. Every action a phone sends is
 * executed here as the signed-in user, so the role checks in App.api are enforced
 * server-side and the server's copy of the data is the single source of truth.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Actions a phone may ask the server to run (everything else is refused).
export const ACTIONS = new Set([
  'checklists.toggle', 'checklists.reset', 'staffReports.create', 'staffReports.decide',
  'prep.toggle', 'prep.setAdjustment', 'prep.updateSettings', 'prep.setBaseline', 'inventory.submit',
  'guides.save', 'admin.saveProduct', 'admin.verifyAllergens', 'admin.addCategory', 'admin.setRole',
  'settings.update', 'settings.saveOverrides', 'loyalty.saveReward', 'counter.redeem',
  'shifts.save', 'shifts.remove', 'shifts.copyWeek', 'shifts.publishWeek',
  'requests.handover', 'requests.swap', 'requests.claim', 'requests.take', 'requests.respond', 'requests.decide', 'requests.cancel',
  'availability.setWeekly', 'leave.request', 'leave.decide', 'leave.cancel',
  'time.clockIn', 'time.breakToggle', 'time.clockOut', 'time.approve', 'time.edit',
  'notifications.markAllRead',
  'chat.markRead', 'chat.send', 'chat.react', 'chat.dm', 'chat.createGroup',
  'feed.create', 'feed.like', 'feed.comment', 'feed.confirmRead', 'feed.vote', 'feed.remove', 'feed.togglePin',
  'events.rsvp', 'events.create', 'learning.completeLesson', 'learning.submitQuiz', 'docs.confirmRead',
  'surveys.respond', 'kudos.give', 'kudos.cheer',
  'labor.setForecast', 'labor.setActual', 'labor.setBudget', 'time.reject', 'time.reopen', 'time.addManual', 'time.lockPeriod',
  'availability.setDates', 'templates.save', 'templates.apply', 'templates.remove', 'autoplan.run', 'autoplan.undo',
  'cover.offer',
]);

const ID_RX = /^[a-z]{1,6}-[a-z0-9]{8,24}$/;

export function createEngine({ root, tenant, dataDir, onChange }) {
  const dbFile = path.join(dataDir, tenant + '.db.json');
  let stored = null;
  try { stored = fs.readFileSync(dbFile, 'utf8'); } catch { /* first start → seed */ }

  // --- localStorage shim: the platform's store.js saves through it ---
  let saveTimer = null;
  const mem = {};
  const persist = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const tmp = dbFile + '.tmp';
      fs.writeFileSync(tmp, mem.db);
      fs.renameSync(tmp, dbFile);
    }, 150);
  };
  const localStorage = {
    getItem: (k) => (k.endsWith('.db') ? (mem.db != null ? mem.db : stored) : mem[k] || null),
    setItem: (k, v) => {
      if (k.endsWith('.db')) { if (v !== mem.db) { mem.db = v; persist(); onChange && onChange(); } }
      else mem[k] = v;
    },
    removeItem: () => {},
  };

  const sandbox = { console, localStorage, setTimeout, clearTimeout, URL };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const load = (rel) => vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });

  const t = 'tenants/' + tenant + '/';
  load(t + 'tenant.js');
  load('src/config/app.config.js');
  // Keep stored data across app updates (no automatic demo reseed on the server).
  if (stored) { try { ctx.App.config.app.dataVersion = JSON.parse(stored).dataVersion; } catch { /* corrupt → reseed */ } }
  ['catalog.js', 'content.js', 'prep.js', 'workforce.js', 'community.js'].forEach((f) => load(t + f));
  ['src/core/util.js', 'src/services/prep.js', 'src/core/store.js', 'src/i18n/i18n.js', 'src/services/api.js',
    'src/services/workforce.js', 'src/services/community.js', 'src/services/labor.js', 'src/services/planning.js'].forEach(load);

  const App = ctx.App;
  // Add data introduced by newer versions to an existing database (no reset needed)
  const upgrade = stored && App.demo.laborSeed && !App.store.db.salesActual;
  if (upgrade) Object.assign(App.store.db, App.demo.laborSeed());
  if (!stored || upgrade) App.store.save();
  if (App.wf.normalizePositions && App.wf.normalizePositions(App.store.db)) App.store.save();
  const applyRules = () => App.wf.applyOverrides && App.wf.applyOverrides((App.store.db.tenantOverrides || {}).workforce || null);
  applyRules();

  function as(userId, lang) {
    App.store.client.sessionUserId = userId;
    App.i18n.lang = lang === 'nb' ? 'nb' : 'en';
  }

  function resolve(name) {
    const [ns, fn] = name.split('.');
    const obj = App.api[ns];
    return obj && typeof obj[fn] === 'function' ? obj[fn].bind(obj) : null;
  }

  function exec(userId, action, args, ids, lang) {
    if (!ACTIONS.has(action)) return { error: 'unknown_action' };
    const fn = resolve(action);
    if (!fn) return { error: 'unknown_action' };
    if (!Array.isArray(args) || args.length > 6) return { error: 'bad_request' };
    // Reuse the ids the phone generated, but only fresh, well-formed ones.
    const raw = JSON.stringify(App.store.db);
    const replay = (Array.isArray(ids) ? ids : []).slice(0, 30).filter((x) => typeof x === 'string' && ID_RX.test(x) && !raw.includes('"' + x + '"'));
    as(userId, lang);
    App.__uidReplay = replay;
    try {
      const result = fn(...JSON.parse(JSON.stringify(args)));
      if (action === 'settings.saveOverrides') applyRules();
      return { ok: true, result: result === undefined ? null : JSON.parse(JSON.stringify(result)) };
    } catch (e) {
      if (e && e.code) return { error: e.code };
      console.error('[action failed]', action, e);
      return { error: 'generic' };
    } finally {
      App.__uidReplay = null;
      App.store.client.sessionUserId = null;
    }
  }

  // Run read-only code as a user (used to build the AI assistant's context).
  function read(userId, lang, fn) {
    as(userId, lang);
    try { return fn(App); } finally { App.store.client.sessionUserId = null; }
  }

  function reset() {
    App.store.resetAll();
    App.store.save();
    applyRules();
  }

  return { App, exec, read, reset, db: () => App.store.db };
}
