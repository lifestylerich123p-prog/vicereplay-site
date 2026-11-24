/* Vice Replay interactive map: Rockstar's official Leonida map (HD tiles) + our pins. Leaflet 1.9.4, self-hosted.
   Nov 24: "mark as found" progress (saved in this browser only), a found counter and "hide found", like the big
   GTA 6 map sites (MapGenie, GTABase). */
(function () {
  var el = document.getElementById("vrmap"), data = document.getElementById("vrpins");
  if (!el || !data || !window.L) return;
  var D = JSON.parse(data.textContent), es = D.lang === "es", W = D.w, H = D.h, Z = 5;
  var phone = window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  var T = es ? {found: "Encontrado", mark: "Marcar como encontrado", unmark: "Desmarcar", count: "Encontrados",
                hide: "Ocultar encontrados", reset: "Borrar progreso", sure: "¿Borrar tu progreso?",
                search: "Buscar en el mapa…", next: "Siguiente sin encontrar →", none: "¡Todo encontrado!",
                layers: "Capas y búsqueda", copy: "Copiar enlace", copied: "¡Enlace copiado!", full: "Pantalla completa",
                tap: "Toca el mapa para moverlo"}
             : {found: "Found", mark: "Mark as found", unmark: "Unmark", count: "Found", hide: "Hide found",
                reset: "Reset progress", sure: "Reset your progress?", search: "Search the map…",
                next: "Next unfound →", none: "All found!", layers: "Layers & search", copy: "Copy link",
                copied: "Link copied!", full: "Full screen", tap: "Tap the map to move it"};
  var KEY = "vr-map-found", HIDE = "vr-map-hide-found";
  function load(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: keep in memory */ } }
  var found = load(KEY, {}), hideFound = load(HIDE, false);

  var map = L.map(el, {crs: L.CRS.Simple, minZoom: 0, maxZoom: 6, zoomSnap: 0.25, zoomDelta: 0.5,
                       wheelPxPerZoomLevel: 90, attributionControl: true});
  var bounds = L.latLngBounds(map.unproject([0, H], Z), map.unproject([W, 0], Z));
  L.tileLayer("/img/map/{z}/{x}/{y}.webp", {bounds: bounds, noWrap: true, maxNativeZoom: Z, maxZoom: 6, tileSize: 256,
    attribution: es ? "Mapa: Rockstar Games (oficial) · pines: Vice Replay" : "Map: Rockstar Games (official) · pins: Vice Replay"}).addTo(map);
  map.fitBounds(bounds);
  var small = function () { el.classList.toggle("vrsmall", map.getZoom() < 1.75); };
  map.on("zoomend", small);
  small();
  map.setMaxBounds(bounds.pad(0.15));
  if (L.Browser.touch && phone) {  // Nov 24 review: a swipe over the map moved the map, not the page
    map.dragging.disable();
    var hint = L.DomUtil.create("div", "vrhint", el);
    hint.textContent = T.tap;
    map.once("click", function () { map.dragging.enable(); hint.parentNode && hint.parentNode.removeChild(hint); });
  }
  map.attributionControl.setPrefix(false);

  var layers = {}, markers = {}, catOn = {}, query = "";
  var NOTRACK = {places: 1};  // Nov 24 review: cities/regions aren't things to "find"; keep them out of progress
  var tracked = D.pins.filter(function (p) { return !NOTRACK[p.cat]; });
  var want = (function () {  // ?layer=mods or a page that opens on one layer (data "only")
    try { var q = new URLSearchParams(location.search).get("layer"); if (q) return q.split(","); } catch (e) {}
    return D.only || null;
  })();
  D.cats.forEach(function (c) {
    layers[c.id] = L.layerGroup().addTo(map);
    catOn[c.id] = !want || want.indexOf(c.id) >= 0;
  });
  function popupHtml(p) {
    var f = !!found[p.id];
    return "<b>" + p.n + ". " + p.t + "</b>" + (f ? ' <span class="vrok">✓ ' + T.found + "</span>" : "") + "<br>" + p.d +
      (p.when ? "<br><i>" + p.when + "</i>" : "") +
      "<br>" + (NOTRACK[p.cat] ? "" : '<button type="button" class="vrbtn" data-found="' + p.id + '">' + (f ? T.unmark : "✓ " + T.mark) + "</button> ") +
      '<button type="button" class="vrlink" data-copy="' + p.id + '">🔗 ' + T.copy + "</button>";
  }
  D.pins.forEach(function (p) {
    var c = D.cats.filter(function (x) { return x.id === p.cat; })[0];
    var icon = L.divIcon({className: "vrpin", html: '<b style="background:' + c.color + '">' + p.n + "</b>", iconSize: [30, 30], iconAnchor: [15, 15]});
    var m = L.marker(map.unproject([p.x * W, p.y * H], Z), {icon: icon, title: p.t, alt: p.t})
      .bindPopup(function () { return popupHtml(p); }, {maxWidth: 260, autoPanPaddingTopLeft: L.point(10, phone ? 60 : 20)});
    m._vr = p;
    markers[p.n] = m;
  });

  var counter;
  function refresh() {
    var n = 0;
    D.pins.forEach(function (p) {
      var m = markers[p.n], f = !!found[p.id];
      if (f && !NOTRACK[p.cat]) n++;
      var hay = (p.t + " " + p.d + " " + (p.k || "")).toLowerCase();
      var show = catOn[p.cat] && !(hideFound && f) && (!query || hay.indexOf(query) >= 0);
      if (show && !layers[p.cat].hasLayer(m)) m.addTo(layers[p.cat]);
      if (!show && layers[p.cat].hasLayer(m)) layers[p.cat].removeLayer(m);
      var ic = m.getElement && m.getElement();
      if (ic) ic.classList.toggle("vrdone", f);
    });
    if (counter) counter.textContent = T.count + ": " + n + "/" + tracked.length;
    D.cats.forEach(function (c) {
      if (NOTRACK[c.id]) return;
      var all = D.pins.filter(function (p) { return p.cat === c.id; });
      var got = all.filter(function (p) { return found[p.id]; }).length;
      var s = document.querySelector('.vrlegend [data-cnt="' + c.id + '"]');
      if (s) s.textContent = " " + got + "/" + all.length;
    });
    [].slice.call(document.querySelectorAll("[data-pin]")).forEach(function (a) {
      var p = D.pins[a.getAttribute("data-pin") - 1];
      if (p) a.parentNode.classList.toggle("vrdone-item", !!found[p.id]);
    });
  }
  map.on("popupopen", function (e) {
    var cp = e.popup.getElement().querySelector("[data-copy]");
    if (cp) cp.addEventListener("click", function () {
      var url = location.origin + location.pathname + "#" + cp.getAttribute("data-copy");
      try { navigator.clipboard.writeText(url); } catch (err) { window.prompt(T.copy, url); }
      if (history.replaceState) history.replaceState(null, "", "#" + cp.getAttribute("data-copy"));
      cp.textContent = "✓ " + T.copied;
    });
    var b = e.popup.getElement().querySelector("[data-found]");
    if (!b) return;
    b.addEventListener("click", function () {
      var id = b.getAttribute("data-found");
      if (found[id]) delete found[id]; else found[id] = 1;
      save(KEY, found);
      var m = e.popup._source;
      e.popup.setContent(popupHtml(m._vr));
      map.closePopup();
      refresh();
    });
  });

  var ctl = L.control({position: "topright"});
  ctl.onAdd = function () {
    var box = L.DomUtil.create("div", "vrlegend" + (phone ? "" : " open"));
    box.innerHTML = '<button type="button" class="vrtoggle" aria-expanded="' + !phone + '">☰ ' + T.layers + " (" + D.pins.length + ")</button>" +
      '<button type="button" class="vrlink vrfullbtn" data-full>⛶ ' + T.full + "</button>" +
      '<div class="vrbody"><input type="search" class="vrsearch" placeholder="' + T.search + '" aria-label="' + T.search + '">' +
      D.cats.map(function (c) {
        return '<label><input type="checkbox"' + (catOn[c.id] ? " checked" : "") + ' data-cat="' + c.id + '"><i style="background:' +
          c.color + '"></i>' + c.name + '<small data-cnt="' + c.id + '"></small></label>';
      }).join("") + '<div class="vrprog"><b class="vrcount"></b><button type="button" class="vrbtn vrnext" data-next>' + T.next +
      '</button><label><input type="checkbox" data-hide>' + T.hide + '</label><button type="button" class="vrlink" data-reset>' +
      T.reset + "</button></div></div>";
    L.DomEvent.disableClickPropagation(box);
    L.DomEvent.disableScrollPropagation(box);
    box.querySelector(".vrtoggle").addEventListener("click", function (e) {
      var open = !box.classList.contains("open");
      box.classList.toggle("open", open);
      e.target.setAttribute("aria-expanded", open);
    });
    box.querySelector("[data-full]").addEventListener("click", function () {
      el.classList.toggle("vrfull");
      document.body.classList.toggle("vrnoscroll", el.classList.contains("vrfull"));
      setTimeout(function () { map.invalidateSize(); }, 50);
    });
    counter = box.querySelector(".vrcount");
    box.querySelector("[data-hide]").checked = !!hideFound;
    box.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-hide")) { hideFound = e.target.checked; save(HIDE, hideFound); }
      else { catOn[e.target.getAttribute("data-cat")] = e.target.checked; }
      refresh();
    });
    box.querySelector(".vrsearch").addEventListener("input", function (e) {
      query = e.target.value.toLowerCase().trim();
      refresh();
      var hits = D.pins.filter(function (p) { return query && (p.t + " " + p.d + " " + (p.k || "")).toLowerCase().indexOf(query) >= 0 && catOn[p.cat]; });
      if (hits.length === 1) go(hits[0].n, true);
    });
    var last = 0;
    box.querySelector("[data-next]").addEventListener("click", function () {
      var todo = D.pins.filter(function (p) { return !found[p.id] && catOn[p.cat] && !NOTRACK[p.cat]; });
      if (!todo.length) { window.alert(T.none); return; }
      var nxt = todo.filter(function (p) { return p.n > last; })[0] || todo[0];
      last = nxt.n;
      go(nxt.n, true);
    });
    box.querySelector("[data-reset]").addEventListener("click", function () {
      if (window.confirm(T.sure)) { found = {}; save(KEY, found); refresh(); }
    });
    return box;
  };
  ctl.addTo(map);
  map.on("zoomend moveend", refresh);
  refresh();

  var bySlug = {};
  D.pins.forEach(function (p) { bySlug[p.id] = p.n; });
  function go(n, smooth) {
    var m = markers[n];
    if (!m) return false;
    if (!layers[m._vr.cat].hasLayer(m)) m.addTo(layers[m._vr.cat]);  // a hidden/found pin still opens from a link
    el.scrollIntoView({behavior: smooth ? "smooth" : "auto", block: "center"});
    var lg = el.querySelector(".vrlegend");
    if (phone && lg) lg.classList.remove("open");
    // Nov 24 review: a centred pin opened its popup under the legend; land it in the lower third so the popup fits
    var pt = map.project(m.getLatLng(), 4).subtract([0, map.getSize().y * 0.2]);
    map.flyTo(map.unproject(pt, 4), 4, {duration: smooth ? 0.8 : 0.01});
    if (!map.dragging.enabled()) map.dragging.enable();
    var hn = el.querySelector(".vrhint");
    if (hn) hn.parentNode.removeChild(hn);
    setTimeout(function () { m.openPopup(); }, smooth ? 850 : 60);
    return true;
  }
  [].slice.call(document.querySelectorAll("[data-pin]")).forEach(function (a) {
    a.addEventListener("click", function (e) {
      var n = a.getAttribute("data-pin");
      if (!markers[n]) return;
      e.preventDefault();
      var p = D.pins[n - 1];
      if (p && history.replaceState) history.replaceState(null, "", "#" + p.id);  // shareable link to this spot
      go(n, true);
    });
  });
  var h = decodeURIComponent((location.hash || "").slice(1));  // /guides/gta-6-map-leonida-places/#ufo-abduction
  if (h && bySlug[h]) go(bySlug[h], false);
})();
