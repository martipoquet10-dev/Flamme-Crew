/*
 * App shell: router, rendering, event delegation, toasts and modals.
 * Views live in src/views/*.js and register themselves on App.views / App.actions / App.forms.
 */
window.App = window.App || {};
App.views = App.views || {};
App.actions = App.actions || {};
App.forms = App.forms || {};
App.changes = App.changes || {};

App.app = (function () {
  const routes = [];
  const ui = { flash: null };

  function route(pattern, area, view) {
    const keys = [];
    const rx = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    // Registering the same pattern again replaces the earlier view (lets newer modules override).
    const existing = routes.find((r) => r.pattern === pattern);
    if (existing) Object.assign(existing, { rx, keys, area, view });
    else routes.push({ pattern, rx, keys, area, view });
  }

  function match(hash) {
    const path = (hash || '#/').replace(/^#/, '') || '/';
    for (const r of routes) {
      const m = path.match(r.rx);
      if (m) { const params = {}; r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]))); return { ...r, params, path }; }
    }
    const home = routes.find((r) => r.pattern === '/') || routes[0];
    return { ...home, params: {}, path: '/' };
  }

  // Keeps what the user is typing when the screen refreshes because colleagues changed data.
  function snapshotFields(root) {
    const seen = {}, saved = [];
    root.querySelectorAll('input, textarea, select').forEach((el) => {
      const base = ((el.closest('[data-form]') || { dataset: {} }).dataset.form || '') + '|' + (el.name || el.id);
      const i = seen[base] = (seen[base] || 0) + 1;
      const changed = el.type === 'checkbox' || el.type === 'radio' ? el.checked !== el.defaultChecked : el.value !== (el.tagName === 'SELECT' ? el.value : el.defaultValue);
      const focused = document.activeElement === el;
      if (changed || focused) saved.push({ key: base + '|' + i, value: el.value, checked: el.checked, focused, start: focused && el.selectionStart, end: focused && el.selectionEnd });
    });
    return () => {
      const seen2 = {};
      root.querySelectorAll('input, textarea, select').forEach((el) => {
        const base = ((el.closest('[data-form]') || { dataset: {} }).dataset.form || '') + '|' + (el.name || el.id);
        const i = seen2[base] = (seen2[base] || 0) + 1;
        const s = saved.find((x) => x.key === base + '|' + i); if (!s) return;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = s.checked; else el.value = s.value;
        if (s.focused) { el.focus(); try { el.setSelectionRange(s.start, s.end); } catch (e) { /* not a text field */ } }
      });
    };
  }

  function render(opts) {
    const r = match(location.hash);
    const root = document.getElementById('app');
    const restore = opts && opts.preserve ? snapshotFields(root) : null;
    const scroll = opts && opts.preserve ? [window.scrollY, (document.getElementById('msgs') || {}).scrollTop] : null;
    let content;
    try {
      content = r.view(r.params);
    } catch (e) {
      if (e && e.code === 'forbidden') content = App.views.forbidden(r.area);
      else { console.error(e); content = `<div class="page-pad"><div class="notice notice-red">${App.util.esc(e.message)}</div></div>`; }
    }
    const layout = App.views.layouts[r.area] || App.views.layouts.staff;
    ui.route = r;
    root.innerHTML = layout(content, r);
    document.documentElement.lang = App.i18n.lang === 'nb' ? 'nb' : 'en';
    if (ui.afterRender) { const f = ui.afterRender; ui.afterRender = null; f(); }
    if (restore) { restore(); window.scrollTo(0, scroll[0]); }
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  function toast(msg, kind) {
    let host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3000);
  }

  function modal(html, cls) {
    const host = document.getElementById('modal');
    if (!html) { host.innerHTML = ''; host.hidden = true; document.body.classList.remove('noscroll'); return; }
    host.innerHTML = `<div class="sheet-backdrop" data-action="closeModal"></div><div class="sheet ${cls || ''}" role="dialog" aria-modal="true">${html}</div>`;
    host.hidden = false; document.body.classList.add('noscroll');
  }

  function formData(form) {
    const o = {};
    new FormData(form).forEach((v, k) => {
      if (k in o) { o[k] = [].concat(o[k], v); } else o[k] = v;
    });
    return o;
  }

  function handleError(e) {
    console.error(e);
    const key = 'err.' + (e.code || 'generic');
    toast(App.i18n.has(key) ? App.i18n.t(key) : App.i18n.t('err.generic'), 'error');
  }

  function init() {
    document.addEventListener('click', (ev) => {
      const el = ev.target.closest('[data-action]');
      if (!el) return;
      const fn = App.actions[el.dataset.action];
      if (!fn) return;
      ev.preventDefault();
      try { fn(el.dataset, el, ev); } catch (e) { handleError(e); }
    });
    document.addEventListener('submit', (ev) => {
      const form = ev.target.closest('[data-form]');
      if (!form) return;
      ev.preventDefault();
      const data = formData(form);
      if (ev.submitter && ev.submitter.name) data[ev.submitter.name] = ev.submitter.value;
      try { App.forms[form.dataset.form](data, form); } catch (e) { handleError(e); }
    });
    const onChange = (ev) => {
      const el = ev.target.closest('[data-change]');
      if (!el) return;
      const fn = App.changes[el.dataset.change];
      if (fn) { try { fn(el, ev); } catch (e) { handleError(e); } }
    };
    document.addEventListener('change', onChange);
    document.addEventListener('input', (ev) => { if (ev.target.matches('[data-live]')) onChange(ev); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') modal(null); });
    window.addEventListener('hashchange', () => { modal(null); render(); window.scrollTo(0, 0); });
    (App.app.onInit || []).forEach((f) => f());
    render();
  }

  // In-page confirmation (native confirm() is blocked in embedded viewers and looks dated)
  function confirmBox(message, okLabel, onYes, danger) {
    const esc = App.util.esc, T = App.i18n.T;
    ui.onConfirm = onYes;
    modal(`<div class="confirm-box"><p class="h3">${esc(message)}</p><div class="row"><button class="btn ${danger ? 'btn-dark' : 'btn-primary'} btn-grow" data-action="confirmYes">${esc(okLabel || T('Yes', 'Ja'))}</button><button class="btn btn-ghost" data-action="closeModal">${esc(T('Cancel', 'Avbryt'))}</button></div></div>`, 'sheet-sm');
  }

  // shared actions
  Object.assign(App.actions, {
    closeModal() { modal(null); },
    confirmYes() { const f = ui.onConfirm; ui.onConfirm = null; modal(null); if (f) f(); },
    go(d) { go(d.to); },
    setLang(d) { App.i18n.setLang(d.lang); render(); },
    resetDemo() {
      if (App.sync && App.sync.live) {
        if (!App.api.auth.hasRole('admin')) return toast(App.i18n.T('Only managers can reset the shared demo data.', 'Bare ledere kan tilbakestille de delte demodataene.'), 'error');
        return confirmBox(App.i18n.T('Reset the demo data for EVERYONE on this server?', 'Tilbakestille demodataene for ALLE på denne serveren?'), App.i18n.t('demo.reset'), () => App.sync.reset().then(() => toast(App.i18n.t('demo.resetDone'))), true);
      }
      confirmBox(App.i18n.t('demo.resetConfirm'), App.i18n.t('demo.reset'), () => { App.api.admin.resetDemo(); go('#/'); render(); toast(App.i18n.t('demo.resetDone')); }, true);
    },
  });

  return { route, render, go, toast, modal, confirm: confirmBox, ui, init, handleError, onInit: [] };
})();
