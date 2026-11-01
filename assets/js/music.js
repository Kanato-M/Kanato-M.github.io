/* Music page — playlists, karaoke, theory notes, sound lab */
(function () {
  "use strict";
  var K = window.K, bi = K.bi, esc = K.esc;
  var $ = function (id) { return document.getElementById(id); };
  var data = { playlists: [], karaoke: [], theory: [] };

  K.fetchJSON("data/music.json").then(function (d) {
    data = { playlists: d.playlists || [], karaoke: d.karaoke || [], theory: d.theory || [] };
    drawPlaylists(); initKaraoke(); drawNotes();
    var h = decodeURIComponent(location.hash.slice(1));
    if (h.indexOf("note-") === 0) openNote(h.slice(5), false);
  }).catch(function (e) { $("m-playlists").innerHTML = '<div class="empty">' + esc(e.message) + "</div>"; });

  /* ---------------- Playlists ---------------- */
  function embed(u) {
    if (!u) return null;
    var m;
    if ((m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album|track|artist|show|episode)\/([A-Za-z0-9]+)/)))
      return { src: "https://open.spotify.com/embed/" + m[1] + "/" + m[2], h: 352, name: "Spotify" };
    if ((m = u.match(/[?&]list=([\w-]+)/)) && /youtu/.test(u))
      return { src: "https://www.youtube-nocookie.com/embed/videoseries?list=" + m[1], h: 220, name: "YouTube" };
    if ((m = u.match(/(?:youtu\.be\/|v=)([\w-]{11})/)))
      return { src: "https://www.youtube-nocookie.com/embed/" + m[1], h: 220, name: "YouTube" };
    if (/music\.apple\.com/.test(u))
      return { src: u.replace("music.apple.com", "embed.music.apple.com"), h: 450, name: "Apple Music" };
    if (/soundcloud\.com/.test(u))
      return { src: "https://w.soundcloud.com/player/?url=" + encodeURIComponent(u) + "&visual=true", h: 300, name: "SoundCloud" };
    return { link: u };
  }
  function drawPlaylists() {
    $("m-playlists").innerHTML = data.playlists.map(function (p) {
      var e = embed(p.url);
      var body;
      if (e && e.src) body = '<iframe src="' + esc(e.src) + '" height="' + e.h + '" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="' + esc(K.t(p.title)) + '"></iframe>';
      else if (e && e.link) body = '<div class="pl-fallback"><a class="btn btn-sm" href="' + esc(e.link) + '" target="_blank" rel="noopener">↗ ' + bi({ ja: "開く", en: "Open" }) + "</a></div>";
      else body = '<div class="pl-fallback"><div class="empty" style="padding:1.4rem"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span><br>' +
        bi({ ja: "Spotify / YouTube / Apple Music / SoundCloud の URL を登録すると、ここで再生できます。", en: "Add a Spotify / YouTube / Apple Music / SoundCloud URL and it will play here." }) + "</div></div>";
      return '<article class="playlist-card reveal in"><div class="pl-head"><h3>' + bi(p.title) + (p.sample ? ' <span class="tag">sample</span>' : "") + "</h3>" +
        (p.description ? "<p>" + bi(p.description) + "</p>" : "") + "</div>" + body + "</article>";
    }).join("") || '<div class="empty">—</div>';
  }

  /* ---------------- Karaoke ---------------- */
  var kSort = { key: "rating", dir: -1 }, kQuery = "", kGenre = "all";
  function stars(n) { n = Math.max(0, Math.min(5, +n || 0)); return '<span class="stars" title="' + n + '/5">' + "★".repeat(n) + '<span style="opacity:.25">' + "★".repeat(5 - n) + "</span></span>"; }
  function initKaraoke() {
    var list = data.karaoke;
    var genres = {};
    list.forEach(function (s) { if (s.genre) genres[s.genre] = 1; });
    function fillGenres() {
      $("k-genre").innerHTML = '<option value="all">' + (K.lang() === "ja" ? "全ジャンル" : "All genres") + "</option>" +
        Object.keys(genres).sort().map(function (g) { return '<option' + (g === kGenre ? " selected" : "") + ">" + esc(g) + "</option>"; }).join("");
    }
    fillGenres();
    document.addEventListener("langchange", fillGenres);
    var scores = list.map(function (s) { return +s.score; }).filter(function (x) { return x > 0; });
    var artists = {};
    list.forEach(function (s) { if (s.artist) artists[s.artist] = (artists[s.artist] || 0) + 1; });
    var top = Object.keys(artists).sort(function (a, b) { return artists[b] - artists[a]; })[0];
    $("k-stats").innerHTML = [
      [list.length, { ja: "持ち歌", en: "Songs" }],
      [scores.length ? Math.max.apply(null, scores).toFixed(1) : "–", { ja: "自己最高点", en: "Best score" }],
      [scores.length ? (scores.reduce(function (a, b) { return a + b; }, 0) / scores.length).toFixed(1) : "–", { ja: "平均点", en: "Average score" }],
      [top ? esc(top) : "–", { ja: "いちばん歌うアーティスト", en: "Most-sung artist" }]
    ].map(function (s, i) { return '<div class="stat"><div class="num"' + (i === 3 ? ' style="font-size:1.3rem;line-height:1.6"' : "") + ">" + s[0] + '</div><div class="lbl">' + bi(s[1]) + "</div></div>"; }).join("");

    $("k-search").addEventListener("input", function () { kQuery = this.value.toLowerCase(); drawKaraoke(); });
    $("k-genre").addEventListener("change", function () { kGenre = this.value; drawKaraoke(); });
    document.querySelectorAll("th[data-sort]").forEach(function (th) {
      th.addEventListener("click", function () {
        var k = th.getAttribute("data-sort");
        kSort = { key: k, dir: kSort.key === k ? -kSort.dir : (k === "score" || k === "rating" ? -1 : 1) };
        drawKaraoke();
      });
    });
    $("k-roulette").addEventListener("click", roulette);
    drawKaraoke();
  }
  function kFiltered() {
    return data.karaoke.filter(function (s) {
      var hay = [s.song, s.artist, s.reading, K.t(s.note)].join(" ").toLowerCase();
      return (!kQuery || hay.indexOf(kQuery) >= 0) && (kGenre === "all" || s.genre === kGenre);
    }).sort(function (a, b) {
      var x = a[kSort.key], y = b[kSort.key];
      if (kSort.key === "score" || kSort.key === "rating") { x = +x || 0; y = +y || 0; return (x - y) * kSort.dir; }
      return String(x || "").localeCompare(String(y || ""), "ja") * kSort.dir;
    });
  }
  function drawKaraoke() {
    var rows = kFiltered();
    if (!data.karaoke.length) {
      $("k-body").innerHTML = '<tr><td colspan="7" class="wrap" style="text-align:center;padding:2rem" >🎤 ' +
        bi({ ja: "まだ曲が登録されていません。管理ページの「カラオケ」から追加できます。", en: "No songs yet — add them from the “Karaoke” tab of the admin page." }) + "</td></tr>";
      return;
    }
    $("k-body").innerHTML = rows.map(function (s, i) {
      return '<tr data-i="' + i + '"><td><strong>' + esc(s.song) + "</strong></td><td>" + esc(s.artist) + "</td><td>" + esc(s.genre || "") + '</td><td class="mono">' + esc(s.key || "±0") +
        '</td><td class="mono">' + (s.score ? esc(s.score) : "–") + "</td><td>" + stars(s.rating) + '</td><td class="wrap muted small">' + bi(s.note) +
        (s.url ? ' <a href="' + esc(s.url) + '" target="_blank" rel="noopener">♪</a>' : "") + "</td></tr>";
    }).join("") || '<tr><td colspan="7" class="muted" style="text-align:center">' + bi({ ja: "該当なし", en: "No match" }) + "</td></tr>";
  }
  function roulette() {
    var rows = kFiltered();
    if (!rows.length) { $("k-pick").innerHTML = bi({ ja: "曲を登録してね", en: "Add some songs first" }); return; }
    var n = 0, total = 14 + Math.floor(Math.random() * 8), idx = 0;
    (function spin() {
      idx = Math.floor(Math.random() * rows.length);
      $("k-pick").textContent = "🎶 " + rows[idx].song + " / " + rows[idx].artist;
      n++;
      if (n < total) setTimeout(spin, 40 + n * n * 1.6);
      else {
        var tr = document.querySelector('#k-body tr[data-i="' + idx + '"]');
        if (tr) { tr.classList.remove("picked"); void tr.offsetWidth; tr.classList.add("picked"); tr.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
      }
    })();
  }

  /* ---------------- Theory notes ---------------- */
  var openId = null;
  function drawNotes() {
    $("m-notes").innerHTML = data.theory.slice().sort(function (a, b) { return (b.date || "") < (a.date || "") ? -1 : 1; }).map(function (n) {
      return '<button class="note-card" type="button" data-note="' + esc(n.id) + '"><span class="muted small mono">' + esc(K.fmtMonth(n.date)) + "</span>" +
        "<h3>" + bi(n.title) + "</h3><p>" + bi(n.summary) + '</p><div class="chips" style="margin-top:.6rem">' +
        (n.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + "</span>"; }).join(" ") + "</div></button>";
    }).join("") || '<div class="empty">—</div>';
    $("m-notes").addEventListener("click", function (e) {
      var b = e.target.closest("[data-note]"); if (b) openNote(b.getAttribute("data-note"), true);
    });
  }
  function noteFile(n) {
    var f = n.file;
    if (f && typeof f === "object") return f[K.lang()] || f.ja || f.en;
    return f;
  }
  function openNote(id, scroll) {
    var n = data.theory.find(function (x) { return x.id === id; });
    if (!n) return;
    openId = id;
    history.replaceState(null, "", "#note-" + encodeURIComponent(id));
    var file = noteFile(n), el = $("m-note");
    el.classList.remove("hidden");
    el.innerHTML = '<p class="muted">Loading…</p>';
    fetch(K.root + file, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (md) {
      var dir = file.replace(/[^/]*$/, "");
      var html = window.marked ? window.marked.parse(md) : "<pre>" + esc(md) + "</pre>";
      html = html.replace(/(src|href)="(?!https?:|\/|#|mailto:|data:)([^"]+)"/g, function (_, a, p) { return a + '="' + K.root + dir + p + '"'; });
      el.innerHTML = '<p style="display:flex;justify-content:space-between;gap:1rem;margin:0 0 1rem"><span class="muted mono small">' + esc(K.fmtMonth(n.date)) + "</span>" +
        '<button class="btn btn-sm btn-ghost" type="button" id="note-close">✕ ' + bi({ ja: "閉じる", en: "Close" }) + "</button></p>" + html;
      $("note-close").addEventListener("click", function () { el.classList.add("hidden"); openId = null; history.replaceState(null, "", location.pathname); });
      if (scroll) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }).catch(function (e) { el.innerHTML = '<p class="empty">Could not load note: ' + esc(file) + " (" + esc(e.message) + ")</p>"; });
  }
  document.addEventListener("langchange", function () {
    if (openId) { var n = data.theory.find(function (x) { return x.id === openId; }); if (n && typeof n.file === "object") openNote(openId, false); }
  });

  /* ---------------- Sound lab ---------------- */
  var ac = null;
  function audio() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tone(f, dur, type, gain, when) {
    var a = audio(), t = (when || a.currentTime), o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = type || "triangle"; o.frequency.value = f;
    lp.type = "lowpass"; lp.frequency.value = 3500;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain || 0.2, t + 0.02);
    g.gain.setValueAtTime(gain || 0.2, t + dur - 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.05);
  }
  var NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C"];
  var KEYS = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j", "k"];
  function freq(semi) { return 440 * Math.pow(2, (semi - 9) / 12); } // semi 0 = C4
  (function buildKeyboard() {
    var kb = $("kbd"), whites = [0, 2, 4, 5, 7, 9, 11, 12], blacks = { 1: 0, 3: 1, 6: 3, 8: 4, 10: 5 };
    var html = whites.map(function (s) { return '<div class="key" data-s="' + s + '">' + NAMES[s] + (s === 12 ? "5" : "4") + "</div>"; }).join("");
    Object.keys(blacks).forEach(function (s) {
      var left = (blacks[s] + 1) / whites.length * 100 - 2.75;
      html += '<div class="key black" data-s="' + s + '" style="left:' + left + '%">' + NAMES[s] + "</div>";
    });
    kb.innerHTML = html;
    function play(s) {
      var f = freq(s);
      tone(f, 0.9, "triangle", 0.25);
      var el = kb.querySelector('[data-s="' + s + '"]');
      el.classList.add("on"); setTimeout(function () { el.classList.remove("on"); }, 220);
      $("kbd-freq").textContent = NAMES[s] + (s === 12 ? "5" : "4") + " = " + f.toFixed(2) + " Hz  (2^(" + (s - 9) + "/12) × 440 Hz)";
    }
    kb.addEventListener("pointerdown", function (e) { var k = e.target.closest(".key"); if (k) { e.preventDefault(); play(+k.getAttribute("data-s")); } });
    document.addEventListener("keydown", function (e) {
      if (e.repeat || e.metaKey || e.ctrlKey || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      var i = KEYS.indexOf(e.key.toLowerCase());
      if (i >= 0) play(i);
    });
  })();
  document.querySelectorAll("[data-chord]").forEach(function (b) {
    b.addEventListener("click", function () {
      var c = freq(0), ratios = b.getAttribute("data-chord") === "just" ? [1, 5 / 4, 3 / 2] : [1, Math.pow(2, 4 / 12), Math.pow(2, 7 / 12)];
      var t = audio().currentTime + 0.02;
      ratios.forEach(function (r) { tone(c * r, 3, "sawtooth", 0.07, t); });
    });
  });
  function beatTxt() {
    var df = +$("beat-df").value;
    $("beat-o").textContent = df;
    $("beat-txt").innerHTML = bi({ ja: "うなり：毎秒 " + df + " 回", en: "Beats: " + df + " per second" });
  }
  $("beat-df").addEventListener("input", beatTxt);
  document.addEventListener("langchange", beatTxt);
  beatTxt();
  $("beat-play").addEventListener("click", function () {
    var df = +$("beat-df").value, t = audio().currentTime + 0.02;
    tone(440, 4, "sine", 0.18, t); tone(440 + df, 4, "sine", 0.18, t);
  });
})();
