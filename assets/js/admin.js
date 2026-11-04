/* =========================================================
   Admin page — edit site data & upload files via GitHub API.
   Everything is staged locally and pushed as ONE commit
   (Git Data API: blobs → tree → commit → ref).
   ========================================================= */
(function () {
  "use strict";
  var K = window.K, bi = K.bi, esc = K.esc;
  var $ = function (id) { return document.getElementById(id); };
  var API = "https://api.github.com";

  /* ---------------- state ---------------- */
  var cfg = { repo: K.site.owner + "/" + K.site.repo, branch: K.site.branch, token: "" };
  var files = {};          // path -> { data, sha }   (JSON files loaded from GitHub)
  var dirty = {};          // JSON path -> true
  var texts = {};          // path -> string           (markdown etc.)
  var blobs = {};          // path -> { b64, url }      (binary uploads, url = preview objectURL)
  var deletes = {};        // path -> true             (files to remove)
  var tab = "travel", sel = -1, pickerMap = null;

  /* ---------------- helpers ---------------- */
  function log(msg) { var l = $("log"); l.textContent = (l.textContent === "—" ? "" : l.textContent + "\n") + "[" + new Date().toLocaleTimeString() + "] " + msg; l.scrollTop = l.scrollHeight; }
  function tr(ja, en) { return bi({ ja: ja, en: en }); }
  function getStore(k) { try { return localStorage.getItem(k) || sessionStorage.getItem(k); } catch (e) { return null; } }
  function b64ToUtf8(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function slug(s) { return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40); }
  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }

  async function gh(path, opts) {
    opts = opts || {};
    var r = await fetch(API + path, {
      method: opts.method || "GET",
      headers: { "Authorization": "Bearer " + cfg.token, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    });
    if (r.status === 404 && opts.allow404) return null;
    if (!r.ok) {
      var t = ""; try { t = (await r.json()).message; } catch (e) {}
      throw new Error(r.status + " " + (t || r.statusText) + " (" + path + ")");
    }
    return r.status === 204 ? null : r.json();
  }
  function repoPath(p) { return "/repos/" + cfg.repo + p; }
  async function loadFile(path) {
    var d = await gh(repoPath("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(cfg.branch)), { allow404: true });
    if (!d) return null;
    var content = d.content ? b64ToUtf8(d.content) : await (await fetch(d.download_url, { cache: "no-store" })).text();
    return { text: content, sha: d.sha };
  }

  /* ---------------- schemas ---------------- */
  var CAT_OPTS = [["trip", "✈️ 旅行 / Trip"], ["research", "🔬 研究・出張 / Research"], ["home", "🏠 拠点 / Home"]];
  var C = {
    travel: {
      file: "data/travel.json", key: "places", icon: "🗺️", label: { ja: "旅行", en: "Travel" },
      title: function (it) { return K.t(it.name) || it.id || "(new)"; }, sub: function (it) { return (it.start || "") + " · 📷" + (it.photos || []).length; },
      blank: function () { return { id: "", category: "trip", name: { ja: "", en: "" }, country: { ja: "", en: "" }, countryCode: "", lat: null, lng: null, start: "", end: "", tags: [], description: { ja: "", en: "" }, photos: [] }; },
      fields: [
        { k: "name", t: "bi", l: { ja: "場所の名前", en: "Place name" } },
        { k: "id", t: "text", l: { ja: "ID（URL用・半角英数とハイフン）", en: "ID (for URLs: a-z, 0-9, -)" } },
        { k: "category", t: "select", o: CAT_OPTS, l: { ja: "種類", en: "Category" } },
        { k: "country", t: "bi", l: { ja: "国・地域", en: "Country / region" } },
        { k: "countryCode", t: "text", l: { ja: "国コード（JP, US …）", en: "Country code (JP, US …)" } },
        { k: "start", t: "text", l: { ja: "開始日（YYYY-MM または YYYY-MM-DD）", en: "Start (YYYY-MM or YYYY-MM-DD)" } },
        { k: "end", t: "text", l: { ja: "終了日（任意）", en: "End (optional)" } },
        { k: "lat", t: "number", l: { ja: "緯度", en: "Latitude" } },
        { k: "lng", t: "number", l: { ja: "経度", en: "Longitude" } },
        { k: "tags", t: "tags", l: { ja: "タグ（カンマ区切り）", en: "Tags (comma separated)" } },
        { k: "description", t: "bitext", l: { ja: "説明", en: "Description" } }
      ],
      extra: travelExtra
    },
    games: {
      file: "data/games.json", key: "games", icon: "🎮", label: { ja: "ゲーム", en: "Games" },
      title: function (it) { return K.t(it.title) || it.id || "(new)"; }, sub: function (it) { return it.date || ""; },
      blank: function () { return { id: "", type: "game", emoji: "🎮", title: { ja: "", en: "" }, description: { ja: "", en: "" }, path: "", thumb: "", tags: [], date: new Date().toISOString().slice(0, 7), source: "" }; },
      fields: [
        { k: "title", t: "bi", l: { ja: "タイトル", en: "Title" } },
        { k: "id", t: "text", l: { ja: "ID（フォルダ名 games/ID/）", en: "ID (folder name games/ID/)" } },
        { k: "type", t: "select", o: [["game", "🎮 アクション / Action"], ["puzzle", "🧩 パズル / Puzzle"], ["board", "♟️ ボード / Board"], ["quiz", "💡 クイズ / Quiz"], ["music", "🎵 音楽 / Music"], ["tool", "🛠 ツール / Tool"]], l: { ja: "種類", en: "Type" } },
        { k: "emoji", t: "text", l: { ja: "絵文字（サムネ未設定時）", en: "Emoji (when no thumbnail)" } },
        { k: "date", t: "text", l: { ja: "公開日（YYYY-MM）", en: "Date (YYYY-MM)" } },
        { k: "path", t: "text", l: { ja: "起動ファイル（例 games/ID/index.html または外部URL）", en: "Entry file (e.g. games/ID/index.html or external URL)" } },
        { k: "thumb", t: "text", l: { ja: "サムネイル画像パス", en: "Thumbnail path" } },
        { k: "source", t: "text", l: { ja: "ソースコード URL（任意）", en: "Source URL (optional)" } },
        { k: "tags", t: "tags", l: { ja: "タグ", en: "Tags" } },
        { k: "description", t: "bitext", l: { ja: "説明", en: "Description" } }
      ],
      extra: gamesExtra
    },
    playlists: {
      file: "data/music.json", key: "playlists", icon: "🎧", label: { ja: "プレイリスト", en: "Playlists" },
      title: function (it) { return K.t(it.title) || "(new)"; }, sub: function (it) { return it.url ? it.url.replace(/^https?:\/\//, "").slice(0, 32) : "—"; },
      blank: function () { return { title: { ja: "", en: "" }, description: { ja: "", en: "" }, url: "" }; },
      fields: [
        { k: "title", t: "bi", l: { ja: "タイトル", en: "Title" } },
        { k: "url", t: "text", l: { ja: "URL（Spotify / YouTube / Apple Music / SoundCloud）", en: "URL (Spotify / YouTube / Apple Music / SoundCloud)" } },
        { k: "description", t: "bitext", l: { ja: "説明", en: "Description" } },
        { k: "sample", t: "check", l: { ja: "サンプル表示（本番では外す）", en: "Mark as sample" } }
      ]
    },
    karaoke: {
      file: "data/music.json", key: "karaoke", icon: "🎤", label: { ja: "カラオケ", en: "Karaoke" },
      title: function (it) { return it.song || "(new)"; }, sub: function (it) { return it.artist || ""; },
      blank: function () { return { song: "", artist: "", genre: "", key: "±0", score: null, rating: 3, note: { ja: "", en: "" }, url: "" }; },
      fields: [
        { k: "song", t: "text", l: { ja: "曲名", en: "Song" } },
        { k: "artist", t: "text", l: { ja: "アーティスト", en: "Artist" } },
        { k: "genre", t: "text", l: { ja: "ジャンル", en: "Genre" } },
        { k: "key", t: "text", l: { ja: "キー（例 −2, ±0, +1）", en: "Key (e.g. −2, ±0, +1)" } },
        { k: "score", t: "number", l: { ja: "最高点", en: "Best score" } },
        { k: "rating", t: "select", o: [[0, "☆☆☆☆☆"], [1, "★"], [2, "★★"], [3, "★★★"], [4, "★★★★"], [5, "★★★★★"]], l: { ja: "得意度", en: "Confidence" }, num: true },
        { k: "url", t: "text", l: { ja: "参考リンク（任意）", en: "Link (optional)" } },
        { k: "note", t: "bitext", l: { ja: "メモ", en: "Notes" } }
      ]
    },
    theory: {
      file: "data/music.json", key: "theory", icon: "🎼", label: { ja: "音楽ノート", en: "Theory notes" },
      title: function (it) { return K.t(it.title) || it.id || "(new)"; }, sub: function (it) { return it.date || ""; },
      blank: function () { return { id: "", title: { ja: "", en: "" }, summary: { ja: "", en: "" }, file: { ja: "", en: "" }, date: new Date().toISOString().slice(0, 7), tags: [] }; },
      fields: [
        { k: "title", t: "bi", l: { ja: "タイトル", en: "Title" } },
        { k: "id", t: "text", l: { ja: "ID", en: "ID" } },
        { k: "date", t: "text", l: { ja: "日付（YYYY-MM）", en: "Date (YYYY-MM)" } },
        { k: "tags", t: "tags", l: { ja: "タグ", en: "Tags" } },
        { k: "summary", t: "bitext", l: { ja: "概要", en: "Summary" } }
      ],
      extra: theoryExtra
    },
    news: {
      file: "data/news.json", key: "items", icon: "📰", label: { ja: "お知らせ", en: "News" },
      title: function (it) { return K.t(it.text).slice(0, 28) || "(new)"; }, sub: function (it) { return it.date || ""; },
      blank: function () { return { date: new Date().toISOString().slice(0, 7), text: { ja: "", en: "" }, link: "" }; },
      fields: [
        { k: "date", t: "text", l: { ja: "日付（YYYY-MM）", en: "Date (YYYY-MM)" } },
        { k: "text", t: "bitext", l: { ja: "本文", en: "Text" } },
        { k: "link", t: "text", l: { ja: "リンク（任意）", en: "Link (optional)" } }
      ]
    },
    cv: { file: "data/cv.json", icon: "📄", label: { ja: "CV", en: "CV" }, raw: true }
  };
  var FILES = ["data/travel.json", "data/games.json", "data/music.json", "data/news.json", "data/cv.json"];

  /* ---------------- connect ---------------- */
  $("cfg-repo").value = getStore("admin-repo") || cfg.repo;
  $("cfg-branch").value = getStore("admin-branch") || cfg.branch;
  var saved = getStore("gh-token");
  if (saved) { $("tok").value = saved; $("remember").checked = !!localStorage.getItem("gh-token"); }

  $("btn-connect").addEventListener("click", connect);
  $("tok").addEventListener("keydown", function (e) { if (e.key === "Enter") connect(); });
  $("btn-logout").addEventListener("click", function () {
    try { localStorage.removeItem("gh-token"); sessionStorage.removeItem("gh-token"); } catch (e) {}
    $("tok").value = ""; cfg.token = ""; $("editor").classList.add("hidden"); $("status-dot").classList.remove("ok");
    $("conn-msg").innerHTML = tr("トークンを消去しました。", "Token removed.");
  });

  async function connect() {
    cfg.token = $("tok").value.trim();
    cfg.repo = $("cfg-repo").value.trim();
    cfg.branch = $("cfg-branch").value.trim() || "main";
    if (!cfg.token) { $("conn-msg").innerHTML = tr("トークンを入力してください。", "Please paste a token."); return; }
    $("conn-msg").textContent = "…";
    try {
      var user = await gh("/user");
      var repo = await gh(repoPath(""));
      if (repo.permissions && repo.permissions.push === false) throw new Error("No write permission on " + cfg.repo);
      try {
        var store = $("remember").checked ? localStorage : sessionStorage;
        localStorage.removeItem("gh-token"); sessionStorage.removeItem("gh-token");
        store.setItem("gh-token", cfg.token); store.setItem("admin-repo", cfg.repo); store.setItem("admin-branch", cfg.branch);
      } catch (e) {}
      $("status-dot").classList.add("ok");
      $("conn-msg").innerHTML = tr("接続しました：", "Connected as ") + "<b>" + esc(user.login) + "</b> → " + esc(cfg.repo) + "@" + esc(cfg.branch);
      await loadAll();
      $("editor").classList.remove("hidden");
      var h = location.hash.slice(1);
      openTab(C[h] ? h : tab);
    } catch (e) {
      $("status-dot").classList.remove("ok");
      $("conn-msg").innerHTML = "⚠️ " + esc(e.message);
    }
  }

  async function loadAll() {
    files = {}; dirty = {}; texts = {}; deletes = {};
    Object.keys(blobs).forEach(function (p) { if (blobs[p].url) URL.revokeObjectURL(blobs[p].url); });
    blobs = {};
    for (var i = 0; i < FILES.length; i++) {
      var f = await loadFile(FILES[i]);
      files[FILES[i]] = f ? { data: JSON.parse(f.text), sha: f.sha } : { data: {}, sha: null };
    }
    log((K.lang() === "ja" ? "データを読み込みました" : "Loaded data") + " (" + FILES.length + " files)");
    renderPending();
  }

  /* ---------------- tabs & list ---------------- */
  function renderTabs() {
    $("tabs").innerHTML = Object.keys(C).map(function (k) {
      return '<button class="chip' + (k === tab ? " on" : "") + '" type="button" data-tab="' + k + '">' + C[k].icon + " " + bi(C[k].label) + "</button>";
    }).join("");
  }
  $("tabs").addEventListener("click", function (e) { var b = e.target.closest("[data-tab]"); if (b) openTab(b.getAttribute("data-tab")); });
  function openTab(k) {
    tab = k; sel = -1; history.replaceState(null, "", "#" + k);
    renderTabs();
    var raw = !!C[k].raw;
    $("btn-new").parentElement.parentElement.classList.toggle("hidden", raw);
    $("form-wrap").parentElement.style.gridTemplateColumns = raw ? "1fr" : "";
    if (raw) { renderRaw(); return; }
    renderList();
    var arr = items();
    if (arr.length) select(0); else $("form-wrap").innerHTML = '<div class="empty">' + tr("まだ項目がありません。「＋ 新規」から追加してください。", "Nothing here yet — press “+ New”.") + "</div>";
  }
  function items() {
    var c = C[tab], d = files[c.file].data;
    if (!Array.isArray(d[c.key])) d[c.key] = [];
    return d[c.key];
  }
  function renderList() {
    var c = C[tab];
    $("item-list").innerHTML = items().map(function (it, i) {
      return '<button type="button" data-i="' + i + '" class="' + (i === sel ? "active" : "") + '"><strong>' + esc(c.title(it)) + '</strong><br><span class="muted small mono">' + esc(c.sub(it)) + "</span></button>";
    }).join("");
  }
  $("item-list").addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) select(+b.getAttribute("data-i")); });
  $("btn-new").addEventListener("click", function () {
    var it = C[tab].blank(); it._new = true;
    items().unshift(it); markDirty(C[tab].file); select(0);
  });

  function markDirty(path) { dirty[path] = true; renderPending(); }

  /* ---------------- generic form ---------------- */
  function select(i) {
    sel = i; renderList();
    var c = C[tab], it = items()[i];
    if (!it) return;
    var h = '<div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:1rem"><h2 style="font-size:1.2rem;margin:0">' + c.icon + " " + esc(c.title(it)) + "</h2>" +
      '<button class="btn btn-sm btn-danger" type="button" id="btn-del">🗑 ' + tr("削除", "Delete") + "</button></div>";
    h += '<div class="form-grid">' + c.fields.map(function (f) { return fieldHTML(f, it); }).join("") + "</div>";
    h += '<div id="extra" style="margin-top:1.2rem"></div>';
    $("form-wrap").innerHTML = h;
    $("form-wrap").querySelectorAll("[data-k]").forEach(function (el) {
      el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", function () { onField(el, it); });
    });
    $("btn-del").addEventListener("click", function () {
      if (!confirm(K.lang() === "ja" ? "この項目を削除しますか？" : "Delete this item?")) return;
      if (tab === "travel") (it.photos || []).forEach(function (p) { removeFile(p.src); if (p.thumb) removeFile(p.thumb); });
      items().splice(i, 1); markDirty(c.file); sel = -1; renderList();
      $("form-wrap").innerHTML = '<div class="empty">' + tr("削除しました（コミットで反映）", "Deleted (applies on commit)") + "</div>";
    });
    if (c.extra) c.extra(it, $("extra"));
  }
  function fieldHTML(f, it) {
    var lab = "<label>" + bi(f.l) + "</label>", v = it[f.k], full = (f.t === "bitext" || f.t === "bi") ? " full" : "";
    var a = ' data-k="' + f.k + '"';
    if (f.t === "bi") {
      v = v && typeof v === "object" ? v : { ja: v || "", en: "" };
      return '<div class="' + full + '">' + lab + '<div class="form-grid"><input' + a + ' data-sub="ja" placeholder="日本語" value="' + esc(v.ja) + '"><input' + a + ' data-sub="en" placeholder="English" value="' + esc(v.en) + '"></div></div>';
    }
    if (f.t === "bitext") {
      v = v && typeof v === "object" ? v : { ja: v || "", en: "" };
      return '<div class="' + full + '">' + lab + '<div class="form-grid"><textarea' + a + ' data-sub="ja" placeholder="日本語">' + esc(v.ja) + "</textarea><textarea" + a + ' data-sub="en" placeholder="English">' + esc(v.en) + "</textarea></div></div>";
    }
    if (f.t === "select") {
      return "<div>" + lab + "<select" + a + (f.num ? ' data-num="1"' : "") + ">" + f.o.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></div>";
    }
    if (f.t === "check") return '<div><label style="display:flex;gap:.5rem;align-items:center;margin-top:1.6rem"><input type="checkbox" style="width:auto"' + a + (v ? " checked" : "") + "> " + bi(f.l) + "</label></div>";
    if (f.t === "tags") return "<div>" + lab + "<input" + a + ' data-tags="1" value="' + esc((v || []).join(", ")) + '"></div>';
    if (f.t === "number") return "<div>" + lab + '<input type="number" step="any"' + a + ' data-num="1" value="' + (v == null ? "" : esc(v)) + '"></div>';
    return "<div>" + lab + "<input" + a + ' value="' + esc(v == null ? "" : v) + '"></div>';
  }
  function onField(el, it) {
    var k = el.getAttribute("data-k"), sub = el.getAttribute("data-sub"), v;
    if (el.type === "checkbox") v = el.checked;
    else if (el.hasAttribute("data-num")) v = el.value === "" ? null : parseFloat(el.value);
    else if (el.hasAttribute("data-tags")) v = el.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    else v = el.value;
    if (sub) { if (!it[k] || typeof it[k] !== "object") it[k] = { ja: "", en: "" }; it[k][sub] = v; }
    else it[k] = v;
    // auto ID from English name/title
    if ((k === "name" || k === "title") && sub === "en" && it._new && !it._idTouched && C[tab].fields.some(function (f) { return f.k === "id"; })) {
      var base = slug(v) + (it.start ? "-" + String(it.start).slice(0, 4) : "");
      it.id = base; var idEl = $("form-wrap").querySelector('[data-k="id"]'); if (idEl) idEl.value = base;
    }
    if (k === "id") it._idTouched = true;
    if (k === "lat" || k === "lng") movePicker(it);
    markDirty(C[tab].file);
    var btn = $("item-list").querySelector('[data-i="' + sel + '"]');
    if (btn) btn.innerHTML = "<strong>" + esc(C[tab].title(it)) + '</strong><br><span class="muted small mono">' + esc(C[tab].sub(it)) + "</span>";
  }

  /* ---------------- file staging ---------------- */
  function stageBlob(path, b64, previewBlob) {
    delete deletes[path];
    if (blobs[path] && blobs[path].url) URL.revokeObjectURL(blobs[path].url);
    blobs[path] = { b64: b64, url: previewBlob ? URL.createObjectURL(previewBlob) : null, isNew: true };
    renderPending();
  }
  function removeFile(path) {
    if (!path || /^https?:/.test(path)) return;
    if (blobs[path]) { if (blobs[path].url) URL.revokeObjectURL(blobs[path].url); delete blobs[path]; }
    else deletes[path] = true;
    renderPending();
  }
  function previewSrc(path) { return blobs[path] && blobs[path].url ? blobs[path].url : (/^https?:/.test(path) ? path : K.root + path); }
  function fileToB64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1]); };
      r.onerror = rej; r.readAsDataURL(file);
    });
  }
  async function decodeImage(file) {
    try { return await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) {
      return await new Promise(function (res, rej) {
        var img = new Image(); img.onload = function () { res(img); }; img.onerror = function () { rej(new Error("Unsupported image (HEIC? convert to JPEG first): " + file.name)); };
        img.src = URL.createObjectURL(file);
      });
    }
  }
  async function resize(src, maxSide, q) {
    var w = src.width, h = src.height, s = Math.min(1, maxSide / Math.max(w, h));
    var cv = document.createElement("canvas"); cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    var cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(src, 0, 0, cv.width, cv.height);
    var blob = await new Promise(function (r) { cv.toBlob(r, "image/jpeg", q); });
    return { blob: blob, b64: await fileToB64(blob), w: cv.width, h: cv.height };
  }

  /* ---------------- travel extras ---------------- */
  function travelExtra(it, box) {
    box.innerHTML =
      "<h3>📍 " + tr("地図で位置を指定", "Pick the location") + "</h3>" +
      '<div style="display:flex;gap:.5rem;margin-bottom:.5rem"><input id="geo-q" data-ph-ja="地名で検索（例：京都駅）" data-ph-en="Search a place (e.g. Kyoto Station)" placeholder="Search"><button class="btn btn-sm" type="button" id="geo-btn">🔍</button></div>' +
      '<div id="picker-map"></div><p class="small muted" style="margin:.3rem 0 1.2rem">' + tr("地図をクリック、またはピンをドラッグすると緯度・経度が入ります。写真に GPS 情報があれば自動で設定されます。", "Click the map or drag the pin to set coordinates. Photos with GPS data fill them in automatically.") + "</p>" +
      "<h3>📷 " + tr("写真", "Photos") + "</h3>" +
      '<div class="dropzone" id="drop">' + tr("ここに写真をドラッグ＆ドロップ、または", "Drop photos here, or") + ' <label class="btn btn-sm" style="display:inline-flex;margin:0;color:var(--text)">' + tr("ファイルを選択", "choose files") + '<input type="file" id="ph-input" accept="image/*" multiple hidden></label>' +
      '<p class="small" style="margin:.5rem 0 0">' + tr("長辺 2000px の JPEG に縮小し、位置情報などの EXIF は削除して保存します。", "Images are resized to 2000 px JPEGs and EXIF metadata (incl. GPS) is stripped.") + "</p></div>" +
      '<div class="photo-edit" id="ph-grid" style="margin-top:1rem"></div>';
    K.setLang(K.lang());
    // map
    if (pickerMap) { pickerMap.remove(); pickerMap = null; }
    pickerMap = L.map("picker-map").setView(it.lat != null ? [it.lat, it.lng] : [35, 135], it.lat != null ? 9 : 4);
    K.addTiles(pickerMap);
    var mk = null;
    function setMk() {
      if (it.lat == null || it.lng == null) return;
      if (!mk) { mk = L.marker([it.lat, it.lng], { draggable: true }).addTo(pickerMap); mk.on("dragend", function () { var p = mk.getLatLng(); setLL(p.lat, p.lng); }); }
      else mk.setLatLng([it.lat, it.lng]);
    }
    function setLL(lat, lng) {
      it.lat = +lat.toFixed(5); it.lng = +((((lng + 180) % 360 + 360) % 360) - 180).toFixed(5);
      var a = $("form-wrap").querySelector('[data-k="lat"]'), b = $("form-wrap").querySelector('[data-k="lng"]');
      if (a) a.value = it.lat; if (b) b.value = it.lng;
      setMk(); markDirty(C.travel.file);
    }
    movePicker = function (x) { if (x === it) { setMk(); if (it.lat != null) pickerMap.setView([it.lat, it.lng]); } };
    setMk();
    pickerMap.on("click", function (e) { setLL(e.latlng.lat, e.latlng.lng); });
    setTimeout(function () { pickerMap.invalidateSize(); }, 50);
    // geocode (OpenStreetMap Nominatim, on demand only)
    async function geocode() {
      var q = $("geo-q").value.trim(); if (!q) return;
      try {
        var r = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=" + K.lang() + "&q=" + encodeURIComponent(q));
        var d = await r.json();
        if (!d.length) { alert("Not found"); return; }
        setLL(+d[0].lat, +d[0].lon); pickerMap.setView([it.lat, it.lng], 11);
      } catch (e) { alert(e.message); }
    }
    $("geo-btn").addEventListener("click", geocode);
    $("geo-q").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); geocode(); } });

    // photos
    function drawPhotos() {
      $("ph-grid").innerHTML = (it.photos || []).map(function (p, i) {
        var cap = p.caption && typeof p.caption === "object" ? p.caption : { ja: p.caption || "", en: "" };
        return '<div class="ph' + (blobs[p.src] ? " new" : "") + '"><img src="' + esc(previewSrc(p.thumb || p.src)) + '" alt=""><button class="x" type="button" data-rm="' + i + '" title="Remove">×</button>' +
          '<input data-cap="' + i + '" data-sub="ja" placeholder="キャプション" value="' + esc(cap.ja) + '"><input data-cap="' + i + '" data-sub="en" placeholder="Caption" value="' + esc(cap.en) + '"></div>';
      }).join("");
    }
    drawPhotos();
    $("ph-grid").addEventListener("click", function (e) {
      var b = e.target.closest("[data-rm]"); if (!b) return;
      var i = +b.getAttribute("data-rm"), p = it.photos[i];
      removeFile(p.src); if (p.thumb) removeFile(p.thumb);
      it.photos.splice(i, 1); markDirty(C.travel.file); drawPhotos(); renderList();
    });
    $("ph-grid").addEventListener("input", function (e) {
      var el = e.target; if (!el.hasAttribute("data-cap")) return;
      var p = it.photos[+el.getAttribute("data-cap")];
      if (!p.caption || typeof p.caption !== "object") p.caption = { ja: p.caption || "", en: "" };
      p.caption[el.getAttribute("data-sub")] = el.value; markDirty(C.travel.file);
    });
    async function addFiles(list) {
      if (!it.id) { it.id = slug(K.t(it.name)) || "place-" + Date.now().toString(36); var idEl = $("form-wrap").querySelector('[data-k="id"]'); if (idEl) idEl.value = it.id; }
      it.photos = it.photos || [];
      for (var i = 0; i < list.length; i++) {
        var f = list[i];
        if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)) continue;
        log("📷 " + f.name + " …");
        try {
          var meta = {};
          if (window.exifr) {
            try { var g = await exifr.gps(f); if (g) { meta.latitude = g.latitude; meta.longitude = g.longitude; } } catch (e) {}
            try { var x = await exifr.parse(f, ["DateTimeOriginal"]); if (x && x.DateTimeOriginal) meta.DateTimeOriginal = x.DateTimeOriginal; } catch (e) {}
          }
          if (meta.latitude != null && (it.lat == null || it.lng == null)) { setLL(meta.latitude, meta.longitude); pickerMap.setView([it.lat, it.lng], 10); log("   GPS → " + it.lat + ", " + it.lng); }
          var date = meta.DateTimeOriginal ? new Date(meta.DateTimeOriginal).toISOString().slice(0, 10) : "";
          if (date && !it.start) { it.start = date; var sEl = $("form-wrap").querySelector('[data-k="start"]'); if (sEl) sEl.value = date; }
          var img = await decodeImage(f);
          var big = await resize(img, 2000, 0.85), small = await resize(img, 480, 0.8);
          var name = (date ? date.replace(/-/g, "") + "-" : "") + Date.now().toString(36) + i + ".jpg";
          var base = "photos/travel/" + slug(it.id) + "/";
          stageBlob(base + name, big.b64, big.blob);
          stageBlob(base + "thumb/" + name, small.b64, small.blob);
          it.photos.push({ src: base + name, thumb: base + "thumb/" + name, caption: { ja: "", en: "" }, date: date });
          log("   → " + base + name + " (" + big.w + "×" + big.h + ", " + Math.round(big.blob.size / 1024) + " KB)");
        } catch (e) { log("⚠️ " + e.message); }
      }
      markDirty(C.travel.file); drawPhotos(); renderList();
    }
    $("ph-input").addEventListener("change", function () { addFiles(Array.from(this.files)); this.value = ""; });
    var drop = $("drop");
    ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
    ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
    drop.addEventListener("drop", function (e) { addFiles(Array.from(e.dataTransfer.files)); });
  }
  var movePicker = function () {};

  /* ---------------- games extras ---------------- */
  function gamesExtra(it, box) {
    box.innerHTML = "<h3>📁 " + tr("ゲームのファイルをアップロード", "Upload game files") + "</h3>" +
      '<p class="small muted">' + tr("フォルダごと（index.html を含む）またはファイルを選ぶと、games/ID/ 以下に保存されます。", "Pick a folder (containing index.html) or individual files; they are saved under games/ID/.") + "</p>" +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
      '<label class="btn btn-sm">📁 ' + tr("フォルダを選択", "Choose folder") + '<input type="file" id="g-dir" webkitdirectory directory multiple hidden></label>' +
      '<label class="btn btn-sm">📄 ' + tr("ファイルを選択", "Choose files") + '<input type="file" id="g-files" multiple hidden></label>' +
      '<label class="btn btn-sm">🖼 ' + tr("サムネイル画像", "Thumbnail image") + '<input type="file" id="g-thumb" accept="image/*" hidden></label></div>' +
      '<ul class="small mono" id="g-staged" style="margin-top:.8rem"></ul>';
    function ensureId() {
      if (!it.id) { it.id = slug(K.t(it.title)) || "game-" + Date.now().toString(36); var el = $("form-wrap").querySelector('[data-k="id"]'); if (el) el.value = it.id; }
      return slug(it.id);
    }
    function setField(k, v) { it[k] = v; var el = $("form-wrap").querySelector('[data-k="' + k + '"]'); if (el) el.value = v; }
    function drawStaged() {
      var pre = "games/" + slug(it.id || "") + "/";
      $("g-staged").innerHTML = Object.keys(blobs).filter(function (p) { return it.id && p.indexOf(pre) === 0; }).map(function (p) { return "<li>＋ " + esc(p) + "</li>"; }).join("");
    }
    async function upload(list, stripTop) {
      var id = ensureId(), entry = null;
      for (var i = 0; i < list.length; i++) {
        var f = list[i], rel = f.webkitRelativePath || f.name;
        if (stripTop && rel.indexOf("/") > 0) rel = rel.slice(rel.indexOf("/") + 1);
        if (/(^|\/)\.|node_modules\//.test(rel)) continue; // skip dotfiles
        if (f.size > 50 * 1024 * 1024) { log("⚠️ skip (>50MB): " + rel); continue; }
        var path = "games/" + id + "/" + rel;
        stageBlob(path, await fileToB64(f), null);
        if (/(^|\/)index\.html?$/i.test(rel) && (!entry || rel.split("/").length < entry.split("/").length)) entry = path;
        log("＋ " + path);
      }
      if (entry) setField("path", entry);
      else if (!it.path && list.length === 1 && /\.html?$/i.test(list[0].name)) setField("path", "games/" + id + "/" + list[0].name);
      if (!it.source) setField("source", "https://github.com/" + cfg.repo + "/tree/" + cfg.branch + "/games/" + id);
      markDirty(C.games.file); drawStaged(); renderList();
    }
    $("g-dir").addEventListener("change", function () { upload(Array.from(this.files), true); this.value = ""; });
    $("g-files").addEventListener("change", function () { upload(Array.from(this.files), false); this.value = ""; });
    $("g-thumb").addEventListener("change", async function () {
      var f = this.files[0]; if (!f) return; this.value = "";
      try {
        var img = await decodeImage(f), r = await resize(img, 960, 0.85), p = "games/" + ensureId() + "/thumb.jpg";
        stageBlob(p, r.b64, r.blob); setField("thumb", p); markDirty(C.games.file); drawStaged();
      } catch (e) { log("⚠️ " + e.message); }
    });
    drawStaged();
  }

  /* ---------------- theory note extras ---------------- */
  function theoryExtra(it, box) {
    if (!it.file || typeof it.file !== "object") it.file = { ja: it.file || "", en: "" };
    box.innerHTML = "<h3>✍️ " + tr("ノート本文（Markdown）", "Note body (Markdown)") + "</h3>" +
      '<div class="tabs"><button class="chip on" type="button" data-nl="ja">日本語</button><button class="chip" type="button" data-nl="en">English</button>' +
      '<button class="chip" type="button" id="md-prev">👁 ' + tr("プレビュー", "Preview") + "</button></div>" +
      '<p class="small muted mono" id="md-path"></p><textarea class="json-edit" id="md-text" style="min-height:320px"></textarea>' +
      '<div class="prose card hidden" id="md-view" style="margin-top:1rem"></div>';
    var nl = "ja";
    function pathFor(l) {
      if (!it.file[l]) { var id = slug(it.id) || "note-" + Date.now().toString(36); it.file[l] = "notes/music/" + id + "." + l + ".md"; markDirty(C.theory.file); }
      return it.file[l];
    }
    async function show() {
      var p = pathFor(nl);
      $("md-path").textContent = p;
      box.querySelectorAll("[data-nl]").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-nl") === nl); });
      if (texts[p] == null) {
        $("md-text").value = "…";
        try { var f = await loadFile(p); texts[p] = f ? f.text : "# " + (it.title[nl] || "") + "\n\n"; } catch (e) { texts[p] = ""; log("⚠️ " + e.message); }
        if (!filesTouched[p]) filesTouched[p] = false;
      }
      $("md-text").value = texts[p];
    }
    box.addEventListener("click", function (e) { var b = e.target.closest("[data-nl]"); if (b) { nl = b.getAttribute("data-nl"); show(); } });
    $("md-text").addEventListener("input", function () { var p = pathFor(nl); texts[p] = this.value; filesTouched[p] = true; renderPending(); });
    $("md-prev").addEventListener("click", function () {
      var v = $("md-view"); v.classList.toggle("hidden");
      if (!v.classList.contains("hidden")) v.innerHTML = window.marked ? marked.parse($("md-text").value) : esc($("md-text").value);
    });
    show();
  }
  var filesTouched = {}; // markdown path -> edited?

  /* ---------------- raw JSON (CV) ---------------- */
  function renderRaw() {
    var c = C[tab], f = files[c.file];
    $("form-wrap").innerHTML = "<h2 style=\"font-size:1.2rem\">📄 data/cv.json</h2>" +
      '<p class="small muted">' + tr("CV の内容は JSON で直接編集します。talks / awards / visits などに項目を追加すると、CV ページとホームの数字に自動で反映されます。", "Edit the CV as JSON. Adding entries to talks / awards / visits updates the CV page and home-page counters automatically.") + "</p>" +
      '<textarea class="json-edit" id="raw" spellcheck="false"></textarea>' +
      '<div style="display:flex;gap:.5rem;margin-top:.6rem;flex-wrap:wrap;align-items:center"><button class="btn btn-sm btn-primary" type="button" id="raw-apply">✓ ' + tr("JSON を確定", "Apply JSON") + '</button><span class="small" id="raw-msg"></span></div>' +
      "<hr><h3>📎 " + tr("ファイルの差し替え", "Replace files") + "</h3>" +
      '<div style="display:flex;gap:.5rem;flex-wrap:wrap">' +
      '<label class="btn btn-sm">📄 ' + tr("CV の PDF", "CV PDF") + '<input type="file" id="cv-pdf" accept="application/pdf" hidden></label>' +
      '<label class="btn btn-sm">🙂 ' + tr("プロフィール写真", "Profile photo") + '<input type="file" id="cv-photo" accept="image/*" hidden></label></div>';
    $("raw").value = JSON.stringify(f.data, null, 2);
    $("raw-apply").addEventListener("click", function () {
      try { f.data = JSON.parse($("raw").value); markDirty(c.file); $("raw-msg").innerHTML = "✅ " + tr("確定しました（コミットで公開）", "Applied (publish with commit)"); }
      catch (e) { $("raw-msg").innerHTML = "❌ " + esc(e.message); }
    });
    $("cv-pdf").addEventListener("change", async function () {
      var file = this.files[0]; if (!file) return;
      var p = (f.data.profile && f.data.profile.pdf) || "cv/Matsutani_Kanato_CV.pdf";
      stageBlob(p, await fileToB64(file), null); log("＋ " + p);
      var d = new Date(); f.data.updated = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); markDirty(c.file);
      $("raw").value = JSON.stringify(f.data, null, 2);
    });
    $("cv-photo").addEventListener("change", async function () {
      var file = this.files[0]; if (!file) return;
      try {
        var img = await decodeImage(file), r = await resize(img, 600, 0.88), p = "assets/img/profile.jpg";
        stageBlob(p, r.b64, r.blob); f.data.profile = f.data.profile || {}; f.data.profile.photo = p; markDirty(c.file);
        $("raw").value = JSON.stringify(f.data, null, 2); log("＋ " + p);
      } catch (e) { log("⚠️ " + e.message); }
    });
  }

  /* ---------------- pending & commit ---------------- */
  function pendingList() {
    var out = [];
    Object.keys(dirty).forEach(function (p) { out.push(["✎", p]); });
    Object.keys(texts).forEach(function (p) { if (filesTouched[p]) out.push(["✎", p]); });
    Object.keys(blobs).forEach(function (p) { out.push(["＋", p]); });
    Object.keys(deletes).forEach(function (p) { out.push(["－", p]); });
    return out;
  }
  function renderPending() {
    var l = pendingList();
    $("pending-count").textContent = "(" + l.length + ")";
    $("pending-list").innerHTML = l.map(function (x) { return "<li>" + x[0] + " " + esc(x[1]) + "</li>"; }).join("") || "<li class='muted'>—</li>";
    $("btn-commit").disabled = !l.length;
  }
  function cleanJSON(data) {
    return JSON.stringify(data, function (k, v) { return k.charAt(0) === "_" ? undefined : v; }, 2) + "\n";
  }
  window.addEventListener("beforeunload", function (e) { if (pendingList().length) { e.preventDefault(); e.returnValue = ""; } });

  $("btn-discard").addEventListener("click", async function () {
    if (pendingList().length && !confirm(K.lang() === "ja" ? "未保存の変更を破棄しますか？" : "Discard all pending changes?")) return;
    filesTouched = {};
    await loadAll(); openTab(tab);
  });

  $("btn-commit").addEventListener("click", async function () {
    var btn = this; btn.disabled = true;
    try {
      // validate travel entries (only if edited)
      var places = dirty["data/travel.json"] ? (files["data/travel.json"].data.places || []) : [];
      var ids = {};
      places.forEach(function (p) { if (!p.id) p.id = slug(K.t(p.name)) || "place-" + Date.now().toString(36); if (ids[p.id]) throw new Error("Duplicate travel id: " + p.id); ids[p.id] = 1; if (p.lat == null || p.lng == null) throw new Error((K.t(p.name) || p.id) + ": lat/lng missing — " + (K.lang() === "ja" ? "地図で位置を指定してください" : "pick it on the map")); });

      log("⏳ " + (K.lang() === "ja" ? "コミット準備中…" : "Preparing commit…"));
      // conflict check for JSON files
      for (var p in dirty) {
        var head = await gh(repoPath("/contents/" + p + "?ref=" + encodeURIComponent(cfg.branch)), { allow404: true });
        if (head && files[p].sha && head.sha !== files[p].sha) throw new Error(p + (K.lang() === "ja" ? " がこの画面を開いた後に別の場所で更新されています。「変更を破棄して再読み込み」してからやり直してください。" : " changed on GitHub after you loaded it. Discard & reload, then redo your edits."));
      }
      var ref = await gh(repoPath("/git/ref/heads/" + encodeURIComponent(cfg.branch)));
      var baseSha = ref.object.sha;
      var baseCommit = await gh(repoPath("/git/commits/" + baseSha));
      var tree = [];
      for (var bp in blobs) {
        log("⬆️ " + bp);
        var b = await gh(repoPath("/git/blobs"), { method: "POST", body: { content: blobs[bp].b64, encoding: "base64" } });
        tree.push({ path: bp, mode: "100644", type: "blob", sha: b.sha });
      }
      Object.keys(dirty).forEach(function (jp) { tree.push({ path: jp, mode: "100644", type: "blob", content: cleanJSON(files[jp].data) }); });
      Object.keys(texts).forEach(function (tp) { if (filesTouched[tp]) tree.push({ path: tp, mode: "100644", type: "blob", content: texts[tp] }); });
      Object.keys(deletes).forEach(function (dp) { tree.push({ path: dp, mode: "100644", type: "blob", sha: null }); });
      var newTree = await gh(repoPath("/git/trees"), { method: "POST", body: { base_tree: baseCommit.tree.sha, tree: tree } });
      var commit = await gh(repoPath("/git/commits"), { method: "POST", body: { message: $("commit-msg").value || "Update via admin", tree: newTree.sha, parents: [baseSha] } });
      await gh(repoPath("/git/refs/heads/" + encodeURIComponent(cfg.branch)), { method: "PATCH", body: { sha: commit.sha, force: false } });
      log("✅ " + (K.lang() === "ja" ? "コミット完了：" : "Committed: ") + commit.sha.slice(0, 7) + " — " + (K.lang() === "ja" ? "GitHub Pages への反映には 1〜2 分かかります。" : "GitHub Pages will update in 1–2 minutes."));
      log("   https://github.com/" + cfg.repo + "/commit/" + commit.sha);
      filesTouched = {};
      await loadAll(); openTab(tab);
    } catch (e) {
      log("❌ " + e.message);
    } finally { btn.disabled = !pendingList().length; }
  });

  renderPending();
  if (saved) connect();
})();
