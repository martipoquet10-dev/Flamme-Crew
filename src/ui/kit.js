/*
 * UI kit shared by all areas: extra icons, avatars, section illustrations,
 * small formatting helpers, theming from the tenant config.
 */
(function () {
  const U = App.util;
  const T = (en, nb) => App.i18n.T(en, nb);

  Object.assign(App.art.icons, {
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
    users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14a6 6 0 0 1 3.5 6',
    store: 'M4 9l1.5-5h13L20 9M4 9h16M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5 11v9h14v-9M10 20v-5h4v5',
    swap: 'M4 8h13l-3-3M20 16H7l3 3',
    megaphone: 'M3 10v4h3l7 4V6L6 10zM16 9a4 4 0 0 1 0 6M6 14l1 5h3l-1-4',
    flame: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 1.6-4.8 3-6 .3 1.5 1 2.4 2 2.8C11 8 10.5 5.5 12 3z',
    heart: 'M12 20s-7.5-4.6-9-9.2C2 7.4 4.2 4.5 7.2 4.5c2 0 3.6 1.2 4.8 3 1.2-1.8 2.8-3 4.8-3 3 0 5.2 2.9 4.2 6.3-1.5 4.6-9 9.2-9 9.2z',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
    play: 'M7 4l13 8-13 8z',
    pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
    stop: 'M6 6h12v12H6z',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    copy: 'M9 9h11v11H9zM5 15V4h11',
    send: 'M4 12l16-8-6 16-3-6zM11 14l9-10',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
    grad: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
    poll: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    chart: 'M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6',
    coffee: 'M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9h1.5a2.5 2.5 0 0 1 0 5H17M7 3v2M11 3v2M15 3v2',
    phone: 'M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z',
    eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    thumb: 'M7 10v10H4V10zM7 10l4-7c1.5 0 2.5 1 2.2 2.6L12.5 9H19a2 2 0 0 1 2 2.3l-1.2 6.8A2 2 0 0 1 17.8 20H7',
    comment: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
    pinned: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v8',
    sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    beach: 'M3 20h18M12 20V9M5 9a7 7 0 0 1 14 0zM12 2v2',
    medical: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',
    filter: 'M3 5h18l-7 8v6l-4 2v-8z',
    wallet: 'M4 6h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4zM4 6V5a1 1 0 0 1 1-1h11v2M16 13h2',
    target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01',
    cake: 'M4 20h16v-7H4zM4 16c2 1.5 4 1.5 6 0s4-1.5 6 0 3 1.5 4 0M12 13V9M12 6V4',
    trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8M10 17h4',
    award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14L7 21l5-3 5 3-1.5-7',
    plusCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v8M8 12h8',
    location: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    bot: 'M5 8h14v11H5zM12 4v4M9 13h.01M15 13h.01M9 16h6M3 12v3M21 12v3',
    week: 'M4 5h16v15H4zM4 9h16M9 9v11M14 9v11',
    list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  });
  const ic = App.art.icon;

  // ---------- avatars ----------
  const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  function avatar(u, size, extra) {
    const s = size || 40;
    if (u === 'hq' || (u && u.id === 'hq')) return `<span class="av av-hq" style="--s:${s}px"><img src="${U.esc(App.config.brand.appIcon)}" alt=""></span>`;
    if (!u) return `<span class="av" style="--s:${s}px;--c:#ADB5BD">?</span>`;
    const online = extra && extra.status ? `<i class="av-dot ${extra.status}"></i>` : '';
    return `<span class="av" style="--s:${s}px;--c:${u.color || '#868E96'}" title="${U.esc(u.name)}">${initials(u.name)}${online}</span>`;
  }
  function avatarStack(users, max) {
    const m = max || 5; const list = users.filter(Boolean);
    return `<span class="av-stack">${list.slice(0, m).map((u) => avatar(u, 30)).join('')}${list.length > m ? `<span class="av av-more" style="--s:30px">+${list.length - m}</span>` : ''}</span>`;
  }

  // ---------- section illustrations ----------
  function illustration(kind, color) {
    const c = color || 'var(--red)';
    const svg = (body) => `<svg class="illu" viewBox="0 0 240 150" aria-hidden="true">${body}</svg>`;
    if (kind === 'store') return svg(`
      <rect x="28" y="40" width="184" height="96" rx="10" fill="#fff" opacity=".95"/>
      <path d="M28 40h184l-10-22H38z" fill="${c}"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<path d="M${38 + i * 22.5} 18 l${i === 0 ? -10 : -6} 22 h22.5 l${i === 7 ? 10 : 4}-22z" fill="${i % 2 ? '#fff' : c}" opacity="${i % 2 ? .9 : 1}"/>`).join('')}
      <path d="M28 40 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0 q11.5 12 23 0" fill="#fff" stroke="${c}" stroke-width="2"/>
      <rect x="44" y="70" width="64" height="66" rx="4" fill="${c}" opacity=".12"/><rect x="58" y="86" width="36" height="50" rx="3" fill="${c}" opacity=".85"/><circle cx="88" cy="112" r="2.5" fill="#fff"/>
      <rect x="122" y="70" width="74" height="38" rx="5" fill="${c}" opacity=".12"/>
      <g transform="translate(140 74)"><path d="M2 22 q18-22 36 0z" fill="#F2A33A"/><rect x="0" y="22" width="40" height="5" rx="2.5" fill="#6DBA4A"/><rect x="0" y="27" width="40" height="6" rx="3" fill="#5A2E1E"/><rect x="2" y="33" width="36" height="5" rx="2.5" fill="#E7A04C"/></g>
      <g transform="translate(170 96)"><rect width="34" height="42" rx="5" fill="#fff" stroke="${c}" stroke-width="2"/><rect x="10" y="-4" width="14" height="8" rx="2" fill="${c}"/>
        <path d="M8 16l3 3 6-6M8 28l3 3 6-6" stroke="#2F9E44" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M21 16h7M21 28h7" stroke="#CED4DA" stroke-width="2.5" stroke-linecap="round"/></g>`);
    if (kind === 'shifts') return svg(`
      <rect x="24" y="22" width="150" height="114" rx="12" fill="#fff"/>
      <rect x="24" y="22" width="150" height="26" rx="12" fill="${c}"/><rect x="24" y="36" width="150" height="12" fill="${c}"/>
      <rect x="52" y="14" width="6" height="18" rx="3" fill="#1B1B1F"/><rect x="140" y="14" width="6" height="18" rx="3" fill="#1B1B1F"/>
      ${[0, 1, 2, 3, 4].map((col) => [0, 1, 2].map((row) => { const on = (col * 3 + row) % 4 !== 1; const colors = ['#E8590C', '#7048E8', '#0C8599', '#2F9E44']; return on ? `<rect x="${34 + col * 27}" y="${58 + row * 24}" width="22" height="16" rx="4" fill="${colors[(col + row) % 4]}" opacity=".9"/>` : `<rect x="${34 + col * 27}" y="${58 + row * 24}" width="22" height="16" rx="4" fill="#E9ECEF"/>`; }).join('')).join('')}
      <circle cx="186" cy="100" r="34" fill="#fff" stroke="${c}" stroke-width="5"/><circle cx="186" cy="100" r="3.5" fill="#1B1B1F"/>
      <path d="M186 100V80M186 100l13 8" stroke="#1B1B1F" stroke-width="4" stroke-linecap="round"/>
      ${[0, 1, 2, 3].map((i) => `<circle cx="${186 + 26 * Math.cos(i * Math.PI / 2)}" cy="${100 + 26 * Math.sin(i * Math.PI / 2)}" r="2.5" fill="${c}"/>`).join('')}`);
    if (kind === 'community') return svg(`
      <rect x="20" y="24" width="122" height="62" rx="16" fill="#fff"/><path d="M40 86l-6 18 22-18z" fill="#fff"/>
      <circle cx="44" cy="48" r="11" fill="#F08C00"/><text x="44" y="52" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Inter,sans-serif">SB</text>
      <rect x="62" y="40" width="64" height="7" rx="3.5" fill="#DEE2E6"/><rect x="62" y="53" width="44" height="7" rx="3.5" fill="#DEE2E6"/>
      <rect x="36" y="66" width="34" height="11" rx="5.5" fill="${c}" opacity=".15"/><text x="53" y="74.5" text-anchor="middle" font-size="8" fill="${c}" font-family="Inter,sans-serif" font-weight="700">🔥 12</text>
      <rect x="98" y="72" width="122" height="54" rx="16" fill="${c}"/><path d="M200 126l8 16-24-16z" fill="${c}"/>
      <rect x="112" y="88" width="72" height="7" rx="3.5" fill="#fff" opacity=".85"/><rect x="112" y="101" width="52" height="7" rx="3.5" fill="#fff" opacity=".6"/>
      <circle cx="200" cy="96" r="11" fill="#fff"/><path d="M200 101s-6-3.6-7-7.2c-.8-2.6 1-4.8 3.3-4.8 1.6 0 2.8 1 3.7 2.3.9-1.3 2.1-2.3 3.7-2.3 2.3 0 4.1 2.2 3.3 4.8-1 3.6-7 7.2-7 7.2z" fill="${c}"/>
      <circle cx="178" cy="34" r="16" fill="#fff"/><path d="M171 34l5 5 9-10" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`);
    return svg(`<circle cx="120" cy="75" r="50" fill="#fff"/>`);
  }

  // ---------- formatting ----------
  const loc = () => App.i18n.locale();
  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return T('now', 'nå');
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' ' + T('h', 't');
    if (s < 86400 * 7) return Math.floor(s / 86400) + ' ' + T('d', 'd');
    return new Date(iso).toLocaleDateString(loc(), { day: 'numeric', month: 'short' });
  }
  function fmtDay(key, style) {
    const [y, m, d] = key.split('-').map(Number); const x = new Date(y, m - 1, d);
    if (style === 'short') return x.toLocaleDateString(loc(), { weekday: 'short', day: 'numeric', month: 'short' });
    if (style === 'wd') return x.toLocaleDateString(loc(), { weekday: 'short' });
    if (style === 'num') return x.getDate();
    if (style === 'month') return x.toLocaleDateString(loc(), { month: 'short' });
    return x.toLocaleDateString(loc(), { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function relDay(key) {
    const t = App.wf.today();
    if (key === t) return T('Today', 'I dag');
    if (key === App.wf.addDays(t, 1)) return T('Tomorrow', 'I morgen');
    if (key === App.wf.addDays(t, -1)) return T('Yesterday', 'I går');
    return fmtDay(key, 'short');
  }
  const dateTile = (key) => `<span class="date-tile"><b>${fmtDay(key, 'num')}</b><span>${fmtDay(key, 'wd')}</span></span>`;
  const posChip = (posId) => { const p = App.api.people.position(posId); return `<span class="pos-chip" style="--c:${p.color}">${U.esc(U.L(p.name))}</span>`; };
  const empty = (icon, title, sub, cta) => `<div class="empty">${ic(icon, 30)}<b>${title}</b>${sub ? `<p class="small muted">${sub}</p>` : ''}${cta || ''}</div>`;
  const sheetHead = (title, sub) => `<button type="button" class="sheet-close" data-action="closeModal" aria-label="${T('Close', 'Lukk')}">${ic('x')}</button><div class="sheet-head"><h2 class="h2">${title}</h2>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>`;
  const nok = (n) => U.nok(n);
  const mod = (id) => App.tenant.modules[id] !== false;

  // ---------- theme from tenant ----------
  function applyTheme() {
    const t = App.tenant, c = t.brand.colors, r = document.documentElement.style;
    r.setProperty('--red', c.primary); r.setProperty('--red-ink', c.primaryInk); r.setProperty('--red-soft', c.primarySoft);
    r.setProperty('--ink', c.ink); r.setProperty('--bg', c.bg); r.setProperty('--sidebar', c.sidebar || c.ink);
    Object.keys(t.sections).forEach((k) => { r.setProperty('--c-' + k, t.sections[k].color); r.setProperty('--c-' + k + '-soft', t.sections[k].soft); });
    if (t.brand.fonts) { r.setProperty('--display', `'${t.brand.fonts.display}', 'Inter', system-ui, sans-serif`); r.setProperty('--body', `'${t.brand.fonts.body}', system-ui, sans-serif`); }
    document.title = t.appName + ' · ' + t.name;
    const fav = document.querySelector('link[rel=icon]'); if (fav) fav.href = t.brand.favicon || t.brand.appIcon;
    const theme = document.querySelector('meta[name=theme-color]'); if (theme) theme.content = c.sidebar || c.ink;
  }
  // Manager-edited overrides (App settings page) are stored in the backend and merged here.
  function applyOverrides() {
    const o = App.store.db.tenantOverrides || {};
    const t = App.tenant;
    if (o.appName) t.appName = o.appName;
    if (o.primary) Object.assign(t.brand.colors, { primary: o.primary, primaryInk: o.primary, primarySoft: o.primary + '1F' });
    if (o.sections) Object.keys(o.sections).forEach((k) => Object.assign(t.sections[k], o.sections[k]));
    if (o.modules) Object.assign(t.modules, o.modules);
  }
  App.app.onInit.push(() => { applyOverrides(); applyTheme(); });

  App.kit = { avatar, avatarStack, illustration, timeAgo, fmtDay, relDay, dateTile, posChip, empty, sheetHead, nok, mod, initials, applyTheme, applyOverrides, T };
})();
