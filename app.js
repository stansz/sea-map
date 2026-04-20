// OGS Sea — Nautical Chart Application
// Local API + OpenSeaMap + BC Ferries + Tides + Marinas + Lighthouses + Coastal Trails

const LOCAL_API = 'https://maps.ogsapps.cc/api';
const BC_FERRIES_API = 'https://www.bcferriesapi.ca/v2/';
const DFO_API = 'https://api-iwls.dfo-mpo.gc.ca/api/v1';

const map = L.map('map', {
    center: [49.3, -123.3],
    zoom: 9,
    zoomControl: true
});

// Base map — CARTO Voyager
const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19
}).addTo(map);

// OpenSeaMap seamarks overlay
const seamarksLayer = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://openseamap.org">OpenSeaMap</a>'
}).addTo(map);

// Depth contours overlay
const depthLayer = L.tileLayer('https://tiles.openseamap.org/depth_contours/{z}/{x}/{y}.png', {
    maxZoom: 18, attribution: ''
});

// ─── BC Ferries Routes & Schedule ───

const FERRY_ROUTES = [
    { key: 'TSASWB', from: 'Tsawwassen', to: 'Swartz Bay', color: '#2563eb', fromLat: 49.0064, fromLon: -123.131, toLat: 48.877, toLon: -123.509 },
    { key: 'TSADUK', from: 'Tsawwassen', to: 'Duke Point', color: '#d97706', fromLat: 49.0064, fromLon: -123.131, toLat: 49.150, toLon: -123.890 },
    { key: 'HSBNAN', from: 'Horseshoe Bay', to: 'Departure Bay', color: '#059669', fromLat: 49.374, fromLon: -123.273, toLat: 49.176, toLon: -123.945 },
    { key: 'HSBLNG', from: 'Horseshoe Bay', to: 'Langdale', color: '#7c3aed', fromLat: 49.374, fromLon: -123.273, toLat: 49.415, toLon: -123.553 },
    { key: 'SWBFUL', from: 'Swartz Bay', to: 'Fulford Harbour', color: '#dc2626', fromLat: 48.877, fromLon: -123.509, toLat: 48.795, toLon: -123.416 },
    { key: 'SWBSGI', from: 'Swartz Bay', to: 'Southern Gulf Islands', color: '#0891b2', fromLat: 48.877, fromLon: -123.509, toLat: 48.810, toLon: -123.300 },
];

function makeRouteCoords(fromLat, fromLon, toLat, toLon, points = 40) {
    const coords = [];
    for (let i = 0; i <= points; i++) {
        const t = i / points;
        const lat = fromLat + (toLat - fromLat) * t;
        const lon = fromLon + (toLon - fromLon) * t;
        const bulge = Math.sin(t * Math.PI) * 0.04;
        coords.push([lat + bulge * (toLon > fromLon ? 1 : -1), lon]);
    }
    return coords;
}

let ferryData = null;
const ferryGroup = L.layerGroup();

async function loadFerrySchedules() {
    if (ferryData) return ferryData;
    try {
        const res = await fetch(BC_FERRIES_API);
        ferryData = await res.json();
        return ferryData;
    } catch { return null; }
}

function getRouteSchedule(data, routeKey) {
    if (!data) return null;
    for (const route of (data.routes || [])) {
        if ((route.routeCode || '') === routeKey || (route.routeCode || '').includes(routeKey)) return route;
    }
    return null;
}

function formatTime(isoStr) {
    if (!isoStr) return '—';
    try { return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return isoStr; }
}

function capacityBar(pct) {
    if (pct == null) return '';
    const color = pct > 80 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#22c55e';
    return `<div style="background:#e5e7eb;border-radius:4px;height:6px;margin-top:4px;width:100%">
        <div style="background:${color};height:6px;border-radius:4px;width:${pct}%;transition:width 0.3s"></div>
    </div><div style="font-size:0.7rem;color:#666;margin-top:2px">${pct}% full</div>`;
}

