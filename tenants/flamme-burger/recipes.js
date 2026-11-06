/*
 * RECIPES — Flamme Burger's real prep recipes (from the kitchen recipe binder).
 *
 *  Quantities are stored in grams (unit 'g') or pieces (unit 'pcs') so the app can
 *  scale a batch (½ ×, 1 ×, 2 ×). `ref` links an ingredient to another recipe.
 *  `art` describes the illustration: container + colours of what is inside.
 *  English is the original text from the binder; Norwegian is a translation.
 *  The AI assistant answers "how do I make …" from this file.
 */
window.App = window.App || {};

App.recipes = {
  categories: [
    { id: 'sauce', name: { en: 'Sauces', nb: 'Sauser' }, icon: 'chef' },
    { id: 'topping', name: { en: 'Toppings & sides', nb: 'Topping og tilbehør' }, icon: 'star' },
  ],
  // Equipment shown as chips on each recipe
  tools: {
    bowlL: { en: 'Large mixing bowl', nb: 'Stor bolle' },
    bowlS: { en: 'Small mixing bowl', nb: 'Liten bolle' },
    whisk: { en: 'Hand whisk', nb: 'Visp' },
    blender: { en: 'Electric blender', nb: 'Stavmikser' },
    grill: { en: 'Grill', nb: 'Grill' },
    deep: { en: 'Deep container', nb: 'Dyp beholder' },
    knife: { en: 'Knife & board', nb: 'Kniv og skjærefjøl' },
    scale: { en: 'Scale', nb: 'Vekt' },
  },
  list: [
    {
      id: 'classic-sauce', aliases: ['classic sauce','classic saus','salsa classic','vegan sauce','vegansk saus','salsa vegana'], category: 'sauce',
      name: { en: 'Flamme Classic Sauce', nb: 'Flamme Classic saus' },
      summary: { en: 'Our house burger sauce: creamy, tangy and lightly smoky.', nb: 'Husets burgersaus: kremet, syrlig og lett røykete.' },
      art: { kind: 'bowl', base: '#F2A46B', light: '#F8C79E', flecks: ['#3E8E41', '#C0392B'], label: 'CLASSIC' },
      tools: ['scale', 'bowlL', 'bowlS', 'blender', 'whisk'],
      ingredients: [
        { name: { en: 'Base dressing', nb: 'Basedressing' }, qty: 2500, unit: 'g', color: '#F3E9D2', main: true },
        { name: { en: 'Mayo', nb: 'Majones' }, qty: 2500, unit: 'g', color: '#FFF4CC', main: true },
        { name: { en: 'Ketchup', nb: 'Ketchup' }, qty: 500, unit: 'g', color: '#C0392B' },
        { name: { en: 'Smoked sriracha', nb: 'Røkt sriracha' }, qty: 250, unit: 'g', color: '#D9480F' },
        { name: { en: 'Dijon mustard', nb: 'Dijonsennep' }, qty: 250, unit: 'g', color: '#E3B505' },
        { name: { en: 'Pickles', nb: 'Sylteagurk' }, qty: 150, unit: 'g', color: '#6A8D3A' },
        { name: { en: 'Garlic', nb: 'Hvitløk' }, qty: 50, unit: 'g', color: '#EDE6D6' },
        { name: { en: 'Parsley', nb: 'Persille' }, qty: 30, unit: 'g', color: '#2F9E44' },
        { name: { en: 'Lemon juice', nb: 'Sitronsaft' }, qty: 100, unit: 'g', color: '#F7E26B' },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 20, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Add the base dressing and mayo to a large mixing bowl.', nb: 'Ha basedressing og majones i en stor bolle.', tool: 'bowlL' },
        { en: 'Add the rest of the ingredients to a smaller mixing bowl.', nb: 'Ha resten av ingrediensene i en mindre bolle.', tool: 'bowlS' },
        { en: 'Using the electric blender, mix everything that is in the small mixing bowl to a smooth paste.', nb: 'Bruk stavmikseren og kjør alt i den lille bollen til en jevn masse.', tool: 'blender' },
        { en: 'Pour the blended mix into the large mixing bowl and hand whisk together with the base dressing and mayo until the right colour is made.', nb: 'Hell den blendede massen i den store bollen og visp sammen med basedressing og majones til fargen er riktig.', tool: 'whisk' },
      ],
      variant: {
        title: { en: 'Vegan Classic Sauce', nb: 'Vegansk Classic saus' },
        text: { en: 'Follow the same steps as above, only replace base dressing and mayo with the vegan alternatives.', nb: 'Følg de samme stegene, men bytt basedressing og majones med de veganske alternativene.' },
      },
    },
    {
      id: 'spicy-sauce', aliases: ['spicy sauce','spicy saus','salsa picante','salsa spicy'], category: 'sauce',
      name: { en: 'Flamme Spicy Sauce', nb: 'Flamme Spicy saus' },
      summary: { en: 'Smoky chipotle and sriracha heat with jalapeño.', nb: 'Røykete varme fra chipotle og sriracha med jalapeño.' },
      art: { kind: 'bowl', base: '#E2582B', light: '#F08A5D', flecks: ['#7A1E0E', '#4C7A2A'], label: 'SPICY' },
      tools: ['scale', 'bowlL', 'bowlS', 'blender', 'whisk'],
      ingredients: [
        { name: { en: 'Base dressing', nb: 'Basedressing' }, qty: 2500, unit: 'g', color: '#F3E9D2', main: true },
        { name: { en: 'Mayo', nb: 'Majones' }, qty: 2500, unit: 'g', color: '#FFF4CC', main: true },
        { name: { en: 'Smoked sriracha', nb: 'Røkt sriracha' }, qty: 600, unit: 'g', color: '#D9480F' },
        { name: { en: 'Chipotle', nb: 'Chipotle' }, qty: 250, unit: 'g', color: '#7A2E12' },
        { name: { en: 'Garlic', nb: 'Hvitløk' }, qty: 100, unit: 'g', color: '#EDE6D6' },
        { name: { en: 'Jalapeños', nb: 'Jalapeños' }, qty: 150, unit: 'g', color: '#4C7A2A' },
        { name: { en: 'Lemon juice', nb: 'Sitronsaft' }, qty: 80, unit: 'g', color: '#F7E26B' },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 20, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Add the base dressing and mayo to a large mixing bowl.', nb: 'Ha basedressing og majones i en stor bolle.', tool: 'bowlL' },
        { en: 'Add the rest of the ingredients to a smaller mixing bowl.', nb: 'Ha resten av ingrediensene i en mindre bolle.', tool: 'bowlS' },
        { en: 'Using the electric blender, mix everything that is in the small mixing bowl to a smooth paste.', nb: 'Bruk stavmikseren og kjør alt i den lille bollen til en jevn masse.', tool: 'blender' },
        { en: 'Pour the blended mix into the large mixing bowl and hand whisk together with the base dressing and mayo until the right colour is made.', nb: 'Hell den blendede massen i den store bollen og visp sammen med basedressing og majones til fargen er riktig.', tool: 'whisk' },
      ],
    },
    {
      id: 'truffle-sauce', aliases: ['truffle sauce','trøffelsaus','trøffel saus','salsa de trufa','salsa trufa'], category: 'sauce',
      name: { en: 'Flamme Truffle Sauce', nb: 'Flamme Trøffel saus' },
      summary: { en: 'Creamy truffle mayo — whisked by hand, no blender.', nb: 'Kremet trøffelmajones — vispes for hånd, uten mikser.' },
      art: { kind: 'bowl', base: '#E9D9B8', light: '#F5ECDA', flecks: ['#2B2420', '#5A4A3A'], label: 'TRUFFLE', ink: '#5A4A3A' },
      tools: ['scale', 'bowlL', 'whisk'],
      ingredients: [
        { name: { en: 'Base dressing', nb: 'Basedressing' }, qty: 2500, unit: 'g', color: '#F3E9D2', main: true },
        { name: { en: 'Mayo', nb: 'Majones' }, qty: 2500, unit: 'g', color: '#FFF4CC', main: true },
        { name: { en: 'Truffle oil', nb: 'Trøffelolje' }, qty: 70, unit: 'g', color: '#C9A227' },
        { name: { en: 'Truffle paste', nb: 'Trøffelpasta' }, qty: 250, unit: 'g', color: '#3B2F2A' },
        { name: { en: 'Lemon juice', nb: 'Sitronsaft' }, qty: 30, unit: 'g', color: '#F7E26B' },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 30, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Add the base dressing and mayo to a large mixing bowl.', nb: 'Ha basedressing og majones i en stor bolle.', tool: 'bowlL' },
        { en: 'Add the truffle oil and paste — be careful of the stone in the oil bottle.', nb: 'Tilsett trøffelolje og trøffelpasta — vær forsiktig med steinen i oljeflasken.', warn: true },
        { en: 'Add the lemon juice and the salt.', nb: 'Tilsett sitronsaft og salt.' },
        { en: 'Hand whisk.', nb: 'Visp for hånd.', tool: 'whisk' },
      ],
      warnings: [{ en: 'There is a stone inside the truffle oil bottle — pour slowly so it does not fall into the sauce.', nb: 'Det ligger en stein i trøffeloljeflasken — hell sakte så den ikke havner i sausen.' }],
    },
    {
      id: 'spicy-cheddar', aliases: ['cheddar','salsa de queso','ostesaus'], category: 'sauce',
      name: { en: 'Spicy Cheddar Sauce', nb: 'Spicy cheddar-saus' },
      summary: { en: 'Jalapeño cheese sauce with smoked sriracha. One bowl, one whisk.', nb: 'Jalapeño-ostesaus med røkt sriracha. Én bolle, én visp.' },
      art: { kind: 'bowl', base: '#F5A623', light: '#FFC861', flecks: ['#4C7A2A', '#C2410C'], label: 'CHEDDAR' },
      tools: ['scale', 'bowlL', 'whisk'],
      ingredients: [
        { name: { en: 'Base dressing', nb: 'Basedressing' }, qty: 1500, unit: 'g', color: '#F3E9D2', main: true },
        { name: { en: 'Jalapeño cheese sauce', nb: 'Jalapeño-ostesaus' }, qty: 3000, unit: 'g', color: '#F5A623', main: true },
        { name: { en: 'Smoked sriracha', nb: 'Røkt sriracha' }, qty: 450, unit: 'g', color: '#D9480F' },
        { name: { en: 'Lemon juice', nb: 'Sitronsaft' }, qty: 60, unit: 'g', color: '#F7E26B' },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 10, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Add everything to a large mixing bowl and hand whisk.', nb: 'Ha alt i en stor bolle og visp for hånd.', tool: 'whisk' },
      ],
    },
    {
      id: 'truffle-mushrooms', aliases: ['mushroom','champiñon','champinon','setas','sopp'], category: 'topping',
      name: { en: 'Truffle Mushrooms', nb: 'Trøffelsopp' },
      summary: { en: 'Grilled mushrooms tossed in truffle oil and paste.', nb: 'Grillet sopp vendt i trøffelolje og trøffelpasta.' },
      art: { kind: 'mushrooms', base: '#8B5E3C', light: '#C49A6C', flecks: ['#2B2420'] },
      tools: ['grill', 'scale', 'bowlL'],
      ingredients: [
        { name: { en: 'Cooked mushrooms', nb: 'Stekt sopp' }, qty: 5000, unit: 'g', color: '#8B5E3C', main: true },
        { name: { en: 'Truffle oil', nb: 'Trøffelolje' }, qty: 30, unit: 'g', color: '#C9A227' },
        { name: { en: 'Truffle paste', nb: 'Trøffelpasta' }, qty: 60, unit: 'g', color: '#3B2F2A' },
        { name: { en: 'Pepper', nb: 'Pepper' }, qty: 5, unit: 'g', color: '#343A40' },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 25, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Cook the mushrooms on the grill, then place them in a large mixing bowl.', nb: 'Stek soppen på grillen, og legg den i en stor bolle.', tool: 'grill' },
        { en: 'Add the truffle oil and paste — be careful of the stone in the oil bottle.', nb: 'Tilsett trøffelolje og trøffelpasta — vær forsiktig med steinen i oljeflasken.', warn: true },
        { en: 'Add the salt and pepper, then mix together.', nb: 'Tilsett salt og pepper, og bland godt.' },
      ],
      warnings: [{ en: 'There is a stone inside the truffle oil bottle — pour slowly so it does not fall into the mushrooms.', nb: 'Det ligger en stein i trøffeloljeflasken — hell sakte så den ikke havner i soppen.' }],
    },
    {
      id: 'pickled-onion', aliases: ['pickled onion','syltet løk','syltet rødløk','cebolla encurtida','cebolla roja','pickled red onion'], category: 'topping',
      name: { en: 'Pickled Onion', nb: 'Syltet rødløk' },
      summary: { en: 'Quick-pickled red onion — bright pink and crunchy. The pickling juice can be reused.', nb: 'Hurtigsyltet rødløk — knallrosa og sprø. Lakken kan brukes igjen.' },
      art: { kind: 'jar', base: '#C2185B', light: '#F48FB1', flecks: ['#FCE4EC'] },
      tools: ['deep', 'grill', 'knife', 'scale'],
      ingredients: [
        { name: { en: 'Red onion', nb: 'Rødløk' }, qty: 2000, unit: 'g', color: '#8E244D', main: true },
        { name: { en: 'Apple cider vinegar (eple cider eddik)', nb: 'Eplesidereddik' }, qty: 1000, unit: 'g', color: '#E0B354' },
        { name: { en: 'Sugar', nb: 'Sukker' }, qty: 1000, unit: 'g', color: '#F8F9FA' },
        { name: { en: 'Water', nb: 'Vann' }, qty: 1000, unit: 'g', color: '#A5D8FF' },
      ],
      steps: [
        { en: 'Place the eddik (vinegar), sugar and water in a deep container and put it to boil on the grill.', nb: 'Ha eddik, sukker og vann i en dyp beholder og sett det til å koke på grillen.', tool: 'deep' },
        { en: 'Cut the onions, then add them to the container once it has started to boil.', nb: 'Skjær løken, og ha den i beholderen når lakken har begynt å koke.', tool: 'knife' },
        { en: 'Mix the onions frequently until all the onions are turning pink.', nb: 'Rør ofte i løken til all løken begynner å bli rosa.' },
        { en: 'When the mix has begun boiling again, take it off the grill and leave it to cool for a short period. Then put it in the fridge.', nb: 'Når blandingen koker igjen, ta den av grillen og la den avkjøles en kort stund. Sett den så i kjøleskapet.', warn: true },
      ],
      note: { en: 'The mix can be reused 2–3 times. When the onions have been used, keep the juice and use it again for pickling more onions. Just boil the juice again and add more onions.', nb: 'Lakken kan brukes 2–3 ganger. Når løken er brukt opp, ta vare på lakken og bruk den til ny løk. Bare kok opp lakken igjen og ha i mer løk.' },
    },
    {
      id: 'coleslaw', aliases: ['coleslaw','cole slaw','ensalada de col','kålsalat'], category: 'topping',
      name: { en: 'Coleslaw', nb: 'Coleslaw' },
      summary: { en: 'Råkost mix dressed with Classic and Spicy sauce. Mixed by hand.', nb: 'Råkostblanding med Classic og Spicy saus. Blandes for hånd.' },
      art: { kind: 'slaw', base: '#E6EFCB', light: '#FFFFFF', flecks: ['#F08C00', '#9C36B5', '#82C91E'] },
      tools: ['scale', 'bowlL'],
      ingredients: [
        { name: { en: 'Flamme Classic Sauce', nb: 'Flamme Classic saus' }, qty: 60, unit: 'g', color: '#F2A46B', ref: 'classic-sauce' },
        { name: { en: 'Flamme Spicy Sauce', nb: 'Flamme Spicy saus' }, qty: 60, unit: 'g', color: '#E2582B', ref: 'spicy-sauce' },
        { name: { en: 'Råkost salat mix', nb: 'Råkost salatblanding' }, qty: 1000, unit: 'g', color: '#C5E1A5', main: true },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 10, unit: 'g', color: '#E9ECEF' },
      ],
      steps: [
        { en: 'Place everything in a large mixing bowl and mix by hand.', nb: 'Ha alt i en stor bolle og bland for hånd.', tool: 'bowlL' },
      ],
    },
    {
      id: 'spicy-pickle-mix', aliases: ['pickle mix','sylteblanding','mezcla de pepinillos','pepinillos picantes'], category: 'topping',
      name: { en: 'Spicy Pickle Mix', nb: 'Spicy sylteblanding' },
      summary: { en: 'Pickles, jalapeños and pickled onion, chopped by hand.', nb: 'Sylteagurk, jalapeños og syltet løk, hakket for hånd.' },
      art: { kind: 'chunks', base: '#7FA650', light: '#B5D17A', flecks: ['#2F6B1F', '#C2185B', '#9BBF3A'] },
      tools: ['knife', 'scale', 'bowlL'],
      ingredients: [
        { name: { en: 'Pickles', nb: 'Sylteagurk' }, qty: 1000, unit: 'g', color: '#6A8D3A', main: true },
        { name: { en: 'Jalapeños', nb: 'Jalapeños' }, qty: 500, unit: 'g', color: '#4C7A2A' },
        { name: { en: 'Pickled onion', nb: 'Syltet rødløk' }, qty: 350, unit: 'g', color: '#C2185B', ref: 'pickled-onion' },
      ],
      steps: [
        { en: 'Chop everything into small pieces and mix together. Do not use the robot to blend.', nb: 'Hakk alt i små biter og bland sammen. Ikke bruk kjøkkenmaskinen.', tool: 'knife', warn: true },
      ],
      warnings: [{ en: 'Chop by hand — do not use the robot / food processor.', nb: 'Hakk for hånd — ikke bruk kjøkkenmaskinen.' }],
    },
    {
      id: 'avocado-mash', aliases: ['avocado','avokado','aguacate','guacamole'], category: 'topping',
      name: { en: 'Avocado Mash', nb: 'Avokadomos' },
      summary: { en: 'Fresh avocado mashed by hand with lemon and salt.', nb: 'Fersk avokado moset for hånd med sitron og salt.' },
      art: { kind: 'avocado', base: '#8DB547', light: '#C5E17A', flecks: ['#5C7A1F'] },
      tools: ['knife', 'bowlS'],
      ingredients: [
        { name: { en: 'Avocados', nb: 'Avokado' }, qty: 4, unit: 'pcs', color: '#5C7A1F', main: true },
        { name: { en: 'Lemon juice', nb: 'Sitronsaft' }, qty: 20, unit: 'g', color: '#F7E26B', toTaste: true },
        { name: { en: 'Salt', nb: 'Salt' }, qty: 10, unit: 'g', color: '#E9ECEF', toTaste: true },
      ],
      steps: [
        { en: 'Open and de-stone the avocados.', nb: 'Del avokadoene og fjern steinen.', tool: 'knife' },
        { en: 'Add all ingredients to a small mixing bowl.', nb: 'Ha alle ingrediensene i en liten bolle.', tool: 'bowlS' },
        { en: 'Press the avocados into a mash using your hands.', nb: 'Mos avokadoene med hendene.' },
      ],
    },
  ],
};
