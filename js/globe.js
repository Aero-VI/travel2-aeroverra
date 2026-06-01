// Globe View v3.0 - Premium 3D Interactive Travel Globe
// Clean, polished, dark aesthetic with smooth animations

let globe = null;
let countriesGeoJson = null;
let globeDataCache = { arcs: [], points: [], polygons: [] };
let autoRotateTimer = null;
let globeReady = false;

const ROUTE_COLORS = {
  Flight: 'rgba(192, 132, 252, 0.85)',
  Cruise: 'rgba(34, 211, 238, 0.85)',
  Train: 'rgba(251, 191, 36, 0.85)',
  Bus: 'rgba(74, 222, 128, 0.85)'
};

const ROUTE_COLORS_DIM = {
  Flight: 'rgba(192, 132, 252, 0.3)',
  Cruise: 'rgba(34, 211, 238, 0.3)',
  Train: 'rgba(251, 191, 36, 0.3)'
};

const MARKER_COLORS = {
  Flight: '#c084fc',
  Cruise: '#22d3ee',
  Train: '#fbbf24',
  Event: '#34d399',
  Home: '#f87171'
};

const ISO2_TO_ISO3 = {
  AU:'AUS',BS:'BHS',CA:'CAN',CO:'COL',CR:'CRI',DE:'DEU',DK:'DNK',DO:'DOM',
  EE:'EST',ES:'ESP',FI:'FIN',FR:'FRA',GB:'GBR',GI:'GIB',GR:'GRC',GU:'GUM',
  ID:'IDN',IE:'IRL',IS:'ISL',IT:'ITA',JP:'JPN',KR:'KOR',KY:'CYM',LV:'LVA',
  MX:'MEX',MY:'MYS',NL:'NLD',NO:'NOR',PA:'PAN',PH:'PHL',PL:'POL',PR:'PRI',
  PT:'PRT',SE:'SWE',SG:'SGP',SX:'SXM',TC:'TCA',TR:'TUR',US:'USA',VI:'VIR',
  VN:'VNM',HK:'HKG',TW:'TWN',TH:'THA',NZ:'NZL',CN:'CHN',IN:'IND',AE:'ARE',
  BR:'BRA',AR:'ARG',CL:'CHL',PE:'PER',EC:'ECU',JM:'JAM',HT:'HTI',CU:'CUB',
  BZ:'BLZ',HN:'HND',GT:'GTM',SV:'SLV',NI:'NIC',BB:'BRB',TT:'TTO',AW:'ABW',
  CW:'CUW',BM:'BMU',LC:'LCA',AG:'ATG',KN:'KNA',DM:'DMA',GD:'GRD',VC:'VCT',
  MT:'MLT',CY:'CYP',HR:'HRV',ME:'MNE',AL:'ALB',MK:'MKD',RS:'SRB',BA:'BIH',
  SI:'SVN',SK:'SVK',CZ:'CZE',HU:'HUN',RO:'ROU',BG:'BGR',LT:'LTU',UA:'UKR',
  BY:'BLR',MD:'MDA',AT:'AUT',CH:'CHE',BE:'BEL',LU:'LUX',MC:'MCO',LI:'LIE',
  SM:'SMR',VA:'VAT',AD:'AND',NC:'NCL',VU:'VUT',FJ:'FJI'
};

var COUNTRY_NAMES_MAP = {
  AU:'Australia',BS:'Bahamas',CA:'Canada',CO:'Colombia',CR:'Costa Rica',
  DE:'Germany',DK:'Denmark',DO:'Dominican Republic',EE:'Estonia',ES:'Spain',
  FI:'Finland',FR:'France',GB:'United Kingdom',GI:'Gibraltar',GR:'Greece',
  GU:'Guam',ID:'Indonesia',IE:'Ireland',IS:'Iceland',IT:'Italy',JP:'Japan',
  KR:'South Korea',KY:'Cayman Islands',LV:'Latvia',MX:'Mexico',MY:'Malaysia',
  NL:'Netherlands',NO:'Norway',PA:'Panama',PH:'Philippines',PL:'Poland',
  PR:'Puerto Rico',PT:'Portugal',SE:'Sweden',SG:'Singapore',SX:'Sint Maarten',
  TC:'Turks & Caicos',TR:'Turkey',US:'United States',VI:'US Virgin Islands',
  VN:'Vietnam',HK:'Hong Kong',TW:'Taiwan',NZ:'New Zealand',NC:'New Caledonia',
  VU:'Vanuatu',BB:'Barbados',AW:'Aruba',CW:'Curacao',TH:'Thailand'
};
function getCountryName(code) {
  return code ? (COUNTRY_NAMES_MAP[code] || code) : '';
}

