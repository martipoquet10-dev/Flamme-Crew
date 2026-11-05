/*
 * Community service: chat (channels, groups, direct messages), news feed with
 * must-read confirmations and polls, events + RSVP, training courses with quizzes,
 * documents with read confirmation, pulse surveys and recognition (kudos).
 *
 * DEMO: stored in this browser. Live: a backend with realtime delivery (e.g. WebSockets)
 * so messages reach colleagues' phones instantly; function names stay the same.
 */
(function () {
  const api = App.api;
  const db = () => App.store.db;
  const ApiError = api.ApiError;
  const me = () => api.auth.me();
  const req = (role) => { if (!api.auth.hasRole(role)) throw new ApiError('forbidden'); return me(); };
  const commit = (v) => { App.store.save(); return v; };
  const uid = App.util.uid;
  const T = (en, nb) => ({ en, nb });
  const user = (id) => db().users.find((u) => u.id === id);

  function isMember(ch, u) {
    const m = ch.members;
    if (m === 'all') return true;
    if (Array.isArray(m)) return m.includes(u.id);
    if (m.locationId && u.locationId !== m.locationId) return false;
    if (m.positions && !(u.positions || []).some((p) => m.positions.includes(p))) return false;
    return true;
  }
  const inAudience = (audience, u) => !audience || audience === 'all' || audience === u.locationId || (audience === 'managers' && u.role === 'admin');

  // ---------------- CHAT ----------------
  api.chat = {
    channels() {
      const u = req('staff');
      return db().channels.filter((c) => isMember(c, u)).map((c) => {
        const msgs = db().messages.filter((m) => m.channelId === c.id);
        const last = msgs[msgs.length - 1] || null;
        const read = db().chatRead[u.id + '|' + c.id] || '';
        const unread = msgs.filter((m) => m.userId !== u.id && m.at > read).length;
        return { ...c, last, unread, title: api.chat.title(c) };
      }).sort((a, b) => ((b.last && b.last.at) || '').localeCompare((a.last && a.last.at) || ''));
    },
    title(c) {
      if (c.kind !== 'dm') return App.util.L(c.name);
      const other = c.members.map(user).find((x) => x && x.id !== (me() || {}).id);
      return other ? other.name : '—';
    },
    other(c) { return c.kind === 'dm' ? c.members.map(user).find((x) => x && x.id !== me().id) : null; },
    get(id) { const u = req('staff'); const c = db().channels.find((x) => x.id === id); if (!c || !isMember(c, u)) throw new ApiError('forbidden'); return c; },
    members(c) { return db().users.filter((u) => u.role !== 'customer' && isMember(c, u)); },
    messages(id) { api.chat.get(id); return db().messages.filter((m) => m.channelId === id); },
    unreadTotal() { try { return api.chat.channels().reduce((s, c) => s + c.unread, 0); } catch (e) { return 0; } },
    // Returns null when there is nothing new (so no change is sent to the server)
    markRead(id) {
      const u = req('staff'); const k = u.id + '|' + id; const read = db().chatRead[k] || '';
      if (!db().messages.some((m) => m.channelId === id && m.userId !== u.id && m.at > read)) return null;
      db().chatRead[k] = new Date().toISOString(); return commit(true);
    },
    send(id, text) {
      const u = req('staff'); api.chat.get(id);
      const t = String(text || '').trim().slice(0, 2000); if (!t) return null;
      const m = { id: uid('m'), channelId: id, userId: u.id, at: new Date().toISOString(), text: t, reactions: {} };
      db().messages.push(m); db().chatRead[u.id + '|' + id] = m.at;
      return commit(m);
    },
    isMember,
    react(msgId, emoji) {
      const u = req('staff'); const m = db().messages.find((x) => x.id === msgId); if (!m) return;
      const list = m.reactions[emoji] = m.reactions[emoji] || [];
      const i = list.indexOf(u.id); if (i >= 0) list.splice(i, 1); else list.push(u.id);
      if (!list.length) delete m.reactions[emoji];
      commit(m);
    },
    dm(userId) {
      const u = req('staff');
      let c = db().channels.find((x) => x.kind === 'dm' && x.members.length === 2 && x.members.includes(u.id) && x.members.includes(userId));
      if (!c) { c = { id: uid('dm'), kind: 'dm', members: [u.id, userId] }; db().channels.push(c); commit(); }
      return c;
    },
    createGroup(name, memberIds) {
      const u = req('staff');
      const c = { id: uid('gr'), kind: 'group', name: T(name, name), icon: 'users', color: '#0D9488', members: [...new Set([u.id].concat(memberIds || []))], description: T('', '') };
      db().channels.push(c);
      db().messages.push({ id: uid('m'), channelId: c.id, userId: u.id, at: new Date().toISOString(), system: true, text: T(u.name + ' created the group', u.name + ' opprettet gruppen'), reactions: {} });
      return commit(c);
    },
    // DEMO ONLY: a colleague answers, so the chat feels alive in a demo.
    simulateReply(id) {
      if (!App.config.app.demoMode) return null;
      const u = me(); const c = db().channels.find((x) => x.id === id); if (!c) return null;
      const others = api.chat.members(c).filter((x) => x.id !== u.id);
      if (!others.length) return null;
      const who = others[Math.floor(Math.random() * others.length)];
      const lines = [T('👍', '👍'), T('Sounds good!', 'Høres bra ut!'), T('On it 💪', 'Fikser det 💪'), T('Thanks for the heads-up 🙏', 'Takk for beskjed 🙏'), T('I can help with that', 'Jeg kan hjelpe med det'), T('Perfect, see you at the shift', 'Perfekt, sees på vakt')];
      const m = { id: uid('m'), channelId: id, userId: who.id, at: new Date().toISOString(), text: lines[Math.floor(Math.random() * lines.length)], reactions: {}, demo: true };
      db().messages.push(m); return commit(m);
    },
  };

  // ---------------- FEED ----------------
  api.feed = {
    list(filter) {
      const u = req('staff');
      let list = db().posts.filter((p) => inAudience(p.audience, u));
      if (filter === 'mine') list = list.filter((p) => p.audience === u.locationId);
      if (filter === 'important') list = list.filter((p) => p.mustRead || p.pinned);
      return list.sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || b.at.localeCompare(a.at));
    },
    get(id) { return db().posts.find((p) => p.id === id); },
    unreadMustRead() { try { const u = me(); return api.feed.list().filter((p) => p.mustRead && !p.readBy.includes(u.id)); } catch (e) { return []; } },
    create(data) {
      const u = req('staff');
      if (data.audience === 'all' && !api.auth.hasRole('admin')) data.audience = u.locationId;
      const p = { id: uid('po'), authorId: u.id, audience: data.audience || u.locationId, at: new Date().toISOString(), title: data.title ? T(data.title, data.title) : null, text: T(data.text, data.text),
        image: data.image || null, pinned: !!data.pinned && api.auth.hasRole('admin'), mustRead: !!data.mustRead && api.auth.hasRole('admin'), likes: [], readBy: [u.id], comments: [] };
      if (data.pollOptions && data.pollOptions.length >= 2) p.poll = { options: data.pollOptions.map((t, i) => ({ id: 'o' + i, text: T(t, t), votes: [] })) };
      db().posts.unshift(p);
      if (p.mustRead) api.notifications.push(db().users.filter((x) => x.id !== u.id && inAudience(p.audience, x)).map((x) => x.id), T('Must read: ' + (data.title || data.text.slice(0, 40)), 'Må leses: ' + (data.title || data.text.slice(0, 40))), '#/staff/community', 'post');
      return commit(p);
    },
    like(id) { const u = req('staff'); const p = api.feed.get(id); const i = p.likes.indexOf(u.id); if (i >= 0) p.likes.splice(i, 1); else p.likes.push(u.id); commit(p); },
    comment(id, text) { const u = req('staff'); const p = api.feed.get(id); const t = String(text || '').trim(); if (!t) return; p.comments.push({ id: uid('cm'), userId: u.id, at: new Date().toISOString(), text: t }); commit(p); },
    confirmRead(id) { const u = req('staff'); const p = api.feed.get(id); if (!p.readBy.includes(u.id)) p.readBy.push(u.id); commit(p); },
    vote(id, optId) { const u = req('staff'); const p = api.feed.get(id); p.poll.options.forEach((o) => { o.votes = o.votes.filter((v) => v !== u.id); if (o.id === optId) o.votes.push(u.id); }); commit(p); },
    remove(id) { const u = req('staff'); const p = api.feed.get(id); if (p.authorId !== u.id && !api.auth.hasRole('admin')) throw new ApiError('forbidden'); db().posts = db().posts.filter((x) => x.id !== id); commit(); },
    togglePin(id) { req('admin'); const p = api.feed.get(id); p.pinned = !p.pinned; commit(p); },
    audienceSize(p) { return db().users.filter((x) => x.role !== 'customer' && inAudience(p.audience, x)).length; },
  };

  // ---------------- EVENTS ----------------
  api.events = {
    list() { const u = req('staff'); return db().events.filter((e) => inAudience(e.audience, u) && new Date(e.end) > new Date(Date.now() - 864e5)).sort((a, b) => a.start.localeCompare(b.start)); },
    rsvp(id, status) { const u = req('staff'); const e = db().events.find((x) => x.id === id); e.rsvps[u.id] = status; commit(e); },
    create(data) {
      req('admin');
      const e = { id: uid('ev'), kind: data.kind || 'social', title: T(data.title, data.title), description: T(data.description || '', data.description || ''),
        start: new Date(data.date + 'T' + (data.start || '18:00')).toISOString(), end: new Date(data.date + 'T' + (data.end || '20:00')).toISOString(), place: data.place || '', audience: data.audience || 'all', rsvps: {} };
      db().events.push(e); return commit(e);
    },
  };

  // ---------------- LEARNING ----------------
  api.learning = {
    courses() { const u = req('staff'); return db().courses.filter((c) => inAudience(c.audience, u)); },
    get(id) { return db().courses.find((c) => c.id === id); },
    progress(courseId, userId) {
      const u = me(); const k = (userId || u.id) + '|' + courseId;
      return db().courseProgress[k] || { lessonsDone: [], quizScore: null, completedAt: null };
    },
    pct(c, userId) { const p = api.learning.progress(c.id, userId); if (p.completedAt) return 100; return Math.round((p.lessonsDone.length / (c.lessons.length + 1)) * 100); },
    completeLesson(courseId, lessonId) {
      const u = req('staff'); const k = u.id + '|' + courseId;
      const p = db().courseProgress[k] = db().courseProgress[k] || { lessonsDone: [], quizScore: null, completedAt: null };
      if (!p.lessonsDone.includes(lessonId)) p.lessonsDone.push(lessonId);
      return commit(p);
    },
    submitQuiz(courseId, answers) {
      const u = req('staff'); const c = api.learning.get(courseId); const k = u.id + '|' + courseId;
      const p = db().courseProgress[k] = db().courseProgress[k] || { lessonsDone: [], quizScore: null, completedAt: null };
      const right = c.quiz.filter((q, i) => Number(answers[i]) === q.correct).length;
      p.quizScore = Math.round((right / c.quiz.length) * 100);
      if (p.quizScore >= 80) { p.completedAt = new Date().toISOString(); c.lessons.forEach((l) => { if (!p.lessonsDone.includes(l.id)) p.lessonsDone.push(l.id); }); }
      commit(p); return { score: p.quizScore, right, total: c.quiz.length, passed: p.quizScore >= 80 };
    },
    mandatoryOpen(userId) { try { return api.learning.courses().filter((c) => c.mandatory && !api.learning.progress(c.id, userId).completedAt); } catch (e) { return []; } },
  };

  // ---------------- DOCUMENTS ----------------
  api.docs = {
    list() { req('staff'); return db().documents; },
    get(id) { req('staff'); return db().documents.find((d) => d.id === id); },
    confirmRead(id) { const u = req('staff'); const d = api.docs.get(id); if (!d.readBy.includes(u.id)) d.readBy.push(u.id); commit(d); },
  };

  // ---------------- SURVEYS ----------------
  const anonKey = (u, s) => 'a' + Math.abs([...(u.id + s.id)].reduce((h, c) => (h * 33 + c.charCodeAt(0)) | 0, 7)).toString(36);
  api.surveys = {
    list() { const u = req('staff'); return db().surveys.filter((s) => inAudience(s.audience, u)); },
    get(id) { return db().surveys.find((s) => s.id === id); },
    answered(id) { const u = me(); const s = api.surveys.get(id); return s.responses.some((r) => r.by === (s.anonymous ? anonKey(u, s) : u.id)); },
    respond(id, answers) {
      const u = req('staff'); const s = api.surveys.get(id);
      if (api.surveys.answered(id)) throw new ApiError('already_answered');
      s.responses.push({ by: s.anonymous ? anonKey(u, s) : u.id, answers, at: new Date().toISOString() });
      return commit(s);
    },
    results(id) {
      req('admin'); const s = api.surveys.get(id);
      return s.questions.map((q) => {
        const vals = s.responses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== '' && v !== null);
        if (q.type === 'scale10') { const pro = vals.filter((v) => v >= 9).length, det = vals.filter((v) => v <= 6).length; return { q, n: vals.length, enps: vals.length ? Math.round(((pro - det) / vals.length) * 100) : 0, avg: vals.reduce((a, b) => a + Number(b), 0) / (vals.length || 1), dist: Array.from({ length: 11 }, (_, i) => vals.filter((v) => Number(v) === i).length) }; }
        if (q.type === 'scale5') return { q, n: vals.length, avg: vals.reduce((a, b) => a + Number(b), 0) / (vals.length || 1), dist: [1, 2, 3, 4, 5].map((i) => vals.filter((v) => Number(v) === i).length) };
        if (q.type === 'choice') return { q, n: vals.length, dist: q.options.map((_, i) => vals.filter((v) => Number(v) === i).length) };
        return { q, n: vals.length, texts: vals };
      });
    },
  };

  // ---------------- RECOGNITION ----------------
  api.kudos = {
    values: [
      { id: 'teamwork', icon: 'users', color: '#2563EB', label: T('Team player', 'Lagspiller') },
      { id: 'guest', icon: 'star', color: '#F08C00', label: T('Guest hero', 'Gjestehelt') },
      { id: 'quality', icon: 'flame', color: '#D8282F', label: T('Quality', 'Kvalitet') },
      { id: 'leader', icon: 'shield', color: '#2F9E44', label: T('Leadership', 'Lederskap') },
      { id: 'helpful', icon: 'heart', color: '#C2255C', label: T('Always helpful', 'Alltid hjelpsom') },
    ],
    list() { req('staff'); return db().kudos.slice().sort((a, b) => b.at.localeCompare(a.at)); },
    give(toId, value, text) {
      const u = req('staff'); if (toId === u.id) throw new ApiError('forbidden');
      const k = { id: uid('k'), fromId: u.id, toId, value, text: T(text, text), at: new Date().toISOString(), cheers: [] };
      db().kudos.unshift(k);
      api.notifications.push(toId, T(u.name + ' gave you kudos 🎉', u.name + ' ga deg ros 🎉'), '#/staff/community/kudos', 'kudos');
      return commit(k);
    },
    cheer(id) { const u = req('staff'); const k = db().kudos.find((x) => x.id === id); const i = k.cheers.indexOf(u.id); if (i >= 0) k.cheers.splice(i, 1); else k.cheers.push(u.id); commit(k); },
  };
})();
