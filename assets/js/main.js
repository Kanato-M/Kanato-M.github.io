/* =========================================================
   Shared site script: language / theme / header / footer
   Load this synchronously in <head> (no defer) so that the
   language and theme are applied before first paint.
   ========================================================= */
(function () {
  "use strict";

  var html = document.documentElement;
  var root = html.getAttribute("data-root") || "";

  /* ---------- Site settings (edit here) ---------- */
  var SITE = {
    owner: "Kanato-M",              // GitHub user name
    repo: "Kanato-M.github.io",     // repository name
    branch: "main",                 // branch that GitHub Pages serves
    nameJa: "松谷 奏",
    nameEn: "Kanato Matsutani",
    email: "matsutani@quark.hiroshima-u.ac.jp",
    links: {
      github: "https://github.com/Kanato-M",
      lab: "https://www.quark.hiroshima-u.ac.jp/",
      // Fill these in and they will appear in the footer / home page.
      orcid: "",
      inspire: "",
      researchmap: "",
      x: "",
      instagram: ""
    }
  };

  /* ---------- Language & theme (run immediately) ---------- */
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }
  var lang = store("lang") || ((navigator.language || "ja").toLowerCase().indexOf("ja") === 0 ? "ja" : "en");
  html.setAttribute("data-lang", lang);
  html.setAttribute("lang", lang);
  var theme = store("theme");
  if (!theme) theme = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) ? "light" : "dark";
  html.setAttribute("data-theme", theme);

  function applyTitle() {
    var t = html.getAttribute("data-title-" + lang);
    if (t) document.title = t;
  }
  applyTitle();

  function setLang(l) {
    lang = l;
    html.setAttribute("data-lang", l);
    html.setAttribute("lang", l);
    store("lang", l);
    applyTitle();
    document.querySelectorAll("[data-ph-ja]").forEach(function (el) {
      el.setAttribute("placeholder", el.getAttribute("data-ph-" + l) || "");
    });
    document.dispatchEvent(new CustomEvent("langchange", { detail: l }));
  }
  function setTheme(t) {
    theme = t;
    html.setAttribute("data-theme", t);
    store("theme", t);
    document.dispatchEvent(new CustomEvent("themechange", { detail: t }));
  }

  /* ---------- Helpers shared by page scripts ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /** Bilingual value -> HTML with both languages (CSS shows the active one). */
  function bi(v, tag) {
    tag = tag || "span";
    if (v == null) return "";
    if (typeof v === "string") return esc(v);
    var ja = v.ja != null ? v.ja : v.en, en = v.en != null ? v.en : v.ja;
    if (ja === en) return esc(ja);
    return "<" + tag + ' lang="ja">' + esc(ja) + "</" + tag + "><" + tag + ' lang="en">' + esc(en) + "</" + tag + ">";
  }
  /** Bilingual value -> plain string in the current language. */
  function t(v) {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return (lang === "ja" ? (v.ja != null ? v.ja : v.en) : (v.en != null ? v.en : v.ja)) || "";
  }
  function fetchJSON(path) {
    return fetch(root + path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(path + ": " + r.status);
      return r.json();
    });
  }
  function fmtMonth(ym) {
    // "2026-03" -> "2026.03"
    if (!ym) return "";
    return String(ym).replace("-", ".").slice(0, 7);
  }

  window.K = {
    root: root, site: SITE, esc: esc, bi: bi, t: t, fetchJSON: fetchJSON, fmtMonth: fmtMonth,
    lang: function () { return lang; }, setLang: setLang, theme: function () { return theme; }
  };

  /* ---------- Header / footer ---------- */
  var NAV = [
    { href: "index.html", id: "home", ja: "ホーム", en: "Home" },
    { group: { ja: "研究", en: "Research" } },
    { href: "research/index.html", id: "research", ja: "研究内容", en: "Research" },
    { href: "cv/index.html", id: "cv", ja: "CV", en: "CV" },
    { group: { ja: "趣味", en: "Hobby" } },
    { href: "hobby/travel/index.html", id: "travel", ja: "旅行", en: "Travel" },
    { href: "hobby/games/index.html", id: "games", ja: "ゲーム", en: "Games" },
    { href: "hobby/music/index.html", id: "music", ja: "音楽", en: "Music" }
  ];

  function buildHeader() {
    var page = document.body.getAttribute("data-page") || "";
    var links = NAV.map(function (n) {
      if (n.group) return '<span class="nav-group">' + bi(n.group) + "</span>";
      return '<a class="nav-link' + (n.id === page ? " active" : "") + '" href="' + root + n.href + '"' +
        (n.id === page ? ' aria-current="page"' : "") + ">" + bi(n) + "</a>";
    }).join("");
    var h = document.createElement("header");
    h.className = "site-header";
    h.innerHTML =
      '<div class="container header-inner">' +
      '<a class="brand" href="' + root + 'index.html"><span class="brand-mark" aria-hidden="true">K</span>' +
      '<span class="brand-text"><span lang="ja">松谷 奏</span><span lang="en">Kanato Matsutani</span></span></a>' +
      '<nav class="site-nav" id="site-nav" aria-label="Main">' + links + "</nav>" +
      '<div class="header-tools">' +
      '<button class="tool-btn lang-btn" type="button" aria-label="Switch language / 言語切替">' +
      '<span class="lang-opt" data-l="ja">JA</span><span class="lang-sep">/</span><span class="lang-opt" data-l="en">EN</span></button>' +
      '<button class="tool-btn theme-btn" type="button" aria-label="Toggle theme"><span class="i-sun">☀</span><span class="i-moon">☾</span></button>' +
      '<button class="tool-btn burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav"><span></span><span></span><span></span></button>' +
      "</div></div>";
    document.body.insertBefore(h, document.body.firstChild);

    h.querySelector(".lang-btn").addEventListener("click", function () { setLang(lang === "ja" ? "en" : "ja"); });
    h.querySelector(".theme-btn").addEventListener("click", function () { setTheme(theme === "dark" ? "light" : "dark"); });
    var burger = h.querySelector(".burger");
    burger.addEventListener("click", function () {
      var open = h.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    window.addEventListener("scroll", function () {
      h.classList.toggle("scrolled", window.scrollY > 8);
    }, { passive: true });
  }

  function buildFooter() {
    var L = SITE.links;
    var items = [
      ["GitHub", L.github], ["ORCID", L.orcid], ["INSPIRE", L.inspire], ["researchmap", L.researchmap],
      ["X", L.x], ["Instagram", L.instagram]
    ].filter(function (x) { return x[1]; }).map(function (x) {
      return '<a href="' + esc(x[1]) + '" target="_blank" rel="noopener">' + x[0] + "</a>";
    });
    items.unshift('<a href="mailto:' + esc(SITE.email) + '">Mail</a>');
    var f = document.createElement("footer");
    f.className = "site-footer";
    f.innerHTML =
      '<div class="container footer-inner">' +
      '<div><strong><span lang="ja">松谷 奏</span><span lang="en">Kanato Matsutani</span></strong>' +
      '<p class="muted small"><span lang="ja">広島大学 クォーク物理学研究室 / ePIC Collaboration</span>' +
      '<span lang="en">Quark Physics Lab., Hiroshima University / ePIC Collaboration</span></p></div>' +
      '<div class="footer-links">' + items.join("") + "</div>" +
      '<p class="muted small footer-copy">© ' + new Date().getFullYear() + " Kanato Matsutani · " +
      '<a href="' + root + 'admin/index.html" class="muted">Admin</a></p>' +
      "</div>";
    document.body.appendChild(f);
  }

  function reveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  }
  K.observeReveal = reveal;

  /** Japan-centred longitude: put the Americas east of the Pacific. */
  K.wrapLng = function (lng) { return lng < -30 ? lng + 360 : lng; };

  /** Add theme-aware base tiles to a Leaflet map (requires Leaflet). */
  K.addTiles = function (map) {
    var layer = null;
    function add() {
      if (layer) map.removeLayer(layer);
      var style = theme === "dark" ? "dark_all" : "rastertiles/voyager";
      layer = window.L.tileLayer("https://{s}.basemaps.cartocdn.com/" + style + "/{z}/{x}/{y}{r}.png", {
        maxZoom: 19, subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      }).addTo(map);
    }
    add();
    document.addEventListener("themechange", add);
  };

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body.hasAttribute("data-no-chrome")) { buildHeader(); buildFooter(); }
    setLang(lang); // sync placeholders etc.
    reveal();
  });
})();
