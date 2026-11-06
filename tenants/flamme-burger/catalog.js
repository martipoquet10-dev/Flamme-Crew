/*
 * CATALOG — Flamme Burger menu, categories and locations.
 *
 * Source: official online shop (flammeburger.no → order.ninito.com, Grünerløkka),
 * read 3 Nov 2026. Names, Norwegian descriptions and prices are copied from it;
 * English texts are our translations. Prices may differ per location and change
 * over time — the backend should become the source of truth.
 * Also compared with Wolt (Flamme Burger Løkka): same menu at higher platform
 * prices; the only extra item there is the Chicken Chili Cheese Menu Deal, added
 * below with its Wolt price (marked source: 'wolt'). No Foodora listing was found.
 *
 * NOT verified here: ingredients lists and allergens (status 'pending' until
 * Flamme Burger enters and verifies them in the admin panel).
 *
 * Product shape:
 *   id, categoryId, name{en,nb}, description{en,nb}, priceNok, image (URL or null →
 *   illustration), art (illustration kind), featured, available, tags[],
 *   optionGroups[], ingredients (null = not provided yet), note{en,nb} (optional),
 *   allergens: { status: 'pending' | 'verified', contains: [ids], mayContain: [ids], verifiedBy, verifiedAt }
 */
window.App = window.App || {};
App.demo = App.demo || {};

