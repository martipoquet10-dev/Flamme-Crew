/*
 * IN STORE area — Recipes (#/staff/recipes, #/staff/recipe/:id)
 *   Illustrated prep recipes with batch scaling, tick-off ingredients, step cards,
 *   tools, warnings and links between recipes. Data: tenants/<client>/recipes.js
 */
(function () {
  const U = App.util, K = App.kit;
  const { esc, L } = U;
  const T = K.T;
  const ic = App.art.icon;
  const app = App.app;
  const guard = (fn, role) => App.views.guard(fn, role);
  const R = () => App.recipes || { list: [], categories: [], tools: {} };
  const get = (id) => R().list.find((r) => r.id === id);

  // ---------- amounts ----------
  function amount(ing, mult) {
    const q = ing.qty * mult;
    if (ing.unit === 'pcs') { const n = Math.round(q * 10) / 10; return n + ' ' + T(n === 1 ? 'piece' : 'pieces', n === 1 ? 'stk' : 'stk'); }
    const txt = q >= 1000 ? (Math.round(q / 10) / 100).toString().replace('.', App.i18n.lang === 'nb' ? ',' : '.') + ' kg' : Math.round(q) + ' g';
    return txt;
  }
  const totalG = (r, mult) => r.ingredients.filter((i) => i.unit === 'g').reduce((s, i) => s + i.qty, 0) * (mult || 1);
  const yieldText = (r, mult) => { const pcs = r.ingredients.find((i) => i.unit === 'pcs'); return pcs ? amount(pcs, mult || 1) + ' ' + L(pcs.name).toLowerCase() : '≈ ' + amount({ qty: totalG(r), unit: 'g' }, mult || 1); };

  // ---------- illustrations (drawn, not photos) ----------
  function rng(seed) { let h = 2166136261; for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
  function art(r, size) {
    const a = r.art || {}; const id = 'r' + r.id.replace(/\W/g, '') + (size || 0);
    const rand = rng(r.id);
    const bowl = (inner) => `
      <defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1F3F5"/><stop offset=".55" stop-color="#ADB5BD"/><stop offset="1" stop-color="#6C757D"/></linearGradient>
        <radialGradient id="${id}f" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="${a.light}"/><stop offset="1" stop-color="${a.base}"/></radialGradient>
      </defs>
      <ellipse cx="160" cy="196" rx="112" ry="12" fill="#000" opacity=".10"/>
      <path d="M44 104 Q52 196 160 196 Q268 196 276 104 Z" fill="url(#${id}s)"/>
      <ellipse cx="160" cy="104" rx="116" ry="34" fill="#DEE2E6"/>
      <ellipse cx="160" cy="106" rx="104" ry="28" fill="url(#${id}f)"/>
      ${inner}
      <path d="M58 132 Q84 176 140 184" stroke="#fff" stroke-width="5" fill="none" opacity=".45" stroke-linecap="round"/>`;
    const flecks = (n, rx, ry, r0, r1) => Array.from({ length: n }, () => { const t = rand() * Math.PI * 2, d = Math.sqrt(rand()); const c = a.flecks[Math.floor(rand() * a.flecks.length)]; return `<circle cx="${(160 + Math.cos(t) * d * rx).toFixed(1)}" cy="${(106 + Math.sin(t) * d * ry).toFixed(1)}" r="${(r0 + rand() * (r1 - r0)).toFixed(1)}" fill="${c}" opacity=".85"/>`; }).join('');
    let body = '';
    if (a.kind === 'bowl') {
      body = bowl(`<path d="M96 104 q30 -16 64 -4 q34 12 64 -2" stroke="${a.light}" stroke-width="7" fill="none" opacity=".9" stroke-linecap="round"/>
        <path d="M116 116 q26 -10 50 0 q20 8 40 0" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>
        ${flecks(46, 92, 22, 1.2, 2.6)}
        <g transform="rotate(-28 230 70)"><rect x="226" y="-6" width="8" height="80" rx="4" fill="#495057"/>${[0, 1, 2, 3].map((i) => `<ellipse cx="230" cy="${92}" rx="${6 + i * 4}" ry="22" fill="none" stroke="#CED4DA" stroke-width="2"/>`).join('')}</g>`);
    } else if (a.kind === 'mushrooms') {
      body = bowl(Array.from({ length: 22 }, () => { const t = rand() * Math.PI * 2, d = Math.sqrt(rand()); const x = 160 + Math.cos(t) * d * 84, y = 104 + Math.sin(t) * d * 18, rot = rand() * 360, s = .8 + rand() * .5;
        return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${s.toFixed(2)})"><path d="M-11 0 a11 9 0 0 1 22 0 z" fill="${a.base}"/><path d="M-9 0 a9 6 0 0 1 18 0" fill="${a.light}"/><rect x="-3.5" y="0" width="7" height="8" rx="2" fill="${a.light}"/></g>`; }).join('') + flecks(30, 90, 22, .8, 1.6));
    } else if (a.kind === 'slaw') {
      body = bowl(Array.from({ length: 150 }, () => { const t = rand() * Math.PI * 2, d = Math.sqrt(rand()); const x = 160 + Math.cos(t) * d * 90, y = 106 + Math.sin(t) * d * 22; const c = rand() < .5 ? (rand() < .5 ? '#F4F7E4' : '#D3E8A8') : a.flecks[Math.floor(rand() * a.flecks.length)]; const ang = rand() * Math.PI;
        return `<line x1="${(x - Math.cos(ang) * 9).toFixed(1)}" y1="${(y - Math.sin(ang) * 3).toFixed(1)}" x2="${(x + Math.cos(ang) * 9).toFixed(1)}" y2="${(y + Math.sin(ang) * 3).toFixed(1)}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`; }).join('') +
        `<ellipse cx="132" cy="100" rx="16" ry="5" fill="#F2A46B" opacity=".75"/><ellipse cx="186" cy="110" rx="14" ry="5" fill="#E2582B" opacity=".7"/>`);
    } else if (a.kind === 'chunks') {
      body = bowl(Array.from({ length: 48 }, () => { const t = rand() * Math.PI * 2, d = Math.sqrt(rand()); const x = 160 + Math.cos(t) * d * 88, y = 106 + Math.sin(t) * d * 21; const c = a.flecks[Math.floor(rand() * a.flecks.length)]; const s = 4 + rand() * 4;
        return `<rect x="${(x - s / 2).toFixed(1)}" y="${(y - s / 3).toFixed(1)}" width="${s.toFixed(1)}" height="${(s * .7).toFixed(1)}" rx="1.6" fill="${c}" transform="rotate(${(rand() * 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('') +
        Array.from({ length: 10 }, () => `<circle cx="${(90 + rand() * 140).toFixed(1)}" cy="${(96 + rand() * 20).toFixed(1)}" r="${(2 + rand() * 2).toFixed(1)}" fill="none" stroke="#F3D9A4" stroke-width="1.4"/>`).join(''));
    } else if (a.kind === 'avocado') {
      body = `<defs><radialGradient id="${id}f" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="${a.light}"/><stop offset="1" stop-color="${a.base}"/></radialGradient></defs>
        <ellipse cx="160" cy="198" rx="120" ry="10" fill="#000" opacity=".10"/>
        <path d="M112 128 Q118 196 186 196 Q254 196 260 128 Z" fill="#E9ECEF"/><ellipse cx="186" cy="128" rx="74" ry="22" fill="#F8F9FA"/><ellipse cx="186" cy="130" rx="66" ry="17" fill="url(#${id}f)"/>
        ${Array.from({ length: 26 }, () => `<circle cx="${(130 + rand() * 112).toFixed(1)}" cy="${(122 + rand() * 16).toFixed(1)}" r="${(1.5 + rand() * 3).toFixed(1)}" fill="${rand() < .5 ? a.light : a.flecks[0]}" opacity=".8"/>`).join('')}
        <g transform="translate(78 104) rotate(-18)"><path d="M0 -62 C34 -62 44 -10 40 20 C36 52 18 66 0 66 C-18 66 -36 52 -40 20 C-44 -10 -34 -62 0 -62Z" fill="#3B5A1E"/>
          <path d="M0 -54 C28 -54 36 -8 33 18 C30 46 15 58 0 58 C-15 58 -30 46 -33 18 C-36 -8 -28 -54 0 -54Z" fill="#D8EBA0"/>
          <path d="M0 -40 C20 -40 26 -4 24 16 C22 38 12 46 0 46 C-12 46 -22 38 -24 16 C-26 -4 -20 -40 0 -40Z" fill="#B7D96B"/>
          <circle cx="0" cy="18" r="17" fill="#8B5A2B"/><circle cx="-5" cy="12" r="5" fill="#B07A44"/></g>
        <g transform="translate(248 70) rotate(22) scale(.7)"><path d="M0 -62 C34 -62 44 -10 40 20 C36 52 18 66 0 66 C-18 66 -36 52 -40 20 C-44 -10 -34 -62 0 -62Z" fill="#3B5A1E"/><path d="M0 -54 C28 -54 36 -8 33 18 C30 46 15 58 0 58 C-15 58 -30 46 -33 18 C-36 -8 -28 -54 0 -54Z" fill="#D8EBA0"/><circle cx="0" cy="18" r="16" fill="#E7F2C4" stroke="#B7D96B" stroke-width="3"/></g>
        <circle cx="270" cy="168" r="14" fill="#F7E26B"/><circle cx="270" cy="168" r="10" fill="#FBEFA0"/>${[0, 1, 2, 3, 4, 5].map((i) => `<line x1="270" y1="168" x2="${(270 + Math.cos(i * Math.PI / 3) * 10).toFixed(1)}" y2="${(168 + Math.sin(i * Math.PI / 3) * 10).toFixed(1)}" stroke="#E3C94A" stroke-width="1.2"/>`).join('')}`;
    } else if (a.kind === 'jar') {
      body = `<defs><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a.light}" stop-opacity=".9"/><stop offset="1" stop-color="${a.base}"/></linearGradient></defs>
        <ellipse cx="160" cy="200" rx="96" ry="9" fill="#000" opacity=".10"/>
        <rect x="88" y="44" width="144" height="156" rx="22" fill="#F8F9FA" opacity=".6" stroke="#CED4DA" stroke-width="3"/>
        <rect x="96" y="78" width="128" height="116" rx="16" fill="url(#${id}f)"/>
        ${Array.from({ length: 18 }, () => { const x = 108 + rand() * 104, y = 92 + rand() * 92, rx = 8 + rand() * 9; return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * .45).toFixed(1)}" fill="none" stroke="${rand() < .6 ? '#FCE4EC' : '#880E4F'}" stroke-width="2.4" opacity=".9" transform="rotate(${(rand() * 50 - 25).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('')}
        <rect x="80" y="30" width="160" height="22" rx="7" fill="#ADB5BD"/><rect x="80" y="30" width="160" height="8" rx="4" fill="#CED4DA"/>
        <rect x="104" y="58" width="10" height="126" rx="5" fill="#fff" opacity=".35"/>
        <g transform="translate(248 150)"><path d="M0 -26 C16 -26 22 -8 20 6 C18 20 8 28 0 28 C-8 28 -18 20 -20 6 C-22 -8 -16 -26 0 -26Z" fill="#8E244D"/><path d="M0 -26 q-2 -10 4 -14" stroke="#5C7A1F" stroke-width="3" fill="none"/></g>`;
    }
    const label = a.label ? `<g transform="translate(26 22)"><rect width="${a.label.length * 9 + 20}" height="24" rx="12" fill="#fff" opacity=".92"/><text x="${(a.label.length * 9 + 20) / 2}" y="16.5" text-anchor="middle" font-family="Inter,sans-serif" font-size="11" font-weight="800" letter-spacing="1.2" fill="${a.ink || a.base}">${a.label}</text></g>` : '';
    return `<svg class="rc-art" viewBox="0 0 320 220" preserveAspectRatio="xMidYMid slice" overflow="hidden" role="img" aria-label="${esc(L(r.name))}"><rect width="320" height="220" fill="${a.light}" opacity=".28"/><circle cx="280" cy="30" r="70" fill="${a.base}" opacity=".10"/><circle cx="30" cy="210" r="60" fill="${a.base}" opacity=".08"/>${body}${label}</svg>`;
  }
  App.views.recipeArt = art;

  // ---------- list ----------
  function list() {
    const q = U.normalize(app.ui.rcQ || '');
    const cat = app.ui.rcCat || '';
    let items = R().list;
    if (cat) items = items.filter((r) => r.category === cat);
    if (q) items = items.filter((r) => U.normalize([r.name.en, r.name.nb, r.summary.en, ...r.ingredients.map((i) => i.name.en + ' ' + i.name.nb)].join(' ')).includes(q));
    return `<div class="staff-page">
      <header class="staff-head"><div><h1 class="h1">${T('Recipes', 'Oppskrifter')}</h1><p class="small muted">${T('Everything we prepare in the kitchen — amounts, tools and steps. Change the batch size and the amounts update.', 'Alt vi lager på kjøkkenet — mengder, utstyr og steg. Endre batchstørrelsen, så oppdateres mengdene.')}</p></div></header>
      <div class="rc-tools">
        <label class="search-box">${ic('search', 18)}<input class="input" type="search" data-live data-change="rcQ" value="${esc(app.ui.rcQ || '')}" placeholder="${T('Search recipe or ingredient…', 'Søk oppskrift eller ingrediens…')}"></label>
        <nav class="chips"><button class="chip ${!cat ? 'on' : ''}" data-action="rcCat" data-c="">${T('All', 'Alle')} (${R().list.length})</button>${R().categories.map((c) => `<button class="chip ${cat === c.id ? 'on' : ''}" data-action="rcCat" data-c="${c.id}">${esc(L(c.name))} (${R().list.filter((r) => r.category === c.id).length})</button>`).join('')}</nav>
      </div>
      ${items.length ? `<div class="rc-grid">${items.map((r) => `<a class="rc-card" href="#/staff/recipe/${r.id}">
        <div class="rc-card-art">${art(r, 1)}</div>
        <div class="rc-card-body"><span class="rc-cat">${esc(L((R().categories.find((c) => c.id === r.category) || {}).name))}</span><b>${esc(L(r.name))}</b><p class="small muted">${esc(L(r.summary))}</p>
          <div class="rc-meta small"><span>${ic('clipboard', 13)} ${r.ingredients.length} ${T('ingredients', 'ingredienser')}</span><span>${ic('check', 13)} ${r.steps.length} ${T(r.steps.length === 1 ? 'step' : 'steps', 'steg')}</span><span>${ic('chef', 13)} ${esc(yieldText(r))}</span></div></div></a>`).join('')}</div>`
        : `<div class="empty">${ic('search', 28)}<p>${T('No recipe matches your search.', 'Ingen oppskrift passer søket.')}</p></div>`}
      ${K.mod('assistant') ? `<div class="rc-ask">${ic('sparkle', 20)}<div><b>${T('Ask the AI assistant', 'Spør AI-assistenten')}</b><p class="small muted">${T('E.g. "How do I make the coleslaw?" — in your own language.', 'F.eks. «Hvordan lager jeg coleslaw?» — på ditt eget språk.')}</p></div><button class="btn btn-dark btn-sm" data-action="ask" data-go="1" data-q="${esc(T('How do I make the coleslaw?', 'Hvordan lager jeg coleslaw?'))}">${T('Try it', 'Prøv')}</button></div>` : ''}
    </div>`;
  }

  // ---------- detail ----------
  function detail(params) {
    const r = get(params.id);
    if (!r) return `<div class="staff-page"><a href="#/staff/recipes" class="back">${ic('back', 18)} ${T('Recipes', 'Oppskrifter')}</a><p>${T('Recipe not found.', 'Fant ikke oppskriften.')}</p></div>`;
    const mult = (app.ui.rcMult || {})[r.id] || 1;
    const ticks = ((app.ui.rcTick || {})[r.id]) || {};
    const done = r.ingredients.filter((_, i) => ticks[i]).length;
    const tools = R().tools;
    const cat = R().categories.find((c) => c.id === r.category) || {};
    const usedIn = R().list.filter((x) => x.ingredients.some((i) => i.ref === r.id));
    return `<div class="staff-page narrow rc-page">
      <a href="#/staff/recipes" class="back">${ic('back', 18)} ${T('Recipes', 'Oppskrifter')}</a>
      <section class="rc-hero">${art(r, 2)}</section>
      <header class="rc-head"><span class="rc-cat">${esc(L(cat.name))}</span><h1 class="h1">${esc(L(r.name))}</h1><p class="lead-sm">${esc(L(r.summary))}</p>
        <div class="rc-stats"><div><b>${esc(yieldText(r, mult))}</b><span class="small muted">${T('batch', 'batch')}</span></div><div><b>${r.ingredients.length}</b><span class="small muted">${T('ingredients', 'ingredienser')}</span></div><div><b>${r.steps.length}</b><span class="small muted">${T(r.steps.length === 1 ? 'step' : 'steps', 'steg')}</span></div></div></header>

      ${(r.warnings || []).map((w) => `<div class="notice notice-red">${ic('alert', 18)} <span>${esc(L(w))}</span></div>`).join('')}

      <div class="card rc-tools-card"><h2 class="h3">${ic('chef', 18)} ${T('You need', 'Du trenger')}</h2><div class="rc-toolchips">${(r.tools || []).map((t) => `<span class="rc-tool">${toolIcon(t)} ${esc(L(tools[t] || { en: t }))}</span>`).join('')}</div></div>

      <div class="card"><div class="row-between wrap"><h2 class="h3">${ic('clipboard', 18)} ${T('Ingredients', 'Ingredienser')} <span class="small muted">${done}/${r.ingredients.length}</span></h2>
        <div class="seg seg-sm rc-mult" role="group" aria-label="${T('Batch size', 'Batchstørrelse')}">${[0.5, 1, 2, 3].map((m) => `<button class="${m === mult ? 'on' : ''}" data-action="rcMult" data-id="${r.id}" data-m="${m}">${m === 0.5 ? '½' : m}×</button>`).join('')}</div></div>
        ${mult !== 1 ? `<p class="small rc-scaled">${ic('alert', 13)} ${T('Amounts shown for ' + (mult === 0.5 ? 'half' : mult + '×') + ' the normal batch.', 'Mengder for ' + (mult === 0.5 ? 'halv' : mult + '×') + ' vanlig batch.')}</p>` : ''}
        <ul class="rc-ings">${r.ingredients.map((ing, i) => `<li class="${ticks[i] ? 'done' : ''}"><button class="rc-tick" data-action="rcTick" data-id="${r.id}" data-i="${i}" aria-pressed="${!!ticks[i]}" aria-label="${T('Mark as added', 'Merk som lagt i')}">${ticks[i] ? ic('check', 16) : ''}</button>
          <span class="rc-sw" style="--sw:${ing.color || '#DEE2E6'}"></span><span class="rc-iname">${esc(L(ing.name))}${ing.ref && get(ing.ref) ? ` <a class="rc-ref" href="#/staff/recipe/${ing.ref}">${T('recipe', 'oppskrift')} ›</a>` : ''}</span>
          <b class="rc-qty">${amount(ing, mult)}${ing.toTaste ? `<span class="small muted"> / ${T('to taste', 'etter smak')}</span>` : ''}</b></li>`).join('')}</ul>
        ${done ? `<button class="btn btn-ghost btn-sm" data-action="rcReset" data-id="${r.id}">${ic('refresh', 14)} ${T('Clear ticks', 'Nullstill')}</button>` : ''}</div>

      <h2 class="h3">${ic('check', 18)} ${T('Method', 'Fremgangsmåte')}</h2>
      <ol class="rc-steps">${r.steps.map((s, i) => `<li class="${s.warn ? 'warn' : ''}"><span class="step-n">${i + 1}</span><div><p>${esc(L(s))}</p>${s.tool && tools[s.tool] ? `<span class="rc-tool sm">${toolIcon(s.tool)} ${esc(L(tools[s.tool]))}</span>` : ''}${s.warn ? `<span class="rc-tool sm warn">${ic('alert', 13)} ${T('Take care', 'Vær forsiktig')}</span>` : ''}</div></li>`).join('')}</ol>

      ${r.note ? `<div class="notice notice-blue">${ic('refresh', 18)} <span><b>${T('Note', 'Merk')}:</b> ${esc(L(r.note))}</span></div>` : ''}
      ${r.variant ? `<div class="card rc-variant"><span class="rc-leaf">🌱</span><div><b>${esc(L(r.variant.title))}</b><p class="small">${esc(L(r.variant.text))}</p></div></div>` : ''}
      ${usedIn.length ? `<div class="card"><h2 class="h3">${T('Used in', 'Brukes i')}</h2><div class="rc-used">${usedIn.map((x) => `<a href="#/staff/recipe/${x.id}" class="rc-mini">${art(x, 3)}<span>${esc(L(x.name))}</span></a>`).join('')}</div></div>` : ''}
      <p class="small muted">${ic('alert', 13)} ${T('Allergens: check Menu & allergens or ask your shift manager — recipes do not replace the verified allergen list.', 'Allergener: sjekk Meny og allergener eller spør skiftleder — oppskriftene erstatter ikke den verifiserte allergenlisten.')}</p>
      ${K.mod('assistant') ? `<button class="btn btn-dark btn-block" data-action="ask" data-go="1" data-q="${esc(T('How do I make ' + L(r.name) + '?', 'Hvordan lager jeg ' + L(r.name) + '?'))}">${ic('sparkle', 18)} ${T('Ask the AI about this recipe', 'Spør AI om denne oppskriften')}</button>` : ''}
    </div>`;
  }
  function toolIcon(t) { return ic({ grill: 'chef', blender: 'refresh', whisk: 'refresh', knife: 'edit', scale: 'clipboard', deep: 'bag' }[t] || 'bag', 14); }

  Object.assign(App.actions, {
    rcCat(d) { app.ui.rcCat = d.c; app.render(); },
    rcMult(d) { app.ui.rcMult = app.ui.rcMult || {}; app.ui.rcMult[d.id] = Number(d.m); app.render({ preserve: true }); },
    rcTick(d) { const t = (app.ui.rcTick = app.ui.rcTick || {}); t[d.id] = t[d.id] || {}; t[d.id][d.i] = !t[d.id][d.i]; app.render({ preserve: true }); },
    rcReset(d) { if (app.ui.rcTick) app.ui.rcTick[d.id] = {}; app.render({ preserve: true }); },
  });
  Object.assign(App.changes, { rcQ(el) { app.ui.rcQ = el.value; app.render({ preserve: true }); } });

  app.route('/staff/recipes', 'staff', guard(list));
  app.route('/staff/recipe/:id', 'staff', guard(detail));
})();
