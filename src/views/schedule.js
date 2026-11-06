/*
 * SCHEDULE area (workforce management): my shifts, team rota (week + day timeline),
 * time clock, open shifts, swaps & handovers, leave, availability, hours & pay,
 * manager approvals and payroll export.
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
  const person = (id) => api.people.get(id);
  const posName = (id) => L(api.people.position(id).name);
  const posDot = (id) => App.views.posDot(id);
  const head = (title, sub, right) => `<header class="staff-head"><div><h1 class="h1">${title}</h1>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>${right || ''}</header>`;
  const C = () => App.tenant.workforce;

  function shiftCard(s, opts) {
    const o = opts || {};
    const mates = api.people.workingOn(s.locationId, s.date).filter((x) => x.id !== s.id && x.userId).map((x) => person(x.userId));
    const req = api.requests.all().find((r) => (r.shiftId === s.id || r.targetShiftId === s.id) && ['open', 'pending_colleague', 'pending_manager'].includes(r.status));
    const now = new Date(); const live = W.shiftStart(s) <= now && W.shiftEnd(s) > now;
    return `<button class="shift-card ${live ? 'live' : ''}" style="--c:${api.people.position(s.positionId).color}" data-action="openShift" data-id="${s.id}">
      ${K.dateTile(s.date)}
      <div class="shift-main"><b>${s.start} – ${s.end}</b><span class="small muted">${posDot(s.positionId)} ${esc(posName(s.positionId))} · ${W.fmtH(W.shiftHours(s))}${s.breakMin ? ' · ' + s.breakMin + ' min ' + T('break', 'pause') : ''}</span>
        ${o.showLoc ? `<span class="small muted">${ic('location', 13)} ${esc((api.catalog.location(s.locationId) || {}).name)}</span>` : ''}
        ${req ? `<span class="badge badge-amber">${ic('swap', 12)} ${reqLabel(req)}</span>` : ''}${live ? `<span class="badge badge-green">● ${T('Now', 'Nå')}</span>` : ''}${s.note ? `<span class="small">📝 ${esc(s.note)}</span>` : ''}</div>
      <div class="shift-side">${K.avatarStack(mates, 4)}<span class="small muted">${K.relDay(s.date)}</span></div></button>`;
  }
  function reqLabel(r) {
    const map = { open: T('Offered to colleagues', 'Tilbudt kolleger'), pending_colleague: T('Waiting for colleague', 'Venter på kollega'), pending_manager: T('Waiting for manager', 'Venter på leder'),
      approved: T('Approved', 'Godkjent'), rejected: T('Rejected', 'Avslått'), declined: T('Declined', 'Avslått'), cancelled: T('Cancelled', 'Avbrutt') };
    return map[r.status] || r.status;
  }
  const reqBadge = (r) => `<span class="badge ${r.status === 'approved' ? 'badge-green' : ['rejected', 'declined'].includes(r.status) ? 'badge-red' : r.status === 'cancelled' ? 'badge-gray' : 'badge-amber'}">${reqLabel(r)}</span>`;
  const typeLabel = (t) => ({ swap: T('Swap', 'Bytte'), handover: T('Give away', 'Gi bort'), claim: T('Open shift', 'Ledig vakt') }[t]);

  // ================= MY SHIFTS =================
  function myShifts() {
    const today = W.today(), mon = W.monday(today);
    const week = api.shifts.mine(mon, W.addDays(mon, 6));
    const hours = week.reduce((h, s) => h + W.shiftHours(s), 0);
    const pay = week.reduce((p, s) => p + api.shifts.cost(s).total, 0);
    const upcoming = api.shifts.mine(today).filter((s) => W.shiftEnd(s) > new Date());
    const past = api.shifts.mine(W.addDays(today, -14), W.addDays(today, -1)).reverse();
    const byWeek = {};
    upcoming.forEach((s) => { const k = W.monday(s.date); (byWeek[k] = byWeek[k] || []).push(s); });
    const u = api.auth.me();
    const leave = api.leave.mine().filter((l) => l.status === 'approved' && l.to >= today).slice(0, 2);
    return `<div class="page-w">
      ${head(T('My shifts', 'Mine vakter'), T('Your published shifts. Tap a shift to see who you work with, swap it or give it away.', 'Dine publiserte vakter. Trykk på en vakt for å se hvem du jobber med, bytte eller gi den bort.'),
        `<div class="row"><button class="btn btn-ghost btn-sm" data-action="exportIcs">${ic('download', 16)} ${T('Add to calendar', 'Legg til i kalender')}</button></div>`)}
      ${K.mod('timeclock') ? App.views.clockCard() : ''}
      <div class="kpis">
        <div class="kpi"><span class="small muted">${T('This week', 'Denne uka')} (${T('wk', 'uke')} ${W.isoWeek(today)})</span><b>${W.fmtH(hours)}</b><span class="small muted">${T('of', 'av')} ${u.contractHours || '—'} ${T('h contract', 't avtalt')}</span></div>
        <div class="kpi"><span class="small muted">${T('Shifts this week', 'Vakter denne uka')}</span><b>${week.length}</b></div>
        <div class="kpi"><span class="small muted">${T('Estimated pay this week', 'Estimert lønn denne uka')}</span><b>${U.nok(pay)}</b><span class="small muted">${T('before tax, incl. supplements', 'før skatt, inkl. tillegg')}</span></div>
        <div class="kpi"><span class="small muted">${T('Holiday left', 'Ferie igjen')}</span><b>${api.leave.balance().left} ${T('days', 'dager')}</b></div>
      </div>
      ${leave.map((l) => `<div class="notice notice-green small">${ic('beach', 18)} <span>${T('Approved leave', 'Godkjent fravær')}: <b>${K.fmtDay(l.from, 'short')} – ${K.fmtDay(l.to, 'short')}</b></span></div>`).join('')}
      ${Object.keys(byWeek).length ? Object.keys(byWeek).sort().map((k) => `<h2 class="h3">${T('Week', 'Uke')} ${W.isoWeek(k)} <span class="small muted">${K.fmtDay(k, 'short')} – ${K.fmtDay(W.addDays(k, 6), 'short')} · ${W.fmtH(byWeek[k].reduce((h, s) => h + W.shiftHours(s), 0))}</span></h2>
        <div class="shift-list">${byWeek[k].map((s) => shiftCard(s)).join('')}</div>`).join('')
        : K.empty('calendar', T('No upcoming shifts', 'Ingen kommende vakter'), T('Pick up an open shift or check the rota.', 'Ta en ledig vakt eller sjekk vaktplanen.'), `<a class="btn btn-primary btn-sm" href="#/staff/shifts/open">${T('See open shifts', 'Se ledige vakter')}</a>`)}
      ${past.length ? `<details class="past"><summary>${T('Last 14 days', 'Siste 14 dager')} (${past.length})</summary><div class="shift-list">${past.map((s) => shiftCard(s)).join('')}</div></details>` : ''}
    </div>`;
  }

  // Shift detail sheet (everyone) — own future shift: swap / give away
  function shiftSheet(s) {
    const u = api.auth.me();
    const mine = s.userId === u.id;
    const future = W.shiftStart(s) > new Date();
    const mates = api.people.workingOn(s.locationId, s.date).filter((x) => x.id !== s.id);
    const pending = api.requests.all().find((r) => (r.shiftId === s.id || r.targetShiftId === s.id) && ['open', 'pending_colleague', 'pending_manager'].includes(r.status));
    const colleagues = api.people.team(s.locationId).filter((p) => p.id !== u.id && (p.positions || []).includes(s.positionId));
    const swapTargets = api.shifts.forRange(s.locationId, W.today(), W.addDays(W.today(), 21)).filter((x) => x.userId && x.userId !== u.id && x.published && x.date !== s.date && W.shiftStart(x) > new Date() && (u.positions || []).includes(x.positionId) && (person(x.userId).positions || []).includes(s.positionId))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).slice(0, 25);
    const cost = api.shifts.cost(s);
    return `${K.sheetHead(`${K.fmtDay(s.date)}`, `${s.start}–${s.end} · ${esc(posName(s.positionId))} · ${esc((api.catalog.location(s.locationId) || {}).name)}`)}
      <div class="sheet-body stack">
        <div class="facts-row"><div><span class="small muted">${T('Hours', 'Timer')}</span><b>${W.fmtH(W.shiftHours(s))}</b></div><div><span class="small muted">${T('Break', 'Pause')}</span><b>${s.breakMin || 0} min</b></div>
          ${mine || isMgr() ? `<div><span class="small muted">${T('Est. pay', 'Est. lønn')}</span><b>${U.nok(cost.total)}</b></div>` : ''}${cost.supplementNok && (mine || isMgr()) ? `<div><span class="small muted">${T('Supplements', 'Tillegg')}</span><b>${U.nok(cost.supplementNok)}</b></div>` : ''}</div>
        ${s.userId && !mine ? `<div class="row">${K.avatar(person(s.userId), 32)}<b>${esc(person(s.userId).name)}</b></div>` : ''}
        ${s.note ? `<div class="notice notice-ink small">📝 ${esc(s.note)}</div>` : ''}
        <div><p class="eyebrow">${T('Working that day', 'På jobb den dagen')}</p>${mates.length ? `<ul class="who sm">${mates.map((x) => { const p = x.userId ? person(x.userId) : null; return `<li>${K.avatar(p, 30)}<div><b>${p ? esc(p.name) : T('Open shift', 'Ledig vakt')}</b><span class="small muted">${posDot(x.positionId)} ${esc(posName(x.positionId))}</span></div><span class="small muted">${x.start}–${x.end}</span></li>`; }).join('')}</ul>` : `<p class="small muted">—</p>`}</div>
        ${pending ? `<div class="notice notice-amber small">${ic('swap', 16)} <span>${typeLabel(pending.type)}: ${reqLabel(pending)}</span></div>` : ''}
        ${mine && future && !pending && K.mod('swaps') ? `<form data-form="shiftChange" class="card inset stack">
          <input type="hidden" name="shiftId" value="${s.id}">
          <h3 class="h3">${ic('swap', 18)} ${T('Swap or give away', 'Bytt eller gi bort')}</h3>
          <div class="seg seg-sm" role="radiogroup">
            <label><input type="radio" name="mode" value="anyone" checked><span>${T('Offer to anyone', 'Tilby alle')}</span></label>
            <label><input type="radio" name="mode" value="person"><span>${T('Give to…', 'Gi til…')}</span></label>
            <label><input type="radio" name="mode" value="swap"><span>${T('Swap with…', 'Bytt med…')}</span></label>
          </div>
          <select class="input" name="toId"><option value="">${T('Colleague (for "Give to")', 'Kollega (for «Gi til»)')}</option>${colleagues.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
          <select class="input" name="targetShiftId"><option value="">${T('Their shift (for "Swap with")', 'Deres vakt (for «Bytt med»)')}</option>${swapTargets.map((x) => `<option value="${x.id}">${esc(person(x.userId).name)} — ${K.fmtDay(x.date, 'short')} ${x.start}–${x.end}</option>`).join('')}</select>
          <input class="input" name="note" placeholder="${T('Message (optional)', 'Melding (valgfritt)')}">
          <button class="btn btn-primary btn-block">${T('Send request', 'Send forespørsel')}</button>
          <p class="small muted">${C().swapsNeedManagerApproval ? T('Your colleague accepts, then a manager approves. Until then the shift is still yours.', 'Kollegaen godtar, så godkjenner leder. Til da er vakten fortsatt din.') : ''}</p>
        </form>` : ''}
        ${!s.userId && future ? `<button class="btn btn-primary btn-block" data-action="claimShift" data-id="${s.id}">${ic('plusCircle', 18)} ${T('Request this shift', 'Be om denne vakten')}</button>` : ''}
        ${isMgr() ? `<button class="btn btn-ghost btn-block" data-action="editShift" data-id="${s.id}">${ic('edit', 16)} ${T('Edit shift', 'Rediger vakt')}</button>` : ''}
      </div>`;
  }

  // ================= ROTA =================
  function rotaWeek() { return app.ui.rotaWeek || W.monday(W.today()); }
  function rota() {
    const l = loc(), mon = rotaWeek(), sun = W.addDays(mon, 6);
    const view = app.ui.rotaView || (window.innerWidth < 760 ? 'day' : 'week');
    const posF = app.ui.rotaPos || '';
    const days = Array.from({ length: 7 }, (_, i) => W.addDays(mon, i));
    const all = api.shifts.forRange(l, mon, sun).filter((s) => !posF || s.positionId === posF);
    const team = api.people.team(l).filter((p) => !posF || (p.positions || []).includes(posF));
    const leave = api.leave.forRange(mon, sun);
    const stats = api.shifts.weekStats(l, mon);
    const drafts = isMgr() ? api.shifts.drafts(l, mon) : 0;
    const today = W.today();
    const weekHours = stats.reduce((s, d) => s + d.hours, 0), weekCost = stats.reduce((s, d) => s + d.cost, 0), weekRev = stats.reduce((s, d) => s + d.revenue, 0);
    const toolbar = `<div class="rota-bar">
      <div class="row"><button class="icon-btn bordered" data-action="rotaNav" data-d="-7" aria-label="${T('Previous week', 'Forrige uke')}">${ic('back', 18)}</button>
        <div class="rota-title"><b>${T('Week', 'Uke')} ${W.isoWeek(mon)}</b><span class="small muted">${K.fmtDay(mon, 'short')} – ${K.fmtDay(sun, 'short')}</span></div>
        <button class="icon-btn bordered" data-action="rotaNav" data-d="7" aria-label="${T('Next week', 'Neste uke')}">${ic('arrow', 18)}</button>
        ${mon !== W.monday(today) ? `<button class="btn btn-ghost btn-sm" data-action="rotaNav" data-d="0">${T('This week', 'Denne uka')}</button>` : ''}</div>
      <div class="row">
        <div class="seg seg-sm"><button class="${view === 'week' ? 'on' : ''}" data-action="rotaView" data-v="week">${ic('week', 16)} ${T('Week', 'Uke')}</button><button class="${view === 'day' ? 'on' : ''}" data-action="rotaView" data-v="day">${ic('list', 16)} ${T('Day', 'Dag')}</button></div>
        <select class="input input-sm" data-change="rotaPos"><option value="">${T('All positions', 'Alle stillinger')}</option>${api.people.positions().map((p) => `<option value="${p.id}" ${p.id === posF ? 'selected' : ''}>${esc(L(p.name))}</option>`).join('')}</select>
        ${isMgr() ? `<button class="btn btn-ghost btn-sm" data-action="rotaAuto">${ic('sparkle', 16)} ${T('Auto-plan', 'Autoplan')}</button>
          <button class="btn btn-ghost btn-sm" data-action="rotaTemplates">${ic('doc', 16)} ${T('Templates', 'Maler')}</button>
          <button class="btn btn-ghost btn-sm" data-action="copyWeek">${ic('copy', 16)} ${T('Copy last week', 'Kopier forrige uke')}</button>
          <button class="btn btn-ghost btn-sm" data-action="newShift" data-date="${mon >= W.monday(today) ? (mon === W.monday(today) ? today : mon) : mon}">${ic('plus', 16)} ${T('Shift', 'Vakt')}</button>
          <button class="btn btn-primary btn-sm ${drafts ? '' : 'disabled'}" data-action="publishWeek">${ic('send', 16)} ${T('Publish', 'Publiser')}${drafts ? ` (${drafts})` : ''}</button>` : ''}
      </div></div>`;
    const summary = isMgr() ? `<div class="kpis sm">
        <div class="kpi"><span class="small muted">${T('Planned hours', 'Planlagte timer')}</span><b>${W.fmtH(weekHours)}</b></div>
        <div class="kpi"><span class="small muted">${T('Labour cost', 'Lønnskostnad')}</span><b>${U.nok(weekCost)}</b></div>
        <div class="kpi ${weekCost / weekRev * 100 > C().laborTargetPct ? 'warn' : 'ok'}"><span class="small muted">${T('Labour % of forecast sales', 'Lønn % av prognose')}</span><b>${(weekCost / weekRev * 100).toFixed(1)} %</b><span class="small muted">${T('target', 'mål')} ${C().laborTargetPct} %</span></div>
        <div class="kpi"><span class="small muted">${T('Open shifts', 'Ledige vakter')}</span><b>${all.filter((s) => !s.userId).length}</b></div>
      </div>${drafts ? `<div class="notice notice-amber small">${ic('alert', 16)} <span>${T(drafts + ' draft shifts are only visible to managers until you publish.', drafts + ' utkast er bare synlige for ledere til du publiserer.')}</span></div>` : ''}` : '';
    const legend = `<div class="legend">${api.people.positions().map((p) => `<span>${posDot(p.id)} ${esc(L(p.name))}</span>`).join('')}<span><i class="leg-leave"></i> ${T('Leave', 'Fravær')}</span><span><i class="leg-unav"></i> ${T('Unavailable', 'Utilgjengelig')}</span><span><i class="leg-auto"></i> ${T('Auto-planned', 'Autoplanlagt')}</span><span><i class="leg-hol"></i> ${T('Public holiday', 'Helligdag')}</span>${isMgr() ? `<span><i class="leg-draft"></i> ${T('Draft', 'Utkast')}</span>` : ''}</div>`;
    return `<div class="page-w wide">
      ${head(T('Rota', 'Vaktplan'), esc((api.catalog.location(l) || {}).name) + (isMgr() ? ' · ' + T('Click an empty cell to add a shift.', 'Klikk på en tom celle for å legge til en vakt.') : ''))}
      ${toolbar}${summary}
      ${view === 'week' ? weekGrid(days, team, all, leave, stats) : dayTimeline(days, all, leave)}
      ${legend}
      ${isMgr() && view === 'week' ? `<p class="small muted">${ic('arrow', 13)} ${T('Drag a future shift to another person or day to move it. Hold Ctrl (⌘ on Mac) while dropping to copy it.', 'Dra en fremtidig vakt til en annen person eller dag for å flytte den. Hold Ctrl (⌘ på Mac) når du slipper for å kopiere.')}</p>` : ''}
    </div>`;
  }
  function chip(s, compact) {
    const p = api.people.position(s.positionId);
    const cf = isMgr() ? api.shifts.conflicts(s) : [];
    const mine = s.userId === (api.auth.me() || {}).id;
    return `<button class="rchip ${s.published ? '' : 'draft'} ${mine ? 'mine' : ''} ${s.userId ? '' : 'open'} ${s.auto ? 'auto' : ''}" style="--c:${p.color}" data-action="openShift" data-id="${s.id}" ${isMgr() && W.shiftStart(s) > new Date() ? `draggable="true" data-drag="${s.id}"` : ''} title="${esc(posName(s.positionId))}${cf.length ? ' · ⚠ ' + cf.map((c) => L(c.text)).join(', ') : ''}">
      <b>${s.start}–${s.end}</b>${compact ? '' : `<span>${esc(posName(s.positionId))}</span>`}${cf.length ? `<i class="cf">!</i>` : ''}</button>`;
  }
  function weekGrid(days, team, all, leave, stats) {
    const today = W.today();
    const avOf = (uid, d) => api.availability.forDate(uid, d);
    const unav = (uid, d) => avOf(uid, d).state === 'unavailable';
    const avHint = (uid, d) => { if (!isMgr()) return ''; const a = avOf(uid, d); if (a.state === 'partial' && a.ranges.length) return `<span class="av-hint" title="${esc(a.note || '')}">${ic('clock', 11)} ${a.ranges.map((r) => r.from.replace(':00', '') + '–' + r.to.replace(':00', '')).join(' · ')}</span>`; if (a.state === 'unavailable' && a.note) return `<span class="av-hint">${esc(a.note).slice(0, 28)}</span>`; return ''; };
    const open = all.filter((s) => !s.userId);
    const row = (p) => {
      const mine = all.filter((s) => s.userId === p.id);
      const h = mine.reduce((x, s) => x + W.shiftHours(s), 0);
      return `<div class="rg-row ${p.id === api.auth.me().id ? 'me' : ''}"><div class="rg-person">${K.avatar(p, 32)}<div><b>${esc(p.name)}</b><span class="small muted">${W.fmtH(h)}${p.contractHours ? ' / ' + p.contractHours : ''}</span></div></div>
        ${days.map((d) => { const ss = mine.filter((s) => s.date === d); const lv = leave.find((x) => x.userId === p.id && d >= x.from && d <= x.to); const un = !ss.length && unav(p.id, d);
          return `<div class="rg-cell ${d === today ? 'today' : ''} ${lv ? 'leave' : ''} ${un ? 'unav' : ''}" data-cell-date="${d}" data-cell-user="${p.id}" ${isMgr() && !ss.length ? `data-action="newShift" data-date="${d}" data-user="${p.id}"` : ''}>${!lv ? avHint(p.id, d) : ''}
            ${lv ? `<span class="lv-tag">${ic(lv.type === 'sick' ? 'medical' : 'beach', 13)} ${lv.type === 'sick' ? T('Sick', 'Syk') : T('Leave', 'Fravær')}</span>` : ''}${ss.map((s) => chip(s)).join('')}${isMgr() && !ss.length && !lv ? `<span class="rg-add">${ic('plus', 14)}</span>` : ''}</div>`; }).join('')}</div>`;
    };
    return `<div class="rota-scroll"><div class="rgrid">
      <div class="rg-row rg-head"><div class="rg-person"></div>${days.map((d, i) => `<div class="rg-dh ${d === today ? 'today' : ''} ${W.holiday(d) ? 'hol' : ''}" title="${W.holiday(d) ? esc(L(W.holiday(d).name)) : ''}"><b>${K.fmtDay(d, 'wd')}</b>${W.holiday(d) ? `<i class="hol-tag">${esc(L(W.holiday(d).name))}</i>` : ''}<span>${K.fmtDay(d, 'num')}. ${K.fmtDay(d, 'month')}</span><em>${W.fmtH(stats[i].hours)}${isMgr() ? ' · ' + Math.round(stats[i].pct) + '%' : ''}</em></div>`).join('')}</div>
      ${open.length || isMgr() ? `<div class="rg-row open-row"><div class="rg-person"><span class="av" style="--s:32px;--c:#ADB5BD">${ic('plusCircle', 16)}</span><div><b>${T('Open shifts', 'Ledige vakter')}</b><span class="small muted">${open.length}</span></div></div>
        ${days.map((d) => `<div class="rg-cell ${d === today ? 'today' : ''}" data-cell-date="${d}" data-cell-user="" ${isMgr() ? `data-action="newShift" data-date="${d}" data-user=""` : ''}>${open.filter((s) => s.date === d).map((s) => chip(s)).join('')}</div>`).join('')}</div>` : ''}
      ${team.map(row).join('')}
      ${isMgr() ? `<div class="rg-row rg-foot"><div class="rg-person small muted">${T('Cost / forecast', 'Kostnad / prognose')}</div>${stats.map((st) => `<div class="rg-cost"><b>${U.nok(st.cost)}</b><span class="small muted">${U.nok(st.revenue)}</span><span class="bar"><i style="width:${Math.min(100, st.pct / 50 * 100)}%;background:${st.pct > C().laborTargetPct ? 'var(--red)' : 'var(--green)'}"></i></span></div>`).join('')}</div>` : ''}
    </div></div>`;
  }
  function dayTimeline(days, all, leave) {
    const d = app.ui.rotaDay && days.includes(app.ui.rotaDay) ? app.ui.rotaDay : (days.includes(W.today()) ? W.today() : days[0]);
    const list = all.filter((s) => s.date === d).sort((a, b) => a.start.localeCompare(b.start) || a.positionId.localeCompare(b.positionId));
    const from = 9 * 60, to = 24 * 60, span = to - from;
    const pct = (m) => Math.max(0, Math.min(100, ((m - from) / span) * 100));
    const nowM = new Date().getHours() * 60 + new Date().getMinutes();
    const lv = leave.filter((x) => d >= x.from && d <= x.to);
    return `<div class="day-pick">${days.map((x) => `<button class="${x === d ? 'on' : ''} ${x === W.today() ? 'today' : ''}" data-action="rotaDay" data-d="${x}"><span>${K.fmtDay(x, 'wd')}</span><b>${K.fmtDay(x, 'num')}</b><i>${all.filter((s) => s.date === x).length}</i></button>`).join('')}</div>
      <div class="card tl-card">
        <div class="row-between"><h2 class="h3">${K.fmtDay(d)}</h2><span class="small muted">${list.length} ${T('shifts', 'vakter')} · ${W.fmtH(list.reduce((h, s) => h + W.shiftHours(s), 0))}</span></div>
        <div class="tl">
          <div class="tl-hours">${Array.from({ length: 16 }, (_, i) => `<span style="left:${pct((9 + i) * 60)}%">${String(9 + i).padStart(2, '0')}</span>`).join('')}</div>
          ${d === W.today() && nowM > from ? `<div class="tl-now" style="left:calc(150px + (100% - 150px) * ${pct(nowM) / 100})"></div>` : ''}
          ${list.map((s) => { const p = s.userId ? person(s.userId) : null; const a = W.toMin(s.start), b = W.toMin(s.end) <= a ? W.toMin(s.end) + 1440 : W.toMin(s.end); return `<div class="tl-row"><div class="tl-who">${K.avatar(p, 28)}<span>${p ? esc(p.name.split(' ')[0]) : T('Open', 'Ledig')}</span></div>
            <div class="tl-track"><button class="tl-bar ${s.published ? '' : 'draft'} ${p ? '' : 'open'}" style="left:${pct(a)}%;width:${pct(b) - pct(a)}%;--c:${api.people.position(s.positionId).color}" data-action="openShift" data-id="${s.id}"><b>${s.start}–${s.end}</b><span>${esc(posName(s.positionId))}</span></button></div></div>`; }).join('') || K.empty('calendar', T('No shifts this day', 'Ingen vakter denne dagen'))}
        </div>
        ${lv.length ? `<p class="small muted">${ic('beach', 14)} ${T('Away', 'Borte')}: ${lv.map((x) => esc(person(x.userId).name)).join(', ')}</p>` : ''}
        ${isMgr() ? `<button class="btn btn-ghost btn-sm" data-action="newShift" data-date="${d}">${ic('plus', 16)} ${T('Add shift', 'Legg til vakt')}</button>` : ''}
      </div>`;
  }

  function shiftEditor(s, preset) {
    const l = loc(); const p = preset || {};
    const isNew = !s;
    s = s || { locationId: l, userId: p.user || '', positionId: 'kitchen', date: p.date || W.today(), start: '16:00', end: '22:30', breakMin: 30, note: '' };
    const team = api.people.team(s.locationId);
    const cf = !isNew ? api.shifts.conflicts(s) : [];
    return `<form data-form="saveShift" class="admin-sheet">${K.sheetHead(isNew ? T('New shift', 'Ny vakt') : T('Edit shift', 'Rediger vakt'), esc((api.catalog.location(s.locationId) || {}).name))}
      <input type="hidden" name="id" value="${s.id || ''}"><input type="hidden" name="locationId" value="${s.locationId}">
      <p class="field-label">${T('Templates', 'Maler')}</p>
      <div class="chips wrap">${api.shifts.templates().map((tp) => `<button type="button" class="chip" data-action="applyTpl" data-pos="${tp.positionId}" data-start="${tp.start}" data-end="${tp.end}">${posDot(tp.positionId)} ${esc(L(tp.name))} <span class="muted">${tp.start}–${tp.end}</span></button>`).join('')}</div>
      <div class="grid-2">
        <div><label class="field-label">${T('Date', 'Dato')}</label><input class="input" type="date" name="date" value="${s.date}" required></div>
        <div><label class="field-label">${T('Position', 'Stilling')}</label><select class="input" name="positionId">${api.people.positions().map((x) => `<option value="${x.id}" ${x.id === s.positionId ? 'selected' : ''}>${esc(L(x.name))}</option>`).join('')}</select></div>
        <div><label class="field-label">${T('Start', 'Start')}</label><input class="input" type="time" name="start" value="${s.start}" required></div>
        <div><label class="field-label">${T('End', 'Slutt')}</label><input class="input" type="time" name="end" value="${s.end}" required></div>
        <div><label class="field-label">${T('Employee', 'Ansatt')}</label><select class="input" name="userId"><option value="">— ${T('Open shift (anyone can request)', 'Ledig vakt (alle kan be om den)')} —</option>${team.map((x) => `<option value="${x.id}" ${x.id === s.userId ? 'selected' : ''}>${esc(x.name)} · ${(x.positions || []).map((pp) => posName(pp)).join(', ')}</option>`).join('')}</select></div>
        <div><label class="field-label">${T('Unpaid break (min)', 'Ubetalt pause (min)')}</label><input class="input" type="number" name="breakMin" min="0" step="5" value="${s.breakMin || 0}"></div>
        <div class="full"><label class="field-label">${T('Note to employee', 'Notat til ansatt')}</label><input class="input" name="note" value="${esc(s.note || '')}"></div>
      </div>
      ${cf.map((c) => `<div class="notice notice-amber small">${ic('alert', 16)} <span>${esc(L(c.text))}</span></div>`).join('')}
      <p class="small muted">${T('Checks on save: double booking, leave, availability, 11 h rest and weekly hours.', 'Sjekkes ved lagring: dobbeltbooking, fravær, tilgjengelighet, 11 t hvile og ukentlige timer.')}</p>
      <div class="row"><button class="btn btn-primary btn-grow">${T('Save', 'Lagre')}</button>${isNew ? '' : `<button type="button" class="btn btn-ghost" data-action="deleteShift" data-id="${s.id}">${ic('trash', 16)}</button>`}</div>
    </form>`;
  }

  // ================= TIME CLOCK =================
  function clock() {
    const mon = W.monday(W.today());
    const list = api.time.punches({ from: W.addDays(mon, -7) });
    const active = api.time.active();
    return `<div class="page-w narrow">
      ${head(T('Time clock', 'Stemple'), T('Clock in when you arrive and out when you leave. Your hours go straight to your timesheet.', 'Stemple inn når du kommer og ut når du går. Timene går rett inn i timelisten din.'))}
      ${App.views.clockCard()}
      ${isMgr() ? `<div class="row"><button class="btn btn-dark btn-sm" data-action="kioskStart">${ic('phone', 16)} ${T('Turn this device into the store kiosk', 'Gjør denne enheten til butikkens kiosk')}</button><span class="small muted">${T('For a tablet at the entrance: everyone clocks in with their own PIN.', 'For et nettbrett ved inngangen: alle stempler med egen PIN-kode.')}</span></div>` : ''}
      <div class="notice notice-ink small">${ic('location', 16)} <span>${T('Location check: you are at', 'Stedssjekk: du er på')} <b>${esc((api.catalog.location(loc()) || {}).name)}</b> <span class="badge badge-demo">${T('simulated', 'simulert')}</span> · ${T('You can clock in up to', 'Du kan stemple inn inntil')} ${C().clockInEarlyMinutes} min ${T('before your shift.', 'før vakten.')}</span></div>
      ${active ? `<section class="card"><h2 class="h3">${T('Today', 'I dag')}</h2><ul class="tl-log"><li><span>${U.fmtTime(active.in)}</span>${T('Clocked in', 'Stemplet inn')}</li>${active.breaks.map((b) => `<li><span>${U.fmtTime(b.start)}</span>${T('Break started', 'Pause startet')}</li>${b.end ? `<li><span>${U.fmtTime(b.end)}</span>${T('Break ended', 'Pause avsluttet')}</li>` : ''}`).join('')}</ul></section>` : ''}
      <h2 class="h3">${T('Recent punches', 'Siste stemplinger')}</h2>
      ${punchTable(list.slice(0, 14), false)}
    </div>`;
  }
  function punchTable(list, mgr) {
    if (!list.length) return K.empty('clock', T('No punches yet', 'Ingen stemplinger ennå'));
    return `<div class="table-wrap"><table class="table punch-t"><thead><tr>${mgr ? `<th><input type="checkbox" data-change="selAllPunch" aria-label="all"></th><th>${T('Employee', 'Ansatt')}</th>` : ''}<th>${T('Date', 'Dato')}</th><th>${T('Planned', 'Planlagt')}</th><th>${T('Clocked', 'Stemplet')}</th><th class="num">${T('Hours', 'Timer')}</th><th class="num">${T('Supplements', 'Tillegg')}</th><th class="num">${T('Est. pay', 'Est. lønn')}</th><th>${T('Status', 'Status')}</th>${mgr ? '<th></th>' : ''}</tr></thead>
      <tbody>${list.map((p) => { const dv = api.time.deviation(p); const pay = api.time.pay(p); const late = dv.inMin > 5; const st = { approved: ['badge-green', T('Approved', 'Godkjent')], submitted: ['badge-amber', T('To approve', 'Til godkjenning')], open: ['badge-gray', T('Running', 'Pågår')], rejected: ['badge-red', T('Rejected', 'Avvist')] }[p.status] || ['badge-gray', p.status]; const u = person(p.userId);
        return `<tr>${mgr ? `<td>${p.status === 'submitted' ? `<input type="checkbox" class="psel" value="${p.id}">` : ''}</td><td><div class="row nowrap">${K.avatar(u, 26)}<span>${esc(u ? u.name : '')}</span></div></td>` : ''}
          <td class="nowrap">${K.fmtDay(p.date, 'short')}</td><td class="small muted nowrap">${dv.shift ? dv.shift.start + '–' + dv.shift.end : T('Unscheduled', 'Ikke planlagt')}</td>
          <td class="nowrap">${U.fmtTime(p.in)}–${p.out ? U.fmtTime(p.out) : '…'} ${late ? `<span class="badge badge-red" title="${esc(p.note || '')}">+${dv.inMin} min</span>` : ''}${p.edited ? ` <span class="badge badge-gray">${T('edited', 'endret')}</span>` : ''}</td>
          <td class="num">${W.fmtH(pay.hours)}</td><td class="num small">${pay.supplementNok ? U.nok(pay.supplementNok) : '—'}</td><td class="num"><b>${U.nok(pay.total)}</b></td><td><span class="badge ${st[0]}">${st[1]}</span></td>
          ${mgr ? `<td class="nowrap">${api.time.locked(p.locationId, p.date) ? ic('lock', 14) : p.status === 'submitted' ? `<button class="btn btn-sm btn-ghost" data-action="editPunch" data-id="${p.id}" title="${T('Edit', 'Rediger')}">${ic('edit', 14)}</button><button class="btn btn-sm btn-ghost" data-action="rejectPunch" data-id="${p.id}" title="${T('Reject', 'Avvis')}">${ic('x', 14)}</button>` : p.status === 'rejected' ? `<button class="btn btn-sm btn-ghost" data-action="reopenPunch" data-id="${p.id}">${T('Reopen', 'Gjenåpne')}</button>` : ''}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
  }

  // ================= OPEN SHIFTS =================
  function openShifts() {
    const u = api.auth.me();
    const list = api.shifts.open(loc());
    const myReq = api.requests.mine().filter((r) => r.type === 'claim' && r.status === 'pending_manager').map((r) => r.shiftId);
    return `<div class="page-w">
      ${head(T('Open shifts', 'Ledige vakter'), T('Shifts that still need someone. Request one — a manager confirms it.', 'Vakter som fortsatt mangler noen. Be om en — leder bekrefter.'), isMgr() ? `<button class="btn btn-primary btn-sm" data-action="newShift" data-date="${W.today()}" data-user="">${ic('plus', 16)} ${T('Post open shift', 'Legg ut ledig vakt')}</button>` : '')}
      ${list.length ? `<div class="open-grid">${list.map((s) => { const ok = (u.positions || []).includes(s.positionId); const req = myReq.includes(s.id); const cost = api.shifts.cost(Object.assign({}, s, { userId: u.id }));
        return `<div class="open-card" style="--c:${api.people.position(s.positionId).color}">
          <div class="row-between">${K.dateTile(s.date)}<span class="pos-chip" style="--c:${api.people.position(s.positionId).color}">${esc(posName(s.positionId))}</span></div>
          <b class="h2">${s.start} – ${s.end}</b><span class="small muted">${K.relDay(s.date)} · ${W.fmtH(W.shiftHours(s))} · ${T('≈', '≈')} ${U.nok(cost.total)}</span>
          ${req ? `<span class="badge badge-amber">${T('Requested — waiting for manager', 'Forespurt — venter på leder')}</span>` : ok ? `<button class="btn btn-primary btn-block" data-action="claimShift" data-id="${s.id}">${T('Request shift', 'Be om vakten')}</button>` : `<span class="small muted">${T('Requires', 'Krever')} ${esc(posName(s.positionId))}</span>`}
        </div>`; }).join('')}</div>` : K.empty('plusCircle', T('No open shifts right now', 'Ingen ledige vakter akkurat nå'), T('You will be notified when new ones are posted.', 'Du får varsel når nye legges ut.'))}
    </div>`;
  }

  // ================= SWAPS =================
  function swaps() {
    const u = api.auth.me();
    const incoming = api.requests.incoming();
    const market = api.requests.market();
    const mine = api.requests.mine().filter((r) => r.fromId === u.id || (r.toId === u.id && r.status !== 'pending_colleague'));
    const sh = (id) => api.shifts.get(id);
    const line = (s) => s ? `${posDot(s.positionId)} <b>${K.fmtDay(s.date, 'short')} ${s.start}–${s.end}</b> <span class="muted">${esc(posName(s.positionId))}</span>` : '—';
    const reqCard = (r, actions) => { const s = sh(r.shiftId), t2 = r.targetShiftId && sh(r.targetShiftId); const from = person(r.fromId), to = r.toId && person(r.toId);
      return `<div class="req-card"><div class="req-top">${K.avatar(from, 36)}<div><b>${esc(from.name)}</b> <span class="small muted">· ${typeLabel(r.type)} · ${K.timeAgo(r.createdAt)}</span>${r.note ? `<p class="small">“${esc(r.note)}”</p>` : ''}</div>${reqBadge(r)}</div>
        <div class="req-shifts"><div>${line(s)}</div>${t2 ? `<span class="req-arrow">${ic('swap', 18)}</span><div>${line(t2)} <span class="small muted">(${esc(person(t2.userId) ? person(t2.userId).name : '')})</span></div>` : to ? `<span class="req-arrow">${ic('arrow', 18)}</span><div>${K.avatar(to, 24)} ${esc(to.name)}</div>` : ''}</div>
        ${actions ? `<div class="row">${actions}</div>` : ''}</div>`; };
    return `<div class="page-w narrow">
      ${head(T('Swaps & handovers', 'Bytte og overtakelse'), T('Swap shifts with colleagues or give a shift away. Every change is approved by a manager.', 'Bytt vakter med kolleger eller gi bort en vakt. Alle endringer godkjennes av leder.'))}
      <div class="how3"><div>${ic('calendar', 20)}<span>${T('1. Tap your shift → "Swap or give away"', '1. Trykk på vakten → «Bytt eller gi bort»')}</span></div><div>${ic('users', 20)}<span>${T('2. Colleague accepts', '2. Kollega godtar')}</span></div><div>${ic('check', 20)}<span>${T('3. Manager approves', '3. Leder godkjenner')}</span></div></div>
      <h2 class="h3">${T('Requests for you', 'Forespørsler til deg')} ${incoming.length ? `<span class="nbadge">${incoming.length}</span>` : ''}</h2>
      ${incoming.length ? incoming.map((r) => reqCard(r, `<button class="btn btn-primary btn-sm" data-action="respondReq" data-id="${r.id}" data-ok="1">${ic('check', 16)} ${T('Accept', 'Godta')}</button><button class="btn btn-ghost btn-sm" data-action="respondReq" data-id="${r.id}" data-ok="0">${T('Decline', 'Avslå')}</button>`)).join('') : `<p class="small muted">${T('Nothing waiting for you.', 'Ingenting venter på deg.')}</p>`}
      <h2 class="h3">${T('Shifts colleagues want to give away', 'Vakter kolleger vil gi bort')}</h2>
      ${market.length ? market.map((r) => reqCard(r, `<button class="btn btn-dark btn-sm" data-action="takeReq" data-id="${r.id}">${ic('plusCircle', 16)} ${T('I\'ll take it', 'Jeg tar den')}</button>`)).join('') : `<p class="small muted">${T('No shifts on offer that match your positions.', 'Ingen vakter tilbys som passer dine stillinger.')}</p>`}
      <h2 class="h3">${T('Your requests', 'Dine forespørsler')}</h2>
      ${mine.length ? mine.map((r) => reqCard(r, r.fromId === u.id && ['open', 'pending_colleague', 'pending_manager'].includes(r.status) ? `<button class="btn btn-ghost btn-sm" data-action="cancelReq" data-id="${r.id}">${T('Cancel', 'Avbryt')}</button>` : '')).join('') : `<p class="small muted">${T('You have not sent any requests.', 'Du har ikke sendt noen forespørsler.')}</p>`}
    </div>`;
  }

  // ================= LEAVE =================
  const LT = () => ({ vacation: [T('Holiday', 'Ferie'), 'beach', '#0C8599'], sick: [T('Sick', 'Syk'), 'medical', '#C2255C'], timeoff: [T('Time off', 'Fri'), 'sun', '#F08C00'], other: [T('Other', 'Annet'), 'calendar', '#495057'] });
  function leave() {
    const b = api.leave.balance();
    const mine = api.leave.mine();
    const today = W.today();
    const team = api.leave.forRange(today, W.addDays(today, 45)).filter((l) => (person(l.userId) || {}).locationId === loc());
    const st = (l) => `<span class="badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-amber'}">${{ approved: T('Approved', 'Godkjent'), rejected: T('Declined', 'Avslått'), pending: T('Pending', 'Venter') }[l.status]}</span>`;
    return `<div class="page-w">
      ${head(T('Leave & absence', 'Fravær og ferie'), T('Apply for holiday, time off or report sick. Your manager gets notified.', 'Søk ferie, fri eller meld deg syk. Leder får varsel.'))}
      <div class="leave-top">
        <section class="card bal-card"><h2 class="h3">${ic('beach', 18)} ${T('Holiday', 'Ferie')} ${new Date().getFullYear()}</h2>
          <div class="bal-ring" style="--p:${Math.round(b.used / b.total * 100)};--q:${Math.round((b.used + b.pending) / b.total * 100)}"><div><b>${b.left}</b><span class="small">${T('days left', 'dager igjen')}</span></div></div>
          <ul class="facts-list"><li><span>${T('Entitlement', 'Rett')}</span><b>${b.total}</b></li><li><span>${T('Used / approved', 'Brukt / godkjent')}</span><b>${b.used}</b></li><li><span>${T('Pending', 'Venter')}</span><b>${b.pending}</b></li></ul>
          <p class="small muted">${T('Working days (Mon–Fri). Rules: provisional, see handbook.', 'Arbeidsdager (man–fre). Regler: foreløpige, se håndboken.')}</p></section>
        <form class="card stack" data-form="requestLeave"><h2 class="h3">${ic('plus', 18)} ${T('New request', 'Ny søknad')}</h2>
          <div class="type-pick">${Object.entries(LT()).map(([k, [label, icon, color]], i) => `<label style="--c:${color}"><input type="radio" name="type" value="${k}" ${i === 0 ? 'checked' : ''}><span>${ic(icon, 20)}${label}</span></label>`).join('')}</div>
          <div class="grid-2"><div><label class="field-label">${T('From', 'Fra')}</label><input class="input" type="date" name="from" value="${today}" min="${W.addDays(today, -7)}" required></div><div><label class="field-label">${T('To', 'Til')}</label><input class="input" type="date" name="to" value="${today}" required></div></div>
          <input class="input" name="note" placeholder="${T('Note to manager (optional)', 'Melding til leder (valgfritt)')}">
          <button class="btn btn-primary btn-block">${T('Send request', 'Send søknad')}</button>
          <p class="small muted">${T('Sick leave is registered immediately — remember to call your shift lead before the shift.', 'Sykefravær registreres med en gang — husk å ringe skiftleder før vakten.')}</p></form>
      </div>
      <div class="split">
        <section class="card"><h2 class="h3">${T('Your requests', 'Dine søknader')}</h2>${mine.length ? mine.map((l) => { const [label, icon, color] = LT()[l.type]; return `<div class="leave-row" style="--c:${color}"><span class="leave-ic">${ic(icon, 18)}</span><div><b>${label}</b><span class="small muted">${K.fmtDay(l.from, 'short')}${l.to !== l.from ? ' – ' + K.fmtDay(l.to, 'short') : ''} · ${api.leave.workdays(l.from, l.to)} ${T('working days', 'arbeidsdager')}</span>${l.note ? `<span class="small">“${esc(l.note)}”</span>` : ''}</div>${st(l)}${l.status === 'pending' ? `<button class="icon-btn" data-action="cancelLeave" data-id="${l.id}" title="${T('Cancel', 'Avbryt')}">${ic('x', 16)}</button>` : ''}</div>`; }).join('') : `<p class="small muted">—</p>`}</section>
        <section class="card"><h2 class="h3">${ic('users', 18)} ${T('Team away (next 6 weeks)', 'Borte i teamet (neste 6 uker)')}</h2>${team.length ? team.map((l) => `<div class="leave-row" style="--c:${LT()[l.type][2]}">${K.avatar(person(l.userId), 32)}<div><b>${esc(person(l.userId).name)}</b><span class="small muted">${LT()[l.type][0]} · ${K.fmtDay(l.from, 'short')}${l.to !== l.from ? ' – ' + K.fmtDay(l.to, 'short') : ''}</span></div></div>`).join('') : `<p class="small muted">${T('Nobody away.', 'Ingen borte.')}</p>`}</section>
      </div>
    </div>`;
  }

  // ================= AVAILABILITY =================
  // Many staff have another job, so availability is set day by day (dates win over the usual week).
  const AVS = () => ({ available: [T('Available', 'Tilgjengelig'), 'check'], preferred: [T('Prefer to work', 'Jobber gjerne'), 'star'], partial: [T('Only some hours', 'Kun noen timer'), 'clock'], unavailable: [T('Not available', 'Ikke tilgjengelig'), 'x'] });
  const rangeText = (av) => (av.ranges || []).map((r) => r.from.replace(':00', '') + '–' + r.to.replace(':00', '')).join(' · ');
  function availability() {
    const tab = app.ui.avTab || 'days';
    const mgr = isMgr();
    const tabs = `<div class="seg seg-sm">${[['days', T('Day by day', 'Dag for dag'), 'calendar'], ['week', T('Usual week', 'Vanlig uke'), 'week']].concat(mgr ? [['team', T('Team', 'Team'), 'users']] : []).map(([k, l, i]) => `<button class="${tab === k ? 'on' : ''}" data-action="avTab" data-t="${k}">${ic(i, 15)} ${l}</button>`).join('')}</div>`;
    return `<div class="page-w ${tab === 'team' ? 'wide' : 'narrow'}">
      ${head(T('Availability', 'Tilgjengelighet'), T('Set the hours you can work, day by day. Your manager and the automatic planner use this when building the rota.', 'Sett timene du kan jobbe, dag for dag. Leder og den automatiske planleggeren bruker dette når vaktplanen lages.'), tabs)}
      ${tab === 'week' ? usualWeek() : tab === 'team' ? teamAvailability() : dayByDay()}
    </div>`;
  }
  function dayByDay() {
    const u = api.auth.me();
    const start = W.monday(W.today());
    const sel = app.ui.avSel = app.ui.avSel || [];
    const days = Array.from({ length: 42 }, (_, i) => W.addDays(start, i));
    const st = AVS();
    const mine = api.shifts.mine(start, W.addDays(start, 41));
    const weeks = []; for (let i = 0; i < 42; i += 7) weeks.push(days.slice(i, i + 7));
    return `<div class="notice notice-ink small">${ic('sparkle', 16)} <span>${T('Working somewhere else too? Mark the hours you are free each day — e.g. only evenings on days you have your other job. Tap days to select them, then choose.', 'Jobber du et annet sted også? Marker timene du er ledig hver dag — f.eks. bare kveld de dagene du har den andre jobben. Trykk på dager for å velge dem, og velg så.')}</span></div>
      <div class="av-cal">
        <div class="av-cal-h"><span></span>${[1, 2, 3, 4, 5, 6, 0].map((wd) => `<span>${new Date(2024, 0, 7 + wd).toLocaleDateString(App.i18n.locale(), { weekday: 'short' })}</span>`).join('')}</div>
        ${weeks.map((w) => `<div class="av-cal-w"><span class="av-wk">${T('W', 'U')}${W.isoWeek(w[0])}</span>${w.map((d) => {
          const av = api.availability.forDate(u.id, d); const past = d < W.today(); const hol = W.holiday && W.holiday(d);
          const sh = mine.filter((s) => s.date === d);
          return `<button class="av-day st-${av.state} ${av.source === 'date' ? 'set' : ''} ${sel.includes(d) ? 'sel' : ''} ${past ? 'past' : ''} ${d === W.today() ? 'today' : ''}" ${past ? 'disabled' : ''} data-action="avPick" data-d="${d}" aria-pressed="${sel.includes(d)}" title="${esc(L(st[av.state][0]))}${av.note ? ' · ' + esc(av.note) : ''}${hol ? ' · ' + esc(L(hol.name)) : ''}">
            <span class="av-num">${K.fmtDay(d, 'num')}${Number(K.fmtDay(d, 'num')) === 1 ? ' ' + esc(K.fmtDay(d, 'month')) : ''}${hol ? '<i class="av-hol"></i>' : ''}</span>
            <span class="av-st">${ic(st[av.state][1], 13)}<em>${av.state === 'partial' ? esc(rangeText(av)) : av.state === 'unavailable' ? T('Busy', 'Opptatt') : av.state === 'preferred' ? T('Prefer', 'Gjerne') : ''}</em></span>
            ${sh.length ? `<span class="av-shift">${sh.map((s) => s.start + '–' + s.end).join(', ')}</span>` : ''}</button>`; }).join('')}</div>`).join('')}
      </div>
      <div class="legend"><span><i class="leg-sq" style="background:#E3F4EA"></i> ${T('Available', 'Tilgjengelig')}</span><span><i class="leg-sq" style="background:var(--amber-soft)"></i> ${T('Only some hours', 'Kun noen timer')}</span><span><i class="leg-sq" style="background:#F6E2E4"></i> ${T('Not available', 'Ikke tilgjengelig')}</span><span><i class="leg-sq set-mark"></i> ${T('Set for that date', 'Satt for datoen')}</span><span><b class="av-shift-l">16–22</b> ${T('your shift', 'din vakt')}</span><span><i class="av-hol static"></i> ${T('Public holiday', 'Helligdag')}</span></div>
      ${sel.length ? `<div class="av-bar"><b>${sel.length} ${T(sel.length === 1 ? 'day selected' : 'days selected', sel.length === 1 ? 'dag valgt' : 'dager valgt')}</b>
        <div class="row">
          <button class="btn btn-sm btn-light" data-action="avSet" data-state="available">${ic('check', 15)} ${T('Available all day', 'Hele dagen')}</button>
          <button class="btn btn-sm btn-light" data-action="avHours">${ic('clock', 15)} ${T('Only some hours…', 'Kun noen timer…')}</button>
          <button class="btn btn-sm btn-light" data-action="avSet" data-state="unavailable">${ic('x', 15)} ${T('Not available', 'Ikke tilgjengelig')}</button>
          <button class="btn btn-sm btn-ghost light" data-action="avSet" data-state="clear">${T('Use usual week', 'Bruk vanlig uke')}</button>
          <button class="icon-btn" data-action="avClear" aria-label="${T('Clear selection', 'Fjern valg')}">${ic('x', 16)}</button></div></div>` : ''}`;
  }
  function hoursSheet() {
    const sel = app.ui.avSel || [];
    const first = sel[0] && api.availability.forDate(api.auth.me().id, sel[0]);
    const r = (first && first.state === 'partial' && first.ranges.length ? first.ranges : [{ from: '16:00', to: '23:30' }]).concat([{ from: '', to: '' }, { from: '', to: '' }]).slice(0, 3);
    return `<form data-form="avHoursSave" class="admin-sheet">${K.sheetHead(T('When can you work?', 'Når kan du jobbe?'), sel.length + ' ' + T(sel.length === 1 ? 'day' : 'days', sel.length === 1 ? 'dag' : 'dager') + ': ' + sel.slice(0, 4).map((d) => K.fmtDay(d, 'short')).join(', ') + (sel.length > 4 ? '…' : ''))}
      <div class="chips wrap">${[['10:00', '16:00', T('Day', 'Dag')], ['16:00', '23:30', T('Evening', 'Kveld')], ['11:00', '15:00', T('Lunch', 'Lunsj')], ['18:00', '23:30', T('Late', 'Sent')]].map(([a, b, l]) => `<button type="button" class="chip" data-action="avPreset" data-from="${a}" data-to="${b}">${l} ${a}–${b}</button>`).join('')}</div>
      ${r.map((x, i) => `<div class="row av-range"><span class="small muted">${T('From', 'Fra')}</span><label class="sr-only" for="avf${i}">${T('From', 'Fra')}</label><input id="avf${i}" class="input input-sm" type="time" name="from${i}" value="${x.from}"><span class="small muted">${T('to', 'til')}</span><label class="sr-only" for="avt${i}">${T('To', 'Til')}</label><input id="avt${i}" class="input input-sm" type="time" name="to${i}" value="${x.to}">${i ? `<span class="small muted">${T('(optional)', '(valgfritt)')}</span>` : ''}</div>`).join('')}
      <label class="field-label" for="avNote">${T('Note for your manager (optional)', 'Melding til leder (valgfritt)')}</label><input id="avNote" class="input" name="note" placeholder="${T('e.g. other job in the morning', 'f.eks. annen jobb om morgenen')}" value="${esc(first && first.note || '')}">
      <button class="btn btn-primary btn-block">${T('Save', 'Lagre')}</button></form>`;
  }
  function usualWeek() {
    const a = api.availability.get();
    const order = [1, 2, 3, 4, 5, 6, 0];
    const name = (wd) => new Date(2024, 0, 7 + wd).toLocaleDateString(App.i18n.locale(), { weekday: 'long' });
    const states = [['available', T('Available', 'Tilgjengelig'), 'check'], ['preferred', T('Prefer to work', 'Jobber gjerne'), 'star'], ['partial', T('Only some hours', 'Kun noen timer'), 'clock'], ['unavailable', T('Unavailable', 'Utilgjengelig'), 'x']];
    return `<p class="small muted">${T('Your normal pattern. Anything you set for a specific date (Day by day) replaces it for that day.', 'Ditt vanlige mønster. Det du setter for en bestemt dato (Dag for dag) erstatter det den dagen.')}</p>
      <div class="avail">${order.map((wd) => { const v = a.weekly[wd] || { state: 'available' }; return `<div class="av-row st-${v.state}">
        <b class="av-day-name">${name(wd)}</b>
        <div class="av-states">${states.map(([k, label, icon]) => `<button class="${v.state === k ? 'on' : ''} s-${k}" data-action="setAvail" data-wd="${wd}" data-state="${k}" title="${label}">${ic(icon, 15)}<span>${label}</span></button>`).join('')}</div>
        ${v.state === 'partial' || v.state === 'preferred' ? `<div class="av-times"><input class="input input-sm" type="time" aria-label="${T('From', 'Fra')}" value="${v.from || '16:00'}" data-change="availTime" data-wd="${wd}" data-k="from"> – <input class="input input-sm" type="time" aria-label="${T('To', 'Til')}" value="${v.to || '22:30'}" data-change="availTime" data-wd="${wd}" data-k="to"></div>` : ''}
        ${v.note ? `<span class="small muted">${esc(v.note)}</span>` : ''}</div>`; }).join('')}</div>`;
  }
  function teamAvailability() {
    const start = app.ui.avTeamStart || W.today();
    const days = Array.from({ length: 14 }, (_, i) => W.addDays(start, i));
    const team = api.people.team(loc());
    return `<div class="row-between"><p class="small muted">${T('What each person can work in the next two weeks. Planned shifts are shown in bold.', 'Hva hver person kan jobbe de neste to ukene. Planlagte vakter vises i fet skrift.')}</p>
      <div class="row"><button class="icon-btn bordered" data-action="avTeamNav" data-d="-7" aria-label="${T('Earlier', 'Tidligere')}">${ic('back', 16)}</button><button class="icon-btn bordered" data-action="avTeamNav" data-d="7" aria-label="${T('Later', 'Senere')}">${ic('arrow', 16)}</button></div></div>
      <div class="rota-scroll"><table class="table av-team"><thead><tr><th>${T('Employee', 'Ansatt')}</th>${days.map((d) => `<th class="${d === W.today() ? 'today' : ''}">${K.fmtDay(d, 'wd')}<br><span class="muted">${K.fmtDay(d, 'num')}</span></th>`).join('')}</tr></thead>
      <tbody>${team.map((p) => `<tr><td><div class="row nowrap">${K.avatar(p, 26)}<span>${esc(p.name)}</span></div></td>${days.map((d) => { const av = api.availability.forDate(p.id, d); const sh = App.store.db.shifts.filter((s) => s.userId === p.id && s.date === d); const lv = App.store.db.leave.find((l) => l.userId === p.id && l.status === 'approved' && d >= l.from && d <= l.to);
        return `<td class="avc st-${lv ? 'unavailable' : av.state}" title="${esc(av.note || '')}">${lv ? T('Leave', 'Fravær') : av.state === 'partial' ? esc(rangeText(av)) : av.state === 'unavailable' ? '✕' : av.state === 'preferred' ? '★' : ''}${sh.length ? `<b>${sh.map((s) => s.start.replace(':00', '') + '–' + s.end.replace(':00', '')).join(' ')}</b>` : ''}${av.source === 'date' ? '<i class="setdot"></i>' : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="legend"><span><i class="leg-sq" style="background:#E3F4EA"></i> ${T('Available', 'Tilgjengelig')}</span><span><i class="leg-sq" style="background:var(--amber-soft)"></i> ${T('Some hours', 'Noen timer')}</span><span><i class="leg-sq" style="background:#F6E2E4"></i> ${T('Not available / leave', 'Ikke tilgjengelig / fravær')}</span><span><i class="setdot static"></i> ${T('set for that date', 'satt for datoen')}</span></div>`;
  }

  // ================= HOURS & PAY =================
  function periodRange(p) {
    const t = W.today(), mon = W.monday(t);
    if (p === 'last') return [W.addDays(mon, -7), W.addDays(mon, -1)];
    if (p === 'month') return [t.slice(0, 8) + '01', t];
    if (p === 'prev2') return [W.addDays(mon, -14), W.addDays(mon, -1)];
    return [mon, W.addDays(mon, 6)];
  }
  function hours() {
    const per = app.ui.hoursPer || 'week';
    const [from, to] = periodRange(per);
    const mgrView = isMgr() && app.ui.hoursMode !== 'me';
    const list = mgrView ? api.time.punches({ all: true, locationId: loc(), from, to }) : api.time.punches({ from, to });
    const tot = list.reduce((s, p) => { const x = api.time.pay(p); s.h += x.hours; s.pay += x.total; s.sup += x.supplementNok; return s; }, { h: 0, pay: 0, sup: 0 });
    const pending = list.filter((p) => p.status === 'submitted').length;
    const perBtn = (k, label) => `<button class="${per === k ? 'on' : ''}" data-action="hoursPer" data-p="${k}">${label}</button>`;
    return `<div class="page-w wide">
      ${head(T('Hours & pay', 'Timer og lønn'), mgrView ? T('Approve timesheets before they go to payroll.', 'Godkjenn timelister før de går til lønn.') : T('Your clocked hours and estimated pay. Final pay is calculated by payroll.', 'Dine stemplede timer og estimert lønn. Endelig lønn beregnes av lønningsavdelingen.'),
        isMgr() ? `<div class="seg seg-sm"><button class="${mgrView ? 'on' : ''}" data-action="hoursMode" data-m="team">${ic('users', 16)} ${T('Team', 'Team')}</button><button class="${mgrView ? '' : 'on'}" data-action="hoursMode" data-m="me">${ic('user', 16)} ${T('Me', 'Meg')}</button></div>` : '')}
      <div class="row-between"><div class="seg seg-sm">${perBtn('week', T('This week', 'Denne uka'))}${perBtn('last', T('Last week', 'Forrige uke'))}${perBtn('month', T('This month', 'Denne måneden'))}</div><span class="small muted">${K.fmtDay(from, 'short')} – ${K.fmtDay(to, 'short')}</span></div>
      <div class="kpis sm">
        <div class="kpi"><span class="small muted">${T('Hours', 'Timer')}</span><b>${W.fmtH(tot.h)}</b></div>
        <div class="kpi"><span class="small muted">${T('Supplements', 'Tillegg')}</span><b>${U.nok(tot.sup)}</b></div>
        <div class="kpi"><span class="small muted">${T('Estimated gross pay', 'Estimert bruttolønn')}</span><b>${U.nok(tot.pay)}</b></div>
        ${mgrView ? `<div class="kpi ${pending ? 'warn' : 'ok'}"><span class="small muted">${T('To approve', 'Til godkjenning')}</span><b>${pending}</b></div>` : ''}
      </div>
      ${mgrView && pending ? `<div class="row"><button class="btn btn-primary btn-sm" data-action="approvePunches" data-all="1">${ic('check', 16)} ${T('Approve all', 'Godkjenn alle')} (${pending})</button><button class="btn btn-ghost btn-sm" data-action="approvePunches">${T('Approve selected', 'Godkjenn valgte')}</button></div>` : ''}
      ${punchTable(list, mgrView)}
      <p class="small muted">${T('Supplements (example rules, to be confirmed):', 'Tillegg (eksempelregler, må bekreftes):')} ${C().supplements.map((s) => `${esc(L(s.label))} +${s.pct ? s.pct + ' %' : s.nokPerHour + ' kr/t'}`).join(' · ')} · ${T('Overtime', 'Overtid')} +${C().overtime.pct} % ${T('over', 'over')} ${C().overtime.dailyHours} ${T('h/day', 't/dag')}.</p>
    </div>`;
  }
  function punchEditor(p) {
    return `<form data-form="savePunch" class="admin-sheet">${K.sheetHead(T('Correct punch', 'Korriger stempling'), esc(person(p.userId).name) + ' · ' + K.fmtDay(p.date, 'short'))}
      <input type="hidden" name="id" value="${p.id}"><div class="grid-2"><div><label class="field-label">${T('In', 'Inn')}</label><input class="input" type="time" name="in" value="${W.hmOf(new Date(p.in))}"></div><div><label class="field-label">${T('Out', 'Ut')}</label><input class="input" type="time" name="out" value="${p.out ? W.hmOf(new Date(p.out)) : ''}"></div></div>
      ${p.note ? `<p class="small">📝 ${esc(p.note)}</p>` : ''}<p class="small muted">${T('Changes are logged with your name (audit trail).', 'Endringer logges med navnet ditt (revisjonsspor).')}</p>
      <div class="row"><button class="btn btn-primary btn-grow">${T('Save', 'Lagre')}</button><button type="button" class="btn btn-dark" data-action="approveOne" data-id="${p.id}">${ic('check', 16)} ${T('Approve', 'Godkjenn')}</button></div></form>`;
  }

  // ================= APPROVALS (manager) =================
  function approvals() {
    const reqs = api.requests.forManager();
    const lv = api.leave.all().filter((l) => l.status === 'pending');
    const tp = api.time.pendingCount(loc());
    const sh = (id) => api.shifts.get(id);
    const line = (s) => s ? `${posDot(s.positionId)} ${K.fmtDay(s.date, 'short')} ${s.start}–${s.end}` : '—';
    return `<div class="page-w narrow">
      ${head(T('Approvals', 'Godkjenninger'), T('Everything waiting for a manager decision.', 'Alt som venter på en lederbeslutning.'))}
      <div class="kpis sm"><div class="kpi ${reqs.length ? 'warn' : 'ok'}"><span class="small muted">${T('Shift changes', 'Vaktendringer')}</span><b>${reqs.length}</b></div><div class="kpi ${lv.length ? 'warn' : 'ok'}"><span class="small muted">${T('Leave', 'Fravær')}</span><b>${lv.length}</b></div><a class="kpi ${tp ? 'warn' : 'ok'}" href="#/staff/shifts/hours"><span class="small muted">${T('Timesheets', 'Timelister')}</span><b>${tp}</b></a></div>
      <h2 class="h3">${ic('swap', 18)} ${T('Swaps, handovers & open-shift requests', 'Bytter, overtakelser og ledige vakter')}</h2>
      ${reqs.length ? reqs.map((r) => { const s = sh(r.shiftId), t2 = r.targetShiftId && sh(r.targetShiftId); const from = person(r.fromId), to = r.toId && person(r.toId);
        const after = r.type === 'claim' ? Object.assign({}, s, { userId: r.fromId }) : r.type === 'handover' ? Object.assign({}, s, { userId: r.toId }) : Object.assign({}, s, { userId: t2.userId });
        const cf = api.shifts.conflicts(after);
        return `<div class="req-card"><div class="req-top">${K.avatar(from, 36)}<div><b>${esc(from.name)}</b> <span class="small muted">· ${typeLabel(r.type)} · ${K.timeAgo(r.createdAt)}</span></div></div>
          <p class="small">${r.type === 'claim' ? T('wants the open shift', 'ønsker den ledige vakten') + ' ' + line(s) : r.type === 'handover' ? T('gives', 'gir') + ' ' + line(s) + ' ' + T('to', 'til') + ' <b>' + esc(to.name) + '</b>' : line(s) + ' ⇄ ' + line(t2) + ' ' + T('with', 'med') + ' <b>' + esc(to.name) + '</b>'}</p>
          ${cf.map((c) => `<div class="notice notice-amber small">${ic('alert', 14)} <span>${esc(L(c.text))}</span></div>`).join('')}
          <div class="row"><button class="btn btn-primary btn-sm" data-action="decideReq" data-id="${r.id}" data-ok="1">${ic('check', 16)} ${T('Approve', 'Godkjenn')}</button><button class="btn btn-ghost btn-sm" data-action="decideReq" data-id="${r.id}" data-ok="0">${T('Reject', 'Avslå')}</button></div></div>`; }).join('') : `<p class="small muted">${T('Nothing to approve.', 'Ingenting å godkjenne.')}</p>`}
      <h2 class="h3">${ic('beach', 18)} ${T('Leave requests', 'Fraværssøknader')}</h2>
      ${lv.length ? lv.map((l) => { const p = person(l.userId); const clash = App.store.db.shifts.filter((s) => s.userId === l.userId && s.date >= l.from && s.date <= l.to).length;
        return `<div class="req-card"><div class="req-top">${K.avatar(p, 36)}<div><b>${esc(p.name)}</b> <span class="small muted">· ${LT()[l.type][0]} · ${K.timeAgo(l.createdAt)}</span><p class="small"><b>${K.fmtDay(l.from, 'short')} – ${K.fmtDay(l.to, 'short')}</b> · ${api.leave.workdays(l.from, l.to)} ${T('working days', 'arbeidsdager')} · ${T('balance after', 'saldo etter')}: ${api.leave.balance(l.userId).left - api.leave.workdays(l.from, l.to)}</p>${l.note ? `<p class="small">“${esc(l.note)}”</p>` : ''}</div></div>
          ${clash ? `<div class="notice notice-amber small">${ic('alert', 14)} <span>${T(clash + ' planned shifts in this period will need cover.', clash + ' planlagte vakter i perioden må dekkes.')}</span></div>` : ''}
          <div class="row"><button class="btn btn-primary btn-sm" data-action="decideLeave" data-id="${l.id}" data-ok="1">${ic('check', 16)} ${T('Approve', 'Godkjenn')}</button><button class="btn btn-ghost btn-sm" data-action="decideLeave" data-id="${l.id}" data-ok="0">${T('Decline', 'Avslå')}</button></div></div>`; }).join('') : `<p class="small muted">${T('No pending leave.', 'Ingen ventende søknader.')}</p>`}
    </div>`;
  }

  // ================= PAYROLL (manager) =================
  function payroll() {
    const per = app.ui.payPer || 'prev2';
    const [from, to] = periodRange(per);
    const rows = api.time.payroll(loc(), from, to);
    const sups = C().supplements;
    const tot = rows.reduce((s, r) => { s.h += r.hours; s.t += r.total; s.sup += r.supplementNok; s.ot += r.overtimeHours; return s; }, { h: 0, t: 0, sup: 0, ot: 0 });
    const notApproved = App.store.db.punches.filter((p) => p.locationId === loc() && p.date >= from && p.date <= to && p.status !== 'approved').length;
    const stats = api.shifts.weekStats(loc(), W.monday(W.today()));
    const max = Math.max(...stats.map((s) => Math.max(s.cost, s.revenue * C().laborTargetPct / 100)), 1);
    const perBtn = (k, label) => `<button class="${per === k ? 'on' : ''}" data-action="payPer" data-p="${k}">${label}</button>`;
    return `<div class="page-w wide">
      ${head(T('Payroll export', 'Lønnseksport'), T('Approved hours per employee, ready for the payroll system.', 'Godkjente timer per ansatt, klare for lønnssystemet.'), `<button class="btn btn-primary btn-sm" data-action="exportPayroll" data-from="${from}" data-to="${to}">${ic('download', 16)} ${T('Export CSV', 'Eksporter CSV')}</button>`)}
      <div class="row-between"><div class="seg seg-sm">${perBtn('prev2', T('Last 2 weeks', 'Siste 2 uker'))}${perBtn('last', T('Last week', 'Forrige uke'))}${perBtn('month', T('This month', 'Denne måneden'))}</div><span class="small muted">${K.fmtDay(from, 'short')} – ${K.fmtDay(to, 'short')}</span></div>
      ${notApproved ? `<div class="notice notice-amber small">${ic('alert', 16)} <span>${T(notApproved + ' punches in this period are not approved yet and are not included.', notApproved + ' stemplinger i perioden er ikke godkjent og er ikke med.')} <a class="link" href="#/staff/shifts/hours">${T('Review', 'Gå gjennom')}</a></span></div>` : ''}
      <div class="kpis sm"><div class="kpi"><span class="small muted">${T('Employees', 'Ansatte')}</span><b>${rows.length}</b></div><div class="kpi"><span class="small muted">${T('Hours', 'Timer')}</span><b>${W.fmtH(tot.h)}</b></div><div class="kpi"><span class="small muted">${T('Supplements', 'Tillegg')}</span><b>${U.nok(tot.sup)}</b></div><div class="kpi"><span class="small muted">${T('Gross total', 'Brutto totalt')}</span><b>${U.nok(tot.t)}</b></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>${T('Employee', 'Ansatt')}</th><th>${T('No.', 'Nr.')}</th><th class="num">${T('Shifts', 'Vakter')}</th><th class="num">${T('Hours', 'Timer')}</th>${sups.map((s) => `<th class="num">${esc(L(s.label))}</th>`).join('')}<th class="num">${T('Overtime h', 'Overtid t')}</th><th class="num">${T('Base', 'Grunnlønn')}</th><th class="num">${T('Total', 'Totalt')}</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td><div class="row nowrap">${K.avatar(r.user, 26)}${esc(r.user.name)}</div></td><td class="small muted">${esc(r.user.employeeNo || '')}</td><td class="num">${r.shifts}</td><td class="num">${r.hours.toFixed(2)}</td>${sups.map((s) => `<td class="num">${(r.supplements[s.id] || 0).toFixed(2)}</td>`).join('')}<td class="num">${r.overtimeHours.toFixed(2)}</td><td class="num">${U.nok(r.base)}</td><td class="num"><b>${U.nok(r.total)}</b></td></tr>`).join('') || `<tr><td colspan="9" class="muted">—</td></tr>`}</tbody></table></div>
      <section class="card"><h2 class="h3">${ic('chart', 18)} ${T('Labour cost vs. forecast — this week', 'Lønnskostnad mot prognose — denne uka')}</h2>
        <div class="bars">${stats.map((s) => `<div class="bar-col"><div class="bar-stack"><i class="b-target" style="bottom:${s.revenue * C().laborTargetPct / 100 / max * 100}%" title="${T('Target', 'Mål')}"></i><i class="b-cost ${s.pct > C().laborTargetPct ? 'over' : ''}" style="height:${s.cost / max * 100}%"></i></div><b class="small">${Math.round(s.pct)}%</b><span class="small muted">${K.fmtDay(s.day, 'wd')}</span></div>`).join('')}</div>
        <p class="small muted">${T('Bar = planned labour cost. Line = target (', 'Søyle = planlagt lønnskostnad. Linje = mål (')}${C().laborTargetPct} % ${T('of forecast sales). Forecast sales are demo numbers.', 'av prognostisert salg). Prognosen er demotall.')}</p></section>
      <p class="small muted">${T('Export columns are compatible with common Norwegian payroll systems (e.g. Tripletex, Visma, PowerOffice) via CSV import — mapping to be confirmed per client.', 'Eksportkolonnene kan importeres i vanlige norske lønnssystemer (f.eks. Tripletex, Visma, PowerOffice) via CSV — mapping bekreftes per kunde.')}</p>
    </div>`;
  }

  // ---------- downloads ----------
  function download(name, text, type) {
    const blob = new Blob(['﻿' + text], { type: type || 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const icsDate = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  // ---------- actions ----------
  const re = (msg) => { if (msg) app.toast(msg); app.render(); };
  Object.assign(App.actions, {
    openShift(d) { const s = api.shifts.get(d.id); if (!s) return; if (isMgr() && !(s.userId === api.auth.me().id)) app.modal(shiftEditor(s)); else app.modal(shiftSheet(s)); },
    editShift(d) { app.modal(shiftEditor(api.shifts.get(d.id))); },
    newShift(d) { app.modal(shiftEditor(null, { date: d.date, user: d.user })); },
    deleteShift(d) { app.confirm(T('Delete this shift?', 'Slette denne vakten?'), T('Delete', 'Slett'), () => { api.shifts.remove(d.id); re(T('Shift deleted', 'Vakt slettet')); }, true); },
    applyTpl(d, el) { const f = el.closest('form'); f.positionId.value = d.pos; f.start.value = d.start; f.end.value = d.end; },
    rotaNav(d) { const n = Number(d.d); app.ui.rotaWeek = n === 0 ? W.monday(W.today()) : W.addDays(rotaWeek(), n); app.ui.rotaDay = null; re(); },
    rotaView(d) { app.ui.rotaView = d.v; re(); },
    rotaDay(d) { app.ui.rotaDay = d.d; re(); },
    copyWeek() { const n = api.shifts.copyWeek(loc(), W.addDays(rotaWeek(), -7), rotaWeek()); re(T(n + ' shifts copied as drafts', n + ' vakter kopiert som utkast')); },
    publishWeek() { const n = api.shifts.publishWeek(loc(), rotaWeek()); re(T(n + ' shifts published — team notified', n + ' vakter publisert — teamet er varslet')); },
    claimShift(d) { api.requests.claim(d.id); app.modal(null); re(T('Request sent to the manager', 'Forespørsel sendt til leder')); },
    respondReq(d) { api.requests.respond(d.id, d.ok === '1'); re(d.ok === '1' ? T('Accepted — waiting for manager approval', 'Godtatt — venter på leders godkjenning') : T('Declined', 'Avslått')); },
    takeReq(d) { api.requests.take(d.id); re(T('Nice! Waiting for manager approval', 'Supert! Venter på leders godkjenning')); },
    cancelReq(d) { api.requests.cancel(d.id); re(T('Request cancelled', 'Forespørsel avbrutt')); },
    decideReq(d) { api.requests.decide(d.id, d.ok === '1'); re(d.ok === '1' ? T('Approved — rota updated', 'Godkjent — vaktplanen er oppdatert') : T('Rejected', 'Avslått')); },
    decideLeave(d) { api.leave.decide(d.id, d.ok === '1'); re(d.ok === '1' ? T('Leave approved', 'Fravær godkjent') : T('Leave declined', 'Fravær avslått')); },
    cancelLeave(d) { api.leave.cancel(d.id); re(T('Request withdrawn', 'Søknad trukket')); },
    setAvail(d) { const a = api.availability.get(); const cur = a.weekly[d.wd] || {}; api.availability.setWeekly(Number(d.wd), { state: d.state, from: cur.from, to: cur.to, note: cur.note }); re(T('Availability saved', 'Tilgjengelighet lagret')); },
    hoursPer(d) { app.ui.hoursPer = d.p; re(); },
    hoursMode(d) { app.ui.hoursMode = d.m; re(); },
    payPer(d) { app.ui.payPer = d.p; re(); },
    editPunch(d) { app.modal(punchEditor(App.store.db.punches.find((p) => p.id === d.id))); },
    approveOne(d) { api.time.approve(d.id); app.modal(null); re(T('Approved', 'Godkjent')); },
    approvePunches(d) {
      const ids = d.all ? api.time.punches({ all: true, locationId: loc(), status: 'submitted' }).map((p) => p.id) : [...document.querySelectorAll('.psel:checked')].map((x) => x.value);
      if (!ids.length) return app.toast(T('Select rows first', 'Velg rader først'));
      api.time.approve(ids); re(T(ids.length + ' timesheets approved', ids.length + ' timelister godkjent'));
    },
    exportPayroll(d) {
      const rows = api.time.payroll(loc(), d.from, d.to); const sups = C().supplements;
      const head = ['employee_no', 'name', 'location', 'period_from', 'period_to', 'shifts', 'hours', ...sups.map((s) => 'supp_' + s.id + '_hours'), 'overtime_hours', 'hourly_rate', 'base_nok', 'supplements_nok', 'overtime_nok', 'total_nok'];
      const lines = rows.map((r) => [r.user.employeeNo, r.user.name, loc(), d.from, d.to, r.shifts, r.hours.toFixed(2), ...sups.map((s) => (r.supplements[s.id] || 0).toFixed(2)), r.overtimeHours.toFixed(2), r.user.hourlyNok, r.base.toFixed(2), r.supplementNok.toFixed(2), r.overtimeNok.toFixed(2), r.total.toFixed(2)]);
      download(`payroll_${loc()}_${d.from}_${d.to}.csv`, [head].concat(lines).map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv');
      app.toast(T('CSV downloaded', 'CSV lastet ned'));
    },
    exportIcs() {
      const list = api.shifts.mine(W.today());
      const ev = list.map((s) => ['BEGIN:VEVENT', 'UID:' + s.id + '@' + App.tenant.id, 'DTSTAMP:' + icsDate(new Date()), 'DTSTART:' + icsDate(W.shiftStart(s)), 'DTEND:' + icsDate(W.shiftEnd(s)),
        'SUMMARY:' + App.tenant.name + ' — ' + posName(s.positionId), 'LOCATION:' + ((api.catalog.location(s.locationId) || {}).address || ''), 'END:VEVENT'].join('\r\n'));
      download('my-shifts.ics', ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//' + App.tenant.appName + '//EN'].concat(ev).concat(['END:VCALENDAR']).join('\r\n'), 'text/calendar');
      app.toast(T(list.length + ' shifts exported', list.length + ' vakter eksportert'));
    },
  });
  Object.assign(App.changes, {
    rotaPos(el) { app.ui.rotaPos = el.value; re(); },
    availTime(el) { const a = api.availability.get(); const cur = Object.assign({}, a.weekly[el.dataset.wd]); cur[el.dataset.k] = el.value; api.availability.setWeekly(Number(el.dataset.wd), cur); app.toast(T('Saved', 'Lagret')); },
    selAllPunch(el) { document.querySelectorAll('.psel').forEach((x) => (x.checked = el.checked)); },
  });
  Object.assign(App.forms, {
    saveShift(data) {
      const s = api.shifts.save(data);
      const cf = api.shifts.conflicts(s);
      app.modal(null); re(cf.length ? '⚠ ' + cf.map((c) => L(c.text)).join(' · ') : T('Shift saved', 'Vakt lagret') + (s.published ? '' : T(' (draft)', ' (utkast)')));
    },
    shiftChange(data) {
      if (data.mode === 'swap') { if (!data.targetShiftId) return app.toast(T('Choose the shift to swap with', 'Velg vakten du vil bytte med')); api.requests.swap(data.shiftId, data.targetShiftId, data.note); }
      else if (data.mode === 'person') { if (!data.toId) return app.toast(T('Choose a colleague', 'Velg en kollega')); api.requests.handover(data.shiftId, data.toId, data.note); }
      else api.requests.handover(data.shiftId, null, data.note);
      app.modal(null); re(T('Request sent', 'Forespørsel sendt'));
    },
    requestLeave(data) { const l = api.leave.request(data); re(l.status === 'approved' ? T('Registered — get well soon!', 'Registrert — god bedring!') : T('Request sent to your manager', 'Søknad sendt til leder')); },
    savePunch(data) { api.time.edit(data.id, data); app.modal(null); re(T('Punch corrected', 'Stempling korrigert')); },
  });

  App.views.availabilityHoursSheet = hoursSheet;
  const R = app.route;
  R('/staff/shifts', 'staff', guard(myShifts));
  R('/staff/shifts/rota', 'staff', guard(rota));
  R('/staff/shifts/clock', 'staff', guard(clock));
  R('/staff/shifts/open', 'staff', guard(openShifts));
  R('/staff/shifts/swaps', 'staff', guard(swaps));
  R('/staff/shifts/leave', 'staff', guard(leave));
  R('/staff/shifts/availability', 'staff', guard(availability));
  R('/staff/shifts/hours', 'staff', guard(hours));
  R('/staff/shifts/approvals', 'staff', guard(approvals, 'admin'));
  R('/staff/shifts/payroll', 'staff', guard(payroll, 'admin'));
})();
