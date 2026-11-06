/* Staff area — requires role staff or admin (enforced in App.api, not only here). */
(function () {
  const { esc, L, nok } = App.util;
  const t = (k, v) => App.i18n.t(k, v);
  const ic = App.art.icon;
  const api = App.api;
  const app = App.app;
  const demoBadge = (k) => `<span class="badge badge-demo">${t(k || 'demo.badge')}</span>`;

  function staffLocation() {
    const u = api.auth.me();
    return app.ui.staffLoc || (u && u.locationId) || 'loc-lokka';
  }

  function layout(content, r) {
    const u = api.auth.me();
    const isStaff = api.auth.hasRole('staff');
    const p = '#' + r.path;
    const admin = r.area === 'admin';
    const nav = admin
      ? [['#/admin', 'admin.overview', 'gear'], ['#/admin/products', 'admin.products', 'menu'], ['#/admin/orders', 'admin.orders', 'receipt'], ['#/admin/catering', 'nav.catering', 'party'],
        ['#/admin/loyalty', 'admin.loyalty', 'star'], ['#/admin/prep', 'staff.prep', 'clipboard'], ['#/admin/docs', 'admin.docs', 'book'], ['#/admin/users', 'admin.users', 'user']]
      : [['#/staff', 'staff.home', 'home'], ['#/staff/prep', 'staff.prep', 'clipboard'], ['#/staff/checklists', 'staff.checklists', 'check'], ['#/staff/guides', 'staff.guides', 'book'],
        ['#/staff/assistant', 'staff.assistant', 'chat'], ['#/staff/inventory', 'inv.nav', 'clipboard'], ['#/staff/scan', 'staff.scan', 'gift']];
    const on = (h) => (h === '#/staff' || h === '#/admin' ? p === h : p.startsWith(h));
    return `
      <div class="demo-strip ink">${ic('lock', 14)} ${admin ? t('admin.strip') : t('staff.strip')}</div>
      <div class="staff-shell ${isStaff ? '' : 'locked'}">
        <aside class="staff-side">
          <a href="${admin ? '#/admin' : '#/staff'}" class="staff-brand">${App.art.logo(36, true)}<span class="staff-tag">${admin ? t('admin.tag') : t('staff.tag')}</span></a>
          ${isStaff ? `<nav class="staff-nav">${nav.map(([h, k, i]) => `<a href="${h}" class="${on(h) ? 'on' : ''}">${ic(i, 18)}<span>${t(k)}</span></a>`).join('')}</nav>
          <div class="staff-side-foot">
            ${api.auth.hasRole('admin') ? (admin ? `<a href="#/staff" class="side-link">${ic('book', 16)} ${t('staff.tag')}</a>` : `<a href="#/admin" class="side-link">${ic('gear', 16)} ${t('admin.tag')}</a>`) : ''}
            <a href="#/" class="side-link">${ic('back', 16)} ${t('staff.toCustomer')}</a>
            <div class="side-user"><span class="avatar sm">${esc(u.name[0])}</span><span class="small">${esc(u.name)}</span><button class="icon-btn" data-action="staffLogout" aria-label="${t('account.logout')}">${ic('logout', 16)}</button></div>
            ${App.views.langToggle()}
          </div>` : ''}
        </aside>
        <main class="staff-main">${content}</main>
        ${isStaff && !admin && !p.startsWith('#/staff/emergency') ? `<a href="#/staff/emergency" class="sos-btn" aria-label="${t('em.title')}">${ic('alert', 20)}<span>${t('em.sos')}</span></a>` : ''}
      </div>
      ${isStaff ? `<nav class="tabbar dark">${nav.slice(0, 5).map(([h, k, i]) => `<a href="${h}" class="${on(h) ? 'on' : ''}">${ic(i, 22)}<span>${t(k)}</span></a>`).join('')}</nav>` : ''}`;
  }

  function login(area) {
    if (App.views.login) {
      const me = api.auth.me();
      if (me && area === 'admin') return `<div class="page-w narrow"><div class="notice notice-red">${t('err.forbidden')}</div></div>`;
      return App.views.login(area);
    }
    const accounts = api.auth.demoAccounts().filter((a) => a.role !== 'customer');
    const me = api.auth.me();
    return `<div class="login-wrap"><div class="login-card">
      ${App.art.logo(40)}
      <h1 class="h1">${area === 'admin' ? t('admin.loginTitle') : t('staff.loginTitle')}</h1>
      <p class="muted">${me ? t('staff.noAccess', { role: t('role.' + me.role) }) : t('staff.loginSub')}</p>
      <div class="notice notice-amber small">${t('staff.loginDemo')}</div>
      <div class="list">${accounts.filter((a) => area !== 'admin' || a.role === 'admin').map((a) => `<button class="li-row btn-row" data-action="staffLogin" data-id="${a.id}"><span>${esc(a.name)}</span><span class="badge badge-ink">${t('role.' + a.role)}</span></button>`).join('')}</div>
      <a href="#/" class="link">${ic('back', 16)} ${t('staff.toCustomer')}</a>
    </div></div>`;
  }

  App.views.forbidden = (area) => (area === 'customer' ? `<div class="page narrow"><div class="notice notice-red">${t('err.forbidden')}</div></div>` : login(area));

  const guard = (fn, role) => (params) => { if (!api.auth.hasRole(role || 'staff')) return login(role === 'admin' ? 'admin' : 'staff'); return fn(params); };

  function locPicker() {
    const loc = staffLocation();
    return `<select class="input input-sm" data-change="staffLoc" aria-label="${t('staff.location')}">${api.catalog.locations().map((l) => `<option value="${l.id}" ${l.id === loc ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>`;
  }

  // ---------- HOME ----------
  function home() {
    const u = api.auth.me();
    const loc = staffLocation();
    const cls = api.checklists.templates().map((c) => {
      const st = api.checklists.state(c.id, loc); const done = c.items.filter((i) => st[i.id]).length;
      return { c, done, total: c.items.length };
    });
    const r = api.prep.report(loc);
    const pst = api.prep.state(loc, r.today);
    const prepLines = r.takeOut.length + r.prepare.length;
    const prepDone = r.takeOut.concat(r.prepare).filter((x) => pst[lineId(x)]).length;
    const hour = new Date().getHours();
    return `<div class="staff-page">
      <header class="staff-head"><div><p class="eyebrow">${App.util.fmtDate(new Date().toISOString())}</p><h1 class="h1">${t(hour < 12 ? 'staff.goodMorning' : 'staff.hello', { name: esc(u.name.split(' ')[0]) })}</h1></div>${locPicker()}</header>

      <a href="#/staff/prep" class="prep-hero">
        <div><p class="eyebrow light">${t('prep.eyebrow')}</p><h2 class="h2">${t('prep.heroTitle')}</h2>
        <p>${t('prep.heroSub', { done: prepDone, total: prepLines })}</p></div>
        <div class="prep-hero-nums">${r.takeOut.filter((x) => x.ing.id === 'beef' || x.ing.id === 'bun').map((x) => `<div><b>${x.withBuffer}</b><span>${esc(L(x.ing.name))}</span><em>${t('prep.takeOutShort')}</em></div>`).join('')}</div>
      </a>

      <div class="staff-grid">
        ${cls.map(({ c, done, total }) => `<a class="scard" href="#/staff/checklists/${c.id}">
          <div class="ring" style="--p:${Math.round((done / total) * 100)}"><span>${done}/${total}</span></div>
          <div><b>${esc(L(c.title))}</b><span class="small muted">${done === total ? t('checklist.allDone') : t('checklist.pending', { n: total - done })}</span></div></a>`).join('')}
        <a class="scard" href="#/staff/assistant">${ic('chat', 28)}<div><b>${t('staff.assistant')}</b><span class="small muted">${t('assistant.cardSub')}</span></div></a>
        <a class="scard" href="#/staff/inventory">${ic('clipboard', 28)}<div><b>${t('inv.title')}</b><span class="small muted">${api.inventory.get(loc, App.prep.dayKey(new Date())) ? t('inv.doneTonight') : t('inv.cardSub')}</span></div></a>
        <a class="scard" href="#/staff/emergency">${ic('alert', 28)}<div><b>${t('em.sos')}</b><span class="small muted">${t('em.supervisorList')}</span></div></a>
        <a class="scard" href="#/staff/scan">${ic('gift', 28)}<div><b>${t('staff.scan')}</b><span class="small muted">${t('scan.cardSub')}</span></div></a>
      </div>

      <form class="search-big" data-form="guideSearch"><span>${ic('search')}</span><input name="q" class="input" placeholder="${t('guides.searchPh')}" value="${esc(app.ui.guideQ || '')}"><button class="btn btn-dark">${t('common.search')}</button></form>
      <h2 class="h3">${t('staff.guides')}</h2>
      <div class="cat-grid">${api.guides.categories().map((c) => `<a href="#/staff/guides/${c.id}" class="cat-tile">${ic(c.icon, 22)}<span>${esc(L(c.name))}</span></a>`).join('')}</div>
    </div>`;
  }

  // ---------- GUIDES ----------
  function approvalBadge(g) {
    const outdated = g.reviewDue && new Date(g.reviewDue) < new Date();
    return (g.approval === 'approved' ? `<span class="badge badge-green">${t('guide.approved')}</span>` : g.approval === 'draft' ? `<span class="badge badge-gray">${t('guide.draft')}</span>` : demoBadge('guide.demo')) +
      (outdated ? ` <span class="badge badge-amber">${t('guide.reviewDue')}</span>` : '');
  }

  function guides(params) {
    const q = (app.ui.guideQ || '').trim();
    const cats = api.guides.categories();
    const cat = params && params.cat;
    const nq = App.util.normalize(q);
    let list = api.guides.all();
    if (cat) list = list.filter((g) => g.categoryId === cat);
    if (q) list = list.filter((g) => App.util.normalize([g.title.en, g.title.nb, g.summary.en, g.summary.nb, g.keywords.join(' ')].concat(g.steps.map((s) => s.text.en + ' ' + s.text.nb)).join(' ')).includes(nq));
    return `<div class="staff-page">
      <header class="staff-head"><h1 class="h1">${cat ? esc(L(cats.find((c) => c.id === cat).name)) : t('staff.guides')}</h1></header>
      <form class="search-big" data-form="guideSearch"><span>${ic('search')}</span><input name="q" class="input" placeholder="${t('guides.searchPh')}" value="${esc(q)}"><button class="btn btn-dark">${t('common.search')}</button></form>
      <nav class="chips"><a href="#/staff/guides" class="chip ${!cat ? 'on' : ''}">${t('common.all')}</a>${cats.map((c) => `<a href="#/staff/guides/${c.id}" class="chip ${cat === c.id ? 'on' : ''}">${esc(L(c.name))}</a>`).join('')}</nav>
      ${q ? `<p class="small muted">${t('guides.results', { n: list.length, q: esc(q) })} <a href="#" data-action="clearSearch" class="link">${t('common.clear')}</a></p>` : ''}
      <div class="guide-list">${list.map((g) => { const c = cats.find((x) => x.id === g.categoryId); return `<a class="guide-row" href="#/staff/guide/${g.id}">
        <span class="guide-ic">${ic(c ? c.icon : 'book', 22)}</span>
        <div><b>${esc(L(g.title))}</b><p class="small muted">${esc(L(g.summary))}</p><div class="small">${approvalBadge(g)} <span class="muted">· ${t('guide.updated')} ${App.util.fmtDate(g.updatedAt)}</span></div></div>${ic('arrow', 18)}</a>`; }).join('') || `<p class="muted">${t('guides.none')}</p>`}</div>
      <p class="small muted">${t('guides.demoNote')}</p>
    </div>`;
  }

  function guide(params) {
    const g = api.guides.get(params.id);
    if (!g) return `<div class="staff-page"><p>${t('guides.none')}</p></div>`;
    const cat = api.guides.categories().find((c) => c.id === g.categoryId);
    const cl = api.checklists.templates().find((c) => c.guideId === g.id);
    return `<div class="staff-page narrow">
      <a href="#/staff/guides/${g.categoryId}" class="back">${ic('back', 18)} ${esc(L(cat.name))}</a>
      <header class="guide-head"><div class="small">${approvalBadge(g)}</div><h1 class="h1">${esc(L(g.title))}</h1><p class="lead-sm">${esc(L(g.summary))}</p>
        <p class="small muted">${t('guide.updated')} ${App.util.fmtDate(g.updatedAt)} · ${t('guide.owner')}: ${esc(g.owner)} · ${t('guide.review')}: ${g.reviewDue ? App.util.fmtDate(g.reviewDue) : '—'} · ${g.aiEnabled && g.approval !== 'draft' ? t('guide.aiOn') : t('guide.aiOff')}</p></header>
      ${g.emergency ? emergencyBanner(g) : ''}
      ${g.approval !== 'approved' ? `<div class="notice notice-amber">${ic('alert', 18)} <span>${t('guide.notApproved')}</span></div>` : ''}
      ${g.warnings.map((w) => `<div class="notice notice-red">${ic('alert', 18)} <span>${esc(L(w))}</span></div>`).join('')}
      <ol class="guide-steps">${g.steps.map((s, i) => `<li><span class="step-n">${i + 1}</span><div><p>${esc(L(s.text))}</p>
        ${s.media ? `<div class="media-ph">${ic(s.media.type === 'video' ? 'video' : 'image', 28)}<span class="small">${esc(L(s.media.caption))}</span></div>` : ''}</div></li>`).join('')}</ol>
      ${cl ? `<a class="btn btn-primary btn-block" href="#/staff/checklists/${cl.id}">${ic('check', 18)} ${t('guide.openChecklist', { name: esc(L(cl.title)) })}</a>` : ''}
      ${g.emergency ? reportForm(g) : ''}
      <p class="small muted center">${t('guide.unsure')}</p>
    </div>`;
  }

  // ---------- EMERGENCIES ----------
  const NUMBERS = [['110', 'em.fire'], ['112', 'em.police'], ['113', 'em.ambulance']];
  const callBtns = (nums) => `<div class="call-row">${NUMBERS.filter(([n]) => !nums || nums.includes(n)).map(([n, k]) => `<a class="call-btn" href="tel:${n}"><b>${n}</b><span>${t(k)}</span></a>`).join('')}</div>`;

  function emergencyBanner(g) {
    const e = g.emergency;
    return e.level === 'immediate'
      ? `<div class="em-banner now">${ic('alert', 24)}<div><b>${t('em.immediateTitle')}</b><p>${t('em.immediateText')}</p></div></div>${e.call.length ? callBtns(e.call) : ''}`
      : `<div class="em-banner sup">${ic('shield', 24)}<div><b>${t('em.supervisorTitle')}</b><p>${t('em.supervisorText')}</p></div></div>`;
  }

  function reportForm(g) {
    const after = g.emergency.level === 'immediate';
    return `<form class="card stack" data-form="staffReport">
      <h2 class="h3">${after ? t('em.reportAfter') : t('em.askSupervisor')}</h2>
      <p class="small muted">${after ? t('em.reportAfterSub') : t('em.askSupervisorSub')}</p>
      <input type="hidden" name="guideId" value="${g.id}"><input type="hidden" name="kind" value="${after ? 'after' : 'approval'}">
      <textarea class="input" name="description" rows="3" required placeholder="${t('em.descPh')}"></textarea>
      ${after ? '' : `<input class="input" name="proposed" placeholder="${t('em.proposedPh')}">`}
      <button class="btn ${after ? 'btn-dark' : 'btn-primary'} btn-block">${after ? t('em.sendReport') : t('em.sendRequest')}</button>
    </form>`;
  }

  function reportStatus(r) {
    const cls = r.status === 'approved' ? 'badge-green' : r.status === 'rejected' ? 'badge-red' : r.status === 'awaiting' ? 'badge-amber' : 'badge-gray';
    const g = r.guideId && api.guides.get(r.guideId);
    return `<div class="inc-row"><div class="row-between"><b>${r.id} · ${esc(g ? L(g.title) : '')}</b><span class="badge ${cls}">${t('sr.' + r.status)}</span></div>
      <p class="small">${esc(r.description)}${r.proposed ? ` <span class="muted">→ ${esc(r.proposed)}</span>` : ''}</p>
      ${r.decision ? `<p class="small"><b>${esc(r.decision.by)}:</b> ${esc(r.decision.note || '—')}</p>` : ''}
      <p class="small muted">${App.util.fmtDate(r.createdAt, true)}</p></div>`;
  }

  function emergency() {
    const list = api.guides.all().filter((g) => g.emergency);
    const mine = api.staffReports.mine();
    return `<div class="staff-page narrow">
      <header class="staff-head"><div><p class="eyebrow red">${t('em.eyebrow')}</p><h1 class="h1">${t('em.title')}</h1></div></header>
      <div class="em-banner now">${ic('alert', 24)}<div><b>${t('em.lifeFirst')}</b><p>${t('em.lifeFirstText')}</p></div></div>
      ${callBtns()}
      <h2 class="h3">${t('em.immediateList')}</h2>
      <div class="em-grid">${list.filter((g) => g.emergency.level === 'immediate').map((g) => `<a class="em-tile now" href="#/staff/guide/${g.id}">${ic('alert', 26)}<b>${esc(L(g.title))}</b><span class="small">${esc(L(g.summary))}</span></a>`).join('')}</div>
      <h2 class="h3">${t('em.supervisorList')}</h2>
      <div class="em-grid">${list.filter((g) => g.emergency.level === 'supervisor').map((g) => `<a class="em-tile sup" href="#/staff/guide/${g.id}">${ic(g.emergency.icon, 26)}<b>${esc(L(g.title))}</b><span class="small">${esc(L(g.summary))}</span></a>`).join('')}</div>
      ${mine.length ? `<h2 class="h3">${t('em.myReports')}</h2><div class="card">${mine.map(reportStatus).join('')}</div>` : ''}
      <p class="small muted">${t('em.demoNote')}</p>
    </div>`;
  }
  App.views.reportStatus = reportStatus;

  // ---------- CHECKLISTS ----------
  function checklists(params) {
    const loc = staffLocation();
    const tpls = api.checklists.templates();
    const cur = tpls.find((c) => c.id === (params && params.id)) || tpls[new Date().getHours() < 15 ? 0 : 1];
    const st = api.checklists.state(cur.id, loc);
    const done = cur.items.filter((i) => st[i.id]).length;
    const pending = cur.items.filter((i) => !st[i.id]);
    return `<div class="staff-page narrow">
      <header class="staff-head"><div><p class="eyebrow">${t('checklist.today')} · ${App.util.fmtDate(new Date().toISOString())}</p><h1 class="h1">${t('staff.checklists')}</h1></div>${locPicker()}</header>
      <div class="seg">${tpls.map((c) => `<a href="#/staff/checklists/${c.id}" class="${c.id === cur.id ? 'on' : ''}">${ic(c.type === 'opening' ? 'sunrise' : 'moon', 18)} ${esc(L(c.title))}</a>`).join('')}</div>
      <div class="cl-progress"><div class="meter"><span style="width:${(done / cur.items.length) * 100}%"></span></div><b>${done}/${cur.items.length}</b></div>
      ${pending.length ? `<p class="small"><b>${t('checklist.pendingTitle')}:</b> ${pending.map((i) => esc(L(i.text))).join(' · ')}</p>` : `<div class="notice notice-green">${ic('check', 18)} ${t('checklist.allDone')}</div>`}
      <ul class="checklist">${cur.items.map((i) => { const s = st[i.id]; return `<li><button class="cl-item ${s ? 'done' : ''}" data-action="toggleCheck" data-cl="${cur.id}" data-item="${i.id}" aria-pressed="${!!s}">
        <span class="cl-box">${s ? ic('check', 16) : ''}</span><span class="cl-text">${esc(L(i.text))}${s ? `<span class="small muted">${esc(s.by)} · ${App.util.fmtTime(s.at)}</span>` : ''}</span></button>
        ${i.link && !s ? `<a class="btn btn-sm btn-primary cl-link" href="${i.link}">${t('inv.countNow')} ${ic('arrow', 14)}</a>` : ''}</li>`; }).join('')}</ul>
      <div class="row-between"><a class="link" href="#/staff/guide/${cur.guideId}">${ic('book', 16)} ${t('checklist.guide')}</a><button class="btn btn-sm btn-ghost" data-action="resetCheck" data-cl="${cur.id}">${t('checklist.reset')}</button></div>
      <p class="small muted">${t('checklist.demoNote')}</p>
    </div>`;
  }

  // ---------- PREP REPORT ----------
  const lineId = (x) => x.ing.id + '@' + x.forDay;
  const dayName = (key, offset) => {
    if (offset === 0) return t('prep.today');
    if (offset === 1) return t('prep.tomorrow');
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  function prepLine(x, st, showFor) {
    const done = st[lineId(x)];
    const adj = x.counted && x.forecastOnly !== x.withBuffer;
    return `<li><button class="prep-line ${done ? 'done' : ''}" data-action="togglePrep" data-line="${lineId(x)}" data-day="${x.dayOfReport}" data-qty="${x.withBuffer}">
      <span class="cl-box">${done ? ic('check', 16) : ''}</span>
      <span class="prep-name"><b>${esc(L(x.ing.name))}</b>${showFor ? `<span class="small muted">${t('prep.forDay', { day: dayName(x.forDay, x.offsetFor) })}</span>` : ''}
        ${x.counted ? `<span class="small count-note">${ic('clipboard', 13)} ${t('prep.counted', { n: x.stock })}${x.surplus ? ' · ' + t('prep.surplusUsed', { n: x.surplus }) : ''}</span>` : `<span class="small muted">${t('prep.notCounted')}</span>`}
        ${x.shortage ? `<span class="small short-note">${ic('alert', 13)} ${t('prep.shortage', { n: x.shortage })}</span>` : ''}
        ${done ? `<span class="small muted">${esc(done.by)} · ${App.util.fmtTime(done.at)}</span>` : ''}</span>
      <span class="prep-qty"><b>${x.withBuffer}</b> <span class="small">${esc(L(x.ing.unit))}</span>${x.packs ? `<span class="small muted">≈ ${x.packs} ${esc(L(x.ing.packName))}</span>` : ''}
        ${adj ? `<span class="small muted"><s>${x.forecastOnly}</s> ${t('prep.withoutCount')}</span>` : `<span class="small muted">${t('prep.minimum')}: ${x.min}</span>`}</span>
    </button></li>`;
  }

  // ---------- CLOSING INVENTORY COUNT ----------
  function inventory() {
    const loc = staffLocation();
    const day = App.prep.dayKey(new Date());
    const items = api.inventory.items();
    const saved = api.inventory.get(loc, day);
    const prev = api.inventory.lastCountBefore(loc, day);
    const log = api.inventory.history(loc).find((l) => l.to === day);
    const wd = new Date().toLocaleDateString(App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB', { weekday: 'long' });
    const required = items.filter((it) => api.inventory.isRequired(it, day));
    const optional = items.filter((it) => !api.inventory.isRequired(it, day));
    const ingName = (id) => { const i = api.prep.data().ingredients.find((x) => x.id === id); return i ? L(i.name) : id; };
    const row = (it, req) => {
      const v = saved && saved.items[it.id] || {};
      const p = prev && prev.items[it.id];
      return `<div class="count-row">
        <div class="count-name"><b>${esc(L(it.name))}</b>
          <span class="small muted">${req ? `<span class="badge badge-red">${t('inv.required')}</span>` : `<span class="badge badge-gray">${t('inv.optional')}</span>`}
          ${p ? t('inv.lastCount', { n: p.count, unit: esc(L(it.countUnit)), day: dayName(prev.day, -1) }) : ''}</span></div>
        <div class="count-inputs">
          <label><span class="small muted">${esc(L(it.countUnit))}</span><input class="input count-input" type="number" inputmode="decimal" min="0" step="${it.perCount > 1 ? '0.5' : '1'}" name="c_${it.id}" value="${v.count != null ? esc(v.count) : ''}" ${req ? 'required' : ''} placeholder="0"></label>
          <label><span class="small muted">${t('inv.waste')}</span><input class="input count-input waste" type="number" inputmode="decimal" min="0" name="w_${it.id}" value="${v.waste ? esc(v.waste) : ''}" placeholder="0"></label>
        </div></div>`;
    };
    return `<div class="staff-page narrow">
      <header class="staff-head"><div><p class="eyebrow">${t('inv.eyebrow')} · ${esc(wd)}</p><h1 class="h1">${t('inv.title')}</h1></div>${locPicker()}</header>
      <p class="muted">${t('inv.sub')}</p>
      <div class="notice notice-ink small">${ic('clipboard', 18)} <span>${t('inv.rules')}</span></div>
      ${saved ? `<div class="notice notice-green">${ic('check', 18)} <span>${t('inv.savedBy', { by: esc(saved.by), time: App.util.fmtTime(saved.at) })}</span></div>` : ''}
      <form data-form="inventoryCount" class="count-form">
        <h2 class="h3">${t('inv.tonight')}</h2>
        ${required.map((it) => row(it, true)).join('')}
        ${optional.length ? `<details class="count-optional"><summary>${t('inv.optionalTonight', { n: optional.length })}</summary>${optional.map((it) => row(it, false)).join('')}</details>` : ''}
        <button class="btn btn-primary btn-block btn-lg">${saved ? t('inv.update') : t('inv.save')}</button>
        <p class="small muted center">${t('inv.wasteNote')}</p>
      </form>
      ${log ? `<section class="card"><h2 class="h3">${t('inv.resultTitle')}</h2><p class="small muted">${t('inv.resultSub', { from: dayName(log.from, -1) })}</p>
        <table class="table"><thead><tr><th>${t('prep.ingredient')}</th><th class="num">${t('inv.used')}</th><th class="num">${t('inv.forecast')}</th><th class="num">${t('inv.diff')}</th></tr></thead>
        <tbody>${Object.keys(log.ingredients).map((ing) => { const x = log.ingredients[ing]; const d = x.forecast ? Math.round((x.actual / x.forecast - 1) * 100) : 0; return `<tr><td>${esc(ingName(ing))}</td><td class="num"><b>${x.actual}</b></td><td class="num">${x.forecast}</td><td class="num ${Math.abs(d) >= 10 ? 'warn' : ''}">${d > 0 ? '+' : ''}${d}%</td></tr>`; }).join('')}</tbody></table>
        <p class="small muted">${t('inv.resultNote')}</p></section>` : ''}
    </div>`;
  }

  function prep() {
    const loc = staffLocation();
    const today = App.prep.dayKey(new Date());
    const r = api.prep.report(loc, today);
    const st = api.prep.state(loc, today);
    const settings = api.prep.settings();
    const data = api.prep.data();
    const offsetOf = (key) => r.days.findIndex((d) => d.key === key);
    r.takeOut.forEach((x) => { x.dayOfReport = today; x.offsetFor = offsetOf(x.forDay); });
    r.prepare.forEach((x) => { x.dayOfReport = today; x.offsetFor = 0; });
    const meatBread = r.takeOut;
    const productsShown = Object.keys(data.baseline).filter((pid) => data.baseline[pid] > 0);
    const cal = api.inventory.calibration(loc);
    return `<div class="staff-page">
      <header class="staff-head"><div><p class="eyebrow">${t('prep.eyebrow')} · ${App.util.fmtDate(new Date().toISOString())}</p><h1 class="h1">${t('prep.title')}</h1></div>
        <div class="row">${locPicker()}<button class="btn btn-ghost btn-sm" data-action="print">${t('prep.print')}</button></div></header>
      <div class="notice notice-amber small">${ic('alert', 18)} <span>${t('prep.demoNote', { buffer: settings.bufferPct })}</span></div>
      ${r.lastCount
        ? `<div class="notice notice-green small">${ic('clipboard', 18)} <span>${t('prep.basedOnCount', { by: esc(r.lastCount.by), time: App.util.fmtDate(r.lastCount.at, true) })}</span></div>`
        : `<div class="notice notice-red small">${ic('alert', 18)} <span>${t('prep.noCount')} <a class="link" href="#/staff/inventory">${t('inv.title')}</a></span></div>`}
      ${Object.keys(cal).length ? `<p class="small muted cal-line">${ic('refresh', 14)} ${t('prep.calibrated', { n: data.calibrationDays })} ${Object.keys(cal).map((k) => { const i = data.ingredients.find((x) => x.id === k); const p = Math.round((cal[k] - 1) * 100); return `<span class="chip-mini">${esc(i ? L(i.name) : k)} ${p > 0 ? '+' : ''}${p}%</span>`; }).join(' ')}</p>` : ''}

      <section class="prep-block primary">
        <h2 class="h2">${ic('clock', 22)} ${t('prep.takeOutTitle')}</h2>
        <p class="muted">${t('prep.takeOutSub')}</p>
        <ul class="prep-list">${meatBread.map((x) => prepLine(x, st, true)).join('')}</ul>
        <p class="small muted">${t('prep.leadNote', { list: data.ingredients.filter((i) => i.leadDays > 0).map((i) => `${esc(L(i.name))}: ${i.leadDays} ${t(i.leadDays === 1 ? 'prep.day' : 'prep.days')}${i.leadStatus === 'provisional' ? ' (' + t('common.provisional').toLowerCase() + ')' : ''}`).join(' · ') })}</p>
      </section>

      <section class="prep-block">
        <h2 class="h2">${ic('chef', 22)} ${t('prep.prepareTitle')}</h2>
        <p class="muted">${t('prep.prepareSub')}</p>
        <ul class="prep-list">${r.prepare.map((x) => prepLine(x, st, false)).join('')}</ul>
      </section>

      <section class="prep-block">
        <h2 class="h2">${ic('check', 22)} ${t('prep.checkTitle')}</h2>
        <p class="muted">${t('prep.checkSub')}</p>
        <table class="table"><thead><tr><th>${t('prep.ingredient')}</th><th>${t('prep.for')}</th><th class="num">${t('prep.shouldHave')}</th></tr></thead>
        <tbody>${r.check.map((x) => `<tr><td>${esc(L(x.ing.name))}</td><td>${dayName(x.forDay, x.offset)}</td><td class="num"><b>${x.withBuffer}</b> ${esc(L(x.ing.unit))}</td></tr>`).join('')}</tbody></table>
      </section>

      <section class="prep-block">
        <h2 class="h2">${ic('receipt', 22)} ${t('prep.forecastTitle')}</h2>
        <p class="muted">${t('prep.forecastSub')}</p>
        <div class="table-wrap"><table class="table">
          <thead><tr><th></th>${r.days.map((d) => `<th class="num">${dayName(d.key, d.offset)}${d.adjustmentPct ? `<br><span class="badge badge-amber">${d.adjustmentPct > 0 ? '+' : ''}${d.adjustmentPct}%</span>` : ''}</th>`).join('')}</tr></thead>
          <tbody>
            <tr class="group"><td colspan="${r.days.length + 1}">${t('prep.ingredientsNeeded')}</td></tr>
            ${data.ingredients.map((i) => `<tr><td>${esc(L(i.name))} <span class="small muted">(${esc(L(i.unit))})</span></td>${r.days.map((d) => `<td class="num">${Math.ceil(d.need[i.id])}</td>`).join('')}</tr>`).join('')}
            <tr class="group"><td colspan="${r.days.length + 1}">${t('prep.salesForecast')}</td></tr>
            ${productsShown.map((pid) => { const p = api.catalog.product(pid); return `<tr class="${p && !p.available ? 'muted' : ''}"><td>${esc(p ? L(p.name) : pid)}${p && !p.available ? ` <span class="small">(${t('menu.soldOut').toLowerCase()})</span>` : ''}</td>${r.days.map((d) => `<td class="num">${Math.round(d.units[pid])}</td>`).join('')}</tr>`; }).join('')}
          </tbody></table></div>
        <p class="small muted">${t('prep.methodNote')}</p>
        ${api.auth.hasRole('admin') ? `<a class="link" href="#/admin/prep">${ic('gear', 16)} ${t('prep.adjustLink')}</a>` : ''}
      </section>
    </div>`;
  }

  // ---------- ASSISTANT ----------
  function assistant() {
    const chat = app.ui.chat = app.ui.chat || [];
    const examples = ['ex1', 'ex2', 'ex3', 'ex4', 'ex5', 'ex6'].map((k) => t('assistant.' + k));
    app.ui.afterRender = () => { const el = document.getElementById('chatlog'); if (el) el.scrollTop = el.scrollHeight; const i = document.getElementById('askInput'); if (i && !('ontouchstart' in window)) i.focus(); };
    return `<div class="staff-page chat-page">
      <header class="staff-head"><div><h1 class="h1">${t('staff.assistant')}</h1><p class="small muted">${t('assistant.sub')}</p></div>${App.sync && App.sync.live && App.sync.ai ? `<span class="badge badge-green">${App.i18n.T('AI connected', 'AI tilkoblet')}</span>` : demoBadge('assistant.demoBadge')}</header>
      <div class="chatlog" id="chatlog">
        ${chat.length ? '' : `<div class="chat-empty">${ic('chat', 32)}<p>${t('assistant.empty')}</p><div class="ex-list">${examples.map((e) => `<button class="chip" data-action="ask" data-q="${esc(e)}">${esc(e)}</button>`).join('')}</div></div>`}
        ${chat.map((m) => m.role === 'user'
          ? `<div class="msg user">${esc(m.text)}</div>`
          : `<div class="msg bot ${m.kind || ''}">${m.pending ? `<span class="typing"><i></i><i></i><i></i></span>` : `
              ${m.escalate ? `<div class="msg-flag">${ic('alert', 16)} ${t('assistant.escalate')}</div>` : ''}
              <div class="msg-text">${esc(m.text).replace(/\n/g, '<br>')}</div>
              ${(m.notes || []).map((n) => `<p class="msg-note">${ic('alert', 14)} ${esc(n)}</p>`).join('')}
              ${m.sources && m.sources.length ? `<div class="msg-sources"><span class="small muted">${t('assistant.sources')}:</span>${m.sources.map((s) => `<a href="${s.route}" class="source">${ic('book', 14)} ${esc(s.label)}</a>`).join('')}</div>` : `<div class="msg-sources"><span class="small muted">${t('assistant.noSource')}</span></div>`}`}
            </div>`).join('')}
      </div>
      ${(App.tenant.ai.languages || []).length ? `<div class="ai-langs small"><span class="muted">${App.i18n.T('Write in your language:', 'Skriv på ditt språk:')}</span> ${App.tenant.ai.languages.map((x) => `<button type="button" class="chip chip-xs" data-action="ask" data-q="${esc(x.example)}" title="${esc(x.example)}">${esc(x.name)}</button>`).join('')}${App.sync && App.sync.live && App.sync.ai ? '' : `<span class="muted"> · ${App.i18n.T('all languages work when the AI is connected', 'alle språk virker når AI er tilkoblet')}</span>`}</div>` : ''}
      <form class="chat-input" data-form="ask"><input id="askInput" name="q" class="input" autocomplete="off" placeholder="${t('assistant.ph')}" required><button class="btn btn-primary" aria-label="${t('assistant.send')}">${ic('arrow')}</button></form>
      <p class="small muted center">${t('assistant.disclaimer')}</p>
    </div>`;
  }

  // ---------- SCAN / VALIDATE REWARD ----------
  function scan() {
    const res = app.ui.scanResult;
    return `<div class="staff-page narrow">
      <header class="staff-head"><h1 class="h1">${t('staff.scan')}</h1></header>
      <p class="muted">${t('scan.sub')}</p>
      <form data-form="scanLookup" class="inline-field"><input name="code" class="input input-code" placeholder="FB123ABC" autocomplete="off" value="${esc(res ? res.code : '')}" required><button class="btn btn-dark">${t('scan.check')}</button></form>
      <p class="small muted">${t('scan.cameraNote')}</p>
      ${res ? (res.hit ? `<div class="card scan-res ${res.hit.voucher.status === 'active' ? 'ok' : 'used'}">
          <p class="eyebrow">${res.hit.voucher.status === 'active' ? t('scan.valid') : t('scan.used')}</p>
          <h2 class="h2">${esc(L(res.hit.reward.name))}</h2>
          <p class="small muted">${t('scan.customer')}: ${esc(res.hit.user ? res.hit.user.name : '—')} · ${esc(res.hit.voucher.code)}</p>
          ${res.hit.voucher.status === 'active' ? `<button class="btn btn-primary btn-block btn-lg" data-action="scanRedeem" data-code="${esc(res.hit.voucher.code)}">${ic('check', 18)} ${t('scan.redeem')}</button>` : `<p class="small">${t('scan.usedAt', { at: App.util.fmtDate(res.hit.voucher.usedAt, true), by: esc(res.hit.voucher.usedBy || t('scan.inApp')) })}</p>`}
        </div>` : `<div class="notice notice-red">${t('scan.notFound')}</div>`) : ''}
    </div>`;
  }

  // ---------- actions ----------
  Object.assign(App.actions, {
    staffLogin(d) { api.auth.login(d.id); app.render(); },
    staffLogout() { api.auth.logout(); app.ui.chat = []; app.go('#/staff'); },
    toggleCheck(d) { api.checklists.toggle(d.cl, staffLocation(), d.item); app.render(); },
    resetCheck(d) { app.confirm(t('checklist.resetConfirm'), t('checklist.reset'), () => { api.checklists.reset(d.cl, staffLocation()); app.render(); }, true); },
    togglePrep(d) { api.prep.toggle(staffLocation(), d.day, d.line, d.qty); app.render(); },
    print() { window.print(); },
    clearSearch() { app.ui.guideQ = ''; app.render(); },
    ask(d) { App.forms.ask({ q: d.q }); },
    scanRedeem(d) { const hit = api.counter.redeem(d.code); app.ui.scanResult = { code: d.code, hit }; app.toast(t('scan.redeemed')); app.render(); },
  });
  Object.assign(App.changes, {
    staffLoc(el) { app.ui.staffLoc = el.value; app.render(); },
  });
  Object.assign(App.forms, {
    guideSearch(data) { app.ui.guideQ = data.q; if (location.hash.startsWith('#/staff/guides')) app.render(); else app.go('#/staff/guides'); },
    ask(data) {
      const q = (data.q || '').trim(); if (!q) return;
      const chat = app.ui.chat = app.ui.chat || [];
      chat.push({ role: 'user', text: q });
      const pending = { role: 'bot', pending: true }; chat.push(pending);
      app.render();
      App.ai.ask(q, { locationId: staffLocation(), history: chat.slice(0, -2).filter((m) => m.text).map((m) => ({ role: m.role, text: m.text })) }).then((res) => {
        Object.assign(pending, res, { pending: false });
      }).catch(() => {
        Object.assign(pending, { pending: false, text: t('assistant.error'), escalate: true, sources: [] });
      }).then(() => setTimeout(() => { if (location.hash === '#/staff/assistant') app.render(); }, 350));
    },
    inventoryCount(data) {
      const items = {};
      api.inventory.items().forEach((it) => {
        const c = data['c_' + it.id], w = data['w_' + it.id];
        if (c !== '' && c != null) items[it.id] = { count: Number(c), waste: Number(w) || 0 };
      });
      api.inventory.submit(staffLocation(), App.prep.dayKey(new Date()), items);
      app.toast(t('inv.saved')); app.render(); window.scrollTo(0, document.body.scrollHeight);
    },
    staffReport(data) {
      api.staffReports.create({ ...data, locationId: staffLocation() });
      app.toast(data.kind === 'after' ? t('em.reportSent') : t('em.requestSent'));
      app.go('#/staff/emergency');
    },
    scanLookup(data) {
      const code = data.code.trim().toUpperCase().replace(/^FLAMEBURGER:/, '');
      app.ui.scanResult = { code, hit: api.counter.lookup(code) }; app.render();
    },
  });

  App.views.layouts = App.views.layouts || {};
  App.views.layouts.staff = layout;
  App.views.layouts.admin = layout;
  App.views.staffLogin = login;
  App.views.staffGuard = guard;
  App.views.staffLocation = staffLocation;
  App.views.approvalBadge = approvalBadge;

  const R = App.app.route;
  R('/staff', 'staff', guard(home));
  R('/staff/guides', 'staff', guard(guides));
  R('/staff/guides/:cat', 'staff', guard(guides));
  R('/staff/guide/:id', 'staff', guard(guide));
  R('/staff/checklists', 'staff', guard(checklists));
  R('/staff/checklists/:id', 'staff', guard(checklists));
  R('/staff/prep', 'staff', guard(prep));
  R('/staff/assistant', 'staff', guard(assistant));
  R('/staff/scan', 'staff', guard(scan));
  R('/staff/emergency', 'staff', guard(emergency));
  R('/staff/inventory', 'staff', guard(inventory));
})();
