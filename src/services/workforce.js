/*
 * Workforce service (Schedule area): people, rota, open shifts, swaps, availability,
 * leave, time clock, timesheets, payroll export and labour cost.
 *
 * Same contract as App.api: every call checks the caller's role. In production these
 * become HTTP endpoints; the function names and payloads stay the same.
 */
window.App = window.App || {};

App.wf = (function () {
  const dayKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const weekday = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  const monday = (key) => addDays(key, -((weekday(key) + 6) % 7));
  const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };
  const dateAt = (key, hm) => { const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d); x.setMinutes(toMin(hm)); return x; };
  const shiftStart = (s) => dateAt(s.date, s.start);
  const shiftEnd = (s) => { const e = dateAt(s.date, s.end); if (toMin(s.end) <= toMin(s.start)) e.setDate(e.getDate() + 1); return e; };
  const shiftHours = (s) => Math.max(0, (shiftEnd(s) - shiftStart(s)) / 36e5 - (s.breakMin || 0) / 60);
  const today = () => dayKey(new Date());
  const isoWeek = (key) => { const [y, m, d] = key.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1, d)); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
  const hmOf = (date) => String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');
  const fmtH = (h) => { const r = Math.round(h * 4) / 4; return (Number.isInteger(r) ? r : r.toFixed(2).replace(/0$/, '')) + (App.i18n && App.i18n.lang === 'nb' ? ' t' : ' h'); };
  const durText = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  return { dayKey, addDays, weekday, monday, toMin, dateAt, shiftStart, shiftEnd, shiftHours, today, isoWeek, hmOf, fmtH, durText };
})();

