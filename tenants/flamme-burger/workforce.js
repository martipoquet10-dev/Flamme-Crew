/*
 * DEMO WORKFORCE DATA — Flamme Burger
 * Employees, shift patterns, availability, leave, swap requests and time punches.
 * Everything is generated relative to "today" so the demo always looks current.
 * Replace with the client's real staff list (or an import from their HR / payroll system).
 */
window.App = window.App || {};
App.demo = App.demo || {};

(function () {
  // Extra fields for the two original demo accounts (staff + manager)
  App.demo.employeeProfiles = {
    'u-staff': { name: 'Ola Hansen', title: { en: 'Crew member', nb: 'Medarbeider' }, positions: ['kitchen', 'front'], hourlyNok: 198, contract: 'part', contractHours: 24,
      phone: '+47 900 00 101', color: '#E8590C', startDate: '2024-03-01', employeeNo: '1042' },
    'u-admin': { name: 'Kari Lund', title: { en: 'Restaurant manager', nb: 'Restaurantsjef' }, positions: ['manager', 'lead'], hourlyNok: 285, contract: 'full', contractHours: 37.5,
      phone: '+47 900 00 100', color: '#495057', startDate: '2021-08-15', employeeNo: '1001' },
  };

  const E = (id, name, loc, positions, hourlyNok, color, titleEn, titleNb, extra) => Object.assign({
    id, name, role: 'staff', locationId: loc, positions, hourlyNok, color, email: id.replace('e-', '') + '@flamme.example',
    phone: '+47 9' + String(Math.abs(hash(id)) % 100000000).padStart(8, '0').replace(/(\d{2})(\d{3})(\d{3}).*/, '$1 $2 $3'),
    title: { en: titleEn, nb: titleNb }, contract: 'part', contractHours: 20, startDate: '2024-01-10', employeeNo: String(1100 + (Math.abs(hash(id)) % 800)),
  }, extra || {});

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

  App.demo.employees = [
    E('e-sofie', 'Sofie Berg', 'loc-lokka', ['lead', 'front'], 232, '#2F9E44', 'Shift lead', 'Skiftleder', { contract: 'full', contractHours: 37.5, startDate: '2022-05-02' }),
    E('e-marius', 'Marius Johansen', 'loc-lokka', ['kitchen', 'lead'], 225, '#1971C2', 'Head of kitchen', 'Kjøkkenansvarlig', { contract: 'full', contractHours: 37.5, startDate: '2022-09-12' }),
    E('e-ahmed', 'Ahmed Khan', 'loc-lokka', ['kitchen'], 205, '#C2255C', 'Cook', 'Kokk', { contractHours: 30 }),
    E('e-lucia', 'Lucía Martín', 'loc-lokka', ['front', 'kitchen'], 196, '#9C36B5', 'Crew member', 'Medarbeider'),
    E('e-jonas', 'Jonas Eide', 'loc-lokka', ['driver'], 190, '#0C8599', 'Driver', 'Sjåfør'),
    E('e-emma', 'Emma Nilsen', 'loc-lokka', ['front'], 188, '#F08C00', 'Crew member', 'Medarbeider'),
    E('e-nora', 'Nora Lie', 'loc-lokka', ['front'], 185, '#E64980', 'Crew member (new)', 'Medarbeider (ny)', { startDate: new Date(Date.now() - 9 * 864e5).toISOString().slice(0, 10), contractHours: 15 }),
    E('e-elias', 'Elias Haugen', 'loc-lokka', ['driver', 'kitchen'], 192, '#5C940D', 'Driver / cook', 'Sjåfør / kokk'),
    E('e-amira', 'Amira Hassan', 'loc-lokka', ['kitchen'], 200, '#D9480F', 'Cook', 'Kokk', { contractHours: 28 }),
    E('e-tobias', 'Tobias Dahl', 'loc-lokka', ['front', 'driver'], 190, '#3B5BDB', 'Crew member', 'Medarbeider'),
    E('e-oskar', 'Oskar Lind', 'loc-lokka', ['front', 'driver'], 188, '#1098AD', 'Crew member', 'Medarbeider', { contractHours: 24 }),
    E('e-ida', 'Ida Brekke', 'loc-lokka', ['front', 'kitchen'], 190, '#AE3EC9', 'Crew member', 'Medarbeider', { contractHours: 24 }),
    E('e-yusuf', 'Yusuf Demir', 'loc-lokka', ['kitchen', 'front'], 198, '#E67700', 'Cook', 'Kokk', { contractHours: 28 }),
    E('e-henrik', 'Henrik Moen', 'loc-frogner', ['manager', 'lead'], 280, '#495057', 'Restaurant manager', 'Restaurantsjef', { role: 'admin', contract: 'full', contractHours: 37.5 }),
    E('e-maja', 'Maja Solberg', 'loc-frogner', ['lead', 'front'], 230, '#2F9E44', 'Shift lead', 'Skiftleder', { contract: 'full', contractHours: 37.5 }),
    E('e-daniel', 'Daniel Kowalski', 'loc-frogner', ['kitchen'], 205, '#C2255C', 'Cook', 'Kokk'),
    E('e-ingrid', 'Ingrid Strand', 'loc-frogner', ['front'], 188, '#F08C00', 'Crew member', 'Medarbeider'),
    E('e-filip', 'Filip Andersen', 'loc-frogner', ['driver', 'front'], 190, '#0C8599', 'Driver', 'Sjåfør'),
    E('e-sara', 'Sara Ali', 'loc-strandgaten', ['manager', 'lead'], 280, '#495057', 'Restaurant manager', 'Restaurantsjef', { role: 'admin', contract: 'full', contractHours: 37.5 }),
  ];

  // ---------- date helpers (local time, "YYYY-MM-DD") ----------
  const dayKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const weekday = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };
  const monday = (key) => addDays(key, -((weekday(key) + 6) % 7));
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const at = (key, hm, deltaMin) => { const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d, 0, 0); x.setMinutes(toMin(hm) + (deltaMin || 0)); return x.toISOString(); };

  // Shift slots per weekday type: [position, start, end]
  function slotsFor(wd, loc) {
    const close = wd === 5 || wd === 6 ? '23:30' : wd === 0 ? '22:00' : '22:30';
    const s = [
      ['lead', '10:00', '18:00'], ['lead', '15:00', close],
      ['kitchen', '10:00', '16:00'], ['kitchen', '16:00', close],
      ['front', '11:00', '17:00'], ['front', '16:00', close],
    ];
    if (wd !== 0) s.push(['kitchen', '11:00', '17:00']);
    if ([4, 5, 6, 0].includes(wd)) s.push(['driver', '16:00', '21:00']);
    if (wd === 5 || wd === 6) s.push(['kitchen', '17:00', '23:30'], ['front', '12:00', '18:00'], ['driver', '12:00', '18:00'], ['front', '17:00', '23:30']);
    if (loc !== 'loc-lokka') return s.filter((x, i) => i !== 6 && !(x[0] === 'front' && x[1] === '12:00'));
    return s;
  }

  App.demo.notificationsSeed = function () {
    const ago = (m) => new Date(Date.now() - m * 60e3).toISOString();
    const N = (userId, en, nb, route, kind, m, read) => ({ id: 'n-' + userId + m, userId, text: { en, nb }, route, kind, at: ago(m), read: !!read });
    return [
      N('u-staff', 'Lucía Martín wants to swap shifts with you', 'Lucía Martín vil bytte vakt med deg', '#/staff/shifts/swaps', 'swap', 120),
      N('u-staff', 'Must read: The Western Burger is back from Monday', 'Må leses: Western Burger er tilbake fra mandag', '#/staff/community/post/po-1', 'post', 180),
      N('u-staff', 'Sofie Berg gave you kudos 🎉', 'Sofie Berg ga deg ros 🎉', '#/staff/community/kudos', 'kudos', 1800, true),
      N('u-staff', 'New rota published for next week', 'Ny vaktplan publisert for neste uke', '#/staff/shifts', 'publish', 60 * 24 * 4, true),
      N('u-admin', 'Amira Hassan requested leave', 'Amira Hassan søkte fravær', '#/staff/shifts/approvals', 'leave', 60 * 48),
      N('u-admin', 'Tobias Dahl wants an open shift', 'Tobias Dahl ønsker en ledig vakt', '#/staff/shifts/approvals', 'claim', 180),
    ];
  };

  App.demo.workforceSeed = function () {
    const today = dayKey(new Date());
    const thisMon = monday(today);
    const users = App.demo.users.map((u) => Object.assign({}, u, App.demo.employeeProfiles[u.id] || {})).concat(App.demo.employees)
      .filter((u) => u.positions);
    const shifts = [], punches = [];
    let n = 0;
    const id = (p) => p + '-' + (++n).toString(36);

    // Leave (approved leave blocks scheduling)
    const leave = [
      { id: 'lv-1', userId: 'e-emma', type: 'vacation', from: addDays(thisMon, 7), to: addDays(thisMon, 9), note: 'Familietur', status: 'approved', decidedBy: 'Kari Lund', createdAt: new Date(Date.now() - 20 * 864e5).toISOString() },
      { id: 'lv-2', userId: 'e-tobias', type: 'sick', from: addDays(today, -1), to: addDays(today, -1), note: '', status: 'approved', decidedBy: 'Kari Lund', createdAt: new Date(Date.now() - 1 * 864e5).toISOString() },
      { id: 'lv-3', userId: 'e-amira', type: 'vacation', from: addDays(thisMon, 21), to: addDays(thisMon, 25), note: 'Reise til Marokko', status: 'pending', createdAt: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: 'lv-4', userId: 'u-staff', type: 'vacation', from: addDays(thisMon, 35), to: addDays(thisMon, 39), note: '', status: 'approved', decidedBy: 'Kari Lund', createdAt: new Date(Date.now() - 30 * 864e5).toISOString() },
    ];
    const onLeave = (uid, key) => leave.some((l) => l.userId === uid && l.status === 'approved' && key >= l.from && key <= l.to);

    // Weekly availability (0 = Sunday … 6 = Saturday)
    const availability = {
      'u-staff': { weekly: { 1: { state: 'unavailable', note: 'Skole / school' }, 3: { state: 'preferred', from: '15:00', to: '23:30' } } },
      'e-nora': { weekly: { 2: { state: 'unavailable', note: 'Forelesning / lectures' }, 4: { state: 'partial', from: '16:00', to: '23:30' } } },
      'e-jonas': { weekly: { 1: { state: 'unavailable' }, 2: { state: 'unavailable' } } },
      'e-lucia': { weekly: { 0: { state: 'preferred' }, 6: { state: 'preferred' } } },
    };
    const unavailable = (uid, key) => { const a = availability[uid]; const w = a && a.weekly[weekday(key)]; return w && w.state === 'unavailable'; };

    const openPlan = new Set([addDays(thisMon, 5) + '|front|12:00', addDays(thisMon, 11) + '|driver|16:00', addDays(thisMon, 13) + '|kitchen|10:00']);

    ['loc-lokka', 'loc-frogner'].forEach((loc) => {
      const team = users.filter((u) => u.locationId === loc);
      for (let w = -2; w <= 2; w++) {
        const mon = addDays(thisMon, w * 7);
        const hours = {};
        for (let d = 0; d < 7; d++) {
          const key = addDays(mon, d), wd = weekday(key);
          const busy = new Set();
          slotsFor(wd, loc).forEach(([pos, start, end], si) => {
            const sh = { id: id('sh'), locationId: loc, userId: null, positionId: pos, date: key, start, end, breakMin: toMin(end) - toMin(start) > 330 ? 30 : 0,
              note: '', published: w <= 1, open: false };
            const tag = key + '|' + pos + '|' + start;
            if (loc === 'loc-lokka' && openPlan.has(tag) && key >= today) { sh.open = true; shifts.push(sh); return; }
            // Fixed demo shift: Ola works kitchen this evening, so the time clock is live.
            const force = loc === 'loc-lokka' && key === today && pos === 'kitchen' && start === '16:00' ? 'u-staff' : null;
            const eligible = team.filter((u) => u.positions.includes(pos) && !busy.has(u.id) && !onLeave(u.id, key) && !unavailable(u.id, key) && (u.id !== 'u-staff' || key !== today))
              .filter((u) => (hours[u.id] || 0) + (toMin(end) - toMin(start)) / 60 <= (u.contractHours || 20) + 12)
              .sort((a, b) => ((hours[a.id] || 0) - (hours[b.id] || 0)) || (hash(a.id + key + si) - hash(b.id + key + si)));
            const pick = force ? team.find((u) => u.id === force) : eligible[0];
            if (!pick) { if (key >= today) sh.open = true; else return; }
            else { sh.userId = pick.id; busy.add(pick.id); hours[pick.id] = (hours[pick.id] || 0) + (toMin(end) - toMin(start)) / 60; }
            shifts.push(sh);
          });
        }
      }
    });

    // Time punches for past shifts (approved for earlier weeks, submitted for this week)
    shifts.filter((s) => s.userId && s.date < today).forEach((s) => {
      const r = Math.abs(hash(s.id));
      const late = r % 17 === 0 ? 12 : 0;
      const inMin = late || -(r % 9);
      const outMin = (r % 15) - 4;
      const p = { id: 'pu-' + s.id, userId: s.userId, locationId: s.locationId, shiftId: s.id, date: s.date,
        in: at(s.date, s.start, inMin), out: at(s.date, s.end, outMin), breaks: [], status: s.date < thisMon ? 'approved' : 'submitted', note: late ? 'Trikk forsinket / tram delayed' : '' };
      if (s.breakMin) { const mid = Math.round((toMin(s.end) - toMin(s.start)) / 2); p.breaks.push({ start: at(s.date, s.start, mid), end: at(s.date, s.start, mid + 30) }); }
      punches.push(p);
    });

    // Swap / handover requests
    const fut = (uid, after) => shifts.filter((s) => s.userId === uid && s.date > (after || today) && s.published).sort((a, b) => a.date.localeCompare(b.date));
    const shiftRequests = [];
    const marius = fut('e-marius')[0];
    if (marius) shiftRequests.push({ id: 'rq-1', type: 'handover', shiftId: marius.id, fromId: 'e-marius', toId: null, status: 'open', note: 'Tannlege — kan noen ta denne? / Dentist — can anyone take this?', createdAt: new Date(Date.now() - 5 * 3600e3).toISOString() });
    const olaNext = fut('u-staff')[0], luciaNext = fut('e-lucia').find((s) => !olaNext || s.date !== olaNext.date);
    if (olaNext && luciaNext) shiftRequests.push({ id: 'rq-2', type: 'swap', shiftId: luciaNext.id, targetShiftId: olaNext.id, fromId: 'e-lucia', toId: 'u-staff', status: 'pending_colleague', note: 'Bytte? Jeg har bursdag 🎂 / Swap? It\'s my birthday', createdAt: new Date(Date.now() - 2 * 3600e3).toISOString() });
    const ahmed = fut('e-ahmed')[0], amira = ahmed && fut('e-amira').find((s) => s.date !== ahmed.date);
    if (ahmed && amira) shiftRequests.push({ id: 'rq-3', type: 'swap', shiftId: ahmed.id, targetShiftId: amira.id, fromId: 'e-ahmed', toId: 'e-amira', status: 'pending_manager', note: '', createdAt: new Date(Date.now() - 26 * 3600e3).toISOString() });
    const open1 = shifts.find((s) => s.open && s.locationId === 'loc-lokka' && s.published);
    if (open1) shiftRequests.push({ id: 'rq-4', type: 'claim', shiftId: open1.id, fromId: 'e-tobias', toId: null, status: 'pending_manager', note: '', createdAt: new Date(Date.now() - 3 * 3600e3).toISOString() });

    return {
      shifts, punches, leave, availability, shiftRequests,
      activePunches: {},                 // userId → running punch (clocked in now)
      publishLog: [{ locationId: 'loc-lokka', week: addDays(thisMon, 7), by: 'Kari Lund', at: new Date(Date.now() - 4 * 864e5).toISOString() }],
      shiftTemplates: [
        { id: 'tp-open-k', positionId: 'kitchen', start: '10:00', end: '16:00', name: { en: 'Opening kitchen', nb: 'Åpning kjøkken' } },
        { id: 'tp-close-k', positionId: 'kitchen', start: '16:00', end: '22:30', name: { en: 'Closing kitchen', nb: 'Stenging kjøkken' } },
        { id: 'tp-mid-f', positionId: 'front', start: '11:00', end: '17:00', name: { en: 'Front — day', nb: 'Front — dag' } },
        { id: 'tp-close-f', positionId: 'front', start: '16:00', end: '22:30', name: { en: 'Front — evening', nb: 'Front — kveld' } },
        { id: 'tp-drv', positionId: 'driver', start: '16:00', end: '21:00', name: { en: 'Delivery evening', nb: 'Levering kveld' } },
        { id: 'tp-lead', positionId: 'lead', start: '15:00', end: '22:30', name: { en: 'Shift lead evening', nb: 'Skiftleder kveld' } },
      ],
    };
  };
})();
