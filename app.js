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
  const fresh = () => ({ log: {}, prefs: { a: 2, b: 4, c: 0 }, onboarded: false, revealed: false, shown: 0, tipHidden: false });
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
      const at = slot => addDays(monday, (((w.days || state.prefs)[slot]) + 6) % 7);
      out.push({ id: `w${i + 1}a`, week: i + 1, slot: 'a', kind: 'ef', date: at('a'), title: 'Footing EF', detail: w.ef });
      out.push({ id: `w${i + 1}b`, week: i + 1, slot: 'b', kind: 'q', date: at('b'), title: 'Fractionné', detail: `${w.q}`, extra: w.wu || '' });
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

  const doneList = () => sessions.filter(s => status(s) === 'done');
  const raceDone = () => status(sessions[TOTAL - 1]) === 'done';
  const totalKm = () => doneList().reduce((t, s) => t + (parseFloat(state.log[s.id].km) || 0), 0);
  const stitchesFor = () => raceDone() ? Knit.total : Math.floor(Knit.total * doneList().length / TOTAL);
  const weekIndex = d => Math.min(PLAN.weeks.length, Math.max(1, Math.floor(between(START, d) / 7) + 1));
  const currentWeek = () => weekIndex(today());
  const NW = PLAN.weeks.length;
  const wnum = w => w - 1 + (PLAN.firstNum ?? 1); // numéro affiché

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
    [Math.round(TOTAL / 3)]: 'Un tiers du patron. Il se passe des choses sur ces aiguilles.',
    [Math.round(TOTAL / 2)]: 'La moitié. Le motif du milieu apparaît, regarde bien.',
    [Math.round(TOTAL * 2 / 3)]: 'Deux tiers. Tu as fait le plus long.',
    [TOTAL - 7]: 'Il ne reste presque plus rien à tricoter.',
    [TOTAL - 1]: 'Dernier rang d\'entraînement. Il ne manque que la finition : elle se tricote le 7 mars.'
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

  const ICONS = {
    ef: '<path d="M2.5 17.5 4.5 10l4 1 2.2-3.2 5.8 4.2 5 1.2V16a2 2 0 0 1-2 2H4a1.5 1.5 0 0 1-1.5-.5z"/><path d="M8.5 11.5l1 2M11.5 10.5l1 2"/>',
    q: '<path d="M13 2.5 4.5 13.5h6.5l-1 8 8.5-11h-6.5z"/>',
    long: '<path d="M3 19.5 9 9l4 6.5 3-4.5 5 8.5z"/><circle cx="17" cy="5.5" r="2"/>',
    race: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 3l3.5 6.5L15.5 3M12 12.5v5"/>'
  };
  const ico = k => `<svg viewBox="0 0 24 24">${ICONS[k]}</svg>`;

  function renderHome(animate) {
    const t = today();
    const toRace = between(t, RACE);
    $('#hello').textContent = greeting();
    $('#today-date').textContent = `${DAYS_LONG[t.getDay()]} ${t.getDate()} ${MONTHS[t.getMonth()].replace('.', '')}`;
    $('#countdown').textContent = toRace > 0 ? `J-${toRace}` : toRace === 0 ? 'Jour J' : 'Fini';
    $('#race-line').textContent = toRace > 0 ? 'avant ton semi-marathon' : toRace === 0 ? 'c\'est aujourd\'hui' : 'semi-marathon bouclé';
    const wk = t < START ? 1 : currentWeek();
    $('#phase-line').innerHTML = `<span>${t < START ? `Départ lundi ${START.getDate()} oct.` : `Semaine ${wnum(wk)}/${wnum(NW)} · ${PLAN.weeks[wk - 1].phase}`}</span>`;

    const target = stitchesFor();
    const dur = Knit.render(pull, target, animate && target > state.shown);
    state.shown = target; save();
    const done = doneList().length;
    $('#row-pill').textContent = `Rang ${done}/${TOTAL}`;
    $('#m-sessions').textContent = done;
    $('#m-km').textContent = String(Math.round(totalKm() * 10) / 10).replace('.', ',');
    $('#m-pct').textContent = `${Math.round(target / Knit.total * 100)} %`;
    $('#knit-hint').textContent = done === 0
      ? 'Rien sur les aiguilles. Ta première séance monte les mailles.'
      : raceDone() ? 'Terminé. Touche-le pour le revoir.' : 'Ce que ça devient, tu le découvriras en route.';
    renderToday();
    renderWeek(wk);
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
      el.className = 'card today k-race';
      el.innerHTML = `<span class="t-ico">${ico('race')}</span><p class="when">Terminé</p>
        <h2>${r.time ? `21,1 km en ${esc(r.time)}` : '21,1 km'}</h2><p class="detail">Le patron est fini. Le pull aussi.</p>
        <button class="btn" id="see">Revoir mon pull</button>`;
      $('#see').onclick = () => openReveal();
      return;
    }
    const missed = sessions.filter(s => !status(s) && s.date < t && s.week === currentWeek());
    const missedNote = missed.length ? `<p class="also">${missed.map(s => s.title).join(', ')} pas noté${missed.length > 1 ? 's' : ''}. Fait ? <button class="link inline" data-open="${missed[0].id}">Le noter</button>. Sinon, on ne rattrape pas.</p>` : '';
    if (!nx) { el.className = 'card today'; el.innerHTML = missedNote; return; }
    const isToday = +nx.date === +t;
    const beforeStart = t < START;
    const gap = between(t, nx.date);
    const when = isToday ? 'Aujourd\'hui' : gap === 1 ? 'Demain' : beforeStart ? `Premier rang · ${fmt(nx.date)}` : `${DAYS_LONG[nx.date.getDay()]} ${nx.date.getDate()}`;
    const doneToday = sessions.some(s => +s.date === +t && status(s) === 'done');
    const rest = doneToday ? '<p class="rest">Rang du jour tricoté. Place à la récup.</p>'
      : !isToday && !beforeStart ? '<p class="rest">Aujourd\'hui, repos. Il fait aussi partie du patron.</p>' : '';
    el.className = `card today k-${nx.kind}`;
    el.innerHTML = `${rest}<span class="t-ico">${ico(nx.kind)}</span>
      <p class="when">${when}</p>
      <h2>${nx.title}</h2>
      <p class="detail">${esc(nx.detail)}${nx.extra ? `<small>${esc(nx.extra)}</small>` : ''}</p>
      <button class="btn" data-open="${nx.id}">${nx.kind === 'race' ? 'J\'ai passé la ligne' : isToday ? 'Séance faite, je tricote' : 'Déjà faite ? La noter'}</button>
      ${missedNote}`;
  }

  // Bandeau de la semaine + anneau
  function renderWeek(wk) {
    const t = today();
    const list = sessions.filter(s => s.week === wk);
    const done = list.filter(s => status(s) === 'done').length;
    const C = 2 * Math.PI * 30;
    $('#ring').innerHTML = `<svg viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r="30" stroke="rgba(255,255,255,.25)" stroke-width="8" fill="none"/>
        <circle cx="38" cy="38" r="30" stroke="#fff" stroke-width="8" fill="none" stroke-linecap="round"
          stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done / 3)}" transform="rotate(-90 38 38)" style="transition:stroke-dashoffset 1s ease"/>
        <text x="38" y="44" text-anchor="middle">${done}/3</text></svg>cette semaine`;
    const monday = addDays(START, (wk - 1) * 7);
    let html = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const s = list.find(x => +x.date === +d);
      const cls = [s ? 'has' : '', s && status(s) || '', +d === +t ? 'now' : ''].join(' ');
      html += `<button class="${cls}" ${s ? `data-open="${s.id}"` : 'disabled'} aria-label="${DAYS_LONG[d.getDay()]} ${d.getDate()}${s ? ` : ${s.title}` : ''}">
        <span class="d">${'DLMMJVS'[d.getDay()]}</span><span class="n">${d.getDate()}</span><span class="dot"></span></button>`;
    }
    $('#strip').innerHTML = html;
    const st = streak();
    if (st > 1) $('#phase-line').innerHTML += `<span>${st} semaines tenues</span>`;
  }

  function renderPlan() {
    const t = today();
    const cw = t < START ? 1 : currentWeek();
    $('#weeks').innerHTML = PLAN.weeks.map((w, i) => {
      const n = i + 1;
      const list = sessions.filter(s => s.week === n);
      const mon = addDays(START, i * 7), sun = addDays(mon, 6);
      return `<details class="week ${n === cw ? 'current' : n < cw ? 'past' : ''}" ${n === cw ? 'open' : ''} id="wk${n}">
        <summary>
          <span class="num">${wnum(n)}</span>
          <span class="wt"><b>${w.phase}</b><small>${mon.getDate()} ${MONTHS[mon.getMonth()]} → ${sun.getDate()} ${MONTHS[sun.getMonth()]}</small></span>
          <span class="dots">${list.map(s => `<i class="${status(s) || ''}"></i>`).join('')}</span>
        </summary>
        <div class="body">
          <p class="goal">${esc(w.goal)} · ${esc(w.intensity)}</p>
          ${list.map(s => `<button class="sess ${status(s) || ''} ${s.kind === 'race' ? 'race' : ''}" data-open="${s.id}">
            <span class="day"><small>${DAYS[s.date.getDay()]}</small><b>${s.date.getDate()}</b><small>${MONTHS[s.date.getMonth()]}</small></span>
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
    $('#s-when').textContent = `Semaine ${wnum(s.week)} · ${fmt(s.date)}`;
    $('#s-title').textContent = s.title;
    $('#s-ico').className = `s-ico k-${s.kind}`;
    $('#s-ico').innerHTML = ico(s.kind);
    $('#s-detail').innerHTML = esc(s.detail) + (s.extra ? `<br><small>${esc(s.extra)}</small>` : '');
    form.km.value = l.km || (s.kind === 'race' ? '21,1' : '');
    form.min.value = l.min || '';
    form.hr.value = l.hr || '';
    form.time.value = l.time || '';
    setRpe(l.rpe || 6);
    form.note.value = l.note || '';
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
  form.addEventListener('input', updatePace);

  // Effort ressenti : 10 pastilles, du rose pâle au framboise
  const RPE_TXT = ['', 'balade', 'très facile', 'facile', 'confortable', 'modéré', 'soutenu', 'difficile', 'très dur', 'à fond', 'maximal'];
  const rpeColor = n => `hsl(${345 - n * 1.5} ${60 + n * 3}% ${78 - n * 3.6}%)`;
  $('#rpe-row').innerHTML = Array.from({ length: 10 }, (_, i) => `<button type="button" data-rpe="${i + 1}">${i + 1}</button>`).join('');
  function setRpe(n) {
    form.rpe.value = n;
    $$('#rpe-row button').forEach(b => {
      const on = +b.dataset.rpe === +n;
      b.classList.toggle('on', on);
      b.style.background = on ? rpeColor(n) : '';
    });
    $('#rpe-label').textContent = `${n}/10 · ${RPE_TXT[n]}`;
  }
  $('#rpe-row').addEventListener('click', e => { const b = e.target.closest('[data-rpe]'); if (b) setRpe(+b.dataset.rpe); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const s = editing;
    const wasDone = status(s) === 'done';
    state.log[s.id] = {
      s: 'done', km: form.km.value.trim(), min: form.min.value.trim(), hr: form.hr.value.trim(),
      rpe: +form.rpe.value, note: form.note.value.trim(), time: form.time.value.trim(), at: Date.now()
    };
    save(); closeSheet();
    if (s.kind === 'race') { renderAll(); openReveal(true); return; }
    showView('v-home');
    const dur = renderHome(true);
    renderPlan();
    if (!wasDone) setTimeout(() => toast(cheer(s)), Math.min(dur, 1800));
  });
  $('#s-skip').onclick = () => {
    state.log[editing.id] = { s: 'skip', at: Date.now() };
    save(); closeSheet(); renderAll();
    toast('Noté. On ne rattrape pas : prochaine séance comme prévu.');
  };
  $('#s-clear').onclick = () => {
    delete state.log[editing.id];
    save(); closeSheet(); renderAll();
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

  // ---------- Démarrage ----------
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function renderAll(animate) { renderHome(!!animate); renderPlan(); }

  renderGuide();
  renderPicks('pick');
  renderPicks('ob');
  // Les mailles gagnées depuis la dernière visite se tricotent sous ses yeux
  Knit.render(pull, Math.min(state.shown, stitchesFor()));
  renderAll(true);

  if (!state.onboarded) $('#onboard').hidden = false;
  $('#ob-go').onclick = () => { state.onboarded = true; save(); $('#onboard').hidden = true; };

  const standalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  if (isIOS && !standalone() && !state.tipHidden) $('#install-tip').hidden = false;
  $('#install-close').onclick = () => { state.tipHidden = true; save(); $('#install-tip').hidden = true; };

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) renderHome(true); });
  if (location.hash === '#plan') showView('v-plan');
})();
