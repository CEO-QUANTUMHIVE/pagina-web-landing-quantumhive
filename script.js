/* =========================================================
   QuantumHive - Premium Interactive Script v26
   LIGHTNING-ONLY CANVAS — Fractal bolts on transparent bg
   ========================================================= */

// ── FRACTAL LIGHTNING CANVAS ──
(function initQuantumBG() {
  const canvas = document.getElementById('quantumBg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 680px)').matches;
  const DPR = Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 2);

  /* ── Lightning config ── */
  const BOLT_THROTTLE_MS = mobile ? 50 : 28;
  const BOLT_LIFE_MS     = 5000;
  const BOLT_MAX_DEPTH   = 3;
  const BOLT_RADIUS      = mobile ? 170 : 280;
  const BOLT_TARGETS     = mobile ? 2  : 4;
  const MAX_BOLTS        = 10;

  let W = 0, H = 0, lastFrame = 0, lastBoltAt = 0;
  let mouseX = -9999, mouseY = -9999;

  const bolts = [];
  const anchorPts = [];

  const rand  = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ── Anchor points for bolts to target ── */
  function buildAnchors() {
    anchorPts.length = 0;
    const count = mobile ? 18 : 36;
    for (let i = 0; i < count; i++) {
      anchorPts.push({ x: rand(W * 0.05, W * 0.95), y: rand(H * 0.05, H * 0.95) });
    }
  }

  function nearestAnchors(x, y, max) {
    return anchorPts
      .map(a => ({ a, d: Math.hypot(a.x - x, a.y - y) }))
      .filter(o => o.d < BOLT_RADIUS)
      .sort((a, b) => a.d - b.d)
      .slice(0, max)
      .map(o => o.a);
  }

  /* ── Fractal bolt generator ── */
  function fractalBolt(x1, y1, x2, y2, depth) {
    const segs = [];
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = clamp(Math.floor(dist / 16), 4, 10);
    const nx = -(y2 - y1) / (dist || 1);
    const ny =  (x2 - x1) / (dist || 1);
    const pts = [{ x: x1, y: y1 }];

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const jitter = rand(-10, 10) * (1 - depth * 0.22);
      pts.push({
        x: x1 + (x2 - x1) * t + nx * jitter,
        y: y1 + (y2 - y1) * t + ny * jitter,
      });
    }
    pts.push({ x: x2, y: y2 });

    for (let i = 1; i < pts.length; i++) segs.push({ a: pts[i - 1], b: pts[i], depth });

    if (depth < BOLT_MAX_DEPTH) {
      const branches = depth === 0 ? 2 : 1;
      for (let i = 0; i < branches; i++) {
        const origin = pts[Math.floor(rand(1, pts.length - 1))];
        const angle  = Math.atan2(y2 - y1, x2 - x1) + rand(-1.0, 1.0);
        const len    = dist * rand(0.18, 0.4) * (1 - depth * 0.18);
        const tx = clamp(origin.x + Math.cos(angle) * len, 0, W);
        const ty = clamp(origin.y + Math.sin(angle) * len, 0, H);
        segs.push(...fractalBolt(origin.x, origin.y, tx, ty, depth + 1));
      }
    }
    return segs;
  }

  function spawnBolt(x, y, now) {
    if (bolts.length >= MAX_BOLTS) bolts.shift();
    const targets = nearestAnchors(x, y, BOLT_TARGETS);
    if (!targets.length) return;
    const segs = [];
    for (const t of targets) segs.push(...fractalBolt(x, y, t.x, t.y, 0));
    bolts.push({ born: now, life: BOLT_LIFE_MS, segs, seed: Math.random() * 999 });
  }

  /* ── Draw bolts ── */
  function drawBolts(now) {
    if (!bolts.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      const age = now - b.born;
      if (age >= b.life) { bolts.splice(i, 1); continue; }

      const t = age / b.life;
      const fade = t < 0.6 ? 1 : Math.pow((1 - t) / 0.4, 1.8);
      const flicker = 0.75 + Math.sin((now + b.seed) * 0.08) * 0.25 + Math.random() * 0.1;
      const alpha = clamp(fade * flicker, 0, 1);
      const show = Math.ceil(b.segs.length * clamp(t * 5, 0.08, 1));

      for (let s = 0; s < show; s++) {
        const seg = b.segs[s];
        const a = alpha * (1 - seg.depth * 0.25);
        if (a <= 0.008) continue;

        /* Violet glow */
        ctx.strokeStyle = `rgba(139, 92, 246, ${a * 0.32})`;
        ctx.lineWidth = 5.5 - seg.depth * 1.0;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();

        /* Cyan glow */
        ctx.strokeStyle = `rgba(0, 212, 255, ${a * 0.22})`;
        ctx.lineWidth = 4.2 - seg.depth * 0.9;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();

        /* Cyan body */
        ctx.strokeStyle = `rgba(0, 229, 255, ${a * 0.55})`;
        ctx.lineWidth = 1.4 - seg.depth * 0.25;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();

        /* Violet body */
        ctx.strokeStyle = `rgba(160, 100, 255, ${a * 0.55})`;
        ctx.lineWidth = 1.2 - seg.depth * 0.2;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();

        /* Purple-pink accent */
        ctx.strokeStyle = `rgba(180, 80, 220, ${a * 0.25})`;
        ctx.lineWidth = 2.0 - seg.depth * 0.35;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();

        /* White core */
        ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.92})`;
        ctx.lineWidth = 0.4;
        ctx.beginPath();
        ctx.moveTo(seg.a.x, seg.a.y);
        ctx.lineTo(seg.b.x, seg.b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ── Render loop ── */
  function render(now) {
    requestAnimationFrame(render);
    const elapsed = now - lastFrame;
    if (elapsed < 16) return;
    lastFrame = now - (elapsed % 16);
    ctx.clearRect(0, 0, W, H);
    drawBolts(now);
  }

  function onPointerMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    const now = performance.now();
    if (!prefersReducedMotion && now - lastBoltAt > BOLT_THROTTLE_MS) {
      spawnBolt(mouseX, mouseY, now);
      lastBoltAt = now;
    }
  }

  function resize() {
    // clientWidth y no innerWidth: innerWidth incluye la barra de scroll y en
    // algunos contextos reporta mas ancho que el layout, lo que hacia que el
    // canvas quedara mas ancho que la pantalla y la pagina scrolleara al costado.
    W = document.documentElement.clientWidth;
    H = document.documentElement.clientHeight;
    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildAnchors();
  }

  document.addEventListener('pointermove', onPointerMove, { passive: true });
  resize();
  requestAnimationFrame(render);

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  }, { passive: true });
})();


// ── HERO 3D PARTICLE CANVAS (Optimized Spatial Grid) ──
(function initHeroParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W, H;
  const particles = [];
  const CONN_DIST = 160;
  const CONN_DIST2 = CONN_DIST * CONN_DIST;
  const MOUSE_RADIUS = 200;
  const MOUSE_R2 = MOUSE_RADIUS * MOUSE_RADIUS;
  let mouse = { x: -9999, y: -9999 };
  const CELL = 120;
  let cols, rows, grid;

  const COLORS = ['#00D4FF', '#00FF88', '#8B5CF6', '#C9A84C'];

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cols = Math.ceil(W / CELL);
    rows = Math.ceil(H / CELL);
  }

  function createParticles() {
    particles.length = 0;
    const count = Math.min(Math.floor((W * H) / 3000), 300);
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: Math.random() * 0.5 + 0.3,
      });
    }
  }

  function buildGrid() {
    grid = new Array(cols * rows);
    for (let i = 0; i < grid.length; i++) grid[i] = [];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const cx = (p.x / CELL) | 0;
      const cy = (p.y / CELL) | 0;
      if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
        grid[cy * cols + cx].push(i);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    buildGrid();

    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      const pi = particles[i];
      const cx = (pi.x / CELL) | 0;
      const cy = (pi.y / CELL) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          const cell = grid[ny * cols + nx];
          for (let k = 0; k < cell.length; k++) {
            const j = cell[k];
            if (j <= i) continue;
            const pj = particles[j];
            const ddx = pi.x - pj.x;
            const ddy = pi.y - pj.y;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < CONN_DIST2) {
              const a = (1 - Math.sqrt(d2) / CONN_DIST) * 0.15;
              ctx.strokeStyle = `rgba(0,212,255,${a})`;
              ctx.beginPath();
              ctx.moveTo(pi.x, pi.y);
              ctx.lineTo(pj.x, pj.y);
              ctx.stroke();
            }
          }
        }
      }
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < MOUSE_R2 && d2 > 0) {
        const d = Math.sqrt(d2);
        const force = (MOUSE_RADIUS - d) / MOUSE_RADIUS * 0.7;
        p.vx += (dx / d) * force;
        p.vy += (dy / d) * force;
      }
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10;
      if (p.y > H + 10) p.y = -10;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }

  canvas.parentElement.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  }, { passive: true });
  canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = -9999; mouse.y = -9999; });

  resize();
  createParticles();
  draw();
  window.addEventListener('resize', () => { resize(); createParticles(); });
})();


// ── ENHANCED 3D TILT + GLOW (with lerp interpolation) ──
(function initTiltCards() {
  const cards = document.querySelectorAll('[data-tilt]');
  const lerp = (a, b, t) => a + (b - a) * t;
  const MAX_ROT = 10;

  cards.forEach(card => {
    let currentRotX = 0;
    let currentRotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let animating = false;
    let resetTimer;

    function animate() {
      currentRotX = lerp(currentRotX, targetRotX, 0.12);
      currentRotY = lerp(currentRotY, targetRotY, 0.12);

      if (Math.abs(currentRotX - targetRotX) > 0.01 || Math.abs(currentRotY - targetRotY) > 0.01) {
        card.style.transform = `perspective(800px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg) scale3d(1.02,1.02,1.02)`;
        requestAnimationFrame(animate);
      } else {
        card.style.transform = `perspective(800px) rotateX(${currentRotX}deg) rotateY(${currentRotY}deg) scale3d(1.02,1.02,1.02)`;
        animating = false;
      }
    }

    function updateFromPointer(e) {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      targetRotX = ((y - centerY) / centerY) * -MAX_ROT;
      targetRotY = ((x - centerX) / centerX) * MAX_ROT;

      const glowX = (x / rect.width) * 100;
      const glowY = (y / rect.height) * 100;
      card.style.setProperty('--glow-x', glowX + '%');
      card.style.setProperty('--glow-y', glowY + '%');

      card.classList.add('is-touching');
      clearTimeout(resetTimer);

      if (!animating) {
        animating = true;
        animate();
      }
    }

    function resetCard(delay = 0) {
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        card.classList.remove('is-touching');
      }, delay);
      targetRotX = 0;
      targetRotY = 0;
      card.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      if (!animating) {
        animating = true;
        animate();
      }
      setTimeout(() => { card.style.transition = ''; }, 600);
    }

    card.addEventListener('pointermove', updateFromPointer, { passive: true });
    card.addEventListener('pointerdown', updateFromPointer, { passive: true });
    card.addEventListener('pointerup', (e) => resetCard(e.pointerType === 'touch' ? 900 : 0), { passive: true });
    card.addEventListener('pointercancel', () => resetCard(0), { passive: true });
    card.addEventListener('pointerleave', (e) => resetCard(e.pointerType === 'touch' ? 900 : 0));

    card.addEventListener('pointerenter', () => {
      card.style.transition = '';
    });
  });
})();


// ── MOBILE NAV ──
(function initMobileNav() {
  const button = document.getElementById('hamburgerBtn');
  const nav = document.getElementById('topnav');
  if (!button || !nav) return;

  function setOpen(open) {
    nav.classList.toggle('open', open);
    button.classList.toggle('active', open);
    button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  button.addEventListener('click', () => {
    setOpen(!nav.classList.contains('open'));
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => setOpen(false));
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1024) setOpen(false);
  }, { passive: true });
})();


// ── SCROLL REVEAL (Spring Physics Stagger) ──
(function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal-item').forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll('.reveal-item').forEach(el => observer.observe(el));
})();


// ── LANGUAGE TRANSLATIONS ──
const translations = {
  es: {
    nav_sistema: 'Sistema', nav_presencia: 'Presencia', nav_frentes: 'Frentes',
    nav_webs: 'Webs inteligentes', nav_panel: 'Mi panel',
    nav_empleados: 'Empleados virtuales', nav_contacto: 'Contacto',
    nav_trader: 'Asistente Trader', fronts_cta_trader: 'Asistente Trader',
    btn_ver_intro: 'Ver intro', hero_tag: 'Multi-Agent Business Infrastructure',
    hero_lede: 'QuantumHive construye asistentes de IA humanizados con voz en tiempo real, vision en tiempo real, presencia avatar y arquitectura multiagente.',
    hero_btn_abrir: 'Ver secuencia', hero_btn_explorar: 'Explorar arquitectura', hero_btn_fabrica: 'Fábrica de agentes',
    band_1: 'IA humanizada', band_2: 'Tiempo real', band_3: 'Vision contextual',
    band_4: 'Presencia avatar', band_5: 'Orquestacion multiagente', band_6: 'Infraestructura aplicada',
    system_tag: 'Sistema QuantumHive', system_title: 'No es una demo. Es una capa expandible de <span class="text-accent">inteligencia aplicada.</span>',
    system_statement: 'La parte visible puede hablar, mirar o habitar una interfaz. La parte no visible decide, conecta, ejecuta y sostiene el criterio de toda la experiencia.',
    system_note: 'Menos chat flotante. Mas sistema con identidad, criterio y capacidad de operar en el mundo real.',
    presence_tag: 'Nueva interfaz', presence_title: 'Cuando la IA adquiere <span class="text-cyan">voz, mirada y forma</span>, cambia la percepcion del sistema entero.',
    presence_main_title: 'Una inteligencia que se siente viva.',
    presence_main_text: 'QuantumHive no se limita a responder texto. Construye una presencia capaz de conversar, observar, guiar, explicar y sostener una relacion mas rica entre empresa, interfaz y usuario.',
    presence_01_title: 'Voz con identidad', presence_01_text: 'Menos sintetico, mas cercano, mas memorable.',
    presence_02_title: 'Vision con contexto', presence_02_text: 'Lee escena, interfaz o situacion antes de responder.',
    presence_03_title: 'Avatar con rol', presence_03_text: 'No un truco visual. Una capa real de presencia de marca.',
    fronts_tag: 'Frentes de expansion', fronts_title: 'Una sola arquitectura. <span class="text-accent">Multiples superficies de negocio.</span>',
    fronts_cta: 'Empleados virtuales',
    fronts_manifesto_title: 'QuantumHive no nace para un nicho. Nace para ocupar una categoria.',
    fronts_manifesto_text: 'La misma capa de inteligencia puede convertirse en empleado virtual, interfaz comercial, operador asistido o presencia premium de marca sin perder coherencia.',
    front_01_title: 'Empleados virtuales', front_01_text: 'Recepcion, ventas, soporte, guiado y seguimiento con una presencia mucho mas avanzada que un bot plano.',
    front_02_title: 'Interfaces comerciales', front_02_text: 'Sistemas que explican, convierten y sostienen conversaciones con identidad propia.',
    front_03_title: 'Inteligencia operacional', front_03_text: 'Agentes que ordenan, coordinan, activan flujos y conectan decision con ejecucion.',
    manifesto_text: 'QuantumHive combina presencia humana, operacion en tiempo real y arquitectura aplicada para moverse donde la IA deja de ser promesa y empieza a parecer inevitable.',
    contact_tag: 'Contacto', contact_title: 'Si queres construir la proxima interfaz de tu empresa, empecemos por ahi.',
    contact_text: 'QuantumHive esta disenado para companias que quieren salir del modelo de interfaz vieja y entrar en una capa nueva de voz, vision, avatar y sistemas coordinados.',
    contact_btn_intro: 'Ver intro otra vez', footer_tagline: 'IA humanizada en tiempo real',
    modal_tag: 'Intro QuantumHive', modal_title: 'Secuencia de apertura', modal_close: 'Cerrar',
  },
  en: {
    nav_sistema: 'System', nav_presencia: 'Presence', nav_frentes: 'Verticals',
    nav_webs: 'Smart websites', nav_panel: 'My panel',
    nav_empleados: 'Virtual employees', nav_contacto: 'Contact',
    nav_trader: 'Trader Assistant', fronts_cta_trader: 'Trader Assistant',
    btn_ver_intro: 'Watch intro', hero_tag: 'Multi-Agent Business Infrastructure',
    hero_lede: 'QuantumHive builds humanized AI assistants with real-time voice, real-time vision, avatar presence and multi-agent architecture.',
    hero_btn_abrir: 'Play sequence', hero_btn_explorar: 'Explore architecture', hero_btn_fabrica: 'Agent factory',
    band_1: 'Humanized AI', band_2: 'Real time', band_3: 'Contextual vision',
    band_4: 'Avatar presence', band_5: 'Multi-agent orchestration', band_6: 'Applied infrastructure',
    system_tag: 'QuantumHive System', system_title: "It's not a demo. It's an expandable layer of <span class=\"text-accent\">applied intelligence.</span>",
    system_statement: 'The visible part can speak, see or inhabit an interface. The invisible part decides, connects, executes and sustains the criteria of the entire experience.',
    system_note: 'Less floating chat. More system with identity, criteria and ability to operate in the real world.',
    presence_tag: 'New interface', presence_title: 'When AI acquires <span class="text-cyan">voice, gaze and form</span>, it changes the perception of the entire system.',
    presence_main_title: 'An intelligence that feels alive.',
    presence_main_text: 'QuantumHive is not limited to responding to text. It builds a presence capable of conversing, observing, guiding, explaining and sustaining a richer relationship between company, interface and user.',
    presence_01_title: 'Voice with identity', presence_01_text: 'Less synthetic, closer, more memorable.',
    presence_02_title: 'Vision with context', presence_02_text: 'Reads scene, interface or situation before responding.',
    presence_03_title: 'Avatar with role', presence_03_text: 'Not a visual trick. A real layer of brand presence.',
    fronts_tag: 'Expansion verticals', fronts_title: 'One architecture. <span class="text-accent">Multiple business surfaces.</span>',
    fronts_cta: 'Virtual employees',
    fronts_manifesto_title: 'QuantumHive is not born for a niche. It is born to occupy a category.',
    fronts_manifesto_text: 'The same layer of intelligence can become a virtual employee, commercial interface, assisted operator or premium brand presence without losing coherence.',
    front_01_title: 'Virtual employees', front_01_text: 'Reception, sales, support, guidance and follow-up with a presence far more advanced than a flat bot.',
    front_02_title: 'Commercial interfaces', front_02_text: 'Systems that explain, convert and sustain conversations with their own identity.',
    front_03_title: 'Operational intelligence', front_03_text: 'Agents that organize, coordinate, activate flows and connect decision with execution.',
    manifesto_text: 'QuantumHive combines human presence, real-time operation and applied architecture to move where AI stops being a promise and starts seeming inevitable.',
    contact_tag: 'Contact', contact_title: "If you want to build your company's next interface, let's start there.",
    contact_text: 'QuantumHive is designed for companies that want to leave the old interface model and enter a new layer of voice, vision, avatar and coordinated systems.',
    contact_btn_intro: 'Watch intro again', footer_tagline: 'Humanized AI in real time',
    modal_tag: 'QuantumHive Intro', modal_title: 'Opening sequence', modal_close: 'Close',
  },
};

let currentLang = localStorage.getItem('qh-lang') || 'es';

function applyTranslations(lang) {
  currentLang = lang;
  localStorage.setItem('qh-lang', lang);
  document.documentElement.lang = lang;
  const t = translations[lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.innerHTML = t[key];
  });
  const flagEl = document.getElementById('langFlag');
  if (flagEl) flagEl.textContent = lang === 'es' ? 'EN' : 'ES';
}

const langToggle = document.getElementById('langToggle');
if (langToggle) {
  langToggle.addEventListener('click', () => {
    applyTranslations(currentLang === 'es' ? 'en' : 'es');
  });
}

applyTranslations(currentLang);


// ── VIDEO MODAL ──
const modal = document.querySelector('.video-modal');
const modalVideo = modal?.querySelector('video');

function openVideoModal() {
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (modalVideo) { modalVideo.currentTime = 0; modalVideo.play().catch(() => {}); }
}

function closeVideoModal() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (modalVideo) modalVideo.pause();
}

document.querySelectorAll('[data-open-video="true"]').forEach(btn => {
  btn.addEventListener('click', openVideoModal);
});

document.querySelectorAll('[data-close-video="true"]').forEach(btn => {
  btn.addEventListener('click', closeVideoModal);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeVideoModal();
});