async function renderFerries() {
    const data = await loadFerrySchedules();
    ferryGroup.clearLayers();

    for (const route of FERRY_ROUTES) {
        const coords = makeRouteCoords(route.fromLat, route.fromLon, route.toLat, route.toLon);
        const line = L.polyline(coords, { color: route.color, weight: 3, opacity: 0.7, dashArray: '10 6' });
        ferryGroup.addLayer(line);

        for (const [lat, lon, label] of [
            [route.fromLat, route.fromLon, route.from],
            [route.toLat, route.toLon, route.to]
        ]) {
            const marker = L.circleMarker([lat, lon], {
                radius: 6, fillColor: route.color, fillOpacity: 0.9, color: '#fff', weight: 2
            });

            const sched = getRouteSchedule(data, route.key);
            let popupHTML = `<div class="ferry-popup"><h3>🚢 ${label}</h3>
                <div class="detail">${route.from} ↔ ${route.to}</div>`;

            if (sched && sched.sailings) {
                popupHTML += '<div style="margin-top:0.5rem;font-size:0.75rem">';
                for (const s of sched.sailings.slice(0, 5)) {
                    const dep = formatTime(s.departureTime || s.scheduledDeparture);
                    const arr = formatTime(s.arrivalTime || s.scheduledArrival);
                    const vessel = s.vesselName || '';
                    const cap = s.fill != null ? s.fill : null;
                    const status = s.status || '';
                    const icon = status.toLowerCase().includes('cancel') ? '❌' :
                                 status.toLowerCase().includes('delay') ? '⚠️' : '✅';
                    popupHTML += `<div style="padding:0.25rem 0;border-bottom:1px solid #eee">
                        <div><b>${dep}</b> → ${arr} ${icon}</div>
                        ${vessel ? `<div style="color:#666">⛴️ ${vessel}</div>` : ''}
                        ${capacityBar(cap)}</div>`;
                }
                popupHTML += '</div>';
            } else {
                popupHTML += '<div style="margin-top:0.4rem;color:#888;font-size:0.75rem">Schedule data unavailable</div>';
            }
            popupHTML += '<div style="margin-top:0.4rem;font-size:0.65rem;color:#999">Source: bcferriesapi.ca · Updated every 5 min</div></div>';
            marker.bindPopup(popupHTML, { maxWidth: 280 });
            ferryGroup.addLayer(marker);
        }
    }
}

ferryGroup.addTo(map);
renderFerries();
setInterval(() => { ferryData = null; renderFerries(); }, 300000);

// ─── Marinas & Harbours (LOCAL API) ───

let marinasLayer = null;
let marinasLoaded = false;

async function loadMarinas() {
    if (marinasLoaded) return;
    marinasLoaded = true;
    try {
        const res = await fetch(`${LOCAL_API}/sea/pois?type=marina&lat=49.3&lon=-123.3&radius=300&limit=200`);
        const data = await res.json();
        const markers = [];

        for (const poi of data.pois || []) {
            const amenities = [];
            if (poi.fuel === 'yes') amenities.push('⛽');
            if (poi.water || poi.tags?.water_point === 'yes') amenities.push('💧');
            if (poi.toilets === 'yes') amenities.push('🚽');
            if (poi.internet_access === 'wlan') amenities.push('📶');
            
            const details = [];
            if (poi.operator) details.push(`🏢 ${poi.operator}`);
            if (poi.capacity) details.push(`🚤 ${poi.capacity} berths`);
            if (poi.maxlength) details.push(`📏 Max ${poi.maxlength}m`);
            if (poi.depth) details.push(`🔻 ${poi.depth}m`);

            const marker = L.circleMarker([poi.lat, poi.lon], {
                radius: 5, fillColor: '#f59e0b', fillOpacity: 0.8, color: '#d97706', weight: 1.5
            }).bindPopup(`
                <div class="marina-popup">
                    <h3>⛵ ${poi.name || 'Marina'}</h3>
                    <div class="detail">${poi.type}${amenities.length ? ' · ' + amenities.join(' ') : ''}</div>
                    ${details.length ? '<div class="detail" style="margin-top:0.3rem">' + details.join(' · ') + '</div>' : ''}
                    ${poi.phone ? `<div class="detail">📞 ${poi.phone}</div>` : ''}
                    ${poi.website ? `<div class="detail"><a href="${poi.website}" target="_blank" rel="noopener">${poi.website}</a></div>` : ''}
                    <div class="detail" style="margin-top:0.3rem">${poi.dist_km}km away</div>
                </div>
            `, { maxWidth: 280 });
            markers.push(marker);
        }

        marinasLayer = L.layerGroup(markers);
    } catch (err) {
        console.error('Failed to load marinas:', err);
    }
}

