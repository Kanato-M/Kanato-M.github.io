/* Travel page — map + photo log rendered from data/travel.json */
(function () {
  "use strict";
  var K = window.K, bi = K.bi, esc = K.esc;
  var $ = function (id) { return document.getElementById(id); };
  var CAT = {
    trip: { icon: "✈️", l: { ja: "旅行", en: "Trips" } },
    research: { icon: "🔬", l: { ja: "研究・出張", en: "Research" } },
    home: { icon: "🏠", l: { ja: "拠点", en: "Home" } }
  };
  var places = [], markers = {}, map, lines = [], cat = "all", year = "all", current = null;

  function photoUrl(p, thumb) {
    var src = thumb && p.thumb ? p.thumb : p.src;
    return /^https?:/.test(src) ? src : K.root + src;
  }
  function dates(p) {
    if (!p.start) return "";
    var a = K.fmtMonth(p.start), b = p.end ? K.fmtMonth(p.end) : "";
    if (p.category === "home" && !p.end) return a + " –";
    return b && b !== a ? a + " – " + b : a;
  }
  function years(p) {
    var a = parseInt(p.start, 10), b = parseInt(p.end || p.start, 10) || a;
    if (p.category === "home" && !p.end) b = new Date().getFullYear();
    var out = []; for (var y = a; y <= b; y++) out.push(y); return out;
  }
  function haversine(a, b) {
    var R = 6371, r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  K.fetchJSON("data/travel.json").then(function (d) {
    places = (d.places || []).slice().sort(function (a, b) { return (b.start || "") < (a.start || "") ? -1 : 1; });
    init();
  }).catch(function (e) {
    $("tr-list").innerHTML = '<div class="empty">' + esc(e.message) + "</div>";
  });

  function init() {
    // stats
    var countries = {}, photos = 0, home = places.find(function (p) { return p.category === "home"; }) || places[0], far = null, farD = 0;
    places.forEach(function (p) {
      if (p.countryCode) countries[p.countryCode] = 1;
      photos += (p.photos || []).length;
      if (home && p !== home) { var d = haversine(home, p); if (d > farD) { farD = d; far = p; } }
    });
    var st = [
      [places.length, { ja: "訪れた場所", en: "Places" }],
      [Object.keys(countries).length, { ja: "国・地域", en: "Countries & regions" }],
      [photos, { ja: "写真", en: "Photos" }],
      [far ? Math.round(farD).toLocaleString() + '<small style="font-size:.45em"> km</small>' : "–", far ? { ja: "拠点から最も遠い場所：" + (far.name.ja || far.name.en), en: "Farthest from home: " + (far.name.en || far.name.ja) } : { ja: "", en: "" }]
    ];
    $("tr-stats").innerHTML = st.map(function (s) { return '<div class="stat"><div class="num">' + s[0] + '</div><div class="lbl">' + bi(s[1]) + "</div></div>"; }).join("");

    // filters
    var cats = ["all"].concat(Object.keys(CAT).filter(function (c) { return places.some(function (p) { return p.category === c; }); }));
    $("tr-filter").innerHTML = cats.map(function (c) {
      var l = c === "all" ? { ja: "すべて", en: "All" } : CAT[c].l;
      return '<button type="button" class="chip' + (c === cat ? " on" : "") + '" data-c="' + c + '">' + (c === "all" ? "" : CAT[c].icon + " ") + bi(l) + "</button>";
    }).join("");
    $("tr-filter").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      cat = b.getAttribute("data-c");
      this.querySelectorAll("button").forEach(function (x) { x.classList.toggle("on", x === b); });
      refresh();
    });
    var ys = {};
    places.forEach(function (p) { years(p).forEach(function (y) { if (y) ys[y] = 1; }); });
    var yearSel = $("tr-year");
    function fillYears() {
      yearSel.innerHTML = '<option value="all">' + (K.lang() === "ja" ? "全期間" : "All years") + "</option>" +
        Object.keys(ys).sort().reverse().map(function (y) { return '<option value="' + y + '"' + (String(year) === y ? " selected" : "") + ">" + y + "</option>"; }).join("");
    }
    fillYears();
    document.addEventListener("langchange", fillYears);
    yearSel.addEventListener("change", function () { year = this.value; refresh(); });

    // map
    map = L.map("travel-map", { worldCopyJump: true, zoomSnap: 0.5 }).setView([35, 140], 3);
    K.addTiles(map);
    places.forEach(function (p) {
      var icon = L.divIcon({ className: "", html: '<div class="pin ' + esc(p.category || "trip") + '"><span>' + (CAT[p.category] || CAT.trip).icon + "</span></div>", iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24] });
      var m = L.marker([p.lat, K.wrapLng(p.lng)], { icon: icon, title: K.t(p.name) });
      m.bindPopup(function () { return popupHTML(p); }, { maxWidth: 260 });
      m.on("popupopen", function (ev) {
        var btn = ev.popup.getElement().querySelector("[data-open]");
        if (btn) btn.addEventListener("click", function () { select(p.id, true); });
      });
      markers[p.id] = m;
    });

    if (home) {
      places.forEach(function (p) {
        if (p === home) return;
        var line = L.polyline(arc([home.lat, K.wrapLng(home.lng)], [p.lat, K.wrapLng(p.lng)]), { color: p.category === "research" ? "#4de1ff" : "#5ef0a0", weight: 1.5, opacity: .45, dashArray: "4 6", interactive: false });
        line._place = p;
        lines.push(line);
      });
    }

    $("tr-list").addEventListener("click", function (e) {
      var b = e.target.closest("[data-id]"); if (!b) return;
      select(b.getAttribute("data-id"), true);
    });

    refresh();
    var hash = decodeURIComponent(location.hash.slice(1));
    if (hash && places.some(function (p) { return p.id === hash; })) select(hash, false);
    else showAllPhotos();
  }

  function arc(a, b) {
    var pts = [], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var dx = b[1] - a[1], dy = b[0] - a[0];
    var cx = mx + dx * 0.18, cy = my - dy * 0.18; // control point perpendicular to the chord (eastward lines bulge north)
    for (var i = 0; i <= 40; i++) {
      var t = i / 40;
      pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * cx + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * cy + t * t * b[1]]);
    }
    return pts;
  }

  function visible(p) {
    return (cat === "all" || p.category === cat) && (year === "all" || years(p).indexOf(+year) >= 0);
  }

  function refresh() {
    var vis = places.filter(visible);
    var bounds = [];
    places.forEach(function (p) {
      var m = markers[p.id];
      if (visible(p)) { m.addTo(map); bounds.push(m.getLatLng()); } else map.removeLayer(m);
    });
    lines.forEach(function (l) { if (visible(l._place)) l.addTo(map); else map.removeLayer(l); });
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    else if (bounds.length === 1) map.setView(bounds[0], 8);

    $("tr-list").innerHTML = vis.map(function (p) {
      var ph = (p.photos || [])[0];
      var thumb = ph ? '<img src="' + esc(photoUrl(ph, true)) + '" alt="" loading="lazy">' : (CAT[p.category] || CAT.trip).icon;
      return '<button type="button" class="place-item' + (current === p.id ? " active" : "") + '" data-id="' + esc(p.id) + '">' +
        '<div class="place-thumb">' + thumb + "</div><div><h4>" + bi(p.name) + '</h4><div class="meta">' + esc(dates(p)) + " · " + bi(p.country) +
        ((p.photos || []).length ? " · 📷" + p.photos.length : "") + "</div></div></button>";
    }).join("") || '<div class="empty">' + bi({ ja: "該当する場所がありません", en: "No places match" }) + "</div>";
  }

  function popupHTML(p) {
    var ph = (p.photos || [])[0];
    return '<div class="pop">' + (ph ? '<img src="' + esc(photoUrl(ph, true)) + '" alt="">' : "") +
      "<h4>" + bi(p.name) + '</h4><div class="meta">' + esc(dates(p)) + " · " + bi(p.country) + "</div>" +
      '<button class="btn btn-sm" type="button" data-open="1">' + ((p.photos || []).length ? "📷 " + bi({ ja: "写真と詳細", en: "Photos & details" }) : bi({ ja: "詳細", en: "Details" })) + "</button></div>";
  }

  function select(id, scroll) {
    var p = places.find(function (x) { return x.id === id; });
    if (!p) return;
    current = id;
    history.replaceState(null, "", "#" + encodeURIComponent(id));
    document.querySelectorAll(".place-item").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-id") === id); });
    var m = markers[id];
    if (m && map.hasLayer(m)) { map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 6), { duration: .8 }); }
    var tags = (p.tags || []).map(function (t) { return '<span class="tag">#' + esc(t) + "</span>"; }).join(" ");
    var photos = p.photos || [];
    $("tr-detail").innerHTML =
      '<div class="card"><div class="head"><h2 style="margin:0">' + (CAT[p.category] || CAT.trip).icon + " " + bi(p.name) + '</h2><span class="muted mono">' + esc(dates(p)) + "</span><span class=\"chip\">" + bi(p.country) + "</span></div>" +
      (p.description ? '<p style="margin-top:.8rem">' + bi(p.description) + "</p>" : "") +
      (tags ? '<div class="chips" style="margin-bottom:1rem">' + tags + "</div>" : "") +
      (photos.length ? gallery(photos, p) : '<div class="empty">📷 ' + bi({ ja: "写真はまだありません。管理ページからアップロードできます。", en: "No photos yet — they can be uploaded from the admin page." }) + "</div>") +
      '<p style="margin:1rem 0 0"><button class="btn btn-sm btn-ghost" type="button" id="show-all">← ' + bi({ ja: "すべての写真", en: "All photos" }) + "</button></p></div>";
    $("show-all").addEventListener("click", function () { current = null; history.replaceState(null, "", location.pathname); refresh(); showAllPhotos(); });
    if (scroll) $("tr-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  var lbStore = [], lbList = [], lbIdx = 0;
  function gallery(photos, place) {
    lbStore = photos.map(function (ph) { return { ph: ph, place: place }; });
    return '<div class="gallery">' + photos.map(function (ph, i) {
      return '<figure data-lb="' + i + '"><img src="' + esc(photoUrl(ph, true)) + '" alt="' + esc(K.t(ph.caption) || K.t(place.name)) + '" loading="lazy">' +
        (ph.caption && K.t(ph.caption) ? "<figcaption>" + bi(ph.caption) + "</figcaption>" : "") + "</figure>";
    }).join("") + "</div>";
  }

  function showAllPhotos() {
    lbStore = [];
    var all = [];
    places.forEach(function (p) { (p.photos || []).forEach(function (ph) { all.push({ ph: ph, place: p }); }); });
    if (!all.length) {
      $("tr-detail").innerHTML = '<div class="card center"><h2 style="font-size:1.3rem">📷 ' + bi({ ja: "フォトギャラリー", en: "Photo gallery" }) + "</h2>" +
        '<p class="muted">' + bi({ ja: "まだ写真がありません。管理ページ（オーナー専用）から写真をアップロードすると、ここと地図に表示されます。", en: "No photos yet. Photos uploaded from the (owner-only) admin page will appear here and on the map." }) + "</p></div>";
      return;
    }
    $("tr-detail").innerHTML = '<h2 style="font-size:1.4rem">📷 ' + bi({ ja: "最近の写真", en: "Recent photos" }) + "</h2>" +
      '<div class="gallery">' + all.slice(0, 60).map(function (o, i) {
        lbStore.push(o);
        return '<figure data-lb="' + i + '"><img src="' + esc(photoUrl(o.ph, true)) + '" alt="' + esc(K.t(o.ph.caption) || K.t(o.place.name)) + '" loading="lazy"><figcaption>' + bi(o.place.name) + "</figcaption></figure>";
      }).join("") + "</div>";
  }

  // lightbox
  var lb = $("lightbox"), lbImg = lb.querySelector("img"), lbCap = lb.querySelector(".cap");
  function openLB(i) {
    lbList = lbStore; lbIdx = i;
    var o = lbList[i]; if (!o) return;
    lbImg.src = photoUrl(o.ph, false);
    lbImg.alt = K.t(o.ph.caption) || K.t(o.place.name);
    lbCap.innerHTML = bi(o.place.name) + (o.ph.caption ? " — " + bi(o.ph.caption) : "") + (o.ph.date ? ' <span class="mono">' + esc(o.ph.date) + "</span>" : "");
    lb.classList.add("open");
  }
  function closeLB() { lb.classList.remove("open"); lbImg.src = ""; }
  function step(d) { openLB((lbIdx + d + lbList.length) % lbList.length); }
  document.addEventListener("click", function (e) {
    var f = e.target.closest("[data-lb]");
    if (f) { openLB(+f.getAttribute("data-lb")); }
  });
  lb.querySelector(".lb-close").addEventListener("click", closeLB);
  lb.querySelector(".lb-prev").addEventListener("click", function () { step(-1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLB(); });
  document.addEventListener("keydown", function (e) {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLB(); else if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1);
  });
})();
