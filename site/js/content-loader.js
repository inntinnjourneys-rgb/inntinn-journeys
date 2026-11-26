/* =====================================================================
   Inntinn Journeys — content loader
   ---------------------------------------------------------------------
   The page ships with empty COUNTRY, GUIDES and PROPERTIES objects.
   This script fills them from /content/**.json, which is exactly what
   the CMS writes, then draws the map pins and the list view and lets
   the rest of the page carry on as normal.

   Add nothing to the page but one line, after the main script:
       <script src="/js/content-loader.js"></script>
   ===================================================================== */
(function () {
  var REGION_ORDER = ["South Asia", "The Himalaya", "Southeast Asia",
                      "Europe", "Africa & the Indian Ocean", "The Americas"];
  var W = 2000, LAT_TOP = 84, LAT_BOT = -56, H = 777.8;

  function project(lat, lon) {
    return {
      x: Math.round(((lon + 180) / 360 * W) * 10) / 10,
      y: Math.round(((LAT_TOP - lat) / (LAT_TOP - LAT_BOT) * H) * 10) / 10
    };
  }
  function esc(t) {
    return String(t == null ? "" : t)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function getJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(url + " " + r.status);
      return r.json();
    });
  }
  function loadFolder(dir) {
    return getJSON("/content/" + dir + "/_index.json").then(function (names) {
      return Promise.all(names.map(function (n) {
        return getJSON("/content/" + dir + "/" + n + ".json").catch(function (e) {
          console.warn("skipped", dir, n, e.message);
          return null;
        });
      }));
    });
  }

  function drawPins() {
    var layer = document.getElementById("pinLayer");
    if (!layer) return;
    layer.innerHTML = Object.keys(COUNTRY).map(function (k) {
      var c = COUNTRY[k];
      if (typeof c.lat !== "number" || typeof c.lon !== "number") return "";
      var p = project(c.lat, c.lon);
      return '<g class="pin" data-c="' + esc(k) + '" tabindex="0" role="button" aria-label="' +
        esc(c.name) + '">' +
        '<circle cx="' + p.x + '" cy="' + p.y + '" r="7"></circle>' +
        '<text x="' + p.x + '" y="' + (p.y - 15) + '" text-anchor="middle">' +
        esc(c.name) + "</text></g>";
    }).join("");
    layer.querySelectorAll(".pin").forEach(function (g) {
      g.addEventListener("click", function () { openCountry(g.dataset.c); });
      g.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openCountry(g.dataset.c); }
      });
    });
  }

  function drawList() {
    var el = document.getElementById("mvlist");
    if (!el) return;
    var byRegion = {};
    Object.keys(COUNTRY).forEach(function (k) {
      var r = COUNTRY[k].region || "Elsewhere";
      (byRegion[r] = byRegion[r] || []).push(k);
    });
    var regions = REGION_ORDER.filter(function (r) { return byRegion[r]; })
      .concat(Object.keys(byRegion).filter(function (r) { return REGION_ORDER.indexOf(r) < 0; }));
    el.innerHTML = regions.map(function (r) {
      return '<div class="mv-group"><h4>' + esc(r) + "</h4>" +
        byRegion[r].map(function (k) {
          return '<a href="#" data-c="' + esc(k) + '">' + esc(COUNTRY[k].name) +
                 '<span class="chev">&#8250;</span></a>';
        }).join("") + "</div>";
    }).join("");
    el.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); openCountry(a.dataset.c); });
    });
  }

  function drawDesks(desks) {
    var row = document.querySelector(".desks");
    if (!row || !desks || !desks.length) return;
    row.innerHTML = desks.map(function (d) {
      return '<div class="desk" data-tz="' + esc(d.tz) + '">' +
        '<svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">' +
        '<circle class="dial" cx="40" cy="40" r="37" stroke-width="1"></circle>' +
        '<text class="ijmark" x="40" y="48" text-anchor="middle">IJ</text>' +
        '<line class="tick" x1="40" y1="5" x2="40" y2="10" stroke-width="1"></line>' +
        '<line class="tick" x1="75" y1="40" x2="70" y2="40" stroke-width="1"></line>' +
        '<line class="tick" x1="40" y1="75" x2="40" y2="70" stroke-width="1"></line>' +
        '<line class="tick" x1="5" y1="40" x2="10" y2="40" stroke-width="1"></line>' +
        '<line class="hand hour" x1="40" y1="40" x2="40" y2="26" stroke-width="1.8"></line>' +
        '<line class="hand min" x1="40" y1="40" x2="40" y2="20" stroke-width="1.2"></line>' +
        '<circle class="pivot" cx="40" cy="40" r="1.8"></circle></svg>' +
        "<span>" + esc(d.city) + "</span><small>--:--</small></div>";
    }).join("");
    if (typeof tickDesks === "function") tickDesks();
  }

  function drawContact(c) {
    if (!c) return;
    var set = function (sel, v) {
      var el = document.querySelector(sel);
      if (el && v) el.textContent = v;
    };
    set(".foot-desk", c.deskName);
    var lines = document.querySelectorAll(".foot-brand .foot-line");
    if (lines[0] && c.address) lines[0].querySelector("span").innerHTML = esc(c.address).replace(/\n/g, "<br>");
    if (lines[1] && c.phone) { var a = lines[1].querySelector("a"); a.textContent = c.phone; a.href = "tel:" + c.phone.replace(/[^+\d]/g, ""); }
    if (lines[2] && c.email) { var m = lines[2].querySelector("a"); m.textContent = c.email; m.href = "mailto:" + c.email; }
    if (lines[3] && c.whatsapp) { var w = lines[3].querySelector("a"); w.textContent = c.whatsapp; }
    var note = document.querySelector(".apply-note");
    if (note && c.applyNote) note.textContent = c.applyNote;
    var badges = document.querySelector(".foot-badges");
    if (badges && c.badges) badges.innerHTML = c.badges.map(function (b) { return "<span>" + esc(b.label) + "</span>"; }).join("");
  }

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  ready(function () {
    Promise.all([
      loadFolder("countries"),
      loadFolder("guides"),
      loadFolder("properties"),
      getJSON("/content/pages/desks.json").catch(function () { return null; }),
      getJSON("/content/pages/contact.json").catch(function () { return null; })
    ]).then(function (res) {
      var countries = res[0].filter(Boolean),
          guides    = res[1].filter(Boolean),
          props     = res[2].filter(Boolean);

      countries.forEach(function (c) { if (c.key) COUNTRY[c.key] = c; });
      if (typeof COUNTRY_BY_NAME === "object") {
        Object.keys(COUNTRY).forEach(function (k) { COUNTRY_BY_NAME[COUNTRY[k].name] = k; });
      }
      guides.forEach(function (g) {
        (GUIDES[g.countryKey] = GUIDES[g.countryKey] || []).push(g);
      });
      props.forEach(function (p) {
        (PROPERTIES[p.countryKey] = PROPERTIES[p.countryKey] || []).push(p);
      });

      drawPins();
      drawList();
      drawDesks(res[3] && res[3].desks);
      drawContact(res[4]);
      document.documentElement.setAttribute("data-content", "ready");
    }).catch(function (e) {
      console.error("Content failed to load:", e);
      document.documentElement.setAttribute("data-content", "failed");
    });
  });
})();
