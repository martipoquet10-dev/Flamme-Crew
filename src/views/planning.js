/*
 * SCHEDULE area — planning tools:
 *   availability (day by day) actions · drag & drop in the rota · week templates
 *   auto-planning · kiosk mode (#/kiosk) · head-office view (#/staff/shifts/hq)
 *   till sales import · pay & time rules (#/admin/payrules)
 */
(function () {
  const U = App.util, K = App.kit, W = App.wf;
  const { esc, L } = U;
  const T = K.T;
  const ic = App.art.icon;
  const api = App.api, app = App.app;
  const guard = (fn, role) => App.views.guard(fn, role);
  const loc = () => App.views.staffLocation();
  const isMgr = () => api.auth.hasRole('admin');
  const nok = U.nok;
  const live = () => !!(App.sync && App.sync.live);
  const head = (title, sub, right) => `<header class="staff-head"><div><h1 class="h1">${title}</h1>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>${right || ''}</header>`;
  const re = (msg) => { if (msg) app.toast(msg); app.render(); };
  const errText = (e) => { const k = 'err.' + (e && e.code); return App.i18n.has(k) ? App.i18n.t(k) : T('Something went wrong', 'Noe gikk galt'); };

  App.i18n.extend({
    en: { 'err.empty_week': 'There are no shifts in this week to save.', 'err.wrong_pin': 'Wrong PIN.', 'err.too_many_attempts': 'Too many attempts. Wait 5 minutes.' },
    nb: { 'err.empty_week': 'Det er ingen vakter denne uka å lagre.', 'err.wrong_pin': 'Feil PIN-kode.', 'err.too_many_attempts': 'For mange forsøk. Vent 5 minutter.' },
  });

  // ================= AVAILABILITY (day by day) =================
  Object.assign(App.actions, {
    avTab(d) { app.ui.avTab = d.t; re(); },
    avPick(d) { const s = app.ui.avSel = app.ui.avSel || []; const i = s.indexOf(d.d); if (i >= 0) s.splice(i, 1); else s.push(d.d); s.sort(); re(); },
    avClear() { app.ui.avSel = []; re(); },
    avSet(d) {
      const sel = app.ui.avSel || []; if (!sel.length) return;
      api.availability.setDates(sel, { state: d.state }); app.ui.avSel = [];
      re(d.state === 'clear' ? T('Back to your usual week', 'Tilbake til vanlig uke') : T('Availability saved for ' + sel.length + ' day(s)', 'Tilgjengelighet lagret for ' + sel.length + ' dag(er)'));
    },
    avHours() { app.modal(App.views.availabilityHoursSheet()); },
    avPreset(d, el) { const f = el.closest('form'); f.from0.value = d.from; f.to0.value = d.to; },
    avTeamNav(d) { app.ui.avTeamStart = W.addDays(app.ui.avTeamStart || W.today(), Number(d.d)); re(); },
  });
  Object.assign(App.forms, {
    avHoursSave(data) {
      const ranges = [0, 1, 2].map((i) => ({ from: data['from' + i], to: data['to' + i] })).filter((r) => r.from && r.to && r.from < r.to);
      if (!ranges.length) return app.toast(T('Add at least one time range (from must be before to)', 'Legg til minst ett tidsrom (fra må være før til)'), 'error');
      const sel = app.ui.avSel || [];
      api.availability.setDates(sel, { state: 'partial', ranges, note: data.note }); app.ui.avSel = []; app.modal(null);
      re(T('Saved: available ', 'Lagret: tilgjengelig ') + ranges.map((r) => r.from + '–' + r.to).join(', '));
    },
  });

  // ================= DRAG & DROP IN THE ROTA =================
  // Drag a shift to another person or day. Hold Ctrl / Alt / ⌘ while dropping to copy instead of move.
  let dragId = null;
  document.addEventListener('dragstart', (ev) => {
    const el = ev.target.closest && ev.target.closest('[data-drag]'); if (!el) return;
    dragId = el.dataset.drag; ev.dataTransfer.effectAllowed = 'copyMove';
    try { ev.dataTransfer.setData('text/plain', dragId); } catch (e) { /* old browsers */ }
    el.classList.add('dragging'); document.body.classList.add('is-dragging');
  });
  document.addEventListener('dragend', () => { dragId = null; document.body.classList.remove('is-dragging'); document.querySelectorAll('.dragging, .drop-hover').forEach((x) => x.classList.remove('dragging', 'drop-hover')); });
  document.addEventListener('dragover', (ev) => {
    if (!dragId) return; const cell = ev.target.closest && ev.target.closest('[data-cell-date]'); if (!cell) return;
    ev.preventDefault(); ev.dataTransfer.dropEffect = ev.ctrlKey || ev.altKey || ev.metaKey ? 'copy' : 'move';
    document.querySelectorAll('.drop-hover').forEach((x) => x !== cell && x.classList.remove('drop-hover')); cell.classList.add('drop-hover');
  });
  document.addEventListener('drop', (ev) => {
    const cell = ev.target.closest && ev.target.closest('[data-cell-date]'); if (!cell || !dragId) return;
    ev.preventDefault();
    const s = api.shifts.get(dragId); if (!s) return;
    const copy = ev.ctrlKey || ev.altKey || ev.metaKey;
    const date = cell.dataset.cellDate, userId = cell.dataset.cellUser || '';
    if (!copy && s.date === date && (s.userId || '') === userId) return;
    try {
      const saved = api.shifts.save({ id: copy ? '' : s.id, locationId: s.locationId, userId, positionId: s.positionId, date, start: s.start, end: s.end, breakMin: s.breakMin, note: s.note });
      const cf = api.shifts.conflicts(saved);
      const who = userId ? api.people.get(userId).name.split(' ')[0] : T('open shift', 'ledig vakt');
      re((copy ? T('Copied to ', 'Kopiert til ') : T('Moved to ', 'Flyttet til ')) + who + ' · ' + K.fmtDay(date, 'short') + (cf.length ? ' · ⚠ ' + cf.map((c) => L(c.text)).join(', ') : ''));
    } catch (e) { app.toast(errText(e), 'error'); }
    dragId = null;
  });

  // ================= WEEK TEMPLATES =================
  function templatesSheet() {
    const mon = app.ui.rotaWeek || W.monday(W.today());
    const list = api.templates.list(loc());
    return `${K.sheetHead(T('Week templates', 'Ukemaler'), T('Save a good week and reuse it. Applied shifts are drafts until you publish.', 'Lagre en god uke og bruk den igjen. Vakter fra maler er utkast til du publiserer.'))}
      <div class="sheet-body stack">
        <form class="card inset stack" data-form="tplSave"><b>${ic('copy', 16)} ${T('Save week', 'Lagre uke')} ${W.isoWeek(mon)} ${T('as a template', 'som mal')}</b>
          <label class="sr-only" for="tplName">${T('Name', 'Navn')}</label><input id="tplName" class="input" name="name" required placeholder="${T('e.g. Normal week · Christmas week', 'f.eks. Normal uke · Juleuke')}">
          <label class="opt"><input type="checkbox" name="withPeople" checked><span>${T('Keep who works each shift', 'Behold hvem som jobber hver vakt')}</span></label>
          <button class="btn btn-dark">${T('Save template', 'Lagre mal')}</button></form>
        ${list.length ? list.map((t) => `<div class="tpl-row"><div><b>${esc(t.name)}</b><span class="small muted">${t.shifts.length} ${T('shifts', 'vakter')} · ${t.withPeople ? T('with people', 'med personer') : T('positions only', 'kun stillinger')} · ${esc(t.createdBy)}</span></div>
          <div class="row"><button class="btn btn-sm btn-primary" data-action="tplApply" data-id="${t.id}">${T('Apply to week', 'Bruk på uke')} ${W.isoWeek(mon)}</button><button class="icon-btn" data-action="tplDelete" data-id="${t.id}" aria-label="${T('Delete', 'Slett')}">${ic('trash', 16)}</button></div></div>`).join('')
          : `<p class="small muted">${T('No templates yet.', 'Ingen maler ennå.')}</p>`}
        <label class="opt"><input type="checkbox" id="tplReplace"><span>${T('Replace existing drafts in that week', 'Erstatt eksisterende utkast den uka')}</span></label>
      </div>`;
  }
  Object.assign(App.actions, {
    rotaTemplates() { app.modal(templatesSheet()); },
    tplApply(d) {
      const mon = app.ui.rotaWeek || W.monday(W.today());
      const r = api.templates.apply(d.id, mon, { replaceDrafts: !!(document.getElementById('tplReplace') || {}).checked });
      app.modal(null); re(T(r.created + ' draft shifts added', r.created + ' utkast lagt til') + (r.freed ? T(' · ' + r.freed + ' left open (person unavailable)', ' · ' + r.freed + ' står ledige (personen er utilgjengelig)') : ''));
    },
    tplDelete(d) { api.templates.remove(d.id); app.modal(templatesSheet()); },
  });
  Object.assign(App.forms, {
    tplSave(data) {
      try { api.templates.save(loc(), app.ui.rotaWeek || W.monday(W.today()), data.name, !!data.withPeople); app.modal(templatesSheet()); app.toast(T('Template saved', 'Mal lagret')); }
      catch (e) { app.toast(errText(e), 'error'); }
    },
  });

  // ================= AUTO-PLANNING =================
  function autoSheet(result) {
    const mon = app.ui.rotaWeek || W.monday(W.today());
    const last = api.autoplan.last(loc());
    return `${K.sheetHead(T('Auto-plan week', 'Planlegg uka automatisk') + ' ' + W.isoWeek(mon), T('Uses the sales forecast hour by hour, availability, leave, contract hours, 11 h rest and cost.', 'Bruker salgsprognosen time for time, tilgjengelighet, fravær, avtalte timer, 11 t hvile og kostnad.'))}
      <div class="sheet-body stack">
        ${result ? `<div class="notice notice-green">${ic('sparkle', 18)} <span><b>${T('Done.', 'Ferdig.')}</b> ${T(result.created + ' new shifts created, ' + result.assigned + ' assigned', result.created + ' nye vakter laget, ' + result.assigned + ' tildelt')}${result.unfilled ? T(' · ' + result.unfilled + ' still open (nobody suitable free)', ' · ' + result.unfilled + ' fortsatt ledige (ingen passende ledig)') : ''}. ${T('Everything is a draft — check the rota, then publish.', 'Alt er utkast — sjekk vaktplanen og publiser.')}</span></div>` : ''}
        <form class="stack" data-form="autoRun">
          <label class="opt"><input type="checkbox" name="create" checked><span><b>${T('Create shifts where staff is short', 'Lag vakter der det mangler folk')}</b><br><span class="small muted">${T('Compares planned staff with the recommended staff for every hour.', 'Sammenligner planlagt bemanning med anbefalt bemanning hver time.')}</span></span></label>
          <label class="opt"><input type="checkbox" name="assign" checked><span><b>${T('Assign people to open shifts', 'Tildel personer til ledige vakter')}</b><br><span class="small muted">${T('Trained for the position, free that day and those hours, rest rules OK, lowest cost and fairest hours first.', 'Opplært i stillingen, ledig den dagen og de timene, hvileregler OK, lavest kostnad og jevnest fordeling først.')}</span></span></label>
          <div class="${api.people.usesPositions() ? 'grid-2' : ''}"><div><label class="field-label" for="apExtra">${T('Max hours above contract', 'Maks timer over avtalt')}</label><input id="apExtra" class="input" type="number" name="extraHours" value="4" min="0" max="20"></div>
            ${api.people.usesPositions() ? '' : '<!--'}<div><p class="field-label">${T('Positions to create', 'Stillinger som lages')}</p><div class="row">${api.people.positions().filter((p) => ['kitchen', 'front', 'driver'].includes(p.id)).map((p) => `<label class="opt"><input type="checkbox" name="positions" value="${p.id}" ${p.id !== 'driver' ? 'checked' : ''}><span>${esc(L(p.name))}</span></label>`).join('')}</div></div>${api.people.usesPositions() ? '' : '-->'}</div>
          <button class="btn btn-primary btn-block">${ic('sparkle', 18)} ${T('Plan the week', 'Planlegg uka')}</button></form>
        ${last ? `<div class="row-between small"><span class="muted">${T('Last auto-plan', 'Siste automatiske plan')}: ${esc(last.by)} · ${K.timeAgo(last.at)} · ${last.created.length + last.assigned.length} ${T('changes', 'endringer')}</span><button class="btn btn-sm btn-ghost" data-action="autoUndo" data-id="${last.id}">${ic('refresh', 14)} ${T('Undo', 'Angre')}</button></div>` : ''}
      </div>`;
  }
  Object.assign(App.actions, {
    rotaAuto() { app.modal(autoSheet()); },
    autoUndo(d) { api.autoplan.undo(d.id); app.modal(null); re(T('Auto-plan undone', 'Automatisk plan angret')); },
  });
  Object.assign(App.forms, {
    autoRun(data) {
      const mon = app.ui.rotaWeek || W.monday(W.today());
      const r = api.autoplan.run(loc(), mon, { create: !!data.create, assign: !!data.assign, extraHours: Number(data.extraHours) || 0, positions: [].concat(data.positions || []) });
      app.render(); app.modal(autoSheet(r));
    },
  });

  // ================= KIOSK (store tablet) =================
  const KEY = 'crew.kiosk';
  const kioskOn = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return !!app.ui.kioskLock; } };
  const setKiosk = (v) => { app.ui.kioskLock = v; try { if (v) sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY); } catch (e) { /* private mode */ } };
  window.addEventListener('hashchange', () => { if (kioskOn() && location.hash !== '#/kiosk') location.hash = '#/kiosk'; });

  function kiosk() {
    if (!isMgr()) return App.views.login();
    if (!kioskOn()) setKiosk(true);
    const l = loc(); const db = App.store.db; const now = new Date();
    const team = api.people.team(l);
    const todays = db.shifts.filter((s) => s.locationId === l && s.date === W.today() && s.userId && s.published);
    const state = (u) => { const p = db.activePunches[u.id]; if (!p) return 'out'; return api.time.onBreak(p) ? 'break' : 'in'; };
    const tile = (u) => {
      const st = state(u), p = db.activePunches[u.id], sh = todays.filter((s) => s.userId === u.id);
      return `<button class="k-tile k-${st}" data-action="kioskPick" data-id="${u.id}">${K.avatar(u, 56)}<b>${esc(u.name.split(' ')[0])} ${esc((u.name.split(' ')[1] || '').charAt(0))}.</b>
        <span class="k-st">${st === 'in' ? '● ' + T('In since ', 'Inne siden ') + U.fmtTime(p.in) : st === 'break' ? '☕ ' + T('On break', 'På pause') : sh.length ? sh.map((s) => s.start + '–' + s.end).join(', ') : T('Not scheduled', 'Ikke satt opp')}</span></button>`;
    };
    const scheduled = team.filter((u) => todays.some((s) => s.userId === u.id) || db.activePunches[u.id]);
    const others = team.filter((u) => !scheduled.includes(u));
    app.ui.afterRender = () => { const el = document.querySelector('[data-kclock]'); if (el) el.textContent = W.hmOf(new Date()); };
    return `<div class="kiosk">
      <header class="k-head">${App.art.logo(34, true)}<div class="k-where"><b>${esc((api.catalog.location(l) || {}).name)}</b><span>${esc(K.fmtDay(W.today()))}</span></div>
        <b class="k-clock" data-kclock>${W.hmOf(now)}</b><button class="k-exit" data-action="kioskExit">${ic('lock', 16)} ${T('Exit', 'Avslutt')}</button></header>
      <h2 class="k-title">${T('Tap your name to clock in or out', 'Trykk på navnet ditt for å stemple inn eller ut')}</h2>
      <div class="k-grid">${scheduled.map(tile).join('') || `<p class="muted">${T('Nobody scheduled today.', 'Ingen satt opp i dag.')}</p>`}</div>
      ${others.length && App.tenant.workforce.kiosk && App.tenant.workforce.kiosk.allowUnscheduled ? `<details class="k-more"><summary>${T('Not scheduled today', 'Ikke satt opp i dag')} (${others.length})</summary><div class="k-grid">${others.map(tile).join('')}</div></details>` : ''}
      <p class="k-foot">${live() ? T('Each punch is confirmed with the employee\'s own PIN and saved on the server.', 'Hver stempling bekreftes med den ansattes egen PIN-kode og lagres på serveren.') : T('Offline demo: any 4-digit PIN works.', 'Frakoblet demo: hvilken som helst 4-sifret PIN fungerer.')}</p>
    </div>`;
  }
  setInterval(() => { const el = document.querySelector('[data-kclock]'); if (el) el.textContent = W.hmOf(new Date()); }, 10000);
  setInterval(() => { if (location.hash === '#/kiosk' && !document.querySelector('#modal:not([hidden])') && live()) App.sync.refresh(); }, 30000);

  function pinPad(userId, title, ops) {
    const u = api.people.get(userId) || { name: '' };
    return `<form class="k-pin" data-form="kioskPin"><input type="hidden" name="userId" value="${esc(userId)}">
      <div class="row">${K.avatar(u, 52)}<div><b class="h3">${esc(title || u.name)}</b><p class="small muted">${T('Enter your PIN', 'Skriv inn PIN-koden din')}</p></div></div>
      <label class="sr-only" for="kPin">PIN</label><input id="kPin" class="input pin-input" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" required autocomplete="off">
      <div class="k-keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '⌫'].map((k) => `<button type="button" data-action="kioskKey" data-k="${k}">${k}</button>`).join('')}</div>
      <div class="k-ops">${ops.map(([op, label, cls]) => `<button class="btn ${cls}" name="op" value="${op}">${label}</button>`).join('')}</div>
      <button type="button" class="btn btn-ghost btn-block" data-action="closeModal">${T('Cancel', 'Avbryt')}</button></form>`;
  }
  async function kioskPunch(userId, pin, op) {
    if (live()) return App.sync.kiosk(userId, pin, op);
    if (!/^\d{4,8}$/.test(pin)) { const e = new Error('wrong_pin'); e.code = 'wrong_pin'; throw e; }
    if (op === 'verify') return { ok: true };
    const mgr = api.auth.me().id; api.auth.login(userId);
    try { if (op === 'in') api.time.clockIn('Kiosk'); else if (op === 'out') api.time.clockOut(); else api.time.breakToggle(); } finally { api.auth.login(mgr); }
    return { ok: true };
  }
  function flash(html) { app.modal(`<div class="k-done">${html}</div>`, 'sheet-sm'); setTimeout(() => { if (document.querySelector('.k-done')) app.modal(null); }, 2600); }
  Object.assign(App.actions, {
    kioskStart() { setKiosk(true); app.go('#/kiosk'); },
    kioskPick(d) {
      const p = App.store.db.activePunches[d.id];
      const ops = !p ? [['in', ic('play', 18) + ' ' + T('Clock in', 'Stemple inn'), 'btn-primary btn-lg']]
        : [[api.time.onBreak(p) ? 'break' : 'break', ic(api.time.onBreak(p) ? 'play' : 'coffee', 18) + ' ' + (api.time.onBreak(p) ? T('End break', 'Avslutt pause') : T('Start break', 'Start pause')), 'btn-light btn-lg'], ['out', ic('stop', 18) + ' ' + T('Clock out', 'Stemple ut'), 'btn-dark btn-lg']];
      app.modal(pinPad(d.id, null, ops), 'sheet-sm kiosk-sheet'); setTimeout(() => { const i = document.getElementById('kPin'); if (i) i.focus(); }, 50);
    },
    kioskKey(d) { const i = document.getElementById('kPin'); if (!i) return; if (d.k === 'C') i.value = ''; else if (d.k === '⌫') i.value = i.value.slice(0, -1); else if (i.value.length < 8) i.value += d.k; i.focus(); },
    kioskExit() { app.modal(pinPad(api.auth.me().id, T('Manager PIN to exit', 'Leder-PIN for å avslutte'), [['verify', T('Exit kiosk', 'Avslutt kiosk'), 'btn-dark btn-lg']]), 'sheet-sm kiosk-sheet'); },
  });
  Object.assign(App.forms, {
    kioskPin(data, form) {
      const op = data.op || 'in';
      form.querySelectorAll('button').forEach((b) => (b.disabled = true));
      kioskPunch(data.userId, data.pin, op).then(() => {
        if (op === 'verify') { setKiosk(false); app.modal(null); app.go('#/staff/shifts/clock'); return; }
        const u = api.people.get(data.userId); const first = (u.name || '').split(' ')[0];
        app.render();
        flash(op === 'in' ? `${ic('check', 40)}<b>${T('Clocked in', 'Stemplet inn')} ${W.hmOf(new Date())}</b><span>${T('Have a great shift, ', 'God vakt, ')}${esc(first)}!</span>`
          : op === 'out' ? `${ic('stop', 40)}<b>${T('Clocked out', 'Stemplet ut')} ${W.hmOf(new Date())}</b><span>${T('Thanks for today, ', 'Takk for i dag, ')}${esc(first)}!</span>`
          : `${ic('coffee', 40)}<b>${T('Break updated', 'Pause oppdatert')}</b><span>${esc(first)}</span>`);
      }).catch((e) => {
        form.querySelectorAll('button').forEach((b) => (b.disabled = false));
        form.pin.value = ''; form.pin.focus(); app.toast(errText(e), 'error');
      });
    },
  });
  App.views.layouts.kiosk = (content) => content;

  // ================= HEAD-OFFICE VIEW =================
  function hq() {
    const ui = app.ui.hq = app.ui.hq || {};
    const mon = ui.mon || W.monday(W.today()), sun = W.addDays(mon, 6);
    const rows = api.hq.overview(mon, sun, { loaded: !!ui.loaded });
    const target = App.tenant.workforce.laborTargetPct;
    const sum = (f) => rows.reduce((s, r) => s + (f(r) || 0), 0);
    const totF = sum((r) => r.totals.forecast), totPC = sum((r) => r.totals.plannedCost);
    const totA = rows.some((r) => r.totals.actual != null) ? sum((r) => r.totals.actual) : null, totAC = sum((r) => r.totals.actualCostOnActualDays);
    const cls = (p) => (p == null ? '' : p > target + 2 ? 'bad' : p > target ? 'warn' : 'good');
    const pct = (n) => (n == null ? '—' : n.toFixed(1) + ' %');
    const maxPct = Math.max(target + 10, ...rows.map((r) => r.totals.pctPlanned || 0));
    return `<div class="page-w wide">
      ${head(T('Head office', 'Hovedkontor'), T('All restaurants side by side: sales, labour cost, staffing and what is waiting for approval.', 'Alle restauranter side om side: salg, lønnskostnad, bemanning og hva som venter på godkjenning.'),
        `<label class="opt tog"><input type="checkbox" data-change="hqLoaded" ${ui.loaded ? 'checked' : ''}><span>${T('Incl. employer costs', 'Inkl. arbeidsgiverkostnader')}</span></label>`)}
      <div class="rota-bar"><div class="row"><button class="icon-btn bordered" data-action="hqNav" data-d="-7" aria-label="${T('Previous week', 'Forrige uke')}">${ic('back', 18)}</button>
        <div class="rota-title"><b>${T('Week', 'Uke')} ${W.isoWeek(mon)}</b><span class="small muted">${K.fmtDay(mon, 'short')} – ${K.fmtDay(sun, 'short')}</span></div>
        <button class="icon-btn bordered" data-action="hqNav" data-d="7" aria-label="${T('Next week', 'Neste uke')}">${ic('arrow', 18)}</button><button class="btn btn-ghost btn-sm" data-action="hqNav" data-d="0">${T('This week', 'Denne uka')}</button></div></div>
      <div class="kpis lab-kpis">
        <div class="kpi"><span class="small muted">${T('Forecast sales (all)', 'Prognose salg (alle)')}</span><b>${nok(totF)}</b>${totA != null ? `<span class="small muted">${T('Actual', 'Faktisk')} ${nok(totA)}</span>` : ''}</div>
        <div class="kpi ${cls(totF ? totPC / totF * 100 : null)}"><span class="small muted">${T('Planned labour %', 'Planlagt lønn %')}</span><b>${pct(totF ? totPC / totF * 100 : null)}</b><span class="small muted">${nok(totPC)}</span></div>
        <div class="kpi ${cls(totA ? totAC / totA * 100 : null)}"><span class="small muted">${T('Actual labour %', 'Faktisk lønn %')}</span><b>${pct(totA ? totAC / totA * 100 : null)}</b></div>
        <div class="kpi"><span class="small muted">${T('Working right now', 'På jobb nå')}</span><b>${sum((r) => r.working)}</b><span class="small muted">${sum((r) => r.staff)} ${T('employees', 'ansatte')}</span></div>
        <div class="kpi ${sum((r) => r.pending + r.timesheets) ? 'warn' : ''}"><span class="small muted">${T('Waiting for approval', 'Venter på godkjenning')}</span><b>${sum((r) => r.pending + r.timesheets)}</b><span class="small muted">${sum((r) => r.timesheets)} ${T('timesheets', 'timelister')}</span></div>
      </div>
      <section class="card"><h2 class="h3">${ic('chart', 18)} ${T('Planned labour % by restaurant', 'Planlagt lønn % per restaurant')}</h2>
        <div class="hq-bars">${rows.map((r) => `<div class="hq-bar"><span>${esc(r.location.name.replace(App.tenant.name + ' ', ''))}</span><div class="hq-track"><i class="${cls(r.totals.pctPlanned)}" style="width:${(r.totals.pctPlanned || 0) / maxPct * 100}%"></i><em style="left:${target / maxPct * 100}%"></em></div><b class="${cls(r.totals.pctPlanned)}">${pct(r.totals.pctPlanned)}</b></div>`).join('')}</div>
        <p class="small muted">${T('Line = target', 'Linje = mål')} ${target} %.</p></section>
      <div class="table-wrap card"><table class="table lab-t"><thead><tr><th>${T('Restaurant', 'Restaurant')}</th><th class="num">${T('Staff', 'Ansatte')}</th><th class="num">${T('Forecast', 'Prognose')}</th><th class="num">${T('Actual sales', 'Faktisk salg')}</th><th class="num">${T('Hours', 'Timer')}</th><th class="num">${T('Labour cost', 'Lønnskostnad')}</th><th class="num">${T('Labour % plan', 'Lønn % plan')}</th><th class="num">${T('Labour % actual', 'Lønn % faktisk')}</th><th class="num">SPLH</th><th class="num">${T('Open shifts', 'Ledige')}</th><th class="num">${T('Drafts', 'Utkast')}</th><th class="num">${T('To approve', 'Godkjenne')}</th><th class="num">${T('Sick h', 'Syk t')}</th><th></th></tr></thead>
        <tbody>${rows.map((r) => `<tr class="click" data-action="hqOpen" data-id="${r.location.id}"><td><b>${esc(r.location.name.replace(App.tenant.name + ' ', ''))}</b><br><span class="small muted">${esc(r.location.city || '')}</span></td>
          <td class="num">${r.staff} <span class="small green">(${r.working})</span></td><td class="num">${nok(r.totals.forecast)}</td><td class="num">${r.totals.actual != null ? nok(r.totals.actual) : '—'}</td><td class="num">${Math.round(r.totals.plannedHours)}</td><td class="num">${nok(r.totals.plannedCost)}</td>
          <td class="num"><span class="pct ${cls(r.totals.pctPlanned)}">${pct(r.totals.pctPlanned)}</span></td><td class="num"><span class="pct ${cls(r.totals.pctActual)}">${pct(r.totals.pctActual)}</span></td><td class="num">${nok(r.totals.splhPlanned)}</td>
          <td class="num ${r.totals.open ? 'warn' : ''}">${r.totals.open}</td><td class="num">${r.totals.drafts}</td><td class="num ${r.pending + r.timesheets ? 'warn' : ''}">${r.pending + r.timesheets}</td><td class="num">${Math.round(r.sickHours)}</td><td>${ic('arrow', 16)}</td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">${T('Only restaurants that use the app are listed. Tap a row to open its labour page.', 'Bare restauranter som bruker appen vises. Trykk på en rad for å åpne lønnssiden.')}</p>
    </div>`;
  }
  Object.assign(App.actions, {
    hqNav(d) { const ui = app.ui.hq = app.ui.hq || {}; const n = Number(d.d); ui.mon = n === 0 ? W.monday(W.today()) : W.addDays(ui.mon || W.monday(W.today()), n); re(); },
    hqOpen(d) { app.ui.staffLoc = d.id; app.ui.lab = Object.assign(app.ui.lab || {}, { anchor: (app.ui.hq && app.ui.hq.mon) || W.today(), view: 'week' }); app.go('#/staff/shifts/labor'); },
  });
  Object.assign(App.changes, { hqLoaded(el) { (app.ui.hq = app.ui.hq || {}).loaded = el.checked; re(); } });

  // ================= TILL (POS) SALES IMPORT =================
  // CSV with one line per day: date;sales  (dates as 2026-11-05 or 05.11.2026, any ; , or tab separator)
  function parseSales(text) {
    const out = [];
    text.split(/\r?\n/).forEach((line) => {
      const cells = line.split(/[;\t,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/"/g, '').trim());
      if (cells.length < 2) return;
      let date = cells[0], m;
      if ((m = date.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) date = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      const raw = cells.slice(1).join(',').replace(/[^\d,.-]/g, '');
      const n = Number(raw.includes(',') && !raw.includes('.') ? raw.replace(',', '.') : raw.replace(/,/g, ''));
      if (isFinite(n) && n >= 0) out.push({ date, sales: Math.round(n) });
    });
    return out;
  }
  Object.assign(App.changes, {
    posCsv(el) {
      const f = el.files && el.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        const rows = parseSales(String(r.result || ''));
        if (!rows.length) return app.toast(T('No lines found. Use: date;sales per line.', 'Fant ingen linjer. Bruk: dato;salg per linje.'), 'error');
        rows.forEach((x) => api.labor.setActual(loc(), x.date, x.sales));
        re(T(rows.length + ' days of sales imported', rows.length + ' dager med salg importert'));
      };
      r.readAsText(f);
    },
  });
  App.views.posImportButton = () => `<label class="btn btn-ghost btn-sm file-btn">${ic('download', 16)} ${T('Import sales (CSV)', 'Importer salg (CSV)')}<input type="file" accept=".csv,.txt,text/csv" data-change="posCsv" hidden></label>`;

  // ================= PAY & TIME RULES =================
  function payrules() {
    const w = App.tenant.workforce; const pos = api.people.positions();
    const year = new Date().getFullYear();
    const sups = w.supplements;
    const num = (name, val, step, label, suffix) => `<div><label class="field-label" for="pr_${name}">${label}</label><div class="row nowrap"><input id="pr_${name}" class="input input-sm input-num" type="number" name="${name}" value="${val}" step="${step || 1}" min="0">${suffix ? `<span class="small muted">${suffix}</span>` : ''}</div></div>`;
    return `<div class="page-w">
      ${head(T('Pay & time rules', 'Lønns- og tidsregler'), T('How hours become pay and cost. Changes apply to all calculations right away.', 'Hvordan timer blir lønn og kostnad. Endringer gjelder alle beregninger med en gang.'))}
      <div class="notice notice-amber small">${ic('alert', 16)} <span>${T('Example values — confirm them with your accountant and the tariff agreement before payroll.', 'Eksempelverdier — bekreft dem med regnskapsfører og tariffavtalen før lønnskjøring.')}</span></div>
      <form data-form="savePayrules" class="stack">
        <section class="card"><h2 class="h3">${ic('target', 18)} ${T('Targets', 'Mål')}</h2><div class="pr-grid">
          ${num('laborTargetPct', w.laborTargetPct, 0.5, T('Labour cost target', 'Mål for lønnskostnad'), '%')}${num('targetSplh', w.targetSplh, 50, T('Sales per labour hour', 'Salg per arbeidstime'), 'kr')}${num('minStaffPerHour', w.minStaffPerHour, 1, T('Minimum staff per open hour', 'Minimum bemanning per time'), '')}</div></section>
        <section class="card"><h2 class="h3">${ic('wallet', 18)} ${T('Employer costs', 'Arbeidsgiverkostnader')}</h2><div class="pr-grid">
          ${num('holidayPayPct', w.employerCost.holidayPayPct, 0.1, T('Holiday pay (feriepenger)', 'Feriepenger'), '%')}${num('payrollTaxPct', w.employerCost.payrollTaxPct, 0.1, T('Payroll tax (arbeidsgiveravgift)', 'Arbeidsgiveravgift'), '%')}</div></section>
        <section class="card"><h2 class="h3">${ic('clock', 18)} ${T('Time clock', 'Stempling')}</h2><div class="pr-grid">
          <div><label class="field-label" for="pr_round">${T('Round punches to', 'Rund av stemplinger til')}</label><select id="pr_round" class="input input-sm" name="roundMinutes">${[0, 5, 10, 15, 30].map((m) => `<option value="${m}" ${Number(w.rounding.minutes) === m ? 'selected' : ''}>${m ? m + ' min' : T('Off (exact minutes)', 'Av (eksakte minutter)')}</option>`).join('')}</select></div>
          <div><label class="field-label" for="pr_mode">${T('Rounding direction', 'Avrundingsretning')}</label><select id="pr_mode" class="input input-sm" name="roundMode">${[['nearest', T('Nearest', 'Nærmeste')], ['employee', T('In favour of employee', 'I den ansattes favør')], ['employer', T('In favour of employer', 'I arbeidsgivers favør')]].map(([k, l]) => `<option value="${k}" ${w.rounding.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <label class="opt"><input type="checkbox" name="payFromShiftStart" ${w.payFromShiftStart ? 'checked' : ''}><span>${T('Early clock-in is paid from the planned start', 'Tidlig innstempling betales fra planlagt start')}</span></label>
          <label class="opt"><input type="checkbox" name="kioskUnscheduled" ${w.kiosk && w.kiosk.allowUnscheduled ? 'checked' : ''}><span>${T('Kiosk: allow clock-in without a planned shift', 'Kiosk: tillat innstempling uten planlagt vakt')}</span></label></div></section>
        <section class="card"><h2 class="h3">${ic('chart', 18)} ${T('Overtime', 'Overtid')}</h2><div class="pr-grid">
          ${num('otDaily', w.overtime.dailyHours, 0.5, T('After hours per day', 'Etter timer per dag'), T('h', 't'))}${num('otWeekly', w.overtime.weeklyHours, 0.5, T('After hours per week', 'Etter timer per uke'), T('h', 't'))}${num('otPct', w.overtime.pct, 5, T('Overtime supplement', 'Overtidstillegg'), '%')}</div></section>
        <section class="card"><h2 class="h3">${ic('star', 18)} ${T('Supplements', 'Tillegg')}</h2>
          <div class="table-wrap"><table class="table"><thead><tr><th>${T('Supplement', 'Tillegg')}</th><th>${T('When', 'Når')}</th><th class="num">${T('Amount', 'Beløp')}</th>${api.people.usesPositions() ? `<th>${T('Only for positions', 'Bare for stillinger')}</th>` : ''}</tr></thead>
          <tbody>${sups.map((s, i) => `<tr><td><b>${esc(L(s.label))}</b></td><td class="small muted">${s.holiday ? (s.eve ? T('Holiday eves', 'Helligdagsaftener') + ' ' + s.from + '–' + s.to : T('Public holidays (all day)', 'Helligdager (hele dagen)')) : s.days.length === 7 ? T('Every day', 'Hver dag') + ' ' + s.from + '–' + s.to : s.days.map((d) => new Date(2024, 0, 7 + d).toLocaleDateString(App.i18n.locale(), { weekday: 'short' })).join(', ') + ' ' + s.from + '–' + s.to}</td>
            <td class="num"><div class="row nowrap"><label class="sr-only" for="sup${i}">${esc(L(s.label))}</label><input id="sup${i}" class="input input-sm input-num" type="number" step="${s.pct ? 5 : 1}" min="0" name="sup_${i}" value="${s.pct || s.nokPerHour || 0}"><span class="small muted">${s.pct ? T('% of wage', '% av lønn') : 'kr/' + T('h', 't')}</span></div></td>
            ${!api.people.usesPositions() ? '' : `<td>${s.holiday ? '<span class="small muted">—</span>' : `<div class="row">${pos.map((p) => `<label class="opt small"><input type="checkbox" name="sg_${i}" value="${p.id}" ${(s.groups || []).includes(p.id) ? 'checked' : ''}><span>${esc(L(p.name))}</span></label>`).join('')}</div>`}</td>`}</tr>`).join('')}</tbody></table></div>
          <p class="small muted">${api.people.usesPositions() ? T('No position ticked = applies to everyone. ', 'Ingen stilling krysset av = gjelder alle. ') : ''}${T('On public holidays the holiday supplement replaces evening/weekend supplements.', 'På helligdager erstatter helligdagstillegget kvelds-/helgetillegg.')}</p></section>
        <section class="card"><h2 class="h3">${ic('calendar', 18)} ${T('Public holidays', 'Helligdager')} ${year} · ${esc(w.holidayCountry || 'NO')}</h2>
          <div class="hol-list">${W.holidays(year).map((h) => `<span class="${h.eve ? 'eve' : ''} ${h.date < W.today() ? 'past' : ''}"><b>${K.fmtDay(h.date, 'short')}</b> ${esc(L(h.name))}</span>`).join('')}</div></section>
        <div class="row"><button class="btn btn-primary">${T('Save rules', 'Lagre regler')}</button><button type="button" class="btn btn-ghost" data-action="resetPayrules">${T('Back to client defaults', 'Tilbake til standard')}</button></div>
      </form>
      <section class="card"><h2 class="h3">${ic('receipt', 18)} ${T('Till (POS) connection', 'Kassekobling')}</h2>
        <p class="small">${T('Daily sales can come straight from the till system, so actual labour % is always up to date.', 'Daglig salg kan komme rett fra kassesystemet, slik at faktisk lønnsprosent alltid er oppdatert.')}</p>
        <ul class="small"><li>${T('Manually: Labour & forecast → "Import sales (CSV)", one line per day: ', 'Manuelt: Lønn og prognose → «Importer salg (CSV)», én linje per dag: ')}<code>2026-11-05;34500</code></li>
        <li>${T('Automatically: the till (or an integration service) sends each day to', 'Automatisk: kassen (eller en integrasjonstjeneste) sender hver dag til')} <code>${esc(location.origin)}/api/pos/sales</code> ${T('with the secret key in the', 'med den hemmelige nøkkelen i')} <code>X-Crew-Pos-Key</code> ${T('header', 'headeren')}:<br><code>{"locationId":"loc-lokka","date":"2026-11-05","sales":34500}</code></li></ul>
        <p class="small ${App.sync && App.sync.pos ? 'green' : 'muted'}">${App.sync && App.sync.pos ? ic('check', 14) + ' ' + T('Till connection is switched on on the server.', 'Kassekobling er slått på på serveren.') : T('Switched off: set CREW_POS_KEY on the server (Render → Environment) to turn it on.', 'Av: sett CREW_POS_KEY på serveren (Render → Environment) for å slå den på.')}</p></section>
    </div>`;
  }
  Object.assign(App.actions, {
    resetPayrules() { const cur = Object.assign({}, App.store.db.tenantOverrides || {}); delete cur.workforce; api.settings.saveOverrides(cur); W.applyOverrides(null); re(T('Back to client defaults', 'Tilbake til standard')); },
  });
  Object.assign(App.forms, {
    savePayrules(data) {
      const w = App.tenant.workforce; const n = (k) => Number(data[k]);
      const wf = {
        laborTargetPct: n('laborTargetPct'), targetSplh: n('targetSplh'), minStaffPerHour: n('minStaffPerHour'),
        employerCost: Object.assign({}, w.employerCost, { holidayPayPct: n('holidayPayPct'), payrollTaxPct: n('payrollTaxPct') }),
        rounding: { minutes: n('roundMinutes'), mode: data.roundMode }, payFromShiftStart: !!data.payFromShiftStart,
        kiosk: Object.assign({}, w.kiosk, { allowUnscheduled: !!data.kioskUnscheduled }),
        overtime: { dailyHours: n('otDaily'), weeklyHours: n('otWeekly'), pct: n('otPct') },
        supplements: w.supplements.map((s, i) => { const v = n('sup_' + i); const x = Object.assign({}, s); if (s.pct) x.pct = v; else x.nokPerHour = v; if (!s.holiday && api.people.usesPositions()) x.groups = [].concat(data['sg_' + i] || []); return x; }),
      };
      const cur = Object.assign({}, App.store.db.tenantOverrides || {}, { workforce: wf });
      api.settings.saveOverrides(cur); W.applyOverrides(wf);
      re(T('Rules saved', 'Regler lagret'));
    },
  });

  // ================= PLANNING ASSISTANT (find cover at other restaurants) =================
  const pb = () => (app.ui.pb = app.ui.pb || { msgs: [], last: null, sel: {} });
  const shortLoc = (l) => (l ? l.name.replace(App.tenant.name + ' ', '') : '');
  App.views.planBotFab = () => `<button class="plan-fab" data-action="planBotOpen" aria-label="${T('Planning assistant', 'Planleggingsassistent')}">${ic('sparkle', 22)}<span>${T('Planning assistant', 'Planleggingsassistent')}</span></button>`;

  function resultCard(r) {
    const q = r.req; const need = q.count || 1;
    const sel = pb().sel;
    const when = `${K.fmtDay(q.date)} · ${q.start}–${q.end}`;
    const person = (c, checked) => `<label class="pb-person ${checked ? 'on' : ''}"><input type="checkbox" data-change="pbPick" value="${c.user.id}" ${checked ? 'checked' : ''}>
      ${K.avatar(c.user, 34)}<span><b>${esc(c.user.name)}</b><span class="small muted">${esc(L(c.user.title) || '')} · ${Math.round(c.hoursWeek)}/${c.user.contractHours || '—'} ${T('h this week', 't denne uka')}</span>
      ${c.notes.map((n) => `<span class="small pb-note">${ic('clock', 12)} ${esc(L(n))}</span>`).join('')}</span></label>`;
    const excluded = (list) => list.length ? `<details class="pb-excl"><summary class="small">${T('Not possible', 'Ikke mulig')} (${list.length})</summary>${list.map((c) => `<div class="small"><b>${esc(c.user.name)}</b> — <span class="muted">${c.reasons.map((x) => esc(L(x))).join(' · ')}</span></div>`).join('')}</details>` : '';
    let firstPicks = need;
    const blocks = r.searched.map((s) => {
      const list = s.candidates.map((c) => { const on = sel[c.user.id] != null ? sel[c.user.id] : firstPicks-- > 0; sel[c.user.id] = on; return person(c, on); }).join('');
      return `<div class="pb-loc"><div class="row-between"><b>${ic('pin', 14)} ${esc(shortLoc(s.loc))}</b><span class="small muted">${s.km != null ? s.km.toFixed(1) + ' km' : ''}</span></div>
        ${s.candidates.length ? `<p class="small">${T(s.candidates.length + ' can cover it:', s.candidates.length + ' kan dekke:')}</p>${list}` : `<p class="small muted">${T('Nobody here can take it.', 'Ingen her kan ta den.')}</p>`}${excluded(s.excluded)}</div>`;
    }).join('');
    const ownBlocked = r.own.excluded.filter((c) => c.reasons.some((x) => /Sunday|søndag/i.test(L(x))));
    const picked = Object.keys(sel).filter((k) => sel[k]).length;
    return `<div class="pb-card">
      <p><b>${esc(shortLoc(r.target))}</b> · ${esc(when)} · ${T('need', 'trenger')} <b>${need}</b></p>
      ${r.own.candidates.length ? `<div class="notice notice-green small">${ic('user', 14)} <span>${T('In your own team ' + r.own.candidates.length + ' could still take it: ', 'I ditt eget team kan ' + r.own.candidates.length + ' fortsatt ta den: ')}${r.own.candidates.slice(0, 4).map((c) => esc(c.user.name.split(' ')[0])).join(', ')}</span></div>` : ''}
      ${ownBlocked.length ? `<p class="small muted">${ic('alert', 12)} ${T('Blocked by the Sunday rule in your team: ', 'Stoppet av søndagsregelen i ditt team: ')}${ownBlocked.map((c) => esc(c.user.name.split(' ')[0])).join(', ')}</p>` : ''}
      ${blocks}
      <p class="small muted">${T('Checked: no shift at that time, day-by-day availability, leave, 11 h rest, contract hours and max', 'Sjekket: ingen vakt da, tilgjengelighet dag for dag, fravær, 11 t hvile, avtalte timer og maks')} ${App.tenant.workforce.maxConsecutiveSundays || '—'} ${T('Sundays in a row.', 'søndager på rad.')}</p>
      ${r.searched.some((s) => s.candidates.length) ? `<div class="row"><button class="btn btn-primary btn-sm" data-action="pbOffer" ${picked ? '' : 'disabled'}>${ic('arrow', 15)} ${T('Offer the shift to the selected', 'Tilby vakten til de valgte')} (${picked})</button></div>` : ''}
    </div>`;
  }

  function botHtml() {
    const s = pb();
    const days = Array.from({ length: 14 }, (_, i) => W.addDays(W.today(), i));
    const locsOpts = api.catalog.locations().filter((l) => App.store.db.users.some((u) => u.locationId === l.id && (u.role === 'staff' || u.role === 'admin')));
    app.ui.afterRender = null;
    setTimeout(() => { const el = document.getElementById('pbLog'); if (el) el.scrollTop = el.scrollHeight; const i = document.getElementById('pbInput'); if (i && !('ontouchstart' in window)) i.focus(); }, 30);
    return `${K.sheetHead(T('Planning assistant', 'Planleggingsassistent'), T('Find people from your other restaurants to cover a shift — with all the rules checked.', 'Finn folk fra de andre restaurantene til å dekke en vakt — med alle regler sjekket.'))}
      <div class="pb-log" id="pbLog">
        ${s.msgs.length ? '' : `<div class="pb-hello">${ic('sparkle', 22)}<p>${T('Ask in your own words. For example:', 'Spør med dine egne ord. For eksempel:')}</p>
          <div class="chips wrap">${[T('How is Løkka for Sunday? At Frogner I need 2 people in the evening', 'Hvordan ser Løkka ut søndag? På Frogner trenger jeg 2 personer på kvelden'), T('Who can cover Saturday 16–23:30?', 'Hvem kan dekke lørdag 16–23:30?'), T('I need 1 person tomorrow in the morning', 'Jeg trenger 1 person i morgen formiddag')].map((x) => `<button class="chip" data-action="pbAsk" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`}
        ${s.msgs.map((m) => m.role === 'user' ? `<div class="msg user">${esc(m.text)}</div>` : `<div class="msg bot pb-bot">${m.html}</div>`).join('')}
      </div>
      <form class="pb-form" data-form="pbAsk"><label class="sr-only" for="pbInput">${T('Question', 'Spørsmål')}</label><input id="pbInput" class="input" name="q" autocomplete="off" placeholder="${T('e.g. At Frogner I need 2 people on Sunday evening', 'f.eks. På Frogner trenger jeg 2 personer søndag kveld')}"><button class="btn btn-primary" aria-label="${T('Ask', 'Spør')}">${ic('arrow', 18)}</button></form>
      <details class="pb-manual"><summary class="small">${T('Or fill it in', 'Eller fyll inn')}</summary>
        <form class="pb-grid" data-form="pbManual">
          <label><span class="small muted">${T('Restaurant that needs people', 'Restaurant som trenger folk')}</span><select class="input input-sm" name="targetLoc">${locsOpts.map((l) => `<option value="${l.id}" ${l.id === loc() ? 'selected' : ''}>${esc(shortLoc(l))}</option>`).join('')}</select></label>
          <label><span class="small muted">${T('Look in', 'Søk i')}</span><select class="input input-sm" name="sourceLoc"><option value="">${T('Nearest restaurants', 'Nærmeste restauranter')}</option>${locsOpts.map((l) => `<option value="${l.id}">${esc(shortLoc(l))}</option>`).join('')}</select></label>
          <label><span class="small muted">${T('Day', 'Dag')}</span><select class="input input-sm" name="date">${days.map((d) => `<option value="${d}" ${W.weekday(d) === 0 && d === days.find((x) => W.weekday(x) === 0) ? 'selected' : ''}>${K.fmtDay(d, 'short')}</option>`).join('')}</select></label>
          <label><span class="small muted">${T('From', 'Fra')}</span><input class="input input-sm" type="time" name="start" value="16:00"></label>
          <label><span class="small muted">${T('To', 'Til')}</span><input class="input input-sm" type="time" name="end" value="22:30"></label>
          <label><span class="small muted">${T('People', 'Personer')}</span><input class="input input-sm input-num" type="number" name="count" value="2" min="1" max="10"></label>
          <button class="btn btn-dark btn-sm">${ic('search', 15)} ${T('Find cover', 'Finn dekning')}</button></form></details>`;
  }
  const openBot = () => app.modal(botHtml(), 'sheet-chat plan-bot');

  function answer(q) {
    const s = pb();
    if (!q.date) return `<p>${T('Which day do you need cover?', 'Hvilken dag trenger du dekning?')}</p><div class="chips wrap">${Array.from({ length: 7 }, (_, i) => W.addDays(W.today(), i)).map((d) => `<button class="chip" data-action="pbDay" data-d="${d}">${K.fmtDay(d, 'short')}</button>`).join('')}</div>`;
    if (!q.start) { q.start = '16:00'; q.end = W.weekday(q.date) === 5 || W.weekday(q.date) === 6 ? '23:30' : '22:30'; q.assumed = true; }
    const r = api.cover.find(q);
    s.last = r; s.sel = {};
    return (q.assumed ? `<p class="small muted">${T('No time given — I used the evening shift ', 'Ingen tid oppgitt — jeg brukte kveldsvakten ')}${q.start}–${q.end}. ${T('Write e.g. "11–17" to change it.', 'Skriv f.eks. «11–17» for å endre.')}</p>` : '') + resultCard(r);
  }
  function ask(text) {
    const s = pb();
    s.msgs.push({ role: 'user', text });
    const q = api.cover.parse(text, { targetLoc: loc() });
    s.pending = q;
    s.msgs.push({ role: 'bot', html: answer(q) });
    openBot();
  }
  function offerSheet() {
    const s = pb(); const r = s.last; if (!r) return '';
    const ids = Object.keys(s.sel).filter((k) => s.sel[k]); const q = r.req;
    const me = api.auth.me(); const target = shortLoc(r.target);
    const msg = T(`Hi {name}! We need help at ${App.tenant.name} ${target} on ${K.fmtDay(q.date)}, ${q.start}–${q.end}. According to your availability you are free then. Would you like the shift? Tap "Request shift" in Schedule → Open shifts. Thanks! — ${me.name.split(' ')[0]}`,
      `Hei {name}! Vi trenger hjelp på ${App.tenant.name} ${target} ${K.fmtDay(q.date)}, ${q.start}–${q.end}. Ifølge tilgjengeligheten din er du ledig da. Vil du ta vakten? Trykk «Be om vakten» i Vakter → Ledige vakter. Takk! — ${me.name.split(' ')[0]}`);
    const people = ids.map((id) => api.people.get(id)).filter(Boolean);
    const mgrs = [...new Set(people.map((p) => p.locationId))].map((lid) => App.store.db.users.filter((u) => u.role === 'admin' && u.locationId === lid && u.id !== me.id)).flat();
    return `<form data-form="pbSend" class="admin-sheet">${K.sheetHead(T('Offer the shift', 'Tilby vakten'), `${esc(target)} · ${esc(K.fmtDay(q.date))} · ${q.start}–${q.end}`)}
      <div class="stack">
        <div class="row">${people.map((p) => `<span class="pb-chip">${K.avatar(p, 24)} ${esc(p.name)}</span>`).join('')}</div>
        <label class="field-label" for="pbMsg">${T('Direct message ({name} is replaced by each first name)', 'Direktemelding ({name} byttes med hvert fornavn)')}</label>
        <textarea id="pbMsg" class="input" name="message" rows="5">${esc(msg)}</textarea>
        <label class="opt"><input type="checkbox" name="notifyManagers" checked><span><b>${T('Tell their manager', 'Gi beskjed til lederen deres')}</b>${mgrs.length ? ' — ' + mgrs.map((m) => esc(m.name)).join(', ') : ''}<br><span class="small muted">${T('Notification + direct message so they know their staff may work at your restaurant.', 'Varsel + direktemelding så de vet at deres ansatte kan jobbe hos deg.')}</span></span></label>
        <p class="small muted">${ic('plus', 13)} ${T(`Creates ${q.count || 1} open shift(s) at ${target} that only these people (and your own team) can request. You approve as usual.`, `Lager ${q.count || 1} ledig(e) vakt(er) på ${target} som bare disse (og ditt eget team) kan be om. Du godkjenner som vanlig.`)}</p>
        <div class="row"><button class="btn btn-primary btn-grow">${ic('arrow', 16)} ${T('Send offer', 'Send tilbud')}</button><button type="button" class="btn btn-ghost" data-action="planBotOpen">${T('Back', 'Tilbake')}</button></div>
      </div></form>`;
  }

  Object.assign(App.actions, {
    planBotOpen() { openBot(); },
    pbAsk(d) { ask(d.q); },
    pbDay(d) { const s = pb(); const q = Object.assign({}, s.pending || {}, { date: d.d }); s.pending = q; s.msgs.push({ role: 'user', text: K.fmtDay(d.d, 'short') }); s.msgs.push({ role: 'bot', html: answer(q) }); openBot(); },
    pbOffer() { app.modal(offerSheet(), 'plan-bot'); },
  });
  Object.assign(App.changes, { pbPick(el) { pb().sel[el.value] = el.checked; el.closest('.pb-person').classList.toggle('on', el.checked); const n = Object.values(pb().sel).filter(Boolean).length; const b = document.querySelector('[data-action="pbOffer"]'); if (b) { b.disabled = !n; b.lastChild.textContent = ` ${T('Offer the shift to the selected', 'Tilby vakten til de valgte')} (${n})`; } } });
  Object.assign(App.forms, {
    pbAsk(data) { if ((data.q || '').trim()) ask(data.q.trim()); },
    pbManual(data) {
      const s = pb(); const q = { targetLoc: data.targetLoc, sourceLoc: data.sourceLoc || null, date: data.date, start: data.start, end: data.end, count: Number(data.count) || 1 };
      s.msgs.push({ role: 'user', text: `${shortLoc(api.catalog.location(q.targetLoc))} · ${K.fmtDay(q.date, 'short')} ${q.start}–${q.end} · ${q.count}` });
      s.pending = q; s.msgs.push({ role: 'bot', html: answer(q) }); openBot();
    },
    pbSend(data) {
      const s = pb(); const q = s.last.req; const ids = Object.keys(s.sel).filter((k) => s.sel[k]);
      const r = api.cover.offer({ targetLoc: q.targetLoc, date: q.date, start: q.start, end: q.end, count: q.count || ids.length, userIds: ids, message: data.message, notifyManagers: !!data.notifyManagers });
      const names = ids.map((id) => api.people.get(id).name.split(' ')[0]).join(', ');
      s.msgs.push({ role: 'bot', html: `<div class="notice notice-green small">${ic('check', 16)} <span><b>${T('Done.', 'Ferdig.')}</b> ${T(`Offer sent to ${names}. ${r.shifts.length} open shift(s) created at ${shortLoc(api.catalog.location(q.targetLoc))}`, `Tilbud sendt til ${names}. ${r.shifts.length} ledig(e) vakt(er) laget på ${shortLoc(api.catalog.location(q.targetLoc))}`)}${data.notifyManagers ? T(' and their manager has been told.', ' og lederen deres har fått beskjed.') : '.'} ${T('You will get a notification when someone requests it.', 'Du får varsel når noen ber om den.')}</span></div>` });
      s.last = null; s.sel = {}; openBot(); app.render();
    },
  });

  // ---------- workforce overrides (shared by phone and server) ----------
  // (defined in planning service as W.applyOverrides)

  const R = app.route;
  R('/kiosk', 'kiosk', kiosk);
  R('/staff/shifts/hq', 'staff', guard(hq, 'admin'));
  R('/admin/payrules', 'admin', guard(payrules, 'admin'));
})();
