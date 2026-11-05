/* Small helpers shared by all layers. */
window.App = window.App || {};

App.util = {
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // Localised field: {en, nb} → string for current language
  L(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    return obj[App.i18n.lang] || obj.en || obj.nb || '';
  },
  nok(n) {
    const v = Math.round(Number(n) || 0);
    return v.toLocaleString(App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB').replace(/,/g, ' ') + ' kr';
  },
  // Ids are generated on the device and replayed on the server, so both sides create
  // the same record ids (App.__uidReplay = ids to reuse, App.__uidRecord = ids generated).
  uid(prefix) {
    const q = App.__uidReplay;
    const v = q && q.length ? q.shift() : (prefix || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    if (App.__uidRecord) App.__uidRecord.push(v);
    return v;
  },
  clone(o) { return JSON.parse(JSON.stringify(o)); },
  todayKey() { return new Date().toISOString().slice(0, 10); },
  fmtDate(iso, withTime) {
    if (!iso) return '—';
    const d = new Date(iso);
    const loc = App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB';
    const opts = { day: 'numeric', month: 'short', year: 'numeric' };
    if (withTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString(loc, opts);
  },
  fmtTime(iso) {
    return new Date(iso).toLocaleTimeString(App.i18n.lang === 'nb' ? 'nb-NO' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
  },
  hm(date) { return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0'); },
  normalize(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9æøå\s]/g, ' ');
  },
};
