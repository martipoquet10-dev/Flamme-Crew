/*
 * Persistence for the demo.
 *
 *  - `App.store.client`  → state that belongs to the device (language, session, cart).
 *  - `App.store.db`      → the MOCK BACKEND database. Only `App.api` may read/write it.
 *                         In production this lives on a server; replace App.api's
 *                         internals with HTTP calls and delete this part.
 *
 * Everything is kept in localStorage so the demo survives page reloads.
 */
window.App = window.App || {};

App.store = (function () {
  const KEY = App.config.app.storageKey;
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // DEMO: 7 days of usage history + last night's count for the first location, so the
  // prep report shows count-based corrections right away. Real data replaces this.
  function demoInventorySeed() {
    const P = App.prep, data = App.demo.prep, loc = 'loc-lokka';
    const today = P.dayKey(new Date());
    const bias = { beef: 0.88, chicken: 0.95, bun: 0.9, fries: 1.08, 'sauce-classic': 0.8, 'sauce-spicy': 0.85, 'sauce-truffle': 0.9, 'sauce-bbq': 0.92, 'sauce-cheddar': 0.85 };
    const needOn = (key) => P.ingredientNeed(data, P.salesForecast(data, loc, key, {}).units);
    const logs = [];
    for (let n = 1; n <= 7; n++) {
      const key = P.addDays(today, -n);
      const need = needOn(key), ingredients = {};
      Object.keys(bias).forEach((ing, i) => {
        const wobble = 1 + (((n * 7 + i * 3) % 7) - 3) / 100;
        ingredients[ing] = { actual: Math.round(need[ing] * bias[ing] * wobble), forecast: Math.round(need[ing]) };
      });
      logs.push({ from: P.addDays(key, -1), to: key, demo: true, ingredients });
    }
    // last night's count: some surplus of beef, a shortage of buns, leftover sauces
    const t0 = needOn(today), t1 = needOn(P.addDays(today, 1));
    const yesterday = P.addDays(today, -1);
    const items = {
      'inv-beef': { count: Math.round((t0.beef + t1.beef) * 0.88 + 22), waste: 0 },
      'inv-chicken': { count: Math.round((t0.chicken + t1.chicken) * 0.95), waste: 0 },
      'inv-bun': { count: Math.round(t0.bun * 0.9 - 14), waste: 2 },
      'inv-sauce-classic': { count: 2, waste: 0 }, 'inv-sauce-spicy': { count: 1, waste: 0 }, 'inv-sauce-truffle': { count: 1, waste: 0 },
      'inv-sauce-bbq': { count: 0, waste: 0 }, 'inv-sauce-cheddar': { count: 1, waste: 0 },
    };
    if ((data.inventoryItems.find((i) => i.id === 'inv-fries').requiredDays || []).includes(P.weekday(yesterday))) items['inv-fries'] = { count: 4, waste: 0 };
    return {
      inventoryCounts: { [loc + '|' + yesterday]: { items, by: 'Ola Hansen', at: new Date(Date.now() - 10 * 3600e3).toISOString(), demo: true } },
      usageLogs: { [loc]: logs },
    };
  }

  function seedDb() {
    const d = App.demo;
    return {
      dataVersion: App.config.app.dataVersion,
      seededAt: new Date().toISOString(),
      categories: clone(d.categories),
      products: clone(d.products),
      locations: clone(d.locations),
      users: clone(d.users).map((u) => Object.assign(u, (d.employeeProfiles || {})[u.id] || {})).concat(clone(d.employees || [])),
      // Schedule (workforce) + Community — seeded by tenants/<client>/workforce.js & community.js
      ...(d.workforceSeed ? d.workforceSeed() : {}),
      ...(d.communitySeed ? d.communitySeed() : {}),
      ...(d.laborSeed ? d.laborSeed() : {}),
      notifications: d.notificationsSeed ? d.notificationsSeed() : [],
      tenantOverrides: {},   // manager-edited branding / module switches (App settings)
      orders: clone(d.orders),
      incidents: [],
      cateringPacks: clone(d.cateringPacks),
      cateringRequests: clone(d.cateringRequests),
      rewards: clone(d.rewards),
      ledger: clone(d.loyaltyLedger),
      vouchers: [],
      reviews: clone(d.reviews || []),
      guideCategories: clone(d.guideCategories),
      guides: clone(d.guides),
      checklists: clone(d.checklists),
      checklistState: {},
      prep: clone(d.prep),
      prepSettings: { bufferPct: 10, bufferStatus: 'provisional', horizonDays: 4 },
      prepAdjustments: {},   // "locationId|YYYY-MM-DD" → +/- % (events, holidays, weather…)
      prepState: {},         // done marks per location/day
      staffReports: [],      // situations sent to a supervisor for review/approval
      inventoryCounts: {},   // "locationId|YYYY-MM-DD" → { items: {invId: {count, waste}}, by, at }
      usageLogs: {},         // locationId → [ { from, to, ingredients: {ing: {actual, forecast}} } ] newest first
      ...demoInventorySeed(),
      // Admin overrides of App.config (delivery + loyalty rules)
      settings: { delivery: clone(App.config.delivery), loyalty: clone(App.config.loyalty) },
      counters: { order: 1004, catering: 202, incident: 301 },
    };
  }

  function seedClient() {
    return {
      lang: App.config.app.defaultLang,
      sessionUserId: null,         // staff app: start at the sign-in screen
      cart: { items: [], mode: 'pickup', locationId: 'loc-lokka', time: 'asap', address: null, voucherId: null, note: '' },
      lastCoverage: null,
    };
  }

  function load(k, seed) {
    try {
      const raw = localStorage.getItem(KEY + '.' + k);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage unavailable → in-memory only */ }
    return seed();
  }

  const store = {
    client: load('client', seedClient),
    db: (function () { const d = load('db', seedDb); return d.dataVersion === App.config.app.dataVersion ? d : seedDb(); })(),
    save() {
      try {
        localStorage.setItem(KEY + '.client', JSON.stringify(store.client));
        localStorage.setItem(KEY + '.db', JSON.stringify(store.db));
      } catch (e) { /* ignore */ }
    },
    resetAll() {
      store.db = seedDb();
      const lang = store.client.lang;
      store.client = seedClient();
      store.client.lang = lang;
      store.save();
    },
  };
  return store;
})();