(function () {
  const pendingAllergens = () => ({ status: 'pending', contains: [], mayContain: [], verifiedBy: null, verifiedAt: null });

  // Product photos from the official online shop (see tenants/flamme-burger/brand/products/sources.json)
  const photo = (id) => 'tenants/flamme-burger/brand/products/' + id + (id === 'b-western' ? '.webp' : '.png');

  // Drink choice in menu deals (drinks from the official menu)
  const dealOptions = [
    { id: 'drink', type: 'single', required: true, name: { en: 'Drink', nb: 'Drikke' }, choices: [
      { id: 'cola', name: { en: 'Cola', nb: 'Cola' }, priceNok: 0, image: photo('dr-cola') },
      { id: 'cola-zero', name: { en: 'Cola Zero', nb: 'Cola Zero' }, priceNok: 0, image: photo('dr-cola-zero') },
      { id: 'sprite-zero', name: { en: 'Sprite Zero', nb: 'Sprite Zero' }, priceNok: 0, image: photo('dr-sprite-zero') },
      { id: 'urge', name: { en: 'Urge', nb: 'Urge' }, priceNok: 0, image: photo('dr-urge') },
      { id: 'water', name: { en: 'Telemark water', nb: 'Telemark vann' }, priceNok: 0, image: photo('dr-water') },
    ] },
  ];
  const sameGrill = { en: 'Note: cooked on the same grill as meat.', nb: 'Merk: tilberedt på samme grill som kjøtt.' };

  App.demo.categories = [
    { id: 'deals', name: { en: 'Menu deals', nb: 'Menu Deals' }, sort: 1 },
    { id: 'burgers', name: { en: 'Burgers', nb: 'Burgere' }, sort: 2 },
    { id: 'chicken', name: { en: 'Crispy chicken', nb: 'Crispy Chicken' }, sort: 3 },
    { id: 'veggie', name: { en: 'Vegetarian', nb: 'Vegetar' }, sort: 4 },
    { id: 'kids', name: { en: 'Kids', nb: 'Barn' }, sort: 5 },
    { id: 'sides', name: { en: 'Sides', nb: 'Tilbehør' }, sort: 6 },
    { id: 'dirty', name: { en: 'Dirty fries', nb: 'Dirty Fries' }, sort: 7 },
    { id: 'dips', name: { en: 'Dips', nb: 'Dipp' }, sort: 8 },
    { id: 'sweets', name: { en: 'Sweets', nb: 'Søtt' }, sort: 9 },
    { id: 'drinks', name: { en: 'Drinks', nb: 'Drikke' }, sort: 10 },
  ];

  // [id, category, art, price, nameEn, nameNb, descEn, descNb, extra]
  const P = (id, categoryId, art, priceNok, nameEn, nameNb, descEn, descNb, extra) =>
    Object.assign({ id, categoryId, art, priceNok, name: { en: nameEn, nb: nameNb }, description: { en: descEn, nb: descNb }, featured: false, available: true, tags: [], optionGroups: [] }, extra || {});
  const deal = (id, art, price, nameEn, nameNb, descEn, descNb, extra) => P(id, 'deals', art, price, nameEn, nameNb, descEn, descNb, Object.assign({ optionGroups: dealOptions }, extra || {}));

  App.demo.products = [
    // ---- Menu deals (burger + fries + drink)
    deal('d-western', 'double', 255, 'Western Burger Menu Deal', 'Western Burger Menu Deal', 'Burger of the month with fries and a drink.', 'Månedens burger med fries og drikke.', { tags: ['limited'], featured: true }),
    deal('d-chili-cheese', 'burger', 265, 'Chili Cheese Menu Deal', 'Chili Cheese Menu Deal', 'Cheddar, spicy cheddar sauce, jalapeño, chili cheese poppers. With fries and a drink.', 'Cheddar, spicy cheddar sauce, jalapeño, chili cheese poppers. Med fries og drikke.', { tags: ['recommended'] }),
    deal('d-classic', 'burger', 200, 'Classic Menu Deal', 'Classic Menu Deal', 'Classic burger with fries and a drink.', 'Classic burger med fries og drikke.'),
    deal('d-cheese', 'burger', 240, 'Cheese Menu Deal', 'Cheese Menu Deal', 'Cheese burger with fries and a drink.', 'Cheese burger med fries og drikke.'),
    deal('d-spicy', 'burger', 245, 'Spicy Menu Deal', 'Spicy Menu Deal', 'Spicy burger with fries and a drink.', 'Spicy burger med fries og drikke.'),
    deal('d-truffle', 'burger', 260, 'Truffle Menu Deal', 'Truffle Menu Deal', 'Truffle burger with fries and a drink.', 'Trøffel burger med fries og drikke.'),
    deal('d-bacon-cheese', 'double', 260, 'Bacon-Cheese Menu Deal', 'Bacon-Cheese Menu Deal', 'Bacon-Cheese burger with fries and a drink.', 'Bacon-Cheese burger med fries og drikke.', { tags: ['bestseller'], featured: true }),
    deal('d-bbq-bacon', 'double', 265, 'Bacon BBQ Cheese Menu Deal', 'Bacon BBQ Cheese Menu Deal', 'BBQ burger with fries and a drink.', 'BBQ burger med fries og drikke.'),

    // ---- Burgers
    P('b-western', 'burgers', 'double', 180, 'Western Burger', 'Western Burger', '130 g beef burger with cheese and Flamme seasoning, coleslaw, classic dressing, pickles and crispy onion. Burger of the month.', '130 g biffburger med cheddar og Flamme krydder, coleslaw, classic dressing, pickles og sprøstekt løk. Månedens burger.', { tags: ['limited'], featured: true }),
    P('b-chili-cheese', 'burgers', 'burger', 190, 'Chili Cheese Burger', 'Chili Cheese Burger', 'Cheddar, spicy cheddar sauce, jalapeño, chili cheese poppers.', 'Cheddar, spicy cheddar sauce, jalapeño, chili cheese poppers.', { tags: ['recommended'], featured: true }),
    P('b-classic', 'burgers', 'burger', 150, 'Classic Burger', 'Classic Burger', 'Flamme Classic sauce, pickles, tomato, lettuce and red onion.', 'Flamme Classic saus, pickles, tomat, salat og rødløk.'),
    P('b-cheese', 'burgers', 'burger', 165, 'Cheese Burger', 'Cheese Burger', 'Cheddar, Flamme Classic sauce, pickles and red onion.', 'Cheddar, Flamme Classic saus, pickles og rødløk.'),
    P('b-spicy', 'burgers', 'burger', 170, 'Spicy Burger', 'Spicy Burger', 'Flamme spicy mayo, cheddar, spicy pickle mix.', 'Flamme spicy majones, cheddar, spicy pickles miks.'),
    P('b-truffle', 'burgers', 'burger', 185, 'Truffle Burger', 'Trøffel Burger', 'Truffle mayo, cheddar, fried mushrooms with truffle and pickled red onion.', 'Trøffel majones, cheddar, stekt sopp med trøffel og syltet rødløk.', { featured: true }),
    P('b-bacon-cheese', 'burgers', 'double', 185, 'Bacon-Cheese Burger', 'Bacon-Cheese Burger', 'Bacon, cheddar, Flamme Classic sauce, Flamme seasoning, pickles and red onion.', 'Bacon, cheddar, Flamme classic saus, Flamme krydder, pickles og rødløk.', { tags: ['bestseller'], featured: true }),
    P('b-bbq-bacon', 'burgers', 'double', 190, 'Bacon BBQ Cheese Burger', 'Bacon BBQ Cheese Burger', 'Bacon, cheddar, coleslaw, BBQ sauce, red onion and pickles.', 'Bacon, cheddar, coleslaw, BBQ saus, rødløk og sylteagurk.'),

    // ---- Crispy chicken
    P('c-chili-cheese', 'chicken', 'chicken', 180, 'Chicken Chili Cheese Burger', 'Chicken Chili Cheese Burger', 'Crispy chicken, Flamme spicy cheddar sauce, jalapeño, chili cheese poppers.', 'Crispy kylling, Flamme Spicy cheddar sauce, jalapeño, chili cheese poppers.'),
    P('c-classic', 'chicken', 'chicken', 145, 'Chicken Classic Burger', 'Chicken Classic Burger', 'Crispy chicken, Flamme Classic sauce, pickles, tomato, lettuce and red onion.', 'Crispy kylling, Flamme Classic saus, pickles, tomat, salat og rødløk.'),
    P('c-bbq', 'chicken', 'chicken', 180, 'Chicken BBQ Burger', 'Chicken BBQ Burger', 'Crispy chicken, BBQ sauce, coleslaw, pickles and red onion.', 'Crispy kylling, BBQ saus, coleslaw, pickles og rødløk.'),
    P('c-spicy', 'chicken', 'chicken', 165, 'Chicken Spicy Burger', 'Chicken Spicy Burger', 'Crispy chicken, Flamme spicy sauce, jalapeño, pickles and pickled red onion.', 'Crispy kylling, Flamme spicy saus, jalapeño, pickles og syltet rødløk.'),
    P('c-truffle', 'chicken', 'chicken', 180, 'Chicken Truffle Burger', 'Chicken Truffle Burger', 'Crispy chicken, Flamme truffle sauce, fried mushrooms with truffle and pickled red onion.', 'Crispy kylling, Flamme Trøffel saus, stekt sopp med trøffel og syltet rødløk.'),
    P('cd-chili-cheese', 'chicken', 'box', 275, 'Chicken Chili Cheese Burger Menu Deal', 'Chicken Chili Cheese Burger Menu Deal', 'Chicken Chili Cheese Burger with fries and a drink.', 'Chicken Chili Cheese Burger med fries og drikke.', { optionGroups: dealOptions, source: 'wolt', priceStatus: 'to-verify' }),
    P('cd-classic', 'chicken', 'box', 200, 'Chicken Classic Burger Menu Deal', 'Chicken Classic Burger Menu Deal', 'Chicken Classic Burger with fries and a drink.', 'Chicken Classic Burger med fries og drikke.', { optionGroups: dealOptions }),
    P('cd-bbq', 'chicken', 'box', 250, 'Chicken BBQ Burger Menu Deal', 'Chicken BBQ Burger Menu Deal', 'Chicken BBQ Burger with fries and a drink.', 'Chicken BBQ Burger med fries og drikke.', { optionGroups: dealOptions }),
    P('cd-spicy', 'chicken', 'box', 240, 'Chicken Spicy Burger Menu Deal', 'Chicken Spicy Burger Menu Deal', 'Chicken Spicy Burger with fries and a drink.', 'Chicken Spicy Burger med fries og drikke.', { optionGroups: dealOptions }),
    P('cd-truffle', 'chicken', 'box', 275, 'Chicken Truffle Burger Menu Deal', 'Chicken Truffle Burger Menu Deal', 'Chicken Truffle Burger with fries and a drink.', 'Chicken Truffle Burger med fries og drikke.', { optionGroups: dealOptions }),

    // ---- Vegetarian (Beyond Meat)
    P('vd-cheese', 'veggie', 'veggie', 245, 'Beyond Cheese Menu Deal', 'Beyond Cheese Menu Deal', 'Vegetarian cheese burger with Beyond Meat. Fries and a drink included.', 'Vegetarisk Cheese burger med Beyond kjøtt. Fries og drikke er inkludert.', { optionGroups: dealOptions, note: sameGrill }),
    P('vd-truffle', 'veggie', 'veggie', 265, 'Beyond Truffle Menu Deal', 'Beyond Truffle Menu Deal', 'Vegetarian truffle burger with Beyond Meat. Fries and a drink included.', 'Vegetarisk Trøffel burger med Beyond kjøtt. Fries og drikke er inkludert.', { optionGroups: dealOptions, note: sameGrill }),
    P('vd-classic', 'veggie', 'veggie', 220, 'Beyond Classic Menu Deal', 'Beyond Classic Menu Deal', 'Vegetarian classic burger with Beyond Meat. Fries and a drink included.', 'Vegetarisk Classic burger med Beyond kjøtt. Fries og drikke er inkludert.', { optionGroups: dealOptions, note: sameGrill }),
    P('vd-spicy', 'veggie', 'veggie', 245, 'Beyond Spicy Menu Deal', 'Beyond Spicy Menu Deal', 'Vegetarian spicy burger with Beyond Meat. Fries and a drink included.', 'Vegetarisk Spicy burger med Beyond kjøtt. Fries og drikke er inkludert.', { optionGroups: dealOptions, note: sameGrill }),
    P('vd-bbq', 'veggie', 'veggie', 270, 'Beyond BBQ Menu Deal', 'Beyond BBQ Menu Deal', 'Vegetarian BBQ burger with Beyond Meat. Fries and a drink included.', 'Vegetarisk BBQ burger med Beyond kjøtt. Fries og drikke er inkludert.', { optionGroups: dealOptions, note: sameGrill }),
    P('v-classic', 'veggie', 'veggie', 170, 'Beyond Classic', 'Beyond Classic', 'Vegetarian classic burger with Beyond Meat. Flamme Classic sauce, tomato, pickles, lettuce and red onion.', 'Vegetarisk Classic Burger med Beyond kjøtt. Flamme Classic saus, tomat, pickles, salat og rødløk.', { note: sameGrill }),
    P('v-cheese', 'veggie', 'veggie', 170, 'Beyond Cheese', 'Beyond Cheese', 'Vegetarian cheese burger with Beyond Meat. Cheddar, Flamme Classic sauce, pickles and red onion.', 'Vegetarisk Cheese burger med Beyond kjøtt. Cheddar, Flamme Classic saus, pickles og rødløk.', { note: sameGrill }),
    P('v-truffle', 'veggie', 'veggie', 190, 'Beyond Truffle', 'Beyond Truffle', 'Vegetarian truffle burger with Beyond Meat. Truffle sauce, cheddar, fried mushrooms with truffle and pickled red onion.', 'Vegetarisk Truffle burger med Beyond kjøtt. Trøffel saus, cheddar, stekt sopp med trøffel og syltet rødløk.', { note: sameGrill }),
    P('v-spicy', 'veggie', 'veggie', 170, 'Beyond Spicy', 'Beyond Spicy', 'Vegetarian spicy burger with Beyond Meat. Flamme spicy sauce, cheddar and spicy pickle mix.', 'Vegetarisk Spicy burger med Beyond kjøtt. Flamme spicy saus, cheddar og spicy pickle miks.', { note: sameGrill }),
    P('v-bbq', 'veggie', 'veggie', 195, 'Beyond BBQ', 'Beyond BBQ', 'Vegetarian BBQ burger with Beyond Meat. BBQ sauce, coleslaw, pickles and red onion.', 'Vegetarisk BBQ burger med Beyond kjøtt. BBQ-saus, coleslaw, pickles og rødløk.', { note: sameGrill }),

    // ---- Kids
    P('k-cheese', 'kids', 'burger', 150, 'Kids Cheese Burger Menu Deal', 'Kids Cheese Burger Menu Deal', 'Kids cheese burger with fries and a drink.', 'Kids Cheese Burger med fries og drikke.', { optionGroups: dealOptions }),
    P('k-burger', 'kids', 'burger', 140, 'Kids Menu Deal', 'Kids Menu Deal', 'Plain burger with fries and a drink.', 'Plain burger med fries og drikke.', { optionGroups: dealOptions }),
    P('k-nuggets-l', 'kids', 'nuggets', 140, 'Kids Nugget Deal – Large (6 pcs)', 'Kids Nugget Deal – Large (6 stk)', 'Chicken nuggets (6 pcs) with fries and a drink.', 'Chicken Nuggets (6 stk) med fries og drikke.', { optionGroups: dealOptions }),
    P('k-nuggets-s', 'kids', 'nuggets', 110, 'Kids Nugget Deal – Small (4 pcs)', 'Kids Nugget Deal – Small (4 stk)', 'Chicken nuggets (4 pcs) with fries and a drink.', 'Chicken Nuggets (4 stk) med fries og drikke.', { optionGroups: dealOptions }),

    // ---- Sides
    P('s-fries', 'sides', 'fries', 60, 'Classic Fries', 'Classic Fries', 'Classic crispy fries.', 'Classic crispy fries.'),
    P('s-sweet-potato', 'sides', 'fries', 70, 'Sweet Potato Fries', 'Søtpotet Fries', 'Sweet potato fries.', 'Søtpotet frites.'),
    P('s-poppers', 'sides', 'nuggets', 85, 'Chili Cheese Poppers (6 pcs)', 'Chili Cheese Poppers (6 stk)', 'Poppers with jalapeño cheese (6 pcs).', 'Poppers med jalapeño cheese (6 stk).'),
    P('s-rings', 'sides', 'rings', 85, 'Onion Rings (6 pcs)', 'Løkringer (6 stk)', 'Onion rings (6 pcs).', 'Løkringer (6 stk).'),
    P('s-nuggets', 'sides', 'nuggets', 95, 'Chicken Nuggets (5 pcs)', 'Chicken Nuggets (5 stk)', 'Chicken nuggets from Vestfold Fugl (5 pcs).', 'Chicken Nuggets fra Vestfold Fugl (5 stk).'),

    // ---- Dirty fries
    P('df-truffle', 'dirty', 'fries', 110, 'Truffle Fries', 'Truffle Fries', 'Truffle sauce, parmesan and parsley.', 'Trøffel saus, parmesan og persille.'),
    P('df-cheddar', 'dirty', 'fries', 110, 'Spicy Cheddar Fries', 'Spicy Cheddar Fries', 'Spicy cheddar sauce and Flamme seasoning.', 'Spicy cheddar-saus og Flamme krydder.'),

    // ---- Dips (house-made sauces)
    P('dip-classic', 'dips', 'dip', 25, 'Flamme Classic Dip', 'Flamme Classic Dip', 'Flamme Classic sauce.', 'Flamme Classic-saus.'),
    P('dip-spicy', 'dips', 'dip', 29, 'Flamme Spicy Dip', 'Flamme Spicy Dip', 'Flamme Spicy sauce.', 'Flamme Spicy-saus.'),
    P('dip-truffle', 'dips', 'dip', 35, 'Flamme Truffle Dip', 'Flamme Truffle Dip', 'Flamme truffle sauce.', 'Flamme Trøffel-saus.'),
    P('dip-cheddar', 'dips', 'dip', 35, 'Spicy Cheddar Dip', 'Spicy Cheddar Dip', 'Flamme spicy cheddar sauce.', 'Flamme Spicy Cheddar-saus.'),
    P('dip-bbq', 'dips', 'dip', 29, 'BBQ Dip', 'BBQ Dip', 'BBQ sauce.', 'BBQ-saus.'),

    // ---- Sweets
    P('sw-churros', 'sweets', 'dessert', 95, 'Churros (5 pcs)', 'Churros (5 stk)', 'Churros with sugar (5 pcs).', 'Churros med sukker (5 stk).'),
    P('sw-cookie', 'sweets', 'dessert', 49, 'Cookie', 'Cookie', 'Cookie.', 'Cookie.'),

    // ---- Drinks
    P('dr-cola', 'drinks', 'drink', 45, 'Cola', 'Cola', '500 ml', '500 ml'),
    P('dr-cola-zero', 'drinks', 'drink', 45, 'Cola Zero', 'Cola Zero', '500 ml', '500 ml'),
    P('dr-sprite-zero', 'drinks', 'drink', 45, 'Sprite Zero', 'Sprite Zero', '500 ml', '500 ml'),
    P('dr-urge', 'drinks', 'drink', 45, 'Urge', 'Urge', '500 ml', '500 ml'),
    P('dr-powerade', 'drinks', 'drink', 55, 'Powerade Mountain Blast', 'Powerade Mountain Blast', '500 ml', '500 ml'),
    P('dr-monster-zero', 'drinks', 'drink', 48, 'Monster Energy Zero Sugar', 'Monster Energy Zero Sugar', '500 ml · 16+', '500 ml · 16+', { tags: ['16+'] }),
    P('dr-monster-ft', 'drinks', 'drink', 48, 'Monster Full Throttle', 'Monster Full Throttle', '500 ml · 16+', '500 ml · 16+', { tags: ['16+'] }),
    P('dr-monster-white', 'drinks', 'drink', 48, 'Monster Ultra White', 'Monster Ultra White', '500 ml · 16+', '500 ml · 16+', { tags: ['16+'] }),
    P('dr-monster-mango', 'drinks', 'drink', 48, 'Monster Mango Loco', 'Monster Mango Loco', '500 ml · 16+', '500 ml · 16+', { tags: ['16+'] }),
    P('dr-mer-orange', 'drinks', 'drink', 25, 'MER Orange', 'MER Appelsin', '200 ml', '200 ml'),
    P('dr-mer-strawberry', 'drinks', 'drink', 25, 'MER Strawberry & Apple', 'MER Jordbær & Eple', '200 ml', '200 ml'),
    P('dr-water', 'drinks', 'drink', 29, 'Telemark Water', 'Telemark Water', '500 ml', '500 ml'),
    P('dr-sparkling', 'drinks', 'drink', 35, 'Telemark Sparkling', 'Telemark Sparkling', '500 ml', '500 ml'),
  ].map((p) => Object.assign({ image: photo(p.id === 'cd-chili-cheese' ? 'c-chili-cheese' : p.id), ingredients: null, allergens: pendingAllergens() }, p));

  // Locations from flammeburger.no / ninito. Opening hours: Grünerløkka verified from
  // the shop; others only show closing time 22:00 there → opening time TO VERIFY.
  // Delivery flags and postcode prefixes are PROVISIONAL (own delivery not launched yet).
  App.demo.locations = [
    { id: 'loc-lokka', lat: 59.9226, lng: 10.7586, name: 'Flamme Burger Grünerløkka', address: 'Thorvald Meyers gate 87, 0550 Oslo', city: 'Oslo',
      phone: '+47 902 75 631', email: 'post@flammeburger.no',
      hours: { open: '11:00', close: '22:00' }, hoursWeek: { mon: '12:00–22:00', tue: '11:00–22:00', wed: '11:00–22:00', thu: '11:00–23:00', fri: '11:00–23:00', sat: '11:00–23:00', sun: '11:00–23:00' }, hoursVerified: true,
      pickup: true, delivery: true, deliveryPostcodePrefixes: ['04', '05', '06'] },
    { id: 'loc-frogner', lat: 59.9176, lng: 10.709, name: 'Flamme Burger Frogner', address: 'Skovveien 3, 0257 Oslo', city: 'Oslo',
      hours: { open: '11:00', close: '22:00' }, hoursVerified: false, pickup: true, delivery: true, deliveryPostcodePrefixes: ['01', '02', '03'] },
    { id: 'loc-strandgaten', lat: 60.3952, lng: 5.3195, name: 'Flamme Burger Strandgaten', address: 'Strandgaten 89, Bergen', city: 'Bergen',
      hours: { open: '11:00', close: '22:00' }, hoursVerified: false, pickup: true, delivery: true, deliveryPostcodePrefixes: ['50'] },
    { id: 'loc-engen', lat: 60.3906, lng: 5.3196, name: 'Flamme Burger Engen', address: 'Engen 6, Bergen', city: 'Bergen',
      hours: { open: '11:00', close: '22:00' }, hoursVerified: false, pickup: true, delivery: true, deliveryPostcodePrefixes: ['50'] },
    { id: 'loc-asane', lat: 60.4655, lng: 5.3226, name: 'Flamme Burger Åsane Storsenter', address: 'Åsane Senter 39, Bergen', city: 'Bergen',
      hours: { open: '11:00', close: '22:00' }, hoursVerified: false, pickup: true, delivery: false, deliveryPostcodePrefixes: [] },
    { id: 'loc-stord', lat: 59.7801, lng: 5.4983, name: 'Flamme Burger Stord', address: 'Osen 2, Stord', city: 'Stord',
      hours: { open: '15:00', close: '22:00' }, hoursVerified: false, pickup: true, delivery: false, deliveryPostcodePrefixes: [] },
  ];
})();
