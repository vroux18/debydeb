// Le pull : une grille de mailles, tricotée du bas vers le haut, rang par rang.
const Knit = (() => {
  const W = 48, H = 54, S = 10; // colonnes, rangs, taille d'une maille (unités SVG)
  const C = {
    base: '#F7A8BE', rib: '#EC8AA8', ribDark: '#DE7396',
    cream: '#FFF6F0', terra: '#E0386F', sage: '#8FC4A0', mustard: '#FFC15E'
  };

  // Police 3×5 pour le motif jacquard
  const FONT = {
    '2': ['111', '001', '111', '100', '111'],
    '1': ['010', '110', '010', '010', '111'],
    ',': ['00', '00', '00', '01', '10'],
    'D': ['110', '101', '101', '101', '110'],
    'E': ['111', '100', '110', '100', '111'],
    'B': ['110', '101', '110', '101', '110']
  };
  const HEART = ['01010', '11111', '11111', '01110', '00100'];

  const BODY_L = 13, BODY_R = 34, TOP = 3, BOTTOM = H - 1, MID = (BODY_L + BODY_R) / 2;

  function region(x, y) {
    // Encolure arrondie bordée de côtes
    const dx = Math.abs(x - MID);
    const curve = TOP + 3.4 - (dx * dx) / 13;
    if (x >= BODY_L && x <= BODY_R && y >= TOP) {
      if (dx < 6.4 && y < curve) return null; // trou d'encolure
      if (dx < 8.6 && y < curve + 2.6) return 'collar';
      if (y >= BOTTOM - 3) return 'ribBody';
      return 'body';
    }
    // Manches : de l'épaule jusqu'au poignet, en diagonale
    if (y >= TOP && y <= 41) {
      const t = y - TOP;
      const inner = y <= 15 ? BODY_L - 1 : BODY_L - 1 - (y - 15) * 0.36;
      const outer = BODY_L - 1 - 3 - t * 0.27;
      for (const side of [-1, 1]) {
        const xx = side < 0 ? x : (BODY_L + BODY_R) - x; // miroir
        if (xx <= inner + 0.01 && xx >= outer - 0.01) return y >= 39 ? 'ribSleeve' : 'sleeve';
      }
    }
    return null;
  }

  function color(x, y, r) {
    if (r === 'collar' || r === 'ribBody' || r === 'ribSleeve') return x % 4 < 2 ? C.rib : C.ribDark;
    const bx = x - BODY_L; // colonne relative au corps
    // Bande zigzag basse
    if (y === 46 || y === 42) return C.cream;
    if (y >= 43 && y <= 45) {
      const k = ((x % 4) + 4) % 4;
      const zig = y === 44 ? (k === 1 || k === 3) : y === 43 ? k === 2 : k === 0;
      return zig ? C.terra : C.base;
    }
    // Bande centrale « 21,1 ♥ » : terracotta sur crème
    if (y === 24 || y === 34) return C.terra;
    if (y >= 25 && y <= 33) {
      if (r !== 'body' || y < 27 || y > 31) return y === 25 || y === 33 ? C.base : C.cream;
      const glyphs = ['2', '1', ',', '1', 'H'];
      let cx = BODY_L + 1;
      for (const ch of glyphs) {
        const g = ch === 'H' ? HEART : FONT[ch];
        const w = g[0].length;
        if (x >= cx && x < cx + w && g[y - 27][x - cx] === '1') return C.terra;
        cx += w + 1;
      }
      return C.cream;
    }
    // Empiècement cœurs (corps + manches)
    if (y === 9 || y === 17) return C.cream;
    if (y >= 11 && y <= 15) {
      const k = ((x - 2) % 7 + 7) % 7;
      if (k < 5 && HEART[y - 11][k] === '1') return C.terra;
      return C.base;
    }
    if (y === 10 || y === 16) return x % 2 ? C.sage : C.base;
    // Petits points moutarde semés
    if (y > 17 && y < 25 && (x * 7 + y * 3) % 11 === 0) return C.mustard;
    if (y > 34 && y < 42 && (x * 5 + y * 3) % 13 === 0) return C.mustard;
    return C.base;
  }

  // Ordre de tricot : du bas vers le haut, en aller-retour comme sur des aiguilles
  const cells = [];
  for (let y = BOTTOM; y >= 0; y--) {
    const row = [];
    for (let x = 0; x < W; x++) {
      const r = region(x, y);
      if (r) row.push({ x, y, r, c: color(x, y, r) });
    }
    if ((BOTTOM - y) % 2) row.reverse();
    cells.push(...row);
  }

  const NS = 'http://www.w3.org/2000/svg';
  const stitchDef = `<symbol id="st" viewBox="0 0 10 10" overflow="visible">
      <ellipse cx="2.9" cy="4.9" rx="2.35" ry="4.6" transform="rotate(-24 2.9 4.9)"/>
      <ellipse cx="7.1" cy="4.9" rx="2.35" ry="4.6" transform="rotate(24 7.1 4.9)"/>
      <path d="M2 2.6 L3.8 7.6 M8 2.6 L6.2 7.6" stroke="rgba(0,0,0,.10)" stroke-width=".7" fill="none"/>
    </symbol>`;

  function mount(svg) {
    svg.innerHTML = `<defs>${stitchDef}
      <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx="0" dy="1.2" stdDeviation="1" flood-color="#8a2d55" flood-opacity=".18"/></filter></defs>
      <g class="stitches" filter="url(#soft)"></g>
      <g class="needles"></g>`;
    svg._g = svg.querySelector('.stitches');
    svg._n = svg.querySelector('.needles');
    svg._count = 0;
    frame(svg, 0);
  }

  // Affiche `count` mailles ; les nouvelles apparaissent une à une si animate
  function render(svg, count, animate) {
    count = Math.max(0, Math.min(cells.length, count));
    const g = svg._g;
    if (count < svg._count) { g.innerHTML = ''; svg._count = 0; }
    const from = svg._count;
    const n = count - from;
    const per = animate ? Math.min(28, 2600 / Math.max(n, 1)) : 0;
    for (let i = from; i < count; i++) {
      const c = cells[i];
      const u = document.createElementNS(NS, 'use');
      u.setAttribute('href', '#st');
      u.setAttribute('x', c.x * S);
      u.setAttribute('y', c.y * S);
      u.setAttribute('width', S);
      u.setAttribute('height', S);
      u.setAttribute('fill', c.c);
      if (animate) {
        u.classList.add('pop');
        u.style.animationDelay = `${(i - from) * per}ms`;
        u.style.transformOrigin = `${c.x * S + 5}px ${c.y * S + 5}px`;
      }
      g.appendChild(u);
    }
    svg._count = count;
    drawNeedles(svg, count);
    frame(svg, count);
    return n * per;
  }

  // Le cadre suit le tricot : il grandit avec les rangs
  function frame(svg, count) {
    const top = count ? cells[count - 1].y : BOTTOM;
    const y0 = Math.max(-1.4, Math.min(top - 4, H - 10)) * S;
    svg.setAttribute('viewBox', `-6 ${y0} ${W * S + 12} ${H * S + 28 - y0}`);
  }

  function drawNeedles(svg, count) {
    const n = svg._n;
    if (count >= cells.length) { n.innerHTML = ''; return; }
    const last = cells[Math.max(0, count - 1)];
    const y = count ? last.y * S + 2 : BOTTOM * S + 8;
    const x = count ? last.x * S + 5 : BODY_L * S;
    const w = W * S;
    n.innerHTML = `
      <line x1="-2" y1="${y - 3}" x2="${w + 2}" y2="${y - 9}" stroke="#C9A27A" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="-2" cy="${y - 3}" r="4.5" fill="#E5447A"/>
      <line x1="-2" y1="${y + 5}" x2="${w + 2}" y2="${y - 1}" stroke="#DDB98F" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="${w + 2}" cy="${y - 1}" r="4.5" fill="#8FC4A0"/>
      <path d="M${x} ${y} C ${x + 40} ${y + 60}, ${w - 30} ${H * S - 10}, ${w - 22} ${H * S + 2}" stroke="#F7A8BE" stroke-width="1.6" fill="none"/>
      <g transform="translate(${w - 22} ${H * S + 4})">
        <circle r="13" fill="#F7A8BE"/>
        <path d="M-11 -5 Q0 -12 11 -5 M-12 1 Q0 -6 12 1 M-10 7 Q0 0 10 7 M-6 -11 Q4 -2 -2 12" stroke="#E07595" stroke-width="1.3" fill="none"/>
      </g>`;
  }

  return { total: cells.length, mount, render };
})();
