/* CV page — rendered from data/cv.json */
(function () {
  "use strict";
  var K = window.K, bi = K.bi, esc = K.esc;
  var $ = function (id) { return document.getElementById(id); };

  function ym(s) { var p = String(s).split("-"); return { y: +p[0], m: +(p[1] || 1) }; }
  function months(s) { var a = ym(s); return a.y * 12 + (a.m - 1); }
  function nowYM() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); }
  function range(a, b) {
    var present = { ja: "現在", en: "present" };
    return esc(K.fmtMonth(a)) + " – " + (b ? esc(K.fmtMonth(b)) : bi(present));
  }

  K.fetchJSON("data/cv.json").then(render).catch(function (e) {
    document.querySelector("main").insertAdjacentHTML("afterbegin", '<p class="container empty">CV data could not be loaded: ' + esc(e.message) + "</p>");
  });

  function render(cv) {
    var P = cv.profile;
    $("cv-name").innerHTML = bi(P.name);
    $("cv-position").innerHTML = bi(P.position) + '<br><span class="muted" style="font-weight:500">' + bi(P.lab) + "</span>";
    $("cv-meta").innerHTML =
      "<span>📍 " + bi(P.office) + "</span>" +
      '<span>✉️ <a href="mailto:' + esc(P.email) + '">' + esc(P.email) + "</a></span>" +
      "<span>👨‍🏫 " + bi({ ja: "指導教員：", en: "Supervisor: " }) + bi(P.supervisor) + "</span>" +
      "<span>🤝 " + bi(P.collaboration) + "</span>";
    if (P.photo) $("avatar").innerHTML = '<img src="' + K.root + esc(P.photo) + '" alt="">';
    $("cv-pdf").href = K.root + P.pdf;

    // ---- stats
    var talks = cv.talks || [];
    var intl = talks.filter(function (t) { return t.scope === "intl"; }).length;
    var stats = [
      [talks.length, { ja: "学会・研究会発表", en: "Talks & posters" }, "sec-research"],
      [intl, { ja: "うち国際会議", en: "International" }, "sec-music"],
      [(cv.awards || []).length, { ja: "受賞・フェローシップ", en: "Awards & fellowships" }, "sec-games"],
      [(cv.visits || []).length, { ja: "研究滞在・ビームテスト・スクール", en: "Visits, beam tests & schools" }, "sec-travel"]
    ];
    $("cv-stats").innerHTML = stats.map(function (s) {
      return '<div class="stat ' + s[2] + '"><div class="num">' + s[0] + '</div><div class="lbl">' + bi(s[1]) + "</div></div>";
    }).join("");

    renderChart(cv.history || []);

    // ---- history list
    $("cv-history").innerHTML = (cv.history || []).slice().sort(function (a, b) { return a.start < b.start ? 1 : -1; }).map(function (h) {
      return '<li style="--bar:' + esc(h.color || "var(--accent)") + '"><div class="when">' + range(h.start, h.end) +
        (h.planned ? ' <span class="badge-upcoming">' + bi({ ja: "予定", en: "planned" }) + "</span>" : "") + "</div>" +
        '<div class="what">' + bi(h.title) + "</div>" +
        '<div class="where">' + bi(h.place) + (h.note ? " · " + bi(h.note) : "") + "</div></li>";
    }).join("");

    // ---- talks
    var filter = "all";
    function drawTalks() {
      var list = talks.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).filter(function (t) {
        return filter === "all" || t.scope === filter || t.type === filter;
      });
      $("talk-count").textContent = "(" + list.length + ")";
      $("cv-talks").innerHTML = list.map(function (t) {
        var chips = '<span class="tag ' + (t.scope === "intl" ? "scope-intl" : "") + '">' + bi(t.scope === "intl" ? { ja: "国際", en: "International" } : { ja: "国内", en: "Domestic" }) + "</span> " +
          '<span class="tag type-' + esc(t.type) + '">' + bi(t.type === "oral" ? { ja: "口頭", en: "Oral" } : { ja: "ポスター", en: "Poster" }) + "</span>" +
          (t.status ? ' <span class="tag" style="--sec:var(--accent-3)">' + bi(t.status) + "</span>" : "") +
          (t.spokenJa ? ' <span class="tag" style="--sec:var(--muted)">' + bi({ ja: "日本語講演", en: "in Japanese" }) + "</span>" : "");
        return '<li class="talk"><div class="when">' + esc(K.fmtMonth(t.date)) + "</div><div>" +
          '<div class="title">“' + bi(t.title) + "”</div>" +
          '<div class="venue">' + bi(t.venue) + (t.place ? " — " + bi(t.place) : "") + "</div>" +
          (t.authors ? '<div class="venue small">' + esc(t.authors) + "</div>" : "") +
          '<div class="chips">' + chips + "</div></div></li>";
      }).join("");
    }
    $("talk-filter").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      filter = b.getAttribute("data-f");
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      drawTalks();
    });
    drawTalks();

    // ---- publications & theses
    $("cv-pubs").innerHTML = (cv.publications || []).map(function (p) {
      var title = p.url ? '<a href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(p.title) + "</a>" : esc(p.title);
      return '<li class="talk"><div class="when">' + esc(p.year || "") + '</div><div><div class="venue">' + esc(p.authors) + '</div><div class="title">“' + title + '”</div><div class="venue"><em>' + esc(p.venue) + "</em>" +
        (p.status ? ' <span class="tag" style="--sec:var(--accent-3)">' + bi(p.status) + "</span>" : "") + "</div></div></li>";
    }).join("") || '<li class="empty">—</li>';
    $("cv-theses").innerHTML = (cv.theses || []).map(function (t) {
      return '<li class="talk"><div class="when">' + esc(K.fmtMonth(t.date)) + '</div><div><div class="venue"><strong>' + bi(t.degree) + '</strong></div><div class="title">“' + bi(t.title) + '”</div><div class="venue">' + bi(t.note) + "</div></div></li>";
    }).join("");

    // ---- visits
    var KIND = {
      beam: { icon: "⚡", c: "#ffb84d", l: { ja: "ビームテスト", en: "Beam test" } },
      school: { icon: "📚", c: "#8b7bff", l: { ja: "スクール・研修", en: "School / training" } },
      meeting: { icon: "🤝", c: "#5ef0a0", l: { ja: "会議・打ち合わせ", en: "Meeting" } },
      stay: { icon: "🏠", c: "#4de1ff", l: { ja: "研究滞在", en: "Research stay" } }
    };
    $("cv-visits").innerHTML = (cv.visits || []).map(function (v) {
      var k = KIND[v.kind] || KIND.meeting;
      return '<li style="--bar:' + k.c + '"><div class="when">' + esc(v.date) + " · " + k.icon + " " + bi(k.l) + '</div><div class="what">' + bi(v.title) + '</div><div class="where">' + bi(v.place) + "</div></li>";
    }).join("");

    // ---- skills / awards / members
    $("cv-skills").innerHTML = (cv.skills || []).map(function (s) {
      return '<div class="skill"><div class="icon">' + esc(s.icon) + "</div><div><h4>" + bi(s.title) + "</h4><p>" + bi(s.desc) + "</p></div></div>";
    }).join("");
    $("cv-awards").innerHTML = (cv.awards || []).map(function (a) {
      return '<div class="award"><div class="medal">' + esc(a.icon || "🏅") + '</div><div><div class="when">' + esc(K.fmtMonth(a.date)) + "</div><div>" + bi(a.title) + "</div></div></div>";
    }).join("");
    $("cv-members").innerHTML = (cv.memberships || []).map(function (m) { return "<p style='margin:0'>" + bi(m) + "</p>"; }).join("");
    $("cv-updated").innerHTML = bi({ ja: "最終更新：", en: "Last updated: " }) + esc(K.fmtMonth(cv.updated));

    renderMap(cv, KIND);
    K.observeReveal();
  }

  /* ---------- Gantt-style timeline ---------- */
  function renderChart(history) {
    var LANES = [
      { id: "edu", l: { ja: "学歴", en: "Education" } },
      { id: "research", l: { ja: "研究職", en: "Research" } },
      { id: "fellow", l: { ja: "フェロー", en: "Fellowship" } },
      { id: "abroad", l: { ja: "海外滞在", en: "Abroad" } }
    ];
    var startY = 2017, endM = months("2029-07"), startM = months(startY + "-01");
    var today = months(nowYM());
    endM = Math.max(endM, today + 12);
    var span = endM - startM;
    var pct = function (m) { return ((m - startM) / span * 100).toFixed(3) + "%"; };
    var axis = "";
    for (var y = startY; y * 12 <= endM; y++) {
      axis += '<span class="tl-year" style="left:' + pct(y * 12) + '">' + y + "</span>";
    }
    var rows = LANES.map(function (lane) {
      var bars = history.filter(function (h) { return h.lane === lane.id; }).map(function (h) {
        var s = months(h.start), e = h.end ? months(h.end) + 1 : endM;
        var w = (e - s) / span * 100;
        var label = w > 7 ? bi(h.label) : "✈";
        var cls = "tl-bar" + (h.planned ? " planned" : "") + (!h.end ? " ongoing" : "");
        return '<div class="' + cls + '" style="--bar:' + esc(h.color || "var(--accent)") + ";left:" + pct(s) + ";width:" + w.toFixed(3) + '%" title="' +
          esc(K.t(h.label) + " — " + K.fmtMonth(h.start) + "–" + (h.end ? K.fmtMonth(h.end) : "")) + '">' + label + "</div>";
      }).join("");
      return '<div style="display:grid;grid-template-columns:96px 1fr;align-items:center;gap:.5rem"><span class="small muted">' + bi(lane.l) + '</span><div class="tl-row">' + bars + "</div></div>";
    }).join("");
    $("tl-chart").innerHTML =
      '<div class="tl-inner">' +
      '<div style="display:grid;grid-template-columns:96px 1fr;gap:.5rem"><span></span><div class="tl-axis">' + axis + "</div></div>" +
      '<div style="position:relative">' + rows +
      '<div style="position:absolute;inset:0 0 0 calc(96px + .5rem);pointer-events:none"><div class="tl-today" style="left:' + pct(today) + '"><span>' + bi({ ja: "いま", en: "now" }) + "</span></div></div>" +
      "</div></div>";
  }

  /* ---------- Map of visits & talks ---------- */
  function renderMap(cv, KIND) {
    if (!window.L) return;
    var map = L.map("visit-map", { scrollWheelZoom: false, worldCopyJump: true }).setView([30, 140], 2);
    K.addTiles(map);
    var pts = [];
    function dot(lat, lng, color, html) {
      var m = L.circleMarker([lat, K.wrapLng(lng)], { radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: .95 }).addTo(map);
      m.bindPopup(html);
      pts.push([lat, K.wrapLng(lng)]);
    }
    (cv.visits || []).forEach(function (v) {
      if (v.lat == null) return;
      var k = KIND[v.kind] || KIND.meeting;
      dot(v.lat, v.lng, k.c, '<div class="pop"><div class="meta">' + esc(v.date) + " · " + k.icon + "</div><h4>" + bi(v.place) + "</h4>" + bi(v.title) + "</div>");
    });
    (cv.talks || []).forEach(function (t) {
      if (t.lat == null) return;
      dot(t.lat, t.lng, "#ff5ca8", '<div class="pop"><div class="meta">' + esc(K.fmtMonth(t.date)) + " · 🎤</div><h4>" + bi(t.venue) + "</h4>“" + bi(t.title) + "”</div>");
    });
    if (pts.length) map.fitBounds(pts, { padding: [30, 30] });
  }
})();