// ─── Coastal POIs (beaches, slipways, etc.) ───

let coastalPoisLayer = null;
let coastalPoisLoaded = false;

async function loadCoastalPois() {
    if (coastalPoisLoaded) return;
    coastalPoisLoaded = true;
    try {
        const res = await fetch(`${LOCAL_API}/sea/pois?type=all&lat=49.3&lon=-123.3&radius=300&limit=300`);
        const data = await res.json();
        const markers = [];

        const typeIcons = {
            harbour: '⚓', beach: '🏖️', lighthouse: '🗼', slipway: '🚤',
            ferry_terminal: '⛴️', wreck: '⚠️', cliff: '🏔️', coastguard: '🛟',
            small_craft_facility: '🚤', boat_rental: '🚣', marina: '⛵'
        };
        // Skip marinas (separate layer) and lighthouses (separate layer)
        const skip = new Set(['marina', 'lighthouse']);

        for (const poi of data.pois || []) {
            if (skip.has(poi.type)) continue;
            const icon = typeIcons[poi.type] || '📍';

            const marker = L.circleMarker([poi.lat, poi.lon], {
                radius: 4, fillColor: '#6366f1', fillOpacity: 0.7, color: '#4f46e5', weight: 1
            }).bindPopup(`
                <div class="marina-popup">
                    <h3>${icon} ${poi.name || poi.type}</h3>
                    <div class="detail">${poi.type.replace('_', ' ')}</div>
                    ${poi.description ? `<div class="detail" style="margin-top:0.3rem">${poi.description}</div>` : ''}
                    ${poi.website ? `<div class="detail"><a href="${poi.website}" target="_blank" rel="noopener">${poi.website}</a></div>` : ''}
                    <div class="detail" style="margin-top:0.3rem">${poi.dist_km}km away</div>
                </div>
            `, { maxWidth: 280 });
            markers.push(marker);
        }

        coastalPoisLayer = L.layerGroup(markers);
    } catch (err) {
        console.error('Failed to load coastal POIs:', err);
    }
}

// ─── Lighthouses (LOCAL API) ───

let lighthousesLayer = null;
let lighthousesLoaded = false;

async function loadLighthouses() {
    if (lighthousesLoaded) return;
    lighthousesLoaded = true;
    try {
        const res = await fetch(`${LOCAL_API}/sea/lighthouses`);
        const data = await res.json();
        const markers = [];

        for (const lh of data.lighthouses || []) {
            const details = [];
            if (lh.height) details.push(`Height: ${lh.height}`);
            if (lh.light_range) details.push(`Range: ${lh.light_range}nm`);
            if (lh.light_character) details.push(`Character: ${lh.light_character}`);
            if (lh.start_date) details.push(`Built: ${lh.start_date}`);
            if (lh.operator) details.push(`Operator: ${lh.operator}`);

            const marker = L.circleMarker([lh.lat, lh.lon], {
                radius: 7, fillColor: '#fbbf24', fillOpacity: 0.9, color: '#92400e', weight: 2
            }).bindPopup(`
                <div class="marina-popup">
                    <h3>🗼 ${lh.name}</h3>
                    ${details.length ? details.map(d => `<div class="detail">${d}</div>`).join('') : ''}
                    ${lh.wikipedia ? `<div class="detail" style="margin-top:0.3rem"><a href="https://en.wikipedia.org/wiki/${lh.wikipedia.replace('en:', '')}" target="_blank" rel="noopener">Wikipedia ↗</a></div>` : ''}
                </div>
            `, { maxWidth: 280 });
            markers.push(marker);
        }

        lighthousesLayer = L.layerGroup(markers);
    } catch (err) {
        console.error('Failed to load lighthouses:', err);
    }
}

