/* Admin panel — role admin (enforced in App.api). */
(function () {
  const { esc, L, nok } = App.util;
  const t = (k, v) => App.i18n.t(k, v);
  const ic = App.art.icon;
  const api = App.api;
  const app = App.app;
  const guard = (fn) => App.views.staffGuard(fn, 'admin');
  const head = (title, sub) => `<header class="staff-head"><div><h1 class="h1">${title}</h1>${sub ? `<p class="small muted">${sub}</p>` : ''}</div></header>`;

  // ---------- OVERVIEW ----------
  function overview() {
    const T = App.kit.T, K = App.kit, W = App.wf;
    const loc = App.views.staffLocation();
    const mon = W.monday(W.today());
    const stats = api.shifts.weekStats(loc, mon);
    const cost = stats.reduce((s, d) => s + d.cost, 0), rev = stats.reduce((s, d) => s + d.revenue, 0);
    const approvals = api.requests.forManager().length + api.leave.all().filter((l) => l.status === 'pending').length;
    const timesheets = api.time.pendingCount(loc);
    const now = api.people.workingNow(loc).length;
    const open = api.shifts.open(loc).length;
    const posts = api.feed.list().filter((p) => p.mustRead);
    const team = api.people.team(loc);
    const mandatory = api.learning.courses().filter((c) => c.mandatory);
    const training = team.length ? Math.round(team.reduce((s, p) => s + mandatory.filter((c) => api.learning.progress(c.id, p.id).completedAt).length, 0) / (team.length * (mandatory.length || 1)) * 100) : 0;
    const kpi = (label, val, href, warn) => `<a class="kpi ${warn ? 'warn' : ''}" href="${href}"><span class="small muted">${label}</span><b>${val}</b></a>`;
    return `<div class="staff-page">
      ${head(T('Manager overview', 'Lederoversikt'), esc((api.catalog.location(loc) || {}).name) + ' · ' + T('week', 'uke') + ' ' + W.isoWeek(mon))}
      <div class="kpis">
        ${kpi(T('At work now', 'På jobb nå'), now, '#/staff/shifts/rota')}
        ${kpi(T('Approvals waiting', 'Venter på godkjenning'), approvals, '#/staff/shifts/approvals', approvals)}
        ${kpi(T('Timesheets to approve', 'Timelister å godkjenne'), timesheets, '#/staff/shifts/hours', timesheets)}
        ${kpi(T('Open shifts', 'Ledige vakter'), open, '#/staff/shifts/open', open)}
        ${kpi(T('Labour % this week', 'Lønnsprosent denne uka'), (cost / rev * 100).toFixed(1) + ' %', '#/staff/shifts/payroll', cost / rev * 100 > App.tenant.workforce.laborTargetPct)}
        ${kpi(T('Mandatory training', 'Obligatorisk opplæring'), training + ' %', '#/staff/community/learning', training < 80)}
      </div>
      ${staffReportsCard()}
      <section class="card"><h2 class="h3">${T('Must-read posts — read rate', 'Må-leses-innlegg — lesegrad')}</h2>
        ${posts.map((p) => { const n = api.feed.audienceSize(p); return `<a class="li-row" href="#/staff/community/post/${p.id}"><span>${esc(L(p.title) || L(p.text).slice(0, 60))}</span><span class="row nowrap small"><span class="meter w80"><span style="width:${Math.round(p.readBy.length / n * 100)}%"></span></span>${p.readBy.length}/${n}</span></a>`; }).join('') || '<p class="small muted">—</p>'}</section>
      <section class="card"><h2 class="h3">${t('admin.permissions')}</h2><p class="small">${t('admin.permissionsText')}</p></section>
    </div>`;
  }

  function staffReportsCard() {
    const list = api.staffReports.all();
    const open = list.filter((r) => r.status === 'awaiting' || r.status === 'reported');
    return `<section class="card ${open.some((r) => r.status === 'awaiting') ? 'card-alert' : ''}">
      <h2 class="h3">${ic('shield', 20)} ${t('admin.staffReports')} ${open.length ? `<span class="badge badge-red">${open.length}</span>` : ''}</h2>
      <p class="small muted">${t('admin.staffReportsSub')}</p>
      ${list.length ? list.slice(0, 8).map((r) => `${App.views.reportStatus(r).replace('</div>\n', '</div>')}
        ${r.status === 'awaiting' || r.status === 'reported' ? `<form data-form="decideReport" class="inline-field wrap"><input type="hidden" name="id" value="${r.id}">
          <span class="small">${esc(r.by)}</span>
          <input class="input input-sm" name="note" placeholder="${t('admin.decisionNote')}">
          ${r.status === 'awaiting'
            ? `<button class="btn btn-sm btn-primary" name="status" value="approved">${t('admin.approveAction')}</button><button class="btn btn-sm btn-ghost" name="status" value="rejected">${t('admin.rejectAction')}</button>`
            : `<button class="btn btn-sm btn-dark" name="status" value="closed">${t('admin.closeReport')}</button>`}
        </form>` : ''}`).join('') : `<p class="small muted">${t('admin.noReports')}</p>`}
    </section>`;
  }

  // ---------- PRODUCTS ----------
  function products() {
    const cats = api.catalog.categories();
    const list = api.catalog.products();
    return `<div class="staff-page">
      ${head(t('admin.products'), t('admin.productsSub'))}
      <div class="row"><button class="btn btn-primary btn-sm" data-action="editProduct" data-id="">${ic('plus', 16)} ${t('admin.addProduct')}</button>
        <form data-form="addCategory" class="inline-field"><input class="input input-sm" name="name" placeholder="${t('admin.newCategory')}" required><button class="btn btn-ghost btn-sm">${t('common.add')}</button></form></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>${t('admin.product')}</th><th>${t('admin.category')}</th><th class="num">${t('admin.price')}</th><th>${t('admin.available')}</th><th>${t('admin.allergens')}</th><th></th></tr></thead>
        <tbody>${list.map((p) => `<tr>
          <td><div class="tcell-prod"><span class="thumb">${App.art.productImage(p)}</span><b>${esc(L(p.name))}</b></div></td>
          <td><select class="input input-sm" data-change="prodCat" data-id="${p.id}">${cats.map((c) => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${esc(L(c.name))}</option>`).join('')}</select></td>
          <td class="num"><input class="input input-sm input-num" type="number" min="0" value="${p.priceNok}" data-change="prodPrice" data-id="${p.id}"></td>
          <td><label class="switch"><input type="checkbox" ${p.available ? 'checked' : ''} data-change="prodAvail" data-id="${p.id}"><span></span></label></td>
          <td>${p.allergens.status === 'verified' ? `<span class="badge badge-green">${t('admin.verified')}</span>` : `<span class="badge badge-amber">${t('admin.pending')}</span>`}</td>
          <td><button class="btn btn-sm btn-ghost" data-action="editProduct" data-id="${p.id}">${ic('edit', 16)}</button></td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
  }

  function productEditor(p) {
    const cats = api.catalog.categories();
    const isNew = !p;
    p = p || { name: { en: '', nb: '' }, description: { en: '', nb: '' }, priceNok: 0, categoryId: cats[0].id, available: true, featured: false, art: 'burger', allergens: { status: 'pending', contains: [], mayContain: [] } };
    const a = p.allergens;
    return `<form data-form="saveProduct" class="admin-sheet">
      <button type="button" class="sheet-close" data-action="closeModal">${ic('x')}</button>
      <h2 class="h2">${isNew ? t('admin.addProduct') : esc(L(p.name))}</h2>
      <input type="hidden" name="id" value="${p.id || ''}">
      <div class="grid-2">
        <div><label class="field-label">${t('admin.nameNb')}</label><input class="input" name="name_nb" value="${esc(p.name.nb)}" required></div>
        <div><label class="field-label">${t('admin.nameEn')}</label><input class="input" name="name_en" value="${esc(p.name.en)}" required></div>
        <div class="full"><label class="field-label">${t('admin.descNb')}</label><textarea class="input" name="desc_nb" rows="2">${esc(p.description.nb)}</textarea></div>
        <div class="full"><label class="field-label">${t('admin.descEn')}</label><textarea class="input" name="desc_en" rows="2">${esc(p.description.en)}</textarea></div>
        <div><label class="field-label">${t('admin.price')} (NOK)</label><input class="input" type="number" name="priceNok" value="${p.priceNok}" min="0" required></div>
        <div><label class="field-label">${t('admin.category')}</label><select class="input" name="categoryId">${cats.map((c) => `<option value="${c.id}" ${c.id === p.categoryId ? 'selected' : ''}>${esc(L(c.name))}</option>`).join('')}</select></div>
        <div class="full"><label class="field-label">${t('admin.imageUrl')}</label><input class="input" name="image" value="${esc(p.image || '')}" placeholder="https://…"></div>
        <label class="opt"><input type="checkbox" name="available" ${p.available ? 'checked' : ''}><span>${t('admin.available')}</span></label>
        <label class="opt"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}><span>${t('admin.featured')}</span></label>
      </div>
      ${isNew ? '' : `<fieldset class="opt-group allergen-edit"><legend>${t('admin.allergenTitle')}</legend>
        <p class="small muted">${t('admin.allergenHelp')}</p>
        <div class="allergen-grid"><span class="small"><b>${t('product.contains')}</b></span><span class="small"><b>${t('product.mayContain')}</b></span><span></span>
        ${App.config.allergenList.map((x) => `<label class="opt"><input type="checkbox" name="contains" value="${x.id}" ${a.contains.includes(x.id) ? 'checked' : ''}></label><label class="opt"><input type="checkbox" name="mayContain" value="${x.id}" ${a.mayContain.includes(x.id) ? 'checked' : ''}></label><span class="small">${esc(L(x))}</span>`).join('')}</div>
        <label class="opt verify"><input type="checkbox" name="verified" ${a.status === 'verified' ? 'checked' : ''}><span><b>${t('admin.markVerified')}</b><br><span class="small muted">${t('admin.markVerifiedHelp')}</span></span></label>
      </fieldset>`}
      <button class="btn btn-primary btn-block">${t('common.save')}</button>
    </form>`;
  }

  // ---------- ORDERS & INCIDENTS ----------
  function orderTable(list, compact) {
    return `<div class="table-wrap"><table class="table">
      <thead><tr><th>${t('admin.order')}</th>${compact ? '' : `<th>${t('admin.customer')}</th>`}<th>${t('admin.mode')}</th><th class="num">${t('cart.total')}</th><th>${t('admin.status')}</th></tr></thead>
      <tbody>${list.map((o) => { const u = App.store.db.users.find((x) => x.id === o.userId); const flow = App.config.orderFlow[o.mode]; return `<tr>
        <td><a class="link" href="#/order/${o.id}">${o.id}</a><br><span class="small muted">${App.util.fmtDate(o.createdAt, true)}</span></td>
        ${compact ? '' : `<td>${esc(u ? u.name : '—')}</td>`}
        <td>${t('mode.' + o.mode)}</td><td class="num">${nok(o.totalNok)}</td>
        <td><select class="input input-sm" data-change="orderStatus" data-id="${o.id}">${flow.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${t('status.' + s)}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>`;
  }

  function incRow(inc) {
    const flow = App.config.incidentFlow;
    return `<div class="inc-row">
      <div class="row-between"><b>${inc.id} · <a class="link" href="#/order/${inc.orderId}">${inc.orderId}</a></b><span class="badge badge-red">${t('istatus.' + inc.status)}</span></div>
      <p class="small">${t('itype.' + inc.type)} · ${t('admin.preferred')}: ${t('pref.' + inc.preferred)}${inc.description ? ' · “' + esc(inc.description) + '”' : ''}</p>
      <form data-form="incidentUpdate" class="inline-field">
        <input type="hidden" name="id" value="${inc.id}">
        <select class="input input-sm" name="status">${flow.map((s) => `<option value="${s}" ${s === inc.status ? 'selected' : ''}>${t('istatus.' + s)}</option>`).join('')}</select>
        <input class="input input-sm" name="note" placeholder="${t('admin.noteToCustomer')}">
        <button class="btn btn-sm btn-dark">${t('common.update')}</button>
      </form>
    </div>`;
  }

  function orders() {
    const inc = api.incidents.all();
    return `<div class="staff-page">
      ${head(t('admin.orders'), t('admin.ordersSub'))}
      <section class="card"><h2 class="h3">${t('admin.incidents')}</h2>${inc.length ? inc.map(incRow).join('') : `<p class="muted small">${t('admin.noIncidents')}</p>`}</section>
      <section class="card"><h2 class="h3">${t('admin.allOrders')}</h2>${orderTable(api.orders.all())}</section>
    </div>`;
  }

  // ---------- CATERING ----------
  function catering() {
    const list = api.catering.all();
    return `<div class="staff-page">
      ${head(t('nav.catering'), t('admin.cateringSub'))}
      ${list.map((r) => { const pack = api.catalog.cateringPacks().find((p) => p.id === r.packId); return `<section class="card">
        <div class="row-between"><h2 class="h3">${r.id} · ${esc(r.contact.company || r.contact.name)}</h2>${App.views.cateringBadge(r.status)}</div>
        <p class="small">${esc(r.date)} ${esc(r.time)} · ${r.people} ${t('catering.people')} · ${esc(pack ? L(pack.name) : t('catering.custom'))}</p>
        <p class="small muted">${esc(r.address)} · ${esc(r.contact.email)} · ${esc(r.contact.phone)}</p>
        ${r.preferences ? `<p class="small"><b>${t('catering.preferences')}:</b> ${esc(r.preferences)}</p>` : ''}
        ${r.dietary ? `<p class="small"><b>${t('catering.dietary')}:</b> ${esc(r.dietary)}</p>` : ''}
        ${r.quote ? `<p class="small"><b>${t('catering.quote')}:</b> ${nok(r.quote.amountNok)} — ${esc(r.quote.message)}</p>` : ''}
        ${r.status === 'quote_requested' || r.status === 'quote_sent' ? `<form data-form="sendQuote" class="inline-field wrap">
          <input type="hidden" name="id" value="${r.id}">
          <input class="input input-sm input-num" type="number" name="amount" placeholder="NOK" required value="${r.quote ? r.quote.amountNok : ''}">
          <input class="input input-sm" name="message" placeholder="${t('admin.quoteMsg')}" value="${esc(r.quote ? r.quote.message : '')}">
          <button class="btn btn-sm btn-primary">${r.quote ? t('admin.updateQuote') : t('admin.sendQuote')}</button>
          <button type="button" class="btn btn-sm btn-ghost" data-action="declineCatering" data-id="${r.id}">${t('admin.decline')}</button>
        </form>` : ''}
      </section>`; }).join('') || `<p class="muted">${t('admin.noCatering')}</p>`}
    </div>`;
  }

  // ---------- LOYALTY, REVIEWS & DELIVERY RULES ----------
  function loyalty() {
    const s = api.settings.get();
    const reviews = api.reviews.all();
    return `<div class="staff-page">
      ${head(t('admin.loyalty'), t('admin.loyaltySub'))}
      <div class="split">
        <form class="card" data-form="saveRules">
          <h2 class="h3">${t('admin.pointsRules')} <span class="badge badge-amber">${t('common.proposal')}</span></h2>
          <div class="grid-2">
            <div><label class="field-label">${t('admin.earnPoints')}</label><input class="input" type="number" name="earnPoints" min="0" value="${s.loyalty.earnPoints}"></div>
            <div><label class="field-label">${t('admin.earnPerNok')}</label><input class="input" type="number" name="earnPerNok" min="1" value="${s.loyalty.earnPerNok}"></div>
            <div><label class="field-label">${t('admin.reviewPoints')}</label><input class="input" type="number" name="reviewPoints" min="0" value="${s.loyalty.reviewPoints}"></div>
            <div><label class="field-label">${t('admin.reviewWindow')}</label><input class="input" type="number" name="reviewWindowDays" min="1" value="${s.loyalty.reviewWindowDays}"></div>
          </div>
          <h2 class="h3">${t('admin.deliveryRules')} <span class="badge badge-amber">${t('common.provisional')}</span></h2>
          <div class="grid-2">
            <div><label class="field-label">${t('delivery.minimum')} (NOK)</label><input class="input" type="number" name="minimumOrderNok" min="0" value="${s.delivery.minimumOrderNok}"></div>
            <div><label class="field-label">${t('cart.deliveryFee')} (NOK)</label><input class="input" type="number" name="feeNok" min="0" value="${s.delivery.feeNok}"></div>
            <label class="opt full"><input type="checkbox" name="deliveryEnabled" ${s.delivery.enabled ? 'checked' : ''}><span>${t('admin.deliveryEnabled')}</span></label>
          </div>
          <p class="small muted">${t('admin.zonesNote')}</p>
          <button class="btn btn-primary">${t('common.save')}</button>
        </form>
        <section class="card">
          <h2 class="h3">${t('admin.rewards')}</h2>
          ${api.loyalty.rewards().map((r) => `<form class="inline-field reward-edit" data-form="saveReward"><input type="hidden" name="id" value="${r.id}">
            <span class="grow">${esc(L(r.name))}</span>
            <input class="input input-sm input-num" type="number" name="costPoints" value="${r.costPoints}" min="1" aria-label="${t('rewards.points')}">
            <label class="switch"><input type="checkbox" name="active" ${r.active ? 'checked' : ''}><span></span></label>
            <button class="btn btn-sm btn-ghost">${t('common.save')}</button></form>`).join('')}
          <p class="small muted">${t('admin.rewardsNote')}</p>
        </section>
      </div>
      <section class="card"><div class="row-between"><h2 class="h3">${t('admin.reviews')}</h2><span class="small muted">${t('admin.reviewsNote')}</span></div>
        ${reviews.map((r) => { const u = App.store.db.users.find((x) => x.id === r.userId); return `<div class="inc-row"><div class="row-between"><b>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} <span class="small muted">${esc(u ? u.name : '')} · ${esc(r.orderId)}</span></b><span class="small muted">${App.util.fmtDate(r.createdAt)}</span></div>
          <p class="small">${t('review.food')}: ${r.food || '—'} · ${t('review.service')}: ${r.service || '—'}${r.comment ? ' · “' + esc(r.comment) + '”' : ''}</p><span class="badge badge-gray">${t('admin.incentivised', { n: r.pointsAwarded })}</span></div>`; }).join('') || `<p class="muted small">—</p>`}
      </section>
    </div>`;
  }

  // ---------- PREP SETTINGS ----------
  function prepAdmin() {
    const loc = App.views.staffLocation();
    const s = api.prep.settings();
    const data = api.prep.data();
    const adj = api.prep.adjustments();
    const days = Array.from({ length: 7 }, (_, i) => App.prep.addDays(App.prep.dayKey(new Date()), i));
    return `<div class="staff-page">
      ${head(t('admin.prepTitle'), t('admin.prepSub'))}
      <div class="split">
        <section class="card">
          <h2 class="h3">${t('admin.prepAdjust')}</h2>
          <p class="small muted">${t('admin.prepAdjustHelp')}</p>
          <select class="input input-sm" data-change="staffLoc">${api.catalog.locations().map((l) => `<option value="${l.id}" ${l.id === loc ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
          ${days.map((d) => `<form class="inline-field reward-edit" data-form="prepAdjust"><input type="hidden" name="day" value="${d}"><span class="grow">${new Date(d + 'T12:00').toLocaleDateString(App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            <input class="input input-sm input-num" type="number" name="pct" value="${adj[loc + '|' + d] || 0}" step="5"> % <button class="btn btn-sm btn-ghost">${t('common.save')}</button></form>`).join('')}
        </section>
        <section class="card">
          <form data-form="prepSettings"><h2 class="h3">${t('admin.prepBuffer')} <span class="badge badge-amber">${t('common.provisional')}</span></h2>
            <div class="inline-field"><input class="input input-num" type="number" name="bufferPct" value="${s.bufferPct}" min="0" max="100"> % <button class="btn btn-sm btn-primary">${t('common.save')}</button></div></form>
          <h2 class="h3">${t('admin.prepBaseline')} ${App.util.esc('')}<span class="badge badge-demo">${t('demo.badge')}</span></h2>
          <p class="small muted">${t('admin.prepBaselineHelp')}</p>
          ${Object.keys(data.baseline).map((pid) => { const p = api.catalog.product(pid); return `<form class="inline-field reward-edit" data-form="prepBaseline"><input type="hidden" name="pid" value="${pid}"><span class="grow">${esc(p ? L(p.name) : pid)}</span><input class="input input-sm input-num" type="number" name="units" value="${data.baseline[pid]}" min="0"><button class="btn btn-sm btn-ghost">${t('common.save')}</button></form>`; }).join('')}
        </section>
      </div>
      <section class="card"><h2 class="h3">${t('admin.usageHistory')}</h2><p class="small muted">${t('admin.usageHistorySub')}</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>${t('admin.countDay')}</th>${data.inventoryItems.filter((it, i, a) => a.findIndex((x) => x.ingredientId === it.ingredientId) === i).map((it) => `<th class="num">${esc(L(data.ingredients.find((x) => x.id === it.ingredientId).name))}</th>`).join('')}</tr></thead>
        <tbody>${api.inventory.history(loc).slice(0, 10).map((l) => `<tr><td>${App.util.fmtDate(l.to + 'T12:00')}${l.demo ? ' <span class="badge badge-demo">demo</span>' : ''}</td>${data.inventoryItems.map((it) => { const x = l.ingredients[it.ingredientId]; if (!x) return '<td class="num muted">—</td>'; const d = x.forecast ? Math.round((x.actual / x.forecast - 1) * 100) : 0; return `<td class="num">${x.actual}<br><span class="small ${Math.abs(d) >= 10 ? 'warn' : 'muted'}">${d > 0 ? '+' : ''}${d}%</span></td>`; }).join('')}</tr>`).join('') || `<tr><td class="muted">—</td></tr>`}</tbody></table></div>
      </section>
      <a href="#/staff/prep" class="btn btn-dark">${t('admin.viewPrep')}</a>
    </div>`;
  }

  // ---------- GUIDES & AI DOCS ----------
  function docs() {
    const list = App.store.db.guides; // read through api for permission check:
    api.guides.all();
    return `<div class="staff-page">
      ${head(t('admin.docs'), t('admin.docsSub'))}
      <button class="btn btn-primary btn-sm" data-action="editGuide" data-id="">${ic('plus', 16)} ${t('admin.newGuide')}</button>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>${t('admin.guide')}</th><th>${t('admin.approval')}</th><th>${t('admin.aiUse')}</th><th>${t('guide.updated')}</th><th></th></tr></thead>
        <tbody>${list.map((g) => `<tr><td><a class="link" href="#/staff/guide/${g.id}">${esc(L(g.title))}</a></td>
          <td><select class="input input-sm" data-change="guideApproval" data-id="${g.id}">${['demo', 'draft', 'approved'].map((a) => `<option value="${a}" ${g.approval === a ? 'selected' : ''}>${t('guide.' + a)}</option>`).join('')}</select></td>
          <td><label class="switch"><input type="checkbox" ${g.aiEnabled ? 'checked' : ''} data-change="guideAi" data-id="${g.id}"><span></span></label></td>
          <td class="small">${App.util.fmtDate(g.updatedAt)}</td>
          <td><button class="btn btn-sm btn-ghost" data-action="editGuide" data-id="${g.id}">${ic('edit', 16)}</button></td></tr>`).join('')}</tbody></table></div>
      <div class="notice notice-ink small">${ic('shield', 18)} <span>${t('admin.aiRules')}</span></div>
    </div>`;
  }

  function guideEditor(g) {
    const cats = api.guides.categories();
    const isNew = !g;
    g = g || { id: '', categoryId: cats[0].id, approval: 'draft', aiEnabled: false, title: { en: '', nb: '' }, summary: { en: '', nb: '' }, steps: [], warnings: [], keywords: [], reviewDue: null };
    const lines = (arr, lang) => arr.map((s) => (s.text ? s.text[lang] : s[lang])).join('\n');
    return `<form data-form="saveGuide" class="admin-sheet">
      <button type="button" class="sheet-close" data-action="closeModal">${ic('x')}</button>
      <h2 class="h2">${isNew ? t('admin.newGuide') : esc(L(g.title))}</h2>
      <input type="hidden" name="id" value="${g.id}">
      <div class="grid-2">
        <div><label class="field-label">${t('admin.titleNb')}</label><input class="input" name="title_nb" value="${esc(g.title.nb)}" required></div>
        <div><label class="field-label">${t('admin.titleEn')}</label><input class="input" name="title_en" value="${esc(g.title.en)}" required></div>
        <div><label class="field-label">${t('admin.category')}</label><select class="input" name="categoryId">${cats.map((c) => `<option value="${c.id}" ${c.id === g.categoryId ? 'selected' : ''}>${esc(L(c.name))}</option>`).join('')}</select></div>
        <div><label class="field-label">${t('guide.review')}</label><input class="input" type="date" name="reviewDue" value="${g.reviewDue ? g.reviewDue.slice(0, 10) : ''}"></div>
        <div class="full"><label class="field-label">${t('admin.summaryNb')}</label><input class="input" name="summary_nb" value="${esc(g.summary.nb)}"></div>
        <div class="full"><label class="field-label">${t('admin.summaryEn')}</label><input class="input" name="summary_en" value="${esc(g.summary.en)}"></div>
        <div class="full"><label class="field-label">${t('admin.stepsNb')}</label><textarea class="input" name="steps_nb" rows="5">${esc(lines(g.steps, 'nb'))}</textarea></div>
        <div class="full"><label class="field-label">${t('admin.stepsEn')}</label><textarea class="input" name="steps_en" rows="5">${esc(lines(g.steps, 'en'))}</textarea></div>
        <div class="full"><label class="field-label">${t('admin.warningsEn')}</label><textarea class="input" name="warnings" rows="2">${esc(lines(g.warnings, 'en'))}</textarea></div>
        <div class="full"><label class="field-label">${t('admin.keywords')}</label><input class="input" name="keywords" value="${esc(g.keywords.join(', '))}"></div>
      </div>
      <p class="small muted">${t('admin.mediaNote')}</p>
      <button class="btn btn-primary btn-block">${t('common.save')}</button>
    </form>`;
  }

  // ---------- USERS ----------
  function users() {
    const me = api.auth.me();
    return `<div class="staff-page">
      ${head(t('admin.users'), t('admin.usersSub'))}
      <div class="table-wrap"><table class="table"><thead><tr><th>${t('common.name')}</th><th>${t('common.email')}</th><th>${t('admin.role')}</th>${App.sync && App.sync.live ? '<th>PIN</th>' : ''}</tr></thead>
      <tbody>${api.admin.users().filter((u) => u.role !== 'customer').map((u) => `<tr><td>${esc(u.name)}</td><td class="small">${esc(u.email)}</td>
        <td><select class="input input-sm" data-change="userRole" data-id="${u.id}" ${u.id === me.id ? 'disabled' : ''}>${['staff', 'admin'].map((r) => `<option value="${r}" ${u.role === r ? 'selected' : ''}>${t('role.' + r)}</option>`).join('')}</select></td>
        ${App.sync && App.sync.live ? `<td>${u.id === me.id ? '' : `<button class="btn btn-sm btn-ghost" data-action="resetPin" data-id="${u.id}">${ic('lock', 14)} ${App.i18n.T('New PIN', 'Ny PIN')}</button>`}</td>` : ''}</tr>`).join('')}</tbody></table></div>
      <section class="card"><h2 class="h3">${t('admin.roleMatrix')}</h2>
        <table class="table small"><thead><tr><th></th><th>${t('role.customer')}</th><th>${t('role.staff')}</th><th>${t('role.admin')}</th></tr></thead><tbody>
        ${[['rm.order', 1, 1, 1], ['rm.guides', 0, 1, 1], ['rm.emergency', 0, 1, 1], ['rm.approve', 0, 0, 1], ['rm.prep', 0, 1, 1], ['rm.scan', 0, 1, 1], ['rm.incidents', 0, 1, 1], ['rm.catalog', 0, 0, 1], ['rm.rules', 0, 0, 1], ['rm.users', 0, 0, 1]].map(([k, a, b, c]) => `<tr><td>${t(k)}</td>${[a, b, c].map((v) => `<td>${v ? '✔' : '—'}</td>`).join('')}</tr>`).join('')}
        </tbody></table></section>
    </div>`;
  }

  // ---------- actions ----------
  const rerender = (msg) => { if (msg) app.toast(msg); app.render(); };
  Object.assign(App.actions, {
    editProduct(d) { app.modal(productEditor(d.id ? api.catalog.product(d.id) : null)); },
    editGuide(d) { app.modal(guideEditor(d.id ? api.guides.get(d.id) : null)); },
    declineCatering(d) { api.catering.setStatus(d.id, 'declined'); rerender(t('common.saved')); },
  });
  Object.assign(App.changes, {
    prodPrice(el) { api.admin.saveProduct({ id: el.dataset.id, priceNok: Number(el.value) }); app.toast(t('common.saved')); },
    prodAvail(el) { api.admin.saveProduct({ id: el.dataset.id, available: el.checked }); app.toast(t('common.saved')); },
    prodCat(el) { api.admin.saveProduct({ id: el.dataset.id, categoryId: el.value }); app.toast(t('common.saved')); },
    orderStatus(el) { api.orders.setStatus(el.dataset.id, el.value); rerender(t('common.saved')); },
    guideApproval(el) { const g = api.guides.get(el.dataset.id); g.approval = el.value; api.guides.save(g); rerender(t('common.saved')); },
    guideAi(el) { const g = api.guides.get(el.dataset.id); g.aiEnabled = el.checked; api.guides.save(g); rerender(t('common.saved')); },
    userRole(el) { api.admin.setRole(el.dataset.id, el.value); rerender(t('common.saved')); },
  });
  Object.assign(App.forms, {
    addCategory(data) { api.admin.addCategory(data.name); rerender(t('common.saved')); },
    saveProduct(data) {
      const p = { name: { nb: data.name_nb, en: data.name_en }, description: { nb: data.desc_nb, en: data.desc_en }, priceNok: Number(data.priceNok),
        categoryId: data.categoryId, image: data.image || null, available: !!data.available, featured: !!data.featured };
      if (data.id) p.id = data.id;
      api.admin.saveProduct(p);
      if (data.id) api.admin.verifyAllergens(data.id, [].concat(data.contains || []), [].concat(data.mayContain || []), !!data.verified);
      app.modal(null); rerender(t('common.saved'));
    },
    decideReport(data, form) {
      const status = data.status || (document.activeElement && document.activeElement.value) || 'closed';
      api.staffReports.decide(data.id, status, data.note); rerender(t('common.saved'));
    },
    incidentUpdate(data) { api.incidents.setStatus(data.id, data.status, data.note); rerender(t('common.saved')); },
    sendQuote(data) { api.catering.sendQuote(data.id, data.amount, data.message); rerender(t('admin.quoteSent')); },
    saveRules(data) {
      api.settings.update({
        loyalty: { earnPoints: Number(data.earnPoints), earnPerNok: Math.max(1, Number(data.earnPerNok)), reviewPoints: Number(data.reviewPoints), reviewWindowDays: Number(data.reviewWindowDays) },
        delivery: { minimumOrderNok: Number(data.minimumOrderNok), feeNok: Number(data.feeNok), enabled: !!data.deliveryEnabled },
      });
      rerender(t('common.saved'));
    },
    saveReward(data) { api.loyalty.saveReward({ id: data.id, costPoints: Number(data.costPoints), active: !!data.active }); rerender(t('common.saved')); },
    prepAdjust(data) { api.prep.setAdjustment(App.views.staffLocation(), data.day, data.pct); rerender(t('common.saved')); },
    prepSettings(data) { api.prep.updateSettings({ bufferPct: Number(data.bufferPct) }); rerender(t('common.saved')); },
    prepBaseline(data) { api.prep.setBaseline(data.pid, data.units); rerender(t('common.saved')); },
    saveGuide(data) {
      const split = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
      const nb = split(data.steps_nb), en = split(data.steps_en);
      const old = data.id ? api.guides.get(data.id) : null;
      const g = Object.assign({}, old || { id: App.util.uid('g'), approval: 'draft', aiEnabled: false }, {
        categoryId: data.categoryId, title: { nb: data.title_nb, en: data.title_en }, summary: { nb: data.summary_nb, en: data.summary_en },
        steps: Array.from({ length: Math.max(nb.length, en.length) }, (_, i) => ({ text: { nb: nb[i] || en[i], en: en[i] || nb[i] }, media: old && old.steps[i] ? old.steps[i].media : null })),
        warnings: split(data.warnings).map((w) => ({ en: w, nb: w })), keywords: data.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        reviewDue: data.reviewDue ? new Date(data.reviewDue).toISOString() : null,
      });
      api.guides.save(g); app.modal(null); rerender(t('common.saved'));
    },
  });

  const R = App.app.route;
  R('/admin', 'admin', guard(overview));
  R('/admin/products', 'admin', guard(products));
  R('/admin/prep', 'admin', guard(prepAdmin));
  R('/admin/docs', 'admin', guard(docs));
  R('/admin/users', 'admin', guard(users));
})();
