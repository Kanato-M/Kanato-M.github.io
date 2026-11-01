/* Research page: figures + TOF simulator */
(function () {
  "use strict";
  var K = window.K;
  var SVGNS = "http://www.w3.org/2000/svg";

  /* ---------- Proton cartoon ---------- */
  function spring(x1, y1, x2, y2, waves, amp) {
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var nx = -dy / len, ny = dx / len, d = "";
    var N = 120;
    for (var i = 0; i <= N; i++) {
      var t = i / N;
      var env = Math.sin(Math.PI * t); // taper at the ends
      var o = amp * env * Math.sin(2 * Math.PI * waves * t);
      d += (i ? "L" : "M") + (x1 + dx * t + nx * o).toFixed(1) + "," + (y1 + dy * t + ny * o).toFixed(1);
    }
    return d;
  }
  function protonSVG() {
    var q = [{ x: 160, y: 78, c: "#ff5c7a", l: "u" }, { x: 100, y: 184, c: "#5ef0a0", l: "u" }, { x: 222, y: 184, c: "#5c9bff", l: "d" }];
    var g = "";
    for (var i = 0; i < 3; i++) {
      var a = q[i], b = q[(i + 1) % 3];
      g += '<path class="gluon g' + i + '" d="' + spring(a.x, a.y, b.x, b.y, 9, 7) + '" fill="none" stroke="var(--accent-3)" stroke-width="2" stroke-linecap="round" opacity=".85"/>';
    }
    var sea = "";
    var seaPos = [[70, 120], [245, 110], [160, 230], [130, 140], [200, 145], [215, 60], [95, 70]];
    seaPos.forEach(function (p, k) {
      var d = (k * 0.7).toFixed(1);
      sea += '<g opacity="0"><animate attributeName="opacity" values="0;.9;0" dur="2.8s" begin="' + d + 's" repeatCount="indefinite"/>' +
        '<circle cx="' + (p[0] - 6) + '" cy="' + p[1] + '" r="4" fill="var(--c-research)"/>' +
        '<circle cx="' + (p[0] + 6) + '" cy="' + p[1] + '" r="4" fill="none" stroke="var(--c-research)" stroke-width="1.5"/></g>';
    });
    var quarks = q.map(function (p, k) {
      return '<g class="quark q' + k + '"><circle cx="' + p.x + '" cy="' + p.y + '" r="19" fill="' + p.c + '"/>' +
        '<text x="' + p.x + '" y="' + (p.y + 6) + '" text-anchor="middle" font-size="18" font-weight="900" fill="#0a0f1f">' + p.l + "</text></g>";
    }).join("");
    return '<svg viewBox="0 0 320 300" role="img" aria-label="Proton">' +
      "<style>.quark{animation:jig 1.4s ease-in-out infinite alternate}.q1{animation-delay:-.5s}.q2{animation-delay:-.9s}" +
      "@keyframes jig{0%{transform:translate(0,0)}33%{transform:translate(4px,-3px)}66%{transform:translate(-3px,4px)}100%{transform:translate(2px,2px)}}" +
      ".gluon{stroke-dasharray:6 3;animation:flow 1s linear infinite}@keyframes flow{to{stroke-dashoffset:-18}}" +
      "@media (prefers-reduced-motion: reduce){.quark,.gluon{animation:none}}</style>" +
      '<defs><radialGradient id="pg" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="var(--c-cv)" stop-opacity=".35"/><stop offset="1" stop-color="var(--c-cv)" stop-opacity=".05"/></radialGradient></defs>' +
      '<circle cx="160" cy="146" r="124" fill="url(#pg)" stroke="var(--c-cv)" stroke-opacity=".5" stroke-width="1.5"/>' +
      g + sea + quarks +
      '<text x="160" y="292" text-anchor="middle" font-size="12" fill="var(--muted)"><tspan lang="ja">陽子 ≈ 0.8 fm（1兆分の1 mm 程度）</tspan><tspan lang="en">proton ≈ 0.8 fm (about 10⁻¹² mm)</tspan></text>' +
      '<g font-size="11" fill="var(--muted)"><text x="8" y="16"><tspan lang="ja">● クォーク　〰 グルーオン　◐ 対生成</tspan><tspan lang="en">● quark　〰 gluon　◐ sea pairs</tspan></text></g>' +
      "</svg>";
  }

  /* ---------- AC-LGAD cross-section ---------- */
  function lgadSVG() {
    var X0 = 20, X1 = 300, hitX = 214;
    var strips = [50, 110, 170, 230, 290];
    var s = "";
    // layers
    var L = [
      { y: 78, h: 6, c: "rgba(160,200,230,.45)", ja: "絶縁膜", en: "Dielectric" },
      { y: 84, h: 8, c: "rgba(77,225,255,.55)", ja: "n⁺ 抵抗層", en: "Resistive n⁺" },
      { y: 92, h: 8, c: "var(--accent-3)", ja: "増幅層 (p⁺)", en: "Gain layer (p⁺)" },
      { y: 100, h: 150, c: "rgba(139,123,255,.14)", ja: "p 型シリコン 約50 µm", en: "p-type Si, ~50 µm" },
      { y: 250, h: 10, c: "rgba(139,123,255,.45)", ja: "p⁺⁺ 裏面", en: "p⁺⁺ backside" }
    ];
    L.forEach(function (l) {
      s += '<rect x="' + X0 + '" y="' + l.y + '" width="' + (X1 - X0) + '" height="' + l.h + '" fill="' + l.c + '"/>';
    });
    s += '<rect x="' + X0 + '" y="260" width="' + (X1 - X0) + '" height="5" fill="#c9d2e3"/>';
    strips.forEach(function (x) { s += '<rect x="' + (x - 16) + '" y="70" width="32" height="8" rx="1" fill="#c9d2e3"/>'; });
    // labels with leaders
    var labels = [{ y: 74, ja: "AC 電極（金属）", en: "AC metal pads" }].concat(L.map(function (l) { return { y: l.y + l.h / 2, ja: l.ja, en: l.en }; }));
    labels.push({ y: 263, ja: "裏面電極（高電圧）", en: "Backside (bias HV)" });
    var ly = [62, 82, 100, 118, 175, 238, 270];
    labels.forEach(function (lb, i) {
      s += '<path d="M' + X1 + "," + lb.y + " L" + (X1 + 12) + "," + ly[i] + " L" + (X1 + 18) + "," + ly[i] + '" stroke="var(--muted)" stroke-width=".8" fill="none"/>' +
        '<text x="' + (X1 + 21) + '" y="' + (ly[i] + 4) + '" font-size="10.5" fill="var(--text)"><tspan lang="ja">' + lb.ja + '</tspan><tspan lang="en">' + lb.en + "</tspan></text>";
    });
    // particle track
    s += '<line x1="' + (hitX + 6) + '" y1="20" x2="' + (hitX - 6) + '" y2="300" stroke="#fff" stroke-width="2.4" stroke-dasharray="8 6"><animate attributeName="stroke-dashoffset" values="0;-28" dur=".6s" repeatCount="indefinite"/></line>';
    s += '<text x="' + (hitX + 10) + '" y="298" font-size="10" fill="var(--muted)"><tspan lang="ja">荷電粒子</tspan><tspan lang="en">charged particle</tspan></text>';
    // e-h pairs drifting
    for (var k = 0; k < 8; k++) {
      var y = 112 + k * 17, x = hitX + 6 - 12 * (y - 20) / 280;
      var d = (k * 0.12).toFixed(2);
      s += '<circle cx="' + (x - 3) + '" cy="' + y + '" r="2.6" fill="var(--c-research)"><animate attributeName="cy" values="' + y + ';96" dur="1.6s" begin="' + d + 's" repeatCount="indefinite"/></circle>';
      s += '<circle cx="' + (x + 3) + '" cy="' + y + '" r="2.6" fill="var(--c-music)"><animate attributeName="cy" values="' + y + ';256" dur="2.4s" begin="' + d + 's" repeatCount="indefinite"/></circle>';
    }
    // avalanche
    s += '<circle cx="' + hitX + '" cy="96" r="6" fill="#fff" opacity=".8"><animate attributeName="r" values="3;16;3" dur="1.6s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.1;.9" dur="1.6s" repeatCount="indefinite"/></circle>';
    // induced signals above pads
    strips.forEach(function (x) {
      var dist = Math.abs(x - hitX);
      var A = 34 * Math.exp(-dist / 32);
      if (A < 1.5) A = 1.5;
      var b = 58;
      var path = "M" + (x - 18) + "," + b + " L" + (x - 7) + "," + b + " L" + (x - 3) + "," + (b - A).toFixed(1) + " L" + (x + 6) + "," + b + " L" + (x + 18) + "," + b;
      s += '<path d="' + path + '" fill="none" stroke="var(--c-research)" stroke-width="2" stroke-linejoin="round"/>';
    });
    s += '<text x="' + X0 + '" y="14" font-size="10.5" fill="var(--muted)"><tspan lang="ja">各電極の信号 → 大きさの比で通過位置がわかる</tspan><tspan lang="en">Signal on each pad → the ratio tells the position</tspan></text>';
    return '<svg viewBox="0 0 440 310" role="img" aria-label="AC-LGAD cross-section">' + s + "</svg>";
  }

  document.getElementById("proton-fig").innerHTML = protonSVG();
  document.getElementById("lgad-fig").innerHTML = lgadSVG();

  /* ---------- TOF simulator ---------- */
  var M = { e: 0.000511, pi: 0.13957, k: 0.49368, p: 0.93827 };
  var NAME = { e: "e", pi: "π", k: "K", p: "p" };
  var COLV = { e: "--c-travel", pi: "--c-research", k: "--c-music", p: "--accent-3" };
  var C = 0.299792458; // m/ns
  var $ = function (id) { return document.getElementById(id); };
  var cv = $("tof-canvas"), cx = cv.getContext("2d");
  var state = { a: "pi", b: "k", p: 1.5, L: 0.65, s: 30 };

  function tps(m, p, L) { return L / C * Math.sqrt(1 + (m * m) / (p * p)) * 1000; }
  function beta(m, p) { return p / Math.sqrt(p * p + m * m); }
  function reach(a, b, L, s) {
    // largest p where separation >= 3 sigma (separation decreases with p)
    var f = function (p) { return (tps(M[b], p, L) - tps(M[a], p, L)) / s - 3; };
    var lo = 0.05, hi = 50;
    if (f(lo) < 0) return 0;
    if (f(hi) > 0) return hi;
    for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
    return lo;
  }
  function col(k) { return getComputedStyle(document.documentElement).getPropertyValue(COLV[k]).trim(); }

  function read() {
    var pair = $("tof-pair").value.split("-");
    state.a = pair[0]; state.b = pair[1];
    state.p = +$("tof-p").value; state.L = +$("tof-l").value; state.s = +$("tof-s").value;
    $("o-p").textContent = state.p.toFixed(2);
    $("o-l").textContent = state.L.toFixed(2);
    $("o-s").textContent = state.s;
    var t1 = tps(M[state.a], state.p, state.L), t2 = tps(M[state.b], state.p, state.L);
    var dt = t2 - t1, n = dt / state.s;
    state.t1 = t1; state.t2 = t2; state.dt = dt; state.n = n;
    $("r-t1").textContent = (t1 / 1000).toFixed(3) + " ns";
    $("r-t2").textContent = (t2 / 1000).toFixed(3) + " ns";
    $("r-dt").textContent = dt >= 1000 ? (dt / 1000).toFixed(2) + " ns" : dt.toFixed(0) + " ps";
    $("r-n").textContent = n >= 100 ? Math.round(n) + "σ" : n.toFixed(1) + "σ";
    $("r-l1").innerHTML = K.bi({ ja: NAME[state.a] + " の飛行時間", en: "Flight time of " + NAME[state.a] });
    $("r-l2").innerHTML = K.bi({ ja: NAME[state.b] + " の飛行時間", en: "Flight time of " + NAME[state.b] });
    var v = $("r-verdict"), r = reach(state.a, state.b, state.L, state.s);
    var pairName = NAME[state.a] + "/" + NAME[state.b];
    var msg;
    if (n >= 3) { v.className = "verdict good"; msg = { ja: "✅ 3σ 以上離れています：はっきり見分けられる！", en: "✅ More than 3σ apart: clean separation!" }; }
    else if (n >= 2) { v.className = "verdict"; msg = { ja: "🤏 ギリギリ…一部は取り違えてしまいそう。", en: "🤏 Borderline — some will be mixed up." }; }
    else { v.className = "verdict bad"; msg = { ja: "❌ 山が重なって見分けられません。", en: "❌ The peaks overlap — can't tell them apart." }; }
    var rtxt = r >= 50 ? { ja: "（この条件なら運動量 50 GeV/c 以上まで 3σ 分離できます）", en: " (3σ separation holds beyond 50 GeV/c here)" }
      : { ja: "　この σ と L で " + pairName + " を 3σ で分けられるのは p ≲ " + r.toFixed(2) + " GeV/c まで。", en: " With this σ and L, " + pairName + " are separated at 3σ up to p ≈ " + r.toFixed(2) + " GeV/c." };
    v.innerHTML = K.bi(msg) + '<span class="muted" style="font-weight:500">' + K.bi(rtxt) + "</span>";
  }

  var W = 0, H = 0;
  function size() {
    var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
  }
  var t0 = performance.now();
  function draw(now) {
    var cs = getComputedStyle(document.documentElement);
    var text = cs.getPropertyValue("--text").trim(), muted = cs.getPropertyValue("--muted").trim(), line = cs.getPropertyValue("--line").trim();
    cx.clearRect(0, 0, W, H);
    var ca = col(state.a), cb = col(state.b);
    // --- race lane ---
    var laneY = 18, x0 = 40, x1 = W - 20;
    var ba = beta(M[state.a], state.p), bb = beta(M[state.b], state.p);
    var T = 2600, el = ((now - t0) % (T / bb * 1.15 + 600));
    cx.strokeStyle = line; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0, laneY + 10); cx.lineTo(x1, laneY + 10); cx.moveTo(x0, laneY + 34); cx.lineTo(x1, laneY + 34); cx.stroke();
    cx.fillStyle = muted; cx.font = "11px JetBrains Mono, monospace";
    cx.fillText(K.lang() === "ja" ? "衝突点" : "IP", 4, laneY + 26);
    cx.fillText("TOF", x1 - 22, laneY + 4);
    cx.strokeStyle = cs.getPropertyValue("--accent").trim(); cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(x1, laneY + 4); cx.lineTo(x1, laneY + 40); cx.stroke();
    [[state.a, ba, laneY + 16, ca], [state.b, bb, laneY + 28, cb]].forEach(function (o) {
      var x = x0 + Math.min(1, el * o[1] / T) * (x1 - x0);
      cx.fillStyle = o[3]; cx.beginPath(); cx.arc(x, o[2], 5, 0, Math.PI * 2); cx.fill();
      cx.fillText(NAME[o[0]], Math.max(x0, x - 22), o[2] + 4);
    });
    // --- gaussians ---
    var top = 70, bottom = H - 26, gh = bottom - top - 10;
    var mid = (state.t1 + state.t2) / 2, span = Math.max(state.dt + 8 * state.s, 10 * state.s);
    var lo = mid - span / 2, hi = mid + span / 2;
    var X = function (t) { return x0 + (t - lo) / (hi - lo) * (x1 - x0); };
    cx.strokeStyle = line; cx.lineWidth = 1;
    cx.beginPath(); cx.moveTo(x0, bottom); cx.lineTo(x1, bottom); cx.stroke();
    // ticks relative to t1
    var step = niceStep(span / 6);
    cx.fillStyle = muted; cx.textAlign = "center";
    for (var tk = Math.ceil((lo - state.t1) / step) * step; tk <= hi - state.t1; tk += step) {
      var xx = X(state.t1 + tk);
      cx.beginPath(); cx.moveTo(xx, bottom); cx.lineTo(xx, bottom + 4); cx.stroke();
      cx.fillText((tk > 0 ? "+" : "") + Math.round(tk) + " ps", xx, bottom + 16);
    }
    cx.textAlign = "left";
    [[state.t1, ca, state.a], [state.t2, cb, state.b]].forEach(function (g) {
      cx.beginPath();
      for (var i = 0; i <= 200; i++) {
        var t = lo + (hi - lo) * i / 200, y = Math.exp(-0.5 * Math.pow((t - g[0]) / state.s, 2));
        var px = X(t), py = bottom - y * gh;
        if (i === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
      }
      cx.strokeStyle = g[1]; cx.lineWidth = 2; cx.stroke();
      cx.lineTo(x1, bottom); cx.lineTo(x0, bottom); cx.closePath();
      cx.globalAlpha = 0.18; cx.fillStyle = g[1]; cx.fill(); cx.globalAlpha = 1;
      cx.fillStyle = g[1]; cx.font = "bold 14px Inter, sans-serif";
      cx.fillText(NAME[g[2]], X(g[0]) - 4, bottom - gh - 4);
      cx.font = "11px JetBrains Mono, monospace";
    });
    requestAnimationFrame(draw);
  }
  function niceStep(x) {
    var p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }

  ["tof-pair", "tof-p", "tof-l", "tof-s"].forEach(function (id) { $(id).addEventListener("input", read); });
  document.addEventListener("langchange", read);
  window.addEventListener("resize", size);
  size(); read(); requestAnimationFrame(draw);
})();
