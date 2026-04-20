// OGS Sea — Nautical Chart Application
// OpenSeaMap + BC Ferries + Tides + Marinas

const map = L.map('map', {
    center: [49.3, -123.3],
    zoom: 9,
    zoomControl: true
});

// Base map — dark OSM
const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
    maxZoom: 18,
    attribution: ''
});

// BC Ferries routes (hardcoded major routes)
const ferryRoutes = {
    "Tsawwassen → Swartz Bay": {
        color: '#3b82f6',
        coords: [[49.0064, -123.1310], [49.0215, -123.1520], [49.0420, -123.1750], [49.0580, -123.2100], [49.0750, -123.2500], [49.0850, -123.2900], [49.0820, -123.3200], [49.0770, -123.3550], [49.0600, -123.3850], [49.0500, -123.4100], [49.0350, -123.4300], [49.0180, -123.4400], [49.0090, -123.4550], [48.9950, -123.4700], [48.9800, -123.4800], [48.9650, -123.4900], [48.9510, -123.5000], [48.9380, -123.5100], [48.9240, -123.5200], [48.9090, -123.5300], [48.8950, -123.5400], [48.8810, -123.5500], [48.8660, -123.5600], [48.8520, -123.5650], [48.8380, -123.5720], [48.8240, -123.5780], [48.8100, -123.5850], [48.7960, -123.5900], [48.7820, -123.5950], [48.7680, -123.5980], [48.7540, -123.6000], [48.7430, -123.5950], [48.7320, -123.5850], [48.7200, -123.5700], [48.7100, -123.5550], [48.7000, -123.5400], [48.6900, -123.5250], [48.6850, -123.5100], [48.6820, -123.4950], [48.6800, -123.4800], [48.6780, -123.4650], [48.6750, -123.4400]]
    },
    "Horseshoe Bay → Departure Bay": {
        color: '#10b981',
        coords: [[49.3740, -123.2730], [49.3780, -123.2850], [49.3850, -123.3100], [49.3950, -123.3400], [49.4050, -123.3700], [49.4100, -123.4000], [49.4150, -123.4300], [49.4180, -123.4600], [49.4200, -123.4900], [49.4180, -123.5100], [49.4150, -123.5200], [49.4100, -123.5300], [49.4050, -123.5350], [49.3950, -123.5400], [49.3850, -123.5420], [49.3700, -123.5450], [49.3550, -123.5480], [49.3400, -123.5460], [49.3250, -123.5400], [49.3150, -123.5300], [49.3050, -123.5200], [49.2980, -123.5100], [49.2920, -123.5000], [49.2880, -123.4900], [49.2830, -123.4800], [49.2790, -123.4700], [49.2750, -123.4600], [49.2700, -123.4500], [49.2660, -123.4400], [49.2600, -123.4320], [49.2500, -123.4280], [49.2400, -123.4250], [49.2300, -123.4200], [49.2200, -123.4150], [49.2100, -123.4100], [49.2050, -123.4000], [49.2000, -123.3900], [49.1950, -123.3800], [49.1900, -123.3700], [49.1850, -123.3650], [49.1800, -123.3600], [49.1760, -123.3580]]
    },
    "Tsawwassen → Duke Point": {
        color: '#f59e0b',
        coords: [[49.0064, -123.1310], [49.0100, -123.1400], [49.0200, -123.1600], [49.0350, -123.1800], [49.0450, -123.1900], [49.0550, -123.2000], [49.0600, -123.2100], [49.0550, -123.2250], [49.0450, -123.2400], [49.0300, -123.2600], [49.0150, -123.2800], [49.0000, -123.3000], [48.9850, -123.3200], [48.9700, -123.3400], [48.9550, -123.3600], [48.9400, -123.3700], [48.9250, -123.3750], [48.9100, -123.3780], [48.9000, -123.3800], [48.8900, -123.3850], [48.8800, -123.3920], [48.8700, -123.4000], [48.8600, -123.4100], [48.8500, -123.4180], [48.8400, -123.4250], [48.8300, -123.4300], [48.8200, -123.4350], [48.8100, -123.4400], [48.8000, -123.4450], [48.7900, -123.4500], [48.7800, -123.4550], [48.7700, -123.4600], [48.7600, -123.4620], [48.7500, -123.4650], [48.7400, -123.4700], [48.7300, -123.4750], [48.7200, -123.4780], [48.7100, -123.4800], [48.7000, -123.4820], [48.6900, -123.4850]]
    }
};

const ferryLayers = {};
for (const [name, route] of Object.entries(ferryRoutes)) {
    ferryLayers[name] = L.polyline(route.coords, {
        color: route.color,
        weight: 3,
        opacity: 0.8,
        dashArray: '8 4'
    }).addTo(map).bindPopup(`<b>${name}</b><br><span style="color:${route.color}">BC Ferries route</span>`);
}

// Ferry route group
const ferriesGroup = L.layerGroup(Object.values(ferryLayers));

// Marina/harbour markers (loaded on toggle)
let marinasLayer = null;
let marinasLoaded = false;

