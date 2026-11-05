/*
 * App.api — MOCK BACKEND.
 *
 * The UI talks ONLY to this module. Every function checks the caller's role
 * here (not just in the UI), mirroring what the real backend must enforce.
 * To go live: keep the same function names, replace the bodies with HTTP calls
 * to a backend that does the same checks server-side with real authentication
 * (hiding screens in the browser is never enough).
 *
 * Payments and order processing are SIMULATED. No real charges or orders.
 */
window.App = window.App || {};

App.api = (function () {
  const S = () => App.store;
  const db = () => App.store.db;
  const LEVEL = { guest: 0, customer: 1, staff: 2, admin: 3 };

  class ApiError extends Error { constructor(code, msg) { super(msg || code); this.code = code; } }

  function me() {
    const id = S().client.sessionUserId;
    return id ? db().users.find((u) => u.id === id) || null : null;
  }
  function roleLevel(u) { return u ? LEVEL[u.role] || 0 : 0; }
  function require(minRole) {
    const u = me();
    if (roleLevel(u) < LEVEL[minRole]) throw new ApiError('forbidden', 'Requires role: ' + minRole);
    return u;
  }
  function commit(v) { S().save(); return v; }
  function settings() { return db().settings; }

  // ---------- pricing (the real backend must recompute this server-side) ----------
  function unitPrice(product, options) {
    let p = product.priceNok;
    (product.optionGroups || []).forEach((g) => {
      const sel = options && options[g.id];
      const ids = Array.isArray(sel) ? sel : sel ? [sel] : [];
      ids.forEach((cid) => { const c = g.choices.find((x) => x.id === cid); if (c) p += c.priceNok; });
    });
    return p;
  }

  function quote(cart) {
    const dl = settings().delivery;
    const lines = cart.items.map((it) => {
      const p = db().products.find((x) => x.id === it.productId);
      if (!p) return null;
      const unit = unitPrice(p, it.options);
      return { ...it, product: p, unitPriceNok: unit, totalNok: unit * it.qty, available: p.available };
    }).filter(Boolean);
    const subtotal = lines.reduce((s, l) => s + l.totalNok, 0);
    let discount = 0, freeLine = null, voucher = null;
    if (cart.voucherId) {
      voucher = db().vouchers.find((v) => v.id === cart.voucherId && v.status === 'active');
      const r = voucher && db().rewards.find((x) => x.id === voucher.rewardId);
      if (r && r.type === 'discount') discount = Math.min(r.amountNok, subtotal);
      if (r && r.type === 'product') freeLine = { product: db().products.find((x) => x.id === r.productId), reward: r };
      if (!r) voucher = null;
    }
    const isDelivery = cart.mode === 'delivery';
    const minBase = subtotal; // provisional: minimum applies to products subtotal before rewards
    const missingForDelivery = Math.max(0, dl.minimumOrderNok - minBase);
    const deliveryFee = isDelivery ? dl.feeNok : 0;
    return {
      lines, subtotal, discount, freeLine, voucher, deliveryFee,
      total: Math.max(0, subtotal - discount) + deliveryFee,
      minimum: dl.minimumOrderNok, missingForDelivery, meetsDeliveryMinimum: missingForDelivery === 0,
      itemCount: lines.reduce((s, l) => s + l.qty, 0),
      hasUnavailable: lines.some((l) => !l.available),
    };
  }

  // ---------- loyalty ----------
  function balanceOf(userId) { return db().ledger.filter((l) => l.userId === userId).reduce((s, l) => s + l.points, 0); }
  function pointsFor(order) {
    const r = settings().loyalty;
    const base = order.subtotalNok - (order.discountNok || 0);
    return Math.floor(base / r.earnPerNok) * r.earnPoints;
  }
  function onStatusChange(order) {
    order.history.push({ status: order.status, at: new Date().toISOString() });
    if (order.status === 'delivered' && !order.pointsAwarded && order.userId) {
      const pts = pointsFor(order);
      order.pointsAwarded = pts;
      db().ledger.push({ id: App.util.uid('l'), userId: order.userId, points: pts, reason: 'order', ref: order.id, at: new Date().toISOString() });
    }
  }
  function canSeeOrder(u, o) { return u && (o.userId === u.id || roleLevel(u) >= LEVEL.staff); }

  const api = {
    ApiError,

    // ===== Auth (DEMO: account picker, no passwords) =====
    auth: {
      me,
      demoAccounts() { return db().users.map((u) => ({ id: u.id, name: u.name, role: u.role })); },
      login(userId) { if (!db().users.find((u) => u.id === userId)) throw new ApiError('not_found'); S().client.sessionUserId = userId; return commit(me()); },
      logout() { S().client.sessionUserId = null; commit(); },
      hasRole(min) { return roleLevel(me()) >= LEVEL[min]; },
    },

    // ===== Catalog (public) =====
    catalog: {
      categories() { return db().categories.slice().sort((a, b) => a.sort - b.sort); },
      products() { return db().products; },
      product(id) { return db().products.find((p) => p.id === id) || null; },
      locations() { return db().locations; },
      location(id) { return db().locations.find((l) => l.id === id) || null; },
      cateringPacks() { return db().cateringPacks; },
      checkCoverage(postcode) {
        const pc = String(postcode || '').trim();
        if (!/^\d{4}$/.test(pc)) return { valid: false, covered: false, locations: [] };
        const locs = db().locations.filter((l) => l.delivery && l.deliveryPostcodePrefixes.some((p) => pc.startsWith(p)));
        return { valid: true, covered: locs.length > 0 && settings().delivery.enabled, locations: locs, postcode: pc };
      },
    },

    settings: {
      get() { return settings(); },
      update(patch) {
        require('admin');
        if (patch.delivery) Object.assign(settings().delivery, patch.delivery);
        if (patch.loyalty) Object.assign(settings().loyalty, patch.loyalty);
        return commit(settings());
      },
      // White-label overrides edited in Manager → App settings
      saveOverrides(o) { require('admin'); db().tenantOverrides = o || {}; return commit(db().tenantOverrides); },
    },

    pricing: { unitPrice, quote },

    // ===== Orders =====
    orders: {
      place(cart, contact, paymentMethod) {
        const u = require('customer');
        const q = quote(cart);
        if (!q.lines.length) throw new ApiError('empty_cart');
        if (q.hasUnavailable) throw new ApiError('unavailable_items');
        const loc = db().locations.find((l) => l.id === cart.locationId);
        if (!loc) throw new ApiError('no_location');
        if (cart.mode === 'delivery') {
          if (!q.meetsDeliveryMinimum) throw new ApiError('below_minimum');
          const cov = api.catalog.checkCoverage(cart.address && cart.address.postcode);
          if (!cov.covered || !cov.locations.some((l) => l.id === loc.id)) throw new ApiError('not_covered');
        }
        // SIMULATED PAYMENT — no charge is made.
        const payment = { method: paymentMethod, status: 'simulated', ref: 'DEMO-' + Date.now().toString(36).toUpperCase() };
        const id = 'FB-' + (db().counters.order++);
        const items = q.lines.map((l) => ({ id: l.id, productId: l.productId, qty: l.qty, unitPriceNok: l.unitPriceNok, options: l.options, note: l.note || '' }));
        if (q.freeLine) items.push({ id: App.util.uid('li'), productId: q.freeLine.product.id, qty: 1, unitPriceNok: 0, options: {}, reward: q.freeLine.reward.id });
        const order = {
          id, userId: u.id, mode: cart.mode, locationId: loc.id, status: 'received', items,
          subtotalNok: q.subtotal, deliveryFeeNok: q.deliveryFee, discountNok: q.discount, totalNok: q.total,
          address: cart.mode === 'delivery' ? cart.address : null, time: cart.time, note: cart.note || '',
          contact, payment, voucherId: q.voucher ? q.voucher.id : null,
          createdAt: new Date().toISOString(), history: [{ status: 'received', at: new Date().toISOString() }], pointsAwarded: 0,
        };
        if (q.voucher) q.voucher.status = 'used';
        db().orders.unshift(order);
        return commit(order);
      },
      mine() { const u = require('customer'); return db().orders.filter((o) => o.userId === u.id); },
      get(id) {
        const u = require('customer');
        const o = db().orders.find((x) => x.id === id);
        if (!o) throw new ApiError('not_found');
        if (!canSeeOrder(u, o)) throw new ApiError('forbidden');
        return o;
      },
      all() { require('staff'); return db().orders; },
      setStatus(id, status) {
        require('staff');
        const o = db().orders.find((x) => x.id === id);
        if (!o || o.status === status) return o;
        o.status = status; onStatusChange(o); return commit(o);
      },
      // DEMO ONLY: lets the customer simulate the restaurant moving the order forward.
      simulateNext(id) {
        const u = require('customer');
        const o = db().orders.find((x) => x.id === id);
        if (!o || !canSeeOrder(u, o) || !App.config.app.demoMode) throw new ApiError('forbidden');
        const flow = App.config.orderFlow[o.mode];
        const i = flow.indexOf(o.status);
        if (i < flow.length - 1) { o.status = flow[i + 1]; onStatusChange(o); }
        return commit(o);
      },
    },

    // ===== Delivery incidents =====
    incidents: {
      report(orderId, data) {
        const u = require('customer');
        const o = api.orders.get(orderId);
        if (o.userId !== u.id) throw new ApiError('forbidden');
        const inc = {
          id: 'INC-' + (db().counters.incident++), orderId, userId: u.id, type: data.type, itemIds: data.itemIds || [],
          description: data.description || '', preferred: data.preferred || 'redeliver', status: 'reported',
          createdAt: new Date().toISOString(), history: [{ status: 'reported', at: new Date().toISOString() }], notes: [],
        };
        db().incidents.unshift(inc);
        return commit(inc);
      },
      forOrder(orderId) { api.orders.get(orderId); return db().incidents.filter((i) => i.orderId === orderId); },
      all() { require('staff'); return db().incidents; },
      setStatus(id, status, note) {
        const u = require('staff');
        const inc = db().incidents.find((x) => x.id === id);
        if (!inc) throw new ApiError('not_found');
        inc.status = status; inc.history.push({ status, at: new Date().toISOString() });
        if (note) inc.notes.push({ by: u.name, text: note, at: new Date().toISOString() });
        return commit(inc);
      },
      simulateNext(id) {
        const u = require('customer');
        const inc = db().incidents.find((x) => x.id === id);
        if (!inc || (inc.userId !== u.id && roleLevel(u) < LEVEL.staff) || !App.config.app.demoMode) throw new ApiError('forbidden');
        const flow = App.config.incidentFlow; const i = flow.indexOf(inc.status);
        if (i < flow.length - 1) { inc.status = flow[i + 1]; inc.history.push({ status: inc.status, at: new Date().toISOString() }); }
        return commit(inc);
      },
    },

    // ===== Catering =====
    catering: {
      request(data) {
        const u = require('customer');
        const r = { id: 'CAT-' + (db().counters.catering++), userId: u.id, status: 'quote_requested', quote: null, createdAt: new Date().toISOString(), ...data };
        db().cateringRequests.unshift(r);
        return commit(r);
      },
      mine() { const u = require('customer'); return db().cateringRequests.filter((r) => r.userId === u.id); },
      all() { require('staff'); return db().cateringRequests; },
      sendQuote(id, amountNok, message) {
        require('admin');
        const r = db().cateringRequests.find((x) => x.id === id);
        r.quote = { amountNok: Number(amountNok), message, sentAt: new Date().toISOString() }; r.status = 'quote_sent';
        return commit(r);
      },
      // A booking is only CONFIRMED after the customer accepts a quote (and, live, after Flamme Burger confirms).
      accept(id) {
        const u = require('customer');
        const r = db().cateringRequests.find((x) => x.id === id);
        if (!r || r.userId !== u.id || r.status !== 'quote_sent') throw new ApiError('forbidden');
        r.status = 'confirmed'; r.confirmedAt = new Date().toISOString();
        return commit(r);
      },
      setStatus(id, status) { require('admin'); const r = db().cateringRequests.find((x) => x.id === id); r.status = status; return commit(r); },
    },

    // ===== Loyalty =====
    loyalty: {
      balance() { const u = require('customer'); return balanceOf(u.id); },
      ledger() { const u = require('customer'); return db().ledger.filter((l) => l.userId === u.id).sort((a, b) => b.at.localeCompare(a.at)); },
      rewards() { return db().rewards; },
      vouchers() { const u = require('customer'); return db().vouchers.filter((v) => v.userId === u.id); },
      redeem(rewardId) {
        const u = require('customer');
        const r = db().rewards.find((x) => x.id === rewardId && x.active);
        if (!r) throw new ApiError('not_found');
        if (balanceOf(u.id) < r.costPoints) throw new ApiError('insufficient_points');
        // `code` is what the QR encodes; staff validate it at the counter.
        const code = 'FB' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const v = { id: App.util.uid('v'), code, userId: u.id, rewardId, status: 'active', createdAt: new Date().toISOString() };
        db().vouchers.push(v);
        db().ledger.push({ id: App.util.uid('l'), userId: u.id, points: -r.costPoints, reason: 'redeem', ref: rewardId, at: new Date().toISOString() });
        return commit(v);
      },
      pointsFor,
      saveReward(r) {
        require('admin');
        const i = db().rewards.findIndex((x) => x.id === r.id);
        if (i >= 0) db().rewards[i] = Object.assign(db().rewards[i], r); else db().rewards.push(Object.assign({ id: App.util.uid('r'), status: 'proposal', active: true }, r));
        return commit(r);
      },
    },

    // ===== Reviews (incentivised, in-app) =====
    reviews: {
      forOrder(orderId) { api.orders.get(orderId); return db().reviews.find((r) => r.orderId === orderId) || null; },
      canReview(o) {
        const r = settings().loyalty;
        const doneAt = (o.history.filter((h) => h.status === 'delivered').pop() || {}).at || o.createdAt;
        return o.status === 'delivered' && !db().reviews.some((x) => x.orderId === o.id) && (Date.now() - new Date(doneAt)) / 864e5 <= r.reviewWindowDays;
      },
      pending() { const u = require('customer'); return db().orders.filter((o) => o.userId === u.id && api.reviews.canReview(o)); },
      submit(orderId, data) {
        const u = require('customer');
        const o = api.orders.get(orderId);
        if (o.userId !== u.id || !api.reviews.canReview(o)) throw new ApiError('cannot_review');
        const rating = Number(data.rating);
        if (!(rating >= 1 && rating <= 5)) throw new ApiError('rating_required');
        // Points do NOT depend on the rating.
        const pts = settings().loyalty.reviewPoints;
        const rv = { id: App.util.uid('rv'), orderId, userId: u.id, rating, food: Number(data.food) || null, service: Number(data.service) || null,
          comment: (data.comment || '').slice(0, 500), incentivised: true, pointsAwarded: pts, createdAt: new Date().toISOString() };
        db().reviews.unshift(rv);
        if (pts) db().ledger.push({ id: App.util.uid('l'), userId: u.id, points: pts, reason: 'review', ref: orderId, at: rv.createdAt });
        return commit(rv);
      },
      all() { require('staff'); return db().reviews; },
    },

    // ===== Counter: scan / validate reward codes =====
    counter: {
      lookup(code) {
        require('staff');
        const v = db().vouchers.find((x) => x.code === String(code || '').trim().toUpperCase());
        if (!v) return null;
        return { voucher: v, reward: db().rewards.find((r) => r.id === v.rewardId), user: db().users.find((x) => x.id === v.userId) };
      },
      redeem(code) {
        const u = require('staff');
        const hit = api.counter.lookup(code);
        if (!hit) throw new ApiError('not_found');
        if (hit.voucher.status !== 'active') throw new ApiError('voucher_used');
        Object.assign(hit.voucher, { status: 'used', usedAt: new Date().toISOString(), usedBy: u.name, usedChannel: 'counter' });
        return commit(hit);
      },
    },

    // ===== Staff: guides & checklists =====
    guides: {
      categories() { require('staff'); return db().guideCategories; },
      all() { require('staff'); return db().guides; },
      get(id) { require('staff'); return db().guides.find((g) => g.id === id) || null; },
      save(g) {
        const u = require('admin');
        g.updatedAt = new Date().toISOString(); g.owner = g.owner || u.name;
        const i = db().guides.findIndex((x) => x.id === g.id);
        if (i >= 0) db().guides[i] = g; else db().guides.unshift(g);
        return commit(g);
      },
      // Documents the AI assistant is allowed to use
      aiSources() { require('staff'); return db().guides.filter((g) => g.aiEnabled && g.approval !== 'draft'); },
    },
    checklists: {
      templates() { require('staff'); return db().checklists; },
      state(checklistId, locationId, date) {
        require('staff');
        const k = [checklistId, locationId, date || App.util.todayKey()].join('|');
        return db().checklistState[k] || {};
      },
      toggle(checklistId, locationId, itemId) {
        const u = require('staff');
        const k = [checklistId, locationId, App.util.todayKey()].join('|');
        const st = db().checklistState[k] = db().checklistState[k] || {};
        if (st[itemId]) delete st[itemId]; else st[itemId] = { by: u.name, at: new Date().toISOString() };
        return commit(st);
      },
      reset(checklistId, locationId) {
        require('staff');
        delete db().checklistState[[checklistId, locationId, App.util.todayKey()].join('|')];
        commit();
      },
    },

    // ===== Staff → supervisor: situations needing review before action =====
    staffReports: {
      create(data) {
        const u = require('staff');
        const r = { id: 'SR-' + Date.now().toString(36).toUpperCase().slice(-5), byId: u.id, by: u.name, locationId: data.locationId, guideId: data.guideId || null,
          kind: data.kind, // 'approval' (wait for decision) | 'after' (report after an emergency)
          description: data.description, proposed: data.proposed || '', status: data.kind === 'after' ? 'reported' : 'awaiting',
          createdAt: new Date().toISOString(), decision: null };
        db().staffReports.unshift(r);
        return commit(r);
      },
      mine() { const u = require('staff'); return db().staffReports.filter((r) => r.byId === u.id); },
      all() { require('admin'); return db().staffReports; },
      decide(id, status, note) {
        const u = require('admin');
        const r = db().staffReports.find((x) => x.id === id);
        r.status = status; r.decision = { by: u.name, note: note || '', at: new Date().toISOString() };
        return commit(r);
      },
    },

    // ===== Staff: morning prep report =====
    prep: {
      report(locationId, day) {
        require('staff');
        const s = db().prepSettings;
        const today = day || App.prep.dayKey(new Date());
        const lastNight = api.inventory.get(locationId, App.prep.addDays(today, -1));
        return Object.assign(App.prep.report(db().prep, {
          locationId, today, horizonDays: s.horizonDays, bufferPct: s.bufferPct,
          adjustments: db().prepAdjustments, availableIds: db().products.filter((p) => p.available).map((p) => p.id),
          stock: lastNight ? api.inventory.toIngredients(lastNight.items) : null,
          calibration: api.inventory.calibration(locationId),
        }), { lastCount: lastNight });
      },
      settings() { require('staff'); return db().prepSettings; },
      data() { require('staff'); return db().prep; },
      state(locationId, day) { require('staff'); return db().prepState[locationId + '|' + day] || {}; },
      // qty = amount taken out / prepared (ingredient units) — used to compute actual use at closing
      toggle(locationId, day, lineId, qty) {
        const u = require('staff');
        const k = locationId + '|' + day;
        const st = db().prepState[k] = db().prepState[k] || {};
        if (st[lineId]) delete st[lineId]; else st[lineId] = { by: u.name, at: new Date().toISOString(), qty: Number(qty) || 0 };
        return commit(st);
      },
      setAdjustment(locationId, day, pct) {
        require('admin');
        const k = locationId + '|' + day;
        if (!Number(pct)) delete db().prepAdjustments[k]; else db().prepAdjustments[k] = Number(pct);
        return commit();
      },
      adjustments() { require('staff'); return db().prepAdjustments; },
      updateSettings(patch) { require('admin'); Object.assign(db().prepSettings, patch); return commit(db().prepSettings); },
      setBaseline(productId, units) { require('admin'); db().prep.baseline[productId] = Number(units) || 0; return commit(); },
    },

    // ===== Staff: closing inventory count =====
    inventory: {
      items() { require('staff'); return db().prep.inventoryItems; },
      isRequired(item, day) { return !item.requiredDays || item.requiredDays.includes(App.prep.weekday(day)); },
      get(locationId, day) { require('staff'); return db().inventoryCounts[locationId + '|' + day] || null; },
      toIngredients(items) {
        const out = {};
        db().prep.inventoryItems.forEach((it) => {
          const x = items[it.id];
          if (x && x.count !== '' && x.count != null) out[it.ingredientId] = (out[it.ingredientId] || 0) + Number(x.count) * it.perCount;
        });
        return out;
      },
      calibration(locationId) { require('staff'); return App.prep.calibration(db().prep, db().usageLogs[locationId] || []); },
      history(locationId) { require('staff'); return db().usageLogs[locationId] || []; },
      lastCountBefore(locationId, day) {
        const keys = Object.keys(db().inventoryCounts).filter((k) => k.startsWith(locationId + '|') && k.split('|')[1] < day).sort();
        const k = keys.pop(); return k ? { day: k.split('|')[1], ...db().inventoryCounts[k] } : null;
      },
      /*
       * Saves tonight's count and computes actual use per ingredient since the previous count:
       *   used = previous count + taken out / prepared (prep lines marked done) − discarded − tonight's count
       */
      submit(locationId, day, items) {
        const u = require('staff');
        const missing = db().prep.inventoryItems.filter((it) => api.inventory.isRequired(it, day) && (items[it.id] == null || items[it.id].count === '' || items[it.id].count == null));
        if (missing.length) throw new ApiError('count_required');
        db().inventoryCounts[locationId + '|' + day] = { items, by: u.name, at: new Date().toISOString() };

        const prev = api.inventory.lastCountBefore(locationId, day);
        let log = null;
        if (prev) {
          const prevIng = api.inventory.toIngredients(prev.items), curIng = api.inventory.toIngredients(items);
          const wasteIng = {};
          db().prep.inventoryItems.forEach((it) => { const w = items[it.id] && Number(items[it.id].waste); if (w) wasteIng[it.ingredientId] = (wasteIng[it.ingredientId] || 0) + w * it.perCount; });
          const added = {}, forecast = {};
          for (let d = App.prep.addDays(prev.day, 1); d <= day; d = App.prep.addDays(d, 1)) {
            const st = db().prepState[locationId + '|' + d] || {};
            Object.keys(st).forEach((lineId) => { const ing = lineId.split('@')[0]; added[ing] = (added[ing] || 0) + (st[lineId].qty || 0); });
            const need = App.prep.ingredientNeed(db().prep, App.prep.salesForecast(db().prep, locationId, d, db().prepAdjustments).units);
            Object.keys(need).forEach((ing) => (forecast[ing] = (forecast[ing] || 0) + need[ing]));
          }
          const ingredients = {};
          Object.keys(curIng).forEach((ing) => {
            if (prevIng[ing] == null) return; // need two counts of the same item
            ingredients[ing] = { actual: Math.round(App.prep.usageBetween(prevIng[ing], added[ing], wasteIng[ing], curIng[ing])), forecast: Math.round(forecast[ing] || 0) };
          });
          log = { from: prev.day, to: day, ingredients };
          const logs = db().usageLogs[locationId] = (db().usageLogs[locationId] || []).filter((l) => l.to !== day);
          logs.unshift(log);
        }
        // tick the closing-checklist item automatically
        const cl = db().checklists.find((c) => c.type === 'closing');
        const ck = [cl.id, locationId, day].join('|');
        const st = db().checklistState[ck] = db().checklistState[ck] || {};
        if (!st['c-inv']) st['c-inv'] = { by: u.name, at: new Date().toISOString() };
        commit();
        return log;
      },
    },

    // ===== Admin =====
    admin: {
      saveProduct(p) {
        require('admin');
        const i = db().products.findIndex((x) => x.id === p.id);
        if (i >= 0) db().products[i] = Object.assign(db().products[i], p);
        else db().products.push(Object.assign({ id: App.util.uid('p'), image: null, art: 'burger', optionGroups: [], tags: [], featured: false, available: true, ingredients: null,
          allergens: { status: 'pending', contains: [], mayContain: [], verifiedBy: null, verifiedAt: null } }, p));
        return commit(p);
      },
      verifyAllergens(productId, contains, mayContain, verified) {
        const u = require('admin');
        const p = db().products.find((x) => x.id === productId);
        p.allergens = { status: verified ? 'verified' : 'pending', contains, mayContain, verifiedBy: verified ? u.name : null, verifiedAt: verified ? new Date().toISOString() : null };
        return commit(p);
      },
      addCategory(name) {
        require('admin');
        const c = { id: App.util.uid('cat'), name: { en: name, nb: name }, sort: db().categories.length + 1 };
        db().categories.push(c); return commit(c);
      },
      users() { require('admin'); return db().users; },
      setRole(userId, role) {
        const u = require('admin');
        if (userId === u.id) throw new ApiError('cannot_change_own_role');
        db().users.find((x) => x.id === userId).role = role; return commit();
      },
      resetDemo() { App.store.resetAll(); },
    },
  };
  return api;
})();
