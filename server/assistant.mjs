/*
 * AI assistant (server side). The phone never sees the API key.
 *
 * The app answers emergencies and allergen questions itself from verified data
 * (fixed, safety-critical rules in src/services/ai.js). Everything else comes here:
 * we give Claude the company's approved guides, the handbook, verified product
 * data and the employee's own schedule, and ask for a short answer with sources.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = process.env.CREW_AI_MODEL || 'claude-opus-5-5';
let client = null;
function getClient() { if (!client) client = new Anthropic(); return client; }

export function aiConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

const L = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : o[lang] || o.en || o.nb || '');

// Company knowledge — the same for every employee, so it is cached by the API.
function companyContext(App, lang) {
  const api = App.api;
  const guides = api.guides.aiSources().map((g) => [
    `<document id="guide:${g.id}" status="${g.approval}" updated="${(g.updatedAt || '').slice(0, 10)}"${g.reviewDue && new Date(g.reviewDue) < new Date() ? ' review_overdue="true"' : ''}>`,
    `Title: ${L(g.title, lang)}`, `Summary: ${L(g.summary, lang)}`,
    ...g.steps.map((s, i) => `${i + 1}. ${L(s.text, lang)}`),
    ...g.warnings.map((w) => `WARNING: ${L(w, lang)}`), '</document>'].join('\n'));
  const docs = api.docs.list().map((d) => [`<document id="doc:${d.id}" version="${d.version}">`, `Title: ${L(d.title, lang)}`,
    ...d.sections.map((s) => `${L(s.h, lang)}: ${L(s.body, lang)}`), '</document>'].join('\n'));
  const AL = App.config.allergenList;
  const products = api.catalog.products().map((p) => {
    const a = p.allergens || {};
    const names = (ids) => ids.map((id) => L(AL.find((x) => x.id === id), lang)).join(', ') || '-';
    return a.status === 'verified'
      ? `- product:${p.id} "${L(p.name, lang)}" ${p.priceNok} NOK. Allergens VERIFIED by ${a.verifiedBy}: contains ${names(a.contains)}; may contain ${names(a.mayContain)}.`
      : `- product:${p.id} "${L(p.name, lang)}" ${p.priceNok} NOK. ${L(p.description, lang)} Allergens: NOT VERIFIED.`;
  });
  return `Company: ${App.tenant.name}. Staff app: ${App.tenant.appName}.\n\n<guides>\n${guides.join('\n\n')}\n</guides>\n\n<handbook>\n${docs.join('\n\n')}\n</handbook>\n\n<menu>\n${products.join('\n')}\n</menu>`;
}

// The employee's own situation right now — changes per request, sent after the cached part.
function personalContext(App, lang, locationId) {
  const api = App.api, W = App.wf, me = api.auth.me();
  const loc = locationId || me.locationId;
  const pos = (id) => L(api.people.position(id).name, lang);
  const mine = api.shifts.mine(W.today()).filter((s) => W.shiftEnd(s) > new Date()).slice(0, 6).map((s) => `- ${s.date} ${s.start}-${s.end} ${pos(s.positionId)}`);
  const today = api.people.workingOn(loc, W.today()).map((s) => `- ${(api.people.get(s.userId) || {}).name}: ${s.start}-${s.end} ${pos(s.positionId)}`);
  const bal = api.leave.balance();
  const cls = api.checklists.templates().map((c) => { const st = api.checklists.state(c.id, loc); return `${L(c.title, lang)}: pending ${c.items.filter((i) => !st[i.id]).map((i) => L(i.text, lang)).join('; ') || 'none'}`; });
  const r = api.prep.report(loc);
  const prep = r.takeOut.concat(r.prepare).map((x) => `- ${L(x.ing.name, lang)}: ${x.withBuffer} ${L(x.ing.unit, lang)} (for ${x.forDay})`);
  const open = api.shifts.open(loc).slice(0, 5).map((s) => `- ${s.date} ${s.start}-${s.end} ${pos(s.positionId)}`);
  return [`Now: ${new Date().toISOString()} (server time). Employee: ${me.name}, ${L(me.title, lang)}, positions ${(me.positions || []).map(pos).join(', ')}. Restaurant: ${(api.catalog.location(loc) || {}).name}.`,
    `<schedule id="shifts">\nMy next shifts:\n${mine.join('\n') || '- none'}\nWorking today:\n${today.join('\n') || '- nobody'}\nOpen shifts:\n${open.join('\n') || '- none'}\nHoliday: ${bal.total} days, used ${bal.used}, pending ${bal.pending}, left ${bal.left}.\n</schedule>`,
    `<checklists id="checklists">\n${cls.join('\n')}\n</checklists>`,
    `<prep id="prep" note="demo forecast">\n${prep.join('\n')}\n</prep>`].join('\n\n');
}

const SYSTEM = (company, escalation) => `You are the internal assistant in the staff app of ${company}. You help employees during their shift.

Answer only from the company documents and data given to you. If they do not contain the answer, say so plainly and tell the employee to ask ${escalation}. Never invent procedures, times, temperatures or rules.

Allergens and food safety: only repeat product data marked VERIFIED, word for word. If it is NOT VERIFIED or missing, say that you cannot answer and that they must ask ${escalation}. Never say a product is safe for someone.

Emergencies: if someone may be in danger, tell them to call the emergency number (110 fire, 112 police, 113 ambulance) first.

If a document is marked status="demo" or review_overdue, mention that it is not an approved procedure or may be outdated.

Style: short and practical, like a helpful colleague. Use numbered steps for procedures. Plain text, no markdown headings or tables. Reply in the language of the question (Norwegian or English; other languages are fine too).

End every answer with exactly two lines:
SOURCES: <comma-separated ids you used, e.g. guide:g-closing, doc:d-handbook, product:b-classic, shifts, checklists, prep — or none>
ESCALATE: <yes if the employee should check with a manager, otherwise no>`;

function routeFor(id) {
  const [kind, ref] = id.split(':');
  if (kind === 'guide') return '#/staff/guide/' + ref;
  if (kind === 'doc') return '#/staff/community/doc/' + ref;
  if (kind === 'product') return '#/staff/menu/' + ref;
  return { shifts: '#/staff/shifts', checklists: '#/staff/checklists', prep: '#/staff/prep' }[kind] || null;
}

export async function ask(engine, user, { question, lang, locationId, history }) {
  const q = String(question || '').slice(0, 2000).trim();
  if (!q) return { error: 'bad_request' };
  const ctx = engine.read(user.id, lang, (App) => ({
    company: companyContext(App, lang), personal: personalContext(App, lang, locationId),
    escalation: L(App.tenant.ai.escalationContact, lang), name: App.tenant.name,
    labelOf: (id) => {
      const [kind, ref] = id.split(':');
      if (kind === 'guide') { const g = App.api.guides.get(ref); return g ? 'Guide: ' + L(g.title, lang) : null; }
      if (kind === 'doc') { const d = App.api.docs.get(ref); return d ? L(d.title, lang) : null; }
      if (kind === 'product') { const p = App.api.catalog.product(ref); return p ? L(p.name, lang) : null; }
      return { shifts: lang === 'nb' ? 'Mine vakter' : 'My shifts', checklists: lang === 'nb' ? 'Sjekklister' : 'Checklists', prep: lang === 'nb' ? 'Forberedelsesrapport' : 'Prep report' }[kind] || null;
    },
  }));

  const past = (Array.isArray(history) ? history : []).slice(-6)
    .filter((m) => m && typeof m.text === 'string' && (m.role === 'user' || m.role === 'bot'))
    .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text.slice(0, 2000) }));
  while (past.length && past[0].role !== 'user') past.shift();

  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    // Instructions + company documents are identical for every employee → cached.
    system: [{ type: 'text', text: SYSTEM(ctx.name, ctx.escalation) }, { type: 'text', text: ctx.company, cache_control: { type: 'ephemeral' } }],
    messages: [...past, { role: 'user', content: `${ctx.personal}\n\nQuestion: ${q}` }],
  });

  if (response.stop_reason === 'refusal') {
    return { kind: 'none', escalate: true, sources: [], text: lang === 'nb' ? `Jeg kan ikke svare på dette. Spør ${ctx.escalation}.` : `I can't answer this one. Please ask ${ctx.escalation}.` };
  }
  const raw = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  const srcLine = (raw.match(/^SOURCES:\s*(.*)$/im) || [])[1] || '';
  const escLine = (raw.match(/^ESCALATE:\s*(.*)$/im) || [])[1] || '';
  const text = raw.replace(/^SOURCES:.*$/im, '').replace(/^ESCALATE:.*$/im, '').trim();
  const sources = srcLine.split(',').map((s) => s.trim()).filter((s) => s && s !== 'none')
    .map((id) => ({ id, route: routeFor(id), label: engine.read(user.id, lang, () => ctx.labelOf(id)) })).filter((s) => s.route && s.label).slice(0, 4);
  return { kind: 'ai', text, sources, escalate: /yes|ja/i.test(escLine), model: response.model };
}