(function () {
  const W = App.wf;
  const api = App.api;
  const db = () => App.store.db;
  const cfg = () => App.tenant.workforce;
  const T = (en, nb) => ({ en, nb });
  const ApiError = api.ApiError;
  const me = () => api.auth.me();
  function req(role) { const u = me(); if (!api.auth.hasRole(role)) throw new ApiError('forbidden'); return u; }
  const commit = (v) => { App.store.save(); return v; };
  const uid = App.util.uid;
  const isManager = () => api.auth.hasRole('admin');

  function notify(userIds, text, route, kind) {
    [].concat(userIds).filter(Boolean).forEach((userId) => {
      db().notifications.unshift({ id: uid('n'), userId, text, route: route || '#/staff', kind: kind || 'info', at: new Date().toISOString(), read: false });
    });
  }
  const managersOf = (locationId) => db().users.filter((u) => u.role === 'admin' && (!locationId || u.locationId === locationId)).map((u) => u.id);

  // ---------- pay calculation ----------
  // interval list of [Date, Date] (worked time minus breaks) → {hours, supplements:{id:hours}, supplementNok, overtimeHours}
  // ctx: { positionId, user } → decides which supplements this person/shift is eligible for
  function eligible(s, ctx) {
    if (!ctx) return true;
    if (s.groups && s.groups.length && ctx.positionId && !s.groups.includes(ctx.positionId)) return false;
    if (s.contracts && s.contracts.length && ctx.user && !s.contracts.includes(ctx.user.contract || 'part')) return false;
    return true;
  }
  function payFor(segments, hourly, ctx) {
    let mins = 0; const sup = {}; const holCache = {};
    const rules = cfg().supplements.filter((s) => eligible(s, ctx));
    const holidayOf = (t) => { const k = W.dayKey(t); if (!(k in holCache)) holCache[k] = W.holiday ? W.holiday(k) : null; return holCache[k]; };
    segments.forEach(([a, b]) => {
      for (let t = new Date(a); t < b; t = new Date(t.getTime() + 60000)) {
        mins++;
        const wd = t.getDay(), hm = t.getHours() * 60 + t.getMinutes();
        const hol = holidayOf(t);
        // holiday rule: on a public holiday the holiday supplement replaces the normal day/time supplements
        const holRule = hol && rules.find((s) => s.holiday && (!s.eve || hol.eve) && (s.eve || !hol.eve) && hm >= W.toMin(s.from || '00:00') && hm < W.toMin(s.to || '24:00'));
        if (holRule) { sup[holRule.id] = (sup[holRule.id] || 0) + 1 / 60; continue; }
        rules.forEach((s) => { if (!s.holiday && s.days && s.days.includes(wd) && hm >= W.toMin(s.from) && hm < W.toMin(s.to)) sup[s.id] = (sup[s.id] || 0) + 1 / 60; });
      }
    });
    const hours = mins / 60;
    const overtimeHours = Math.max(0, hours - cfg().overtime.dailyHours);
    const rate = (x) => (x.pct ? (hourly || 0) * x.pct / 100 : x.nokPerHour || 0);
    const supplementNok = cfg().supplements.reduce((s, x) => s + (sup[x.id] || 0) * rate(x), 0);
    const base = hours * (hourly || 0);
    const overtimeNok = overtimeHours * (hourly || 0) * cfg().overtime.pct / 100;
    return { hours, supplements: sup, supplementNok, overtimeHours, overtimeNok, base, total: base + supplementNok + overtimeNok };
  }
  function shiftSegments(s) {
    const a = W.shiftStart(s), b = W.shiftEnd(s);
    if (!s.breakMin) return [[a, b]];
    const mid = new Date(a.getTime() + (b - a) / 2);
    return [[a, mid], [new Date(mid.getTime() + s.breakMin * 60000), b]];
  }
  // Paid start/end of a finished punch: optional "pay from shift start when early" + rounding
  function paidBounds(p) {
    let a = new Date(p.in), b = p.out ? new Date(p.out) : new Date();
    if (!p.out) return [a, b];
    const s = p.shiftId && db().shifts.find((x) => x.id === p.shiftId);
    if (cfg().payFromShiftStart && s && a < W.shiftStart(s)) a = W.shiftStart(s);
    const r = cfg().rounding || {}, m = Number(r.minutes) || 0;
    if (m) {
      const step = m * 60000, mode = r.mode || 'nearest';
      const rnd = (d, how) => new Date(Math[how](d.getTime() / step) * step);
      a = rnd(a, mode === 'nearest' ? 'round' : mode === 'employee' ? 'floor' : 'ceil');
      b = rnd(b, mode === 'nearest' ? 'round' : mode === 'employee' ? 'ceil' : 'floor');
    }
    return [a, b < a ? a : b];
  }
  function punchSegments(p) {
    const [start, end] = paidBounds(p);
    let segs = [[start, end]];
    (p.breaks || []).forEach((br) => {
      const bs = new Date(br.start), be = br.end ? new Date(br.end) : end;
      segs = segs.flatMap(([a, b]) => (be <= a || bs >= b) ? [[a, b]] : [[a, bs], [be, b]].filter(([x, y]) => y > x));
    });
    return segs;
  }
  const userOf = (id) => db().users.find((u) => u.id === id);

  // ---------- availability for one person on one date ----------
  // A date set by the employee wins over their usual week. Result: { state, ranges:[{from,to}], note, source }
  function availFor(userId, date) {
    const a = db().availability[userId] || {};
    const d = (a.dates || {})[date];
    if (d) return { state: d.state, ranges: d.ranges || [], note: d.note || '', source: 'date' };
    const w = (a.weekly || {})[W.weekday(date)];
    if (!w) return { state: 'available', ranges: [], note: '', source: 'default' };
    const ranges = w.from && w.to && (w.state === 'partial') ? [{ from: w.from, to: w.to }] : [];
    return { state: w.state === 'preferred' ? 'preferred' : w.state, ranges, note: w.note || '', source: 'weekly', preferFrom: w.from, preferTo: w.to };
  }

  // ---------- conflicts (shown to managers when planning) ----------
  function conflicts(s, list) {
    const out = [];
    if (!s.userId) return out;
    const u = userOf(s.userId);
    const all = (list || db().shifts).filter((x) => x.userId === s.userId && x.id !== s.id);
    if (all.some((x) => x.date === s.date && W.shiftStart(x) < W.shiftEnd(s) && W.shiftEnd(x) > W.shiftStart(s))) out.push({ kind: 'double', text: T('Double-booked', 'Dobbeltbooket') });
    const lv = db().leave.find((l) => l.userId === s.userId && l.status === 'approved' && s.date >= l.from && s.date <= l.to);
    if (lv) out.push({ kind: 'leave', text: T('On leave', 'Har fravær') });
    const av = availFor(s.userId, s.date);
    if (av.state === 'unavailable') out.push({ kind: 'unavailable', text: av.note ? T('Unavailable: ' + av.note, 'Utilgjengelig: ' + av.note) : T('Marked unavailable', 'Markert utilgjengelig') });
    else if (av.state === 'partial' && av.ranges.length && !av.ranges.some((r) => W.toMin(s.start) >= W.toMin(r.from) && (W.toMin(s.end) || 1440) <= (W.toMin(r.to) || 1440)))
      out.push({ kind: 'outside', text: T('Outside available hours (' + av.ranges.map((r) => r.from + '–' + r.to).join(', ') + ')', 'Utenfor tilgjengelige timer (' + av.ranges.map((r) => r.from + '–' + r.to).join(', ') + ')') });
    const rest = all.some((x) => { const gapA = (W.shiftStart(s) - W.shiftEnd(x)) / 36e5, gapB = (W.shiftStart(x) - W.shiftEnd(s)) / 36e5; return (gapA > 0 && gapA < 11) || (gapB > 0 && gapB < 11); });
    if (rest) out.push({ kind: 'rest', text: T('Less than 11 h rest (AML § 10-8)', 'Under 11 t hvile (AML § 10-8)') });
    if (App.tenant.usePositions !== false && u && s.positionId && u.positions && !u.positions.includes(s.positionId)) out.push({ kind: 'position', text: T('Not trained for this position', 'Ikke opplært i denne stillingen') });
    const mon = W.monday(s.date), sun = W.addDays(mon, 6);
    const wk = all.filter((x) => x.date >= mon && x.date <= sun).reduce((h, x) => h + W.shiftHours(x), 0) + W.shiftHours(s);
    if (wk > cfg().overtime.weeklyHours) out.push({ kind: 'overtime', text: T('Over ' + cfg().overtime.weeklyHours + ' h this week', 'Over ' + cfg().overtime.weeklyHours + ' t denne uka') });
    return out;
  }

  api.people = {
    all() { req('staff'); return db().users.filter((u) => u.role !== 'customer'); },
    get(id) { req('staff'); return userOf(id) || null; },
    team(locationId) { return api.people.all().filter((u) => u.locationId === locationId); },
    usesPositions() { return App.tenant.usePositions !== false; },
    positions() { return api.people.usesPositions() ? App.tenant.positions.filter((p) => p.id !== 'staff') : App.tenant.positions.filter((p) => p.id === 'staff'); },
    position(id) { const list = App.tenant.positions; if (!api.people.usesPositions()) return list.find((p) => p.id === 'staff') || list[0]; return list.find((p) => p.id === id) || { id, name: T(id, id), color: '#868E96' }; },
    // Who is clocked in right now / scheduled now
    workingNow(locationId) {
      req('staff');
      const now = new Date();
      return db().shifts.filter((s) => s.locationId === locationId && s.userId && s.published && W.shiftStart(s) <= now && W.shiftEnd(s) > now);
    },
    workingOn(locationId, day) { req('staff'); return db().shifts.filter((s) => s.locationId === locationId && s.userId && s.published && s.date === day).sort((a, b) => a.start.localeCompare(b.start)); },
    isClockedIn(userId) { return !!db().activePunches[userId]; },
  };

  api.shifts = {
    W, conflicts, payFor, shiftSegments,
    get(id) { req('staff'); return db().shifts.find((s) => s.id === id) || null; },
    mine(from, to) {
      const u = req('staff');
      return db().shifts.filter((s) => s.userId === u.id && s.published && (!from || s.date >= from) && (!to || s.date <= to)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    },
    next() { const now = new Date(); return api.shifts.mine(W.today()).find((s) => W.shiftEnd(s) > now) || null; },
    forRange(locationId, from, to) {
      req('staff');
      return db().shifts.filter((s) => s.locationId === locationId && s.date >= from && s.date <= to && (s.published || isManager()));
    },
    save(data) {
      const u = req('admin');
      const s = data.id ? db().shifts.find((x) => x.id === data.id) : null;
      const shift = Object.assign(s || { id: uid('sh'), published: false }, {
        locationId: data.locationId, userId: data.userId || null, positionId: App.tenant.usePositions === false ? 'staff' : data.positionId, date: data.date, start: data.start, end: data.end,
        breakMin: Number(data.breakMin) || 0, note: data.note || '', open: !data.userId,
      });
      if (s && s.published) { shift.published = true; if (shift.userId) notify(shift.userId, T('Your shift on ' + shift.date + ' was changed by ' + u.name, 'Vakten din ' + shift.date + ' ble endret av ' + u.name), '#/staff/shifts', 'shift'); }
      if (!s) db().shifts.push(shift);
      return commit(shift);
    },
    remove(id) { req('admin'); const s = db().shifts.find((x) => x.id === id); db().shifts = db().shifts.filter((x) => x.id !== id); if (s && s.published && s.userId) notify(s.userId, T('A shift on ' + s.date + ' was removed', 'En vakt ' + s.date + ' ble fjernet'), '#/staff/shifts', 'shift'); commit(); },
    copyWeek(locationId, fromMon, toMon) {
      req('admin');
      const src = db().shifts.filter((s) => s.locationId === locationId && s.date >= fromMon && s.date <= W.addDays(fromMon, 6));
      const diff = Math.round((new Date(toMon) - new Date(fromMon)) / 864e5);
      let n = 0;
      src.forEach((s) => {
        const date = W.addDays(s.date, diff);
        if (db().shifts.some((x) => x.locationId === locationId && x.date === date && x.start === s.start && x.positionId === s.positionId && x.userId === s.userId)) return;
        db().shifts.push(Object.assign({}, s, { id: uid('sh'), date, published: false })); n++;
      });
      commit(); return n;
    },
    publishWeek(locationId, mon) {
      const u = req('admin');
      const list = db().shifts.filter((s) => s.locationId === locationId && s.date >= mon && s.date <= W.addDays(mon, 6) && !s.published);
      list.forEach((s) => (s.published = true));
      const people = [...new Set(list.map((s) => s.userId).filter(Boolean))];
      notify(people, T('New rota published for week ' + W.isoWeek(mon), 'Ny vaktplan publisert for uke ' + W.isoWeek(mon)), '#/staff/shifts', 'publish');
      db().publishLog.unshift({ locationId, week: mon, by: u.name, at: new Date().toISOString() });
      commit(); return list.length;
    },
    drafts(locationId, mon) { return db().shifts.filter((s) => s.locationId === locationId && s.date >= mon && s.date <= W.addDays(mon, 6) && !s.published).length; },
    templates() { return db().shiftTemplates; },
    open(locationId) {
      const u = req('staff');
      return db().shifts.filter((s) => s.open && !s.userId && s.published && s.locationId === (locationId || u.locationId) && W.shiftEnd(s) > new Date())
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    },
    cost(s) { const u = s.userId && userOf(s.userId); return payFor(shiftSegments(s), u ? u.hourlyNok : avgWage(s.locationId), { positionId: s.positionId, user: u }); },
    weekStats(locationId, mon) {
      req('staff');
      return Array.from({ length: 7 }, (_, i) => {
        const day = W.addDays(mon, i);
        const list = db().shifts.filter((s) => s.locationId === locationId && s.date === day && (s.published || isManager()));
        const hours = list.reduce((h, s) => h + W.shiftHours(s), 0);
        const cost = list.reduce((c, s) => c + api.shifts.cost(s).total, 0);
        const revenue = cfg().revenueForecast[W.weekday(day)] * (locationId === 'loc-lokka' ? 1 : 0.8);
        return { day, hours, cost, revenue, pct: revenue ? (cost / revenue) * 100 : 0, count: list.length, open: list.filter((s) => !s.userId).length };
      });
    },
  };
  function avgWage(locationId) { const t = db().users.filter((u) => u.locationId === locationId && u.hourlyNok); return t.reduce((s, u) => s + u.hourlyNok, 0) / (t.length || 1); }

  // ---------- swaps, handovers, open-shift claims ----------
  const R = () => db().shiftRequests;
  function applyRequest(r) {
    const s = db().shifts.find((x) => x.id === r.shiftId);
    if (r.type === 'swap') { const t = db().shifts.find((x) => x.id === r.targetShiftId); const a = s.userId; s.userId = t.userId; t.userId = a; }
    else if (r.type === 'handover') { s.userId = r.toId; }
    else if (r.type === 'claim') { s.userId = r.fromId; s.open = false; }
  }
  api.requests = {
    all() { req('staff'); return R().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
    get(id) { return R().find((r) => r.id === id); },
    // Requests that involve me (sent or received) + open handovers I could take
    mine() { const u = req('staff'); return api.requests.all().filter((r) => r.fromId === u.id || r.toId === u.id); },
    incoming() { const u = req('staff'); return R().filter((r) => r.toId === u.id && r.status === 'pending_colleague'); },
    market() {
      const u = req('staff');
      return R().filter((r) => r.type === 'handover' && r.status === 'open' && r.fromId !== u.id).filter((r) => {
        const s = db().shifts.find((x) => x.id === r.shiftId); return s && W.shiftEnd(s) > new Date() && (App.tenant.usePositions === false || (u.positions || []).includes(s.positionId)) && s.locationId === u.locationId;
      });
    },
    forManager() { req('admin'); return R().filter((r) => r.status === 'pending_manager'); },
    handover(shiftId, toId, note) {
      const u = req('staff'); const s = db().shifts.find((x) => x.id === shiftId);
      if (!s || s.userId !== u.id) throw new ApiError('forbidden');
      const r = { id: uid('rq'), type: 'handover', shiftId, fromId: u.id, toId: toId || null, status: toId ? 'pending_colleague' : 'open', note: note || '', createdAt: new Date().toISOString() };
      R().unshift(r);
      if (toId) notify(toId, T(u.name + ' asks if you can take a shift on ' + s.date, u.name + ' spør om du kan ta en vakt ' + s.date), '#/staff/shifts/swaps', 'swap');
      return commit(r);
    },
    swap(shiftId, targetShiftId, note) {
      const u = req('staff'); const s = db().shifts.find((x) => x.id === shiftId), t = db().shifts.find((x) => x.id === targetShiftId);
      if (!s || !t || s.userId !== u.id) throw new ApiError('forbidden');
      const r = { id: uid('rq'), type: 'swap', shiftId, targetShiftId, fromId: u.id, toId: t.userId, status: 'pending_colleague', note: note || '', createdAt: new Date().toISOString() };
      R().unshift(r);
      notify(t.userId, T(u.name + ' wants to swap shifts with you', u.name + ' vil bytte vakt med deg'), '#/staff/shifts/swaps', 'swap');
      return commit(r);
    },
    claim(shiftId) {
      const u = req('staff'); const s = db().shifts.find((x) => x.id === shiftId);
      if (!s || s.userId) throw new ApiError('not_found');
      if (R().some((r) => r.type === 'claim' && r.shiftId === shiftId && r.fromId === u.id && r.status === 'pending_manager')) throw new ApiError('already_requested');
      const r = { id: uid('rq'), type: 'claim', shiftId, fromId: u.id, toId: null, status: cfg().openShiftClaimsNeedApproval ? 'pending_manager' : 'approved', note: '', createdAt: new Date().toISOString() };
      R().unshift(r);
      if (r.status === 'approved') applyRequest(r); else notify(managersOf(s.locationId), T(u.name + ' wants an open shift (' + s.date + ')', u.name + ' ønsker en ledig vakt (' + s.date + ')'), '#/staff/shifts/approvals', 'claim');
      return commit(r);
    },
    take(id) {
      const u = req('staff'); const r = R().find((x) => x.id === id);
      if (!r || r.status !== 'open') throw new ApiError('not_found');
      r.toId = u.id; r.status = cfg().swapsNeedManagerApproval ? 'pending_manager' : 'approved';
      if (r.status === 'approved') applyRequest(r);
      notify(r.fromId, T(u.name + ' will take your shift' + (r.status === 'pending_manager' ? ' — waiting for manager' : ''), u.name + ' tar vakten din' + (r.status === 'pending_manager' ? ' — venter på leder' : '')), '#/staff/shifts/swaps', 'swap');
      return commit(r);
    },
    respond(id, accept) {
      const u = req('staff'); const r = R().find((x) => x.id === id);
      if (!r || r.toId !== u.id || r.status !== 'pending_colleague') throw new ApiError('forbidden');
      r.status = accept ? (cfg().swapsNeedManagerApproval ? 'pending_manager' : 'approved') : 'declined';
      if (r.status === 'approved') applyRequest(r);
      notify(r.fromId, accept ? T(u.name + ' accepted your request', u.name + ' godtok forespørselen din') : T(u.name + ' declined your request', u.name + ' avslo forespørselen din'), '#/staff/shifts/swaps', 'swap');
      return commit(r);
    },
    decide(id, approve) {
      const u = req('admin'); const r = R().find((x) => x.id === id);
      if (!r || r.status !== 'pending_manager') throw new ApiError('not_found');
      r.status = approve ? 'approved' : 'rejected'; r.decidedBy = u.name; r.decidedAt = new Date().toISOString();
      if (approve) applyRequest(r);
      notify([r.fromId, r.toId], approve ? T('Shift change approved by ' + u.name, 'Vaktendring godkjent av ' + u.name) : T('Shift change rejected by ' + u.name, 'Vaktendring avslått av ' + u.name), '#/staff/shifts', 'swap');
      return commit(r);
    },
    cancel(id) { const u = req('staff'); const r = R().find((x) => x.id === id); if (!r || r.fromId !== u.id) throw new ApiError('forbidden'); r.status = 'cancelled'; return commit(r); },
  };

  // ---------- availability ----------
  api.availability = {
    get(userId) { const u = req('staff'); const id = userId || u.id; return (db().availability[id] = db().availability[id] || { weekly: {} }); },
    setWeekly(wd, data) {
      const u = req('staff'); const a = api.availability.get(u.id);
      if (!data || data.state === 'available') delete a.weekly[wd]; else a.weekly[wd] = { state: data.state, from: data.from || '', to: data.to || '', note: data.note || '' };
      return commit(a);
    },
    forDate: availFor,
    // Day-by-day: set one or many dates. data: { state: 'available'|'unavailable'|'partial'|'clear', ranges:[{from,to}], note }
    setDates(dates, data) {
      const u = req('staff'); const a = api.availability.get(u.id); a.dates = a.dates || {};
      const ranges = ((data && data.ranges) || []).filter((r) => r && /^\d\d:\d\d$/.test(r.from) && /^\d\d:\d\d$/.test(r.to) && r.from < r.to).slice(0, 3);
      [].concat(dates).filter((d) => /^\d{4}-\d\d-\d\d$/.test(d)).slice(0, 62).forEach((d) => {
        if (!data || data.state === 'clear') delete a.dates[d];
        else a.dates[d] = { state: data.state === 'partial' && !ranges.length ? 'unavailable' : data.state, ranges: data.state === 'partial' ? ranges : [], note: String(data.note || '').slice(0, 80), at: new Date().toISOString() };
      });
      // tidy: forget dates in the past
      Object.keys(a.dates).forEach((d) => { if (d < W.addDays(W.today(), -7)) delete a.dates[d]; });
      return commit(a);
    },
  };

  // ---------- leave / absence ----------
  const workdays = (from, to) => { let n = 0; for (let d = from; d <= to; d = W.addDays(d, 1)) { const w = W.weekday(d); if (w !== 0 && w !== 6) n++; } return n; };
  api.leave = {
    workdays,
    mine() { const u = req('staff'); return db().leave.filter((l) => l.userId === u.id).sort((a, b) => b.from.localeCompare(a.from)); },
    all() { req('admin'); return db().leave.slice().sort((a, b) => a.from.localeCompare(b.from)); },
    forRange(from, to) { req('staff'); return db().leave.filter((l) => l.status === 'approved' && l.to >= from && l.from <= to); },
    balance(userId) {
      const u = req('staff'); const id = userId || u.id; const y = String(new Date().getFullYear());
      const used = db().leave.filter((l) => l.userId === id && l.type === 'vacation' && l.status === 'approved' && l.from.startsWith(y)).reduce((s, l) => s + workdays(l.from, l.to), 0);
      const pending = db().leave.filter((l) => l.userId === id && l.type === 'vacation' && l.status === 'pending').reduce((s, l) => s + workdays(l.from, l.to), 0);
      const total = cfg().vacationDaysPerYear; return { total, used, pending, left: total - used };
    },
    request(data) {
      const u = req('staff');
      if (!data.from || !data.to || data.to < data.from) throw new ApiError('invalid_dates');
      const l = { id: uid('lv'), userId: u.id, type: data.type, from: data.from, to: data.to, note: data.note || '', status: data.type === 'sick' ? 'approved' : 'pending', createdAt: new Date().toISOString() };
      db().leave.unshift(l);
      notify(managersOf(u.locationId), T(u.name + (data.type === 'sick' ? ' reported sick' : ' requested leave') + ' (' + data.from + ')', u.name + (data.type === 'sick' ? ' meldte seg syk' : ' søkte fravær') + ' (' + data.from + ')'), '#/staff/shifts/approvals', 'leave');
      return commit(l);
    },
    decide(id, approve, note) {
      const u = req('admin'); const l = db().leave.find((x) => x.id === id);
      l.status = approve ? 'approved' : 'rejected'; l.decidedBy = u.name; l.decisionNote = note || '';
      notify(l.userId, approve ? T('Your leave ' + l.from + ' – ' + l.to + ' was approved', 'Fraværet ditt ' + l.from + ' – ' + l.to + ' er godkjent') : T('Your leave request was declined', 'Fraværssøknaden din ble avslått'), '#/staff/shifts/leave', 'leave');
      return commit(l);
    },
    cancel(id) { const u = req('staff'); const l = db().leave.find((x) => x.id === id); if (!l || l.userId !== u.id) throw new ApiError('forbidden'); db().leave = db().leave.filter((x) => x.id !== id); commit(); },
  };

  // ---------- time clock ----------
  api.time = {
    active(userId) { const u = req('staff'); return db().activePunches[userId || u.id] || null; },
    todaysShift() { const u = req('staff'); const now = new Date(); return db().shifts.filter((s) => s.userId === u.id && s.published && (s.date === W.today() || (W.shiftStart(s) <= now && W.shiftEnd(s) > now))).sort((a, b) => a.start.localeCompare(b.start)).find((s) => W.shiftEnd(s) > now) || null; },
    clockIn(note) {
      const u = req('staff');
      if (db().activePunches[u.id]) throw new ApiError('already_clocked_in');
      const s = api.time.todaysShift();
      const p = { id: uid('pu'), userId: u.id, locationId: u.locationId, shiftId: s ? s.id : null, date: W.today(), in: new Date().toISOString(), out: null, breaks: [], status: 'open', note: note || '',
        geo: 'demo-verified' };
      db().activePunches[u.id] = p;
      return commit(p);
    },
    breakToggle() {
      const u = req('staff'); const p = db().activePunches[u.id]; if (!p) throw new ApiError('not_clocked_in');
      const last = p.breaks[p.breaks.length - 1];
      if (last && !last.end) last.end = new Date().toISOString(); else p.breaks.push({ start: new Date().toISOString(), end: null });
      return commit(p);
    },
    onBreak(p) { const last = p && p.breaks[p.breaks.length - 1]; return !!(last && !last.end); },
    clockOut(note) {
      const u = req('staff'); const p = db().activePunches[u.id]; if (!p) throw new ApiError('not_clocked_in');
      const last = p.breaks[p.breaks.length - 1]; if (last && !last.end) last.end = new Date().toISOString();
      p.out = new Date().toISOString(); p.status = 'submitted'; if (note) p.note = note;
      delete db().activePunches[u.id];
      db().punches.unshift(p);
      return commit(p);
    },
    workedMs(p) { return punchSegments(p).reduce((s, [a, b]) => s + (b - a), 0); },
    punches(filter) {
      const u = req('staff'); const f = filter || {};
      const uidF = f.userId || (isManager() && f.all ? null : u.id);
      if (uidF && uidF !== u.id && !isManager()) throw new ApiError('forbidden');
      return db().punches.filter((p) => (!uidF || p.userId === uidF) && (!f.locationId || p.locationId === f.locationId) && (!f.from || p.date >= f.from) && (!f.to || p.date <= f.to) && (!f.status || p.status === f.status))
        .sort((a, b) => b.in.localeCompare(a.in));
    },
    pay(p) { const u = userOf(p.userId); const s = p.shiftId && db().shifts.find((x) => x.id === p.shiftId); return payFor(punchSegments(p), u && u.hourlyNok, { positionId: s ? s.positionId : u && u.positions && u.positions[0], user: u }); },
    paidBounds,
    deviation(p) {
      const s = p.shiftId && db().shifts.find((x) => x.id === p.shiftId);
      if (!s) return { unscheduled: true };
      return { inMin: Math.round((new Date(p.in) - W.shiftStart(s)) / 60000), outMin: p.out ? Math.round((new Date(p.out) - W.shiftEnd(s)) / 60000) : 0, shift: s };
    },
    approve(ids) { const u = req('admin'); [].concat(ids).forEach((id) => { const p = db().punches.find((x) => x.id === id); if (p) { p.status = 'approved'; p.approvedBy = u.name; } }); commit(); },
    edit(id, data) {
      const u = req('admin'); const p = db().punches.find((x) => x.id === id);
      const d = p.date;
      if (data.in) p.in = W.dateAt(d, data.in).toISOString();
      if (data.out) { const o = W.dateAt(d, data.out); if (o < new Date(p.in)) o.setDate(o.getDate() + 1); p.out = o.toISOString(); }
      p.edited = { by: u.name, at: new Date().toISOString() };
      return commit(p);
    },
    // Payroll: one row per employee for a period, from APPROVED punches
    payroll(locationId, from, to) {
      req('admin');
      const rows = {};
      db().punches.filter((p) => p.locationId === locationId && p.date >= from && p.date <= to && p.status === 'approved').forEach((p) => {
        const u = userOf(p.userId); if (!u) return;
        const r = rows[u.id] = rows[u.id] || { user: u, shifts: 0, hours: 0, supplements: {}, supplementNok: 0, overtimeHours: 0, overtimeNok: 0, base: 0, total: 0 };
        const x = api.time.pay(p);
        r.shifts++; r.hours += x.hours; r.base += x.base; r.supplementNok += x.supplementNok; r.overtimeHours += x.overtimeHours; r.overtimeNok += x.overtimeNok; r.total += x.total;
        Object.keys(x.supplements).forEach((k) => (r.supplements[k] = (r.supplements[k] || 0) + x.supplements[k]));
      });
      return Object.values(rows).sort((a, b) => a.user.name.localeCompare(b.user.name));
    },
    pendingCount(locationId) { return db().punches.filter((p) => p.status === 'submitted' && (!locationId || p.locationId === locationId)).length; },
  };

  // ---------- notifications ----------
  api.notifications = {
    mine() { const u = me(); return u ? db().notifications.filter((n) => n.userId === u.id).slice(0, 40) : []; },
    unread() { return api.notifications.mine().filter((n) => !n.read).length; },
    markAllRead() { api.notifications.mine().forEach((n) => (n.read = true)); commit(); },
    push: (ids, text, route, kind) => { notify(ids, text, route, kind); commit(); },
  };
})();
