(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const KEY = 'maille-a-maille-v1';
  const DAY = 864e5;
  const DAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  const DAYS_LONG = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  // Créneaux possibles pour chaque séance de la semaine (jour JS : 0 = dimanche)
  const SLOTS = {
    a: { label: 'Footing EF', options: [1, 2, 3] },
    b: { label: 'Fractionné', options: [4, 5] },
    c: { label: 'Sortie longue', options: [6, 0] }
  };

  // ---------- État ----------
  const fresh = () => ({ log: {}, prefs: { a: 2, b: 4, c: 0, tWeek: '18:30', tWeekend: '09:30' }, onboarded: false, revealed: false, shown: 0, tipHidden: false, pushId: null });
  let state;
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { state = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  // ---------- Dates ----------
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const fmt = d => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  const between = (a, b) => Math.round((b - a) / DAY);
  const START = parse(PLAN.start), RACE = parse(PLAN.race.date);

  // ---------- Séances ----------
  function buildSessions() {
    const out = [];
    PLAN.weeks.forEach((w, i) => {
      const monday = addDays(START, i * 7);
      const last = i === PLAN.weeks.length - 1;
      const at = slot => addDays(monday, (state.prefs[slot] + 6) % 7);
      out.push({ id: `w${i + 1}a`, week: i + 1, slot: 'a', kind: 'ef', date: at('a'), title: 'Footing EF', detail: w.ef });
      out.push({ id: `w${i + 1}b`, week: i + 1, slot: 'b', kind: 'q', date: at('b'), title: 'Fractionné', detail: `${w.q}`, extra: w.wu });
      out.push(last
        ? { id: `w${i + 1}c`, week: i + 1, slot: 'c', kind: 'race', date: RACE, title: 'Le semi', detail: '21,1 km · le grand jour' }
        : { id: `w${i + 1}c`, week: i + 1, slot: 'c', kind: 'long', date: at('c'), title: 'Sortie longue', detail: w.long });
    });
    return out;
  }
  let sessions = buildSessions();
  const TOTAL = sessions.length;
  const byId = id => sessions.find(s => s.id === id);
  const status = s => (state.log[s.id] || {}).s;
  const timeFor = s => (s.date.getDay() === 0 || s.date.getDay() === 6) ? state.prefs.tWeekend : state.prefs.tWeek;

  const doneList = () => sessions.filter(s => status(s) === 'done');
  const raceDone = () => status(sessions[TOTAL - 1]) === 'done';
  const totalKm = () => doneList().reduce((t, s) => t + (parseFloat(state.log[s.id].km) || 0), 0);
  const stitchesFor = () => raceDone() ? Knit.total : Math.floor(Knit.total * doneList().length / TOTAL);
  const weekIndex = d => Math.min(PLAN.weeks.length, Math.max(1, Math.floor(between(START, d) / 7) + 1));
  const currentWeek = () => weekIndex(today());

  // Semaines tenues d'affilée (au moins 2 séances, la règle du plan)
  function streak() {
    let n = 0;
    const cw = currentWeek();
    const done = w => sessions.filter(s => s.week === w && status(s) === 'done').length;
    if (today() >= START && done(cw) >= 2) n++;
    for (let w = cw - 1; w >= 1; w--) { if (done(w) >= 2) n++; else break; }
    return n;
  }

  // ---------- Messages ----------
  const CHEERS = [
    'Un rang de plus. Les mailles commencent à se tenir.',
    'Bien joué. Ton tricot a pris un centimètre.',
    'Séance rangée dans la pelote. Repos mérité.',
    'Maille à l\'endroit, maille à l\'envers, kilomètre après kilomètre.',
    'Tu viens d\'ajouter des mailles que personne ne pourra défaire.',
    'Les jambes travaillent, les aiguilles aussi.',
    'Encore un rang. Le motif se dessine.',
    'C\'est fait. Le plus dur, c\'était de sortir.',
    'Belle régularité. Les tricoteuses diraient : tension parfaite.',
    'Rang terminé. Bois un verre d\'eau, et un chocolat chaud si tu veux.',
    'Ça avance. Doucement, mais ça ne se détricote pas.',
    'Pas de maille filée aujourd\'hui. Bravo.',
    'Tu cours, ça tricote. Tout va bien.',
    'Une séance de plus dans les jambes, un rang de plus sur les aiguilles.'
  ];
  const BY_KIND = {
    q: ['Fractionné bouclé. C\'est là que les mailles se resserrent.', 'Les fractions, c\'est le point de riz du running : pénible, mais c\'est ce qui fait la différence.'],
    long: ['Sortie longue terminée. C\'est le rang le plus long de la semaine.', 'La sortie longue, c\'est la laine de fond. Sans elle, rien ne tient.'],
    ef: ['Footing en aisance. Le genre de rang qu\'on tricote en papotant.']
  };
  const MILESTONES = {
    1: 'Premier rang. Tu viens de monter tes mailles. On ne sait pas encore ce que ça deviendra.',
    10: 'Dix séances. Regarde : ça commence à ressembler à quelque chose.',
    19: 'Un tiers du patron. Il se passe des choses sur ces aiguilles.',
    29: 'La moitié. Le motif du milieu apparaît, regarde bien.',
    38: 'Deux tiers. Tu as fait le plus long.',
    50: 'Cinquante rangs. Il ne reste presque plus rien à tricoter.',
    56: 'Dernier rang d\'entraînement. Il ne manque que la finition : elle se tricote le 7 mars.'
  };
  function cheer(s) {
    const n = doneList().length;
    if (MILESTONES[n]) return MILESTONES[n];
    const pool = CHEERS.concat(BY_KIND[s.kind] || []);
    return pool[(n * 7 + s.week) % pool.length];
  }

  // ---------- Rendu ----------
  const pull = $('#pull');
  Knit.mount(pull);

  function renderHome(animate) {
    const t = today();
    const toRace = between(t, RACE);
    $('#hello').textContent = greeting();
    $('#countdown').innerHTML = toRace > 0 ? `J-${toRace}` : toRace === 0 ? 'C\'est <em>aujourd\'hui</em>' : 'Semi <em>bouclé</em>';
    $('#race-line').textContent = toRace > 0 ? `avant ton semi, ${fmt(RACE)} 2027` : PLAN.race.label;

    const target = stitchesFor();
    const dur = Knit.render(pull, target, animate && target > state.shown);
    state.shown = target; save();
    const done = doneList().length;
    $('#m-sessions').textContent = `${done}/${TOTAL}`;
    $('#m-km').textContent = Math.round(totalKm() * 10) / 10 || 0;
    const pct = Math.round(target / Knit.total * 100);
    $('#m-pct').textContent = `${pct} %`;
    setTimeout(() => { $('#bar').style.width = `${pct}%`; }, animate ? 200 : 0);
    $('#knit-hint').textContent = done === 0
      ? 'Rien sur les aiguilles pour l\'instant. Chaque séance tricote un rang.'
      : raceDone() ? 'Terminé. Touche pour le revoir.' : 'Ce que ça devient, tu le découvriras en route.';
    renderToday();
    renderWeek();
    updateBadge();
    return dur;
  }

  function greeting() {
    const h = new Date().getHours();
    return `${h < 6 ? 'Bonne nuit' : h < 18 ? 'Bonjour' : 'Bonsoir'} ${CONFIG.name}`;
  }

  function nextSession() {
    const t = today();
    return sessions.find(s => !status(s) && s.date >= t) || null;
  }

  function renderToday() {
    const el = $('#today-card');
    const t = today();
    const nx = nextSession();
    if (raceDone()) {
      const r = state.log[sessions[TOTAL - 1].id];
      el.innerHTML = `<span class="tag">Fini</span><h2>${r.time ? `21,1 km en ${esc(r.time)}` : '21,1 km'}</h2>
        <p class="detail">Le patron est terminé. Le pull aussi.</p><button class="btn" id="see">Revoir mon pull</button>`;
      $('#see').onclick = openReveal;
      return;
    }
    const missed = sessions.filter(s => !status(s) && s.date < t && s.week === currentWeek());
    const missedNote = missed.length ? `<p class="also">${missed.map(s => s.title).join(', ')} passé${missed.length > 1 ? 's' : ''} sans être noté${missed.length > 1 ? 's' : ''}. Fait ? <button class="link inline" data-open="${missed[0].id}">Le noter</button>. Sinon, on ne rattrape pas : on reprend le plan.</p>` : '';
    if (!nx) { el.innerHTML = missedNote; return; }
    const isToday = +nx.date === +t;
    const beforeStart = t < START;
    const when = isToday ? `Aujourd'hui · ${timeFor(nx)}` : beforeStart ? `Départ ${fmt(nx.date)}` : between(t, nx.date) === 1 ? `Demain · ${timeFor(nx)}` : `${DAYS_LONG[nx.date.getDay()]} · ${timeFor(nx)}`;
    const doneToday = sessions.some(s => +s.date === +t && status(s) === 'done');
    const rest = doneToday ? '<p class="rest">Rang du jour tricoté. Le reste de la journée, c\'est récup.</p>'
      : !isToday && !beforeStart ? '<p class="rest">Aujourd\'hui : repos. Le repos fait aussi partie du patron.</p>' : '';
    el.className = `card today ${isToday ? 'is-today' : ''} k-${nx.kind}`;
    el.innerHTML = `${rest}<span class="tag">${when}</span>
      <h2>${nx.title}</h2>
      <p class="detail">${esc(nx.detail)}${nx.extra ? `<br><small>${esc(nx.extra)}</small>` : ''}</p>
      <button class="btn" data-open="${nx.id}">${nx.kind === 'race' ? 'J\'ai passé la ligne' : isToday ? 'Séance faite, je tricote' : 'Je l\'ai déjà faite'}</button>
      ${missedNote}`;
  }

  function renderWeek() {
    const el = $('#week-card');
    const t = today();
    const wk = t < START ? 1 : currentWeek();
    const w = PLAN.weeks[wk - 1];
    const list = sessions.filter(s => s.week === wk);
    const done = list.filter(s => status(s) === 'done').length;
    const C = 2 * Math.PI * 26;
    const st = streak();
    el.innerHTML = `
      <svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="26" stroke="#F1E6DA" stroke-width="7" fill="none"/>
        <circle cx="32" cy="32" r="26" stroke="var(--terra)" stroke-width="7" fill="none" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / 3)}" transform="rotate(-90 32 32)"/>
        <text x="32" y="38" text-anchor="middle">${done}/3</text>
      </svg>
      <div class="wk">
        <p class="eyebrow">Semaine ${wk} · ${w.phase}</p>
        <b>${esc(w.goal)}</b>
        <div class="wk-days">${list.map(s => `<button data-open="${s.id}" class="${status(s) || ''} ${+s.date === +t ? 'now' : ''}"><span>${DAYS[s.date.getDay()].slice(0, 3)}</span>${s.kind === 'race' ? '21' : s.date.getDate()}</button>`).join('')}</div>
        ${st > 1 ? `<small class="streak">${st} semaines tenues d'affilée</small>` : ''}
      </div>`;
  }

  function renderPlan() {
    const t = today();
    const cw = t < START ? 1 : currentWeek();
    $('#weeks').innerHTML = PLAN.weeks.map((w, i) => {
      const n = i + 1;
      const list = sessions.filter(s => s.week === n);
      const mon = addDays(START, i * 7), sun = addDays(mon, 6);
      return `<details class="week ${n === cw ? 'current' : ''}" ${n === cw ? 'open' : ''} id="wk${n}">
        <summary>
          <span class="num">${n}</span>
          <span class="wt"><b>${w.phase}</b><small>${mon.getDate()} ${MONTHS[mon.getMonth()]} → ${sun.getDate()} ${MONTHS[sun.getMonth()]}</small></span>
          <span class="dots">${list.map(s => `<i class="${status(s) || ''}"></i>`).join('')}</span>
        </summary>
        <div class="body">
          <p class="goal">${esc(w.goal)} · ${esc(w.intensity)}</p>
          ${list.map(s => `<button class="sess ${status(s) || ''} ${s.kind === 'race' ? 'race' : ''}" data-open="${s.id}">
            <span class="day">${DAYS[s.date.getDay()]}<br>${s.date.getDate()} ${MONTHS[s.date.getMonth()]}</span>
            <span class="what"><b>${s.title}</b><small>${esc(s.detail)}</small>${logLine(s)}</span>
            <span class="st"></span></button>`).join('')}
          <p class="two">Seulement 2 séances cette semaine : ${esc(w.two || 'fractionné + sortie longue')}.</p>
        </div></details>`;
    }).join('');
  }

  function logLine(s) {
    const l = state.log[s.id];
    if (!l || l.s !== 'done') return '';
    const bits = [l.km && `${l.km} km`, l.min && `${l.min} min`, pace(l.km, l.min), l.time].filter(Boolean);
    return bits.length ? `<small class="logged">${bits.join(' · ')}</small>` : '';
  }

  function renderGuide() {
    $('#profile').textContent = PLAN.profile;
    $('#paces').innerHTML = PLAN.paces.map(p => `<div class="kv"><b>${p[0]}</b><span class="v">${p[2]}</span><small>${p[1]}. ${p[3]}</small></div>`).join('');
    $('#rules').innerHTML = PLAN.rules.map(r => `<div class="kv"><b>${r[0]}</b><small>${r[1]}</small></div>`).join('');
    $('#scenarios').innerHTML = PLAN.scenarios.map(r => `<div class="kv"><b>${r[0]} · <span class="v">${r[2]}</span></b><small>${r[1]} · ${r[3]}</small></div>`).join('');
  }

  // Sélecteurs de jours
  function renderPicks(prefix) {
    for (const k of Object.keys(SLOTS)) {
      const el = $(`#${prefix}-${k}`);
      el.innerHTML = `<span>${SLOTS[k].label}</span><div class="chips">${SLOTS[k].options.map(d =>
        `<button type="button" class="${state.prefs[k] === d ? 'on' : ''}" data-slot="${k}" data-day="${d}">${DAYS_LONG[d].slice(0, 3)}</button>`).join('')}</div>`;
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-slot]');
    if (!b) return;
    state.prefs[b.dataset.slot] = +b.dataset.day;
    save();
    sessions = buildSessions();
    renderPicks('pick'); renderPicks('ob');
    renderAll();
    syncPush();
  });

  // ---------- Feuille de saisie ----------
  const sheet = $('#sheet'), form = $('#s-form');
  let editing = null;
  function openSheet(id) {
    const s = byId(id);
    if (!s) return;
    editing = s;
    const l = state.log[id] || {};
    $('.sheet').classList.toggle('is-race', s.kind === 'race');
    $('#s-when').textContent = `Semaine ${s.week} · ${fmt(s.date)}`;
    $('#s-title').textContent = s.title;
    $('#s-detail').innerHTML = esc(s.detail) + (s.extra ? `<br><small>${esc(s.extra)}</small>` : '');
    form.km.value = l.km || (s.kind === 'race' ? '21,1' : '');
    form.min.value = l.min || '';
    form.hr.value = l.hr || '';
    form.time.value = l.time || '';
    form.rpe.value = l.rpe || 6;
    form.note.value = l.note || '';
    $('#rpe-out').textContent = form.rpe.value;
    updatePace();
    $('#s-submit').textContent = s.kind === 'race' ? 'Tricoter la finition' : l.s === 'done' ? 'Enregistrer' : 'Tricoter ce rang';
    $('#s-clear').hidden = !l.s;
    $('#s-skip').hidden = s.kind === 'race' || l.s === 'skip';
    sheet.hidden = false;
  }
  const closeSheet = () => { sheet.hidden = true; editing = null; };
  const num = v => parseFloat(String(v).replace(',', '.'));
  function pace(km, min) {
    km = num(km); min = num(min);
    if (!(km > 0 && min > 0)) return '';
    const p = min / km, m = Math.floor(p), sec = Math.round((p - m) * 60);
    return sec === 60 ? `${m + 1}:00/km` : `${m}:${String(sec).padStart(2, '0')}/km`;
  }
  function updatePace() {
    let min = form.min.value;
    if (editing && editing.kind === 'race' && form.time.value) min = hmsToMin(form.time.value);
    form.pace.value = pace(form.km.value, min);
  }
  const hmsToMin = t => { const p = t.split(/[:h'\s]+/).map(Number).filter(n => !isNaN(n)); return p.length === 3 ? p[0] * 60 + p[1] + p[2] / 60 : p.length === 2 ? p[0] * 60 + p[1] : NaN; };
  form.addEventListener('input', e => {
    if (e.target.name === 'rpe') $('#rpe-out').textContent = e.target.value;
    updatePace();
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = editing;
    const wasDone = status(s) === 'done';
    state.log[s.id] = {
      s: 'done', km: form.km.value.trim(), min: form.min.value.trim(), hr: form.hr.value.trim(),
      rpe: +form.rpe.value, note: form.note.value.trim(), time: form.time.value.trim(), at: Date.now()
    };
    save(); closeSheet(); syncPush();
    if (s.kind === 'race') { renderAll(); openReveal(true); return; }
    showView('v-home');
    const dur = renderHome(true);
    renderPlan();
    if (!wasDone) setTimeout(() => toast(cheer(s)), Math.min(dur, 1800));
  });
  $('#s-skip').onclick = () => {
    state.log[editing.id] = { s: 'skip', at: Date.now() };
    save(); closeSheet(); renderAll(); syncPush();
    toast('Noté. On ne rattrape pas : prochaine séance comme prévu.');
  };
  $('#s-clear').onclick = () => {
    delete state.log[editing.id];
    save(); closeSheet(); renderAll(); syncPush();
  };
  $('#s-cancel').onclick = closeSheet;
  sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open]');
    if (b) { e.preventDefault(); openSheet(b.dataset.open); }
  });

  let toastTimer;
  function toast(msg) {
    $('#toast-text').textContent = msg;
    const t = $('#toast');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 6000);
  }
  $('#toast').onclick = () => { $('#toast').hidden = true; };

  // ---------- Révélation ----------
  const finalSvg = $('#pull-final');
  Knit.mount(finalSvg);
  function openReveal(first) {
    const r = state.log[sessions[TOTAL - 1].id] || {};
    const km = Math.round(totalKm() * 10) / 10;
    $('#tag').innerHTML = `<b>Tricoté par ${esc(CONFIG.name)}</b>21,1 km${r.time ? ` en ${esc(r.time)}` : ''} · 7 mars 2027<br>${doneList().length} rangs · ${km} km de laine`;
    $('#love-note').textContent = CONFIG.loveNote;
    $('#reveal').hidden = false;
    Knit.render(finalSvg, 0);
    setTimeout(() => Knit.render(finalSvg, Knit.total, true), 400);
    confetti(first ? 7000 : 3500);
    state.revealed = true; save();
  }
  $('#reveal-close').onclick = () => { $('#reveal').hidden = true; showView('v-home'); renderHome(false); };
  pull.addEventListener('click', () => { if (raceDone()) openReveal(); });

  function confetti(ms) {
    const c = $('#confetti'), x = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; x.scale(dpr, dpr);
    const cols = ['#E4A39B', '#B5523B', '#8FA68A', '#D9A441', '#C97F78'];
    const ps = Array.from({ length: 120 }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight, r: 3 + Math.random() * 4,
      vy: 1.5 + Math.random() * 2.5, vx: -1 + Math.random() * 2, a: Math.random() * 6, c: cols[Math.random() * cols.length | 0]
    }));
    const end = performance.now() + ms;
    (function f(now) {
      x.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of ps) {
        p.y += p.vy; p.x += p.vx + Math.sin(p.a += .05) * .6;
        if (p.y > innerHeight + 10 && now < end) { p.y = -10; p.x = Math.random() * innerWidth; }
        x.fillStyle = p.c; x.beginPath(); x.ellipse(p.x, p.y, p.r, p.r * 1.7, p.a, 0, 7); x.fill();
      }
      if (now < end + 4000) requestAnimationFrame(f); else x.clearRect(0, 0, innerWidth, innerHeight);
    })(performance.now());
  }

  // ---------- Navigation ----------
  function showView(id) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === id));
    $$('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === id));
    scrollTo(0, 0);
    if (id === 'v-plan') {
      const cur = $('.week.current');
      if (cur) setTimeout(() => cur.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    }
  }
  $$('.tabs button').forEach(b => b.onclick = () => showView(b.dataset.view));

  // ---------- Réglages ----------
  for (const [id, k] of [['#t-week', 'tWeek'], ['#t-weekend', 'tWeekend']]) {
    $(id).value = state.prefs[k];
    $(id).onchange = e => { state.prefs[k] = e.target.value || state.prefs[k]; save(); renderAll(); syncPush(); };
  }
  $('#backup').onclick = async () => {
    const data = JSON.stringify(state);
    try { await navigator.clipboard.writeText(data); toast('Sauvegarde copiée. Colle-la dans tes notes.'); }
    catch { prompt('Copie ce texte et garde-le dans tes notes :', data); }
  };
  $('#restore').onclick = () => {
    const txt = prompt('Colle ta sauvegarde ici :');
    if (!txt) return;
    try {
      const d = JSON.parse(txt);
      if (!d.log) throw 0;
      state = Object.assign(fresh(), d, { shown: 0 });
      save(); sessions = buildSessions(); Knit.render(pull, 0); renderAll(); toast('Tricot restauré.');
    } catch { toast('Cette sauvegarde ne se lit pas.'); }
  };
  $('#reset').onclick = () => {
    if (!confirm('Tout détricoter ? Toutes tes séances seront effacées.')) return;
    const prefs = state.prefs;
    state = Object.assign(fresh(), { prefs, onboarded: true });
    save(); Knit.render(pull, 0); renderAll();
  };

  // ---------- Rappels push ----------
  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const pushReady = () => CONFIG.pushApi && CONFIG.vapidPublicKey && 'serviceWorker' in navigator && 'PushManager' in window;

  function renderPush() {
    const box = $('#push-box');
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    if (!CONFIG.pushApi) {
      box.innerHTML = '<p class="hint" style="margin-top:0">Les rappels ne sont pas encore branchés.</p>';
    } else if (isIOS && !standalone()) {
      box.innerHTML = `<p>Pour recevoir tes rappels, installe d'abord l'app : touche <span class="share-ico"></span> Partager, puis « Sur l'écran d'accueil ». Ouvre-la ensuite depuis l'icône.</p>`;
    } else if (!pushReady() || perm === 'unsupported') {
      box.innerHTML = '<p class="hint" style="margin-top:0">Ce navigateur ne gère pas les notifications.</p>';
    } else if (perm === 'denied') {
      box.innerHTML = '<p>Notifications refusées. Pour les réactiver : Réglages iPhone › Notifications › Maille à maille.</p>';
    } else if (state.pushId && perm === 'granted') {
      box.innerHTML = `<ul class="rem">
          <li><b>À l'heure de ta séance</b> ce qu'il y a au programme</li>
          <li><b>21h30</b> si la séance du jour n'est pas notée</li>
          <li><b>Dimanche soir</b> le bilan de ta semaine</li>
          <li><b>La veille du semi</b> un dernier mot</li></ul>
        <button class="btn ghost" id="push-test">M'envoyer un rappel test</button>
        <button class="link small" id="push-off">Couper les rappels</button>`;
      $('#push-test').onclick = () => api('/test', { id: state.pushId }).then(() => toast('Envoyé. Il arrive dans quelques secondes.')).catch(() => toast('Le serveur de rappels ne répond pas.'));
      $('#push-off').onclick = async () => {
        await api('/unsubscribe', { id: state.pushId }).catch(() => {});
        const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe();
        state.pushId = null; save(); renderPush();
      };
    } else {
      box.innerHTML = `<p>Un rappel à l'heure de ta séance, une relance si elle n'est pas notée, et le bilan du dimanche.</p>
        <button class="btn" id="push-on">Activer les rappels</button>`;
      $('#push-on').onclick = enablePush;
    }
  }

  async function enablePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { renderPush(); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CONFIG.vapidPublicKey) });
      state.pushId = state.pushId || (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
      save();
      await api('/subscribe', { id: state.pushId, sub: sub.toJSON(), ...schedulePayload() });
      renderPush();
      toast('Rappels activés.');
    } catch (err) {
      toast('Impossible d\'activer les rappels pour l\'instant.');
      console.error(err);
    }
  }

  function schedulePayload() {
    return {
      name: CONFIG.name,
      sessions: sessions.map(s => ({ id: s.id, week: s.week, kind: s.kind, date: iso(s.date), time: timeFor(s), title: s.title, detail: s.detail, s: status(s) || null }))
    };
  }
  let syncTimer;
  function syncPush() {
    if (!state.pushId || !CONFIG.pushApi) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => api('/sync', { id: state.pushId, ...schedulePayload() }).catch(() => {}), 600);
  }
  function api(path, body) {
    return fetch(CONFIG.pushApi.replace(/\/$/, '') + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => { if (!r.ok) throw new Error(r.status); return r; });
  }
  function b64u(s) {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
    return Uint8Array.from(b, c => c.charCodeAt(0));
  }

  // Badge sur l'icône : séances restantes cette semaine
  function updateBadge() {
    if (!('setAppBadge' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return;
    const left = sessions.filter(s => s.week === currentWeek() && !status(s)).length;
    (left ? navigator.setAppBadge(left) : navigator.clearAppBadge()).catch(() => {});
  }

  // ---------- Démarrage ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderAll(animate) { renderHome(!!animate); renderPlan(); renderPush(); }

  renderGuide();
  renderPicks('pick');
  renderPicks('ob');
  // Les mailles gagnées depuis la dernière visite se tricotent sous ses yeux
  Knit.render(pull, Math.min(state.shown, stitchesFor()));
  renderAll(true);

  if (!state.onboarded) $('#onboard').hidden = false;
  $('#ob-go').onclick = () => { state.onboarded = true; save(); $('#onboard').hidden = true; syncPush(); };

  if (isIOS && !standalone() && !state.tipHidden) $('#install-tip').hidden = false;
  $('#install-close').onclick = () => { state.tipHidden = true; save(); $('#install-tip').hidden = true; };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderHome(true); });
  if (location.hash === '#plan') showView('v-plan');
})();
