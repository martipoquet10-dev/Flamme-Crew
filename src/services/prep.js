/*
 * Prep forecast engine (pure functions — easy to move server-side).
 *
 * forecast(units per product per day) = baseline × weekdayFactor × locationFactor × (1 + manual adjustment %)
 * need(ingredient, day) = Σ products units × usage  (+ meal attach fries)
 *
 * Morning report for day D:
 *   - TAKE OUT TO THAW today: ingredients with leadDays L ≥ 1 → quantity needed on D + L
 *   - CHECK already thawing: quantities for D … D + L − 1 (taken out on previous mornings)
 *   - PREPARE today: ingredients with leadDays 0 (fries, sauces) → quantity for D
 *   - FORECAST: next days, so the opener can see what is coming
 *
 * Replace `baseline` with real sales history (e.g. average of the same weekday
 * over the last N weeks from the POS) when available.
 */
window.App = window.App || {};

App.prep = (function () {
  const dayKey = (d) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const addDays = (key, n) => { const [y, m, d] = key.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n)); };
  const weekday = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getDay(); };

  function salesForecast(data, locationId, key, adjustments) {
    const adj = (adjustments && adjustments[locationId + '|' + key]) || 0;
    const f = data.weekdayFactor[weekday(key)] * (data.locationFactor[locationId] || 1) * (1 + adj / 100);
    const units = {};
    Object.keys(data.baseline).forEach((pid) => { units[pid] = data.baseline[pid] * f; });
    return { units, factor: f, adjustmentPct: adj };
  }

  function ingredientNeed(data, units, availableIds) {
    const need = {};
    data.ingredients.forEach((i) => (need[i.id] = 0));
    Object.keys(units).forEach((pid) => {
      if (availableIds && !availableIds.includes(pid)) return;
      const u = data.usage[pid] || {};
      Object.keys(u).forEach((ing) => (need[ing] = (need[ing] || 0) + units[pid] * u[ing]));
      if (data.mealProducts.includes(pid)) need.fries += units[pid] * data.mealAttachRate;
    });
    return need;
  }

  /*
   * opts.stock:       { ingredientId: qty } counted at closing LAST NIGHT (in ingredient units),
   *                   only for ingredients that were counted. Thawed/prepared stock covers the
   *                   nearest days first, so surplus reduces what to take out / prepare.
   * opts.calibration: { ingredientId: factor } = actual use ÷ forecast over recent counted days.
   */
  function report(data, opts) {
    const { locationId, today, horizonDays = 4, bufferPct = 0, adjustments, availableIds } = opts;
    const stock = opts.stock || {};
    const cal = opts.calibration || {};
    const maxLead = Math.max.apply(null, data.ingredients.map((i) => i.leadDays));
    const days = [];
    for (let n = 0; n <= Math.max(horizonDays - 1, maxLead); n++) {
      const key = addDays(today, n);
      const fc = salesForecast(data, locationId, key, adjustments);
      const raw = ingredientNeed(data, fc.units, availableIds);
      const need = {};
      Object.keys(raw).forEach((k) => (need[k] = raw[k] * (cal[k] || 1)));
      days.push({ key, offset: n, ...fc, rawNeed: raw, need });
    }
    const byOffset = (n) => days[n];
    const b = 1 + bufferPct / 100;
    const packs = (ing, n) => (ing.pack ? Math.ceil(n / ing.pack) : null);

    const takeOut = [], check = [], prepare = [];
    data.ingredients.forEach((ing) => {
      const S = stock[ing.id];
      const counted = S != null;
      // need of the days that last night's stock must cover before the new batch is ready
      let covered = 0;
      for (let n = 0; n < ing.leadDays; n++) covered += byOffset(n).need[ing.id];
      const surplus = counted ? Math.max(0, S - covered) : 0;
      const shortage = counted && ing.leadDays >= 1 ? Math.max(0, Math.ceil(covered - S)) : 0;
      const target = byOffset(ing.leadDays);
      const base = target.need[ing.id];
      const line = {
        ing, forDay: target.key, counted, stock: counted ? Math.round(S) : null, surplus: Math.floor(surplus), shortage,
        forecastOnly: Math.ceil(base * b), factor: cal[ing.id] || 1,
        min: Math.max(0, Math.ceil(base - surplus)), withBuffer: Math.max(0, Math.ceil(base * b - surplus)),
      };
      line.packs = packs(ing, line.withBuffer);
      if (ing.leadDays >= 1) {
        takeOut.push(line);
        for (let n = 0; n < ing.leadDays; n++) {
          const d = byOffset(n);
          check.push({ ing, forDay: d.key, offset: n, min: Math.ceil(d.need[ing.id]), withBuffer: Math.ceil(d.need[ing.id] * b) });
        }
      } else {
        // lead 0: last night's leftover (S) is used today
        line.min = Math.max(0, Math.ceil(base - (S || 0)));
        line.withBuffer = Math.max(0, Math.ceil(base * b - (S || 0)));
        line.surplus = counted ? Math.max(0, Math.floor(S - base)) : 0;
        line.packs = packs(ing, line.withBuffer);
        prepare.push(line);
      }
    });
    return { today, locationId, bufferPct, days: days.slice(0, Math.max(horizonDays, maxLead + 1)), takeOut, check, prepare,
      stockCounted: Object.keys(stock).length > 0 };
  }

  /*
   * Actual use between two counts:
   *   used = previous count + added (taken out to thaw / prepared) − discarded − current count
   * compared with the raw forecast for the same days → feeds calibration.
   */
  function usageBetween(prevStock, addedQty, wasteQty, curStock) {
    return Math.max(0, prevStock + (addedQty || 0) - (wasteQty || 0) - curStock);
  }

  function calibration(data, logs) {
    const sums = {};
    logs.slice(0, data.calibrationDays).forEach((l) => Object.keys(l.ingredients).forEach((ing) => {
      const x = l.ingredients[ing]; if (!x.forecast) return;
      sums[ing] = sums[ing] || { a: 0, f: 0, n: 0 };
      sums[ing].a += x.actual; sums[ing].f += x.forecast; sums[ing].n++;
    }));
    const out = {};
    const [lo, hi] = data.calibrationClamp;
    Object.keys(sums).forEach((ing) => { if (sums[ing].n >= 3) out[ing] = Math.min(hi, Math.max(lo, sums[ing].a / sums[ing].f)); });
    return out;
  }

  return { report, salesForecast, ingredientNeed, usageBetween, calibration, dayKey, addDays, weekday };
})();
