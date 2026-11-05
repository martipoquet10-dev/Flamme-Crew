/*
 * PREP DATA — used by the morning prep report and the closing count.
 *
 *  - ingredients: what is thawed / prepared, with lead time in days.
 *      Beef: 2 days to thaw, bread: 1 day (given by Flamme Burger).
 *      Other lead times are PROVISIONAL and must be confirmed.
 *  - usage: how much of each ingredient one sold unit consumes. Derived from the
 *      real menu structure (which sauce / patty each burger uses, deals include
 *      fries) — quantities per portion are DEMO until real build sheets arrive.
 *  - baseline: expected units sold per product on an average day (DEMO —
 *      replace with real POS sales history per location).
 *  - weekdayFactor / locationFactor: DEMO seasonality.
 */
window.App = window.App || {};
App.demo = App.demo || {};

(function () {
  const sauce = (id, en, nb) => ({ id, group: 'sauce', leadDays: 0, unit: { en: 'portions', nb: 'porsjoner' }, pack: 50, packName: { en: 'batch', nb: 'batch' }, name: { en, nb } });

  const ingredients = [
    { id: 'beef', group: 'thaw', leadDays: 2, leadStatus: 'confirmed', unit: { en: 'patties', nb: 'burgere' }, pack: 24, packName: { en: 'box', nb: 'eske' }, name: { en: 'Beef patties', nb: 'Biffburgere' } },
    { id: 'chicken', group: 'thaw', leadDays: 2, leadStatus: 'provisional', unit: { en: 'fillets', nb: 'fileter' }, pack: 20, packName: { en: 'bag', nb: 'pose' }, name: { en: 'Crispy chicken fillets', nb: 'Crispy kyllingfileter' } },
    { id: 'bun', group: 'thaw', leadDays: 1, leadStatus: 'confirmed', unit: { en: 'buns', nb: 'brød' }, pack: 12, packName: { en: 'bag', nb: 'pose' }, name: { en: 'Burger buns', nb: 'Hamburgerbrød' } },
    { id: 'fries', group: 'prep', leadDays: 0, unit: { en: 'portions', nb: 'porsjoner' }, pack: null, name: { en: 'Classic fries', nb: 'Classic fries' } },
    sauce('sauce-classic', 'Flamme Classic sauce', 'Flamme Classic saus'),
    sauce('sauce-spicy', 'Flamme Spicy sauce', 'Flamme Spicy saus'),
    sauce('sauce-truffle', 'Flamme Truffle sauce', 'Flamme Trøffel saus'),
    sauce('sauce-bbq', 'BBQ sauce', 'BBQ-saus'),
    sauce('sauce-cheddar', 'Spicy cheddar sauce', 'Spicy cheddar-saus'),
  ];

  // Which sauce each burger style uses (from the menu descriptions)
  const styleSauce = { classic: 'sauce-classic', cheese: 'sauce-classic', 'bacon-cheese': 'sauce-classic', western: 'sauce-classic',
    spicy: 'sauce-spicy', truffle: 'sauce-truffle', bbq: 'sauce-bbq', 'bbq-bacon': 'sauce-bbq', 'chili-cheese': 'sauce-cheddar' };
  const usage = {};
  const burger = (pid, protein, style, withFries) => {
    const u = { bun: 1 };
    if (protein) u[protein] = 1;
    if (styleSauce[style]) u[styleSauce[style]] = 1;
    if (withFries) u.fries = 1;
    usage[pid] = u;
  };
  ['western', 'chili-cheese', 'classic', 'cheese', 'spicy', 'truffle', 'bacon-cheese', 'bbq-bacon'].forEach((s) => { burger('b-' + s, 'beef', s, false); burger('d-' + s, 'beef', s, true); });
  ['chili-cheese', 'classic', 'bbq', 'spicy', 'truffle'].forEach((s) => { burger('c-' + s, 'chicken', s, false); burger('cd-' + s, 'chicken', s, true); });
  ['classic', 'cheese', 'truffle', 'spicy', 'bbq'].forEach((s) => { burger('v-' + s, null, s, false); burger('vd-' + s, null, s, true); }); // Beyond patty not tracked yet
  burger('k-burger', 'beef', null, true); burger('k-cheese', 'beef', null, true);
  Object.assign(usage, {
    'k-nuggets-l': { fries: 1 }, 'k-nuggets-s': { fries: 1 },
    's-fries': { fries: 1 }, 'df-truffle': { fries: 1, 'sauce-truffle': 1 }, 'df-cheddar': { fries: 1, 'sauce-cheddar': 1 },
    'dip-classic': { 'sauce-classic': 1 }, 'dip-spicy': { 'sauce-spicy': 1 }, 'dip-truffle': { 'sauce-truffle': 1 }, 'dip-bbq': { 'sauce-bbq': 1 }, 'dip-cheddar': { 'sauce-cheddar': 1 },
  });

  const inv = (id, ingredientId, perCount, requiredDays, unitEn, unitNb, en, nb) => ({ id, ingredientId, perCount, requiredDays, countUnit: { en: unitEn, nb: unitNb }, name: { en, nb } });

  App.demo.prep = {
    ingredients,
    // Closing inventory count. What is counted is what is ALREADY thawed / prepared
    // (thawing fridge, line). `perCount` converts the counted unit into the
    // ingredient unit (e.g. 1 sauce bottle = 25 portions — DEMO value).
    // requiredDays: null = every night; otherwise weekdays (0 = Sunday … 6 = Saturday)
    // on which the count is mandatory (optional on other nights).
    inventoryItems: [
      inv('inv-beef', 'beef', 1, null, 'patties', 'burgere', 'Beef patties — thawing fridge', 'Biffburgere — tinekjøleskap'),
      inv('inv-chicken', 'chicken', 1, null, 'fillets', 'fileter', 'Chicken fillets — thawing fridge', 'Kyllingfileter — tinekjøleskap'),
      inv('inv-bun', 'bun', 1, null, 'buns', 'brød', 'Thawed burger buns', 'Tinte hamburgerbrød'),
      inv('inv-sauce-classic', 'sauce-classic', 25, null, 'bottles', 'flasker', 'Flamme Classic sauce bottles', 'Flasker Flamme Classic saus'),
      inv('inv-sauce-spicy', 'sauce-spicy', 25, null, 'bottles', 'flasker', 'Flamme Spicy sauce bottles', 'Flasker Flamme Spicy saus'),
      inv('inv-sauce-truffle', 'sauce-truffle', 25, null, 'bottles', 'flasker', 'Flamme Truffle sauce bottles', 'Flasker Flamme Trøffel saus'),
      inv('inv-sauce-bbq', 'sauce-bbq', 25, null, 'bottles', 'flasker', 'BBQ sauce bottles', 'Flasker BBQ-saus'),
      inv('inv-sauce-cheddar', 'sauce-cheddar', 25, null, 'bottles', 'flasker', 'Spicy cheddar sauce bottles', 'Flasker spicy cheddar-saus'),
      inv('inv-fries', 'fries', 10, [4, 5, 6], 'bags', 'poser', 'Fries — bags at the line', 'Pommes frites — poser ved linjen'),
    ],
    // How many recent counted days are used to correct the forecast
    calibrationDays: 7,
    calibrationClamp: [0.6, 1.4],

    usage,
    // Menu deals already include fries, so no separate meal attach rate is needed
    mealAttachRate: 0,
    mealProducts: [],

    // Average units sold per day at the reference location — DEMO numbers
    baseline: {
      'd-western': 14, 'd-chili-cheese': 10, 'd-classic': 12, 'd-cheese': 16, 'd-spicy': 9, 'd-truffle': 12, 'd-bacon-cheese': 20, 'd-bbq-bacon': 10,
      'b-western': 8, 'b-chili-cheese': 6, 'b-classic': 8, 'b-cheese': 10, 'b-spicy': 6, 'b-truffle': 9, 'b-bacon-cheese': 12, 'b-bbq-bacon': 7,
      'c-chili-cheese': 3, 'c-classic': 4, 'c-bbq': 3, 'c-spicy': 3, 'c-truffle': 3, 'cd-chili-cheese': 2, 'cd-classic': 5, 'cd-bbq': 3, 'cd-spicy': 3, 'cd-truffle': 3,
      'v-classic': 2, 'v-cheese': 2, 'v-truffle': 1, 'v-spicy': 1, 'v-bbq': 1, 'vd-classic': 2, 'vd-cheese': 2, 'vd-truffle': 1, 'vd-spicy': 1, 'vd-bbq': 1,
      'k-burger': 4, 'k-cheese': 4, 'k-nuggets-l': 3, 'k-nuggets-s': 3,
      's-fries': 25, 'df-truffle': 10, 'df-cheddar': 6,
      'dip-classic': 12, 'dip-spicy': 6, 'dip-truffle': 8, 'dip-bbq': 4, 'dip-cheddar': 5,
    },
    // Sunday=0 … Saturday=6
    weekdayFactor: [1.1, 0.8, 0.8, 0.9, 1.0, 1.35, 1.5],
    locationFactor: { 'loc-lokka': 1, 'loc-frogner': 0.9, 'loc-strandgaten': 0.85, 'loc-engen': 0.8, 'loc-asane': 0.75, 'loc-stord': 0.5 },
  };
})();