function loadCountryBoundaries() {
  if (countriesGeoJson) return Promise.resolve();
  return fetch('https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson')
    .then(function(r) { return r.json(); })
    .then(function(data) { countriesGeoJson = data; })
    .catch(function(err) { console.warn('Country boundaries unavailable:', err); });
}

function initGlobe() {
  if (globe) return;
  var container = document.getElementById('globe-container');
  if (!container) return;
  container.innerHTML = '';

  globe = new Globe(container)
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
    .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
    .showAtmosphere(true)
    .atmosphereColor('#0066cc')
    .atmosphereAltitude(0.15)
    .showGraticules(false)
    // Arcs
    .arcColor(function(d) { return [d.color, d.colorDim || d.color]; })
    .arcDashLength(function(d) { return d.dashLen || 1; })
    .arcDashGap(function(d) { return d.dashGap || 0; })
    .arcDashAnimateTime(function(d) { return d.animTime || 0; })
    .arcStroke(function(d) { return d.stroke || 0.4; })
    .arcAltitude(function(d) { return d.altitude || null; })
    .arcAltitudeAutoScale(0.35)
    .arcsTransitionDuration(800)
    .arcLabel(function(d) { return buildArcTooltip(d); })
    // Points (invisible, label carriers)
    .pointColor(function() { return 'rgba(0,0,0,0)'; })
    .pointAltitude(0)
    .pointRadius(0.4)
    .pointLabel(function(d) { return buildPointTooltip(d); })
    // HTML markers (glowing dots)
    .htmlElementsData([])
    .htmlElement(function(d) {
      var el = document.createElement('div');
      var size = Math.max(3, Math.min(12, d.size * 2.5));
      el.style.cssText =
        'width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
        'background:radial-gradient(circle at 30% 30%, ' + d.color + ', ' + d.color + '88);' +
        'box-shadow:0 0 ' + (size) + 'px ' + d.color + '80,0 0 ' + (size * 2.5) + 'px ' + d.color + '30;' +
        'border:0.5px solid rgba(255,255,255,0.2);' +
        'cursor:pointer;transition:transform 0.3s ease, box-shadow 0.3s ease;' +
        'pointer-events:auto;';
      el.onmouseover = function() {
        el.style.transform = 'scale(2)';
        el.style.boxShadow = '0 0 ' + (size * 3) + 'px ' + d.color + ',0 0 ' + (size * 5) + 'px ' + d.color + '60';
      };
      el.onmouseout = function() {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 0 ' + (size) + 'px ' + d.color + '80,0 0 ' + (size * 2.5) + 'px ' + d.color + '30';
      };
      return el;
    })
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude(0.008)
    // Polygons (country highlights)
    .polygonCapColor(function() { return 'rgba(34, 211, 238, 0.04)'; })
    .polygonSideColor(function() { return 'rgba(34, 211, 238, 0.01)'; })
    .polygonStrokeColor(function() { return 'rgba(34, 211, 238, 0.15)'; })
    .polygonAltitude(0.005)
    .polygonsTransitionDuration(600);

  // Camera position: looking at Atlantic to show both Americas and Europe
  globe.pointOfView({ lat: 20, lng: -20, altitude: 2.2 }, 0);

  // Auto-rotate
  startAutoRotate();

  // Pause on interaction
  container.addEventListener('mousedown', pauseAutoRotate);
  container.addEventListener('touchstart', pauseAutoRotate);
  container.addEventListener('wheel', pauseAutoRotate);

  // Resize
  var ro = new ResizeObserver(function() {
    if (globe && container) {
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
    }
  });
  ro.observe(container);

  globeReady = true;
  loadCountryBoundaries();
}

