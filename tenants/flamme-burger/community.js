/*
 * DEMO COMMUNITY DATA — Flamme Burger
 * News feed, chat channels & messages, events, training courses, documents,
 * surveys and recognition. All text is example content — replace with the client's own.
 */
window.App = window.App || {};
App.demo = App.demo || {};

(function () {
  const B = 'tenants/flamme-burger/brand/products/';
  const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
  const inDays = (d, h, m) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h || 0, m || 0, 0, 0); return x.toISOString(); };
  const L = (en, nb) => ({ en, nb });

  App.demo.communitySeed = function () {
    // ---------------- CHAT ----------------
    // members: 'all' | { locationId } | { positions: [] } | [userIds]
    const channels = [
      { id: 'ch-all', kind: 'channel', name: L('Flamme Burger — everyone', 'Flamme Burger — alle'), icon: 'megaphone', color: '#D8282F', members: 'all',
        description: L('Company-wide announcements and chat.', 'Felles kunngjøringer og prat for hele selskapet.') },
      { id: 'ch-lokka', kind: 'channel', name: L('Grünerløkka team', 'Grünerløkka-teamet'), icon: 'store', color: '#2563EB', members: { locationId: 'loc-lokka' },
        description: L('Everything about our restaurant at Grünerløkka.', 'Alt om restauranten vår på Grünerløkka.') },
      { id: 'ch-frogner', kind: 'channel', name: L('Frogner team', 'Frogner-teamet'), icon: 'store', color: '#7048E8', members: { locationId: 'loc-frogner' },
        description: L('Everything about our restaurant at Frogner.', 'Alt om restauranten vår på Frogner.') },
      { id: 'ch-kitchen', kind: 'channel', name: L('Kitchen — Løkka', 'Kjøkken — Løkka'), icon: 'chef', color: '#E8590C', members: { locationId: 'loc-lokka', positions: ['kitchen', 'lead', 'manager'] },
        description: L('Prep, stock and kitchen questions.', 'Forberedelser, varer og kjøkkenspørsmål.') },
      { id: 'ch-swap', kind: 'channel', name: L('Shift swaps — Løkka', 'Vaktbytte — Løkka'), icon: 'swap', color: '#0C8599', members: { locationId: 'loc-lokka' },
        description: L('Need someone to cover? Ask here — then make it official in Schedule → Swaps.', 'Trenger du noen til å ta en vakt? Spør her — og gjør det offisielt i Vakter → Bytte.') },
      { id: 'ch-leads', kind: 'channel', name: L('Shift leads & managers', 'Skiftledere og ledere'), icon: 'shield', color: '#2F9E44', members: { positions: ['lead', 'manager'] },
        description: L('Private channel for leads.', 'Lukket kanal for ledere.') },
      { id: 'dm-ola-sofie', kind: 'dm', members: ['u-staff', 'e-sofie'] },
      { id: 'dm-ola-kari', kind: 'dm', members: ['u-staff', 'u-admin'] },
    ];
    const M = (channelId, userId, min, en, nb, extra) => Object.assign({ id: 'm-' + channelId + '-' + min, channelId, userId, at: ago(min), text: nb ? L(en, nb) : en, reactions: {} }, extra || {});
    const messages = [
      M('ch-all', 'e-henrik', 60 * 26, 'Great work everyone this weekend — Saturday was our best day this year across all restaurants 🔥', 'Kjempeinnsats av alle i helgen — lørdag var årets beste dag på tvers av alle restaurantene 🔥', { reactions: { '🔥': ['u-admin', 'e-sofie', 'e-marius', 'e-lucia'], '👏': ['u-staff', 'e-maja'] } }),
      M('ch-all', 'u-admin', 60 * 25, 'Reminder: the new uniform aprons arrive on Monday. Old ones go in the box by the office.', 'Påminnelse: de nye forklærne kommer mandag. De gamle legges i kassen ved kontoret.'),
      M('ch-lokka', 'e-sofie', 180, 'Who has the keys for the dry storage today?', 'Hvem har nøklene til tørrlageret i dag?'),
      M('ch-lokka', 'e-marius', 172, 'I have them, they are in the office drawer now 👍', 'Jeg har dem, de ligger i skuffen på kontoret nå 👍'),
      M('ch-lokka', 'u-admin', 95, 'Big catering order tomorrow at 12:00 (40 burgers). Kitchen please plan prep tonight — it is already in the prep report.', 'Stor cateringbestilling i morgen kl. 12:00 (40 burgere). Kjøkkenet: planlegg forberedelser i kveld — den ligger allerede i forberedelsesrapporten.', { reactions: { '👍': ['e-marius', 'e-ahmed', 'u-staff'] } }),
      M('ch-lokka', 'e-lucia', 40, 'Fryer 2 is making a strange noise again 😕', 'Frityr 2 lager rar lyd igjen 😕'),
      M('ch-lokka', 'e-sofie', 34, 'Thanks — I sent a supervisor report and called the technician. Use fryer 1 until then.', 'Takk — jeg sendte en lederrapport og ringte teknikeren. Bruk frityr 1 frem til da.'),
      M('ch-kitchen', 'e-marius', 300, 'Truffle mayo is low, I ordered more for Friday.', 'Lite trøffelmajones igjen, jeg har bestilt mer til fredag.'),
      M('ch-kitchen', 'e-ahmed', 120, 'Thawing for tomorrow done ✔ (beef + buns as in the report)', 'Tining til i morgen er gjort ✔ (kjøtt + brød som i rapporten)'),
      M('ch-swap', 'e-marius', 300, 'Anyone want my next shift? Dentist appointment. I posted it in Swaps 🙏', 'Noen som vil ta neste vakt min? Tannlegetime. La den ut i Bytte 🙏'),
      M('ch-leads', 'u-admin', 600, 'Labour % this week is at 29 % — let\'s keep Monday light.', 'Lønnsprosenten denne uka er 29 % — la oss holde mandagen lett bemannet.'),
      M('dm-ola-sofie', 'e-sofie', 70, 'Hi Ola! Can you start 15 min earlier today? We have a big order at 16:15.', 'Hei Ola! Kan du starte 15 min tidligere i dag? Vi har en stor bestilling kl. 16:15.'),
      M('dm-ola-kari', 'u-admin', 60 * 30, 'Nice job on the closing count yesterday 👌', 'Bra jobba med stengetellingen i går 👌'),
      M('dm-ola-kari', 'u-staff', 60 * 29, 'Thanks! 😊', 'Takk! 😊'),
    ];
    const chatRead = { 'u-staff|ch-all': ago(60 * 24), 'u-staff|ch-kitchen': ago(100), 'u-staff|dm-ola-kari': ago(60 * 28), 'u-staff|ch-leads': ago(0) };

    // ---------------- NEWS FEED ----------------
    const posts = [
      { id: 'po-1', authorId: 'u-admin', audience: 'loc-lokka', at: ago(60 * 3), pinned: true, mustRead: true,
        title: L('The Western Burger is back from Monday', 'Western Burger er tilbake fra mandag'),
        text: L('From Monday the Western Burger is back on the menu. The build guide and allergen sheet are updated in the app — please read them before your next shift. Questions? Ask the AI assistant or your shift lead.',
                'Fra mandag er Western Burger tilbake på menyen. Byggeguiden og allergenarket er oppdatert i appen — les dem før neste vakt. Spørsmål? Spør AI-assistenten eller skiftleder.'),
        image: B + 'd-western.png', likes: ['e-sofie', 'e-marius', 'e-lucia', 'e-ahmed'], readBy: ['e-sofie', 'e-marius', 'e-lucia', 'e-ahmed', 'e-jonas'],
        comments: [{ id: 'cm-1', userId: 'e-lucia', at: ago(150), text: L('Finally!! 🤠', 'Endelig!! 🤠') }, { id: 'cm-2', userId: 'e-ahmed', at: ago(120), text: L('Do we get extra BBQ sauce in stock?', 'Får vi ekstra BBQ-saus på lager?') }, { id: 'cm-3', userId: 'u-admin', at: ago(110), text: L('Yes, delivery on Friday.', 'Ja, levering fredag.') }] },
      { id: 'po-2', authorId: 'hq', audience: 'all', at: ago(60 * 20),
        title: L('Restaurant of the month: Grünerløkka 🏆', 'Månedens restaurant: Grünerløkka 🏆'),
        text: L('Highest guest rating and the fewest delivery incidents in October. Pizza and cake are on us next week — thank you, team!', 'Høyest gjestevurdering og færrest leveringsavvik i oktober. Pizza og kake er på oss neste uke — takk, team!'),
        image: B + 'd-bacon-cheese.png', likes: ['u-admin', 'e-sofie', 'e-marius', 'e-lucia', 'e-ahmed', 'e-emma', 'e-jonas', 'e-henrik', 'e-maja', 'e-tobias'], readBy: [], comments: [{ id: 'cm-4', userId: 'e-sofie', at: ago(60 * 19), text: L('Best team in Oslo 🙌', 'Beste teamet i Oslo 🙌') }] },
      { id: 'po-3', authorId: 'u-admin', audience: 'loc-lokka', at: ago(60 * 28),
        title: L('Christmas party — pick a date', 'Julebord — velg dato'), text: L('Vote below. The restaurant closes early that evening.', 'Stem under. Restauranten stenger tidlig den kvelden.'),
        poll: { options: [{ id: 'a', text: L('Friday 5 December', 'Fredag 5. desember'), votes: ['e-sofie', 'e-lucia', 'e-ahmed'] }, { id: 'b', text: L('Saturday 13 December', 'Lørdag 13. desember'), votes: ['e-marius', 'e-emma'] }, { id: 'c', text: L('Thursday 18 December', 'Torsdag 18. desember'), votes: ['e-jonas'] }] },
        likes: ['e-tobias'], readBy: [], comments: [] },
      { id: 'po-4', authorId: 'e-marius', audience: 'loc-lokka', at: ago(60 * 50), mustRead: true,
        title: L('New routine: fryer oil log', 'Ny rutine: logg for frityrolje'),
        text: L('From this week we log every oil change on the closing checklist. It takes 20 seconds and keeps the fries perfect.', 'Fra denne uka logger vi hvert oljeskift på stengesjekklisten. Det tar 20 sekunder og holder pommes fritesen perfekt.'),
        link: { route: '#/staff/checklists/cl-closing', label: L('Open closing checklist', 'Åpne stengesjekklisten') }, likes: ['u-admin', 'e-ahmed'], readBy: ['u-admin', 'e-ahmed', 'e-amira', 'u-staff'], comments: [] },
      { id: 'po-5', authorId: 'u-admin', audience: 'loc-lokka', at: ago(60 * 70),
        title: L('Welcome Nora! 👋', 'Velkommen, Nora! 👋'), text: L('Nora started with us this week on front / till. Say hi and help her get started — her onboarding is in Community → Training.', 'Nora begynte hos oss denne uka på kasse / front. Si hei og hjelp henne i gang — opplæringen hennes ligger i Fellesskap → Opplæring.'),
        likes: ['e-sofie', 'e-lucia', 'e-emma', 'u-staff', 'e-tobias', 'e-elias'], readBy: [], comments: [{ id: 'cm-5', userId: 'e-nora', at: ago(60 * 68), text: L('Thank you all, so happy to be here!', 'Tusen takk, så glad for å være her!') }] },
      { id: 'po-6', authorId: 'e-maja', audience: 'loc-frogner', at: ago(60 * 10), title: L('Frogner: new delivery zone', 'Frogner: ny leveringssone'), text: L('We now deliver to Skøyen too.', 'Vi leverer nå også til Skøyen.'), likes: [], readBy: [], comments: [] },
    ];

    // ---------------- EVENTS ----------------
    const events = [
      { id: 'ev-1', kind: 'training', title: L('Training: new fryer routine', 'Opplæring: ny frityrrutine'), start: inDays(5, 10, 0), end: inDays(5, 11, 0), place: 'Flamme Burger Grünerløkka', audience: 'loc-lokka',
        description: L('30 minutes hands-on with Marius. Paid time.', '30 minutter praktisk gjennomgang med Marius. Betalt tid.'), rsvps: { 'e-ahmed': 'yes', 'e-amira': 'yes', 'e-elias': 'maybe' } },
      { id: 'ev-2', kind: 'meeting', title: L('Staff meeting', 'Personalmøte'), start: inDays(8, 9, 30), end: inDays(8, 10, 30), place: 'Flamme Burger Grünerløkka', audience: 'loc-lokka',
        description: L('Menu changes, Christmas season staffing and Q&A.', 'Menyendringer, bemanning i julesesongen og spørsmål.'), rsvps: { 'e-sofie': 'yes', 'e-marius': 'yes', 'e-lucia': 'yes', 'e-jonas': 'no' } },
      { id: 'ev-3', kind: 'social', title: L('Christmas party 🎄', 'Julebord 🎄'), start: inDays(30, 19, 0), end: inDays(30, 23, 59), place: 'TBA / annonseres', audience: 'all',
        description: L('Dinner, awards and dancing. Partners welcome.', 'Middag, utdelinger og dans. Partnere er velkomne.'), rsvps: { 'u-admin': 'yes', 'e-sofie': 'yes', 'e-henrik': 'yes', 'e-maja': 'yes', 'e-lucia': 'yes', 'e-emma': 'maybe' } },
      { id: 'ev-4', kind: 'social', title: L('After-work: bowling 🎳', 'After work: bowling 🎳'), start: inDays(12, 20, 0), end: inDays(12, 22, 0), place: 'Oslo Bowling', audience: 'loc-lokka',
        description: L('On the house for the restaurant of the month!', 'Spanderes på månedens restaurant!'), rsvps: { 'e-tobias': 'yes', 'e-elias': 'yes' } },
    ];

    // ---------------- TRAINING ----------------
    const Q = (en, nb, opts, correct) => ({ q: L(en, nb), options: opts.map(([e, n]) => L(e, n)), correct });
    const courses = [
      { id: 'c-welcome', icon: 'sparkle', color: '#D8282F', mandatory: true, minutes: 15, audience: 'all', title: L('Welcome to Flamme Burger', 'Velkommen til Flamme Burger'),
        description: L('Our story, how we work and how to use this app.', 'Historien vår, hvordan vi jobber og hvordan du bruker appen.'),
        lessons: [
          { id: 'l1', title: L('Who we are', 'Hvem vi er'), body: L('Flamme Burger makes burgers with real fire. We care about great food, fast service and taking responsibility when something goes wrong. [DEMO text — replace with the company story.]', 'Flamme Burger lager burgere med ekte flamme. Vi bryr oss om god mat, rask service og å ta ansvar når noe går galt. [DEMO-tekst — erstatt med selskapets historie.]') },
          { id: 'l2', title: L('Your first shift', 'Din første vakt'), body: L('Clock in from Schedule → Time clock when you arrive. Your shift lead walks you through the station. Every procedure is in In store → Guides, and the AI assistant can find it for you.', 'Stemple inn fra Vakter → Stemple når du kommer. Skiftleder viser deg stasjonen. Alle rutiner ligger i I butikken → Guider, og AI-assistenten kan finne dem for deg.') },
          { id: 'l3', title: L('Using the app', 'Slik bruker du appen'), body: L('Three areas: In store (everything during the shift), Schedule (your shifts, swaps, leave and hours) and Community (news, chat, training). The red SOS button is always one tap away.', 'Tre områder: I butikken (alt under vakten), Vakter (vakter, bytter, fravær og timer) og Fellesskap (nyheter, chat, opplæring). Den røde SOS-knappen er alltid ett trykk unna.') },
        ],
        quiz: [
          Q('Where do you clock in?', 'Hvor stempler du inn?', [['Schedule → Time clock', 'Vakter → Stemple'], ['Community → Chat', 'Fellesskap → Chat'], ['On paper', 'På papir']], 0),
          Q('You are unsure about a procedure. What do you do?', 'Du er usikker på en rutine. Hva gjør du?', [['Guess', 'Gjetter'], ['Check the guide / ask the AI assistant, then the shift lead', 'Sjekker guiden / spør AI-assistenten, deretter skiftleder'], ['Skip it', 'Hopper over']], 1),
        ] },
      { id: 'c-food', icon: 'shield', color: '#2F9E44', mandatory: true, minutes: 25, audience: 'all', title: L('Food safety — basics', 'Mattrygghet — grunnkurs'),
        description: L('Hygiene, cross-contamination and logs. [DEMO structure — content to be approved.]', 'Hygiene, kryssforurensning og logger. [DEMO-struktur — innhold må godkjennes.]'),
        lessons: [
          { id: 'l1', title: L('Personal hygiene', 'Personlig hygiene'), body: L('Wash hands when you start, after breaks, after raw meat and after touching your face or phone. Follow the approved hygiene routine in Guides.', 'Vask hendene når du starter, etter pauser, etter rått kjøtt og etter å ha tatt på ansiktet eller telefonen. Følg den godkjente hygienerutinen i Guider.') },
          { id: 'l2', title: L('Cross-contamination', 'Kryssforurensning'), body: L('Keep raw and ready-to-eat food apart, use the right colour boards and clean between tasks.', 'Hold rå og ferdig mat adskilt, bruk riktige fargekodede skjærebrett og rengjør mellom oppgaver.') },
          { id: 'l3', title: L('Logs and temperatures', 'Logger og temperaturer'), body: L('Temperatures and limits follow the company\'s approved IK-mat routine — never improvise. If a value is wrong, tell the shift lead immediately.', 'Temperaturer og grenseverdier følger selskapets godkjente IK-mat-rutine — aldri improviser. Er en verdi feil, si fra til skiftleder umiddelbart.') },
        ],
        quiz: [
          Q('When must you wash your hands?', 'Når må du vaske hendene?', [['Only at the start of the shift', 'Bare ved vaktstart'], ['At the start, after breaks, after raw meat and after touching phone/face', 'Ved start, etter pauser, etter rått kjøtt og etter telefon/ansikt'], ['When they look dirty', 'Når de ser skitne ut']], 1),
          Q('A temperature reading is outside the limit. What do you do?', 'En temperaturmåling er utenfor grensen. Hva gjør du?', [['Write it down and carry on', 'Noterer og fortsetter'], ['Tell the shift lead immediately', 'Sier fra til skiftleder umiddelbart'], ['Measure again tomorrow', 'Måler igjen i morgen']], 1),
        ] },
      { id: 'c-allergen', icon: 'alert', color: '#E8590C', mandatory: true, minutes: 15, audience: 'all', title: L('Allergens in practice', 'Allergener i praksis'),
        description: L('The 14 allergens and how to answer guests — never guess.', 'De 14 allergenene og hvordan du svarer gjester — aldri gjett.'),
        lessons: [
          { id: 'l1', title: L('The 14 allergens', 'De 14 allergenene'), body: L('EU/EEA rules require 14 allergens to be declared: gluten, crustaceans, eggs, fish, peanuts, soy, milk, tree nuts, celery, mustard, sesame, sulphites, lupin and molluscs. See In store → Menu & allergens.', 'EU/EØS-regler krever at 14 allergener deklareres: gluten, skalldyr, egg, fisk, peanøtter, soya, melk, nøtter, selleri, sennep, sesam, sulfitter, lupin og bløtdyr. Se I butikken → Meny og allergener.') },
          { id: 'l2', title: L('Answering a guest', 'Svare en gjest'), body: L('Only repeat verified product information. Never say a product is "safe". If information is missing or not verified — ask the shift lead before answering.', 'Gjenta kun verifisert produktinformasjon. Si aldri at et produkt er «trygt». Mangler informasjonen eller er den ikke verifisert — spør skiftleder før du svarer.') },
        ],
        quiz: [
          Q('A guest asks if a burger is safe for their nut allergy. You say…', 'En gjest spør om en burger er trygg for nøtteallergi. Du sier…', [['"Yes, it\'s safe"', '«Ja, den er trygg»'], ['You read the verified allergen info and involve the shift lead', 'Du leser verifisert allergeninfo og involverer skiftleder'], ['"Probably fine"', '«Sikkert greit»']], 1),
          Q('How many allergens must be declared?', 'Hvor mange allergener må deklareres?', [['7', '7'], ['10', '10'], ['14', '14']], 2),
        ] },
      { id: 'c-fire', icon: 'alert', color: '#C2255C', mandatory: true, minutes: 10, audience: 'all', title: L('Fire safety & emergencies', 'Brannvern og nødrutiner'),
        description: L('Exits, extinguishers, emergency numbers and the SOS button.', 'Rømningsveier, slukkeutstyr, nødnumre og SOS-knappen.'),
        lessons: [
          { id: 'l1', title: L('Emergency numbers', 'Nødnumre'), body: L('Fire 110 · Police 112 · Ambulance 113. Life first — call, then tell your manager. The SOS button in the app has all emergency guides.', 'Brann 110 · Politi 112 · Ambulanse 113. Liv først — ring, og si så fra til leder. SOS-knappen i appen har alle nødguidene.') },
          { id: 'l2', title: L('Exits and equipment', 'Rømningsveier og utstyr'), body: L('Know where the exits, fire blanket and extinguishers are in your restaurant. Your shift lead shows you on your first shift. [DEMO]', 'Vit hvor nødutganger, brannteppe og slukkeapparater er i restauranten. Skiftleder viser deg på første vakt. [DEMO]') },
        ],
        quiz: [Q('Number for the fire department in Norway?', 'Nummer til brannvesenet i Norge?', [['110', '110'], ['112', '112'], ['113', '113']], 0)] },
      { id: 'c-service', icon: 'star', color: '#7048E8', mandatory: false, minutes: 12, audience: 'all', title: L('Great guest service', 'God gjesteservice'),
        description: L('Greeting, upselling and handling complaints the Flamme way.', 'Hilsen, mersalg og klagehåndtering på Flamme-måten.'),
        lessons: [
          { id: 'l1', title: L('The greeting', 'Hilsenen'), body: L('Eye contact, smile, and a real "hi". Guests remember how you made them feel.', 'Øyekontakt, smil og et ekte «hei». Gjestene husker hvordan du fikk dem til å føle seg.') },
          { id: 'l2', title: L('When something goes wrong', 'Når noe går galt'), body: L('Listen, apologise, fix it. For deliveries follow the guide "Missing or wrong items".', 'Lytt, beklag, fiks det. For leveringer følg guiden «Manglende eller feil varer».') },
        ],
        quiz: [Q('A guest complains. First step?', 'En gjest klager. Første steg?', [['Explain why it isn\'t your fault', 'Forklare at det ikke er din feil'], ['Listen and apologise', 'Lytte og beklage'], ['Call the police', 'Ringe politiet']], 1)] },
    ];
    const courseProgress = {
      'u-staff|c-welcome': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 200) },
      'u-staff|c-food': { lessonsDone: ['l1'], quizScore: null, completedAt: null },
      'u-staff|c-fire': { lessonsDone: ['l1', 'l2'], quizScore: 100, completedAt: ago(60 * 24 * 190) },
      'e-nora|c-welcome': { lessonsDone: ['l1'], quizScore: null, completedAt: null },
      'e-sofie|c-welcome': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 500) },
      'e-sofie|c-food': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 480) },
      'e-sofie|c-allergen': { lessonsDone: ['l1', 'l2'], quizScore: 100, completedAt: ago(60 * 24 * 470) },
      'e-sofie|c-fire': { lessonsDone: ['l1', 'l2'], quizScore: 100, completedAt: ago(60 * 24 * 470) },
      'e-marius|c-welcome': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 400) },
      'e-marius|c-food': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 390) },
      'e-lucia|c-welcome': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 100) },
      'e-lucia|c-allergen': { lessonsDone: ['l1', 'l2'], quizScore: 50, completedAt: null },
      'e-ahmed|c-welcome': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 300) },
      'e-ahmed|c-food': { lessonsDone: ['l1', 'l2', 'l3'], quizScore: 100, completedAt: ago(60 * 24 * 290) },
    };

    // ---------------- DOCUMENTS ----------------
    const D = (id, cat, en, nb, sumEn, sumNb, sections, extra) => Object.assign({ id, category: cat, title: L(en, nb), summary: L(sumEn, sumNb), sections, version: '1.0', updatedAt: ago(60 * 24 * 30), readBy: [] }, extra || {});
    const S = (hEn, hNb, en, nb) => ({ h: L(hEn, hNb), body: L(en, nb) });
    const documents = [
      D('d-handbook', 'handbook', 'Employee handbook', 'Personalhåndbok', 'Working hours, pay, holidays, sick leave and how we treat each other.', 'Arbeidstid, lønn, ferie, sykefravær og hvordan vi behandler hverandre.', [
        S('Working hours & rota', 'Arbeidstid og vaktplan', 'The rota is published in the app at least 14 days ahead where possible. Swaps must be approved in the app.', 'Vaktplanen publiseres i appen minst 14 dager frem i tid der det er mulig. Bytter må godkjennes i appen.'),
        S('Pay & hours', 'Lønn og timer', 'Hours are taken from the time clock and approved by your manager. Pay day and supplements follow your contract. [DEMO]', 'Timer hentes fra stemplingen og godkjennes av leder. Lønningsdag og tillegg følger arbeidsavtalen din. [DEMO]'),
        S('Holidays', 'Ferie', 'Apply for holidays in Schedule → Leave. Summer holiday requests by 1 March. [DEMO]', 'Søk ferie i Vakter → Fravær. Sommerferie søkes innen 1. mars. [DEMO]'),
        S('Sick leave', 'Sykefravær', 'Call your shift lead before the shift starts and register the absence in the app. Rules for self-certification follow Norwegian law and company policy. [DEMO]', 'Ring skiftleder før vakten starter og registrer fraværet i appen. Regler for egenmelding følger norsk lov og selskapets policy. [DEMO]'),
      ], { mandatory: true, version: '2.1', readBy: ['e-sofie', 'e-marius', 'e-ahmed', 'u-staff'] }),
      D('d-hms', 'safety', 'Health, safety & environment (HMS)', 'HMS-håndbok', 'Safety at work, reporting incidents and protective equipment.', 'Sikkerhet på jobb, avviksmelding og verneutstyr.', [
        S('Report incidents', 'Meld avvik', 'Use In store → SOS → report to supervisor for every incident or near miss.', 'Bruk I butikken → SOS → rapport til leder for alle avvik og nesten-ulykker.'),
        S('Protective equipment', 'Verneutstyr', 'Cut-resistant gloves for slicing, heat gloves for the fryer. [DEMO]', 'Kuttsikre hansker ved skjæring, varmehansker ved frityr. [DEMO]'),
      ], { mandatory: true, readBy: ['e-sofie', 'e-marius'] }),
      D('d-uniform', 'policy', 'Uniform & appearance', 'Uniform og antrekk', 'What to wear on shift and how to look after your uniform.', 'Hva du har på deg på vakt og hvordan du tar vare på uniformen.', [
        S('On shift', 'På vakt', 'Flamme T-shirt, apron, cap or hairnet, closed non-slip shoes. [DEMO]', 'Flamme T-skjorte, forkle, caps eller hårnett, lukkede sklisikre sko. [DEMO]'),
      ]),
      D('d-privacy', 'policy', 'Privacy at work (GDPR)', 'Personvern på jobb (GDPR)', 'What personal data we store about you and why.', 'Hvilke personopplysninger vi lagrer om deg og hvorfor.', [
        S('Time clock data', 'Stempledata', 'Clock-in times are used for pay and the legal working-time record (AML § 10-7). [DEMO]', 'Stempletider brukes til lønn og lovpålagt arbeidstidsregistrering (AML § 10-7). [DEMO]'),
      ]),
      D('d-whistle', 'policy', 'Whistleblowing routine', 'Varslingsrutine', 'How to report censurable conditions — safely.', 'Hvordan du varsler om kritikkverdige forhold — trygt.', [
        S('How to report', 'Slik varsler du', 'Talk to your manager, HR or the safety representative. You can also report in writing. [DEMO]', 'Snakk med leder, HR eller verneombud. Du kan også varsle skriftlig. [DEMO]'),
      ]),
    ];

    // ---------------- SURVEYS ----------------
    const surveys = [
      { id: 'sv-pulse', title: L('Monthly pulse — November', 'Månedlig puls — november'), anonymous: true, closesAt: inDays(6, 23, 0), audience: 'all',
        questions: [
          { id: 'enps', type: 'scale10', text: L('How likely are you to recommend Flamme Burger as a workplace?', 'Hvor sannsynlig er det at du anbefaler Flamme Burger som arbeidsplass?') },
          { id: 'load', type: 'scale5', text: L('How was your workload in the last two weeks?', 'Hvordan har arbeidsmengden vært de siste to ukene?'), labels: [L('Too low', 'For lav'), L('Too high', 'For høy')] },
          { id: 'improve', type: 'choice', text: L('What would improve your shifts most?', 'Hva ville forbedret vaktene dine mest?'), options: [L('More staff at peak hours', 'Flere på jobb i rushet'), L('Better equipment', 'Bedre utstyr'), L('Clearer routines', 'Tydeligere rutiner'), L('Earlier rota', 'Tidligere vaktplan')] },
          { id: 'free', type: 'text', text: L('Anything else you want to tell us?', 'Noe annet du vil si til oss?') },
        ],
        responses: [
          { by: 'x1', answers: { enps: 9, load: 3, improve: 0 } }, { by: 'x2', answers: { enps: 10, load: 4, improve: 0 } }, { by: 'x3', answers: { enps: 7, load: 4, improve: 1 } },
          { by: 'x4', answers: { enps: 8, load: 3, improve: 3 } }, { by: 'x5', answers: { enps: 6, load: 5, improve: 0 } }, { by: 'x6', answers: { enps: 9, load: 3, improve: 2 } },
          { by: 'x7', answers: { enps: 10, load: 2, improve: 3 } },
        ] },
    ];

    // ---------------- RECOGNITION ----------------
    const kudos = [
      { id: 'k-1', fromId: 'u-admin', toId: 'e-sofie', value: 'leader', at: ago(60 * 5), text: L('Ran Saturday\'s rush like a pro. Calm, clear and kind. Thank you!', 'Styrte lørdagsrushet som en proff. Rolig, tydelig og snill. Takk!'), cheers: ['e-marius', 'u-staff'] },
      { id: 'k-2', fromId: 'e-sofie', toId: 'u-staff', value: 'teamwork', at: ago(60 * 30), text: L('Ola stayed 20 minutes to help close the kitchen when we were short. Legend.', 'Ola ble 20 minutter ekstra og hjalp med å stenge kjøkkenet da vi var få. Legende.'), cheers: ['u-admin', 'e-lucia'] },
      { id: 'k-3', fromId: 'e-marius', toId: 'e-ahmed', value: 'quality', at: ago(60 * 52), text: L('Perfect smash every single time 🔥', 'Perfekt smash hver eneste gang 🔥'), cheers: [] },
      { id: 'k-4', fromId: 'e-lucia', toId: 'e-nora', value: 'guest', at: ago(60 * 20), text: L('First week and already getting compliments from guests!', 'Første uke og får allerede skryt fra gjestene!'), cheers: ['e-emma'] },
    ];

    return { channels, messages, chatRead, posts, events, courses, courseProgress, documents, surveys, kudos };
  };
})();
