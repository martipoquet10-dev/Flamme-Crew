/*
 * Planning service (Schedule area, manager tools):
 *  - public holidays (Norway; other countries can be added in HOLIDAYS)
 *  - week templates: save a week, apply it to any other week
 *  - auto-planning: create shifts where the hour-by-hour demand is not covered,
 *    then fill open shifts with the best available person (rules + cost)
 *  - head-office overview: every location side by side
 */
(function () {
  const api = App.api, W = App.wf;
  const db = () => App.store.db;
  const cfg = () => App.tenant.workforce;
  const ApiError = api.ApiError;
  const me = () => api.auth.me();
  const req = (role) => { if (!api.auth.hasRole(role)) throw new ApiError('forbidden'); return me(); };
  const commit = (v) => { App.store.save(); return v; };
  const uid = App.util.uid;
  const T = (en, nb) => ({ en, nb });
  const ensure = (k, v) => (db()[k] = db()[k] || v);
  const user = (id) => db().users.find((u) => u.id === id);
  const hm = (min) => String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');

  // ---------- manager-edited pay & time rules (App settings → Pay & time rules) ----------
  // The client defaults stay untouched; overrides are layered on top every time they change.
  const pristine = JSON.parse(JSON.stringify(App.tenant.workforce));
  W.applyOverrides = function (wf) {
    const base = JSON.parse(JSON.stringify(pristine));
    if (wf) Object.keys(wf).forEach((k) => { base[k] = wf[k] && typeof wf[k] === 'object' && !Array.isArray(wf[k]) ? Object.assign({}, base[k], wf[k]) : wf[k]; });
    App.tenant.workforce = base;
  };

  // ---------- clients without positions: every shift is just a shift ----------
  W.normalizePositions = function (data) {
    if (App.tenant.usePositions !== false || !data) return false;
    let changed = false;
    (data.shifts || []).forEach((s) => { if (s.positionId !== 'staff') { s.positionId = 'staff'; changed = true; } });
    (data.shiftTemplates || []).forEach((t) => { if (t.positionId !== 'staff') { t.positionId = 'staff'; changed = true; } });
    (data.weekTemplates || []).forEach((t) => t.shifts.forEach((x) => { if (x.positionId !== 'staff') { x.positionId = 'staff'; changed = true; } }));
    if (data.shiftTemplates) { const seen = new Set(); const before = data.shiftTemplates.length; data.shiftTemplates = data.shiftTemplates.filter((t) => { const k = t.start + t.end; if (seen.has(k)) return false; seen.add(k); return true; }); if (data.shiftTemplates.length !== before) changed = true; }
    return changed;
  };

  // ---------- public holidays ----------
  function easter(y) { // anonymous Gregorian algorithm
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return W.dayKey(new Date(y, month - 1, day));
  }
  const HOLIDAYS = {
    NO: (y) => {
      const E = easter(y), at = (n) => W.addDays(E, n), md = (m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return [
        [md(1, 1), T('New Year\'s Day', 'Første nyttårsdag')], [at(-3), T('Maundy Thursday', 'Skjærtorsdag')], [at(-2), T('Good Friday', 'Langfredag')],
        [at(-1), T('Easter Saturday', 'Påskeaften'), true], [E, T('Easter Sunday', 'Første påskedag')], [at(1), T('Easter Monday', 'Andre påskedag')],
        [md(5, 1), T('Labour Day', 'Arbeidernes dag')], [md(5, 17), T('Constitution Day', 'Grunnlovsdag')], [at(39), T('Ascension Day', 'Kristi himmelfartsdag')],
        [at(48), T('Whit Saturday', 'Pinseaften'), true], [at(49), T('Whit Sunday', 'Første pinsedag')], [at(50), T('Whit Monday', 'Andre pinsedag')],
        [md(12, 24), T('Christmas Eve', 'Julaften'), true], [md(12, 25), T('Christmas Day', 'Første juledag')], [md(12, 26), T('Boxing Day', 'Andre juledag')],
        [md(12, 31), T('New Year\'s Eve', 'Nyttårsaften'), true],
      ];
    },
  };
  const cache = {};
  function holidays(year) {
    const c = cfg().holidayCountry || 'NO'; const k = c + year;
    if (!cache[k]) cache[k] = (HOLIDAYS[c] ? HOLIDAYS[c](year) : []).map(([date, name, eve]) => ({ date, name, eve: !!eve }));
    return cache[k];
  }
  W.holidays = holidays;
  W.holiday = (key) => holidays(Number(key.slice(0, 4))).find((h) => h.date === key) || null;

  // ---------- helpers ----------
  const weekShifts = (loc, mon) => db().shifts.filter((s) => s.locationId === loc && s.date >= mon && s.date <= W.addDays(mon, 6));
  const hoursIn = (uidv, mon) => db().shifts.filter((s) => s.userId === uidv && s.date >= mon && s.date <= W.addDays(mon, 6)).reduce((h, s) => h + W.shiftHours(s), 0);
  const HARD = ['double', 'leave', 'unavailable', 'outside', 'rest', 'position'];

  // ---------- week templates ----------
  api.templates = {
    list(loc) { req('admin'); return (db().weekTemplates || []).filter((t) => !loc || t.locationId === loc); },
    save(loc, mon, name, withPeople) {
      const u = req('admin');
      const list = weekShifts(loc, mon);
      if (!list.length) throw new ApiError('empty_week');
      const t = { id: uid('wt'), name: String(name || '').slice(0, 60) || 'Template', locationId: loc, withPeople: !!withPeople, createdBy: u.name, at: new Date().toISOString(),
        shifts: list.map((s) => ({ offset: Math.round((W.dateAt(s.date, '12:00') - W.dateAt(mon, '12:00')) / 864e5), positionId: s.positionId, start: s.start, end: s.end, breakMin: s.breakMin || 0, note: s.note || '', userId: withPeople ? s.userId : null })) };
      ensure('weekTemplates', []).unshift(t);
      return commit(t);
    },
    apply(id, mon, opts) {
      req('admin'); const o = opts || {};
      const t = (db().weekTemplates || []).find((x) => x.id === id); if (!t) throw new ApiError('not_found');
      if (o.replaceDrafts) db().shifts = db().shifts.filter((s) => !(s.locationId === t.locationId && s.date >= mon && s.date <= W.addDays(mon, 6) && !s.published));
      let n = 0, freed = 0;
      t.shifts.forEach((x) => {
        const date = W.addDays(mon, x.offset);
        let userId = o.withPeople !== false && t.withPeople ? x.userId : null;
        if (userId && api.shifts.conflicts({ id: '_', userId, date, start: x.start, end: x.end, breakMin: x.breakMin, positionId: x.positionId }).some((c) => HARD.includes(c.kind))) { userId = null; freed++; }
        db().shifts.push({ id: uid('sh'), locationId: t.locationId, userId, positionId: x.positionId, date, start: x.start, end: x.end, breakMin: x.breakMin, note: x.note, published: false, open: !userId, fromTemplate: t.id });
        n++;
      });
      commit(); return { created: n, freed };
    },
    remove(id) { req('admin'); db().weekTemplates = (db().weekTemplates || []).filter((x) => x.id !== id); return commit(true); },
  };

  // ---------- auto-planning ----------
  // Picks the best person for a shift: trained, free, not on leave/unavailable, 11 h rest,
  // within contract hours (+ allowed extra), preferring "prefer to work", fewer hours and lower cost.
  function bestCandidate(s, mon, extra) {
    const team = db().users.filter((u) => (u.role === 'staff' || u.role === 'admin') && u.locationId === s.locationId && (App.tenant.usePositions === false || (u.positions || []).includes(s.positionId)));
    const h = W.shiftHours(s);
    const scored = team.map((u) => {
      const c = api.shifts.conflicts(Object.assign({}, s, { userId: u.id }));
      if (c.some((x) => HARD.includes(x.kind))) return null;
      const av = api.availability.forDate(u.id, s.date);
      const used = hoursIn(u.id, mon), cap = (u.contractHours || 20) + (extra == null ? 4 : extra);
      if (used + h > cap) return null;
      const fill = used / (u.contractHours || 20);
      const score = fill * 100 + (u.hourlyNok || 200) * 0.15 - (av && av.state === 'preferred' ? 25 : 0);
      return { u, score };
    }).filter(Boolean).sort((a, b) => a.score - b.score);
    return scored[0] ? scored[0].u : null;
  }

  api.autoplan = {
    // opts: { create: bool, assign: bool, extraHours: number, positions: [ids] }
    run(loc, mon, opts) {
      const mgr = req('admin'); const o = Object.assign({ create: true, assign: true, extraHours: 4 }, opts || {});
      const batch = uid('ap'); const log = { id: batch, loc, mon, by: mgr.name, at: new Date().toISOString(), created: [], assigned: [] };
      const today = W.today();
      if (o.create) {
        const positions = App.tenant.usePositions === false ? ['staff'] : (o.positions && o.positions.length ? o.positions : ['kitchen', 'front']);
        for (let i = 0; i < 7; i++) {
          const day = W.addDays(mon, i); if (day < today) continue;
          let hours = api.labor.hourly(loc, day);
          const close = Math.max(...hours.map((x) => x.hour)) + 1;
          let guard = 0;
          while (guard++ < 30) {
            const gap = hours.find((x) => x.planned < x.recommended);
            if (!gap) break;
            // run of hours still short from here
            let len = 0; while (hours[hours.indexOf(gap) + len] && hours[hours.indexOf(gap) + len].planned < hours[hours.indexOf(gap) + len].recommended) len++;
            const start = gap.hour, dur = Math.min(Math.max(len, 4), 7), end = Math.min(start + dur, close);
            const startMin = start * 60, endMin = Math.max(end * 60, startMin + 240);
            // position that is thinnest in that hour
            const covered = (p) => db().shifts.filter((s) => s.locationId === loc && s.date === day && s.positionId === p && W.toMin(s.start) <= startMin && (W.toMin(s.end) || 1440) > startMin).length;
            const pos = positions.slice().sort((a, b) => covered(a) - covered(b))[0];
            const s = { id: uid('sh'), locationId: loc, userId: null, positionId: pos, date: day, start: hm(startMin), end: hm(Math.min(endMin, 1440)).replace('24:00', '23:59'), breakMin: (endMin - startMin) > 330 ? 30 : 0,
              note: '', published: false, open: true, auto: batch };
            db().shifts.push(s); log.created.push(s.id);
            hours = api.labor.hourly(loc, day);
          }
        }
      }
      if (o.assign) {
        weekShifts(loc, mon).filter((s) => !s.userId && s.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).forEach((s) => {
          const u = bestCandidate(s, mon, o.extraHours);
          if (!u) return;
          s.userId = u.id; s.open = false; s.auto = s.auto || batch; log.assigned.push(s.id);
          if (s.published) api.notifications.push(u.id, T('You were given a shift on ' + s.date + ' ' + s.start + '–' + s.end, 'Du har fått en vakt ' + s.date + ' ' + s.start + '–' + s.end), '#/staff/shifts', 'shift');
        });
      }
      ensure('autoPlanLog', []).unshift(log);
      const unfilled = weekShifts(loc, mon).filter((s) => !s.userId && s.date >= today).length;
      commit();
      return { batch, created: log.created.length, assigned: log.assigned.length, unfilled };
    },
    undo(batch) {
      req('admin'); const log = (db().autoPlanLog || []).find((x) => x.id === batch); if (!log) throw new ApiError('not_found');
      db().shifts = db().shifts.filter((s) => !log.created.includes(s.id));
      db().shifts.forEach((s) => { if (log.assigned.includes(s.id)) { s.userId = null; s.open = true; } });
      db().autoPlanLog = db().autoPlanLog.filter((x) => x.id !== batch);
      return commit(true);
    },
    last(loc) { return (db().autoPlanLog || []).find((x) => x.loc === loc) || null; },
    candidates(shiftId) { req('admin'); const s = db().shifts.find((x) => x.id === shiftId); if (!s) return []; const mon = W.monday(s.date); const out = []; const seen = new Set(); let c;
      // up to 3 suggestions in order
      const copy = Object.assign({}, s); for (let i = 0; i < 3; i++) { c = bestCandidateExcluding(copy, mon, seen); if (!c) break; seen.add(c.id); out.push(c); } return out; },
  };
  function bestCandidateExcluding(s, mon, seen) {
    const orig = db().users; const filtered = orig.filter((u) => !seen.has(u.id));
    db().users = filtered; try { return bestCandidate(s, mon, 4); } finally { db().users = orig; }
  }

  // ---------- head-office overview ----------
  api.hq = {
    overview(from, to, opts) {
      req('admin');
      const locs = api.catalog.locations().filter((l) => db().shifts.some((s) => s.locationId === l.id && s.date >= from && s.date <= to));
      return locs.map((l) => {
        const p = api.labor.period(l.id, from, to, opts);
        const pendingSwaps = db().shiftRequests.filter((r) => r.status === 'pending_manager' && (db().shifts.find((s) => s.id === r.shiftId) || {}).locationId === l.id).length;
        const pendingLeave = db().leave.filter((x) => x.status === 'pending' && (user(x.userId) || {}).locationId === l.id).length;
        const timesheets = db().punches.filter((x) => x.locationId === l.id && x.status === 'submitted').length;
        const sickHours = api.hours.report({ locationId: l.id, from, to }).reduce((s, x) => s + (x.totals.absence.sick || 0), 0);
        const staff = db().users.filter((u) => u.locationId === l.id && (u.role === 'staff' || u.role === 'admin')).length;
        const working = api.people.workingNow(l.id).length;
        return { location: l, staff, working, totals: p.totals, rows: p.rows, pending: pendingSwaps + pendingLeave, timesheets, sickHours, target: p.target };
      });
    },
  };
})();
