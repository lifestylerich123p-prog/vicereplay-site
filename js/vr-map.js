/* Vice Replay interactive map: Rockstar's official Leonida map (HD tiles) + our pins. Leaflet 1.9.4, self-hosted.
   Nov 24: "mark as found" progress (saved in this browser only), a found counter and "hide found", like the big
   GTA 6 map sites (MapGenie, GTABase). */
(function () {
  var el = document.getElementById("vrmap"), data = document.getElementById("vrpins");
  if (!el || !data || !window.L) return;
  var D = JSON.parse(data.textContent), es = D.lang === "es", W = D.w, H = D.h, Z = 5;
  var T = es ? {found: "Encontrado", mark: "Marcar como encontrado", unmark: "Desmarcar", count: "Encontrados",
                hide: "Ocultar encontrados", reset: "Borrar progreso", sure: "¿Borrar tu progreso?"}
             : {found: "Found", mark: "Mark as found", unmark: "Unmark", count: "Found", hide: "Hide found",
                reset: "Reset progress", sure: "Reset your progress?"};
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
  map.attributionControl.setPrefix(false);

  var layers = {}, markers = {}, catOn = {};
  D.cats.forEach(function (c) { layers[c.id] = L.layerGroup().addTo(map); catOn[c.id] = true; });
  function popupHtml(p) {
    var f = !!found[p.id];
    return "<b>" + p.n + ". " + p.t + "</b>" + (f ? ' <span class="vrok">✓ ' + T.found + "</span>" : "") + "<br>" + p.d +
      (p.when ? "<br><i>" + p.when + "</i>" : "") +
      '<br><button type="button" class="vrbtn" data-found="' + p.id + '">' + (f ? T.unmark : "✓ " + T.mark) + "</button>";
  }
  D.pins.forEach(function (p) {
    var c = D.cats.filter(function (x) { return x.id === p.cat; })[0];
    var icon = L.divIcon({className: "vrpin", html: '<b style="background:' + c.color + '">' + p.n + "</b>", iconSize: [30, 30], iconAnchor: [15, 15]});
    var m = L.marker(map.unproject([p.x * W, p.y * H], Z), {icon: icon, title: p.t, alt: p.t})
      .bindPopup(function () { return popupHtml(p); }, {maxWidth: 260});
    m._vr = p;
    markers[p.n] = m;
  });

  var counter;
  function refresh() {
    var n = 0;
    D.pins.forEach(function (p) {
      var m = markers[p.n], f = !!found[p.id];
      if (f) n++;
      var show = catOn[p.cat] && !(hideFound && f);
      if (show && !layers[p.cat].hasLayer(m)) m.addTo(layers[p.cat]);
      if (!show && layers[p.cat].hasLayer(m)) layers[p.cat].removeLayer(m);
      var ic = m.getElement && m.getElement();
      if (ic) ic.classList.toggle("vrdone", f);
    });
    if (counter) counter.textContent = T.count + ": " + n + "/" + D.pins.length;
    [].slice.call(document.querySelectorAll("[data-pin]")).forEach(function (a) {
      var p = D.pins[a.getAttribute("data-pin") - 1];
      if (p) a.parentNode.classList.toggle("vrdone-item", !!found[p.id]);
    });
  }
  map.on("popupopen", function (e) {
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
    var box = L.DomUtil.create("div", "vrlegend");
    box.innerHTML = D.cats.map(function (c) {
      return '<label><input type="checkbox" checked data-cat="' + c.id + '"><i style="background:' + c.color + '"></i>' + c.name + "</label>";
    }).join("") + '<div class="vrprog"><b class="vrcount"></b><label><input type="checkbox" data-hide>' + T.hide +
      '</label><button type="button" class="vrlink" data-reset>' + T.reset + "</button></div>";
    L.DomEvent.disableClickPropagation(box);
    counter = box.querySelector(".vrcount");
    box.querySelector("[data-hide]").checked = !!hideFound;
    box.addEventListener("change", function (e) {
      if (e.target.hasAttribute("data-hide")) { hideFound = e.target.checked; save(HIDE, hideFound); }
      else { catOn[e.target.getAttribute("data-cat")] = e.target.checked; }
      refresh();
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
    map.flyTo(m.getLatLng(), 4, {duration: smooth ? 0.8 : 0.01});
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
