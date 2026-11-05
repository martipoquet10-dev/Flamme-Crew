/*
 * COMMUNITY area (internal communication): news feed, chat, events, training,
 * handbook / documents, surveys, kudos and the colleague directory.
 */
(function () {
  const U = App.util, K = App.kit, W = App.wf;
  const { esc, L } = U;
  const T = K.T;
  const ic = App.art.icon;
  const api = App.api, app = App.app;
  const guard = (fn, role) => App.views.guard(fn, role);
  const loc = () => App.views.staffLocation();
  const isMgr = () => api.auth.hasRole('admin');
  const person = (id) => (id === 'hq' ? 'hq' : api.people.get(id));
  const me = () => api.auth.me();
  const head = (title, sub, right) => `<header class="staff-head"><div><h1 class="h1">${title}</h1>${sub ? `<p class="small muted">${sub}</p>` : ''}</div>${right || ''}</header>`;
  const audName = (a) => (a === 'all' ? T('Everyone', 'Alle') : a === 'managers' ? T('Managers', 'Ledere') : ((api.catalog.location(a) || {}).name || a).replace(App.tenant.name + ' ', ''));
  const nl = (s) => esc(s).replace(/\n/g, '<br>');

  // ================= FEED =================
  function postCard(p, full) {
    const u = me();
    const author = person(p.authorId);
    const liked = p.likes.includes(u.id);
    const read = p.readBy.includes(u.id);
    const size = api.feed.audienceSize(p);
    const open = full || (app.ui.openComments || {})[p.id];
    const comments = open ? p.comments : p.comments.slice(-1);
    const totalVotes = p.poll ? p.poll.options.reduce((s, o) => s + o.votes.length, 0) : 0;
    const myVote = p.poll && p.poll.options.find((o) => o.votes.includes(u.id));
    return `<article class="post ${p.mustRead && !read ? 'must' : ''}" id="post-${p.id}">
      <header class="post-h">${K.avatar(author, 42)}<div><b>${esc(App.views.authorName(p.authorId))}</b><span class="small muted">${K.timeAgo(p.at)} · ${ic(p.audience === 'all' ? 'megaphone' : 'store', 12)} ${esc(audName(p.audience))}</span></div>
        <div class="post-flags">${p.pinned ? `<span class="badge badge-ink">${ic('pinned', 12)} ${T('Pinned', 'Festet')}</span>` : ''}${p.mustRead ? `<span class="badge badge-red">${T('Must read', 'Må leses')}</span>` : ''}
        ${p.authorId === u.id || isMgr() ? `<button class="icon-btn" data-action="postMenu" data-id="${p.id}" aria-label="${T('More', 'Mer')}">⋯</button>` : ''}</div></header>
      ${p.title ? `<h2 class="post-title">${esc(L(p.title))}</h2>` : ''}
      <p class="post-text">${nl(L(p.text))}</p>
      ${p.image ? `<div class="post-img"><img src="${esc(p.image)}" alt="" loading="lazy"></div>` : ''}
      ${p.link ? `<a class="btn btn-ghost btn-sm" href="${p.link.route}">${ic('arrow', 16)} ${esc(L(p.link.label))}</a>` : ''}
      ${p.poll ? `<div class="poll">${p.poll.options.map((o) => { const pc = totalVotes ? Math.round(o.votes.length / totalVotes * 100) : 0; return `<button class="poll-opt ${myVote === o ? 'on' : ''}" data-action="vote" data-id="${p.id}" data-o="${o.id}"><i style="width:${myVote ? pc : 0}%"></i><span>${esc(L(o.text))}</span>${myVote ? `<b>${pc}%</b>` : ''}</button>`; }).join('')}<span class="small muted">${totalVotes} ${T('votes', 'stemmer')}${myVote ? '' : ' · ' + T('vote to see results', 'stem for å se resultat')}</span></div>` : ''}
      ${p.mustRead ? `<div class="read-box">${read ? `<span class="green small">${ic('check', 16)} ${T('You confirmed you have read this', 'Du har bekreftet at du har lest dette')}</span>` : `<button class="btn btn-primary btn-sm" data-action="confirmPost" data-id="${p.id}">${ic('check', 16)} ${T('I have read this', 'Jeg har lest dette')}</button>`}
        ${isMgr() ? `<span class="small muted read-stat"><span class="meter"><span style="width:${Math.round(p.readBy.length / size * 100)}%"></span></span>${T('Read by', 'Lest av')} ${p.readBy.length}/${size}</span>` : ''}</div>` : ''}
      <footer class="post-f"><button class="react ${liked ? 'on' : ''}" data-action="like" data-id="${p.id}">${ic('heart', 18)} <span>${p.likes.length || ''}</span></button>
        <button class="react" data-action="toggleComments" data-id="${p.id}">${ic('comment', 18)} <span>${p.comments.length || ''}</span></button>
        ${p.likes.length ? `<span class="small muted likers">${K.avatarStack(p.likes.map(person), 3)}</span>` : ''}</footer>
      ${comments.length || open ? `<div class="comments">${p.comments.length > comments.length ? `<button class="link small" data-action="toggleComments" data-id="${p.id}">${T('See all', 'Se alle')} ${p.comments.length} ${T('comments', 'kommentarer')}</button>` : ''}
        ${comments.map((c) => `<div class="cmt">${K.avatar(person(c.userId), 28)}<div><b class="small">${esc(person(c.userId).name)}</b> <span class="small muted">${K.timeAgo(c.at)}</span><p>${nl(L(c.text))}</p></div></div>`).join('')}
        <form class="cmt-form" data-form="comment"><input type="hidden" name="id" value="${p.id}">${K.avatar(u, 28)}<input class="input input-sm" name="text" placeholder="${T('Write a comment…', 'Skriv en kommentar…')}" autocomplete="off"><button class="icon-btn" aria-label="${T('Send', 'Send')}">${ic('send', 16)}</button></form></div>` : ''}
    </article>`;
  }
  function feed(params) {
    const f = app.ui.feedFilter || 'all';
    const list = params && params.id ? [api.feed.get(params.id)].filter(Boolean) : api.feed.list(f);
    const u = me();
    const must = api.feed.unreadMustRead();
    const chip = (k, label, n) => `<button class="chip ${f === k ? 'on' : ''}" data-action="feedFilter" data-f="${k}">${label}${n ? ` <span class="nbadge">${n}</span>` : ''}</button>`;
    return `<div class="page-w feed-w">
      <div class="feed-main">
        ${params && params.id ? `<a href="#/staff/community" class="back">${ic('back', 18)} ${T('All news', 'Alle nyheter')}</a>` : `
        ${head(T('News', 'Nyheter'), T('Updates from your restaurant and the whole company.', 'Oppdateringer fra restauranten din og hele selskapet.'))}
        <button class="composer" data-action="newPost">${K.avatar(u, 40)}<span>${T('Share something with the team…', 'Del noe med teamet…')}</span>${ic('image', 20)}${ic('poll', 20)}</button>
        <nav class="chips">${chip('all', T('All', 'Alle'))}${chip('mine', esc(audName(u.locationId)))}${chip('important', T('Important', 'Viktig'), must.length)}</nav>`}
        ${list.map((p) => postCard(p, params && params.id)).join('') || K.empty('megaphone', T('No posts yet', 'Ingen innlegg ennå'))}
      </div>
      ${params && params.id ? '' : `<aside class="feed-side">
        ${must.length ? `<section class="card must-card"><h2 class="h3">${ic('alert', 18)} ${T('Waiting for your confirmation', 'Venter på bekreftelse')}</h2>${must.map((p) => `<a class="mini-link" href="#/staff/community/post/${p.id}">${esc(L(p.title) || L(p.text).slice(0, 50))}</a>`).join('')}</section>` : ''}
        ${K.mod('events') ? `<section class="card"><h2 class="h3">${ic('calendar', 18)} ${T('Coming up', 'Kommer')}</h2>${api.events.list().slice(0, 3).map((e) => `<a class="mini-ev" href="#/staff/community/events">${K.dateTile(W.dayKey(e.start))}<div><b>${esc(L(e.title))}</b><span class="small muted">${U.fmtTime(e.start)}</span></div></a>`).join('') || '<p class="small muted">—</p>'}</section>` : ''}
        ${K.mod('kudos') ? `<section class="card"><div class="row-between"><h2 class="h3">${ic('heart', 18)} ${T('Kudos', 'Ros')}</h2><button class="btn btn-sm btn-ghost" data-action="giveKudos">${T('Give', 'Gi')}</button></div>${api.kudos.list().slice(0, 2).map(kudoMini).join('')}</section>` : ''}
      </aside>`}
    </div>`;
  }
  const PHOTOS = ['d-western.png', 'd-bacon-cheese.png', 'b-truffle.png', 'c-spicy.png', 's-fries.png', 'sw-churros.png'];
  function composer() {
    const u = me();
    const base = App.tenant.base + 'brand/products/';
    return `<form data-form="createPost" class="admin-sheet">${K.sheetHead(T('New post', 'Nytt innlegg'))}
      <div class="stack">
        <div class="grid-2"><div><label class="field-label">${T('Audience', 'Mottakere')}</label><select class="input" name="audience"><option value="${u.locationId}">${esc(audName(u.locationId))}</option>${isMgr() ? `<option value="all">${T('Everyone in the company', 'Alle i selskapet')}</option>` + api.catalog.locations().filter((l) => l.id !== u.locationId).map((l) => `<option value="${l.id}">${esc(audName(l.id))}</option>`).join('') : ''}</select></div>
          <div><label class="field-label">${T('Title (optional)', 'Tittel (valgfritt)')}</label><input class="input" name="title"></div></div>
        <textarea class="input" name="text" rows="4" required placeholder="${T('What do you want to share?', 'Hva vil du dele?')}"></textarea>
        <div><p class="field-label">${T('Photo', 'Bilde')} <span class="badge badge-demo">${T('demo library', 'demobibliotek')}</span></p><div class="photo-pick"><label><input type="radio" name="image" value="" checked><span class="none">${ic('x', 18)}</span></label>${PHOTOS.map((f) => `<label><input type="radio" name="image" value="${base + f}"><img src="${base + f}" alt=""></label>`).join('')}</div></div>
        <details><summary class="small"><b>${ic('poll', 14)} ${T('Add a poll', 'Legg til avstemning')}</b></summary><div class="stack"><input class="input input-sm" name="opt1" placeholder="${T('Option', 'Alternativ')} 1"><input class="input input-sm" name="opt2" placeholder="${T('Option', 'Alternativ')} 2"><input class="input input-sm" name="opt3" placeholder="${T('Option', 'Alternativ')} 3"></div></details>
        ${isMgr() ? `<label class="opt"><input type="checkbox" name="mustRead"><span><b>${T('Must read', 'Må leses')}</b> — ${T('everyone confirms they have read it; you see who has', 'alle bekrefter at de har lest; du ser hvem')}</span></label><label class="opt"><input type="checkbox" name="pinned"><span>${T('Pin to top', 'Fest øverst')}</span></label>` : ''}
        <button class="btn btn-primary btn-block">${ic('send', 18)} ${T('Publish', 'Publiser')}</button>
      </div></form>`;
  }
  const kudoMini = (k) => { const v = api.kudos.values.find((x) => x.id === k.value); return `<div class="kudo-mini" style="--c:${v.color}">${K.avatar(person(k.toId), 30)}<div><b class="small">${esc(person(k.toId).name)}</b> <span class="kv small">${ic(v.icon, 12)} ${esc(L(v.label))}</span><p class="small muted">${esc(L(k.text)).slice(0, 80)}</p></div></div>`; };

  // ================= CHAT =================
  function chat(params) {
    const id = params && params.id;
    const mobile = window.innerWidth < 860;
    const first = api.chat.channels()[0];
    const cur = id ? api.chat.get(id) : (first ? api.chat.get(first.id) : null);
    if (cur && (id || !mobile)) api.chat.markRead(cur.id);
    const list = api.chat.channels();
    const q = U.normalize(app.ui.chatQ || '');
    const shown = list.filter((c) => !q || U.normalize(c.title).includes(q));
    const groups = [['channel', T('Channels', 'Kanaler')], ['group', T('Groups', 'Grupper')], ['dm', T('Direct messages', 'Direktemeldinger')]];
    const chIcon = (c) => c.kind === 'dm' ? K.avatar(api.chat.other(c), 38) : `<span class="ch-ic" style="--c:${c.color || '#0D9488'}">${ic(c.icon || 'users', 18)}</span>`;
    const preview = (c) => c.last ? (c.last.userId === me().id ? T('You: ', 'Du: ') : c.kind === 'dm' ? '' : (person(c.last.userId) || {}).name.split(' ')[0] + ': ') + L(c.last.text) : T('No messages yet', 'Ingen meldinger ennå');
    const listHtml = `<aside class="chat-list">
      <div class="row-between chat-list-h"><h1 class="h2">${T('Chat', 'Chat')}</h1><button class="btn btn-primary btn-sm" data-action="newChat">${ic('plus', 16)} ${T('New', 'Ny')}</button></div>
      <form data-form="chatSearch" class="search-big sm"><span>${ic('search', 18)}</span><input class="input" name="q" placeholder="${T('Search chats', 'Søk i chatter')}" value="${esc(app.ui.chatQ || '')}" data-live data-change="chatQ"></form>
      ${groups.map(([k, label]) => { const items = shown.filter((c) => c.kind === k); return items.length ? `<p class="eyebrow">${label}</p>${items.map((c) => `<a class="ch-row ${cur && cur.id === c.id ? 'on' : ''} ${c.unread ? 'unread' : ''}" href="#/staff/community/chat/${c.id}">${chIcon(c)}<div><b>${esc(c.title)}</b><span class="small muted">${esc(preview(c)).slice(0, 60)}</span></div><div class="ch-meta">${c.last ? `<span class="small muted">${K.timeAgo(c.last.at)}</span>` : ''}${c.unread ? `<span class="nbadge">${c.unread}</span>` : ''}</div></a>`).join('')}` : ''; }).join('')}
    </aside>`;
    if (!cur) return `<div class="chat-wrap no-cur">${listHtml}<section class="chat-pane empty-pane">${K.empty('chat', T('Pick a conversation', 'Velg en samtale'))}</section></div>`;
    const msgs = api.chat.messages(cur.id);
    const members = api.chat.members(cur);
    let lastDay = '', lastUser = '';
    app.ui.afterRender = () => { const el = document.getElementById('msgs'); if (el) el.scrollTop = el.scrollHeight; const i = document.getElementById('chatInput'); if (i && !('ontouchstart' in window)) i.focus(); };
    const typing = app.ui.typing === cur.id;
    return `<div class="chat-wrap ${id ? 'has-cur' : ''}">${listHtml}
      <section class="chat-pane">
        <header class="chat-h">${true ? `<a href="#/staff/community/chat" class="icon-btn mob-only" aria-label="${T('Back', 'Tilbake')}">${ic('back', 20)}</a>` : ''}${chIcon(cur)}<div><b>${esc(api.chat.title(cur))}</b><span class="small muted">${cur.kind === 'dm' ? esc(L((api.chat.other(cur) || {}).title) || '') : members.length + ' ' + T('members', 'medlemmer') + (cur.description ? ' · ' + esc(L(cur.description)) : '')}</span></div>
          ${cur.kind !== 'dm' ? `<span class="hide-sm">${K.avatarStack(members, 5)}</span>` : (api.chat.other(cur) && api.chat.other(cur).phone ? `<a class="icon-btn bordered" href="tel:${esc(api.chat.other(cur).phone.replace(/\s/g, ''))}" aria-label="${T('Call', 'Ring')}">${ic('phone', 18)}</a>` : '')}</header>
        <div class="msgs" id="msgs">${msgs.map((m) => {
          const d = W.dayKey(m.at); const sep = d !== lastDay ? `<div class="day-sep"><span>${K.relDay(d)}</span></div>` : ''; lastDay = d;
          if (m.system) { lastUser = ''; return sep + `<div class="sys-msg small muted">${esc(L(m.text))}</div>`; }
          const mine = m.userId === me().id; const cont = lastUser === m.userId && !sep; lastUser = m.userId;
          const p = person(m.userId);
          const reacts = Object.entries(m.reactions || {});
          return sep + `<div class="msg-row ${mine ? 'mine' : ''} ${cont ? 'cont' : ''}">${!mine ? (cont ? '<span class="av-sp"></span>' : K.avatar(p, 32)) : ''}
            <div class="bubble-w">${!mine && !cont && cur.kind !== 'dm' ? `<span class="small b-name" style="color:${p.color}">${esc(p.name)}</span>` : ''}
              <div class="bubble">${nl(L(m.text))}<span class="b-time">${U.fmtTime(m.at)}</span></div>
              <div class="b-react">${reacts.map(([e, ids]) => `<button class="rx ${ids.includes(me().id) ? 'on' : ''}" data-action="react" data-id="${m.id}" data-e="${e}" title="${ids.map((x) => esc((person(x) || {}).name)).join(', ')}">${e} ${ids.length}</button>`).join('')}
                <span class="rx-add">${['👍', '❤️', '😂', '🔥'].map((e) => `<button data-action="react" data-id="${m.id}" data-e="${e}">${e}</button>`).join('')}</span></div></div></div>`; }).join('')}
          ${typing ? `<div class="msg-row"><span class="av-sp"></span><div class="bubble typing-b"><span class="typing"><i></i><i></i><i></i></span></div></div>` : ''}
        </div>
        <form class="chat-compose" data-form="sendMsg"><input type="hidden" name="id" value="${cur.id}"><input id="chatInput" class="input" name="text" placeholder="${T('Write a message…', 'Skriv en melding…')}" autocomplete="off"><button class="btn btn-primary" aria-label="${T('Send', 'Send')}">${ic('send', 18)}</button></form>
      </section></div>`;
  }
  function newChatSheet() {
    const people = api.people.all().filter((p) => p.id !== me().id).sort((a, b) => (a.locationId === me().locationId ? -1 : 1) - (b.locationId === me().locationId ? -1 : 1) || a.name.localeCompare(b.name));
    return `<form data-form="createChat" class="admin-sheet">${K.sheetHead(T('New conversation', 'Ny samtale'), T('Pick one person for a direct message, or several and a name for a group.', 'Velg én person for direktemelding, eller flere og et navn for en gruppe.'))}
      <input class="input" name="name" placeholder="${T('Group name (for groups)', 'Gruppenavn (for grupper)')}">
      <div class="pick-list">${people.map((p) => `<label class="pick">${K.avatar(p, 34)}<span><b>${esc(p.name)}</b><span class="small muted">${esc(L(p.title) || '')} · ${esc(audName(p.locationId))}</span></span><input type="checkbox" name="members" value="${p.id}"></label>`).join('')}</div>
      <button class="btn btn-primary btn-block">${T('Start chat', 'Start chat')}</button></form>`;
  }

  // ================= EVENTS =================
  function events() {
    const list = api.events.list();
    const kinds = { training: [T('Training', 'Opplæring'), 'grad', '#2F9E44'], meeting: [T('Meeting', 'Møte'), 'users', '#2563EB'], social: [T('Social', 'Sosialt'), 'party', '#C2255C'] };
    return `<div class="page-w narrow">
      ${head(T('Events', 'Arrangementer'), T('Meetings, training and social events. Let us know if you are coming.', 'Møter, opplæring og sosiale arrangementer. Gi beskjed om du kommer.'), isMgr() ? `<button class="btn btn-primary btn-sm" data-action="newEvent">${ic('plus', 16)} ${T('New event', 'Nytt arrangement')}</button>` : '')}
      ${list.map((e) => { const k = kinds[e.kind] || kinds.social; const mine = e.rsvps[me().id]; const yes = Object.keys(e.rsvps).filter((x) => e.rsvps[x] === 'yes').map(person);
        return `<article class="event" style="--c:${k[2]}">${K.dateTile(W.dayKey(e.start))}
          <div class="ev-body"><span class="kv small" style="--c:${k[2]}">${ic(k[1], 13)} ${k[0]}</span><h2 class="h3">${esc(L(e.title))}</h2>
            <p class="small muted">${ic('clock', 13)} ${K.fmtDay(W.dayKey(e.start))} · ${U.fmtTime(e.start)}–${U.fmtTime(e.end)} · ${ic('location', 13)} ${esc(e.place)} · ${esc(audName(e.audience))}</p>
            <p>${esc(L(e.description))}</p>
            <div class="row-between"><div class="seg seg-sm rsvp">${[['yes', T('Going', 'Kommer')], ['maybe', T('Maybe', 'Kanskje')], ['no', T('Can\'t', 'Kan ikke')]].map(([v, label]) => `<button class="${mine === v ? 'on ' + v : ''}" data-action="rsvp" data-id="${e.id}" data-v="${v}">${label}</button>`).join('')}</div>
              <span class="row small muted">${K.avatarStack(yes, 5)} ${yes.length} ${T('going', 'kommer')}</span></div></div></article>`; }).join('') || K.empty('calendar', T('No upcoming events', 'Ingen kommende arrangementer'))}
    </div>`;
  }
  function eventEditor() {
    return `<form data-form="createEvent" class="admin-sheet">${K.sheetHead(T('New event', 'Nytt arrangement'))}
      <div class="grid-2"><div class="full"><label class="field-label">${T('Title', 'Tittel')}</label><input class="input" name="title" required></div>
        <div><label class="field-label">${T('Type', 'Type')}</label><select class="input" name="kind"><option value="meeting">${T('Meeting', 'Møte')}</option><option value="training">${T('Training', 'Opplæring')}</option><option value="social">${T('Social', 'Sosialt')}</option></select></div>
        <div><label class="field-label">${T('For', 'For')}</label><select class="input" name="audience"><option value="${me().locationId}">${esc(audName(me().locationId))}</option><option value="all">${T('Everyone', 'Alle')}</option></select></div>
        <div><label class="field-label">${T('Date', 'Dato')}</label><input class="input" type="date" name="date" value="${W.addDays(W.today(), 7)}" required></div>
        <div class="grid-2"><div><label class="field-label">${T('From', 'Fra')}</label><input class="input" type="time" name="start" value="10:00"></div><div><label class="field-label">${T('To', 'Til')}</label><input class="input" type="time" name="end" value="11:00"></div></div>
        <div class="full"><label class="field-label">${T('Place', 'Sted')}</label><input class="input" name="place" value="${esc((api.catalog.location(me().locationId) || {}).name || '')}"></div>
        <div class="full"><label class="field-label">${T('Description', 'Beskrivelse')}</label><textarea class="input" name="description" rows="3"></textarea></div></div>
      <button class="btn btn-primary btn-block">${T('Create & notify', 'Opprett og varsle')}</button></form>`;
  }

  // ================= LEARNING =================
  function learning() {
    const list = api.learning.courses();
    const mand = list.filter((c) => c.mandatory);
    const doneM = mand.filter((c) => api.learning.progress(c.id).completedAt).length;
    const team = api.people.team(loc());
    return `<div class="page-w">
      ${head(T('Training', 'Opplæring'), T('Short courses with a quiz at the end. Mandatory courses must be completed by everyone.', 'Korte kurs med en quiz til slutt. Obligatoriske kurs må fullføres av alle.'))}
      <section class="learn-hero"><div class="bal-ring" style="--p:${Math.round(doneM / (mand.length || 1) * 100)};--q:0"><div><b>${doneM}/${mand.length}</b><span class="small">${T('mandatory', 'obligatoriske')}</span></div></div>
        <div><h2 class="h2">${doneM === mand.length ? T('All mandatory training done 🎉', 'All obligatorisk opplæring er fullført 🎉') : T('Keep going!', 'Fortsett sånn!')}</h2><p class="muted">${T('Courses take 10–25 minutes and can be done on your phone. Training time is paid.', 'Kursene tar 10–25 minutter og kan tas på mobilen. Opplæringstid er betalt.')}</p></div></section>
      <div class="course-grid">${list.map((c) => { const pc = api.learning.pct(c); const pr = api.learning.progress(c.id); return `<a class="course" href="#/staff/community/course/${c.id}" style="--c:${c.color}">
        <div class="course-top"><span class="course-ic">${ic(c.icon, 24)}</span>${c.mandatory ? `<span class="badge badge-red">${T('Mandatory', 'Obligatorisk')}</span>` : `<span class="badge badge-gray">${T('Optional', 'Valgfritt')}</span>`}</div>
        <b class="h3">${esc(L(c.title))}</b><p class="small muted">${esc(L(c.description))}</p>
        <div class="course-foot"><span class="small muted">${ic('clock', 13)} ${c.minutes} min · ${c.lessons.length} ${T('lessons', 'leksjoner')}</span>${pr.completedAt ? `<span class="badge badge-green">${ic('award', 12)} ${T('Completed', 'Fullført')}</span>` : `<span class="small"><b>${pc}%</b></span>`}</div>
        <span class="meter"><span style="width:${pc}%"></span></span></a>`; }).join('')}</div>
      ${isMgr() ? `<section class="card"><h2 class="h3">${ic('users', 18)} ${T('Team progress', 'Teamets fremdrift')} · ${esc(audName(loc()))}</h2><div class="table-wrap"><table class="table"><thead><tr><th>${T('Employee', 'Ansatt')}</th>${list.map((c) => `<th class="center">${esc(L(c.title)).split(' ').slice(0, 2).join(' ')}</th>`).join('')}</tr></thead>
        <tbody>${team.map((p) => `<tr><td><div class="row nowrap">${K.avatar(p, 26)}${esc(p.name)}</div></td>${list.map((c) => { const pr = api.learning.progress(c.id, p.id); return `<td class="center">${pr.completedAt ? '<span class="dot ok">✔</span>' : pr.lessonsDone.length ? `<span class="small muted">${api.learning.pct(c, p.id)}%</span>` : c.mandatory ? '<span class="dot miss">●</span>' : '<span class="muted">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">✔ ${T('completed', 'fullført')} · <span style="color:var(--red)">●</span> ${T('mandatory, not started', 'obligatorisk, ikke startet')}</p></section>` : ''}
    </div>`;
  }
  function course(params) {
    const c = api.learning.get(params.id);
    if (!c) return K.empty('grad', T('Course not found', 'Kurs ikke funnet'));
    const pr = api.learning.progress(c.id);
    const next = c.lessons.find((l) => !pr.lessonsDone.includes(l.id));
    const openId = app.ui.lesson || (next ? next.id : 'quiz');
    const res = app.ui.quizRes && app.ui.quizRes.id === c.id ? app.ui.quizRes : null;
    return `<div class="page-w narrow">
      <a href="#/staff/community/learning" class="back">${ic('back', 18)} ${T('Training', 'Opplæring')}</a>
      <header class="course-head" style="--c:${c.color}"><span class="course-ic lg">${ic(c.icon, 30)}</span><div><h1 class="h1">${esc(L(c.title))}</h1><p class="muted">${esc(L(c.description))}</p><span class="small muted">${c.minutes} min · ${c.mandatory ? T('Mandatory', 'Obligatorisk') : T('Optional', 'Valgfritt')}</span></div></header>
      ${pr.completedAt ? `<div class="cert">${ic('award', 36)}<div><b>${T('Certificate', 'Kursbevis')}</b><p>${esc(me().name)} · ${esc(L(c.title))}</p><span class="small muted">${T('Completed', 'Fullført')} ${U.fmtDate(pr.completedAt)} · ${T('Score', 'Resultat')} ${pr.quizScore}%</span></div></div>` : ''}
      <ol class="lessons">${c.lessons.map((l, i) => { const done = pr.lessonsDone.includes(l.id); const open = openId === l.id; return `<li class="lesson ${done ? 'done' : ''} ${open ? 'open' : ''}">
        <button class="lesson-h" data-action="openLesson" data-id="${l.id}"><span class="step-n">${done ? ic('check', 14) : i + 1}</span><b>${esc(L(l.title))}</b>${ic(open ? 'minus' : 'plus', 16)}</button>
        ${open ? `<div class="lesson-b"><p>${esc(L(l.body))}</p>${done ? '' : `<button class="btn btn-primary btn-sm" data-action="lessonDone" data-c="${c.id}" data-id="${l.id}">${T('Done — next', 'Ferdig — neste')} ${ic('arrow', 16)}</button>`}</div>` : ''}</li>`; }).join('')}
        <li class="lesson quiz ${openId === 'quiz' ? 'open' : ''} ${pr.completedAt ? 'done' : ''}"><button class="lesson-h" data-action="openLesson" data-id="quiz"><span class="step-n">${ic('target', 14)}</span><b>${T('Quiz', 'Quiz')} · ${c.quiz.length} ${T('questions', 'spørsmål')}</b>${ic(openId === 'quiz' ? 'minus' : 'plus', 16)}</button>
          ${openId === 'quiz' ? `<form class="lesson-b stack" data-form="quiz"><input type="hidden" name="id" value="${c.id}">
            ${res ? `<div class="notice ${res.passed ? 'notice-green' : 'notice-amber'}">${ic(res.passed ? 'award' : 'alert', 18)} <span><b>${res.right}/${res.total} ${T('correct', 'riktige')} (${res.score}%)</b> — ${res.passed ? T('Passed! Course completed.', 'Bestått! Kurset er fullført.') : T('You need 80 % to pass. Read the lessons and try again.', 'Du trenger 80 % for å bestå. Les leksjonene og prøv igjen.')}</span></div>` : ''}
            ${c.quiz.map((q, i) => `<fieldset class="q"><legend><b>${i + 1}. ${esc(L(q.q))}</b></legend>${q.options.map((o, j) => `<label class="opt ${res ? (j === q.correct ? 'right' : '') : ''}"><input type="radio" name="q${i}" value="${j}" required><span>${esc(L(o))}</span></label>`).join('')}</fieldset>`).join('')}
            <button class="btn btn-dark btn-block">${T('Submit answers', 'Send svar')}</button></form>` : ''}</li></ol>
    </div>`;
  }

  // ================= DOCUMENTS =================
  const DCAT = () => ({ handbook: [T('Employee handbook', 'Personalhåndbok'), 'book'], safety: [T('Health & safety', 'HMS'), 'shield'], policy: [T('Policies', 'Retningslinjer'), 'doc'] });
  function docs() {
    const list = api.docs.list();
    const cats = DCAT();
    return `<div class="page-w narrow">
      ${head(T('Handbook & documents', 'Håndbok og dokumenter'), T('Company policies and handbooks. Procedures for the shift are in In store → Guides.', 'Retningslinjer og håndbøker. Rutiner for vakten ligger i I butikken → Guider.'))}
      <form class="search-big sm" data-form="docSearch"><span>${ic('search', 18)}</span><input class="input" name="q" placeholder="${T('Search documents…', 'Søk i dokumenter…')}" value="${esc(app.ui.docQ || '')}"></form>
      ${Object.keys(cats).map((k) => { const items = list.filter((d) => d.category === k && (!app.ui.docQ || U.normalize(L(d.title) + L(d.summary) + d.sections.map((s) => L(s.body)).join(' ')).includes(U.normalize(app.ui.docQ)))); return items.length ? `<h2 class="h3">${ic(cats[k][1], 18)} ${cats[k][0]}</h2><div class="guide-list">${items.map((d) => { const read = d.readBy.includes(me().id); return `<a class="guide-row" href="#/staff/community/doc/${d.id}"><span class="guide-ic">${ic('doc', 22)}</span><div><b>${esc(L(d.title))}</b><p class="small muted">${esc(L(d.summary))}</p><div class="small">${d.mandatory ? (read ? `<span class="badge badge-green">${T('Read', 'Lest')}</span>` : `<span class="badge badge-red">${T('Please read', 'Må leses')}</span>`) : ''} <span class="muted">v${esc(d.version)} · ${U.fmtDate(d.updatedAt)}</span></div></div>${ic('arrow', 18)}</a>`; }).join('')}</div>` : ''; }).join('')}
      ${K.mod('guides') ? `<a class="tool" href="#/staff/guides"><span class="tool-ic">${ic('book', 22)}</span><div><b>${T('Shift procedures', 'Rutiner for vakten')}</b><span class="small muted">${T('Step-by-step guides used by the AI assistant', 'Steg-for-steg-guider som AI-assistenten bruker')}</span></div>${ic('arrow', 18)}</a>` : ''}
    </div>`;
  }
  function doc(params) {
    const d = api.docs.get(params.id);
    if (!d) return K.empty('doc', T('Not found', 'Ikke funnet'));
    const read = d.readBy.includes(me().id);
    const size = api.people.all().length;
    return `<div class="page-w narrow">
      <a href="#/staff/community/docs" class="back">${ic('back', 18)} ${T('Handbook', 'Håndbok')}</a>
      <header class="guide-head"><span class="badge badge-demo">${T('Demo text', 'Demotekst')}</span><h1 class="h1">${esc(L(d.title))}</h1><p class="lead-sm">${esc(L(d.summary))}</p><p class="small muted">${T('Version', 'Versjon')} ${esc(d.version)} · ${T('updated', 'oppdatert')} ${U.fmtDate(d.updatedAt)}</p></header>
      <nav class="toc">${d.sections.map((s, i) => `<a href="#/staff/community/doc/${d.id}" data-action="scrollTo" data-to="sec-${i}">${esc(L(s.h))}</a>`).join('')}</nav>
      ${d.sections.map((s, i) => `<section class="doc-sec" id="sec-${i}"><h2 class="h3">${esc(L(s.h))}</h2><p>${esc(L(s.body))}</p></section>`).join('')}
      ${d.mandatory ? `<div class="read-box big">${read ? `<span class="green">${ic('check', 18)} ${T('You confirmed you have read and understood this document.', 'Du har bekreftet at du har lest og forstått dokumentet.')}</span>` : `<button class="btn btn-primary btn-block" data-action="confirmDoc" data-id="${d.id}">${ic('check', 18)} ${T('I have read and understood', 'Jeg har lest og forstått')}</button>`}
        ${isMgr() ? `<span class="small muted">${T('Confirmed by', 'Bekreftet av')} ${d.readBy.length}/${size}</span>` : ''}</div>` : ''}
      <p class="small muted center">${T('Questions? Ask the AI assistant or your manager.', 'Spørsmål? Spør AI-assistenten eller lederen din.')}</p>
    </div>`;
  }

  // ================= SURVEYS =================
  function surveys() {
    const list = api.surveys.list();
    return `<div class="page-w narrow">
      ${head(T('Surveys', 'Undersøkelser'), T('Tell us how things are going. Anonymous surveys never show who answered what.', 'Fortell oss hvordan det går. Anonyme undersøkelser viser aldri hvem som svarte hva.'))}
      ${list.map((s) => { const done = api.surveys.answered(s.id); return `<a class="guide-row" href="#/staff/community/survey/${s.id}"><span class="guide-ic">${ic('poll', 22)}</span><div><b>${esc(L(s.title))}</b><p class="small muted">${s.questions.length} ${T('questions', 'spørsmål')} · ~2 min · ${T('closes', 'stenger')} ${U.fmtDate(s.closesAt)}${s.anonymous ? ' · ' + T('anonymous', 'anonym') : ''}</p><div class="small">${done ? `<span class="badge badge-green">${T('Answered', 'Besvart')}</span>` : `<span class="badge badge-amber">${T('Open', 'Åpen')}</span>`} <span class="muted">${s.responses.length} ${T('responses', 'svar')}</span></div></div>${ic('arrow', 18)}</a>`; }).join('')}
    </div>`;
  }
  function survey(params) {
    const s = api.surveys.get(params.id);
    if (!s) return K.empty('poll', T('Not found', 'Ikke funnet'));
    const done = api.surveys.answered(s.id);
    const form = `<form class="stack" data-form="answerSurvey"><input type="hidden" name="id" value="${s.id}">
      ${s.questions.map((q, i) => `<fieldset class="card q"><legend><b>${i + 1}. ${esc(L(q.text))}</b></legend>
        ${q.type === 'scale10' ? `<div class="scale s10">${Array.from({ length: 11 }, (_, n) => `<label><input type="radio" name="${q.id}" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="row-between small muted"><span>${T('Not likely', 'Lite sannsynlig')}</span><span>${T('Very likely', 'Svært sannsynlig')}</span></div>`
        : q.type === 'scale5' ? `<div class="scale">${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="${q.id}" value="${n}" required><span>${n}</span></label>`).join('')}</div><div class="row-between small muted"><span>${esc(L(q.labels[0]))}</span><span>${esc(L(q.labels[1]))}</span></div>`
        : q.type === 'choice' ? q.options.map((o, j) => `<label class="opt"><input type="radio" name="${q.id}" value="${j}"><span>${esc(L(o))}</span></label>`).join('')
        : `<textarea class="input" name="${q.id}" rows="3" placeholder="${T('Optional', 'Valgfritt')}"></textarea>`}</fieldset>`).join('')}
      <button class="btn btn-primary btn-block btn-lg">${T('Send answers', 'Send svar')}</button></form>`;
    const results = isMgr() ? api.surveys.results(s.id) : null;
    return `<div class="page-w narrow">
      <a href="#/staff/community/surveys" class="back">${ic('back', 18)} ${T('Surveys', 'Undersøkelser')}</a>
      ${head(esc(L(s.title)), s.anonymous ? `${ic('lock', 13)} ${T('Anonymous — your name is never stored with your answers.', 'Anonym — navnet ditt lagres aldri sammen med svarene.')}` : '')}
      ${done ? `<div class="notice notice-green">${ic('check', 18)} <span>${T('Thanks! Your answers were sent.', 'Takk! Svarene dine er sendt.')}</span></div>` : form}
      ${results ? `<h2 class="h3">${ic('chart', 18)} ${T('Results', 'Resultater')} · ${s.responses.length} ${T('responses', 'svar')} <span class="badge badge-ink">${T('Managers only', 'Kun ledere')}</span></h2>
        ${results.map((r) => `<section class="card"><b>${esc(L(r.q.text))}</b>
          ${r.enps !== undefined ? `<div class="enps"><b class="${r.enps >= 30 ? 'green' : r.enps < 0 ? 'red' : ''}">${r.enps > 0 ? '+' : ''}${r.enps}</b><span class="small muted">eNPS · ${T('average', 'snitt')} ${r.avg.toFixed(1)}</span></div>` : r.avg !== undefined ? `<p class="small muted">${T('Average', 'Snitt')} <b>${r.avg.toFixed(1)}</b> / 5</p>` : ''}
          ${r.dist ? `<div class="hbars">${r.dist.map((n, i) => { const max = Math.max(...r.dist, 1); return `<div><span class="small">${r.q.type === 'choice' ? esc(L(r.q.options[i])) : (r.q.type === 'scale5' ? i + 1 : i)}</span><i style="width:${n / max * 100}%"></i><b class="small">${n}</b></div>`; }).join('')}</div>` : ''}
          ${r.texts ? r.texts.map((x) => `<p class="small">“${esc(x)}”</p>`).join('') || '<p class="small muted">—</p>' : ''}</section>`).join('')}` : ''}
    </div>`;
  }

  // ================= KUDOS =================
  function kudos() {
    const list = api.kudos.list();
    const counts = {}; list.forEach((k) => (counts[k.toId] = (counts[k.toId] || 0) + 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return `<div class="page-w">
      ${head(T('Kudos', 'Ros'), T('Say thank you and celebrate great work. Everyone can see it.', 'Si takk og feire god innsats. Alle kan se det.'), `<button class="btn btn-primary btn-sm" data-action="giveKudos">${ic('heart', 16)} ${T('Give kudos', 'Gi ros')}</button>`)}
      <div class="kudos-w"><div class="kudo-wall">${list.map((k) => { const v = api.kudos.values.find((x) => x.id === k.value); const cheered = k.cheers.includes(me().id); return `<article class="kudo" style="--c:${v.color}">
        <div class="kudo-top"><span class="kv" style="--c:${v.color}">${ic(v.icon, 14)} ${esc(L(v.label))}</span><span class="small muted">${K.timeAgo(k.at)}</span></div>
        <div class="kudo-who">${K.avatar(person(k.toId), 48)}<div><b>${esc(person(k.toId).name)}</b><span class="small muted">${T('from', 'fra')} ${esc(person(k.fromId).name)}</span></div></div>
        <p>“${esc(L(k.text))}”</p>
        <button class="react ${cheered ? 'on' : ''}" data-action="cheer" data-id="${k.id}">👏 <span>${k.cheers.length || ''}</span></button></article>`; }).join('')}</div>
        <aside class="card"><h2 class="h3">${ic('trophy', 18)} ${T('Most appreciated', 'Mest verdsatt')}</h2><ol class="leader">${top.map(([id, n]) => `<li>${K.avatar(person(id), 32)}<b>${esc(person(id).name)}</b><span>${n} 🎉</span></li>`).join('')}</ol></aside></div>
    </div>`;
  }
  function kudosSheet(toId) {
    const people = api.people.all().filter((p) => p.id !== me().id);
    return `<form data-form="sendKudos" class="admin-sheet">${K.sheetHead(T('Give kudos', 'Gi ros'))}
      <label class="field-label">${T('To', 'Til')}</label><select class="input" name="toId" required><option value="">—</option>${people.map((p) => `<option value="${p.id}" ${p.id === toId ? 'selected' : ''}>${esc(p.name)} · ${esc(audName(p.locationId))}</option>`).join('')}</select>
      <p class="field-label">${T('For', 'For')}</p><div class="type-pick">${api.kudos.values.map((v, i) => `<label style="--c:${v.color}"><input type="radio" name="value" value="${v.id}" ${i === 0 ? 'checked' : ''}><span>${ic(v.icon, 20)}${esc(L(v.label))}</span></label>`).join('')}</div>
      <textarea class="input" name="text" rows="3" required placeholder="${T('What did they do?', 'Hva gjorde de?')}"></textarea>
      <button class="btn btn-primary btn-block">${ic('heart', 18)} ${T('Send kudos', 'Send ros')}</button></form>`;
  }

  // ================= PEOPLE =================
  function people() {
    const q = U.normalize(app.ui.peopleQ || '');
    const scope = app.ui.peopleScope || 'loc';
    let list = api.people.all();
    if (scope === 'loc') list = list.filter((p) => p.locationId === loc());
    if (q) list = list.filter((p) => U.normalize(p.name + ' ' + L(p.title)).includes(q));
    list.sort((a, b) => a.name.localeCompare(b.name));
    const now = new Date();
    return `<div class="page-w">
      ${head(T('Colleagues', 'Kolleger'), T('Find anyone, see who is at work and get in touch.', 'Finn hvem som helst, se hvem som er på jobb og ta kontakt.'))}
      <div class="filters"><form class="search-big sm" data-form="peopleSearch"><span>${ic('search', 18)}</span><input class="input" name="q" placeholder="${T('Search by name or role…', 'Søk på navn eller rolle…')}" value="${esc(app.ui.peopleQ || '')}"></form>
        <div class="seg seg-sm"><button class="${scope === 'loc' ? 'on' : ''}" data-action="peopleScope" data-s="loc">${esc(audName(loc()))}</button><button class="${scope === 'all' ? 'on' : ''}" data-action="peopleScope" data-s="all">${T('Whole company', 'Hele selskapet')}</button></div></div>
      <div class="people-grid">${list.map((p) => { const s = App.store.db.shifts.filter((x) => x.userId === p.id && x.published && W.shiftEnd(x) > now).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]; const on = s && W.shiftStart(s) <= now; const clocked = api.people.isClockedIn(p.id);
        return `<div class="pcard2">${K.avatar(p, 56, { status: clocked || on ? 'on' : '' })}<b>${esc(p.name)}</b><span class="small muted">${esc(L(p.title) || '')}</span><span class="small muted">${ic('location', 12)} ${esc(audName(p.locationId))}</span>
          <div class="row center-row">${(p.positions || []).map(K.posChip).join('')}</div>
          <span class="small ${on || clocked ? 'green' : 'muted'}">${on || clocked ? '● ' + T('At work now', 'På jobb nå') : s ? T('Next: ', 'Neste: ') + K.relDay(s.date) + ' ' + s.start : T('No shifts planned', 'Ingen planlagte vakter')}</span>
          ${p.id !== me().id ? `<div class="row center-row"><button class="icon-btn bordered" data-action="dmUser" data-id="${p.id}" title="${T('Message', 'Melding')}">${ic('chat', 18)}</button>${p.phone ? `<a class="icon-btn bordered" href="tel:${esc(p.phone.replace(/\s/g, ''))}" title="${T('Call', 'Ring')}">${ic('phone', 18)}</a>` : ''}<button class="icon-btn bordered" data-action="giveKudos" data-to="${p.id}" title="${T('Kudos', 'Ros')}">${ic('heart', 18)}</button></div>` : `<span class="badge badge-gray">${T('You', 'Deg')}</span>`}</div>`; }).join('')}</div>
    </div>`;
  }

  // ---------- actions ----------
  const re = (msg) => { if (msg) app.toast(msg); app.render(); };
  Object.assign(App.actions, {
    feedFilter(d) { app.ui.feedFilter = d.f; re(); },
    newPost() { app.modal(composer()); },
    like(d) { api.feed.like(d.id); re(); },
    toggleComments(d) { const o = app.ui.openComments = app.ui.openComments || {}; o[d.id] = !o[d.id]; re(); },
    confirmPost(d) { api.feed.confirmRead(d.id); re(T('Thanks for confirming', 'Takk for bekreftelsen')); },
    vote(d) { api.feed.vote(d.id, d.o); re(); },
    postMenu(d) {
      const p = api.feed.get(d.id);
      app.modal(`${K.sheetHead(T('Post', 'Innlegg'))}<div class="sheet-body stack">${isMgr() ? `<button class="btn btn-ghost btn-block" data-action="pinPost" data-id="${p.id}">${ic('pinned', 16)} ${p.pinned ? T('Unpin', 'Løsne') : T('Pin to top', 'Fest øverst')}</button>` : ''}<button class="btn btn-ghost btn-block" data-action="deletePost" data-id="${p.id}">${ic('trash', 16)} ${T('Delete post', 'Slett innlegg')}</button></div>`);
    },
    pinPost(d) { api.feed.togglePin(d.id); app.modal(null); re(); },
    deletePost(d) { app.confirm(T('Delete this post?', 'Slette innlegget?'), T('Delete', 'Slett'), () => { api.feed.remove(d.id); re(T('Post deleted', 'Innlegg slettet')); }, true); },
    newChat() { app.modal(newChatSheet()); },
    react(d) { api.chat.react(d.id, d.e); re(); },
    dmUser(d) { const c = api.chat.dm(d.id); app.go('#/staff/community/chat/' + c.id); },
    rsvp(d) { api.events.rsvp(d.id, d.v); re(d.v === 'yes' ? T('See you there! 🎉', 'Vi sees! 🎉') : T('Saved', 'Lagret')); },
    newEvent() { app.modal(eventEditor()); },
    openLesson(d) { app.ui.lesson = app.ui.lesson === d.id ? '__none' : d.id; re(); },
    lessonDone(d) { api.learning.completeLesson(d.c, d.id); const c = api.learning.get(d.c); const pr = api.learning.progress(c.id); const nx = c.lessons.find((l) => !pr.lessonsDone.includes(l.id)); app.ui.lesson = nx ? nx.id : 'quiz'; re(); },
    confirmDoc(d) { api.docs.confirmRead(d.id); re(T('Confirmed', 'Bekreftet')); },
    scrollTo(d) { const el = document.getElementById(d.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    giveKudos(d) { app.modal(kudosSheet(d.to)); },
    cheer(d) { api.kudos.cheer(d.id); re(); },
    peopleScope(d) { app.ui.peopleScope = d.s; re(); },
  });
  Object.assign(App.changes, { chatQ(el) { app.ui.chatQ = el.value; const pos = el.selectionStart; re(); const i = document.querySelector('[data-change="chatQ"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } } });
  Object.assign(App.forms, {
    createPost(data) {
      const opts = [data.opt1, data.opt2, data.opt3].map((x) => (x || '').trim()).filter(Boolean);
      api.feed.create({ audience: data.audience, title: data.title, text: data.text, image: data.image, mustRead: !!data.mustRead, pinned: !!data.pinned, pollOptions: opts });
      app.modal(null); app.ui.feedFilter = 'all'; app.go('#/staff/community'); app.toast(T('Posted', 'Publisert'));
    },
    comment(data) { api.feed.comment(data.id, data.text); const o = app.ui.openComments = app.ui.openComments || {}; o[data.id] = true; re(); },
    chatSearch() {},
    sendMsg(data) {
      const m = api.chat.send(data.id, data.text); if (!m) return;
      re();
      // DEMO: a colleague replies so the conversation feels live
      const c = App.store.db.channels.find((x) => x.id === data.id);
      if (App.config.app.demoMode && !(App.sync && App.sync.live) && (c.kind !== 'channel' || Math.random() < 0.6)) {
        const here = () => location.hash === '#/staff/community/chat/' + data.id || (location.hash === '#/staff/community/chat' && document.querySelector('[name=id][value="' + data.id + '"]'));
        setTimeout(() => { app.ui.typing = data.id; if (here()) re(); }, 900);
        setTimeout(() => { app.ui.typing = null; api.chat.simulateReply(data.id); if (here()) { api.chat.markRead(data.id); re(); } }, 2600);
      }
    },
    createChat(data) {
      const ids = [].concat(data.members || []);
      if (!ids.length) return app.toast(T('Pick at least one person', 'Velg minst én person'));
      const c = ids.length === 1 && !data.name ? api.chat.dm(ids[0]) : api.chat.createGroup(data.name || ids.map((id) => api.people.get(id).name.split(' ')[0]).join(', '), ids);
      app.modal(null); app.go('#/staff/community/chat/' + c.id);
    },
    createEvent(data) { api.events.create(data); app.modal(null); re(T('Event created', 'Arrangement opprettet')); },
    quiz(data) { const c = api.learning.get(data.id); const res = api.learning.submitQuiz(data.id, c.quiz.map((_, i) => data['q' + i])); app.ui.quizRes = Object.assign({ id: data.id }, res); re(res.passed ? T('Passed! 🎉', 'Bestått! 🎉') : T('Not quite — try again', 'Ikke helt — prøv igjen')); },
    docSearch(data) { app.ui.docQ = data.q; re(); },
    answerSurvey(data) { const id = data.id; delete data.id; api.surveys.respond(id, data); re(T('Thank you! 🙏', 'Tusen takk! 🙏')); window.scrollTo(0, 0); },
    sendKudos(data) { api.kudos.give(data.toId, data.value, data.text); app.modal(null); if (!location.hash.startsWith('#/staff/community/kudos')) app.go('#/staff/community/kudos'); re(T('Kudos sent 🎉', 'Ros sendt 🎉')); },
    peopleSearch(data) { app.ui.peopleQ = data.q; re(); },
  });

  const R = app.route;
  R('/staff/community', 'staff', guard(feed));
  R('/staff/community/post/:id', 'staff', guard(feed));
  R('/staff/community/chat', 'staff', guard(chat));
  R('/staff/community/chat/:id', 'staff', guard(chat));
  R('/staff/community/events', 'staff', guard(events));
  R('/staff/community/learning', 'staff', guard(learning));
  R('/staff/community/course/:id', 'staff', guard(course));
  R('/staff/community/docs', 'staff', guard(docs));
  R('/staff/community/doc/:id', 'staff', guard(doc));
  R('/staff/community/surveys', 'staff', guard(surveys));
  R('/staff/community/survey/:id', 'staff', guard(survey));
  R('/staff/community/kudos', 'staff', guard(kudos));
  R('/staff/community/people', 'staff', guard(people));
})();