// ─── Coastal Trails (LOCAL API) ───

let trailsLayer = null;
let trailsLoaded = false;

async function loadCoastalTrails() {
    if (trailsLoaded) return;
    trailsLoaded = true;
    try {
        const res = await fetch(`${LOCAL_API}/sea/trails?lat=49.3&lon=-123.3&radius=200&limit=50`);
        const data = await res.json();
        const markers = [];

        for (const trail of data.trails || []) {
            const diffColors = { easy: '#22c55e', moderate: '#f59e0b', hard: '#ef4444' };
            const color = diffColors[trail.difficulty] || '#94a3b8';
            
            const marker = L.circleMarker([trail.lat, trail.lon], {
                radius: 5, fillColor: color, fillOpacity: 0.8, color: '#fff', weight: 1.5
            }).bindPopup(`
                <div class="marina-popup">
                    <h3>🥾 ${trail.name}</h3>
                    ${trail.distance_km ? `<div class="detail">📏 ${trail.distance_km} km</div>` : ''}
                    ${trail.difficulty ? `<div class="detail">Difficulty: <span style="color:${color}">${trail.difficulty}</span></div>` : ''}
                    <div class="detail">${trail.dist_km}km away · ${trail.trail_count || 1} segment(s)</div>
                </div>
            `, { maxWidth: 280 });
            markers.push(marker);
        }

        trailsLayer = L.layerGroup(markers);
    } catch (err) {
        console.error('Failed to load coastal trails:', err);
    }
}

// ─── Tide Stations ───

let tidesLayer = null;
let tidesLoaded = false;

const TIDE_STATIONS = [
    { name: "Vancouver", id: "7795", lat: 49.2867, lon: -123.1194 },
    { name: "Tsawwassen", id: "7822", lat: 49.0064, lon: -123.1310 },
    { name: "Victoria", id: "7120", lat: 48.4240, lon: -123.3650 },
    { name: "Nanaimo", id: "7818", lat: 49.1760, lon: -123.9450 },
    { name: "Campbell River", id: "7826", lat: 50.0430, lon: -125.2420 },
    { name: "Prince Rupert", id: "7854", lat: 54.3100, lon: -130.3250 },
    { name: "Point Atkinson", id: "7795", lat: 49.3380, lon: -123.2630 },
    { name: "Halfmoon Bay", id: "7810", lat: 49.5930, lon: -124.0150 },
    { name: "Squamish", id: "7813", lat: 49.6980, lon: -123.1590 },
    { name: "Patricia Bay", id: "7817", lat: 48.6540, lon: -123.4520 },
    { name: "Buckley Bay", id: "7820", lat: 49.5130, lon: -124.8310 },
    { name: "Tofino", id: "7811", lat: 49.1510, lon: -125.9100 },
    { name: "Port Hardy", id: "7827", lat: 50.7230, lon: -127.4250 },
    { name: "Comox", id: "7824", lat: 49.6680, lon: -124.9300 },
];

