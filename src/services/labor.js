/*
 * Labour & hours service (Schedule area, manager tools).
 *
 *  api.labor  → sales forecast vs. actual, planned vs. actual labour cost, labour %,
 *               sales per labour hour (SPLH), cost by position, weekly budget,
 *               hour-by-hour staffing (planned / clocked / recommended).
 *  api.hours  → hours report per person and period: planned, worked (approved / pending /
 *               rejected), absence by type (vacation, sick, time off…), supplements, overtime, pay.
 *  api.time   → extra timesheet tools: reject with reason, add a missing punch, lock a pay period.
 */
(function () {
  const api = App.api, W = App.wf;
  const db = () => App.store.db;
  const cfg = () => App.tenant.workforce;
  const ApiError = api.ApiError;
  const me = () => api.auth.me();
  const req = (role) => { if (!api.auth.hasRole(role)) throw new ApiError('forbidden'); return me(); };
  const commit = (v) => { App.store.save(); return v; };
  const T = (en, nb) => ({ en, nb });
  const user = (id) => db().users.find((u) => u.id === id);
  const ensure = (k, v) => (db()[k] = db()[k] || v);
  const isMgr = () => api.auth.hasRole('admin');
  const days = (from, to) => { const out = []; for (let d = from; d <= to; d = W.addDays(d, 1)) out.push(d); return out; };

  // ---------- money helpers ----------
  const loadFactor = () => { const e = cfg().employerCost || {}; return (1 + (e.holidayPayPct || 0) / 100) * (1 + (e.payrollTaxPct || 0) / 100); };
  const load = (gross, loaded) => (loaded ? gross * loadFactor() : gross);

  // ---------- forecast & actual sales ----------
  function defaultForecast(loc, day) { return Math.round(cfg().revenueForecast[W.weekday(day)] * ((cfg().locationRevenueFactor || {})[loc] || 1)); }
  function forecast(loc, day) { const o = (db().salesForecast || {})[loc + '|' + day]; return o != null ? o : defaultForecast(loc, day); }
  function actual(loc, day) { const a = (db().salesActual || {})[loc + '|' + day]; return a != null ? a : null; }

  // ---------- punches as worked time ----------
  function punchHours(p) { return api.time.workedMs(p) / 36e5; }
  function punchPosition(p) {
    const s = p.shiftId && db().shifts.find((x) => x.id === p.shiftId);
    if (s) return s.positionId;
    const u = user(p.userId); return (u && u.positions && u.positions[0]) || 'other';
  }
  function punchesFor(loc, from, to, withRunning) {
    const list = db().punches.filter((p) => p.locationId === loc && p.date >= from && p.date <= to && p.status !== 'rejected');
    if (withRunning) Object.values(db().activePunches || {}).forEach((p) => { if (p.locationId === loc && p.date >= from && p.date <= to && p.out === null) list.push(p); });
    return list;
  }

  // ---------- hour-by-hour coverage ----------
  const covers = (startDate, endDate, day, h) => {
    const a = W.dateAt(day, String(h).padStart(2, '0') + ':00'), b = new Date(a.getTime() + 36e5);
    const overlap = Math.min(b, endDate) - Math.max(a, startDate);
    return overlap >= 30 * 60000;
  };

  api.labor = {
    loadFactor, forecast, actual, defaultForecast,
    setForecast(loc, day, nok) {
      req('admin'); const m = ensure('salesForecast', {}); const k = loc + '|' + day;
      if (nok === '' || nok == null) delete m[k]; else m[k] = Math.max(0, Math.round(Number(nok)));
      return commit(m[k] != null ? m[k] : null);
    },
    setActual(loc, day, nok) {
      req('admin'); const m = ensure('salesActual', {}); const k = loc + '|' + day;
      if (nok === '' || nok == null) delete m[k]; else m[k] = Math.max(0, Math.round(Number(nok)));
      return commit(m[k] != null ? m[k] : null);
    },
    budget(loc, mon) { const b = (db().laborBudget || {})[loc + '|' + mon]; return b != null ? b : ((cfg().weeklyLaborBudget || {})[loc] || 0); },
    setBudget(loc, mon, nok) { req('admin'); const m = ensure('laborBudget', {}); m[loc + '|' + mon] = Math.max(0, Math.round(Number(nok) || 0)); return commit(m[loc + '|' + mon]); },

    // Day-by-day + totals + by position, for any period
    period(loc, from, to, opts) {
      req('admin');
      const o = opts || {}, loaded = !!o.loaded;
      const shifts = db().shifts.filter((s) => s.locationId === loc && s.date >= from && s.date <= to);
      const punches = punchesFor(loc, from, to, true);
      const pos = {};
      const P = (id) => (pos[id] = pos[id] || { positionId: id, plannedHours: 0, plannedCost: 0, actualHours: 0, actualCost: 0, shifts: 0 });
      const rows = days(from, to).map((day) => {
        const ss = shifts.filter((s) => s.date === day), ps = punches.filter((p) => p.date === day);
        let ph = 0, pc = 0, ah = 0, ac = 0, open = 0, drafts = 0;
        ss.forEach((s) => { const h = W.shiftHours(s), c = load(api.shifts.cost(s).total, loaded); ph += h; pc += c; if (!s.userId) open++; if (!s.published) drafts++; const x = P(s.positionId); x.plannedHours += h; x.plannedCost += c; x.shifts++; });
        ps.forEach((p) => { const h = punchHours(p), c = load(api.time.pay(p).total, loaded); ah += h; ac += c; const x = P(punchPosition(p)); x.actualHours += h; x.actualCost += c; });
        const f = forecast(loc, day), a = actual(loc, day);
        return { day, forecast: f, actual: a, forecastEdited: (db().salesForecast || {})[loc + '|' + day] != null,
          plannedHours: ph, plannedCost: pc, actualHours: ah, actualCost: ac, open, drafts, shifts: ss.length,
          pctPlanned: f ? (pc / f) * 100 : 0, pctActual: a ? (ac / a) * 100 : null,
          splhPlanned: ph ? f / ph : 0, splhActual: a && ah ? a / ah : null, past: day < W.today() };
      });
      const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);
      const withActual = rows.filter((r) => r.actual != null);
      const totals = {
        forecast: sum('forecast'), actual: withActual.length ? withActual.reduce((s, r) => s + r.actual, 0) : null,
        plannedHours: sum('plannedHours'), plannedCost: sum('plannedCost'), actualHours: sum('actualHours'), actualCost: sum('actualCost'),
        // like-for-like: only days that have actual sales
        actualCostOnActualDays: withActual.reduce((s, r) => s + r.actualCost, 0), forecastOnActualDays: withActual.reduce((s, r) => s + r.forecast, 0),
        open: sum('open'), drafts: sum('drafts'),
      };
      totals.pctPlanned = totals.forecast ? (totals.plannedCost / totals.forecast) * 100 : 0;
      totals.pctActual = totals.actual ? (totals.actualCostOnActualDays / totals.actual) * 100 : null;
      totals.splhPlanned = totals.plannedHours ? totals.forecast / totals.plannedHours : 0;
      totals.salesVariancePct = totals.actual != null && totals.forecastOnActualDays ? ((totals.actual / totals.forecastOnActualDays) - 1) * 100 : null;
      return { loc, from, to, loaded, rows, totals, byPosition: Object.values(pos).sort((a, b) => b.plannedCost - a.plannedCost), target: cfg().laborTargetPct };
    },

    // Staffing hour by hour for one day
    hourly(loc, day) {
      req('admin');
      const wd = W.weekday(day), curve = cfg().hourlySales[wd === 0 || wd === 5 || wd === 6 ? 'weekend' : 'weekday'];
      const f = forecast(loc, day), a = actual(loc, day);
      const shifts = db().shifts.filter((s) => s.locationId === loc && s.date === day);
      const punches = punchesFor(loc, day, day, true);
      return Object.keys(curve).map(Number).sort((x, y) => x - y).map((h) => {
        const sales = f * curve[h];
        const planned = shifts.filter((s) => covers(W.shiftStart(s), W.shiftEnd(s), day, h));
        const clocked = punches.filter((p) => covers(new Date(p.in), p.out ? new Date(p.out) : new Date(), day, h));
        const recommended = Math.max(cfg().minStaffPerHour || 1, Math.ceil(sales / cfg().targetSplh));
        const open = planned.filter((s) => !s.userId).length;
        return { hour: h, sales, actualSales: a != null ? a * curve[h] : null, planned: planned.length, open, clocked: clocked.length, recommended,
          gap: planned.length - recommended, people: planned.filter((s) => s.userId).map((s) => s.userId) };
      });
    },
  };

  // ---------- hours report ----------
  function absenceHours(u, day) {
    const planned = db().shifts.filter((s) => s.userId === u.id && s.date === day);
    if (planned.length) return planned.reduce((h, s) => h + W.shiftHours(s), 0);
    const wd = W.weekday(day);
    return wd === 0 || wd === 6 ? 0 : (u.contractHours || 0) / 5;
  }
  api.hours = {
    // filter: { userId? | locationId?, from, to }
    report(filter) {
      const meU = req('staff'); const f = filter || {};
      let people;
      if (!isMgr()) people = [meU];
      else if (f.userId) people = [user(f.userId)].filter(Boolean);
      else people = db().users.filter((u) => (u.role === 'staff' || u.role === 'admin') && (!f.locationId || u.locationId === f.locationId));
      const rules = cfg().absenceRules || {};
      return people.map((u) => {
        const entries = [];
        db().punches.filter((p) => p.userId === u.id && p.date >= f.from && p.date <= f.to).forEach((p) => {
          const pay = api.time.pay(p); const dv = api.time.deviation(p);
          entries.push({ id: p.id, date: p.date, kind: 'worked', type: 'worked', status: p.status, start: W.hmOf(new Date(p.in)), end: p.out ? W.hmOf(new Date(p.out)) : '',
            hours: punchHours(p), plannedHours: dv.shift ? W.shiftHours(dv.shift) : 0, lateMin: dv.inMin > 0 ? dv.inMin : 0, supplements: pay.supplements, supplementNok: pay.supplementNok,
            overtimeHours: pay.overtimeHours, pay: pay.total, note: p.note || '', rejectReason: p.rejectReason || '', edited: !!p.edited, unscheduled: !!dv.unscheduled, locationId: p.locationId });
        });
        const ap = db().activePunches[u.id];
        if (ap && ap.date >= f.from && ap.date <= f.to) entries.push({ id: ap.id, date: ap.date, kind: 'worked', type: 'worked', status: 'open', start: W.hmOf(new Date(ap.in)), end: '', hours: punchHours(ap), plannedHours: 0, supplements: {}, supplementNok: 0, overtimeHours: 0, pay: api.time.pay(ap).total, note: '' });
        db().leave.filter((l) => l.userId === u.id && (l.status === 'approved' || l.status === 'pending') && l.to >= f.from && l.from <= f.to).forEach((l) => {
          days(l.from > f.from ? l.from : f.from, l.to < f.to ? l.to : f.to).forEach((day) => {
            const h = absenceHours(u, day); if (!h) return;
            const r = rules[l.type] || {};
            entries.push({ id: l.id + '@' + day, leaveId: l.id, date: day, kind: 'absence', type: l.type, status: l.status === 'approved' ? 'approved' : 'submitted', hours: h, plannedHours: h,
              paid: !!r.paid, pay: r.paid ? h * (u.hourlyNok || 0) : 0, supplements: {}, supplementNok: 0, overtimeHours: 0, note: l.note || '' });
          });
        });
        // planned hours from published shifts (what the rota said)
        const mine = db().shifts.filter((s) => s.userId === u.id && s.published && s.date >= f.from && s.date <= f.to);
        const plannedHours = mine.reduce((h, s) => h + W.shiftHours(s), 0);
        // compare worked hours only with shifts that should already have happened
        const plannedToDate = mine.filter((s) => W.shiftEnd(s) <= new Date()).reduce((h, s) => h + W.shiftHours(s), 0);
        entries.sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
        const t = { plannedHours, plannedToDate, worked: { approved: 0, submitted: 0, rejected: 0, open: 0 }, absence: {}, absencePaid: 0, supplements: {}, supplementNok: 0, overtimeHours: 0, payApproved: 0, payPending: 0, lateCount: 0 };
        entries.forEach((e) => {
          if (e.kind === 'worked') {
            t.worked[e.status] = (t.worked[e.status] || 0) + e.hours;
            if (e.status === 'rejected') return;
            Object.keys(e.supplements || {}).forEach((k) => (t.supplements[k] = (t.supplements[k] || 0) + e.supplements[k]));
            t.supplementNok += e.supplementNok; t.overtimeHours += e.overtimeHours; if (e.lateMin > 5) t.lateCount++;
            if (e.status === 'approved') t.payApproved += e.pay; else t.payPending += e.pay;
          } else {
            const k = e.type + (e.status === 'approved' ? '' : ':pending');
            t.absence[k] = (t.absence[k] || 0) + e.hours;
            if (e.status === 'approved' && e.paid) { t.absencePaid += e.hours; t.payApproved += e.pay; }
          }
        });
        t.workedCounted = t.worked.approved + t.worked.submitted + t.worked.open;
        t.variance = t.workedCounted - plannedToDate;
        return { user: u, entries, totals: t };
      });
    },
  };

  // ---------- timesheet tools ----------
  const locked = (loc, date) => { const until = (db().payLocks || {})[loc]; return !!until && date <= until; };
  const origEdit = api.time.edit, origApprove = api.time.approve;
  Object.assign(api.time, {
    locked,
    lockedUntil(loc) { return (db().payLocks || {})[loc] || null; },
    edit(id, data) { const p = db().punches.find((x) => x.id === id); if (p && locked(p.locationId, p.date)) throw new ApiError('period_locked'); return origEdit(id, data); },
    approve(ids) { [].concat(ids).forEach((id) => { const p = db().punches.find((x) => x.id === id); if (p && locked(p.locationId, p.date)) throw new ApiError('period_locked'); }); return origApprove(ids); },
    reject(ids, reason) {
      const u = req('admin');
      [].concat(ids).forEach((id) => {
        const p = db().punches.find((x) => x.id === id); if (!p) return;
        if (locked(p.locationId, p.date)) throw new ApiError('period_locked');
        p.status = 'rejected'; p.rejectReason = String(reason || '').slice(0, 200); p.rejectedBy = u.name;
        api.notifications.push(p.userId, T('Hours on ' + p.date + ' were not approved: ' + (reason || '—'), 'Timer ' + p.date + ' ble ikke godkjent: ' + (reason || '—')), '#/staff/shifts/report', 'shift');
      });
      return commit(true);
    },
    reopen(id) { req('admin'); const p = db().punches.find((x) => x.id === id); if (!p || locked(p.locationId, p.date)) throw new ApiError('period_locked'); p.status = 'submitted'; delete p.rejectReason; return commit(p); },
    // A manager adds hours for someone who forgot to clock in/out
    addManual(data) {
      const u = req('admin');
      const target = user(data.userId); if (!target) throw new ApiError('not_found');
      if (!data.date || !data.in || !data.out) throw new ApiError('bad_request');
      if (locked(target.locationId, data.date)) throw new ApiError('period_locked');
      const inD = W.dateAt(data.date, data.in), outD = W.dateAt(data.date, data.out); if (outD <= inD) outD.setDate(outD.getDate() + 1);
      const s = db().shifts.find((x) => x.userId === target.id && x.date === data.date);
      const p = { id: App.util.uid('pu'), userId: target.id, locationId: data.locationId || target.locationId, shiftId: s ? s.id : null, date: data.date,
        in: inD.toISOString(), out: outD.toISOString(), breaks: [], status: data.approve ? 'approved' : 'submitted', note: data.note || '', manual: { by: u.name, at: new Date().toISOString() } };
      const br = Number(data.breakMin) || 0;
      if (br) { const mid = new Date(inD.getTime() + (outD - inD) / 2); p.breaks.push({ start: mid.toISOString(), end: new Date(mid.getTime() + br * 60000).toISOString() }); }
      db().punches.unshift(p);
      return commit(p);
    },
    // Close a pay period: punches on or before this date can no longer change
    lockPeriod(loc, until) {
      const u = req('admin'); const m = ensure('payLocks', {});
      if (!until) delete m[loc]; else m[loc] = until;
      ensure('payLockLog', []).unshift({ loc, until: until || null, by: u.name, at: new Date().toISOString() });
      return commit(m[loc] || null);
    },
  });

  // Rota summary uses the editable forecast from here on
  const origWeekStats = api.shifts.weekStats;
  api.shifts.weekStats = function (loc, mon) {
    return origWeekStats(loc, mon).map((d) => { const f = forecast(loc, d.day); return Object.assign(d, { revenue: f, pct: f ? (d.cost / f) * 100 : 0 }); });
  };
})();
