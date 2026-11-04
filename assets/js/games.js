/* Games page — rendered from data/games.json */
(function () {
  "use strict";
  var K = window.K, bi = K.bi, esc = K.esc;
  var $ = function (id) { return document.getElementById(id); };
  var TYPES = {
    game: { ja: "アクション", en: "Action", icon: "🎮" },
    puzzle: { ja: "パズル", en: "Puzzles", icon: "🧩" },
    board: { ja: "ボードゲーム", en: "Board games", icon: "♟️" },
    quiz: { ja: "クイズ・推定", en: "Quizzes", icon: "💡" },
    music: { ja: "音楽", en: "Music", icon: "🎵" },
    tool: { ja: "ツール", en: "Tools", icon: "🛠" }
  };
  var games = [], filter = "all";

  function url(p) { return /^https?:/.test(p) ? p : K.root + p; }
  function hue(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }

  K.fetchJSON("data/games.json").then(function (d) {
    games = (d.games || []).slice().sort(function (a, b) { return (b.date || "") < (a.date || "") ? -1 : 1; });
    var types = ["all"].concat(Object.keys(TYPES).filter(function (t) { return games.some(function (g) { return (g.type || "game") === t; }); }));
    $("g-filter").innerHTML = types.map(function (t) {
      var l = t === "all" ? { ja: "すべて", en: "All" } : TYPES[t];
      return '<button class="chip' + (t === filter ? " on" : "") + '" type="button" data-t="' + t + '">' + (t === "all" ? "" : TYPES[t].icon + " ") + bi(l) + "</button>";
    }).join("");
    $("g-filter").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      filter = b.getAttribute("data-t");
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      draw();
    });
    draw();
  }).catch(function (e) { $("g-grid").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });

  function draw() {
    var list = games.filter(function (g) { return filter === "all" || (g.type || "game") === filter; });
    $("g-grid").innerHTML = list.map(function (g) {
      var h = hue(g.id || "x");
      var thumb = g.thumb ? '<img src="' + esc(url(g.thumb)) + '" alt="" loading="lazy">'
        : '<div class="gen" style="background:linear-gradient(135deg,hsl(' + h + ',80%,55%),hsl(' + ((h + 70) % 360) + ',80%,45%))"></div><span style="position:relative">' + esc(g.emoji || "🎮") + "</span>";
      var tags = (g.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + "</span>"; }).join(" ");
      return '<article class="game-card"><div class="game-thumb">' + thumb + '</div><div class="game-body">' +
        '<div class="muted small mono">' + esc(K.fmtMonth(g.date)) + " · " + (TYPES[g.type || "game"] || TYPES.game).icon + "</div>" +
        "<h3>" + bi(g.title) + "</h3><p>" + bi(g.description) + "</p>" + (tags ? '<div class="chips">' + tags + "</div>" : "") +
        '<div class="game-actions">' +
        (g.path ? '<button class="btn btn-sm btn-primary" type="button" data-play="' + esc(g.id) + '">▶ ' + bi({ ja: "遊ぶ", en: "Play" }) + "</button>" : "") +
        (g.source ? '<a class="btn btn-sm" href="' + esc(g.source) + '" target="_blank" rel="noopener">&lt;/&gt; ' + bi({ ja: "ソース", en: "Source" }) + "</a>" : "") +
        "</div></div></article>";
    }).join("") +
      '<article class="game-card" style="border-style:dashed;box-shadow:none"><div class="game-thumb" style="font-size:2.2rem">＋</div><div class="game-body"><h3>' +
      bi({ ja: "次の作品をここに", en: "Your next creation" }) + "</h3><p>" +
      bi({ ja: "games/ フォルダに HTML ゲームを置いて data/games.json に登録するか、管理ページからフォルダごとアップロードできます。", en: "Drop an HTML game into games/ and register it in data/games.json — or upload the whole folder from the admin page." }) + "</p></div></article>";
  }

  var modal = $("g-modal"), frame = $("g-frame");
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-play]"); if (!b) return;
    var g = games.find(function (x) { return x.id === b.getAttribute("data-play"); });
    if (!g) return;
    // games read the theme from localStorage; persist the one the site is showing now
    try { localStorage.setItem("theme", K.theme()); } catch (err) {}
    $("g-title").innerHTML = bi(g.title);
    $("g-newtab").href = url(g.path);
    frame.src = url(g.path);
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  });
  function close() { modal.classList.remove("open"); frame.src = "about:blank"; document.body.style.overflow = ""; }
  $("g-close").addEventListener("click", close);
  modal.addEventListener("click", function (e) { if (e.target === modal) close(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) close(); });
})();