async function loadTides() {
    if (tidesLoaded) return;
    tidesLoaded = true;

    const markers = [];
    const today = new Date().toISOString().split('T')[0];

    for (const station of TIDE_STATIONS) {
        const marker = L.circleMarker([station.lat, station.lon], {
            radius: 7, fillColor: '#06b6d4', fillOpacity: 0.85, color: '#0891b2', weight: 2
        });
        marker.bindPopup(`<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Loading tide data...</div></div>`, { maxWidth: 300 });

        marker.on('click', async () => {
            if (marker._tidesLoaded) return;
            marker._tidesLoaded = true;
            try {
                const url = `${DFO_API}/stations/${station.id}/data?time-range-code=1`;
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    const todayData = data.filter(d => d.eventDate?.startsWith(today));
                    const values = todayData.map(d => d.value).filter(Boolean);
                    const maxVal = Math.max(...values);
                    const minVal = Math.min(...values);

                    let tableRows = '';
                    for (const entry of todayData) {
                        const time = new Date(entry.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const v = entry.value;
                        const icon = v === maxVal ? '🔴 High' : v === minVal ? '🟢 Low' : '';
                        tableRows += `<tr><td>${time}</td><td><b>${v.toFixed(2)}m</b></td><td>${icon}</td></tr>`;
                    }

                    const now = new Date();
                    const nextEntries = todayData.filter(d => new Date(d.eventDate) > now).slice(0, 3);
                    let nextHTML = '';
                    if (nextEntries.length) {
                        nextHTML = '<div style="margin-top:0.4rem;font-size:0.7rem;color:#0891b2">Coming up:</div>';
                        for (const e of nextEntries) {
                            const t = new Date(e.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            nextHTML += `<div style="font-size:0.72rem">${t} — <b>${e.value.toFixed(2)}m</b> ${e.value === maxVal ? '🔴' : ''}</div>`;
                        }
                    }

                    marker.setPopupContent(`
                        <div class="tide-popup">
                            <h3>🔄 ${station.name}</h3>
                            <div class="detail">${today} · Station ${station.id}</div>
                            <div style="margin:0.4rem 0;font-size:0.75rem">
                                <span style="color:#dc2626">🔴 High: ${maxVal.toFixed(2)}m</span> ·
                                <span style="color:#16a34a">🟢 Low: ${minVal.toFixed(2)}m</span>
                            </div>
                            ${nextHTML}
                            <table class="tide-table">
                                <tr><th>Time</th><th>Height</th><th></th></tr>
                                ${tableRows || '<tr><td colspan="3">No data today</td></tr>'}
                            </table>
                            <div class="detail" style="margin-top:0.3rem">Source: Fisheries & Oceans Canada</div>
                        </div>
                    `);
                } else {
                    marker.setPopupContent(`<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Tide data unavailable</div></div>`);
                }
            } catch {
                marker.setPopupContent(`<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Could not load tide data</div></div>`);
            }
        });
        markers.push(marker);
    }
    tidesLayer = L.layerGroup(markers);
}

// ─── Layer Controls ───

const layerPanel = document.getElementById('layerPanel');
const layerToggleBtn = document.getElementById('layerToggleBtn');

layerToggleBtn.addEventListener('click', () => {
    layerPanel.classList.remove('hidden');
    layerToggleBtn.classList.add('hidden');
});
document.getElementById('layerPanelClose').addEventListener('click', () => {
    layerPanel.classList.add('hidden');
    layerToggleBtn.classList.remove('hidden');
});

document.getElementById('layerSeamarks').addEventListener('change', (e) => {
    e.target.checked ? seamarksLayer.addTo(map) : map.removeLayer(seamarksLayer);
});
document.getElementById('layerDepth').addEventListener('change', (e) => {
    e.target.checked ? depthLayer.addTo(map) : map.removeLayer(depthLayer);
});
document.getElementById('layerFerries').addEventListener('change', (e) => {
    e.target.checked ? ferryGroup.addTo(map) : map.removeLayer(ferryGroup);
});
document.getElementById('layerMarinas').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await loadMarinas();
        if (marinasLayer) marinasLayer.addTo(map);
    } else {
        if (marinasLayer) map.removeLayer(marinasLayer);
    }
});
document.getElementById('layerTides').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await loadTides();
        if (tidesLayer) tidesLayer.addTo(map);
    } else {
        if (tidesLayer) map.removeLayer(tidesLayer);
    }
});
document.getElementById('layerLighthouses').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await loadLighthouses();
        if (lighthousesLayer) lighthousesLayer.addTo(map);
    } else {
        if (lighthousesLayer) map.removeLayer(lighthousesLayer);
    }
});
document.getElementById('layerCoastalPois').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await loadCoastalPois();
        if (coastalPoisLayer) coastalPoisLayer.addTo(map);
    } else {
        if (coastalPoisLayer) map.removeLayer(coastalPoisLayer);
    }
});
document.getElementById('layerTrails').addEventListener('change', async (e) => {
    if (e.target.checked) {
        await loadCoastalTrails();
        if (trailsLayer) trailsLayer.addTo(map);
    } else {
        if (trailsLayer) map.removeLayer(trailsLayer);
    }
});
