/*
 * What each signed-in person is allowed to download.
 * Managers get everything for their company. Employees get what the app needs to
 * work, without colleagues' wages, timesheets, private messages, leave notes,
 * individual survey answers or customer data.
 */
const pick = (o, keys) => keys.reduce((r, k) => (o[k] !== undefined ? ((r[k] = o[k]), r) : r), {});
const PUBLIC_USER = ['id', 'name', 'role', 'locationId', 'positions', 'color', 'title', 'phone', 'email', 'startDate'];

export function scopeFor(db, user, isMember) {
  if (!user) return null;
  if (user.role === 'admin') return db;
  const me = user.id;
  const inAudience = (a) => !a || a === 'all' || a === user.locationId || (a === 'managers' && user.role === 'admin');
  const d = { ...db };

  d.users = db.users.map((u) => (u.id === me ? u : u.role === 'customer' ? { id: u.id, name: u.name, role: u.role } : pick(u, PUBLIC_USER)));
  d.punches = db.punches.filter((p) => p.userId === me);
  d.activePunches = Object.fromEntries(Object.entries(db.activePunches || {}).map(([k, p]) => [k, k === me ? p : { userId: k, in: p.in, breaks: [] }]));
  d.leave = db.leave.filter((l) => l.userId === me || l.status === 'approved').map((l) => (l.userId === me ? l : { ...l, note: '', decisionNote: '' }));
  d.availability = Object.fromEntries(Object.entries(db.availability || {}).map(([k, a]) => [k, k === me ? a
    : { weekly: Object.fromEntries(Object.entries(a.weekly || {}).map(([wd, v]) => [wd, { state: v.state, from: v.from, to: v.to }])) }]));
  d.staffReports = db.staffReports.filter((r) => r.byId === me);
  d.channels = db.channels.filter((c) => isMember(c, user));
  const ids = new Set(d.channels.map((c) => c.id));
  d.messages = db.messages.filter((m) => ids.has(m.channelId));
  d.chatRead = Object.fromEntries(Object.entries(db.chatRead || {}).filter(([k]) => k.startsWith(me + '|')));
  d.courseProgress = Object.fromEntries(Object.entries(db.courseProgress || {}).filter(([k]) => k.startsWith(me + '|')));
  d.surveys = db.surveys.map((s) => ({ ...s, responses: s.responses.map((r) => ({ by: r.by })) }));
  d.notifications = db.notifications.filter((n) => n.userId === me);
  d.posts = db.posts.filter((p) => inAudience(p.audience));
  d.events = db.events.filter((e) => inAudience(e.audience));
  // customer-side data is not needed in the staff app
  d.orders = []; d.ledger = []; d.reviews = []; d.cateringRequests = []; d.incidents = [];
  // sales figures, budgets and pay locks are for managers only
  d.salesActual = {}; d.salesForecast = {}; d.laborBudget = {};
  return d;
}
