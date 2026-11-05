/*
 * Sync layer — connects the app to the Crew server when it is served by one.
 *
 *  - Without a server (static hosting, offline demo): nothing changes, data stays on the device.
 *  - With a server: sign-in with name + PIN; every change runs instantly on the phone
 *    (so the app feels fast) AND is sent to the server, which runs the same code as the
 *    signed-in user and stores it. When anything changes for anyone, the server pushes a
 *    signal and every phone downloads the fresh data it is allowed to see.
 */
window.App = window.App || {};

App.sync = (function () {
  const TOKEN_KEY = 'crew.token';
  const store = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k) || localStorage.getItem(k); if (v === null) { sessionStorage.removeItem(k); localStorage.removeItem(k); } else { sessionStorage.setItem(k, v); localStorage.setItem(k, v); } } catch (e) { return null; } };
  const S = { live: false, ai: false, version: 0, accounts: [], token: null, online: true, demoPin: false };
  const MUTATIONS = [
    'checklists.toggle', 'checklists.reset', 'staffReports.create', 'staffReports.decide',
    'prep.toggle', 'prep.setAdjustment', 'prep.updateSettings', 'prep.setBaseline', 'inventory.submit',
    'guides.save', 'admin.saveProduct', 'admin.verifyAllergens', 'admin.addCategory', 'admin.setRole',
    'settings.update', 'settings.saveOverrides', 'loyalty.saveReward', 'counter.redeem',
    'shifts.save', 'shifts.remove', 'shifts.copyWeek', 'shifts.publishWeek',
    'requests.handover', 'requests.swap', 'requests.claim', 'requests.take', 'requests.respond', 'requests.decide', 'requests.cancel',
    'availability.setWeekly', 'leave.request', 'leave.decide', 'leave.cancel',
    'time.clockIn', 'time.breakToggle', 'time.clockOut', 'time.approve', 'time.edit',
    'notifications.markAllRead', 'chat.markRead', 'chat.send', 'chat.react', 'chat.dm', 'chat.createGroup',
    'feed.create', 'feed.like', 'feed.comment', 'feed.confirmRead', 'feed.vote', 'feed.remove', 'feed.togglePin',
    'events.rsvp', 'events.create', 'learning.completeLesson', 'learning.submitQuiz', 'docs.confirmRead',
    'surveys.respond', 'kudos.give', 'kudos.cheer',
  ];

  async function call(method, route, body) {
    const res = await fetch('/api/' + route, {
      method, headers: Object.assign({ 'Content-Type': 'application/json' }, S.token ? { Authorization: 'Bearer ' + S.token } : {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null; try { data = await res.json(); } catch (e) { /* empty */ }
    if (!res.ok) { const err = new Error((data && data.error) || 'http_' + res.status); err.code = (data && data.error) || 'generic'; err.status = res.status; throw err; }
    return data;
  }

  // ---------- state ----------
  async function pull() {
    const s = await call('GET', 'state');
    App.store.db = s.db;
    App.store.client.sessionUserId = s.userId;
    S.version = s.version;
    return s;
  }
  let pulling = null, again = false;
  function refresh() {
    if (pulling) { again = true; return pulling; }
    pulling = pull().then(() => {
      App.kit.applyOverrides(); App.kit.applyTheme();
      App.app.render({ preserve: true });
    }).catch((e) => { if (e.status === 401) signedOut(); }).then(() => { pulling = null; if (again) { again = false; refresh(); } });
    return pulling;
  }

  // ---------- realtime: long polling ("anything newer than my version?") ----------
  // Works through every proxy, tunnel and mobile network; the answer comes as soon as anything changes.
  let streamAbort = null, retry = 1000;
  async function listen() {
    if (streamAbort) streamAbort.abort();
    const ctrl = streamAbort = new AbortController();
    while (S.token && !ctrl.signal.aborted) {
      try {
        const res = await fetch('/api/wait?v=' + S.version, { headers: { Authorization: 'Bearer ' + S.token }, signal: ctrl.signal, cache: 'no-store' });
        if (res.status === 401) return signedOut();
        if (!res.ok) throw new Error('http_' + res.status);
        const r = await res.json();
        setOnline(true); retry = 1000;
        if (r.version > S.version) await refresh();
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setOnline(false);
        await new Promise((ok) => setTimeout(ok, retry)); retry = Math.min(retry * 2, 15000);
      }
    }
  }
  // Safety net if a network in between holds back the live stream: check every 15 s.
  setInterval(async () => {
    if (!S.live || !S.token || document.hidden) return;
    try { const h = await (await fetch('/api/health', { cache: 'no-store' })).json(); if (h.version > S.version) refresh(); } catch (e) { /* offline */ }
  }, 15000);
  function setOnline(v) { if (S.online !== v) { S.online = v; document.documentElement.classList.toggle('is-offline', !v); if (v === false) App.app.toast(App.i18n.T('Connection lost — reconnecting…', 'Mistet forbindelsen — kobler til igjen…'), 'error'); } }

  // ---------- actions: optimistic on the phone, authoritative on the server ----------
  let depth = 0;
  function wrap(name) {
    const [ns, fn] = name.split('.');
    const obj = App.api[ns]; const orig = obj && obj[fn];
    if (!orig) return;
    obj[fn] = function () {
      if (!S.live || depth > 0) return orig.apply(this, arguments);
      const args = Array.prototype.slice.call(arguments);
      depth++; App.__uidRecord = [];
      let result;
      try { result = orig.apply(this, args); } finally { depth--; }
      const ids = App.__uidRecord; App.__uidRecord = null;
      if (name === 'chat.markRead' && result === null) return result; // nothing new to mark
      call('POST', 'action', { action: name, args, ids, lang: App.i18n.lang })
        .then((r) => { if (r.version > S.version) refresh(); })
        .catch((e) => {
          if (e.status === 401) return signedOut();
          const key = 'err.' + e.code;
          App.app.toast(App.i18n.has(key) ? App.i18n.t(key) : App.i18n.T('Could not save — please try again.', 'Kunne ikke lagre — prøv igjen.'), 'error');
          refresh();
        });
      return result;
    };
  }

  // ---------- sign-in ----------
  async function login(userId, pin) {
    const r = await call('POST', 'login', { userId, pin });
    S.token = r.token; store(TOKEN_KEY, r.token);
    await pull(); App.kit.applyOverrides(); App.kit.applyTheme();
    listen();
    return r;
  }
  async function logout() {
    try { await call('POST', 'logout'); } catch (e) { /* already gone */ }
    signedOut(true);
  }
  function signedOut(quiet) {
    S.token = null; store(TOKEN_KEY, null);
    if (streamAbort) streamAbort.abort();
    App.store.client.sessionUserId = null;
    if (!quiet) App.app.toast(App.i18n.T('Please sign in again', 'Logg inn på nytt'));
    App.app.go('#/staff'); App.app.render();
  }
  const setPin = (pin, current, userId) => call('POST', 'pin', { pin, current, userId });
  const reset = () => call('POST', 'reset').then(refresh);

  // AI assistant on the server (Claude). Rejects when it is not configured.
  const askAI = (question, ctx) => call('POST', 'assistant', { question, lang: App.i18n.lang, locationId: ctx.locationId, history: ctx.history || [] });

  // ---------- start ----------
  async function start() {
    let health = null;
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch('/api/health', { signal: ctrl.signal, cache: 'no-store' }); clearTimeout(t);
      if (res.ok) health = await res.json();
    } catch (e) { /* no server → offline demo */ }
    if (!health || !health.ok) return false;
    S.live = true; S.ai = !!health.ai; S.demoPin = !!health.demoPin;
    MUTATIONS.forEach(wrap);
    // Data comes from the server; only device settings (language) are kept locally.
    const origSave = App.store.save;
    App.store.save = function () { try { localStorage.setItem(App.config.app.storageKey + '.client', JSON.stringify({ lang: App.store.client.lang })); } catch (e) { /* ignore */ } };
    App.store._saveLocal = origSave;
    App.store.client.sessionUserId = null;
    try { S.accounts = await call('GET', 'accounts'); } catch (e) { S.accounts = []; }
    S.token = store(TOKEN_KEY);
    if (S.token) {
      try { await pull(); listen(); } catch (e) { S.token = null; store(TOKEN_KEY, null); }
    }
    return true;
  }

  return Object.assign(S, { start, login, logout, refresh, setPin, reset, askAI });
})();