async function loadMarinas() {
    if (marinasLoaded) return;
    marinasLoaded = true;

    // Overpass API query for marinas and harbours in BC coastal area
    const query = `
        [out:json][timeout:25];
        (
          node["seamark:type"="harbour"](47,-130,51,-122);
          node["seamark:type"="marina"](47,-130,51,-122);
          node["harbour"="marina"](47,-130,51,-122);
          way["seamark:type"="harbour"](47,-130,51,-122);
          way["seamark:type"="marina"](47,-130,51,-122);
          node["amenity"="marina"](47,-130,51,-122);
          way["amenity"="marina"](47,-130,51,-122);
        );
        out center;
    `;

    try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: 'data=' + encodeURIComponent(query)
        });
        const data = await res.json();

        const markers = [];
        for (const el of data.elements) {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) continue;

            const name = el.tags?.name || el.tags?.['seamark:name'] || 'Marina';
            const type = el.tags?.['seamark:type'] || el.tags?.amenity || 'harbour';
            const website = el.tags?.website;
            const phone = el.tags?.phone;

            const marker = L.circleMarker([lat, lon], {
                radius: 5,
                fillColor: '#f59e0b',
                fillOpacity: 0.8,
                color: '#f59e0b',
                weight: 1
            }).bindPopup(`
                <div class="marina-popup">
                    <h3>⛵ ${name}</h3>
                    <div class="detail">${type}</div>
                    ${phone ? `<div class="detail">📞 ${phone}</div>` : ''}
                    ${website ? `<div class="detail"><a href="${website}" target="_blank" rel="noopener">${website}</a></div>` : ''}
                </div>
            `);
            markers.push(marker);
        }

        marinasLayer = L.layerGroup(markers);
    } catch (err) {
        console.error('Failed to load marinas:', err);
    }
}

// Tide stations
let tidesLayer = null;
let tidesLoaded = false;

const TIDE_STATIONS = [
    { name: "Vancouver", id: "7795", lat: 49.2867, lon: -123.1194 },
    { name: "Tsawwassen", id: "7822", lat: 49.0064, lon: -123.1310 },
    { name: "Victoria", id: "7120", lat: 48.4240, lon: -123.3650 },
    { name: "Nanaimo", id: "7818", lat: 49.1760, lon: -123.9450 },
    { name: "Campbell River", id: "7826", lat: 50.0430, lon: -125.2420 },
    { name: "Prince Rupert", id: "7854", lat: 54.3100, lon: -130.3250 },
    { name: "SW Vancouver", id: "7814", lat: 49.3380, lon: -123.3040 },
    { name: "Point Atkinson", id: "7795", lat: 49.3380, lon: -123.2630 },
    { name: "Halfmoon Bay", id: "7810", lat: 49.5930, lon: -124.0150 },
    { name: "Squamish", id: "7813", lat: 49.6980, lon: -123.1590 },
    { name: "Patricia Bay", id: "7817", lat: 48.6540, lon: -123.4520 },
    { name: "Buckley Bay", id: "7820", lat: 49.5130, lon: -124.8310 },
    { name: "Tofino", id: "7811", lat: 49.1510, lon: -125.9100 },
];

async function loadTides() {
    if (tidesLoaded) return;
    tidesLoaded = true;

    const markers = [];

    for (const station of TIDE_STATIONS) {
        const marker = L.circleMarker([station.lat, station.lon], {
            radius: 6,
            fillColor: '#06b6d4',
            fillOpacity: 0.8,
            color: '#06b6d4',
            weight: 2
        });

        // Try to fetch tide predictions from DFO
        let popupContent = `<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Tide station ${station.id}</div><div class="detail" style="margin-top:0.4rem">Loading tide data...</div></div>`;
        marker.bindPopup(popupContent, { maxWidth: 300 });

        marker.on('click', async () => {
            if (!marker._tidesLoaded) {
                try {
                    // DFO_WS tide prediction API
                    const url = `https://api-iwls.dfo-mpo.gc.ca/api/v1/stations/${station.id}/data?time-range-code=1`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        const today = new Date().toISOString().split('T')[0];
                        const todayData = data.filter(d => d.eventDate?.startsWith(today));
                        let tableRows = '';
                        for (const entry of todayData.slice(0, 8)) {
                            const time = new Date(entry.eventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const cls = entry.value > 2 ? 'tide-high' : 'tide-low';
                            tableRows += `<tr><td>${time}</td><td class="${cls}">${entry.value.toFixed(1)}m</td><td>${entry.predicted ? '⚡' : ''}</td></tr>`;
                        }
                        const newContent = `
                            <div class="tide-popup">
                                <h3>🔄 ${station.name}</h3>
                                <table class="tide-table">
                                    <tr><th>Time</th><th>Height</th><th></th></tr>
                                    ${tableRows || '<tr><td colspan="3">No data today</td></tr>'}
                                </table>
                                <div class="detail" style="margin-top:0.4rem">Source: DFO Canada</div>
                            </div>`;
                        marker.setPopupContent(newContent);
                    } else {
                        marker.setPopupContent(`<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Tide data unavailable</div></div>`);
                    }
                } catch {
                    marker.setPopupContent(`<div class="tide-popup"><h3>🔄 ${station.name}</h3><div class="detail">Could not load tide data</div></div>`);
                }
                marker._tidesLoaded = true;
            }
        });

        markers.push(marker);
    }

    tidesLayer = L.layerGroup(markers);
}

// Layer toggles
const layerPanel = document.getElementById('layerPanel');
const layerToggleBtn = document.getElementById('layerToggleBtn');

layerToggleBtn.addEventListener('click', () => {
    layerPanel.classList.toggle('hidden');
    layerToggleBtn.classList.toggle('hidden');
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
    e.target.checked ? ferriesGroup.addTo(map) : map.removeLayer(ferriesGroup);
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
