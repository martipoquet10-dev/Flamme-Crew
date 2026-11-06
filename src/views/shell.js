/*
 * App shell: the three areas (In store · Schedule · Community) + manager area,
 * sign-in, home dashboard, store hub, menu & allergens, notifications, profile
 * and the white-label settings page.
 */
(function () {
  const U = App.util, K = App.kit, W = App.wf;
  const { esc, L } = U;
  const T = K.T;
  const ic = App.art.icon;
  const api = App.api, app = App.app;
  const t = (k, v) => App.i18n.t(k, v);
  const tn = () => App.tenant;
  const sec = (k) => tn().sections[k];
  const loc = () => App.views.staffLocation();

  // ---------- navigation model ----------
  function navModel() {
    const m = K.mod, admin = api.auth.hasRole('admin');
    const S = (k) => sec(k).enabled !== false;
    const groups = [];
    if (S('store')) groups.push({ id: 'store', items: [
      ['#/staff/store', T('Overview', 'Oversikt'), 'store', true],
      m('prep') && ['#/staff/prep', t('staff.prep'), 'clock'],
      m('checklists') && ['#/staff/checklists', t('staff.checklists'), 'check'],
      m('inventory') && ['#/staff/inventory', t('inv.nav'), 'clipboard'],
      m('guides') && ['#/staff/guides', t('staff.guides'), 'book'],
      m('menu') && ['#/staff/menu', T('Menu & allergens', 'Meny og allergener'), 'menu'],
      m('assistant') && ['#/staff/assistant', T('AI assistant', 'AI-assistent'), 'bot'],
      m('emergency') && ['#/staff/emergency', T('Emergency', 'Nødsituasjon'), 'alert'],
      m('scan') && ['#/staff/scan', t('staff.scan'), 'gift'],
    ].filter(Boolean) });
    if (S('shifts')) groups.push({ id: 'shifts', items: [
      m('myShifts') && ['#/staff/shifts', T('My shifts', 'Mine vakter'), 'calendar', true],
      m('rota') && ['#/staff/shifts/rota', T('Rota', 'Vaktplan'), 'week'],
      m('timeclock') && ['#/staff/shifts/clock', T('Time clock', 'Stemple'), 'clock'],
      m('openShifts') && ['#/staff/shifts/open', T('Open shifts', 'Ledige vakter'), 'plusCircle'],
      m('swaps') && ['#/staff/shifts/swaps', T('Swaps', 'Bytte'), 'swap'],
      m('leave') && ['#/staff/shifts/leave', T('Leave', 'Fravær'), 'beach'],
      m('availability') && ['#/staff/shifts/availability', T('Availability', 'Tilgjengelighet'), 'sliders'],
      m('timesheets') && ['#/staff/shifts/hours', T('Timesheets', 'Timelister'), 'wallet'],
      m('timesheets') && ['#/staff/shifts/report', T('Hours report', 'Timerapport'), 'list'],
      admin && m('labor') && ['#/staff/shifts/labor', T('Labour & forecast', 'Lønn og prognose'), 'chart', false, 'mgr'],
      admin && ['#/staff/shifts/approvals', T('Approvals', 'Godkjenninger'), 'check', false, 'mgr'],
      admin && m('payroll') && ['#/staff/shifts/payroll', T('Payroll export', 'Lønnseksport'), 'download', false, 'mgr'],
    ].filter(Boolean) });
    if (S('community')) groups.push({ id: 'community', items: [
      m('feed') && ['#/staff/community', T('News', 'Nyheter'), 'megaphone', true],
      m('chat') && ['#/staff/community/chat', T('Chat', 'Chat'), 'chat'],
      m('events') && ['#/staff/community/events', T('Events', 'Arrangementer'), 'calendar'],
      m('learning') && ['#/staff/community/learning', T('Training', 'Opplæring'), 'grad'],
      m('docs') && ['#/staff/community/docs', T('Handbook', 'Håndbok'), 'doc'],
      m('surveys') && ['#/staff/community/surveys', T('Surveys', 'Undersøkelser'), 'poll'],
      m('kudos') && ['#/staff/community/kudos', T('Kudos', 'Ros'), 'heart'],
      m('directory') && ['#/staff/community/people', T('Colleagues', 'Kolleger'), 'users'],
    ].filter(Boolean) });
    if (admin) groups.push({ id: 'manager', items: [
      ['#/admin', T('Overview', 'Oversikt'), 'chart', true],
      ['#/admin/products', T('Menu & allergens', 'Meny og allergener'), 'menu'],
      ['#/admin/docs', T('Guides & AI sources', 'Guider og AI-kilder'), 'book'],
      ['#/admin/prep', T('Prep settings', 'Forberedelsesoppsett'), 'clipboard'],
      ['#/admin/users', T('Users & roles', 'Brukere og roller'), 'user'],
      ['#/admin/settings', T('App settings', 'Appinnstillinger'), 'sliders'],
    ] });
    return groups;
  }
  const groupMeta = (id) => id === 'manager'
    ? { label: T('Manager', 'Leder'), color: '#495057', icon: 'shield', soft: '#EEF0F2' }
    : { label: L(sec(id).label), color: sec(id).color, icon: sec(id).icon, soft: sec(id).soft };

  function sectionOf(path) {
    if (path.startsWith('/admin')) return 'manager';
    if (path.startsWith('/staff/shifts')) return 'shifts';
    if (path.startsWith('/staff/community')) return 'community';
    if (path === '/staff' || path === '/' || path === '/staff/me') return 'home';
    return 'store';
  }
  function activeHref(items, path) {
    let p = '#' + path;
    const alias = [['#/staff/community/post/', '#/staff/community'], ['#/staff/community/course/', '#/staff/community/learning'], ['#/staff/community/doc/', '#/staff/community/docs'], ['#/staff/community/survey/', '#/staff/community/surveys']];
    alias.forEach(([a, b]) => { if (p.startsWith(a)) p = b; });
    let best = null;
    items.forEach(([h, , , exact]) => {
      const alias = h === '#/staff/guides' && p.startsWith('#/staff/guide/') ? true : h === '#/staff/menu' && p.startsWith('#/staff/menu');
      if (p === h || alias || (!exact && p.startsWith(h + '/')) || (!exact && p === h)) { if (!best || h.length > best.length) best = h; }
    });
    return best;
  }

  // ---------- badges ----------
  function badges() {
    const b = {};
    try {
      b['#/staff/community/chat'] = api.chat.unreadTotal();
      b['#/staff/community'] = api.feed.unreadMustRead().length;
      b['#/staff/community/learning'] = api.learning.mandatoryOpen().length;
      b['#/staff/shifts/swaps'] = api.requests.incoming().length;
      b['#/staff/shifts/open'] = api.shifts.open(loc()).length;
      if (api.auth.hasRole('admin')) b['#/staff/shifts/approvals'] = api.requests.forManager().length + api.leave.all().filter((l) => l.status === 'pending').length;
      b['#/staff/community/surveys'] = api.surveys.list().filter((s) => !api.surveys.answered(s.id) && new Date(s.closesAt) > new Date()).length;
    } catch (e) { /* not signed in */ }
    return b;
  }
  const badge = (n, cls) => (n ? `<span class="nbadge ${cls || ''}">${n > 99 ? '99+' : n}</span>` : '');

  // ---------- layout ----------
  function layout(content, r) {
    const u = api.auth.me();
    const signedIn = api.auth.hasRole('staff');
    if (!signedIn) return `<div class="demo-strip">${ic('lock', 14)} ${T('Demo version · sample data', 'Demoversjon · eksempeldata')}</div>${content}`;
    const path = r.path;
    const section = sectionOf(path);
    const groups = navModel();
    const bd = badges();
    const sectionTotal = (g) => g.items.reduce((s, [h]) => s + (h === '#/staff/shifts/open' ? 0 : bd[h] || 0), 0);
    const group = groups.find((g) => g.id === section);
    const act = group ? activeHref(group.items, path) : null;
    const active = punchPill();
    const unreadN = api.notifications.unread();
    const meta = section === 'home' ? null : groupMeta(section);
    const sectionBar = group ? `<div class="secbar" style="--sc:${meta.color};--ss:${meta.soft}">
        <div class="secbar-top"><span class="secbar-ic">${ic(meta.icon, 18)}</span><b>${esc(meta.label)}</b>${section !== 'manager' ? `<span class="secbar-sub small">${esc(L(sec(section).sub))}</span>` : ''}</div>
        <nav class="subtabs" aria-label="${esc(meta.label)}">${group.items.map(([h, label, i, , flag]) => `<a href="${h}" class="${h === act ? 'on' : ''}">${ic(i, 16)}<span>${esc(label)}</span>${flag === 'mgr' ? `<em class="mgr-dot" title="${T('Manager', 'Leder')}"></em>` : ''}${badge(bd[h])}</a>`).join('')}</nav>
      </div>` : '';
    const tabs = [['#/staff', T('Home', 'Hjem'), 'home', 'home']]
      .concat(groups.filter((g) => g.id !== 'manager').map((g) => [g.items[0][0], g.id === 'store' ? T('Store', 'Butikk') : groupMeta(g.id).label, groupMeta(g.id).icon, g.id, sectionTotal(g)]))
      .concat(K.mod('assistant') && sec('store').enabled !== false ? [['#/staff/assistant', 'AI', 'bot', 'ai']] : []);
    const tabOn = (k) => (k === 'ai' ? path === '/staff/assistant' : k === section && !(k === 'store' && path === '/staff/assistant'));
    return `
      ${App.config.app.demoMode ? `<div class="demo-strip">${ic('lock', 14)} ${App.sync && App.sync.live ? T('Live · shared with everyone on this server · sample data', 'Live · delt med alle på denne serveren · eksempeldata') : T('Demo version · sample data · nothing is sent to real people', 'Demoversjon · eksempeldata · ingenting sendes til ekte personer')}</div>` : ''}
      <div class="shell">
        <aside class="side">
          <a href="#/staff" class="side-brand">${App.art.logo(30, true)}<span class="side-app">${esc(tn().appName)}</span></a>
          <label class="side-loc">${ic('location', 15)}${locSelect()}</label>
          <nav class="side-nav">
            <a href="#/staff" class="side-home ${section === 'home' ? 'on' : ''}">${ic('home', 18)}<span>${T('Home', 'Hjem')}</span></a>
            ${groups.map((g) => { const gm = groupMeta(g.id); const gAct = g.id === section ? act : null; return `<div class="side-group ${g.id === section ? 'open' : ''}" style="--sc:${gm.color}">
              <a class="side-gh" href="${g.items[0][0]}"><span class="side-gic">${ic(gm.icon, 16)}</span><span>${esc(gm.label)}</span>${badge(sectionTotal(g), 'dim')}</a>
              <div class="side-items">${g.items.map(([h, label, i, , flag]) => `<a href="${h}" class="${h === gAct ? 'on' : ''}">${ic(i, 16)}<span>${esc(label)}</span>${flag === 'mgr' ? `<em class="mgr-dot"></em>` : ''}${badge(bd[h])}</a>`).join('')}</div></div>`; }).join('')}
          </nav>
          <div class="side-foot">
            <a href="#/staff/me" class="side-user">${K.avatar(u, 36)}<span><b>${esc(u.name)}</b><span class="small">${esc(L(u.title) || t('role.' + u.role))}</span></span></a>
            <div class="row-between">${App.views.langToggle()}<button class="icon-btn" data-action="staffLogout" title="${t('account.logout')}">${ic('logout', 18)}</button></div>
          </div>
        </aside>
        <div class="main-col">
          <header class="topbar">
            <a href="#/staff" class="top-brand">${App.art.logo(26)}<span>${esc(tn().appName)}</span></a>
            <div class="top-crumb">${section === 'home' ? `<b>${T('Home', 'Hjem')}</b>` : `<span class="crumb-dot" style="--sc:${meta.color}"></span><b>${esc(meta.label)}</b>`}<span class="muted small">· ${esc((api.catalog.location(loc()) || {}).name || '')}</span></div>
            <div class="top-actions">
              ${active}
              <button class="icon-btn bell" data-action="openNotifications" aria-label="${T('Notifications', 'Varsler')}">${ic('bell', 20)}${badge(unreadN)}</button>
              <a href="#/staff/me" class="top-me">${K.avatar(u, 34)}</a>
            </div>
          </header>
          ${sectionBar}
          <main class="content sec-${section}" id="main">${content}</main>
        </div>
        ${section === 'store' && K.mod('emergency') && !path.startsWith('/staff/emergency') && path !== '/staff/assistant' ? `<a href="#/staff/emergency" class="sos-btn" aria-label="${t('em.title')}">${ic('alert', 20)}<span>${t('em.sos')}</span></a>` : ''}
      </div>
      <nav class="tabbar">${tabs.map(([h, label, i, k, n]) => `<a href="${h}" class="${tabOn(k) ? 'on' : ''}" style="${k !== 'home' && k !== 'ai' ? '--tc:' + groupMeta(k).color : ''}">${ic(i, 22)}<span>${esc(label)}</span>${badge(n)}</a>`).join('')}</nav>`;
  }
  function locSelect() {
    const l = loc();
    const locs = api.catalog.locations();
    return `<select data-change="staffLoc" aria-label="${esc(L(tn().terminology.location))}">${locs.map((x) => `<option value="${x.id}" ${x.id === l ? 'selected' : ''}>${esc(x.name.replace(tn().name + ' ', ''))}</option>`).join('')}</select>`;
  }
  function punchPill() {
    if (!K.mod('timeclock')) return '';
    const p = api.time.active();
    if (!p) return `<a href="#/staff/shifts/clock" class="punch-pill off">${ic('clock', 16)}<span>${T('Clock in', 'Stemple inn')}</span></a>`;
    const br = api.time.onBreak(p);
    return `<a href="#/staff/shifts/clock" class="punch-pill ${br ? 'brk' : 'on'}"><i></i><span ${tick(p)}>${W.durText(api.time.workedMs(p))}</span><span class="hide-sm">${br ? T('on break', 'pause') : T('on shift', 'på jobb')}</span></a>`;
  }
  // live timer attributes for [data-tick]
  function tick(p) { return `data-tick="1" data-base="${api.time.workedMs(p)}" data-from="${Date.now()}" data-paused="${api.time.onBreak(p) ? 1 : 0}"`; }
  setInterval(() => {
    document.querySelectorAll('[data-tick]').forEach((el) => {
      const base = Number(el.dataset.base), from = Number(el.dataset.from);
      el.textContent = W.durText(base + (el.dataset.paused === '1' ? 0 : Date.now() - from));
    });
  }, 1000);

  // ---------- sign-in ----------
  function login() {
    const live = App.sync && App.sync.live;
    const all = live ? App.sync.accounts : api.auth.demoAccounts().filter((a) => a.role !== 'customer').map((a) => App.store.db.users.find((u) => u.id === a.id));
    const main = all.filter((u) => u.id === 'u-staff' || u.id === 'u-admin');
    const rest = all.filter((u) => !main.includes(u));
    const card = (u) => `<button class="acct" data-action="staffLogin" data-id="${u.id}">${K.avatar(u, 44)}<span><b>${esc(u.name)}</b><span class="small muted">${esc(L(u.title) || '')} · ${esc(((api.catalog.location(u.locationId) || {}).name || '').replace(tn().name + ' ', ''))}</span></span><span class="badge ${u.role === 'admin' ? 'badge-ink' : 'badge-gray'}">${u.role === 'admin' ? T('Manager', 'Leder') : T('Employee', 'Ansatt')}</span></button>`;
    return `<div class="login">
      <section class="login-brand">
        ${App.art.logo(44, true)}
        <h1 class="display-2">${esc(tn().appName)}</h1>
        <p class="lead light">${esc(L(tn().tagline))}</p>
        <ul class="login-areas">${['store', 'shifts', 'community'].filter((k) => sec(k).enabled !== false).map((k) => `<li style="--sc:${sec(k).color}"><span>${ic(sec(k).icon, 20)}</span><div><b>${esc(L(sec(k).label))}</b><p class="small">${esc(L(sec(k).sub))}</p></div></li>`).join('')}</ul>
      </section>
      <section class="login-form">
        <div class="login-box">
          <h2 class="h1">${T('Sign in', 'Logg inn')}</h2>
          <p class="muted">${live ? T('Tap your name and enter your PIN.', 'Trykk på navnet ditt og skriv inn PIN-koden.') + (App.sync.demoPin ? ` <span class="badge badge-demo">${T('First time? Use the PIN your manager gave you.', 'Første gang? Bruk PIN-koden du fikk av lederen din.')}</span>` : '')
            : T('Choose a demo account. In the live app employees sign in with their name and a personal PIN.', 'Velg en demokonto. I den ekte appen logger ansatte inn med navn og personlig PIN-kode.')}</p>
          <p class="eyebrow">${T('Recommended for the demo', 'Anbefalt for demoen')}</p>
          <div class="acct-list">${main.map(card).join('')}</div>
          <details class="more-accts"><summary>${T('All employees', 'Alle ansatte')} (${rest.length})</summary><div class="acct-list">${rest.map(card).join('')}</div></details>
          <div class="row-between">${App.views.langToggle()}<span class="small muted">${live ? `<span class="live-dot"></span> ${T('Connected to the server', 'Koblet til serveren')}` : T('Offline demo — no passwords', 'Frakoblet demo — ingen passord')}</span></div>
        </div>
      </section>
    </div>`;
  }
  App.views.login = login;

  function pinSheet(userId) {
    const u = (App.sync.accounts || []).find((a) => a.id === userId) || { name: '' };
    return `<form class="confirm-box pin-box" data-form="pinLogin"><input type="hidden" name="userId" value="${esc(userId)}">
      <div class="row">${K.avatar(u, 44)}<div><b>${esc(u.name)}</b><p class="small muted">${T('Enter your PIN', 'Skriv inn PIN-koden din')}</p></div></div>
      <input id="pinInput" class="input pin-input" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" autocomplete="current-password" required aria-label="PIN">
      <p class="small red" id="pinError" hidden></p>
      <div class="row"><button class="btn btn-primary btn-grow">${T('Sign in', 'Logg inn')}</button><button type="button" class="btn btn-ghost" data-action="closeModal">${T('Cancel', 'Avbryt')}</button></div></form>`;
  }
  function changePinSheet(userId) {
    const other = userId && userId !== api.auth.me().id;
    const u = other ? api.people.get(userId) : api.auth.me();
    return `<form class="confirm-box" data-form="savePin"><input type="hidden" name="userId" value="${other ? esc(userId) : ''}">
      <p class="h3">${other ? T('Set a new PIN for ', 'Ny PIN-kode for ') + esc(u.name) : T('Change your PIN', 'Bytt PIN-kode')}</p>
      ${other ? `<p class="small muted">${T('They will be signed out on all devices and must use the new PIN.', 'De logges ut på alle enheter og må bruke den nye PIN-koden.')}</p>` : `<label class="field-label" for="pinCur">${T('Current PIN', 'Nåværende PIN')}</label><input id="pinCur" class="input pin-input" name="current" type="password" inputmode="numeric" maxlength="8" required>`}
      <label class="field-label" for="pinNew">${T('New PIN (4–8 digits)', 'Ny PIN (4–8 sifre)')}</label><input id="pinNew" class="input pin-input" name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,8}" maxlength="8" required>
      <div class="row"><button class="btn btn-primary btn-grow">${T('Save PIN', 'Lagre PIN')}</button><button type="button" class="btn btn-ghost" data-action="closeModal">${T('Cancel', 'Avbryt')}</button></div></form>`;
  }
  const guard = (fn, role) => (params) => {
    if (api.auth.hasRole(role || 'staff')) return fn(params);
    if (api.auth.hasRole('staff')) return `<div class="page-w narrow">${K.empty('lock', T('Managers only', 'Kun for ledere'), T('Ask your manager if you need access.', 'Spør lederen din om du trenger tilgang.'), '<a class="btn btn-primary btn-sm" href="#/staff">' + T('Home', 'Hjem') + '</a>')}</div>`;
    return login();
  };
  App.views.guard = guard;

  // ---------- HOME ----------
  function greeting() { const h = new Date().getHours(); return h < 5 ? T('Good night', 'God natt') : h < 11 ? T('Good morning', 'God morgen') : h < 17 ? T('Good afternoon', 'God ettermiddag') : T('Good evening', 'God kveld'); }

  function clockCard(compact) {
    const p = api.time.active();
    const s = api.time.todaysShift() || api.shifts.next();
    const shiftLine = s ? `<span class="clk-shift">${posDot(s.positionId)} ${K.relDay(s.date)} · <b>${s.start}–${s.end}</b> · ${esc(L(api.people.position(s.positionId).name))}</span>` : `<span class="clk-shift muted">${T('No more shifts planned', 'Ingen flere planlagte vakter')}</span>`;
    if (p) {
      const br = api.time.onBreak(p);
      return `<div class="clk ${br ? 'brk' : 'on'} ${compact ? 'compact' : ''}">
        <div class="clk-l"><span class="clk-state"><i></i>${br ? T('On break', 'På pause') : T('Clocked in', 'Stemplet inn')} · ${U.fmtTime(p.in)}</span><b class="clk-time" ${tick(p)}>${W.durText(api.time.workedMs(p))}</b>${shiftLine}</div>
        <div class="clk-r"><button class="btn btn-light btn-sm" data-action="clockBreak">${ic(br ? 'play' : 'coffee', 16)} ${br ? T('End break', 'Avslutt pause') : T('Break', 'Pause')}</button><button class="btn btn-dark btn-sm" data-action="clockOut">${ic('stop', 16)} ${T('Clock out', 'Stemple ut')}</button></div></div>`;
    }
    const isToday = s && s.date === W.today();
    const startsIn = s ? Math.round((W.shiftStart(s) - new Date()) / 60000) : null;
    return `<div class="clk ${compact ? 'compact' : ''}">
      <div class="clk-l"><span class="clk-state off"><i></i>${T('Not clocked in', 'Ikke stemplet inn')}</span><b class="clk-time">${s ? (isToday ? (startsIn > 0 ? T('Starts in ', 'Starter om ') + (startsIn >= 60 ? Math.floor(startsIn / 60) + ' t ' : '') + (startsIn % 60) + ' min' : T('Shift in progress', 'Vakten har startet')) : K.relDay(s.date)) : '—'}</b>${shiftLine}</div>
      <div class="clk-r"><button class="btn btn-primary" data-action="clockIn">${ic('play', 16)} ${T('Clock in', 'Stemple inn')}</button></div></div>`;
  }
  const posDot = (posId) => `<i class="pdot" style="--c:${api.people.position(posId).color}"></i>`;
  App.views.clockCard = clockCard;
  App.views.posDot = posDot;

  function todo() {
    const u = api.auth.me(); const items = [];
    api.feed.unreadMustRead().slice(0, 3).forEach((p) => items.push({ icon: 'megaphone', sec: 'community', text: T('Must read: ', 'Må leses: ') + (L(p.title) || L(p.text).slice(0, 50)), href: '#/staff/community/post/' + p.id }));
    api.requests.incoming().forEach((r) => items.push({ icon: 'swap', sec: 'shifts', text: T('Shift request from ', 'Vaktforespørsel fra ') + (api.people.get(r.fromId) || {}).name, href: '#/staff/shifts/swaps' }));
    api.learning.mandatoryOpen().slice(0, 2).forEach((c) => items.push({ icon: 'grad', sec: 'community', text: T('Mandatory course: ', 'Obligatorisk kurs: ') + L(c.title), href: '#/staff/community/course/' + c.id }));
    api.surveys.list().filter((s) => !api.surveys.answered(s.id) && new Date(s.closesAt) > new Date()).forEach((s) => items.push({ icon: 'poll', sec: 'community', text: L(s.title) + T(' — 2 min', ' — 2 min'), href: '#/staff/community/survey/' + s.id }));
    if (K.mod('inventory') && new Date().getHours() >= 17 && !api.inventory.get(loc(), App.prep.dayKey(new Date()))) items.push({ icon: 'clipboard', sec: 'store', text: T('Closing count tonight', 'Stengetelling i kveld'), href: '#/staff/inventory' });
    if (api.auth.hasRole('admin')) {
      const n = api.requests.forManager().length + api.leave.all().filter((l) => l.status === 'pending').length;
      if (n) items.push({ icon: 'check', sec: 'shifts', text: T(n + ' requests waiting for approval', n + ' forespørsler venter på godkjenning'), href: '#/staff/shifts/approvals' });
      const tp = api.time.pendingCount(loc()); if (tp) items.push({ icon: 'wallet', sec: 'shifts', text: T(tp + ' timesheets to approve', tp + ' timelister å godkjenne'), href: '#/staff/shifts/hours' });
    }
    return items;
  }

  function home() {
    const u = api.auth.me();
    const l = loc();
    const today = W.today(), mon = W.monday(today);
    const myWeek = api.shifts.mine(mon, W.addDays(mon, 6));
    const hours = myWeek.reduce((h, s) => h + W.shiftHours(s), 0);
    const nxt = api.shifts.next();
    const r = api.prep.report(l); const pst = api.prep.state(l, r.today);
    const lines = r.takeOut.concat(r.prepare); const prepDone = lines.filter((x) => pst[x.ing.id + '@' + x.forDay]).length;
    const cl = api.checklists.templates()[new Date().getHours() < 15 ? 0 : 1]; const clSt = api.checklists.state(cl.id, l); const clDone = cl.items.filter((i) => clSt[i.id]).length;
    const unread = api.chat.unreadTotal(); const must = api.feed.unreadMustRead().length; const courses = api.learning.mandatoryOpen().length;
    const working = api.people.workingOn(l, today);
    const todos = todo();
    const events = api.events.list().slice(0, 2);
    const news = api.feed.list().slice(0, 2);
    const stat = (v, label) => `<div class="hs-stat"><b>${v}</b><span>${label}</span></div>`;
    const area = (k, href, stats, cta) => sec(k).enabled === false ? '' : `<a class="area-card" href="${href}" style="--sc:${sec(k).color};--ss:${sec(k).soft}">
        <div class="area-art">${K.illustration(k, sec(k).color)}</div>
        <div class="area-body"><span class="area-ic">${ic(sec(k).icon, 18)}</span><h2 class="h2">${esc(L(sec(k).label))}</h2><p class="small muted">${esc(L(sec(k).sub))}</p>
          <div class="hs-row">${stats.join('')}</div><span class="area-cta">${cta} ${ic('arrow', 16)}</span></div></a>`;
    return `<div class="page-w">
      <section class="hello">
        <div class="hello-l"><p class="eyebrow light">${esc(K.fmtDay(today))} · ${esc((api.catalog.location(l) || {}).name || '')}</p>
          <h1 class="h1">${greeting()}, ${esc(u.name.split(' ')[0])} 👋</h1>
          <p class="light-2">${nxt ? T('Next shift: ', 'Neste vakt: ') + `<b>${K.relDay(nxt.date)} ${nxt.start}–${nxt.end}</b>` : T('No upcoming shifts.', 'Ingen kommende vakter.')}</p></div>
        <div class="hello-r">${K.mod('timeclock') ? clockCard(true) : ''}</div>
      </section>

      ${todos.length ? `<section class="todo"><h2 class="h3">${ic('check', 18)} ${T('For you', 'Til deg')} <span class="nbadge">${todos.length}</span></h2>
        <div class="todo-list">${todos.map((x) => `<a class="todo-item" href="${x.href}" style="--sc:${sec(x.sec).color}"><span class="todo-ic">${ic(x.icon, 18)}</span><span>${esc(x.text)}</span>${ic('arrow', 16)}</a>`).join('')}</div></section>` : ''}

      <section class="areas">
        ${area('store', '#/staff/store', [stat(prepDone + '/' + lines.length, T('prep done', 'forberedt')), stat(clDone + '/' + cl.items.length, esc(L(cl.title)))], T('Open', 'Åpne'))}
        ${area('shifts', '#/staff/shifts', [stat(W.fmtH(hours), T('this week', 'denne uka')), stat(api.requests.incoming().length + api.shifts.open(l).length, T('requests & open shifts', 'forespørsler og ledige'))], T('My shifts', 'Mine vakter'))}
        ${area('community', '#/staff/community', [stat(unread, T('unread messages', 'uleste meldinger')), stat(must + courses, T('to read / complete', 'å lese / fullføre'))], T('Open', 'Åpne'))}
      </section>

      <div class="home-grid">
        <section class="card">
          <div class="row-between"><h2 class="h3">${ic('users', 18)} ${T('Working today', 'På jobb i dag')}</h2><a class="link small" href="#/staff/shifts/rota">${T('Rota', 'Vaktplan')} ${ic('arrow', 14)}</a></div>
          ${working.length ? `<ul class="who">${working.map((s) => { const p = api.people.get(s.userId); const now = new Date(); const on = W.shiftStart(s) <= now && W.shiftEnd(s) > now; return `<li>${K.avatar(p, 36, { status: api.people.isClockedIn(p.id) ? 'on' : on ? 'due' : '' })}<div><b>${esc(p.name)}</b><span class="small muted">${posDot(s.positionId)} ${esc(L(api.people.position(s.positionId).name))}</span></div><span class="small ${on ? 'green' : 'muted'}">${s.start}–${s.end}</span></li>`; }).join('')}</ul>` : K.empty('users', T('Nobody scheduled', 'Ingen planlagt'))}
        </section>
        <section class="card ask-card">
          <h2 class="h3">${ic('bot', 18)} ${T('Ask the AI assistant', 'Spør AI-assistenten')}</h2>
          <p class="small muted">${T('Allergens, procedures, prep quantities, your shifts — answered from approved company documents, with sources.', 'Allergener, rutiner, forberedelser, vaktene dine — besvart fra godkjente dokumenter, med kilder.')}</p>
          <form data-form="homeAsk" class="ask-form"><input class="input" name="q" placeholder="${T('e.g. What does the Western Burger contain?', 'f.eks. Hva inneholder Western Burger?')}" autocomplete="off"><button class="btn btn-primary" aria-label="${T('Ask', 'Spør')}">${ic('send', 18)}</button></form>
          <div class="chips wrap">${[T('How much beef to thaw today?', 'Hvor mye kjøtt skal tines i dag?'), T('When is my next shift?', 'Når er neste vakt?'), T('Customer says items are missing', 'Kunden sier at noe mangler')].map((q) => `<button class="chip" data-action="ask" data-q="${esc(q)}" data-go="1">${esc(q)}</button>`).join('')}</div>
        </section>
        ${news.length ? `<section class="card"><div class="row-between"><h2 class="h3">${ic('megaphone', 18)} ${T('Latest news', 'Siste nytt')}</h2><a class="link small" href="#/staff/community">${T('All news', 'Alle nyheter')} ${ic('arrow', 14)}</a></div>
          ${news.map((p) => `<a class="mini-post" href="#/staff/community/post/${p.id}">${p.image ? `<img src="${esc(p.image)}" alt="">` : `<span class="mini-ic">${ic('megaphone', 20)}</span>`}<div><b>${esc(L(p.title) || L(p.text).slice(0, 60))}</b><span class="small muted">${esc(authorName(p.authorId))} · ${K.timeAgo(p.at)}${p.mustRead ? ' · <span class="badge badge-red">' + T('Must read', 'Må leses') + '</span>' : ''}</span></div></a>`).join('')}</section>` : ''}
        ${events.length ? `<section class="card"><div class="row-between"><h2 class="h3">${ic('calendar', 18)} ${T('Coming up', 'Kommer')}</h2><a class="link small" href="#/staff/community/events">${T('All events', 'Alle')} ${ic('arrow', 14)}</a></div>
          ${events.map((e) => `<a class="mini-ev" href="#/staff/community/events">${K.dateTile(W.dayKey(e.start))}<div><b>${esc(L(e.title))}</b><span class="small muted">${U.fmtTime(e.start)} · ${esc(e.place)}</span></div></a>`).join('')}</section>` : ''}
      </div>
    </div>`;
  }
  const authorName = (id) => (id === 'hq' ? tn().name : (api.people.get(id) || {}).name || '—');
  App.views.authorName = authorName;

  // ---------- STORE HUB ----------
  function storeHub() {
    const l = loc();
    const r = api.prep.report(l); const pst = api.prep.state(l, r.today);
    const lines = r.takeOut.concat(r.prepare); const prepDone = lines.filter((x) => pst[x.ing.id + '@' + x.forDay]).length;
    const cls = api.checklists.templates().map((c) => { const st = api.checklists.state(c.id, l); return { c, done: c.items.filter((i) => st[i.id]).length, total: c.items.length }; });
    const invDone = api.inventory.get(l, App.prep.dayKey(new Date()));
    const verified = api.catalog.products().filter((p) => p.allergens && p.allergens.status === 'verified').length;
    const tile = (on, href, icon, title, sub, status, tone) => on ? `<a class="tool" href="${href}"><span class="tool-ic ${tone || ''}">${ic(icon, 24)}</span><div><b>${title}</b><span class="small muted">${sub}</span></div>${status ? `<span class="tool-st">${status}</span>` : ''}</a>` : '';
    return `<div class="page-w">
      <section class="sec-hero" style="--sc:var(--c-store);--ss:var(--c-store-soft)">
        <div><p class="eyebrow">${esc(K.fmtDay(W.today()))}</p><h1 class="h1">${T('During your shift', 'Under vakten')}</h1><p class="muted">${esc(L(sec('store').sub))}</p>
          ${K.mod('assistant') ? `<form data-form="homeAsk" class="ask-form big"><span>${ic('bot', 20)}</span><input class="input" name="q" placeholder="${T('Ask anything: allergens, procedures, prep…', 'Spør om alt: allergener, rutiner, forberedelser…')}" autocomplete="off"><button class="btn btn-primary">${T('Ask', 'Spør')}</button></form>` : ''}</div>
        <div class="sec-hero-art">${K.illustration('store', sec('store').color)}</div>
      </section>
      ${K.mod('prep') ? `<a href="#/staff/prep" class="prep-hero">
        <div><p class="eyebrow light">${t('prep.eyebrow')}</p><h2 class="h2">${t('prep.heroTitle')}</h2><p>${t('prep.heroSub', { done: prepDone, total: lines.length })}</p></div>
        <div class="prep-hero-nums">${r.takeOut.filter((x) => x.ing.id === 'beef' || x.ing.id === 'bun').map((x) => `<div><b>${x.withBuffer}</b><span>${esc(L(x.ing.name))}</span><em>${t('prep.takeOutShort')}</em></div>`).join('')}</div></a>` : ''}
      <div class="tools">
        ${cls.map(({ c, done, total }) => tile(K.mod('checklists'), '#/staff/checklists/' + c.id, c.type === 'opening' ? 'sunrise' : 'moon', esc(L(c.title)), done === total ? t('checklist.allDone') : t('checklist.pending', { n: total - done }), `<span class="ring sm" style="--p:${Math.round(done / total * 100)}"><span>${done}/${total}</span></span>`)).join('')}
        ${tile(K.mod('inventory'), '#/staff/inventory', 'clipboard', t('inv.title'), invDone ? t('inv.doneTonight') : t('inv.cardSub'), invDone ? `<span class="badge badge-green">✔</span>` : '')}
        ${tile(K.mod('guides'), '#/staff/guides', 'book', t('staff.guides'), T(api.guides.all().length + ' procedures, step by step', api.guides.all().length + ' rutiner, steg for steg'))}
        ${tile(K.mod('menu'), '#/staff/menu', 'menu', T('Menu & allergens', 'Meny og allergener'), T(verified + ' of ' + api.catalog.products().length + ' products verified', verified + ' av ' + api.catalog.products().length + ' produkter verifisert'))}
        ${tile(K.mod('assistant'), '#/staff/assistant', 'bot', T('AI assistant', 'AI-assistent'), t('assistant.cardSub'), '', 'ai')}
        ${tile(K.mod('emergency'), '#/staff/emergency', 'alert', T('Emergency & SOS', 'Nødsituasjon og SOS'), t('em.supervisorList'), '', 'red')}
        ${tile(K.mod('scan'), '#/staff/scan', 'gift', t('staff.scan'), t('scan.cardSub'))}
      </div>
      ${K.mod('guides') ? `<h2 class="h3">${T('Procedures by topic', 'Rutiner etter tema')}</h2><div class="cat-grid">${api.guides.categories().map((c) => `<a href="#/staff/guides/${c.id}" class="cat-tile">${ic(c.icon, 22)}<span>${esc(L(c.name))}</span></a>`).join('')}</div>` : ''}
    </div>`;
  }

  // ---------- MENU & ALLERGENS ----------
  function menu(params) {
    const q = U.normalize(app.ui.menuQ || '');
    const cat = app.ui.menuCat || '';
    const alg = app.ui.menuAlg || '';
    const view = app.ui.menuView || 'cards';
    const cats = api.catalog.categories();
    const AL = App.config.allergenList;
    let list = api.catalog.products();
    if (cat) list = list.filter((p) => p.categoryId === cat);
    if (q) list = list.filter((p) => U.normalize(p.name.en + ' ' + p.name.nb + ' ' + L(p.description)).includes(q));
    if (alg) list = list.filter((p) => p.allergens && (p.allergens.contains.includes(alg) || p.allergens.mayContain.includes(alg) || p.allergens.status !== 'verified'));
    const aName = (id) => esc(L(AL.find((x) => x.id === id)));
    const chips = (p) => { const a = p.allergens || {}; if (a.status !== 'verified') return `<span class="badge badge-amber">${ic('alert', 12)} ${T('Not verified — ask the shift lead', 'Ikke verifisert — spør skiftleder')}</span>`; return a.contains.length ? a.contains.map((x) => `<span class="alg on">${aName(x)}</span>`).join('') + a.mayContain.map((x) => `<span class="alg may">${aName(x)}*</span>`).join('') : `<span class="small muted">${T('No allergens declared', 'Ingen allergener oppgitt')}</span>`; };
    const sel = (id, opts, cur, ph) => `<select class="input input-sm" data-change="${id}"><option value="">${ph}</option>${opts.map(([v, n]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
    return `<div class="page-w">
      <header class="staff-head"><div><h1 class="h1">${T('Menu & allergens', 'Meny og allergener')}</h1><p class="small muted">${T('Declared allergens from the product sheets. Unverified products: never guess — ask the shift lead.', 'Deklarerte allergener fra produktarkene. Ikke-verifiserte produkter: aldri gjett — spør skiftleder.')}</p></div>
        <div class="seg seg-sm"><button class="${view === 'cards' ? 'on' : ''}" data-action="menuView" data-v="cards">${ic('menu', 16)} ${T('Cards', 'Kort')}</button><button class="${view === 'matrix' ? 'on' : ''}" data-action="menuView" data-v="matrix">${ic('week', 16)} ${T('Matrix', 'Matrise')}</button></div></header>
      <div class="notice notice-ink small">${ic('shield', 18)} <span>${T('This list shows what each product <b>contains</b> according to verified product data. It never means a product is safe for a specific guest. Cross-contact in the kitchen is always possible.', 'Listen viser hva hvert produkt <b>inneholder</b> ifølge verifiserte produktdata. Det betyr aldri at et produkt er trygt for en bestemt gjest. Krysskontakt på kjøkkenet er alltid mulig.')}</span></div>
      <div class="filters">
        <form class="search-big sm" data-form="menuSearch"><span>${ic('search')}</span><input name="q" class="input" placeholder="${T('Search product…', 'Søk produkt…')}" value="${esc(app.ui.menuQ || '')}"></form>
        ${sel('menuCat', cats.map((c) => [c.id, L(c.name)]), cat, T('All categories', 'Alle kategorier'))}
        ${sel('menuAlg', AL.map((a) => [a.id, L(a)]), alg, T('Highlight allergen…', 'Fremhev allergen…'))}
      </div>
      ${alg ? `<p class="small"><b>${list.length}</b> ${T('products contain, may contain, or are not verified for:', 'produkter inneholder, kan inneholde eller er ikke verifisert for:')} <span class="alg on">${aName(alg)}</span></p>` : ''}
      ${view === 'matrix' ? `<div class="table-wrap matrix-wrap"><table class="table matrix"><thead><tr><th>${T('Product', 'Produkt')}</th>${AL.map((a) => `<th title="${esc(L(a))}"><span class="vert">${esc(L(a))}</span></th>`).join('')}</tr></thead>
          <tbody>${list.map((p) => { const a = p.allergens || {}; const ok = a.status === 'verified'; return `<tr class="${ok ? '' : 'unv'}"><td><a class="link" href="#/staff/menu/${p.id}">${esc(L(p.name))}</a>${ok ? '' : ` <span class="badge badge-amber">${T('not verified', 'ikke verifisert')}</span>`}</td>${AL.map((x) => `<td class="mx ${x.id === alg ? 'hl' : ''}">${!ok ? '<span class="q">?</span>' : a.contains.includes(x.id) ? '<span class="dot on">●</span>' : a.mayContain.includes(x.id) ? '<span class="dot may">◐</span>' : ''}</td>`).join('')}</tr>`; }).join('')}</tbody></table></div>
          <p class="small muted">● ${T('contains', 'inneholder')} · ◐ ${T('may contain (traces)', 'kan inneholde (spor)')} · ? ${T('not verified', 'ikke verifisert')}</p>`
      : `<div class="menu-grid">${list.map((p) => `<a class="mcard ${p.available ? '' : 'off'}" href="#/staff/menu/${p.id}"><span class="mcard-img">${App.art.productImage(p)}</span>
          <div class="mcard-b"><div class="row-between"><b>${esc(L(p.name))}</b><span class="small muted">${U.nok(p.priceNok)}</span></div>${p.available ? '' : `<span class="badge badge-gray">${t('menu.soldOut')}</span>`}<div class="alg-row">${chips(p)}</div></div></a>`).join('') || K.empty('search', T('No products', 'Ingen produkter'))}</div>`}
    </div>`;
  }
  function productSheet(p) {
    const a = p.allergens || {}; const AL = App.config.allergenList; const ok = a.status === 'verified';
    return `${K.sheetHead(esc(L(p.name)), U.nok(p.priceNok))}
      <div class="psheet-media">${App.art.productImage(p)}</div>
      <div class="psheet-body stack">
        <p>${esc(L(p.description))}</p>
        ${ok ? `<div class="notice notice-green small">${ic('check', 16)} <span>${T('Verified by', 'Verifisert av')} ${esc(a.verifiedBy)} · ${U.fmtDate(a.verifiedAt)}</span></div>` : `<div class="notice notice-amber">${ic('alert', 18)} <span><b>${T('Allergen information not verified.', 'Allergeninformasjon er ikke verifisert.')}</b> ${T('Do not guess and do not say it is safe. Ask the shift lead before answering the guest.', 'Ikke gjett og ikke si at det er trygt. Spør skiftleder før du svarer gjesten.')}</span></div>`}
        <div class="alg-grid">${AL.map((x) => { const st = !ok ? 'unk' : a.contains.includes(x.id) ? 'on' : a.mayContain.includes(x.id) ? 'may' : 'no'; return `<div class="alg-cell ${st}"><span>${st === 'on' ? '●' : st === 'may' ? '◐' : st === 'unk' ? '?' : '–'}</span>${esc(L(x))}</div>`; }).join('')}</div>
        <button class="btn btn-dark btn-block" data-action="ask" data-q="${esc(T('What allergens does ' + L(p.name) + ' contain?', 'Hvilke allergener inneholder ' + L(p.name) + '?'))}" data-go="1">${ic('bot', 18)} ${T('Ask the AI assistant', 'Spør AI-assistenten')}</button>
        ${K.mod('guides') ? `<a class="link" href="#/staff/guide/g-allergens">${ic('book', 16)} ${T('Guide: allergen questions from guests', 'Guide: allergenspørsmål fra gjester')}</a>` : ''}
      </div>`;
  }
  function menuItem(params) { const p = api.catalog.product(params.id); app.ui.afterRender = () => { if (p) app.modal(productSheet(p)); }; return menu(params); }

  // ---------- NOTIFICATIONS ----------
  function notificationsSheet() {
    const list = api.notifications.mine();
    const iconOf = { shift: 'calendar', publish: 'week', swap: 'swap', claim: 'plusCircle', leave: 'beach', post: 'megaphone', kudos: 'heart', info: 'bell' };
    const html = `${K.sheetHead(T('Notifications', 'Varsler'))}<div class="notif-list">${list.length ? list.map((n) => `<a class="notif ${n.read ? '' : 'unread'}" href="${n.route}" data-action="go" data-to="${n.route}"><span class="notif-ic">${ic(iconOf[n.kind] || 'bell', 18)}</span><div><span>${esc(L(n.text))}</span><span class="small muted">${K.timeAgo(n.at)}</span></div></a>`).join('') : K.empty('bell', T('All caught up', 'Ingen nye varsler'), T('You will get notified about new rotas, swap requests, must-read posts and approvals.', 'Du får varsel om nye vaktplaner, byttforespørsler, viktige innlegg og godkjenninger.'))}</div>`;
    if (list.some((n) => !n.read)) api.notifications.markAllRead();
    return html;
  }

  // ---------- PROFILE ----------
  function me() {
    const u = api.auth.me();
    const bal = api.leave.balance();
    const mon = W.monday(W.today());
    const month = W.today().slice(0, 7);
    const mHours = api.time.punches({ from: month + '-01' }).reduce((h, p) => h + api.time.workedMs(p) / 36e5, 0);
    const done = api.learning.courses().filter((c) => api.learning.progress(c.id).completedAt);
    const kudos = api.kudos.list().filter((k) => k.toId === u.id);
    return `<div class="page-w narrow">
      <section class="profile">${K.avatar(u, 84)}<div><h1 class="h1">${esc(u.name)}</h1><p class="muted">${esc(L(u.title) || '')} · ${esc((api.catalog.location(u.locationId) || {}).name || '')}</p>
        <div class="row">${(u.positions || []).map(K.posChip).join('')}</div></div></section>
      <div class="kpis">
        <div class="kpi"><span class="small muted">${T('Hours this month', 'Timer denne måneden')}</span><b>${W.fmtH(mHours)}</b></div>
        <div class="kpi"><span class="small muted">${T('Holiday left', 'Ferie igjen')}</span><b>${bal.left} ${T('days', 'dager')}</b></div>
        <div class="kpi"><span class="small muted">${T('Courses completed', 'Kurs fullført')}</span><b>${done.length}/${api.learning.courses().length}</b></div>
        <div class="kpi"><span class="small muted">${T('Kudos received', 'Ros mottatt')}</span><b>${kudos.length} 🎉</b></div>
      </div>
      <section class="card"><h2 class="h3">${T('Employment', 'Ansettelse')}</h2>
        <ul class="facts-list"><li><span>${T('Employee no.', 'Ansattnr.')}</span><b>${esc(u.employeeNo || '—')}</b></li><li><span>${T('Contract', 'Avtale')}</span><b>${u.contract === 'full' ? T('Full time', 'Fast heltid') : T('Part time', 'Deltid')} · ${u.contractHours || '—'} ${T('h/week', 't/uke')}</b></li>
        <li><span>${T('Hourly wage', 'Timelønn')}</span><b>${u.hourlyNok ? U.nok(u.hourlyNok) : '—'}</b></li><li><span>${T('Start date', 'Startdato')}</span><b>${u.startDate ? U.fmtDate(u.startDate) : '—'}</b></li>
        <li><span>${t('common.phone')}</span><b>${esc(u.phone || '—')}</b></li><li><span>${t('common.email')}</span><b>${esc(u.email || '—')}</b></li></ul></section>
      <section class="card"><h2 class="h3">${T('Settings', 'Innstillinger')}</h2>
        <div class="row-between"><span>${T('Language', 'Språk')}</span>${App.views.langToggle()}</div>
        <div class="install"><span>${ic('phone', 18)}</span><p class="small">${T('<b>Install the app:</b> on iPhone tap Share → "Add to Home Screen"; on Android tap ⋮ → "Install app".', '<b>Installer appen:</b> på iPhone trykk Del → «Legg til på Hjem-skjerm»; på Android trykk ⋮ → «Installer app».')}</p></div>
        <div class="row">${App.sync && App.sync.live ? `<button class="btn btn-ghost" data-action="changePin">${ic('lock', 18)} ${T('Change PIN', 'Bytt PIN-kode')}</button>` : ''}<button class="btn btn-ghost" data-action="staffLogout">${ic('logout', 18)} ${T('Switch account / sign out', 'Bytt konto / logg ut')}</button><button class="btn btn-ghost" data-action="resetDemo">${ic('refresh', 18)} ${t('demo.reset')}</button></div></section>
    </div>`;
  }

  // ---------- APP SETTINGS (white-label) ----------
  function settings() {
    const tt = tn();
    const groupsMods = [
      ['store', [['prep', t('staff.prep')], ['checklists', t('staff.checklists')], ['inventory', t('inv.nav')], ['guides', t('staff.guides')], ['menu', T('Menu & allergens', 'Meny og allergener')], ['assistant', T('AI assistant', 'AI-assistent')], ['emergency', T('Emergency', 'Nødsituasjon')], ['scan', t('staff.scan')]]],
      ['shifts', [['myShifts', T('My shifts', 'Mine vakter')], ['rota', T('Rota', 'Vaktplan')], ['timeclock', T('Time clock', 'Stempling')], ['openShifts', T('Open shifts', 'Ledige vakter')], ['swaps', T('Swaps', 'Bytte')], ['leave', T('Leave', 'Fravær')], ['availability', T('Availability', 'Tilgjengelighet')], ['timesheets', T('Timesheets & hours report', 'Timelister og timerapport')], ['labor', T('Labour cost & forecast', 'Lønnskostnad og prognose')], ['payroll', T('Payroll export', 'Lønnseksport')]]],
      ['community', [['feed', T('News', 'Nyheter')], ['chat', 'Chat'], ['events', T('Events', 'Arrangementer')], ['learning', T('Training', 'Opplæring')], ['docs', T('Handbook', 'Håndbok')], ['surveys', T('Surveys', 'Undersøkelser')], ['kudos', T('Kudos', 'Ros')], ['directory', T('Colleagues', 'Kolleger')]]],
    ];
    return `<div class="page-w">
      <header class="staff-head"><div><h1 class="h1">${T('App settings', 'Appinnstillinger')}</h1><p class="small muted">${T('Brand the app and choose which features this company uses. Changes apply instantly for everyone.', 'Tilpass merkevaren og velg hvilke funksjoner bedriften bruker. Endringer gjelder umiddelbart for alle.')}</p></div></header>
      <form data-form="saveSettings" class="stack">
        <section class="card"><h2 class="h3">${ic('sparkle', 18)} ${T('Brand', 'Merkevare')}</h2>
          <div class="grid-2">
            <div><label class="field-label">${T('App name', 'Appnavn')}</label><input class="input" name="appName" value="${esc(tt.appName)}"></div>
            <div><label class="field-label">${T('Brand colour', 'Merkefarge')}</label><div class="color-field"><input type="color" name="primary" value="${esc(tt.brand.colors.primary)}"><code>${esc(tt.brand.colors.primary)}</code></div></div>
          </div>
          <p class="small muted">${T('Logo, icons and fonts are set in the tenant folder (tenants/' + tt.id + '/).', 'Logo, ikoner og fonter settes i kundemappen (tenants/' + tt.id + '/).')}</p></section>
        <div class="set-grid">${groupsMods.map(([k, mods]) => `<section class="card set-sec" style="--sc:${sec(k).color}">
          <div class="row-between"><h2 class="h3"><span class="secbar-ic">${ic(sec(k).icon, 16)}</span> ${esc(L(sec(k).label))}</h2><label class="switch"><input type="checkbox" name="sec_${k}" ${sec(k).enabled !== false ? 'checked' : ''}><span></span></label></div>
          <div class="grid-2"><div><label class="field-label">${T('Name (EN)', 'Navn (EN)')}</label><input class="input input-sm" name="label_${k}_en" value="${esc(sec(k).label.en)}"></div><div><label class="field-label">${T('Name (NO)', 'Navn (NO)')}</label><input class="input input-sm" name="label_${k}_nb" value="${esc(sec(k).label.nb)}"></div></div>
          <div class="color-field"><input type="color" name="color_${k}" value="${esc(sec(k).color)}"><span class="small muted">${T('Area colour', 'Områdefarge')}</span></div>
          <ul class="mod-list">${mods.map(([id, label]) => `<li><label class="opt"><input type="checkbox" name="mod_${id}" ${K.mod(id) ? 'checked' : ''}><span>${esc(label)}</span></label></li>`).join('')}</ul></section>`).join('')}</div>
        <div class="row"><button class="btn btn-primary">${t('common.save')}</button><button type="button" class="btn btn-ghost" data-action="resetSettings">${T('Reset to client defaults', 'Tilbakestill til standard')}</button></div>
      </form>
    </div>`;
  }

  // ---------- actions ----------
  Object.assign(App.actions, {
    staffLogin(d) {
      if (App.sync && App.sync.live) { app.modal(pinSheet(d.id), 'sheet-sm'); setTimeout(() => { const i = document.getElementById('pinInput'); if (i) i.focus(); }, 50); return; }
      api.auth.login(d.id); app.ui.chat = []; location.hash === '#/staff' ? app.render() : app.go('#/staff');
    },
    staffLogout() {
      app.ui.chat = [];
      if (App.sync && App.sync.live) return App.sync.logout();
      api.auth.logout(); app.go('#/staff'); app.render();
    },
    changePin() { app.modal(changePinSheet(), 'sheet-sm'); },
    resetPin(d) { app.modal(changePinSheet(d.id), 'sheet-sm'); },
    openNotifications() { app.modal(notificationsSheet()); app.render(); },
    clockIn() { api.time.clockIn(); app.toast(T('Clocked in — have a great shift!', 'Stemplet inn — god vakt!')); app.render(); },
    clockBreak() { const p = api.time.breakToggle(); app.toast(api.time.onBreak(p) ? T('Break started', 'Pause startet') : T('Welcome back', 'Velkommen tilbake')); app.render(); },
    clockOut() { app.confirm(T('Clock out now?', 'Stemple ut nå?'), T('Clock out', 'Stemple ut'), () => { const p = api.time.clockOut(); app.toast(T('Clocked out · ', 'Stemplet ut · ') + W.durText(api.time.workedMs(p)) + T(' worked', ' arbeidet')); app.render(); }); },
    menuView(d) { app.ui.menuView = d.v; app.render(); },
    resetSettings() { api.settings.saveOverrides({}); setTimeout(() => location.reload(), 400); },
  });
  const askAndGo = (q) => { app.ui.chat = app.ui.chat || []; App.forms.ask({ q }); app.go('#/staff/assistant'); };
  const origAsk = App.actions.ask;
  App.actions.ask = (d) => { if (d.go) { app.modal(null); askAndGo(d.q); } else origAsk(d); };
  Object.assign(App.forms, {
    homeAsk(data) { if ((data.q || '').trim()) askAndGo(data.q); },
    pinLogin(data, form) {
      const btn = form.querySelector('button'); btn.disabled = true;
      App.sync.login(data.userId, data.pin).then(() => { app.modal(null); app.ui.chat = []; location.hash === '#/staff' ? app.render() : app.go('#/staff'); })
        .catch((e) => {
          btn.disabled = false; const el = document.getElementById('pinError'); el.hidden = false;
          el.textContent = e.code === 'too_many_attempts' ? T('Too many attempts. Try again in 5 minutes.', 'For mange forsøk. Prøv igjen om 5 minutter.') : T('Wrong PIN. Try again.', 'Feil PIN-kode. Prøv igjen.');
          form.pin.value = ''; form.pin.focus();
        });
    },
    savePin(data) {
      App.sync.setPin(data.pin, data.current, data.userId || undefined).then(() => { app.modal(null); app.toast(T('PIN saved', 'PIN-kode lagret')); })
        .catch((e) => app.toast(e.code === 'wrong_pin' ? T('Current PIN is wrong', 'Nåværende PIN er feil') : e.code === 'pin_format' ? T('Use 4–8 digits', 'Bruk 4–8 sifre') : T('Could not save the PIN', 'Kunne ikke lagre PIN-koden'), 'error'));
    },
    menuSearch(data) { app.ui.menuQ = data.q; app.render(); },
    saveSettings(data) {
      const o = { appName: data.appName, primary: data.primary, sections: {}, modules: {} };
      ['store', 'shifts', 'community'].forEach((k) => { o.sections[k] = { enabled: !!data['sec_' + k], color: data['color_' + k], label: { en: data['label_' + k + '_en'], nb: data['label_' + k + '_nb'] } }; });
      Object.keys(tn().modules).forEach((id) => { if (('mod_' + id) in data || document.querySelector(`[name="mod_${id}"]`)) o.modules[id] = !!data['mod_' + id]; });
      api.settings.saveOverrides(o);
      K.applyOverrides(); K.applyTheme(); app.toast(t('common.saved')); app.render();
    },
  });
  Object.assign(App.changes, {
    menuCat(el) { app.ui.menuCat = el.value; app.render(); },
    menuAlg(el) { app.ui.menuAlg = el.value; app.render(); },
  });

  App.views.langToggle = () => `<div class="lang">${App.config.app.languages.map((l) => `<button class="${App.i18n.lang === l ? 'on' : ''}" data-action="setLang" data-lang="${l}">${l === 'nb' ? 'NO' : l.toUpperCase()}</button>`).join('')}</div>`;
  App.views.layouts = App.views.layouts || {};
  App.views.layouts.staff = layout;
  App.views.layouts.admin = layout;
  App.views.sectionOf = sectionOf;

  const R = app.route;
  R('/', 'staff', guard(home));
  R('/staff', 'staff', guard(home));
  R('/staff/store', 'staff', guard(storeHub));
  R('/staff/menu', 'staff', guard(menu));
  R('/staff/menu/:id', 'staff', guard(menuItem));
  R('/staff/me', 'staff', guard(me));
  R('/admin/settings', 'admin', guard(settings, 'admin'));
})();