function startAutoRotate() {
  if (!globe) return;
  var controls = globe.controls();
  if (controls) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.25;
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
  }
}

function pauseAutoRotate() {
  if (!globe) return;
  var controls = globe.controls();
  if (controls) controls.autoRotate = false;
  clearTimeout(autoRotateTimer);
  autoRotateTimer = setTimeout(startAutoRotate, 10000);
}

function buildArcTooltip(d) {
  var color = d.tooltipColor || '#fff';
  return '<div class="globe-tooltip">' +
    '<div class="gt-header" style="color:' + color + '">' + (d.icon || '') + ' ' + (d.title || '') + '</div>' +
    (d.subtitle ? '<div class="gt-route">' + d.subtitle + '</div>' : '') +
    (d.extra ? '<div class="gt-meta">' + d.extra + '</div>' : '') +
    '</div>';
}

function buildPointTooltip(d) {
  var html = '<div class="globe-tooltip">' +
    '<div class="gt-header">' + (d.label || '') + '</div>';
  if (d.country) html += '<div class="gt-country">' + d.country + '</div>';
  html += '<div class="gt-visits">' + d.count + ' visit' + (d.count !== 1 ? 's' : '') + '</div>';
  if (d.typeBadges) html += '<div class="gt-badges">' + d.typeBadges + '</div>';
  if (d.trips && d.trips.length > 0) {
    html += '<div class="gt-section"><div class="gt-section-title">TRIPS</div>';
    var shown = d.trips.slice(0, 6);
    for (var i = 0; i < shown.length; i++) {
      html += '<div class="gt-trip">' + shown[i] + '</div>';
    }
    if (d.trips.length > 6) html += '<div class="gt-more">+ ' + (d.trips.length - 6) + ' more</div>';
    html += '</div>';
  }
  if (d.details && d.details.length > 0) {
    html += '<div class="gt-section"><div class="gt-section-title">ACTIVITY</div>';
    var shownD = d.details.slice(0, 8);
    for (var j = 0; j < shownD.length; j++) {
      html += '<div class="gt-detail">' + shownD[j] + '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function clearGlobe() {
  if (!globe) return;
  globe.arcsData([]).pointsData([]).htmlElementsData([]).polygonsData([]);
  globeDataCache = { arcs: [], points: [], polygons: [] };
}

function buildMapData(trips, events, filterShip, filterType) {
  clearGlobe();
  if (!globe) initGlobe();

  var arcs = [];
  var visitedLocations = {};
  var visitedCountryCodes = new Set();

  function addCountry(code) { if (code) visitedCountryCodes.add(code); }

  function addLocation(lat, lng, label, type, detail, countryCode, tripName, dateStr) {
    if (lat == null || lng == null) return;
    var key = lat.toFixed(3) + ',' + lng.toFixed(3);
    if (!visitedLocations[key]) {
      visitedLocations[key] = {
        lat: lat, lng: lng, label: label, types: new Set(),
        details: [], count: 0, countries: new Set(), trips: new Set(), dates: []
      };
    }
    visitedLocations[key].types.add(type);
    if (detail) visitedLocations[key].details.push(detail);
    if (countryCode) visitedLocations[key].countries.add(countryCode);
    if (tripName) visitedLocations[key].trips.add(tripName);
    if (dateStr) visitedLocations[key].dates.push(dateStr);
    visitedLocations[key].count++;
    addCountry(countryCode);
  }

  trips.forEach(function(trip) {
    var isHome = trip.TripName && trip.TripName.toLowerCase().startsWith('home in');
    var segs = trip.Segments || [];
    var tripName = trip.TripName || '';

    segs.forEach(function(seg) {
      // Segment-level filtering
      if (filterShip && filterShip !== 'all') {
        if (seg.SegmentType === 'Cruise' && seg.Ship !== filterShip) return;
        if (seg.SegmentType !== 'Cruise' && (!filterType || filterType === 'all')) return;
      }
      if (filterType && filterType !== 'all' && seg.SegmentType !== filterType) return;

      if (seg.SegmentType === 'Flight') {
        var depCode = (seg.Departure || {}).Code || '';
        var arrCode = (seg.Arrival || {}).Code || '';
        var depCity = (seg.Departure || {}).City || '';
        var arrCity = (seg.Arrival || {}).City || '';
        var depCountry = (seg.Departure || {}).CountryCode || '';
        var arrCountry = (seg.Arrival || {}).CountryCode || '';
        var from = geocode('Flight', '', depCity, depCode);
        var to = geocode('Flight', '', arrCity, arrCode);

        if (from && to) {
          var airline = seg.Airline || 'Flight';
          var dateStr = seg.Departure && seg.Departure.Time ?
            new Date(seg.Departure.Time).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '';
          // Calculate distance-based altitude for nicer arcs
          var dist = Math.sqrt(Math.pow(from[0]-to[0],2) + Math.pow(from[1]-to[1],2));
          var alt = Math.min(0.5, Math.max(0.05, dist / 300));

          arcs.push({
            startLat: from[0], startLng: from[1],
            endLat: to[0], endLng: to[1],
            color: ROUTE_COLORS.Flight,
            colorDim: ROUTE_COLORS_DIM.Flight,
            tooltipColor: '#c084fc',
            dashLen: 0.5, dashGap: 0.15, animTime: 3000,
            stroke: 0.4, altitude: alt,
            icon: '\u2708\uFE0F', title: airline,
            subtitle: depCity + ' (' + depCode + ') \u2192 ' + arrCity + ' (' + arrCode + ')',
            extra: dateStr + (tripName ? ' \u00B7 ' + tripName : '') + (seg.BookingNumber ? ' \u00B7 ' + seg.BookingNumber : '')
          });

          addLocation(from[0], from[1], depCity + ' (' + depCode + ')', 'Flight',
            '\u2708\uFE0F ' + airline + ' \u2192 ' + arrCity, depCountry, tripName, dateStr);
          addLocation(to[0], to[1], arrCity + ' (' + arrCode + ')', 'Flight',
            '\u2708\uFE0F ' + airline + ' \u2190 ' + depCity, arrCountry, tripName, dateStr);
          addCountry(depCountry); addCountry(arrCountry);
        }

      } else if (seg.SegmentType === 'Cruise') {
        var ports = [];
        var depPort = seg.DeparturePort || {};
        var arrPort = seg.ArrivalPort || {};
        var depCoord = geocode('Cruise', depPort.PortName || '', depPort.City || '', '');
        var arrCoord = geocode('Cruise', arrPort.PortName || '', arrPort.City || '', '');
        var shipName = ((seg.CruiseLine || '') + ' ' + (seg.Ship || '')).trim();
        var cruiseDateStart = depPort.Time ? new Date(depPort.Time).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : '';
        var cruiseDateEnd = arrPort.Time ? new Date(arrPort.Time).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '';
        var cruiseDateRange = cruiseDateStart + (cruiseDateEnd ? ' - ' + cruiseDateEnd : '');

        if (depCoord) {
          ports.push({ lat: depCoord[0], lng: depCoord[1], name: depPort.PortName || depPort.City || 'Departure' });
          addLocation(depCoord[0], depCoord[1], depPort.City || depPort.PortName || '', 'Cruise',
            '\uD83D\uDEA2 ' + shipName + ' departure', depPort.CountryCode, tripName, cruiseDateRange);
          addCountry(depPort.CountryCode);
        }

        (seg.PortsOfCall || []).forEach(function(p) {
          var coord = geocode('Cruise', p.PortName || '', p.City || '', '');
          var portDate = p.Date ? new Date(p.Date).toLocaleDateString('en-US', {month:'short',day:'numeric'}) : '';
          if (coord) {
            ports.push({ lat: coord[0], lng: coord[1], name: p.PortName || p.City || '' });
            addLocation(coord[0], coord[1], p.City || p.PortName || '', 'Cruise',
              '\uD83D\uDEA2 ' + (seg.Ship || 'Cruise') + ' (' + portDate + ')', p.CountryCode, tripName, portDate);
            addCountry(p.CountryCode);
          }
        });

        if (arrCoord) {
          ports.push({ lat: arrCoord[0], lng: arrCoord[1], name: arrPort.PortName || arrPort.City || 'Arrival' });
          addLocation(arrCoord[0], arrCoord[1], arrPort.City || arrPort.PortName || '', 'Cruise',
            '\uD83D\uDEA2 ' + shipName + ' arrival', arrPort.CountryCode, tripName, cruiseDateRange);
          addCountry(arrPort.CountryCode);
        }

        for (var ci = 0; ci < ports.length - 1; ci++) {
          arcs.push({
            startLat: ports[ci].lat, startLng: ports[ci].lng,
            endLat: ports[ci + 1].lat, endLng: ports[ci + 1].lng,
            color: ROUTE_COLORS.Cruise,
            colorDim: ROUTE_COLORS_DIM.Cruise,
            tooltipColor: '#22d3ee',
            dashLen: 1, dashGap: 0, animTime: 0,
            stroke: 0.7, altitude: 0.01,
            icon: '\uD83D\uDEA2', title: shipName,
            subtitle: ports[ci].name + ' \u2192 ' + ports[ci + 1].name,
            extra: cruiseDateRange + (tripName ? ' \u00B7 ' + tripName : '') + (seg.BookingNumber ? ' \u00B7 ' + seg.BookingNumber : '')
          });
        }

      } else if (seg.SegmentType === 'Train') {
        var tdepName = (seg.Departure || {}).LocationName || '';
        var tarrName = (seg.Arrival || {}).LocationName || '';
        var tdepCity = (seg.Departure || {}).City || '';
        var tarrCity = (seg.Arrival || {}).City || '';
        var tdepCountry = (seg.Departure || {}).CountryCode || '';
        var tarrCountry = (seg.Arrival || {}).CountryCode || '';
        var tfrom = geocode('Train', tdepName, tdepCity, '');
        var tto = geocode('Train', tarrName, tarrCity, '');

        if (tfrom && tto) {
          var op = seg.Operator || 'Train';
          var tn = seg.TrainNumber || '';
          var trainDate = seg.Departure && seg.Departure.Time ?
            new Date(seg.Departure.Time).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '';

          arcs.push({
            startLat: tfrom[0], startLng: tfrom[1],
            endLat: tto[0], endLng: tto[1],
            color: ROUTE_COLORS.Train,
            colorDim: ROUTE_COLORS_DIM.Train,
            tooltipColor: '#fbbf24',
            dashLen: 0.3, dashGap: 0.1, animTime: 2000,
            stroke: 0.4, altitude: 0.005,
            icon: '\uD83D\uDE86', title: op + (tn ? ' ' + tn : ''),
            subtitle: (tdepCity || tdepName) + ' \u2192 ' + (tarrCity || tarrName),
            extra: trainDate + (tripName ? ' \u00B7 ' + tripName : '')
          });

          addLocation(tfrom[0], tfrom[1], tdepCity || tdepName, 'Train',
            '\uD83D\uDE86 ' + op + ' \u2192 ' + (tarrCity || tarrName), tdepCountry, tripName, trainDate);
          addLocation(tto[0], tto[1], tarrCity || tarrName, 'Train',
            '\uD83D\uDE86 ' + op + ' \u2190 ' + (tdepCity || tdepName), tarrCountry, tripName, trainDate);
          addCountry(tdepCountry); addCountry(tarrCountry);
        }

      } else if (seg.SegmentType === 'Accommodation' && !isHome) {
        var aCity = seg.City || '';
        var aCountry = seg.CountryCode || '';
        var aCoord = geocode('', '', aCity, '');
        if (aCoord) {
          addLocation(aCoord[0], aCoord[1], aCity, 'Home',
            '\uD83C\uDFE8 ' + (seg.DisplayName || aCity), aCountry, tripName, '');
          addCountry(aCountry);
        }
      }
    });
  });

  // Events
  if (!filterType || filterType === 'all') {
    (events || []).forEach(function(ev) {
      var evCity = ev.City || '';
      var evCountry = ev.CountryCode || '';
      var evCoord = geocode('', '', evCity, '');
      var evDate = ev.StartTime ? new Date(ev.StartTime).toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'}) : '';
      if (evCoord) {
        addLocation(evCoord[0], evCoord[1], evCity, 'Event',
          '\uD83C\uDFAD ' + (ev.EventName || ev.Title || ''), evCountry, '', evDate);
        addCountry(evCountry);
      }
    });
  }

  // Build HTML markers and point labels
  var htmlMarkers = [];
  var points = [];
  var locationEntries = Object.values(visitedLocations);
  locationEntries.forEach(function(loc) {
    var color = '#58a6ff';
    var size = 1.5;

    if (loc.types.has('Event')) { color = MARKER_COLORS.Event; size = 1.2; }
    if (loc.types.has('Train')) { color = MARKER_COLORS.Train; size = 1.3; }
    if (loc.types.has('Flight')) { color = MARKER_COLORS.Flight; size = 1.5; }
    if (loc.types.has('Cruise')) { color = MARKER_COLORS.Cruise; size = 1.5; }

    if (loc.count > 3) size += 0.4;
    if (loc.count > 6) size += 0.4;
    if (loc.count > 10) size += 0.4;

    var typeBadges = '';
    loc.types.forEach(function(t) {
      var tc = (MARKER_COLORS[t] || '#58a6ff');
      typeBadges += '<span style="border:1px solid ' + tc + ';color:' + tc + ';padding:1px 5px;border-radius:3px;font-size:10px;margin-right:3px">' + t + '</span>';
    });

    var countryList = [];
    loc.countries.forEach(function(c) { countryList.push(getCountryName(c)); });
    var tripList = [];
    loc.trips.forEach(function(t) { if (t) tripList.push(t); });
    var uniqueDetails = [];
    var seen = {};
    loc.details.forEach(function(d) { if (!seen[d]) { uniqueDetails.push(d); seen[d] = true; } });

    htmlMarkers.push({ lat: loc.lat, lng: loc.lng, color: color, size: size });

    points.push({
      lat: loc.lat, lng: loc.lng,
      color: 'rgba(0,0,0,0)', size: 0,
      label: loc.label,
      country: countryList.join(', '),
      count: loc.count,
      typeBadges: typeBadges,
      trips: tripList,
      details: uniqueDetails.slice(0, 15)
    });
  });

  // Build country polygons
  var polygons = [];
  if (countriesGeoJson) {
    var iso3Set = new Set();
    visitedCountryCodes.forEach(function(code) {
      var iso3 = ISO2_TO_ISO3[code];
      if (iso3) iso3Set.add(iso3);
    });
    countriesGeoJson.features.forEach(function(feature) {
      var props = feature.properties || {};
      var iso3 = props.ISO_A3 || props.iso_a3 || '';
      if (iso3Set.has(iso3)) polygons.push(feature);
    });
  }

  // Apply data
  globe.arcsData(arcs);
  globe.htmlElementsData(htmlMarkers);
  globe.pointsData(points);
  globe.polygonsData(polygons);

  globeDataCache = { arcs: arcs, points: points, polygons: polygons };
  return visitedCountryCodes;
}

function refreshMap(trips, events, filterShip, filterType) {
  if (!document.getElementById('globe-container')) return;
  initGlobe();
  if (!countriesGeoJson) {
    loadCountryBoundaries().then(function() {
      buildMapData(trips, events, filterShip, filterType);
    });
  } else {
    return buildMapData(trips, events, filterShip, filterType);
  }
}

function handleMapResize() {
  if (globe) {
    var container = document.getElementById('globe-container');
    if (container) {
      globe.width(container.clientWidth);
      globe.height(container.clientHeight);
    }
  }
}
