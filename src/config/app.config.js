/*
 * Platform configuration. Client-specific values come from App.tenant
 * (tenants/<client>/tenant.js); this file only holds platform defaults and the
 * business rules that the (still present) ordering/loyalty backend needs.
 *
 * Values marked `status: 'provisional'` / `'proposal'` are examples, NOT decisions
 * made by the client. Managers can override several of them at runtime.
 */
window.App = window.App || {};

App.config = {
  app: {
    name: App.tenant.appName,
    company: App.tenant.name,
    demoMode: true,               // shows demo banners, enables simulation controls
    defaultLang: App.tenant.defaultLang,
    languages: App.tenant.languages,
    currency: App.tenant.currency,
    storageKey: 'crew.' + App.tenant.id + '.v1',
    dataVersion: 4,              // bump when demo data changes → stored demo DB is reseeded
  },

  brand: Object.assign({ productImages: {} }, App.tenant.brand),

  // Own delivery ("Flamme Delivery"). Minimum order is a requirement to be able
  // to order delivery — it is NOT free delivery.
  delivery: {
    enabled: true,
    minimumOrderNok: 600,
    minimumAppliesTo: 'subtotal',  // provisional: products subtotal before rewards
    feeNok: 99,                    // EXAMPLE value — fee not yet decided
    feeStatus: 'provisional',
    hoursText: { en: 'Delivery hours to be confirmed', nb: 'Leveringstider bekreftes senere' },
    // No exact delivery times are promised without real data.
    etaText: { en: 'Estimated time is confirmed by the restaurant after ordering', nb: 'Estimert tid bekreftes av restauranten etter bestilling' },
    scheduleWindowMinutes: 30,
  },

  pickup: {
    slotMinutes: 15,
    leadMinutes: 20,               // provisional earliest pickup time from now
  },

  // Loyalty rules — PROPOSALS only.
  loyalty: {
    status: 'proposal',
    earnPoints: 1,                 // points earned...
    earnPerNok: 10,                // ...per this many NOK spent
    eligibleChannels: ['app'],     // only direct orders through Flamme Burger
    awardOn: 'delivered',          // points are awarded when the order is completed
    expiryMonths: null,            // not decided
    welcomeBonus: 0,
    // In-app reviews: points for ANY honest review of a completed order,
    // never conditioned on the rating, one per order, disclosed as incentivised.
    reviewPoints: 25,
    reviewWindowDays: 14,
  },

  // Internal AI assistant
  ai: {
    provider: 'demo',              // 'demo' (local search) | 'remote' (backend endpoint)
    remoteEndpoint: '/api/assistant', // future backend route that calls the LLM server-side
    minScore: 3,                   // demo retrieval threshold
    escalationContact: App.tenant.ai.escalationContact,
    // Topics where the assistant must never guess
    safetyKeywords: [
      'allergen', 'allergy', 'allergi', 'allergen', 'gluten', 'nut', 'nøtt', 'peanut', 'peanøtt', 'milk', 'melk',
      'lactose', 'laktose', 'egg', 'soy', 'soya', 'sesame', 'sesam', 'fish', 'fisk', 'shellfish', 'skalldyr',
      'celery', 'selleri', 'mustard', 'sennep', 'lupin', 'sulphite', 'sulfitt', 'mollusc', 'bløtdyr', 'celiac', 'cøliaki',
      'vegan', 'safe', 'trygg', 'temperature', 'temperatur', 'cooking time', 'steketid', 'core temp', 'kjernetemp',
      'shelf life', 'holdbarhet', 'contain', 'inneholder',
    ],
  },

  // The 14 allergens that must be declared under EU/EEA rules (Norway).
  allergenList: [
    { id: 'gluten', en: 'Cereals containing gluten', nb: 'Glutenholdige kornsorter' },
    { id: 'crustaceans', en: 'Crustaceans', nb: 'Skalldyr' },
    { id: 'eggs', en: 'Eggs', nb: 'Egg' },
    { id: 'fish', en: 'Fish', nb: 'Fisk' },
    { id: 'peanuts', en: 'Peanuts', nb: 'Peanøtter' },
    { id: 'soy', en: 'Soy', nb: 'Soya' },
    { id: 'milk', en: 'Milk', nb: 'Melk' },
    { id: 'nuts', en: 'Tree nuts', nb: 'Nøtter' },
    { id: 'celery', en: 'Celery', nb: 'Selleri' },
    { id: 'mustard', en: 'Mustard', nb: 'Sennep' },
    { id: 'sesame', en: 'Sesame', nb: 'Sesamfrø' },
    { id: 'sulphites', en: 'Sulphites', nb: 'Sulfitter' },
    { id: 'lupin', en: 'Lupin', nb: 'Lupin' },
    { id: 'molluscs', en: 'Molluscs', nb: 'Bløtdyr' },
  ],

  roles: {
    customer: { level: 1 },
    staff: { level: 2 },
    admin: { level: 3 },
  },

  orderFlow: {
    pickup: ['received', 'confirmed', 'preparing', 'ready', 'delivered'],
    delivery: ['received', 'confirmed', 'preparing', 'out_for_delivery', 'delivered'],
  },
  incidentFlow: ['reported', 'reviewing', 'redelivery_scheduled', 'redelivery_on_the_way', 'resolved'],
  cateringFlow: ['quote_requested', 'quote_sent', 'confirmed'],
};
