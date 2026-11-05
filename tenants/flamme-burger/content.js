/*
 * DEMO CONTENT — users, catering packs, reward examples, internal guides,
 * checklists, AI knowledge docs and seed orders.
 *
 * IMPORTANT: The guides below are STRUCTURAL EXAMPLES. They do not contain
 * approved Flamme Burger procedures, food-safety instructions, cooking times or
 * allergen information. Steps in [brackets] are placeholders to be replaced.
 */
window.App = window.App || {};
App.demo = App.demo || {};

(function () {
  const daysAgo = (d, h) => { const x = new Date(); x.setDate(x.getDate() - d); if (h != null) x.setHours(h, 0, 0, 0); return x.toISOString(); };

  // Demo accounts (no passwords — demo login picks an account).
  App.demo.users = [
    { id: 'u-customer', name: 'Ingrid Demo', email: 'ingrid@example.com', phone: '+47 400 00 000', role: 'customer',
      address: { street: 'Demoveien 5', postcode: '0552', city: 'Oslo' } },
    { id: 'u-customer2', name: 'Lars Eksempel', email: 'lars@example.com', phone: '+47 400 00 001', role: 'customer', address: null },
    { id: 'u-staff', name: 'Ola Demo (staff)', email: 'ola@flame.example', phone: '', role: 'staff', locationId: 'loc-lokka' },
    { id: 'u-admin', name: 'Kari Demo (manager)', email: 'kari@flame.example', phone: '', role: 'admin', locationId: 'loc-lokka' },
  ];

  App.demo.cateringPacks = [
    { id: 'cp-meeting', art: 'box', minPeople: 8, priceFromNok: null,
      name: { en: 'Meeting Pack', nb: 'Møtepakke' },
      description: { en: 'Mini burgers, fries and drinks for team meetings and lunches.', nb: 'Miniburgere, pommes frites og drikke til møter og lunsj.' } },
    { id: 'cp-office', art: 'double', minPeople: 15, priceFromNok: null,
      name: { en: 'Office Party', nb: 'Kontorfest' },
      description: { en: 'Mix of burgers, chicken, veggie options, sides and desserts.', nb: 'Miks av burgere, kylling, vegetar, tilbehør og dessert.' } },
    { id: 'cp-event', art: 'chicken', minPeople: 30, priceFromNok: null,
      name: { en: 'Event & Celebration', nb: 'Arrangement og feiring' },
      description: { en: 'Large-scale catering for events, with optional on-site serving (to be confirmed).', nb: 'Catering for store arrangementer, med mulig servering på stedet (bekreftes).' } },
  ];

  // Example rewards — PROPOSALS, not decided.
  App.demo.rewards = [
    { id: 'r-drink', type: 'product', productId: 'dr-cola', costPoints: 100, active: true, status: 'proposal',
      name: { en: 'Free soft drink', nb: 'Gratis brus' } },
    { id: 'r-fries', type: 'product', productId: 's-fries', costPoints: 150, active: true, status: 'proposal',
      name: { en: 'Free Classic Fries', nb: 'Gratis Classic Fries' } },
    { id: 'r-50off', type: 'discount', amountNok: 50, costPoints: 300, active: true, status: 'proposal',
      name: { en: '50 NOK off your order', nb: '50 kr rabatt på bestillingen' } },
    { id: 'r-burger', type: 'product', productId: 'b-classic', costPoints: 500, active: true, status: 'proposal',
      name: { en: 'Free Classic Burger', nb: 'Gratis Classic Burger' } },
  ];

  App.demo.loyaltyLedger = [
    { id: 'l1', userId: 'u-customer', points: 19, reason: 'order', ref: 'FB-1001', at: daysAgo(20, 18) },
    { id: 'l2', userId: 'u-customer', points: 57, reason: 'order', ref: 'FB-1002', at: daysAgo(12, 19) },
    { id: 'l3', userId: 'u-customer', points: -100, reason: 'redeem', ref: 'r-drink', at: daysAgo(12, 19) },
    { id: 'l4', userId: 'u-customer', points: 300, reason: 'adjustment', ref: 'demo-start', at: daysAgo(30, 12) },
    { id: 'l5', userId: 'u-customer', points: 87, reason: 'order', ref: 'FB-1003', at: daysAgo(4, 20) },
  ];

  const line = (productId, qty, unitPriceNok, options) => ({ id: 'li-' + Math.random().toString(36).slice(2, 8), productId, qty, unitPriceNok, options: options || {} });
  const cola = { drink: 'cola' };
  App.demo.orders = [
    { id: 'FB-1003', userId: 'u-customer', mode: 'delivery', locationId: 'loc-lokka', status: 'delivered',
      items: [line('d-bacon-cheese', 2, 260, cola), line('d-western', 1, 255, { drink: 'cola-zero' }), line('sw-churros', 1, 95)], subtotalNok: 870, deliveryFeeNok: 99, discountNok: 0, totalNok: 969,
      address: { street: 'Demoveien 5', postcode: '0552', city: 'Oslo' }, time: 'asap', createdAt: daysAgo(4, 19), history: [{ status: 'delivered', at: daysAgo(4, 20) }], payment: 'demo-card', pointsAwarded: 87 },
    { id: 'FB-1002', userId: 'u-customer', mode: 'pickup', locationId: 'loc-lokka', status: 'delivered',
      items: [line('d-truffle', 1, 260, cola), line('d-cheese', 1, 240, { drink: 'urge' }), line('s-sweet-potato', 1, 70)], subtotalNok: 570, deliveryFeeNok: 0, discountNok: 0, totalNok: 570,
      time: '18:30', createdAt: daysAgo(12, 18), history: [{ status: 'delivered', at: daysAgo(12, 19) }], payment: 'demo-vipps', pointsAwarded: 57 },
    { id: 'FB-1001', userId: 'u-customer', mode: 'pickup', locationId: 'loc-frogner', status: 'delivered',
      items: [line('b-classic', 1, 150), line('dr-cola', 1, 45)], subtotalNok: 195, deliveryFeeNok: 0, discountNok: 0, totalNok: 195,
      time: '12:15', createdAt: daysAgo(20, 12), history: [{ status: 'delivered', at: daysAgo(20, 13) }], payment: 'demo-card', pointsAwarded: 19 },
  ];

  App.demo.reviews = [
    { id: 'rv-demo1', orderId: 'FB-0990', userId: 'u-customer2', rating: 4, food: 5, service: 4, comment: 'Demo review — great burger, a bit of a wait.', incentivised: true, pointsAwarded: 25, createdAt: daysAgo(6, 21) },
    { id: 'rv-demo2', orderId: 'FB-0985', userId: 'u-customer2', rating: 2, food: 3, service: 2, comment: 'Demo review — fries were missing, but they re-delivered quickly.', incentivised: true, pointsAwarded: 25, createdAt: daysAgo(9, 20) },
  ];

  App.demo.cateringRequests = [
    { id: 'CAT-201', userId: 'u-customer2', status: 'quote_sent', packId: 'cp-office', date: daysAgo(-10).slice(0, 10), time: '12:00', people: 25,
      address: 'Eksempelbedrift AS, Demogata 9, 0150 Oslo', contact: { name: 'Lars Eksempel', email: 'lars@example.com', phone: '+47 400 00 001', company: 'Eksempelbedrift AS' },
      preferences: 'Mix of burgers and veggie', dietary: '3 vegetarians', createdAt: daysAgo(3, 10),
      quote: { amountNok: 6250, message: 'Demo quote — includes delivery and setup (example).', sentAt: daysAgo(2, 9) } },
  ];

  // ---------- Internal guides ----------
  App.demo.guideCategories = [
    { id: 'emergencies', icon: 'alert', name: { en: 'Emergencies & unexpected situations', nb: 'Nødsituasjoner og uventede hendelser' } },
    { id: 'opening', icon: 'sunrise', name: { en: 'Opening the restaurant', nb: 'Åpning av restauranten' } },
    { id: 'pre-service', icon: 'clipboard', name: { en: 'Preparation before service', nb: 'Forberedelser før service' } },
    { id: 'product-prep', icon: 'chef', name: { en: 'Product preparation', nb: 'Produktforberedelse' } },
    { id: 'order-assembly', icon: 'bag', name: { en: 'Order assembly & check', nb: 'Montering og kontroll av bestillinger' } },
    { id: 'pickup-delivery', icon: 'truck', name: { en: 'Pickups & deliveries', nb: 'Henting og levering' } },
    { id: 'cleaning', icon: 'sparkle', name: { en: 'Cleaning & organisation', nb: 'Rengjøring og orden' } },
    { id: 'closing', icon: 'moon', name: { en: 'Closing the restaurant', nb: 'Stenging av restauranten' } },
    { id: 'incidents', icon: 'alert', name: { en: 'Incident handling', nb: 'Avvikshåndtering' } },
    { id: 'allergens', icon: 'shield', name: { en: 'Ingredients & allergens', nb: 'Ingredienser og allergener' } },
  ];

  const S = (en, nb, media) => ({ text: { en, nb }, media: media || null });
  // approval: 'demo' (example, not approved) | 'draft' | 'approved'
  App.demo.guides = [
    { id: 'g-opening', categoryId: 'opening', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(14), reviewDue: daysAgo(-60), owner: 'Kari Demo',
      title: { en: 'How to open the restaurant', nb: 'Slik åpner du restauranten' },
      summary: { en: 'Order of tasks from arrival until doors open. Use together with the opening checklist.', nb: 'Rekkefølgen på oppgavene fra du kommer til dørene åpnes. Brukes sammen med åpningssjekklisten.' },
      keywords: ['open', 'opening', 'start', 'morning', 'åpne', 'åpning', 'morgen'],
      steps: [
        S('Arrive at the agreed time and register your shift [system to be defined].', 'Møt opp til avtalt tid og registrer vakten [system defineres].'),
        S('Disarm the alarm following the local procedure [insert real procedure].', 'Slå av alarmen etter lokal prosedyre [sett inn reell prosedyre].', { type: 'image', caption: { en: 'Photo of alarm panel (placeholder)', nb: 'Bilde av alarmpanel (plassholder)' } }),
        S('Switch on lights, ventilation and equipment in the order defined by the manager [insert order].', 'Slå på lys, ventilasjon og utstyr i rekkefølgen leder har bestemt [sett inn rekkefølge].'),
        S('Open today\'s opening checklist in the app and complete each item.', 'Åpne dagens åpningssjekkliste i appen og fullfør hvert punkt.'),
        S('Report anything unusual to the shift manager before opening the doors.', 'Rapporter alt som er uvanlig til skiftleder før dørene åpnes.'),
      ],
      warnings: [{ en: 'Food-safety controls (temperatures, logs) must follow Flamme Burger\'s approved routine — not yet added.', nb: 'Mattrygghetskontroller (temperaturer, logger) skal følge Flamme Burgers godkjente rutine — ikke lagt inn ennå.' }] },

    { id: 'g-preservice', categoryId: 'pre-service', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(30), reviewDue: daysAgo(-30), owner: 'Kari Demo',
      title: { en: 'Station setup before service', nb: 'Klargjøring av stasjoner før service' },
      summary: { en: 'Make sure each station is stocked and ready before the first order.', nb: 'Sørg for at hver stasjon er fylt opp og klar før første bestilling.' },
      keywords: ['station', 'setup', 'stock', 'mise en place', 'stasjon', 'påfyll', 'klargjøring'],
      steps: [
        S('Check the station list for today [insert station plan].', 'Sjekk stasjonslisten for dagen [sett inn stasjonsplan].'),
        S('Refill packaging, bags, napkins and labels.', 'Fyll på emballasje, poser, servietter og etiketter.'),
        S('Confirm that the order screen / tablet is online.', 'Bekreft at bestillingsskjermen / nettbrettet er på nett.'),
        S('Tell the shift manager about any product that is running low so it can be marked unavailable.', 'Si fra til skiftleder om produkter som er i ferd med å gå tom, slik at de kan merkes utilgjengelige.'),
      ], warnings: [] },

    { id: 'g-productprep', categoryId: 'product-prep', approval: 'draft', aiEnabled: false, updatedAt: daysAgo(5), reviewDue: null, owner: 'Kari Demo',
      title: { en: 'Burger build sheet (draft)', nb: 'Byggeark for burgere (utkast)' },
      summary: { en: 'Structure for build sheets. Cooking times and temperatures are intentionally NOT included until approved.', nb: 'Struktur for byggeark. Steketider og temperaturer er bevisst IKKE med før de er godkjent.' },
      keywords: ['build', 'burger', 'assemble', 'bygg', 'oppskrift', 'recipe'],
      steps: [
        S('[Insert approved build order per burger, with photo]', '[Sett inn godkjent byggerekkefølge per burger, med bilde]', { type: 'image', caption: { en: 'Build photo (placeholder)', nb: 'Byggebilde (plassholder)' } }),
        S('[Insert approved cooking procedure — pending]', '[Sett inn godkjent steke-prosedyre — venter]'),
      ],
      warnings: [{ en: 'Draft — not visible to the AI assistant.', nb: 'Utkast — ikke synlig for AI-assistenten.' }] },

    { id: 'g-assembly', categoryId: 'order-assembly', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(10), reviewDue: daysAgo(-80), owner: 'Kari Demo',
      title: { en: 'Assembling and checking an order', nb: 'Pakking og kontroll av en bestilling' },
      summary: { en: 'Double-check every order against the ticket before it leaves the counter.', nb: 'Dobbeltsjekk hver bestilling mot bongen før den forlater disken.' },
      keywords: ['assemble', 'pack', 'check', 'order', 'ticket', 'pakke', 'kontroll', 'bong', 'bestilling'],
      steps: [
        S('Read the full ticket, including modifications and notes.', 'Les hele bongen, inkludert endringer og kommentarer.'),
        S('Place each item in the bag and tick it off on the ticket.', 'Legg hver vare i posen og kryss av på bongen.'),
        S('Check sauces, dips, drinks and cutlery.', 'Sjekk sauser, dipper, drikke og bestikk.'),
        S('A second person checks delivery orders before sealing [to be confirmed].', 'En annen person kontrollerer leveringsbestillinger før forsegling [bekreftes].'),
        S('Seal the bag and mark the order as ready in the system.', 'Forsegl posen og marker bestillingen som klar i systemet.'),
      ], warnings: [{ en: 'Orders with allergy notes: follow the approved allergy routine (pending) and involve the shift manager.', nb: 'Bestillinger med allerginotat: følg godkjent allergirutine (venter) og involver skiftleder.' }] },

    { id: 'g-delivery', categoryId: 'pickup-delivery', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(8), reviewDue: daysAgo(-90), owner: 'Kari Demo',
      title: { en: 'Handing over pickups and own deliveries', nb: 'Utlevering av henting og egen levering' },
      summary: { en: 'How to hand orders to customers and Flamme Burger drivers.', nb: 'Hvordan bestillinger gis til kunder og Flamme Burgers sjåfører.' },
      keywords: ['pickup', 'delivery', 'driver', 'hand over', 'henting', 'levering', 'sjåfør', 'bud'],
      steps: [
        S('Confirm the order number and customer name.', 'Bekreft ordrenummer og kundens navn.'),
        S('For deliveries, give the driver the sealed bag and the delivery note.', 'For levering, gi sjåføren den forseglede posen og leveringsseddelen.'),
        S('Update the status to "Out for delivery" or "Delivered".', 'Oppdater status til «Under levering» eller «Levert».'),
      ], warnings: [] },

    { id: 'g-cleaning', categoryId: 'cleaning', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(40), reviewDue: daysAgo(5), owner: 'Kari Demo',
      title: { en: 'Cleaning plan — where to find it', nb: 'Renholdsplan — hvor du finner den' },
      summary: { en: 'The cleaning plan lists areas, frequency and responsible person. Products and dosages follow the approved plan (pending).', nb: 'Renholdsplanen viser områder, frekvens og ansvarlig. Midler og dosering følger godkjent plan (venter).' },
      keywords: ['clean', 'cleaning', 'wash', 'hygiene', 'rengjøring', 'renhold', 'vask', 'hygiene'],
      steps: [
        S('Open the cleaning plan for your location [attach document].', 'Åpne renholdsplanen for ditt sted [legg ved dokument].', { type: 'video', caption: { en: 'Training video (placeholder)', nb: 'Opplæringsvideo (plassholder)' } }),
        S('Do the tasks marked for your shift and sign them off.', 'Utfør oppgavene merket for ditt skift og signer.'),
        S('Report damaged equipment or missing supplies to the manager.', 'Rapporter skadet utstyr eller manglende utstyr til leder.'),
      ], warnings: [{ en: 'Review overdue — confirm with the manager that this guide is still valid.', nb: 'Revisjon forfalt — bekreft med leder at guiden fortsatt gjelder.' }] },

    { id: 'g-closing', categoryId: 'closing', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(14), reviewDue: daysAgo(-60), owner: 'Kari Demo',
      title: { en: 'How to close the restaurant', nb: 'Slik stenger du restauranten' },
      summary: { en: 'Closing sequence. Use together with the closing checklist.', nb: 'Rekkefølge ved stenging. Brukes sammen med stengesjekklisten.' },
      keywords: ['close', 'closing', 'end', 'night', 'stenge', 'stenging', 'kveld', 'lukke'],
      steps: [
        S('Stop taking new orders at the agreed time [insert time per location].', 'Stopp å ta imot nye bestillinger til avtalt tid [sett inn tid per sted].'),
        S('Open today\'s closing checklist in the app and complete each item.', 'Åpne dagens stengesjekkliste i appen og fullfør hvert punkt.'),
        S('Count the inventory in the app (Staff → Count): meat and buns in the thawing fridge and sauce bottles EVERY night; fries only Thursday, Friday and Saturday. Tomorrow\'s prep report uses this count.', 'Tell varer i appen (Ansatt → Telling): kjøtt og brød i tinekjøleskapet og sausflasker HVER kveld; pommes frites kun torsdag, fredag og lørdag. Morgendagens forberedelsesrapport bruker tellingen.'),
        S('Store products according to the approved routine [pending].', 'Lagre produkter etter godkjent rutine [venter].'),
        S('Switch off equipment, lock up and arm the alarm [insert procedure].', 'Slå av utstyr, lås og sett på alarmen [sett inn prosedyre].'),
      ], warnings: [] },

    { id: 'g-missing', categoryId: 'incidents', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(3), reviewDue: daysAgo(-120), owner: 'Kari Demo',
      title: { en: 'Missing or wrong item in an order', nb: 'Manglende eller feil vare i en bestilling' },
      summary: { en: 'Our promise: we take responsibility and re-deliver what is needed as soon as possible.', nb: 'Vårt løfte: vi tar ansvar og leverer det som trengs på nytt så raskt som mulig.' },
      keywords: ['missing', 'wrong', 'incident', 'complaint', 'forgot', 'redeliver', 'mangler', 'feil', 'avvik', 'klage', 'glemt', 'ny levering'],
      steps: [
        S('Apologise and confirm the order number and what is missing or wrong.', 'Beklag og bekreft ordrenummer og hva som mangler eller er feil.'),
        S('Check the incident in the admin panel (Orders → Incidents).', 'Sjekk avviket i adminpanelet (Bestillinger → Avvik).'),
        S('Prepare the missing items with priority and schedule a re-delivery with a driver.', 'Lag de manglende varene med prioritet og planlegg ny levering med sjåfør.'),
        S('Update the incident status so the customer can follow it in the app.', 'Oppdater avviksstatusen slik at kunden kan følge den i appen.'),
        S('If re-delivery is not possible, the shift manager decides the alternative solution.', 'Hvis ny levering ikke er mulig, bestemmer skiftleder alternativ løsning.'),
      ], warnings: [] },

    { id: 'g-allergens', categoryId: 'allergens', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(2), reviewDue: daysAgo(-30), owner: 'Kari Demo',
      title: { en: 'Allergen questions from customers', nb: 'Allergenspørsmål fra kunder' },
      summary: { en: 'Only give allergen information that is verified in the product sheet. Never guess.', nb: 'Gi bare allergeninformasjon som er verifisert i produktarket. Aldri gjett.' },
      keywords: ['allergen', 'allergy', 'allergi', 'gluten', 'nuts', 'milk', 'nøtter', 'melk'],
      steps: [
        S('Open the product in the app and check whether its allergen information is marked "verified".', 'Åpne produktet i appen og sjekk om allergeninformasjonen er merket «verifisert».'),
        S('If it is not verified, do not answer — call the shift manager.', 'Hvis den ikke er verifisert, ikke svar — tilkall skiftleder.'),
        S('[Insert Flamme Burger\'s approved allergy-order routine]', '[Sett inn Flamme Burgers godkjente rutine for allergibestillinger]'),
      ], warnings: [{ en: 'Never tell a customer a product is "safe" unless verified information allows it.', nb: 'Si aldri til en kunde at et produkt er «trygt» med mindre verifisert informasjon tillater det.' }] },
  ];

  // ---------- Emergency guides ----------
  // emergency.level:
  //   'immediate'  → act and call emergency services at once, inform supervisor afterwards
  //   'supervisor' → ask a supervisor and wait for their decision before taking action
  // Norwegian emergency numbers: 110 fire, 112 police, 113 ambulance.
  // Steps are basic universal principles + [placeholders]; they must be approved
  // by Flamme Burger (and ideally checked against the fire service/police advice).
  const E = (id, level, call, icon, title, summary, steps, warnings, keywords) => ({
    id, categoryId: 'emergencies', approval: 'demo', aiEnabled: true, updatedAt: daysAgo(1), reviewDue: daysAgo(-180), owner: 'Kari Demo',
    emergency: { level, call, icon }, title, summary, steps, warnings: warnings || [], keywords,
  });
  App.demo.guides.unshift(
    E('g-fire', 'immediate', ['110'], 'alert',
      { en: 'Fire or smoke', nb: 'Brann eller røyk' },
      { en: 'People first. Warn, call 110, evacuate. Do not wait for approval.', nb: 'Mennesker først. Varsle, ring 110, evakuer. Ikke vent på godkjenning.' },
      [S('Warn everyone around you and activate the fire alarm [location of alarm button].', 'Varsle alle rundt deg og utløs brannalarmen [plassering av alarmknapp].'),
       S('Call 110 (fire service).', 'Ring 110 (brannvesenet).'),
       S('Evacuate guests and staff through the nearest safe exit [insert exit plan].', 'Evakuer gjester og ansatte gjennom nærmeste trygge utgang [sett inn rømningsplan].', { type: 'image', caption: { en: 'Exit plan (placeholder)', nb: 'Rømningsplan (plassholder)' } }),
       S('Only try to put out a small fire if it is safe and you have been trained [extinguisher / fire blanket location]. Never use water on burning oil or fat.', 'Prøv kun å slukke en liten brann hvis det er trygt og du har fått opplæring [plassering av slukkeapparat / brannteppe]. Bruk aldri vann på brennende olje eller fett.'),
       S('Close doors behind you if possible. Do not go back inside.', 'Lukk dører etter deg hvis mulig. Ikke gå inn igjen.'),
       S('Meet at the assembly point [insert] and check that everyone on shift is out.', 'Møt på møteplassen [sett inn] og sjekk at alle på vakt er ute.'),
       S('Inform the supervisor as soon as everyone is safe.', 'Informer leder så snart alle er i sikkerhet.')],
      [{ en: 'Life-threatening: act immediately. Supervisor is informed afterwards.', nb: 'Livstruende: handle umiddelbart. Leder informeres etterpå.' }],
      ['fire', 'smoke', 'burning', 'brann', 'røyk', 'brenner', 'incendio', 'fuego', 'evacuate', 'evakuer']),

    E('g-robbery', 'immediate', ['112'], 'alert',
      { en: 'Robbery or threat with a weapon', nb: 'Ran eller trussel med våpen' },
      { en: 'Your safety comes first. Do not resist. Call 112 when it is safe.', nb: 'Din sikkerhet kommer først. Ikke gjør motstand. Ring 112 når det er trygt.' },
      [S('Stay calm. Do what you are told and do not resist — money and products can be replaced.', 'Hold deg rolig. Gjør som du blir bedt om og ikke gjør motstand — penger og varer kan erstattes.'),
       S('Avoid sudden movements. Tell them what you are going to do before you do it.', 'Unngå brå bevegelser. Si hva du skal gjøre før du gjør det.'),
       S('If you can do it safely, notice appearance, clothing, voice and direction of escape.', 'Hvis det er trygt, legg merke til utseende, klær, stemme og fluktretning.'),
       S('Do not follow the robber.', 'Ikke følg etter raneren.'),
       S('When it is safe: call 112, lock the door and do not touch anything the robber touched.', 'Når det er trygt: ring 112, lås døren og ikke rør noe raneren har tatt på.'),
       S('Inform the supervisor. [Insert routine for witnesses, CCTV and follow-up support for staff.]', 'Informer leder. [Sett inn rutine for vitner, kameraovervåking og oppfølging av ansatte.]')],
      [{ en: 'Never put yourself at risk to protect money or property.', nb: 'Sett deg aldri selv i fare for å beskytte penger eller eiendom.' }],
      ['robbery', 'robbed', 'weapon', 'knife', 'gun', 'ranet', 'raner', 'ransforsøk', 'våpen', 'kniv', 'robo', 'atraco', 'threat']),

    E('g-medical', 'immediate', ['113'], 'alert',
      { en: 'Medical emergency or serious allergic reaction', nb: 'Akutt sykdom eller alvorlig allergisk reaksjon' },
      { en: 'Call 113 immediately and follow the operator’s instructions.', nb: 'Ring 113 umiddelbart og følg instruksjonene fra operatøren.' },
      [S('Call 113 (ambulance). Say where you are: [restaurant address].', 'Ring 113 (ambulanse). Si hvor du er: [restaurantens adresse].'),
       S('Follow the instructions from the 113 operator.', 'Følg instruksjonene fra 113-operatøren.'),
       S('Get the first-aid kit [location] and defibrillator if available [location].', 'Hent førstehjelpsskrinet [plassering] og hjertestarter hvis tilgjengelig [plassering].'),
       S('Send someone to meet the ambulance at the entrance.', 'Send noen for å møte ambulansen ved inngangen.'),
       S('Inform the supervisor and keep the order/receipt if food may be involved.', 'Informer leder og ta vare på bestillingen/kvitteringen hvis mat kan være involvert.')],
      [{ en: 'Do not guess about allergens. Never tell anyone a product is safe.', nb: 'Ikke gjett om allergener. Si aldri til noen at et produkt er trygt.' }],
      ['medical', 'ambulance', 'injury', 'injured', 'faint', 'allergic reaction', 'anaphylaxis', 'ambulanse', 'skade', 'besvimt', 'allergisk reaksjon', 'herido', 'accidente', 'first aid', 'førstehjelp', 'cut', 'burn', 'brannskade']),

    E('g-aggressive', 'supervisor', ['112'], 'alert',
      { en: 'Aggressive or threatening person', nb: 'Aggressiv eller truende person' },
      { en: 'Keep distance and get the supervisor. If anyone is in danger, call 112 immediately.', nb: 'Hold avstand og hent leder. Er noen i fare, ring 112 umiddelbart.' },
      [S('Keep a safe distance and a free path to an exit. Speak calmly.', 'Hold trygg avstand og fri vei til en utgang. Snakk rolig.'),
       S('Call the supervisor and let them handle the situation.', 'Tilkall leder og la dem håndtere situasjonen.'),
       S('Do not argue, touch or try to remove the person yourself.', 'Ikke krangle, ta på eller prøv å fjerne personen selv.'),
       S('If there is violence or a direct threat: call 112 at once — do not wait for the supervisor.', 'Ved vold eller direkte trussel: ring 112 med en gang — ikke vent på leder.'),
       S('Afterwards, write a report in the app.', 'Skriv en rapport i appen etterpå.')],
      [], ['aggressive', 'angry', 'threatening', 'drunk', 'fight', 'aggressiv', 'sint', 'truende', 'beruset', 'slåsskamp', 'agresivo', 'pelea']),

    E('g-theft', 'supervisor', [], 'shield',
      { en: 'Suspected theft or cash discrepancy', nb: 'Mistanke om tyveri eller kassedifferanse' },
      { en: 'Do not confront or accuse anyone. Report to the supervisor, who decides what to do.', nb: 'Ikke konfronter eller beskyld noen. Rapporter til leder, som bestemmer hva som skal gjøres.' },
      [S('Do not confront, follow or accuse anyone.', 'Ikke konfronter, følg etter eller beskyld noen.'),
       S('Write down what you noticed: time, place, what is missing.', 'Noter hva du la merke til: tid, sted, hva som mangler.'),
       S('Send a supervisor request in the app and wait for their decision.', 'Send en forespørsel til leder i appen og vent på beslutningen.'),
       S('The supervisor decides on CCTV review and police report [insert routine].', 'Leder bestemmer om gjennomgang av kamera og politianmeldelse [sett inn rutine].')],
      [], ['theft', 'stolen', 'steal', 'missing money', 'cash', 'tyveri', 'stjålet', 'kassedifferanse', 'robo', 'hurto', 'shoplifting']),

    E('g-outage', 'supervisor', [], 'gear',
      { en: 'Power cut or equipment failure', nb: 'Strømbrudd eller feil på utstyr' },
      { en: 'Stop serving affected products and contact the supervisor before discarding food or reopening.', nb: 'Stopp salg av berørte produkter og kontakt leder før mat kastes eller dere åpner igjen.' },
      [S('Stop using the affected equipment and pause orders that depend on it.', 'Slutt å bruke det berørte utstyret og sett bestillinger som avhenger av det på pause.'),
       S('Mark affected products as unavailable (ask the supervisor).', 'Merk berørte produkter som utilgjengelige (spør leder).'),
       S('Keep fridges and freezers closed. [Insert approved food-safety routine — pending.]', 'Hold kjøleskap og frysere lukket. [Sett inn godkjent mattrygghetsrutine — venter.]'),
       S('Send a supervisor request. Do not discard food or restart service without approval.', 'Send en forespørsel til leder. Ikke kast mat eller start service igjen uten godkjenning.'),
       S('If there is smoke, sparks or a smell of burning, follow the fire guide.', 'Ved røyk, gnister eller brent lukt, følg brannguiden.')],
      [], ['power', 'outage', 'electricity', 'broken', 'fryer', 'fridge', 'freezer', 'equipment', 'strømbrudd', 'strøm', 'ødelagt', 'frityr', 'kjøleskap', 'fryser', 'utstyr', 'apagón', 'avería'])
  );

  // Checklists (templates). State is stored per location + date.
  App.demo.checklists = [
    { id: 'cl-opening', type: 'opening', guideId: 'g-opening', title: { en: 'Opening checklist', nb: 'Åpningssjekkliste' }, items: [
      { id: 'o1', text: { en: 'Alarm disarmed and premises checked', nb: 'Alarm av og lokalet sjekket' } },
      { id: 'o2', text: { en: 'Lights, ventilation and music on', nb: 'Lys, ventilasjon og musikk på' } },
      { id: 'o3', text: { en: 'Equipment switched on [list pending]', nb: 'Utstyr slått på [liste venter]' } },
      { id: 'o4', text: { en: 'Food-safety checks done per approved routine [pending]', nb: 'Mattrygghetskontroller utført etter godkjent rutine [venter]' } },
      { id: 'o5', text: { en: 'Stations stocked', nb: 'Stasjoner fylt opp' } },
      { id: 'o6', text: { en: 'Order tablet online and app orders open', nb: 'Bestillingsnettbrett på nett og appbestillinger åpne' } },
      { id: 'o7', text: { en: 'Dining area clean and doors unlocked', nb: 'Spisesal ren og dører låst opp' } },
    ] },
    { id: 'cl-closing', type: 'closing', guideId: 'g-closing', title: { en: 'Closing checklist', nb: 'Stengesjekkliste' }, items: [
      { id: 'c1', text: { en: 'App orders closed at agreed time', nb: 'Appbestillinger stengt til avtalt tid' } },
      { id: 'c2', text: { en: 'Open orders and incidents handled', nb: 'Åpne bestillinger og avvik håndtert' } },
      { id: 'c3', text: { en: 'Products stored per approved routine [pending]', nb: 'Produkter lagret etter godkjent rutine [venter]' } },
      { id: 'c-inv', link: '#/staff/inventory', auto: true, text: { en: 'Inventory counted in the app (meat, bread, sauce bottles · fries Thu–Sat)', nb: 'Varetelling i appen (kjøtt, brød, sausflasker · pommes frites tor–lør)' } },
      { id: 'c4', text: { en: 'Cleaning plan tasks signed off', nb: 'Oppgaver i renholdsplanen signert' } },
      { id: 'c5', text: { en: 'Waste taken out', nb: 'Avfall tatt ut' } },
      { id: 'c6', text: { en: 'Equipment switched off', nb: 'Utstyr slått av' } },
      { id: 'c7', text: { en: 'Cash-up done [procedure pending]', nb: 'Kasseoppgjør gjort [prosedyre venter]' } },
      { id: 'c8', text: { en: 'Doors locked and alarm armed', nb: 'Dører låst og alarm på' } },
    ] },
  ];
})();
