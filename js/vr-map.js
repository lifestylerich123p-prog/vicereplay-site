/* Vice Replay interactive map: Rockstar's official Leonida map (HD tiles) + our pins. Leaflet 1.9.4, self-hosted. */
(function () {
  var el = document.getElementById("vrmap"), data = document.getElementById("vrpins");
  if (!el || !data || !window.L) return;
  var D = JSON.parse(data.textContent), es = D.lang === "es", W = D.w, H = D.h, Z = 5;
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
  var layers = {}, markers = {};
  D.cats.forEach(function (c) { layers[c.id] = L.layerGroup().addTo(map); });
  D.pins.forEach(function (p) {
    var c = D.cats.filter(function (x) { return x.id === p.cat; })[0];
    var icon = L.divIcon({className: "vrpin", html: '<b style="background:' + c.color + '">' + p.n + "</b>", iconSize: [30, 30], iconAnchor: [15, 15]});
    var m = L.marker(map.unproject([p.x * W, p.y * H], Z), {icon: icon, title: p.t, alt: p.t})
      .bindPopup("<b>" + p.n + ". " + p.t + "</b><br>" + p.d + (p.when ? "<br><i>" + p.when + "</i>" : ""), {maxWidth: 260});
    m.addTo(layers[p.cat]);
    markers[p.n] = m;
  });
  var ctl = L.control({position: "topright"});
  ctl.onAdd = function () {
    var box = L.DomUtil.create("div", "vrlegend");
    box.innerHTML = D.cats.map(function (c) {
      return '<label><input type="checkbox" checked data-cat="' + c.id + '"><i style="background:' + c.color + '"></i>' + c.name + "</label>";
    }).join("");
    L.DomEvent.disableClickPropagation(box);
    box.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-cat");
      if (e.target.checked) layers[k].addTo(map); else map.removeLayer(layers[k]);
    });
    return box;
  };
  ctl.addTo(map);
  var bySlug = {};
  D.pins.forEach(function (p) { bySlug[p.id] = p.n; });
  function go(n, smooth) {
    var m = markers[n];
    if (!m) return false;
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
