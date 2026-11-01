/* Home page: animated "event display", typing roles, stats, news */
(function () {
  "use strict";
  var K = window.K;

  /* ---------------- Event display ---------------- */
  var canvas = document.getElementById("event-display");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = 1, cx = 0, cy = 0, S = 0;
  var events = [];
  var colors = {};
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var LAYERS = [0.06, 0.11, 0.16, 0.21, 0.30, 0.36, 0.47]; // fractions of S; index 5 = TOF
  var TOF = 5;
  var SPECIES = [
    { name: "π", key: "pi", w: 6 },
    { name: "K", key: "k", w: 2 },
    { name: "p", key: "p", w: 1.4 },
    { name: "e", key: "e", w: 1 }
  ];

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    var dark = K.theme() === "dark";
    colors = {
      layer: dark ? "rgba(255,255,255,0.09)" : "rgba(20,30,60,0.10)",
      tof: dark ? "rgba(77,225,255,0.35)" : "rgba(11,143,185,0.35)",
      pi: cs.getPropertyValue("--c-research").trim() || "#4de1ff",
      k: cs.getPropertyValue("--c-music").trim() || "#ff5ca8",
      p: cs.getPropertyValue("--accent-3").trim() || "#ffd166",
      e: cs.getPropertyValue("--c-travel").trim() || "#5ef0a0",
      text: dark ? "rgba(255,255,255,0.35)" : "rgba(20,30,60,0.35)"
    };
  }

  function resize() {
    var r = canvas.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    var mobile = W < 700;
    cx = mobile ? W * 0.5 : W * 0.7;
    cy = mobile ? H * 0.42 : H * 0.5;
    S = Math.min(mobile ? W * 1.9 : W * 0.9, H * 1.9);
  }

  function pickSpecies() {
    var tot = SPECIES.reduce(function (a, s) { return a + s.w; }, 0), x = Math.random() * tot;
    for (var i = 0; i < SPECIES.length; i++) { x -= SPECIES[i].w; if (x <= 0) return SPECIES[i]; }
    return SPECIES[0];
  }

  function makeEvent() {
    var n = 7 + Math.floor(Math.random() * 12);
    var tracks = [];
    for (var i = 0; i < n; i++) {
      var sp = pickSpecies();
      var pt = 0.15 + Math.pow(Math.random(), 2) * 2.5;     // "GeV"
      var R = pt * S * 0.35;                                // curvature radius in px
      var q = Math.random() < 0.5 ? -1 : 1;
      var phi = Math.random() * Math.PI * 2;
      // pre-compute path
      var pts = [], hits = [], x = 0, y = 0, a = phi, ds = 3, s = 0, maxR = LAYERS[LAYERS.length - 1] * S;
      var layerIdx = 0;
      pts.push([0, 0]);
      while (s < Math.PI * R && s < 4000) {
        a += q * ds / R; x += ds * Math.cos(a); y += ds * Math.sin(a); s += ds;
        pts.push([x, y]);
        var rr = Math.sqrt(x * x + y * y);
        while (layerIdx < LAYERS.length && rr >= LAYERS[layerIdx] * S) {
          hits.push({ i: pts.length - 1, layer: layerIdx });
          layerIdx++;
        }
        if (rr >= maxR) break;
      }
      tracks.push({ sp: sp, pts: pts, hits: hits });
    }
    events.push({ t0: performance.now(), tracks: tracks, dur: 900 + Math.random() * 400 });
    if (events.length > 4) events.shift();
  }

  function drawDetector(t) {
    ctx.lineWidth = 1;
    for (var i = 0; i < LAYERS.length; i++) {
      ctx.beginPath();
      ctx.strokeStyle = i === TOF ? colors.tof : colors.layer;
      ctx.lineWidth = i === TOF ? 2.5 : 1;
      if (i === TOF) ctx.setLineDash([10, 5]); else ctx.setLineDash([]);
      ctx.arc(cx, cy, LAYERS[i] * S, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // spokes (barrel staves)
    ctx.strokeStyle = colors.layer;
    ctx.lineWidth = 1;
    for (var k = 0; k < 24; k++) {
      var ang = k * Math.PI / 12 + t * 0.00002;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * LAYERS[3] * S, cy + Math.sin(ang) * LAYERS[3] * S);
      ctx.lineTo(cx + Math.cos(ang) * LAYERS[4] * S, cy + Math.sin(ang) * LAYERS[4] * S);
      ctx.stroke();
    }
    ctx.fillStyle = colors.text;
    ctx.font = "11px JetBrains Mono, monospace";
    var lx = cx + LAYERS[TOF] * S * Math.cos(-0.6), ly = cy + LAYERS[TOF] * S * Math.sin(-0.6);
    ctx.fillText("AC-LGAD TOF", lx + 8, ly - 4);
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    drawDetector(t);
    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      var age = Math.max(0, t - ev.t0);
      var grow = Math.min(1, age / ev.dur);
      var fade = Math.max(0, 1 - Math.max(0, age - ev.dur - 1200) / 2600);
      if (fade <= 0) continue;
      // vertex flash
      if (age < 400) {
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,255,255," + (0.8 * (1 - age / 400)) + ")";
        ctx.arc(cx, cy, 4 + age / 20, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var i = 0; i < ev.tracks.length; i++) {
        var tr = ev.tracks[i];
        var n = Math.max(2, Math.floor(tr.pts.length * grow));
        var col = colors[tr.sp.key];
        ctx.globalAlpha = 0.85 * fade;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = col; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx + tr.pts[0][0], cy + tr.pts[0][1]);
        for (var j = 1; j < n; j++) ctx.lineTo(cx + tr.pts[j][0], cy + tr.pts[j][1]);
        ctx.stroke();
        ctx.shadowBlur = 0;
        for (var h = 0; h < tr.hits.length; h++) {
          var hit = tr.hits[h];
          if (hit.i >= n) break;
          var p = tr.pts[hit.i];
          var isTof = hit.layer === TOF;
          ctx.beginPath();
          ctx.fillStyle = isTof ? "#ffffff" : col;
          ctx.arc(cx + p[0], cy + p[1], isTof ? 3.2 : 2, 0, Math.PI * 2);
          ctx.fill();
          if (isTof) {
            var since = age - ev.dur * hit.i / tr.pts.length;
            if (since > 0 && since < 700) {
              ctx.beginPath();
              ctx.strokeStyle = col;
              ctx.globalAlpha = fade * (1 - since / 700);
              ctx.arc(cx + p[0], cy + p[1], 3 + since / 25, 0, Math.PI * 2);
              ctx.stroke();
              ctx.globalAlpha = 0.85 * fade;
            }
          }
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  var running = true, nextAuto = 0;
  function loop(t) {
    if (!running) return;
    if (t > nextAuto) { makeEvent(); nextAuto = t + 2600 + Math.random() * 1500; }
    frame(t);
    requestAnimationFrame(loop);
  }

  readColors(); resize();
  window.addEventListener("resize", function () { resize(); if (reduced) frame(performance.now() + 5000); });
  document.addEventListener("themechange", function () { readColors(); if (reduced) frame(performance.now()); });
  canvas.parentElement.addEventListener("click", function (e) {
    if (e.target.closest("a,button")) return;
    makeEvent();
  });
  if (reduced) {
    makeEvent(); events[0].t0 = performance.now() - 1000; frame(performance.now());
  } else {
    var io = new IntersectionObserver(function (en) {
      var vis = en[0].isIntersecting && !document.hidden;
      if (vis && !running) { running = true; requestAnimationFrame(loop); }
      else if (!vis) running = false;
    });
    io.observe(canvas);
    requestAnimationFrame(loop);
  }

  /* ---------------- Typing roles ---------------- */
  var ROLES = {
    ja: ["実験核物理学を研究する大学院生", "AC-LGAD 検出器エンジニア", "ピコ秒ハンター", "旅人", "ゲーム・パズル制作者", "カラオケと音楽理論が好き"],
    en: ["Experimental nuclear physicist (in training)", "AC-LGAD detector builder", "Picosecond hunter", "Traveller", "Game & puzzle maker", "Karaoke & music-theory nerd"]
  };
  var roleEl = document.getElementById("role-text");
  var ri = 0, ci = 0, deleting = false, timer;
  function tick() {
    var list = ROLES[K.lang()] || ROLES.en;
    var word = list[ri % list.length];
    if (!deleting) {
      ci++;
      roleEl.textContent = word.slice(0, ci);
      if (ci >= word.length) { deleting = true; timer = setTimeout(tick, 1800); return; }
      timer = setTimeout(tick, 60 + Math.random() * 50);
    } else {
      ci--;
      roleEl.textContent = word.slice(0, ci);
      if (ci <= 0) { deleting = false; ri++; timer = setTimeout(tick, 300); return; }
      timer = setTimeout(tick, 28);
    }
  }
  if (reduced) roleEl.textContent = ROLES[K.lang()][0]; else tick();
  document.addEventListener("langchange", function () {
    clearTimeout(timer); ci = 0; deleting = false;
    if (reduced) roleEl.textContent = ROLES[K.lang()][0]; else tick();
  });

  /* ---------------- Stats ---------------- */
  function countUp(el, to) {
    if (reduced) { el.textContent = to; return; }
    var t0 = performance.now(), d = 1200;
    (function step(t) {
      var k = Math.min(1, (t - t0) / d);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setCount(key, n) {
    var el = document.querySelector('[data-count="' + key + '"]');
    if (!el) return;
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { countUp(el, n); io.disconnect(); }
    });
    io.observe(el);
  }
  K.fetchJSON("data/cv.json").then(function (cv) {
    setCount("talks", (cv.talks || []).length);
    setCount("awards", (cv.awards || []).length);
  }).catch(function () {});
  K.fetchJSON("data/travel.json").then(function (tr) {
    var set = {};
    (tr.places || []).forEach(function (p) { if (p.countryCode) set[p.countryCode] = 1; });
    setCount("countries", Object.keys(set).length);
  }).catch(function () {});

  /* ---------------- News ---------------- */
  var now = new Date();
  var thisMonth = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0");
  K.fetchJSON("data/news.json").then(function (d) {
    var items = (d.items || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 7);
    document.getElementById("news").innerHTML = items.map(function (it) {
      var up = it.date > thisMonth ? '<span class="badge-upcoming"><span lang="ja">予定</span><span lang="en">upcoming</span></span>' : "";
      var txt = K.bi(it.text);
      if (it.link) txt = '<a href="' + K.esc(it.link) + '">' + txt + "</a>";
      return '<li><span class="news-date">' + K.esc(K.fmtMonth(it.date)) + "</span><span>" + txt + up + "</span></li>";
    }).join("");
  }).catch(function () {});

  /* ---------------- Contact ---------------- */
  var L = K.site.links;
  var links = [["✉ Mail", "mailto:" + K.site.email], ["GitHub", L.github], ["ORCID", L.orcid], ["INSPIRE-HEP", L.inspire], ["researchmap", L.researchmap], ["X", L.x], ["Instagram", L.instagram],
    ["Lab", L.lab]];
  document.getElementById("contact-links").innerHTML = links.filter(function (l) { return l[1]; }).map(function (l) {
    return '<a class="btn btn-sm" href="' + K.esc(l[1]) + '"' + (l[1].indexOf("mailto:") === 0 ? "" : ' target="_blank" rel="noopener"') + ">" + K.esc(l[0]) + "</a>";
  }).join("");
})();
