/*
 * Placeholder visuals: product illustrations, provisional brand mark and icons.
 * Replace with real photography (product.image URL) and the official logo.
 */
window.App = window.App || {};

App.art = (function () {
  const bun = (y, w, c1, c2) => `<path d="M${100 - w} ${y} Q100 ${y - 52} ${100 + w} ${y} Z" fill="${c1}"/><path d="M${100 - w} ${y} Q100 ${y - 52} ${100 + w} ${y} Z" fill="url(#shine)" opacity=".35"/>
    ${[[-30, -22], [-8, -30], [16, -26], [34, -16], [-44, -10], [4, -18]].map(([dx, dy]) => `<ellipse cx="${100 + dx}" cy="${y + dy}" rx="3.2" ry="1.8" fill="${c2}"/>`).join('')}`;
  const layer = (y, w, h, c, wave) => wave
    ? `<path d="M${100 - w} ${y} ${Array.from({ length: 8 }, (_, i) => `q${w / 8} ${i % 2 ? h : -h} ${w / 4} 0`).join(' ')} v${h} H${100 - w} Z" fill="${c}"/>`
    : `<rect x="${100 - w}" y="${y}" width="${w * 2}" height="${h}" rx="${h / 2}" fill="${c}"/>`;

  function burger(kind) {
    const isChicken = kind === 'chicken', isVeg = kind === 'veggie', dbl = kind === 'double';
    const patty = isChicken ? '#D9902F' : isVeg ? '#5E7D3A' : '#5A2E1E';
    let y = 150, parts = '';
    parts += layer(y, 62, 16, '#E7A04C');                     // bottom bun
    y -= 14; parts += layer(y, 66, 14, patty);
    if (dbl) { y -= 6; parts += layer(y, 64, 8, '#F4C430', true); y -= 14; parts += layer(y, 66, 14, patty); }
    y -= 6; parts += layer(y, 66, 8, isVeg ? '#9BC25B' : '#F4C430', true); // cheese / avocado
    y -= 6; parts += layer(y, 64, 6, '#E2412F');               // tomato
    y -= 7; parts += layer(y, 70, 8, '#6DBA4A', true);          // lettuce
    return parts + bun(y + 2, 66, '#E99A3E', '#FFF1D6');
  }

  const kinds = {
    burger: () => burger('burger'), double: () => burger('double'), chicken: () => burger('chicken'), veggie: () => burger('veggie'),
    fries: () => `<path d="M62 92 L138 92 L128 162 L72 162 Z" fill="#D8282F"/><path d="M62 92 L138 92 L134 112 L66 112 Z" fill="#B81D16"/>
      ${[70, 80, 90, 100, 110, 120, 128].map((x, i) => `<rect x="${x}" y="${50 + (i % 3) * 8}" width="9" height="${54 - (i % 3) * 6}" rx="2" fill="${i % 2 ? '#F7C548' : '#F2B33A'}" transform="rotate(${(i - 3) * 4} ${x} 100)"/>`).join('')}
      <path d="M62 92 L138 92 L128 162 L72 162 Z" fill="#D8282F"/><circle cx="100" cy="128" r="14" fill="#fff" opacity=".9"/><path d="M100 118 q8 8 0 18 q-8-10 0-18z" fill="#D8282F"/>`,
    rings: () => [[78, 120], [118, 118], [98, 96], [100, 138]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="20" fill="none" stroke="#E7A04C" stroke-width="12"/><ellipse cx="${x}" cy="${y}" rx="26" ry="20" fill="none" stroke="#F6C46A" stroke-width="4" stroke-dasharray="3 6"/>`).join(''),
    nuggets: () => [[70, 128], [104, 136], [134, 124], [86, 104], [118, 102]].map(([x, y], i) => `<path d="M${x - 18} ${y} q2-18 18-18 q18 2 18 16 q-2 18-18 18 q-16 0-18-16z" fill="${i % 2 ? '#D9902F' : '#E7A04C'}"/><circle cx="${x - 4}" cy="${y - 4}" r="2" fill="#B66D1E"/><circle cx="${x + 6}" cy="${y + 4}" r="2" fill="#B66D1E"/>`).join(''),
    drink: () => `<path d="M70 66 L130 66 L122 166 L78 166 Z" fill="#D8282F"/><rect x="66" y="56" width="68" height="14" rx="5" fill="#fff"/><rect x="104" y="24" width="7" height="40" rx="3" fill="#1B1414" transform="rotate(12 107 44)"/>
      <circle cx="100" cy="116" r="17" fill="#fff"/><path d="M100 104 q10 10 0 24 q-10-12 0-24z" fill="#D8282F"/>`,
    shake: () => `<path d="M72 74 L128 74 L120 166 L80 166 Z" fill="#F7E7D2"/><path d="M72 74 L128 74 L126 96 L74 96 Z" fill="#D8282F"/>
      <path d="M66 74 q8-26 34-26 q26 0 34 26 Z" fill="#FFF8EE"/><circle cx="100" cy="42" r="8" fill="#C0141A"/><rect x="106" y="14" width="6" height="40" rx="3" fill="#D8282F" transform="rotate(16 109 34)"/>`,
    dessert: () => `<rect x="58" y="96" width="84" height="56" rx="8" fill="#4A2618"/><rect x="58" y="96" width="84" height="16" rx="8" fill="#6B3A26"/>
      ${[[74, 124], [100, 132], [124, 120], [88, 142]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="6" rx="2" fill="#2E160D"/>`).join('')}<path d="M70 100 q15-14 30 0 q15 14 30 0" stroke="#F6E2C2" stroke-width="5" fill="none"/>`,
    dip: () => `<path d="M64 104 h72 l-8 52 a8 8 0 0 1 -8 7 h-40 a8 8 0 0 1 -8 -7 z" fill="#fff"/><ellipse cx="100" cy="104" rx="36" ry="10" fill="#F2B33A"/>
      <path d="M72 104 q14 -16 28 -2 q14 -12 28 2" fill="#E99A3E"/><rect x="74" y="122" width="52" height="16" rx="8" fill="#D8282F"/>`,
    box: () => `<path d="M46 92 L154 92 L146 164 L54 164 Z" fill="#D8282F"/><path d="M46 92 L100 72 L154 92 Z" fill="#B81D16"/>
      <g transform="translate(-28 -28) scale(.62)"><g transform="translate(64 60)">${burger('burger')}</g></g><g transform="translate(62 -28) scale(.62)"><g transform="translate(20 60)">${burger('chicken')}</g></g>
      <rect x="76" y="118" width="48" height="26" rx="6" fill="#fff"/><text x="100" y="136" text-anchor="middle" font-family="Bricolage Grotesque, sans-serif" font-weight="800" font-size="13" fill="#D8282F">SHARE</text>`,
  };

  const palettes = {
    burger: ['#FFE7D6', '#FFC9A8'], double: ['#FFE0D1', '#FFB592'], chicken: ['#FFF0CF', '#FFD98A'], veggie: ['#E6F4D8', '#C6E6A7'],
    fries: ['#FFF3C9', '#FFE08A'], rings: ['#FFF0D6', '#FFD7A0'], nuggets: ['#FFEFD2', '#FFD08F'], drink: ['#FFE3E1', '#FFC1BC'],
    shake: ['#FDEBEF', '#F8CAD6'], dip: ['#FFF3DE', '#FFD9A0'], dessert: ['#F4E4D8', '#E6C6AE'], box: ['#FFE3DA', '#FFB9A6'],
  };

  function product(kind, opts) {
    const k = kinds[kind] ? kind : 'burger';
    const [a, b] = palettes[k];
    const id = 'g' + Math.random().toString(36).slice(2, 7);
    return `<svg class="art ${opts && opts.cls ? opts.cls : ''}" viewBox="0 0 200 200" role="img" aria-label="${opts && opts.label ? App.util.esc(opts.label) : 'Illustration'}" preserveAspectRatio="xMidYMid slice">
      <defs><radialGradient id="${id}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
      <rect width="200" height="200" fill="url(#${id})"/><ellipse cx="100" cy="168" rx="74" ry="10" fill="#000" opacity=".08"/>${kinds[k]()}</svg>`;
  }

  const brand = () => App.config.brand || {};
  const photo = (src, alt, cls) => `<img class="art photo ${cls || ''}" src="${App.util.esc(src)}" alt="${App.util.esc(alt)}" loading="lazy">`;

  function productImage(p, cls) {
    const src = p.image || (brand().productImages || {})[p.id];
    if (src) return photo(src, App.util.L(p.name), cls);
    return product(p.art, { cls, label: App.util.L(p.name) });
  }

  // Official logo when configured; otherwise the provisional mark (NOT the official logo).
  const logo = (size, onDark) => {
    const src = (onDark && brand().logoOnDark) || brand().logo;
    if (src) return `<img class="brand-logo" src="${App.util.esc(src)}" alt="Flamme Burger" style="height:${size || brand().logoHeight || 32}px">`;
    return provisionalLogo(size);
  };
  const provisionalLogo = (size) => `<span class="brandmark" title="Provisional mark — not the official logo"><svg width="${size || 30}" height="${size || 30}" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#D8282F"/><path d="M16 5c1 5 7 7 7 14a7 7 0 0 1-14 0c0-4 2-6 3.5-7.5C13 14 14 15.5 15 16c0-4-1-7 1-11z" fill="#fff"/><path d="M16 17c.6 2 3 3 3 5.5a3 3 0 0 1-6 0c0-1.6 1-2.6 1.6-3.3.3 1 .9 1.3 1.4 1.4-.3-1.4-.4-2.4 0-3.6z" fill="#D8282F"/></svg><span class="brandmark-text">FLAME<b>BURGER</b></span></span>`;

  const P = {
    home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
    menu: 'M4 6h16M4 12h16M4 18h10',
    bag: 'M6 8h12l-1 12H7zM9 8a3 3 0 0 1 6 0',
    receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    truck: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    party: 'M4 20l5-14 9 9zM14 4l1 2M19 5l-2 2M20 10h-2',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
    check: 'M5 12l5 5 9-10',
    plus: 'M12 5v14M5 12h14',
    minus: 'M5 12h14',
    x: 'M6 6l12 12M18 6L6 18',
    search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
    chat: 'M4 5h16v11H9l-5 4z',
    book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    clipboard: 'M8 4h8v3H8zM6 6h12v15H6zM9 12h6M9 16h4',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 .5-1.5-1.2L15 4h-4l-.5 2.3L9 7.5 7 7 5 11l2 1-2 1 2 4 2-.5 1.5 1.2.5 2.3h4l.5-2.3 1.5-1.2 2 .5 2-4z',
    pin: 'M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
    arrow: 'M5 12h14M13 6l6 6-6 6',
    back: 'M19 12H5M11 6l-6 6 6 6',
    sunrise: 'M4 18h16M7 14a5 5 0 0 1 10 0M12 4v4M5 9l2 2M19 9l-2 2',
    moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
    sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
    chef: 'M7 14a4 4 0 1 1 1-7.9A4 4 0 0 1 16 6a4 4 0 1 1 1 8v6H7z',
    lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
    logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
    gift: 'M4 10h16v4H4zM6 14h12v7H6zM12 10v11M12 10S9 4 7 6s5 4 5 4 3-6 5-4-5 4-5 4',
    edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
    refresh: 'M20 6v5h-5M4 18v-5h5M6 9a7 7 0 0 1 12-2l2 3M18 15a7 7 0 0 1-12 2l-2-3',
    image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
    video: 'M4 6h11v12H4zM15 10l5-3v10l-5-3',
  };
  const icon = (name, size) => `<svg class="ic" width="${size || 20}" height="${size || 20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[name] || P.star}"/></svg>`;

  // Brand photo slot (hero, catering…) with illustration fallback
  const brandImage = (key, fallbackKind, cls, alt) => (brand()[key] ? photo(brand()[key], alt || 'Flamme Burger', cls) : product(fallbackKind, { cls }));

  return { product, productImage, logo, icon, brandImage, icons: P };
})();
