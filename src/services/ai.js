/*
 * Internal staff assistant.
 *
 * DEMO provider: no language model. It searches the documents an admin has
 * enabled for the AI, reads checklist state and verified product data, and
 * answers with the source it used. Safety rules are enforced in code:
 *   - allergens / food safety: only verified data, never guesses, never says "safe".
 *   - no match / outdated / unapproved → says so and points to the manager.
 *
 * REMOTE provider (prepared): POSTs the question + retrieved sources to a
 * backend endpoint that calls the LLM server-side (API keys never in the app).
 * The backend should use SYSTEM_PROMPT below and return {text, sources[], escalate}.
 */
window.App = window.App || {};

App.ai = (function () {
  const U = App.util;

  const SYSTEM_PROMPT = [
    'You are the internal assistant for Flamme Burger staff.',
    'Answer ONLY from the provided company documents. Always cite the document(s) used.',
    'If the documents do not contain the answer, are marked draft/outdated, or are ambiguous, say so and tell the employee to contact the shift manager.',
    'Allergens and food safety: never guess, infer or generalise. Only repeat verified product data verbatim. Never state that a product is safe for someone.',
    'Be brief and practical. Detect the language of the question (e.g. Spanish, English, Norwegian, Nepali) and reply in that language, translating document content faithfully.',
  ].join('\n');

  const tr = (en, nb) => (App.i18n.lang === 'nb' ? nb : en);
  const guideOf = (sid) => App.api.guides.get(sid.split(':')[1]);
  const manager = () => U.L(App.config.ai.escalationContact);

  const STOP = new Set(('the and for are you what how where when who why can does this that with from have has into your our there here ' +
    'hva hvor hvordan hvem når kan jeg det den som med fra har til for ikke eller og').split(' '));
  function tokens(s) { return U.normalize(s).split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)); }

  function isSafetyQuestion(q) {
    const n = ' ' + U.normalize(q).replace(/\s+/g, ' ') + ' ';
    // whole-word prefix match so e.g. "legg" doesn't trigger "egg"
    return App.config.ai.safetyKeywords.some((k) => n.includes(' ' + U.normalize(k)));
  }

  function findProduct(q) {
    const n = U.normalize(q);
    let best = null, bestLen = 0;
    App.api.catalog.products().forEach((p) => {
      [p.name.en, p.name.nb].forEach((nm) => {
        const k = U.normalize(nm).replace(/\(\d+\)/g, '').trim();
        if (k && n.includes(k) && k.length > bestLen) { best = p; bestLen = k.length; }
      });
    });
    return best;
  }

  function allergenAnswer(q) {
    const p = findProduct(q);
    if (!p) {
      return { kind: 'safety', escalate: true,
        text: tr(`I can't answer allergen or food-safety questions without a specific product with verified information. Please don't guess — ask ${manager()}.`,
                 `Jeg kan ikke svare på spørsmål om allergener eller mattrygghet uten et konkret produkt med verifisert informasjon. Ikke gjett — spør ${manager()}.`),
        sources: [{ label: tr('Guide: Allergen questions from customers', 'Guide: Allergenspørsmål fra kunder'), route: '#/staff/guide/g-allergens' }] };
    }
    const a = p.allergens || {};
    if (a.status !== 'verified') {
      return { kind: 'safety', escalate: true,
        text: tr(`There is no verified allergen information for "${U.L(p.name)}" yet. I won't guess or say it is safe. Ask ${manager()} before answering the customer.`,
                 `Det finnes ingen verifisert allergeninformasjon for «${U.L(p.name)}» ennå. Jeg gjetter ikke og sier ikke at den er trygg. Spør ${manager()} før du svarer kunden.`),
        sources: [{ label: tr('Product sheet: ', 'Produktark: ') + U.L(p.name) + tr(' (allergens: not verified)', ' (allergener: ikke verifisert)'), route: '#/staff/menu/' + p.id }] };
    }
    const name = (id) => U.L(App.config.allergenList.find((x) => x.id === id) || { en: id });
    const contains = a.contains.length ? a.contains.map(name).join(', ') : tr('none declared', 'ingen oppgitt');
    const may = a.mayContain.length ? a.mayContain.map(name).join(', ') : null;
    return { kind: 'safety', escalate: false,
      text: tr(`Verified allergen information for "${U.L(p.name)}":\n• Contains: ${contains}` + (may ? `\n• May contain: ${may}` : '') +
               `\n\nThis is the declared product information only — it does not mean the product is safe for a specific customer. For allergy orders, follow the approved routine and involve ${manager()}.`,
               `Verifisert allergeninformasjon for «${U.L(p.name)}»:\n• Inneholder: ${contains}` + (may ? `\n• Kan inneholde: ${may}` : '') +
               `\n\nDette er kun deklarert produktinformasjon — det betyr ikke at produktet er trygt for en bestemt kunde. Ved allergibestillinger: følg godkjent rutine og involver ${manager()}.`),
      sources: [{ label: tr('Product sheet: ', 'Produktark: ') + U.L(p.name) + ` (${tr('verified by', 'verifisert av')} ${a.verifiedBy}, ${U.fmtDate(a.verifiedAt)})`, route: '#/staff/menu/' + p.id }] };
  }

  function checklistAnswer(q, ctx) {
    const n = U.normalize(q);
    const closing = /clos|stenge|stenging|lukk|close/.test(n);
    const tpl = App.api.checklists.templates().find((c) => c.type === (closing ? 'closing' : 'opening'));
    const st = App.api.checklists.state(tpl.id, ctx.locationId);
    const pending = tpl.items.filter((i) => !st[i.id]);
    const text = pending.length
      ? tr(`${pending.length} of ${tpl.items.length} tasks are still pending on today's ${U.L(tpl.title).toLowerCase()}:\n`, `${pending.length} av ${tpl.items.length} oppgaver gjenstår på dagens ${U.L(tpl.title).toLowerCase()}:\n`) + pending.map((i) => '• ' + U.L(i.text)).join('\n')
      : tr(`Everything on today's ${U.L(tpl.title).toLowerCase()} is done. ✔`, `Alt på dagens ${U.L(tpl.title).toLowerCase()} er gjort. ✔`);
    return { kind: 'checklist', text, sources: [{ label: tr('Checklist: ', 'Sjekkliste: ') + U.L(tpl.title) + ' — ' + tr('today', 'i dag'), route: '#/staff/checklists/' + tpl.id }] };
  }

  function prepAnswer(ctx) {
    const r = App.api.prep.report(ctx.locationId);
    const line = (x) => `• ${U.L(x.ing.name)}: ${x.withBuffer} ${U.L(x.ing.unit)}` + (x.packs ? ` (≈ ${x.packs} ${U.L(x.ing.packName)})` : '');
    const text = tr('From today\'s prep report (demo forecast):\n\nTake out to thaw today:\n', 'Fra dagens forberedelsesrapport (demo-prognose):\n\nTa ut til tining i dag:\n') +
      r.takeOut.map((x) => line(x) + tr(` — for ${U.fmtDate(x.forDay)}`, ` — til ${U.fmtDate(x.forDay)}`)).join('\n') +
      tr('\n\nPrepare for today (minimum + buffer):\n', '\n\nForbered til i dag (minimum + buffer):\n') + r.prepare.map(line).join('\n');
    return { kind: 'prep', text, notes: [tr('Quantities are based on DEMO sales forecasts, not real sales history.', 'Mengdene bygger på DEMO-salgsprognoser, ikke reell salgshistorikk.')],
      sources: [{ label: tr('Morning prep report — today', 'Morgenrapport for forberedelse — i dag'), route: '#/staff/prep' }] };
  }

  function retrieve(q) {
    const qt = tokens(q);
    const docs = App.api.guides.aiSources();
    return docs.map((g) => {
      const kw = g.keywords.map(U.normalize);
      const title = tokens(U.L(g.title) + ' ' + g.title.en);
      const body = tokens([g.summary.en, g.summary.nb].concat(g.steps.map((s) => s.text.en + ' ' + s.text.nb)).join(' '));
      let score = 0;
      qt.forEach((w) => {
        if (kw.some((k) => k === w || (w.length > 4 && k.startsWith(w.slice(0, 5))))) score += 3;
        if (title.includes(w)) score += 2;
        if (body.includes(w)) score += 0.5;
      });
      return { g, score };
    }).filter((r) => r.score >= App.config.ai.minScore).sort((a, b) => b.score - a.score);
  }

  // Whole-word match (prefix for longer keywords, e.g. "brann" → "brannen").
  function emergencyMatch(q) {
    const n = ' ' + U.normalize(q).replace(/\s+/g, ' ') + ' ';
    let best = null, bestN = 0;
    App.api.guides.aiSources().filter((g) => g.emergency).forEach((g) => {
      const hits = g.keywords.map(U.normalize).filter((k) => n.includes(' ' + k + (k.length >= 5 ? '' : ' '))).length;
      if (hits > bestN) { best = g; bestN = hits; }
    });
    return best;
  }

  function emergencyAnswer(g) {
    const e = g.emergency;
    const head = e.level === 'immediate'
      ? tr(`⚠ If anyone is in danger, act now${e.call.length ? ' and call ' + e.call.join(' / ') : ''}. Do not wait for approval.`, `⚠ Er noen i fare, handle nå${e.call.length ? ' og ring ' + e.call.join(' / ') : ''}. Ikke vent på godkjenning.`)
      : tr('This situation must be reviewed by a supervisor before you take action. Send a supervisor request from the guide.', 'Denne situasjonen må vurderes av en leder før du handler. Send en forespørsel til leder fra guiden.');
    return { kind: 'emergency', escalate: true,
      text: head + '\n\n' + g.steps.map((s, i) => `${i + 1}. ${U.L(s.text)}`).join('\n'),
      notes: g.approval === 'demo' ? [tr('Source is DEMO content pending approval by Flamme Burger.', 'Kilden er DEMO-innhold som venter på godkjenning fra Flamme Burger.')] : [],
      sources: [{ label: tr('Emergency guide: ', 'Nødguide: ') + U.L(g.title), route: '#/staff/guide/' + g.id }] };
  }

  function guideAnswer(q) {
    const hits = retrieve(q);
    if (!hits.length) {
      return { kind: 'none', escalate: true,
        text: tr(`I couldn't find this in the approved documentation. I'd rather not guess — please ask ${manager()}, and consider asking them to add a guide for it.`,
                 `Jeg fant ikke dette i den godkjente dokumentasjonen. Jeg vil ikke gjette — spør ${manager()}, og foreslå gjerne at det lages en guide for dette.`),
        sources: [] };
    }
    const g = hits[0].g;
    const outdated = g.reviewDue && new Date(g.reviewDue) < new Date();
    let text = U.L(g.summary) + '\n\n' + g.steps.map((s, i) => `${i + 1}. ${U.L(s.text)}`).join('\n');
    if (g.warnings.length) text += '\n\n⚠ ' + g.warnings.map(U.L).join('\n⚠ ');
    const notes = [];
    if (g.approval === 'demo') notes.push(tr('Source is DEMO content, not an approved Flamme Burger procedure.', 'Kilden er DEMO-innhold, ikke en godkjent Flamme Burger-prosedyre.'));
    if (outdated) notes.push(tr(`This guide is past its review date — confirm with ${manager()} before relying on it.`, `Guiden har passert revisjonsdato — bekreft med ${manager()} før du stoler på den.`));
    const sources = hits.slice(0, 2).map((h) => ({ label: tr('Guide: ', 'Guide: ') + U.L(h.g.title) + ` (${tr('updated', 'oppdatert')} ${U.fmtDate(h.g.updatedAt)})`, route: '#/staff/guide/' + h.g.id }));
    return { kind: 'guide', text, notes, escalate: outdated, sources };
  }

  // Schedule / people questions, answered from the rota (Schedule area)
  function scheduleAnswer(q, ctx) {
    const n = U.normalize(q), W = App.wf, K = App.kit;
    if (!App.api.shifts) return null;
    const line = (s) => `• ${K.relDay(s.date)} ${s.start}–${s.end}` + (App.api.people.usesPositions() ? ` · ${U.L(App.api.people.position(s.positionId).name)}` : '');
    if (/(who|hvem).*(work|jobb|on shift|pa vakt|på vakt)/.test(n)) {
      const day = /(tomorrow|i morgen|imorgen)/.test(n) ? W.addDays(W.today(), 1) : W.today();
      const list = App.api.people.workingOn(ctx.locationId, day);
      return { kind: 'schedule', text: tr(`Scheduled ${day === W.today() ? 'today' : 'tomorrow'}:\n`, `Satt opp ${day === W.today() ? 'i dag' : 'i morgen'}:\n`) + (list.map((s) => `• ${App.api.people.get(s.userId).name} — ${s.start}–${s.end} (${U.L(App.api.people.position(s.positionId).name)})`).join('\n') || tr('Nobody yet.', 'Ingen ennå.')),
        sources: [{ label: tr('Rota (published)', 'Vaktplan (publisert)'), route: '#/staff/shifts/rota' }] };
    }
    if (/(next shift|neste vakt|my shift|mine vakter|min vakt|when do i work|nar jobber jeg|når jobber jeg|my schedule)/.test(n)) {
      const list = App.api.shifts.mine(W.today()).filter((s) => W.shiftEnd(s) > new Date()).slice(0, 5);
      return { kind: 'schedule', text: list.length ? tr('Your next shifts:\n', 'Dine neste vakter:\n') + list.map(line).join('\n') : tr('You have no upcoming published shifts.', 'Du har ingen kommende publiserte vakter.'),
        sources: [{ label: tr('My shifts', 'Mine vakter'), route: '#/staff/shifts' }] };
    }
    if (/(holiday|vacation|ferie|feriedager|leave balance)/.test(n)) {
      const b = App.api.leave.balance();
      return { kind: 'schedule', text: tr(`Holiday this year: ${b.total} days · used ${b.used} · pending ${b.pending} · left ${b.left}.\nApply in Schedule → Leave.`, `Ferie i år: ${b.total} dager · brukt ${b.used} · venter ${b.pending} · igjen ${b.left}.\nSøk i Vakter → Fravær.`),
        sources: [{ label: tr('Leave', 'Fravær'), route: '#/staff/shifts/leave' }, { label: tr('Employee handbook', 'Personalhåndbok'), route: '#/staff/community/doc/d-handbook' }] };
    }
    if (/(swap|bytte|bytt|cover|ta vakt|give away|gi bort)/.test(n)) {
      return { kind: 'schedule', text: tr('To swap or give away a shift: Schedule → My shifts → tap the shift → "Swap or give away". Your colleague accepts, then the manager approves. Until it is approved, the shift is still yours.', 'Slik bytter eller gir du bort en vakt: Vakter → Mine vakter → trykk på vakten → «Bytt eller gi bort». Kollegaen godtar, og leder godkjenner. Til det er godkjent, er vakten fortsatt din.'),
        sources: [{ label: tr('Swaps', 'Bytte'), route: '#/staff/shifts/swaps' }] };
    }
    if (/(sick|syk|egenmelding)/.test(n)) {
      return { kind: 'schedule', escalate: true, text: tr('Call your shift lead before the shift starts, then register it in Schedule → Leave → "Report sick". Rules for self-certification are in the employee handbook.', 'Ring skiftleder før vakten starter, og registrer det i Vakter → Fravær → «Meld syk». Regler for egenmelding står i personalhåndboken.'),
        sources: [{ label: tr('Employee handbook', 'Personalhåndbok'), route: '#/staff/community/doc/d-handbook' }] };
    }
    return null;
  }

  const providers = {
    demo(q, ctx) {
      // Emergencies first: never route "allergic reaction" etc. to the allergen lookup.
      const em = emergencyMatch(q);
      if (em) return Promise.resolve(emergencyAnswer(em));
      if (isSafetyQuestion(q)) return Promise.resolve(allergenAnswer(q));
      const sch = scheduleAnswer(q, ctx);
      if (sch) return Promise.resolve(sch);
      const n = U.normalize(q);
      if (/(thaw|defrost|take out|tine|tining|ta ut|prep|forbered|descongel|how much|hvor mye|how many|hvor mange)/.test(n)) {
        return Promise.resolve(prepAnswer(ctx));
      }
      if (/(what.*(left|missing|pending|remain)|hva (mangler|gjenstar|gjenstår)|mangler.*(for a|for å)|pending)/.test(n) && /(clos|open|sten|apn|åpn|checklist|sjekkliste)/.test(n)) {
        return Promise.resolve(checklistAnswer(q, ctx));
      }
      return Promise.resolve(guideAnswer(q));
    },
    // Live: safety-critical answers stay fixed and verified; everything else goes to Claude
    // on the Crew server (the API key never reaches the phone). Falls back to the demo search.
    async live(q, ctx) {
      const em = emergencyMatch(q);
      if (em) return emergencyAnswer(em);
      if (isSafetyQuestion(q) && findProduct(q)) return allergenAnswer(q);
      try {
        const r = await App.sync.askAI(q, ctx);
        const notes = r.sources && r.sources.some((s) => /^guide:/.test(s.id) && (guideOf(s.id) || {}).approval === 'demo')
          ? [tr('Based on DEMO content, not an approved procedure.', 'Basert på DEMO-innhold, ikke en godkjent prosedyre.')] : [];
        return { kind: r.kind || 'ai', text: r.text, escalate: !!r.escalate, notes, sources: (r.sources || []).map((s) => ({ label: s.label, route: s.route })), ai: true };
      } catch (e) {
        return providers.demo(q, ctx);
      }
    },
    async remote(q, ctx) {
      // Prepared integration — requires a backend. The backend authenticates the
      // staff user, retrieves approved sources server-side and calls the LLM.
      const res = await fetch(App.config.ai.remoteEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang: App.i18n.lang, locationId: ctx.locationId }),
      });
      if (!res.ok) throw new Error('assistant_unavailable');
      return res.json();
    },
  };

  return {
    SYSTEM_PROMPT,
    ask(question, ctx) {
      App.api.auth.hasRole('staff') || (() => { throw new App.api.ApiError('forbidden'); })();
      const p = App.sync && App.sync.live && App.sync.ai ? 'live' : App.config.ai.provider;
      return providers[p](question, ctx || {});
    },
  };
})();
