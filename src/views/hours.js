/*
 * SCHEDULE area — manager depth:
 *   #/staff/shifts/report  Hours report: any person, any period, every type of hour
 *   #/staff/shifts/labor   Labour cost & forecast: sales vs labour, %, SPLH, budget, positions, hour by hour
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
  const posDot = (id) => App.views.posDot(id);
  const posName = (id) => L(api.people.position(id).name);
  const h1 = (n) => (Math.round(n * 100) / 100).toLocaleString(App.i18n.locale(), { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const pct = (n) => (n == null ? '—' : n.toFixed(1).replace('.', App.i18n.lang === 'nb' ? ',' : '.') + ' %');
  const nok = U.nok;
  App.i18n.extend({ en: { 'err.period_locked': 'This pay period is locked. Unlock it in the hours report first.', 'err.bad_request': 'Some information is missing.' },
    nb: { 'err.period_locked': 'Denne lønnsperioden er låst. Lås den opp i timerapporten først.', 'err.bad_request': 'Noe informasjon mangler.' } });
  const head = (title, sub, right) => `<header class="staff-head"><div><h1 class="h1">${title}</h1>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>${right || ''}</header>`;

  // ---------- periods ----------
  const PRESETS = () => [['week', T('This week', 'Denne uka')], ['last', T('Last week', 'Forrige uke')], ['month', T('This month', 'Denne måneden')], ['lastmonth', T('Last month', 'Forrige måned')], ['custom', T('Custom', 'Egendefinert')]];
  function range(p, custom) {
    const t = W.today(), mon = W.monday(t);
    const first = t.slice(0, 8) + '01';
    if (p === 'last') return [W.addDays(mon, -7), W.addDays(mon, -1)];
    if (p === 'month') { const [y, m] = t.split('-').map(Number); return [first, W.dayKey(new Date(y, m, 0))]; }
    if (p === 'lastmonth') { const [y, m] = t.split('-').map(Number); return [W.dayKey(new Date(y, m - 2, 1)), W.dayKey(new Date(y, m - 1, 0))]; }
    if (p === 'custom' && custom && custom[0] && custom[1]) return custom[0] <= custom[1] ? custom : [custom[1], custom[0]];
    return [mon, W.addDays(mon, 6)];
  }
  function periodBar(key, ui) {
    const p = ui.preset || 'week';
    const [from, to] = range(p, ui.custom);
    return `<div class="period-bar">
      <div class="seg seg-sm">${PRESETS().map(([k, label]) => `<button class="${p === k ? 'on' : ''}" data-action="setPreset" data-key="${key}" data-p="${k}">${label}</button>`).join('')}</div>
      <form class="row date-range" data-form="customRange"><input type="hidden" name="key" value="${key}">
        <label class="sr-only" for="${key}From">${T('From', 'Fra')}</label><input id="${key}From" class="input input-sm" type="date" name="from" value="${from}">
        <span class="muted">–</span>
        <label class="sr-only" for="${key}To">${T('To', 'Til')}</label><input id="${key}To" class="input input-sm" type="date" name="to" value="${to}">
        <button class="btn btn-sm btn-ghost">${T('Apply', 'Bruk')}</button></form>
    </div>`;
  }
  const uiOf = (key) => (app.ui[key] = app.ui[key] || {});

  // ================= HOURS REPORT =================
  const TYPES = () => ({
    worked: [T('Worked', 'Arbeidet'), 'clock', '#2563EB'], vacation: [T('Holiday', 'Ferie'), 'beach', '#0C8599'], sick: [T('Sick', 'Syk'), 'medical', '#C2255C'],
    timeoff: [T('Time off', 'Fri'), 'sun', '#F08C00'], other: [T('Other absence', 'Annet fravær'), 'calendar', '#495057'],
  });
  const STATUS = () => ({ approved: ['badge-green', T('Approved', 'Godkjent')], submitted: ['badge-amber', T('Pending', 'Venter')], rejected: ['badge-red', T('Rejected — not counted', 'Avvist — telles ikke')], open: ['badge-gray', T('Running', 'Pågår')] });
  const FILTERS = () => [['approved', T('Approved', 'Godkjent')], ['submitted', T('Pending', 'Venter')], ['rejected', T('Rejected', 'Avvist')], ['vacation', T('Holiday', 'Ferie')], ['sick', T('Sick', 'Syk')], ['timeoff', T('Time off', 'Fri')], ['other', T('Other', 'Annet')]];
  function passes(e, f) {
    if (!f || !f.length) return true;
    if (e.kind === 'worked') return f.includes(e.status === 'open' ? 'submitted' : e.status);
    return f.includes(e.type);
  }

  function report() {
    const ui = uiOf('rep');
    const [from, to] = range(ui.preset || 'week', ui.custom);
    const mgr = isMgr();
    const userId = mgr ? ui.userId || '' : api.auth.me().id;
    const data = api.hours.report({ userId: userId || undefined, locationId: loc(), from, to });
    const f = ui.filters || [];
    const team = mgr ? api.people.team(loc()) : [];
    const lockedUntil = api.time.lockedUntil(loc());
    const filterChips = `<div class="chips wrap filt">${FILTERS().map(([k, label]) => `<button class="chip ${f.includes(k) ? 'on' : ''}" data-action="repFilter" data-k="${k}">${label}</button>`).join('')}${f.length ? `<button class="chip" data-action="repFilter" data-k="">${ic('x', 14)} ${T('Clear', 'Nullstill')}</button>` : ''}</div>`;
    const sumT = (k) => data.reduce((s, p) => s + (k(p.totals) || 0), 0);
    const kpis = `<div class="kpis sm">
      <div class="kpi"><span class="small muted">${T('Planned (rota)', 'Planlagt (vaktplan)')}</span><b>${h1(sumT((t) => t.plannedHours))} ${T('h', 't')}</b></div>
      <div class="kpi ok"><span class="small muted">${T('Worked — approved', 'Arbeidet — godkjent')}</span><b>${h1(sumT((t) => t.worked.approved))} ${T('h', 't')}</b></div>
      <div class="kpi ${sumT((t) => t.worked.submitted + t.worked.open) ? 'warn' : ''}"><span class="small muted">${T('Worked — pending', 'Arbeidet — venter')}</span><b>${h1(sumT((t) => t.worked.submitted + t.worked.open))} ${T('h', 't')}</b></div>
      <div class="kpi"><span class="small muted">${T('Rejected (not counted)', 'Avvist (telles ikke)')}</span><b>${h1(sumT((t) => t.worked.rejected))} ${T('h', 't')}</b></div>
      <div class="kpi"><span class="small muted">${T('Sick', 'Syk')}</span><b>${h1(sumT((t) => (t.absence.sick || 0) + (t.absence['sick:pending'] || 0)))} ${T('h', 't')}</b></div>
      <div class="kpi"><span class="small muted">${T('Holiday & other absence', 'Ferie og annet fravær')}</span><b>${h1(sumT((t) => Object.keys(t.absence).filter((k) => !k.startsWith('sick')).reduce((s, k) => s + t.absence[k], 0)))} ${T('h', 't')}</b></div>
      <div class="kpi"><span class="small muted">${T('Overtime', 'Overtid')}</span><b>${h1(sumT((t) => t.overtimeHours))} ${T('h', 't')}</b></div>
      <div class="kpi"><span class="small muted">${T('Est. gross pay', 'Est. bruttolønn')}</span><b>${nok(sumT((t) => t.payApproved + t.payPending))}</b><span class="small muted">${T('approved', 'godkjent')} ${nok(sumT((t) => t.payApproved))}</span></div>
    </div>`;

    const right = `<div class="row">${mgr ? `<select class="input input-sm" data-change="repUser" aria-label="${T('Employee', 'Ansatt')}"><option value="">${T('Everyone', 'Alle')} (${team.length})</option>${team.map((p) => `<option value="${p.id}" ${p.id === userId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>` : ''}
      <button class="btn btn-ghost btn-sm" data-action="repExport" data-from="${from}" data-to="${to}">${ic('download', 16)} CSV</button></div>`;

    // overview: one row per person
    const overview = () => `<div class="table-wrap"><table class="table rep-t"><thead><tr><th>${T('Employee', 'Ansatt')}</th><th class="num">${T('Planned', 'Planlagt')}</th><th class="num">${T('Approved', 'Godkjent')}</th><th class="num">${T('Pending', 'Venter')}</th><th class="num">${T('Rejected', 'Avvist')}</th><th class="num">${T('Sick', 'Syk')}</th><th class="num">${T('Holiday', 'Ferie')}</th><th class="num">${T('Other abs.', 'Annet fr.')}</th><th class="num">${T('Overtime', 'Overtid')}</th><th class="num" title="${T('Worked minus planned shifts that have already ended', 'Arbeidet minus planlagte vakter som er ferdige')}">${T('Diff. vs plan', 'Avvik plan')}</th><th class="num">${T('Est. pay', 'Est. lønn')}</th><th></th></tr></thead>
      <tbody>${data.filter((p) => !f.length || p.entries.some((e) => passes(e, f))).map((p) => { const t = p.totals; const ab = (k) => (t.absence[k] || 0) + (t.absence[k + ':pending'] || 0); const other = ab('timeoff') + ab('other');
        return `<tr class="click" data-action="repPerson" data-id="${p.user.id}"><td><div class="row nowrap">${K.avatar(p.user, 28)}<span><b>${esc(p.user.name)}</b><br><span class="small muted">${esc(L(p.user.title) || '')}${p.user.contractHours ? ' · ' + p.user.contractHours + ' ' + T('h/wk', 't/uke') : ''}</span></span></div></td>
          <td class="num">${h1(t.plannedHours)}</td><td class="num"><b>${h1(t.worked.approved)}</b></td><td class="num ${t.worked.submitted + t.worked.open ? 'warn' : ''}">${h1(t.worked.submitted + t.worked.open)}</td><td class="num muted">${h1(t.worked.rejected)}</td>
          <td class="num">${h1(ab('sick'))}</td><td class="num">${h1(ab('vacation'))}</td><td class="num">${h1(other)}</td><td class="num">${h1(t.overtimeHours)}</td>
          <td class="num ${Math.abs(t.variance) >= 2 ? 'warn' : ''}">${t.variance > 0 ? '+' : ''}${h1(t.variance)}</td><td class="num"><b>${nok(t.payApproved + t.payPending)}</b></td><td>${ic('arrow', 16)}</td></tr>`; }).join('') || `<tr><td colspan="12" class="muted">—</td></tr>`}</tbody>
      <tfoot><tr><td><b>${T('Total', 'Totalt')}</b></td><td class="num">${h1(sumT((t) => t.plannedHours))}</td><td class="num"><b>${h1(sumT((t) => t.worked.approved))}</b></td><td class="num">${h1(sumT((t) => t.worked.submitted + t.worked.open))}</td><td class="num">${h1(sumT((t) => t.worked.rejected))}</td><td class="num">${h1(sumT((t) => (t.absence.sick || 0) + (t.absence['sick:pending'] || 0)))}</td><td class="num">${h1(sumT((t) => (t.absence.vacation || 0) + (t.absence['vacation:pending'] || 0)))}</td><td class="num">${h1(sumT((t) => ['timeoff', 'other'].reduce((s, k) => s + (t.absence[k] || 0) + (t.absence[k + ':pending'] || 0), 0)))}</td><td class="num">${h1(sumT((t) => t.overtimeHours))}</td><td></td><td class="num"><b>${nok(sumT((t) => t.payApproved + t.payPending))}</b></td><td></td></tr></tfoot></table></div>`;

    // detail for one person
    const detail = (p) => {
      const t = p.totals; const entries = p.entries.filter((e) => passes(e, f));
      const ty = TYPES(), st = STATUS();
      const byDay = {}; entries.forEach((e) => (byDay[e.date] = byDay[e.date] || []).push(e));
      return `<section class="card person-rep">
        <div class="row-between"><div class="row">${K.avatar(p.user, 44)}<div><h2 class="h3">${esc(p.user.name)}</h2><span class="small muted">${esc(L(p.user.title) || '')} · ${p.user.contract === 'full' ? T('Full time', 'Heltid') : T('Part time', 'Deltid')} ${p.user.contractHours || '—'} ${T('h/week', 't/uke')} · ${p.user.hourlyNok ? nok(p.user.hourlyNok) + T('/h', '/t') : ''}</span></div></div>
          ${mgr ? `<div class="row"><button class="btn btn-sm btn-ghost" data-action="addManual" data-id="${p.user.id}">${ic('plus', 14)} ${T('Add missing hours', 'Legg til manglende timer')}</button>${t.worked.submitted ? `<button class="btn btn-sm btn-primary" data-action="approvePerson" data-id="${p.user.id}">${ic('check', 14)} ${T('Approve all pending', 'Godkjenn alle ventende')}</button>` : ''}</div>` : ''}</div>
        <div class="hour-mix">${[['approved', t.worked.approved, '#2F9E44'], ['pending', t.worked.submitted + t.worked.open, '#F08C00'], ['vacation', (t.absence.vacation || 0), '#0C8599'], ['sick', (t.absence.sick || 0), '#C2255C'], ['other', (t.absence.timeoff || 0) + (t.absence.other || 0), '#868E96']].filter((x) => x[1] > 0).map(([k, v, c]) => `<i style="flex:${v};background:${c}" title="${k}: ${h1(v)}"></i>`).join('')}</div>
        <div class="legend">${[[T('Approved', 'Godkjent'), '#2F9E44'], [T('Pending', 'Venter'), '#F08C00'], [T('Holiday', 'Ferie'), '#0C8599'], [T('Sick', 'Syk'), '#C2255C'], [T('Other absence', 'Annet fravær'), '#868E96']].map(([l, c]) => `<span><i class="pdot" style="--c:${c}"></i> ${l}</span>`).join('')}</div>
        ${Object.keys(byDay).length ? `<div class="table-wrap"><table class="table day-t"><thead><tr><th>${T('Date', 'Dato')}</th><th>${T('Type', 'Type')}</th><th>${T('Time', 'Tid')}</th><th class="num">${T('Hours', 'Timer')}</th><th class="num">${T('Planned', 'Planlagt')}</th><th class="num">${T('Supplements', 'Tillegg')}</th><th class="num">${T('Pay', 'Lønn')}</th><th>${T('Status', 'Status')}</th>${mgr ? '<th></th>' : ''}</tr></thead><tbody>
          ${Object.keys(byDay).sort().map((d) => byDay[d].map((e, i) => { const [label, icon, color] = ty[e.type]; const s = st[e.status] || ['badge-gray', e.status];
            const locked = api.time.locked(loc(), e.date);
            return `<tr class="${e.status === 'rejected' ? 'struck' : ''}"><td class="nowrap">${i === 0 ? K.fmtDay(e.date, 'short') : ''}</td>
              <td><span class="kv" style="--c:${color}">${ic(icon, 12)} ${label}</span>${e.unscheduled ? ` <span class="badge badge-gray">${T('unscheduled', 'ikke planlagt')}</span>` : ''}${e.lateMin > 5 ? ` <span class="badge badge-red">+${e.lateMin} min</span>` : ''}${e.edited ? ` <span class="badge badge-gray">${T('edited', 'endret')}</span>` : ''}</td>
              <td class="nowrap small">${e.kind === 'worked' ? `${e.start}–${e.end || '…'}` : (e.paid ? T('paid', 'betalt') : T('unpaid', 'ubetalt'))}</td>
              <td class="num"><b>${h1(e.hours)}</b></td><td class="num muted">${e.plannedHours ? h1(e.plannedHours) : '—'}</td><td class="num small">${e.supplementNok ? nok(e.supplementNok) : '—'}</td><td class="num">${e.pay ? nok(e.pay) : '—'}</td>
              <td><span class="badge ${s[0]}">${s[1]}</span>${e.rejectReason ? `<br><span class="small muted">${esc(e.rejectReason)}</span>` : ''}${e.note ? `<br><span class="small muted">📝 ${esc(e.note)}</span>` : ''}</td>
              ${mgr ? `<td class="nowrap">${e.kind === 'worked' && !locked ? (e.status === 'submitted' ? `<button class="icon-btn" title="${T('Approve', 'Godkjenn')}" data-action="approveOne" data-id="${e.id}">${ic('check', 16)}</button><button class="icon-btn" title="${T('Reject', 'Avvis')}" data-action="rejectPunch" data-id="${e.id}">${ic('x', 16)}</button><button class="icon-btn" title="${T('Edit', 'Rediger')}" data-action="editPunch" data-id="${e.id}">${ic('edit', 16)}</button>`
                : e.status === 'rejected' ? `<button class="btn btn-sm btn-ghost" data-action="reopenPunch" data-id="${e.id}">${T('Reopen', 'Gjenåpne')}</button>` : '') : locked ? `<span class="small muted">${ic('lock', 13)}</span>` : ''}</td>` : ''}</tr>`; }).join('')).join('')}
        </tbody></table></div>` : K.empty('clock', T('No hours in this period', 'Ingen timer i perioden'))}
      </section>`;
    };

    const showDetail = !mgr || userId;
    return `<div class="page-w wide">
      ${head(T('Hours report', 'Timerapport'), mgr ? T('Every hour per person and period: planned, worked (approved, pending, rejected) and absence by type.', 'Alle timer per person og periode: planlagt, arbeidet (godkjent, venter, avvist) og fravær etter type.') : T('Your hours for any period, by type.', 'Timene dine for valgfri periode, etter type.'), right)}
      ${periodBar('rep', ui)}
      <p class="small muted period-label">${ic('calendar', 14)} ${K.fmtDay(from, 'short')} – ${K.fmtDay(to, 'short')} · ${esc((api.catalog.location(loc()) || {}).name)}${lockedUntil ? ` · ${ic('lock', 13)} ${T('Locked until', 'Låst til')} ${K.fmtDay(lockedUntil, 'short')}` : ''}</p>
      ${filterChips}
      ${kpis}
      ${showDetail ? (mgr ? `<button class="back" data-action="repPerson" data-id="">${ic('back', 16)} ${T('All employees', 'Alle ansatte')}</button>` : '') + data.map(detail).join('') : overview()}
      ${mgr ? `<section class="card lock-card"><div class="row-between"><div><h2 class="h3">${ic('lock', 18)} ${T('Close the pay period', 'Lukk lønnsperioden')}</h2><p class="small muted">${T('After closing, hours on or before this date cannot be approved, rejected or edited. Do it after the payroll export.', 'Etter lukking kan timer til og med denne datoen ikke godkjennes, avvises eller endres. Gjør det etter lønnseksporten.')}</p></div>
        <form class="row" data-form="lockPeriod"><label class="sr-only" for="lockUntil">${T('Lock until', 'Lås til')}</label><input id="lockUntil" class="input input-sm" type="date" name="until" value="${lockedUntil || to}"><button class="btn btn-sm btn-dark">${ic('lock', 14)} ${T('Lock', 'Lås')}</button>${lockedUntil ? `<button type="button" class="btn btn-sm btn-ghost" data-action="unlockPeriod">${T('Unlock', 'Lås opp')}</button>` : ''}</form></div></section>` : ''}
      <p class="small muted">${T('Absence hours use the planned shift that day, or contract hours ÷ 5 on weekdays. Which absence is paid is set per client (provisional).', 'Fraværstimer bruker planlagt vakt den dagen, eller avtalte timer ÷ 5 på hverdager. Hvilket fravær som er betalt settes per kunde (foreløpig).')}</p>
    </div>`;
  }

  function manualSheet(userId) {
    const u = api.people.get(userId);
    return `<form data-form="saveManual" class="admin-sheet">${K.sheetHead(T('Add missing hours', 'Legg til manglende timer'), esc(u.name))}
      <input type="hidden" name="userId" value="${esc(userId)}">
      <div class="grid-2"><div><label class="field-label" for="mDate">${T('Date', 'Dato')}</label><input id="mDate" class="input" type="date" name="date" value="${W.addDays(W.today(), -1)}" max="${W.today()}" required></div>
        <div><label class="field-label" for="mBreak">${T('Unpaid break (min)', 'Ubetalt pause (min)')}</label><input id="mBreak" class="input" type="number" name="breakMin" value="30" min="0" step="5"></div>
        <div><label class="field-label" for="mIn">${T('In', 'Inn')}</label><input id="mIn" class="input" type="time" name="in" value="16:00" required></div>
        <div><label class="field-label" for="mOut">${T('Out', 'Ut')}</label><input id="mOut" class="input" type="time" name="out" value="22:30" required></div>
        <div class="full"><label class="field-label" for="mNote">${T('Reason', 'Årsak')}</label><input id="mNote" class="input" name="note" placeholder="${T('e.g. forgot to clock out', 'f.eks. glemte å stemple ut')}" required></div></div>
      <label class="opt"><input type="checkbox" name="approve" checked><span>${T('Approve right away', 'Godkjenn med en gang')}</span></label>
      <p class="small muted">${T('Logged with your name (audit trail).', 'Logges med navnet ditt (revisjonsspor).')}</p>
      <button class="btn btn-primary btn-block">${T('Save hours', 'Lagre timer')}</button></form>`;
  }
  function rejectSheet(id) {
    return `<form data-form="saveReject" class="confirm-box"><input type="hidden" name="id" value="${esc(id)}">
      <p class="h3">${T('Reject these hours?', 'Avvise disse timene?')}</p><p class="small muted">${T('They will not count for pay. The employee is notified with your reason.', 'De telles ikke med i lønn. Den ansatte får varsel med begrunnelsen din.')}</p>
      <label class="field-label" for="rjReason">${T('Reason', 'Begrunnelse')}</label><input id="rjReason" class="input" name="reason" required placeholder="${T('e.g. not at work / duplicate punch', 'f.eks. ikke på jobb / dobbel stempling')}">
      <div class="row"><button class="btn btn-dark btn-grow">${T('Reject', 'Avvis')}</button><button type="button" class="btn btn-ghost" data-action="closeModal">${T('Cancel', 'Avbryt')}</button></div></form>`;
  }

  // ================= LABOUR COST & FORECAST =================
  function labor() {
    const ui = uiOf('lab');
    const view = ui.view || 'week';
    const base = ui.anchor || W.today();
    let from, to;
    if (view === 'day') { from = to = base; }
    else if (view === 'month') { const [y, m] = base.split('-').map(Number); from = W.dayKey(new Date(y, m - 1, 1)); to = W.dayKey(new Date(y, m, 0)); }
    else { from = W.monday(base); to = W.addDays(from, 6); }
    const loaded = !!ui.loaded;
    const r = api.labor.period(loc(), from, to, { loaded });
    const t = r.totals, target = r.target;
    const mon = W.monday(base);
    const budget = api.labor.budget(loc(), mon);
    const budgetCost = view === 'week' ? r.totals.plannedCost : api.labor.period(loc(), mon, W.addDays(mon, 6), { loaded }).totals.plannedCost;
    const selDay = ui.day && ui.day >= from && ui.day <= to ? ui.day : (W.today() >= from && W.today() <= to ? W.today() : from);
    const hours = api.labor.hourly(loc(), selDay);
    const status = (p) => (p == null ? '' : p > target + 2 ? 'bad' : p > target ? 'warn' : 'good');
    const title = view === 'day' ? K.fmtDay(from) : view === 'month' ? new Date(from + 'T12:00').toLocaleDateString(App.i18n.locale(), { month: 'long', year: 'numeric' }) : `${T('Week', 'Uke')} ${W.isoWeek(from)} · ${K.fmtDay(from, 'short')} – ${K.fmtDay(to, 'short')}`;
    const maxCost = Math.max(1, ...r.rows.map((x) => Math.max(x.plannedCost, x.actualCost, x.forecast * target / 100)));

    return `<div class="page-w wide">
      ${head(T('Labour cost & forecast', 'Lønnskostnad og prognose'), T('Plan staffing against expected sales and follow up actual cost every day.', 'Planlegg bemanning mot forventet salg og følg opp faktisk kostnad hver dag.'),
        `<div class="row">${App.views.posImportButton ? App.views.posImportButton() : ''}<label class="opt tog"><input type="checkbox" data-change="labLoaded" ${loaded ? 'checked' : ''}><span>${T('Incl. employer costs', 'Inkl. arbeidsgiverkostnader')} <span class="small muted">(+${Math.round((api.labor.loadFactor() - 1) * 100)} %)</span></span></label></div>`)}
      <div class="rota-bar">
        <div class="row"><button class="icon-btn bordered" data-action="labNav" data-d="-1" aria-label="${T('Previous', 'Forrige')}">${ic('back', 18)}</button>
          <div class="rota-title"><b>${esc(title)}</b><span class="small muted">${esc((api.catalog.location(loc()) || {}).name)}</span></div>
          <button class="icon-btn bordered" data-action="labNav" data-d="1" aria-label="${T('Next', 'Neste')}">${ic('arrow', 18)}</button>
          <button class="btn btn-ghost btn-sm" data-action="labNav" data-d="0">${T('Today', 'I dag')}</button></div>
        <div class="seg seg-sm">${[['day', T('Day', 'Dag')], ['week', T('Week', 'Uke')], ['month', T('Month', 'Måned')]].map(([k, l]) => `<button class="${view === k ? 'on' : ''}" data-action="labView" data-v="${k}">${l}</button>`).join('')}</div>
      </div>

      <div class="kpis lab-kpis">
        <div class="kpi"><span class="small muted">${T('Forecast sales', 'Prognose salg')}</span><b>${nok(t.forecast)}</b>${t.actual != null ? `<span class="small ${t.salesVariancePct < 0 ? 'red' : 'green'}">${T('Actual', 'Faktisk')} ${nok(t.actual)} (${t.salesVariancePct > 0 ? '+' : ''}${t.salesVariancePct.toFixed(1)} %)</span>` : `<span class="small muted">${T('No actual sales yet', 'Ingen faktisk salg ennå')}</span>`}</div>
        <div class="kpi ${status(t.pctPlanned)}"><span class="small muted">${T('Planned labour %', 'Planlagt lønn %')}</span><b>${pct(t.pctPlanned)}</b><span class="small muted">${T('target', 'mål')} ${target} % · ${nok(t.plannedCost)}</span></div>
        <div class="kpi ${status(t.pctActual)}"><span class="small muted">${T('Actual labour %', 'Faktisk lønn %')}</span><b>${pct(t.pctActual)}</b><span class="small muted">${nok(t.actualCostOnActualDays)} ${T('on days with sales', 'på dager med salg')}</span></div>
        <div class="kpi ${t.splhPlanned && t.splhPlanned < App.tenant.workforce.targetSplh * 0.9 ? 'warn' : ''}"><span class="small muted">${T('Sales per labour hour', 'Salg per arbeidstime')}</span><b>${nok(t.splhPlanned)}</b><span class="small muted">${T('target', 'mål')} ${nok(App.tenant.workforce.targetSplh)}</span></div>
        <div class="kpi"><span class="small muted">${T('Hours planned / clocked', 'Timer planlagt / stemplet')}</span><b>${h1(t.plannedHours)} / ${h1(t.actualHours)}</b><span class="small muted">${t.open ? t.open + ' ' + T('open shifts', 'ledige vakter') : ''}${t.drafts ? ' · ' + t.drafts + ' ' + T('drafts', 'utkast') : ''}</span></div>
        <form class="kpi budget ${budgetCost > budget ? 'bad' : 'good'}" data-form="labBudget"><span class="small muted">${T('Weekly budget', 'Ukebudsjett')} (${T('wk', 'uke')} ${W.isoWeek(mon)})</span>
          <div class="row nowrap"><label class="sr-only" for="labBudgetIn">${T('Budget', 'Budsjett')}</label><input id="labBudgetIn" class="input input-sm input-num" type="number" name="nok" value="${budget}" min="0" step="1000"><button class="btn btn-sm btn-ghost">${T('Save', 'Lagre')}</button></div>
          <span class="meter"><span style="width:${Math.min(100, budgetCost / (budget || 1) * 100)}%;background:${budgetCost > budget ? 'var(--red)' : 'var(--green)'}"></span></span>
          <span class="small muted">${nok(budgetCost)} ${T('planned', 'planlagt')} · ${budgetCost > budget ? T('over by', 'over med') + ' ' + nok(budgetCost - budget) : T('left', 'igjen') + ' ' + nok(budget - budgetCost)}</span></form>
      </div>

      ${view !== 'day' ? `<section class="card"><div class="row-between"><h2 class="h3">${ic('chart', 18)} ${T('Labour cost vs. sales', 'Lønnskostnad mot salg')}</h2>
        <div class="legend"><span><i class="leg-sq" style="background:var(--c-shifts)"></i> ${T('Planned cost', 'Planlagt kostnad')}</span><span><i class="leg-sq" style="background:#2F9E44"></i> ${T('Actual cost', 'Faktisk kostnad')}</span><span><i class="leg-line"></i> ${T('Target', 'Mål')} ${target} % ${T('of forecast', 'av prognose')}</span></div></div>
        <div class="lab-chart ${r.rows.length > 10 ? 'dense' : ''}">${r.rows.map((x) => `<button class="lab-col ${x.day === selDay ? 'on' : ''}" data-action="labDay" data-d="${x.day}" title="${K.fmtDay(x.day, 'short')}">
          <div class="lab-bars"><i class="b-target" style="bottom:${x.forecast * target / 100 / maxCost * 100}%"></i><i class="b-plan" style="height:${x.plannedCost / maxCost * 100}%"></i><i class="b-act" style="height:${x.actualCost / maxCost * 100}%"></i></div>
          <b class="small ${status(x.pctActual != null ? x.pctActual : x.pctPlanned)}">${Math.round(x.pctActual != null ? x.pctActual : x.pctPlanned)}%</b><span class="small muted">${r.rows.length > 10 ? K.fmtDay(x.day, 'num') : K.fmtDay(x.day, 'wd')}</span></button>`).join('')}</div>
        <p class="small muted">${T('Tap a day to see it hour by hour. % shows actual when sales are in, otherwise planned.', 'Trykk på en dag for å se den time for time. % viser faktisk når salget er registrert, ellers planlagt.')}</p></section>` : ''}

      <section class="card">
        <div class="row-between"><h2 class="h3">${ic('clock', 18)} ${T('Hour by hour', 'Time for time')} · ${K.fmtDay(selDay)}</h2>
          <div class="legend"><span><i class="leg-sq" style="background:#DEE2E6"></i> ${T('Recommended', 'Anbefalt')}</span><span><i class="leg-sq" style="background:var(--c-shifts)"></i> ${T('Planned', 'Planlagt')}</span><span><i class="leg-dot"></i> ${T('Clocked in', 'Stemplet inn')}</span></div></div>
        <div class="hr-chart">${hours.map((x) => { const mx = Math.max(6, ...hours.map((y) => Math.max(y.recommended, y.planned, y.clocked)));
          return `<div class="hr-col ${x.gap < 0 ? 'under' : x.gap > 1 ? 'over' : ''}" title="${String(x.hour).padStart(2, '0')}:00 · ${nok(x.sales)}">
            <span class="small hr-gap">${x.gap < 0 ? x.gap : x.gap > 0 ? '+' + x.gap : '✓'}</span>
            <div class="hr-bars"><i class="hr-rec" style="height:${x.recommended / mx * 100}%"></i><i class="hr-plan" style="height:${x.planned / mx * 100}%"></i>${x.clocked ? `<i class="hr-clock" style="bottom:${x.clocked / mx * 100}%"></i>` : ''}</div>
            <b class="small">${x.planned}/${x.recommended}</b><span class="small muted">${String(x.hour).padStart(2, '0')}</span><span class="tiny muted">${Math.round(x.sales / 1000)}k</span></div>`; }).join('')}</div>
        <p class="small muted">${T('Planned / recommended staff each hour. Recommended = forecast sales that hour ÷ target sales per labour hour', 'Planlagt / anbefalt bemanning hver time. Anbefalt = prognose salg den timen ÷ mål for salg per arbeidstime')} (${nok(App.tenant.workforce.targetSplh)}), ${T('minimum', 'minimum')} ${App.tenant.workforce.minStaffPerHour}. <span class="red">${T('Red = understaffed', 'Rødt = underbemannet')}</span> · <span class="amber">${T('Amber = 2+ extra people', 'Gult = 2+ ekstra personer')}</span>. <a class="link" href="#/staff/shifts/rota" data-action="openRotaDay" data-d="${selDay}">${T('Open in rota', 'Åpne i vaktplan')} ${ic('arrow', 14)}</a></p>
      </section>

      <section class="card"><h2 class="h3">${ic('week', 18)} ${T('Day by day', 'Dag for dag')}</h2>
        <div class="table-wrap"><table class="table lab-t"><thead><tr><th>${T('Day', 'Dag')}</th><th class="num">${T('Forecast sales', 'Prognose')}</th><th class="num">${T('Actual sales', 'Faktisk salg')}</th><th class="num">${T('Hours plan / actual', 'Timer plan / faktisk')}</th><th class="num">${T('Cost planned', 'Kostnad plan')}</th><th class="num">${T('Cost actual', 'Kostnad faktisk')}</th><th class="num">${T('Labour % plan', 'Lønn % plan')}</th><th class="num">${T('Labour % actual', 'Lønn % faktisk')}</th><th class="num">SPLH</th></tr></thead>
        <tbody>${r.rows.map((x) => `<tr class="${x.day === selDay ? 'sel' : ''} ${x.day === W.today() ? 'today' : ''}">
          <td class="nowrap"><button class="link" data-action="labDay" data-d="${x.day}">${K.fmtDay(x.day, 'short')}</button>${W.holiday(x.day) ? ` <span class="badge badge-red" title="${esc(L(W.holiday(x.day).name))}">${T('Holiday', 'Helligdag')}</span>` : ''}${x.open ? ` <span class="badge badge-amber">${x.open} ${T('open', 'ledige')}</span>` : ''}${x.drafts ? ` <span class="badge badge-gray">${T('draft', 'utkast')}</span>` : ''}</td>
          <td class="num"><form data-form="labForecast" class="cell-form"><input type="hidden" name="day" value="${x.day}"><label class="sr-only" for="fc${x.day}">${T('Forecast', 'Prognose')}</label><input id="fc${x.day}" class="input input-sm input-num ${x.forecastEdited ? 'edited' : ''}" type="number" name="nok" value="${x.forecast}" step="500" min="0" data-change="labCell" data-kind="forecast" data-day="${x.day}"></form></td>
          <td class="num">${x.past || x.day === W.today() ? `<label class="sr-only" for="ac${x.day}">${T('Actual sales', 'Faktisk salg')}</label><input id="ac${x.day}" class="input input-sm input-num" type="number" value="${x.actual != null ? x.actual : ''}" placeholder="—" step="100" min="0" data-change="labCell" data-kind="actual" data-day="${x.day}">` : '<span class="muted">—</span>'}</td>
          <td class="num">${h1(x.plannedHours)} / ${x.actualHours ? h1(x.actualHours) : '—'}</td>
          <td class="num">${nok(x.plannedCost)}</td><td class="num">${x.actualCost ? nok(x.actualCost) : '—'}</td>
          <td class="num"><span class="pct ${status(x.pctPlanned)}">${pct(x.pctPlanned)}</span></td><td class="num"><span class="pct ${status(x.pctActual)}">${pct(x.pctActual)}</span></td>
          <td class="num">${x.splhPlanned ? nok(x.splhPlanned) : '—'}${x.splhActual ? `<br><span class="small muted">${nok(x.splhActual)}</span>` : ''}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td><b>${T('Total', 'Totalt')}</b></td><td class="num"><b>${nok(t.forecast)}</b></td><td class="num"><b>${t.actual != null ? nok(t.actual) : '—'}</b></td><td class="num">${h1(t.plannedHours)} / ${h1(t.actualHours)}</td><td class="num"><b>${nok(t.plannedCost)}</b></td><td class="num"><b>${nok(t.actualCost)}</b></td><td class="num"><b>${pct(t.pctPlanned)}</b></td><td class="num"><b>${pct(t.pctActual)}</b></td><td class="num">${nok(t.splhPlanned)}</td></tr></tfoot></table></div>
        <p class="small muted">${T('Forecast: edit any day (events, weather, holidays) — your figure replaces the automatic one. Actual sales come from the till when connected; until then type them in.', 'Prognose: endre hvilken som helst dag (arrangementer, vær, helligdager) — tallet ditt erstatter det automatiske. Faktisk salg kommer fra kassen når den er koblet til; inntil da skriver du det inn.')}</p></section>

      <section class="card"><h2 class="h3">${ic('users', 18)} ${T('By position', 'Per stilling')}</h2>
        <div class="table-wrap"><table class="table"><thead><tr><th>${T('Position', 'Stilling')}</th><th class="num">${T('Shifts', 'Vakter')}</th><th class="num">${T('Hours planned', 'Timer planlagt')}</th><th class="num">${T('Hours clocked', 'Timer stemplet')}</th><th class="num">${T('Cost planned', 'Kostnad plan')}</th><th class="num">${T('Cost actual', 'Kostnad faktisk')}</th><th class="num">${T('Share of cost', 'Andel av kostnad')}</th></tr></thead>
        <tbody>${r.byPosition.map((p) => `<tr><td>${posDot(p.positionId)} ${esc(posName(p.positionId))}</td><td class="num">${p.shifts}</td><td class="num">${h1(p.plannedHours)}</td><td class="num">${h1(p.actualHours)}</td><td class="num">${nok(p.plannedCost)}</td><td class="num">${nok(p.actualCost)}</td>
          <td class="num"><span class="share"><i style="width:${t.plannedCost ? p.plannedCost / t.plannedCost * 100 : 0}%;background:${api.people.position(p.positionId).color}"></i></span> ${t.plannedCost ? Math.round(p.plannedCost / t.plannedCost * 100) : 0} %</td></tr>`).join('') || '<tr><td colspan="7" class="muted">—</td></tr>'}</tbody></table></div></section>

      <p class="small muted">${T('Costs include evening/weekend supplements and overtime.', 'Kostnadene inkluderer kvelds-/helgetillegg og overtid.')} ${loaded ? T('Employer costs added', 'Arbeidsgiverkostnader lagt til') + `: ${T('holiday pay', 'feriepenger')} ${App.tenant.workforce.employerCost.holidayPayPct} % + ${T('payroll tax', 'arbeidsgiveravgift')} ${App.tenant.workforce.employerCost.payrollTaxPct} % (${T('provisional', 'foreløpig')}).` : ''} ${T('Sales figures in this demo are sample data.', 'Salgstallene i denne demoen er eksempeldata.')}</p>
    </div>`;
  }

  // ---------- CSV ----------
  function download(name, text) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv' })); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ---------- actions ----------
  const re = (msg) => { if (msg) app.toast(msg); app.render(); };
  Object.assign(App.actions, {
    setPreset(d) { const ui = uiOf(d.key); ui.preset = d.p; if (d.p !== 'custom') ui.custom = null; else ui.custom = ui.custom || range('week'); re(); },
    repFilter(d) { const ui = uiOf('rep'); if (!d.k) ui.filters = []; else { const f = ui.filters = ui.filters || []; const i = f.indexOf(d.k); if (i >= 0) f.splice(i, 1); else f.push(d.k); } re(); },
    repPerson(d) { uiOf('rep').userId = d.id || ''; re(); window.scrollTo(0, 0); },
    addManual(d) { app.modal(manualSheet(d.id)); },
    rejectPunch(d) { app.modal(rejectSheet(d.id), 'sheet-sm'); },
    reopenPunch(d) { api.time.reopen(d.id); re(T('Hours reopened for review', 'Timer gjenåpnet for vurdering')); },
    approvePerson(d) { const [from, to] = range(uiOf('rep').preset || 'week', uiOf('rep').custom); const ids = App.store.db.punches.filter((p) => p.userId === d.id && p.status === 'submitted' && p.date >= from && p.date <= to).map((p) => p.id); if (ids.length) api.time.approve(ids); re(T(ids.length + ' timesheets approved', ids.length + ' timelister godkjent')); },
    unlockPeriod() { api.time.lockPeriod(loc(), null); re(T('Period unlocked', 'Perioden er låst opp')); },
    repExport(d) {
      const rows = api.hours.report({ userId: isMgr() ? uiOf('rep').userId || undefined : undefined, locationId: loc(), from: d.from, to: d.to });
      const head = ['employee_no', 'name', 'date', 'type', 'status', 'start', 'end', 'hours', 'planned_hours', 'supplements_nok', 'overtime_hours', 'pay_nok', 'note'];
      const lines = []; rows.forEach((p) => p.entries.forEach((e) => lines.push([p.user.employeeNo || '', p.user.name, e.date, e.type, e.status, e.start || '', e.end || '', e.hours.toFixed(2), (e.plannedHours || 0).toFixed(2), (e.supplementNok || 0).toFixed(2), (e.overtimeHours || 0).toFixed(2), (e.pay || 0).toFixed(2), e.rejectReason || e.note || ''])));
      download(`hours_${loc()}_${d.from}_${d.to}.csv`, [head].concat(lines).map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n'));
      app.toast(T('CSV downloaded', 'CSV lastet ned'));
    },
    labView(d) { uiOf('lab').view = d.v; re(); },
    labNav(d) {
      const ui = uiOf('lab'); const n = Number(d.d); const v = ui.view || 'week'; const base = ui.anchor || W.today();
      if (n === 0) ui.anchor = W.today();
      else if (v === 'day') ui.anchor = W.addDays(base, n);
      else if (v === 'week') ui.anchor = W.addDays(base, 7 * n);
      else { const [y, m] = base.split('-').map(Number); ui.anchor = W.dayKey(new Date(y, m - 1 + n, 1)); }
      ui.day = null; re();
    },
    labDay(d) { const ui = uiOf('lab'); ui.day = d.d; if ((ui.view || 'week') === 'day') ui.anchor = d.d; re(); },
    openRotaDay(d) { app.ui.rotaWeek = W.monday(d.d); app.ui.rotaDay = d.d; app.ui.rotaView = 'day'; app.go('#/staff/shifts/rota'); },
  });
  Object.assign(App.changes, {
    repUser(el) { uiOf('rep').userId = el.value; re(); },
    labLoaded(el) { uiOf('lab').loaded = el.checked; re(); },
    labCell(el) {
      if (el.dataset.kind === 'forecast') api.labor.setForecast(loc(), el.dataset.day, el.value);
      else api.labor.setActual(loc(), el.dataset.day, el.value);
      re(T('Saved', 'Lagret'));
    },
  });
  Object.assign(App.forms, {
    customRange(data) { const ui = uiOf(data.key); ui.preset = 'custom'; ui.custom = [data.from, data.to]; re(); },
    saveManual(data) { api.time.addManual({ userId: data.userId, date: data.date, in: data.in, out: data.out, breakMin: data.breakMin, note: data.note, approve: !!data.approve }); app.modal(null); re(T('Hours added', 'Timer lagt til')); },
    saveReject(data) { api.time.reject(data.id, data.reason); app.modal(null); re(T('Hours rejected — employee notified', 'Timer avvist — den ansatte er varslet')); },
    lockPeriod(data) { if (!data.until) return; api.time.lockPeriod(loc(), data.until); re(T('Pay period locked until ', 'Lønnsperioden er låst til ') + K.fmtDay(data.until, 'short')); },
    labBudget(data) { api.labor.setBudget(loc(), W.monday(uiOf('lab').anchor || W.today()), data.nok); re(T('Budget saved', 'Budsjett lagret')); },
    labForecast(data) { api.labor.setForecast(loc(), data.day, data.nok); re(T('Saved', 'Lagret')); },
  });

  const R = app.route;
  R('/staff/shifts/report', 'staff', guard(report));
  R('/staff/shifts/labor', 'staff', guard(labor, 'admin'));
})();
