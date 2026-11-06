/*
 * TENANT CONFIGURATION — Flamme Burger
 * =====================================
 * Everything that makes this app "Flamme Burger" lives in this folder:
 *   tenant.js     → brand, colours, sections & modules, terminology, positions, HR rules
 *   catalog.js    → menu, prices, allergens, locations
 *   content.js    → demo accounts, guides, checklists, emergency procedures
 *   prep.js       → prep / thaw forecast data
 *   workforce.js  → employees, shifts, availability, leave, time punches (demo)
 *   community.js  → news posts, chat channels, courses, documents, events (demo)
 *   brand/        → logo, icons, product photos
 *
 * To create the app for a NEW company: copy this folder, edit the files and point
 * index.html at the new folder. The platform code in /src never changes per client.
 */
window.App = window.App || {};

App.tenant = {
  id: 'flamme-burger',
  name: 'Flamme Burger',
  appName: 'Flamme Crew',                       // name shown on the phone's home screen
  tagline: { en: 'Everything you need for your shift — in one app.', nb: 'Alt du trenger på jobb — i én app.' },
  industry: 'restaurant',
  languages: ['nb', 'en'],
  defaultLang: 'en',
  currency: 'NOK',
  base: 'tenants/flamme-burger/',

  brand: {
    logo: 'tenants/flamme-burger/brand/logo.png',
    logoOnDark: 'tenants/flamme-burger/brand/logo-white.png',
    appIcon: 'tenants/flamme-burger/brand/icon-512.png',
    favicon: 'tenants/flamme-burger/brand/icon-64.png',
    logoHeight: 34,
    heroImage: 'tenants/flamme-burger/brand/products/d-bacon-cheese.png',
    colors: {
      primary: '#D8282F', primaryInk: '#AC1C22', primarySoft: '#FCE9E9',
      ink: '#17110F', bg: '#F8F4EE', sidebar: '#17110F',
    },
    fonts: { display: 'Bricolage Grotesque', body: 'Inter' },
  },

  // The three areas of the app. Each can be renamed, recoloured or switched off.
  sections: {
    store: { enabled: true, color: '#D8282F', soft: '#FCE9E9', icon: 'store',
      label: { en: 'In store', nb: 'I butikken' },
      sub: { en: 'Prep, checklists, guides, allergens and the AI assistant — everything you check during the shift.', nb: 'Forberedelse, sjekklister, guider, allergener og AI-assistenten — alt du sjekker i løpet av vakten.' } },
    shifts: { enabled: true, color: '#2563EB', soft: '#E6EEFF', icon: 'calendar',
      label: { en: 'Schedule', nb: 'Vakter' },
      sub: { en: 'Your shifts, the team rota, swaps, time clock, leave and hours.', nb: 'Dine vakter, vaktplanen, bytter, stempling, fravær og timer.' } },
    community: { enabled: true, color: '#0D9488', soft: '#DDF5F1', icon: 'users',
      label: { en: 'Community', nb: 'Fellesskap' },
      sub: { en: 'News from your restaurant, team chats, training, events and recognition.', nb: 'Nyheter fra restauranten, teamchat, opplæring, arrangementer og ros.' } },
  },

  // Individual features. Set to false to hide a feature for this client.
  modules: {
    // In store
    prep: true, checklists: true, inventory: true, guides: true, menu: true, assistant: true, emergency: true, scan: true,
    // Schedule
    myShifts: true, rota: true, openShifts: true, swaps: true, timeclock: true, timesheets: true, leave: true, availability: true,
    payroll: true, labor: true,
    // Community
    feed: true, chat: true, events: true, learning: true, docs: true, surveys: true, kudos: true, directory: true,
  },

  terminology: {
    location: { en: 'Restaurant', nb: 'Restaurant' },
    locations: { en: 'Restaurants', nb: 'Restauranter' },
    manager: { en: 'Shift manager', nb: 'Skiftleder' },
  },

  // Job positions used in the rota (colour = chip colour in the schedule).
  positions: [
    { id: 'kitchen', name: { en: 'Kitchen', nb: 'Kjøkken' }, color: '#E8590C' },
    { id: 'front', name: { en: 'Front / till', nb: 'Kasse / front' }, color: '#7048E8' },
    { id: 'driver', name: { en: 'Driver', nb: 'Sjåfør' }, color: '#0C8599' },
    { id: 'lead', name: { en: 'Shift lead', nb: 'Skiftleder' }, color: '#2F9E44' },
    { id: 'manager', name: { en: 'Manager', nb: 'Daglig leder' }, color: '#495057' },
  ],

  // HR & pay rules — PROVISIONAL examples, confirm with the client / tariff agreement.
  workforce: {
    status: 'provisional',
    weekStartsOn: 1,                       // Monday
    swapsNeedManagerApproval: true,
    openShiftClaimsNeedApproval: true,
    clockInEarlyMinutes: 15,               // can clock in up to 15 min before the shift
    breakPaid: false,
    autoBreakOverHours: 5.5,               // suggested 30 min break above this
    vacationDaysPerYear: 25,               // Norway: 25 working days (Ferieloven) — confirm
    overtime: { dailyHours: 9, weeklyHours: 40, pct: 40 }, // AML: min. 40 % — confirm
    supplements: [                          // "OB-tillegg" — EXAMPLE values
      { id: 'evening', label: { en: 'Evening (18–24)', nb: 'Kveld (18–24)' }, days: [1, 2, 3, 4, 5], from: '18:00', to: '24:00', nokPerHour: 25 },
      { id: 'saturday', label: { en: 'Saturday (13–24)', nb: 'Lørdag (13–24)' }, days: [6], from: '13:00', to: '24:00', nokPerHour: 45 },
      { id: 'sunday', label: { en: 'Sunday', nb: 'Søndag' }, days: [0], from: '00:00', to: '24:00', nokPerHour: 60 },
      // Public holidays replace the day/time supplements above (Norwegian calendar, see holidayCountry)
      { id: 'holiday', label: { en: 'Public holiday', nb: 'Helligdag' }, holiday: true, pct: 100 },
      { id: 'holidayEve', label: { en: 'Holiday eve after 15:00', nb: 'Helligdagsaften etter kl. 15' }, holiday: true, eve: true, from: '15:00', to: '24:00', pct: 50 },
      // Supplements only for some positions (Planday's "employee groups")
      { id: 'lead', label: { en: 'Shift lead allowance', nb: 'Skiftledertillegg' }, days: [0, 1, 2, 3, 4, 5, 6], from: '00:00', to: '24:00', nokPerHour: 20, groups: ['lead'] },
      { id: 'driver', label: { en: 'Driver allowance', nb: 'Sjåførtillegg' }, days: [0, 1, 2, 3, 4, 5, 6], from: '00:00', to: '24:00', nokPerHour: 15, groups: ['driver'] },
    ],
    holidayCountry: 'NO',
    // Punch rounding: minutes 0 = off; mode 'nearest' | 'employee' (in down, out up) | 'employer' (in up, out down)
    rounding: { minutes: 0, mode: 'nearest' },
    payFromShiftStart: false,              // early clock-in is paid from the planned start
    kiosk: { allowUnscheduled: true },     // store tablet: allow clock-in without a planned shift
    // Forecast revenue per weekday (0 = Sunday) — used for labour-cost %. DEMO numbers.
    revenueForecast: { 0: 38000, 1: 24000, 2: 26000, 3: 28000, 4: 34000, 5: 52000, 6: 58000 },
    locationRevenueFactor: { 'loc-lokka': 1, 'loc-frogner': 0.8 },
    laborTargetPct: 28,
    // Share of the day's sales per opening hour (sums to 1). Used to plan staff hour by hour. DEMO curve.
    hourlySales: {
      weekday: { 11: 0.06, 12: 0.11, 13: 0.10, 14: 0.06, 15: 0.05, 16: 0.08, 17: 0.13, 18: 0.15, 19: 0.11, 20: 0.08, 21: 0.05, 22: 0.02 },
      weekend: { 11: 0.04, 12: 0.08, 13: 0.10, 14: 0.08, 15: 0.07, 16: 0.08, 17: 0.11, 18: 0.13, 19: 0.11, 20: 0.09, 21: 0.07, 22: 0.03, 23: 0.01 },
    },
    // Sales per labour hour you want to reach (NOK). Drives "recommended staff" per hour.
    targetSplh: 1100,
    minStaffPerHour: 3,
    // Employer costs on top of gross pay — Norway: arbeidsgiveravgift 14.1 % (zone 1) + feriepenger 12 %. CONFIRM.
    employerCost: { payrollTaxPct: 14.1, holidayPayPct: 12, status: 'provisional' },
    weeklyLaborBudget: { 'loc-lokka': 85000, 'loc-frogner': 62000 },
    // How each kind of absence is treated in reports and pay. CONFIRM with the client.
    absenceRules: {
      vacation: { paid: true, countsAsWorked: false },
      sick: { paid: true, countsAsWorked: false },     // employer period (arbeidsgiverperioden)
      timeoff: { paid: false, countsAsWorked: false },
      other: { paid: false, countsAsWorked: false },
    },
  },

  ai: {
    assistantName: { en: 'Flamme AI', nb: 'Flamme AI' },
    escalationContact: { en: 'the shift manager / restaurant manager', nb: 'skiftleder / restaurantsjef' },
  },

  emergencyNumbers: [['110', 'em.fire'], ['112', 'em.police'], ['113', 'em.ambulance']],
};
