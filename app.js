const map = L.map('map', {
    zoomControl: false
}).setView([54.69, -1.2], 10);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

const polyline = L.polyline([], {
    color: '#2b6ea3',
    weight: 3,
    opacity: 0.9
}).addTo(map);

let waypoints = [];
let arrowMarkers = [];
let windBarbMarkers = [];
let legSegments = [];
let generatedWaypointMarkers = [];
let currentLegData = [];
let selectedLegIndex = -1;
let selectedWaypointIndex = -1;

let perLegWind = {};
let perLegTide = {};

let activeConditionEditor = {
    key: null,
    kind: null
};

let routeEditingEnabled = false;

const defaults = {
    windDir: 180,
    windSpeed: 15,
    tideDir: 0,
    tideSpeed: 1,
    startLocation: '',
    destination: ''
};

const MAX_LEG_HOURS = 1;

const windPerformanceBands = [
    { min: 0, max: 6, upwind: [3.0, 4.0], reaching: [3.5, 4.5] },
    { min: 7, max: 10, upwind: [4.5, 5.5], reaching: [5.0, 6.0] },
    { min: 11, max: 16, upwind: [5.5, 6.5], reaching: [6.0, 7.5] },
    { min: 17, max: 21, upwind: [6.0, 7.0], reaching: [7.0, 8.5] },
    { min: 22, max: 27, upwind: [6.0, 7.5], reaching: [7.5, 9.0] },
    { min: 28, max: Infinity, upwind: [6.0, 7.3], reaching: [7.3, 8.8] }
];

const drawer = document.getElementById('drawer');
const drawerHandle = document.getElementById('drawerHandle');
const settingsDrawerHandle = document.getElementById('settingsDrawerHandle');
const settingsDrawer = document.getElementById('settingsDrawer');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const settingsDrawerClose = document.getElementById('settingsDrawerClose');
const offlineStatus = document.getElementById('offlineStatus');
const launchSplash = document.getElementById('launchSplash');

const boatSpeedInput = document.getElementById('boatSpeed');
const defaultWindDirInput = document.getElementById('defaultWindDir');
const defaultWindSpeedInput = document.getElementById('defaultWindSpeed');
const defaultTideDirInput = document.getElementById('defaultTideDir');
const defaultTideSpeedInput = document.getElementById('defaultTideSpeed');
const startLocationInput = document.getElementById('startLocation');
const destinationInput = document.getElementById('destination');
const autoSplitLegsInput = document.getElementById('autoSplitLegs');
const locateBtn = document.getElementById('locateBtn');
const actionMenuBtn = document.getElementById('actionMenuBtn');
const actionMenu = document.getElementById('actionMenu');
const actionMenuCurrentLocation = document.getElementById('actionMenuCurrentLocation');
const actionMenuLiveWind = document.getElementById('actionMenuLiveWind');
const actionMenuLiveTide = document.getElementById('actionMenuLiveTide');
const actionMenuSaveRoute = document.getElementById('actionMenuSaveRoute');
const actionMenuLoadRoute = document.getElementById('actionMenuLoadRoute');
const liveWindStatus = document.getElementById('liveWindStatus');
const liveTideStatus = document.getElementById('liveTideStatus');
const liveTideSetupBtn = document.getElementById('liveTideSetupBtn');
const liveTideKeyCard = document.getElementById('liveTideKeyCard');
const stormglassApiKeyInput = document.getElementById('stormglassApiKey');
const saveStormglassKeyBtn = document.getElementById('saveStormglassKeyBtn');
const clearStormglassKeyBtn = document.getElementById('clearStormglassKeyBtn');
const toastMessage = document.getElementById('toastMessage');
const liveTideKeyStatus = document.getElementById('liveTideKeyStatus');
const legEditorBackdrop = document.getElementById('legEditorBackdrop');
const legEditorSheet = document.getElementById('legEditorSheet');
const legEditorClose = document.getElementById('legEditorClose');
const legEditorCancel = document.getElementById('legEditorCancel');
const legEditorApply = document.getElementById('legEditorApply');
const legEditorBody = document.getElementById('legEditorBody');
const legEditorTitle = document.getElementById('legEditorTitle');
const legEditorSubtitle = document.getElementById('legEditorSubtitle');
const savedRoutesBackdrop = document.getElementById('savedRoutesBackdrop');
const savedRoutesModal = document.getElementById('savedRoutesModal');
const savedRoutesList = document.getElementById('savedRoutesList');
const savedRoutesClose = document.getElementById('savedRoutesClose');
const routeEditToggleBtn = document.getElementById('routeEditToggleBtn');
const deleteWaypointBtn = document.getElementById('deleteWaypointBtn');
const routeEditStatus = document.getElementById('routeEditStatus');

const mapInfoCard = document.getElementById('mapInfoCard');
const mapInfoContent = document.getElementById('mapInfoContent');
const mapInfoClose = document.getElementById('mapInfoClose');

const topRouteTitle = document.getElementById('topRouteTitle');
const topRouteSubtitle = document.getElementById('topRouteSubtitle');
const topRouteInlineStats = document.getElementById('topRouteInlineStats');
const topRouteDistance = document.getElementById('topRouteDistance');
const topRouteDuration = document.getElementById('topRouteDuration');
const routeWorkspaceLabel = document.getElementById('routeWorkspaceLabel');
const routeWorkspaceNote = document.getElementById('routeWorkspaceNote');
const routeModeBadge = document.getElementById('routeModeBadge');
const selectedLegCard = document.getElementById('selectedLegCard');
const selectedLegCardContent = document.getElementById('selectedLegCardContent');
const routePreviewCard = document.getElementById('routePreviewCard');
const routePreviewContent = document.getElementById('routePreviewContent');
const topRouteBar = document.getElementById('topRouteBar');

let windInputSource = 'manual';
let tideInputSource = 'manual';

function syncHeaderInset() {
    const root = document.documentElement;
    const isCompact = window.innerWidth <= 560;
    const baseGap = isCompact ? 6 : (window.innerWidth <= 860 ? 10 : 14);
    let safeLeft = baseGap;
    let badgeLeft = baseGap;

    if (settingsDrawer) {
        const drawerOpen = !settingsDrawer.classList.contains('hidden');

        if (drawerOpen) {
            const rect = settingsDrawer.getBoundingClientRect();
            const visibleRight = Math.max(0, Math.round(rect.right));
            safeLeft = Math.max(baseGap, visibleRight + baseGap);
            badgeLeft = safeLeft;
        } else if (!isCompact) {
            const handle = settingsDrawer.querySelector('.settings-drawer-handle');
            if (handle) {
                const handleRect = handle.getBoundingClientRect();
                const handleRight = Math.max(0, Math.round(handleRect.right));
                safeLeft = Math.max(baseGap, handleRight + baseGap);
                badgeLeft = safeLeft;
            }
        }
    }

    root.style.setProperty('--top-route-left', `${safeLeft}px`);
    root.style.setProperty('--route-badge-left', `${badgeLeft}px`);
}

function getDrawerTopClearance() {
    if (!topRouteBar) return 112;
    const rect = topRouteBar.getBoundingClientRect();
    return Math.max(112, Math.ceil(rect.bottom) + 10);
}

const drawerSnapHeights = {
    collapsed: 34,
    middle: () => Math.round(window.innerHeight * 0.46),
    expanded: () => {
        const maxAvailable = window.innerHeight - getDrawerTopClearance();
        return Math.max(240, Math.round(maxAvailable));
    }
};

let drawerStateOrder = ['collapsed', 'middle', 'expanded'];
let drawerStateIndex = 1;
let drawerDragging = false;
let autoSplitLegsEnabled = autoSplitLegsInput ? autoSplitLegsInput.checked : true;
let splashDismissed = false;

const STORMGLASS_API_KEY_STORAGE = 'sailingPlannerStormglassApiKey';
const SAVED_ROUTE_STORAGE = 'sailingPlannerSavedRoute';
const SAVED_ROUTES_STORAGE = 'sailingPlannerSavedRoutes';
let expandedFamilySource = null;
let waypointWarnings = {};
let legWarnings = {};
let waterCheckCache = new Map();
let landWarningRequestId = 0;
let lastCompletedLandWarningRouteKey = '';

function toRad(d) {
    return d * Math.PI / 180;
}

function toDeg(r) {
    return r * 180 / Math.PI;
}

function distance(lat1, lon1, lat2, lon2) {
    const R = 3440;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function bearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.cos(toRad(lon2 - lon1));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 9 * 60;
    const [h, m] = timeStr.split(':').map(v => parseInt(v, 10) || 0);
    return h * 60 + m;
}

function minutesToTimeString(totalMinutes) {
    totalMinutes = Math.round(totalMinutes);
    totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDurationHours(hours) {
    if (!isFinite(hours) || hours <= 0) return '0m';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h <= 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
}

function interpolateLatLng(a, b, t) {
    return L.latLng(
        a.lat + (b.lat - a.lat) * t,
        a.lng + (b.lng - a.lng) * t
    );
}

function alphaLabel(n) {
    let result = '';
    let num = n;
    while (num > 0) {
        num--;
        result = String.fromCharCode(97 + (num % 26)) + result;
        num = Math.floor(num / 26);
    }
    return result;
}

function makeLegKey(sourceSegmentIndex, chunkIndex) {
    return `${sourceSegmentIndex}:${chunkIndex}`;
}

function getDisplayLegLabel(sourceSegmentIndex, chunkIndex) {
    return chunkIndex === 0
        ? `${sourceSegmentIndex + 1}`
        : `${sourceSegmentIndex + 1}${alphaLabel(chunkIndex)}`;
}

function waypointIcon(n, selected = false, linked = false) {
    return L.divIcon({
        className: '',
        html: `<div class="waypoint-marker${selected ? ' selected' : ''}${linked ? ' linked' : ''}">${n}</div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
}

function generatedWaypointIcon(label, selected = false, linked = false) {
    return L.divIcon({
        className: '',
        html: `<div class="auto-waypoint-marker${selected ? ' selected' : ''}${linked ? ' linked' : ''}">${label}</div>`,
        iconSize: [24, 18],
        iconAnchor: [12, 9]
    });
}

function updateOnlineStatus() {
    const online = navigator.onLine;
    document.body.classList.toggle('offline-mode', !online);
    document.body.classList.toggle('online-mode', online);

    if (!offlineStatus) return;
    offlineStatus.textContent = '';
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });

    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js');

            const promptWorkerToActivate = (worker) => {
                if (!worker) return;
                worker.postMessage({ type: 'SKIP_WAITING' });
            };

            if (registration.waiting) {
                promptWorkerToActivate(registration.waiting);
            }

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        promptWorkerToActivate(newWorker);
                    }
                });
            });

            window.setTimeout(() => {
                registration.update().catch(() => {});
            }, 3000);

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    registration.update().catch(() => {});
                }
            });
        } catch (err) {
            console.warn('Service worker registration failed:', err);
        }
    });
}

function dismissLaunchSplash() {
    if (!launchSplash || splashDismissed) return;
    splashDismissed = true;
    launchSplash.classList.add('hidden');
    document.body.classList.add('map-ready');
}

function initLaunchSplash() {
    if (!launchSplash) {
        document.body.classList.add('map-ready');
        return;
    }

    setTimeout(() => {
        launchSplash.classList.add('animate');
    }, 1200);

    setTimeout(() => {
        dismissLaunchSplash();
    }, 2600);

    launchSplash.addEventListener('click', dismissLaunchSplash);
    launchSplash.addEventListener('touchstart', dismissLaunchSplash, { passive: true });
}

function getSnapHeight(name) {
    if (name === 'collapsed') return drawerSnapHeights.collapsed;
    if (name === 'middle') return drawerSnapHeights.middle();
    return drawerSnapHeights.expanded();
}

function applyDrawerMode(heightPx) {
    if (!drawer) return;
    const collapsedThreshold = drawerSnapHeights.collapsed + 2;
    drawer.classList.toggle('collapsed', heightPx <= collapsedThreshold);
}

function updateDrawerStateIndexFromHeight(heightPx) {
    const collapsed = getSnapHeight('collapsed');
    const middle = getSnapHeight('middle');
    const expanded = getSnapHeight('expanded');

    const distances = [
        Math.abs(heightPx - collapsed),
        Math.abs(heightPx - middle),
        Math.abs(heightPx - expanded)
    ];

    let minIdx = 0;
    for (let i = 1; i < distances.length; i++) {
        if (distances[i] < distances[minIdx]) minIdx = i;
    }
    drawerStateIndex = minIdx;
}

function setDrawerHeight(heightPx, snap = false) {
    if (!drawer) return;
    const minHeight = drawerSnapHeights.collapsed;
    const maxHeight = Math.max(minHeight, window.innerHeight - getDrawerTopClearance());
    const clamped = Math.max(minHeight, Math.min(heightPx, maxHeight));
    drawer.style.height = `${clamped}px`;
    applyDrawerMode(clamped);
    if (snap) updateDrawerStateIndexFromHeight(clamped);
    syncSettingsDrawerPosition();
    map.invalidateSize();
}

function snapDrawerToNearest(heightPx) {
    const options = [
        getSnapHeight('collapsed'),
        getSnapHeight('middle'),
        getSnapHeight('expanded')
    ];

    let nearest = options[0];
    let minDist = Math.abs(heightPx - nearest);

    for (let i = 1; i < options.length; i++) {
        const d = Math.abs(heightPx - options[i]);
        if (d < minDist) {
            minDist = d;
            nearest = options[i];
        }
    }

    setDrawerHeight(nearest, true);
}

function activateTab(tabId) {
    document.querySelectorAll('.summary-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    document.querySelectorAll('#drawerContent > .drawer-panel').forEach(panel => {
        panel.classList.toggle('active', panel.id === tabId);
    });
}

function openSettingsDrawer() {
    if (!settingsDrawer || !settingsBackdrop) return;

    const collapsedBottom = Math.max(44, getSnapHeight('collapsed') + 8);
    settingsDrawer.style.bottom = `${collapsedBottom}px`;

    if (drawer) {
        drawerStateIndex = 0;
        setDrawerHeight(getSnapHeight('collapsed'), true);
    }

    closeActionMenu();
    settingsDrawer.classList.remove('hidden');
    settingsBackdrop.classList.remove('hidden');
    settingsDrawer.setAttribute('aria-hidden', 'false');
    settingsBackdrop.setAttribute('aria-hidden', 'false');

    requestAnimationFrame(() => {
        syncSettingsDrawerPosition(collapsedBottom);
        syncHeaderInset();
        setTimeout(() => {
            syncSettingsDrawerPosition(collapsedBottom);
            syncHeaderInset();
        }, 220);
    });
}


function closeSettingsDrawer() {
    if (!settingsDrawer || !settingsBackdrop) return;
    settingsDrawer.classList.add('hidden');
    settingsBackdrop.classList.add('hidden');
    settingsDrawer.setAttribute('aria-hidden', 'true');
    settingsBackdrop.setAttribute('aria-hidden', 'true');
    syncSettingsDrawerPosition();
    syncHeaderInset();
    setTimeout(syncHeaderInset, 220);
}



function syncSettingsDrawerPosition(fallbackBottom = null) {
    if (!settingsDrawer) return;
    const drawerHeight = drawer ? Math.round(drawer.getBoundingClientRect().height) : 34;
    const measuredBottom = Math.max(44, drawerHeight + 8);
    const safeBottom = Math.max(measuredBottom, fallbackBottom || 0);
    settingsDrawer.style.bottom = `${safeBottom}px`;
    syncHeaderInset();
}

function getStormglassApiKey() {
    try {
        return localStorage.getItem(STORMGLASS_API_KEY_STORAGE) || '';
    } catch (err) {
        return '';
    }
}

function setStormglassApiKey(value) {
    try {
        if (!value) localStorage.removeItem(STORMGLASS_API_KEY_STORAGE);
        else localStorage.setItem(STORMGLASS_API_KEY_STORAGE, value);
    } catch (err) {
        console.warn('Unable to store Stormglass API key:', err);
    }
}

function updateLiveTideKeyUI(message = '') {
    const savedKey = getStormglassApiKey();
    if (stormglassApiKeyInput && document.activeElement !== stormglassApiKeyInput) {
        stormglassApiKeyInput.value = savedKey;
    }
    if (liveTideKeyStatus) {
        liveTideKeyStatus.textContent = message || (savedKey
            ? 'Stormglass API key saved. Live Tide can now fetch marine current data.'
            : 'No Stormglass API key saved.');
    }
}

function revealLiveTideKeyCard(message = '', focusInput = true) {
    openSettingsDrawer();
    if (liveTideKeyCard) liveTideKeyCard.classList.remove('hidden');
    updateLiveTideKeyUI(message);
    if (liveTideKeyCard) {
        liveTideKeyCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    if (focusInput && stormglassApiKeyInput) {
        requestAnimationFrame(() => {
            stormglassApiKeyInput.focus();
            stormglassApiKeyInput.select();
        });
    }
}

let toastTimer = null;


function createWaypointMarker(latlng) {
    const marker = L.marker(latlng, {
        draggable: true,
        icon: waypointIcon(waypoints.length + 1, false, false),
        zIndexOffset: 1300
    }).addTo(map);

    let dragMoved = false;

    marker.on('dragstart', function () {
        dragMoved = false;
        hideMapInfo();
        selectedLegIndex = -1;
    });

    marker.on('drag', function () {
        dragMoved = true;
    });

    marker.on('dragend', function () {
        const idx = waypoints.indexOf(marker);
        selectedWaypointIndex = idx;
        selectedLegIndex = -1;
        clearActiveConditionEditor();
        updateRoute();
        setTimeout(() => {
            dragMoved = false;
        }, 0);
    });

    marker.on('click', function () {
        if (dragMoved) return;
        const idx = waypoints.indexOf(marker);
        selectWaypoint(idx, marker.getLatLng());
    });

    marker.on('add', function () {
        const el = marker.getElement();
        if (el) {
            el.addEventListener('contextmenu', function (ev) {
                ev.preventDefault();
            });
        }
    });

    return marker;
}


function showToast(message) {
    if (!toastMessage) return;
    toastMessage.textContent = message;
    toastMessage.classList.remove('hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toastMessage.classList.add('hidden');
    }, 2200);
}


function buildRouteSnapshot() {
    return {
        savedAt: new Date().toISOString(),
        waypoints: waypoints.map(marker => {
            const latlng = marker.getLatLng();
            return { lat: latlng.lat, lng: latlng.lng };
        }),
        perLegWind,
        perLegTide,
        defaults: {
            ...defaults,
            windDir: Number(defaultWindDirInput?.value ?? defaults.windDir),
            windSpeed: Number(defaultWindSpeedInput?.value ?? defaults.windSpeed),
            tideDir: Number(defaultTideDirInput?.value ?? defaults.tideDir),
            tideSpeed: Number(defaultTideSpeedInput?.value ?? defaults.tideSpeed),
            startLocation: startLocationInput?.value || '',
            destination: destinationInput?.value || ''
        },
        boatSpeed: Number(boatSpeedInput?.value || 5),
        autoSplitLegsEnabled: !!autoSplitLegsInput?.checked
    };
}

function getDefaultRouteName() {
    const from = (startLocationInput?.value || defaults.startLocation || '').trim();
    const to = (destinationInput?.value || defaults.destination || '').trim();
    if (from && to) return `${from} → ${to}`;
    if (from) return `${from} route`;
    if (to) return `Route to ${to}`;
    const now = new Date();
    return `Route ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getSavedRoutes() {
    try {
        const raw = localStorage.getItem(SAVED_ROUTES_STORAGE);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
        const legacyRaw = localStorage.getItem(SAVED_ROUTE_STORAGE);
        if (legacyRaw) {
            const legacyParsed = JSON.parse(legacyRaw);
            return [{
                id: `legacy-${Date.now()}`,
                name: getDefaultRouteName(),
                savedAt: legacyParsed.savedAt || new Date().toISOString(),
                snapshot: legacyParsed
            }];
        }
    } catch (err) {
        console.warn('Unable to read saved routes:', err);
    }
    return [];
}

function setSavedRoutes(routes) {
    try {
        localStorage.setItem(SAVED_ROUTES_STORAGE, JSON.stringify(routes));
    } catch (err) {
        console.warn('Unable to store saved routes:', err);
        throw err;
    }
}

function saveCurrentRoute() {
    if (!waypoints.length) {
        closeActionMenu();
        showToast('Add at least one waypoint first.');
        return;
    }

    const suggestedName = getDefaultRouteName();
    const enteredName = window.prompt('Save route as:', suggestedName);
    if (enteredName === null) {
        closeActionMenu();
        return;
    }

    const routeName = enteredName.trim() || suggestedName;
    const routeSnapshot = buildRouteSnapshot();
    const routes = getSavedRoutes();

    routes.unshift({
        id: `route-${Date.now()}`,
        name: routeName,
        savedAt: routeSnapshot.savedAt,
        snapshot: routeSnapshot
    });

    try {
        setSavedRoutes(routes.slice(0, 50));
        try { localStorage.removeItem(SAVED_ROUTE_STORAGE); } catch (err) {}
        closeActionMenu();
        showToast('Route saved on this device.');
    } catch (err) {
        showToast('Unable to save route here.');
    }
}

function applyRouteSnapshot(routeSnapshot) {
    waypoints.forEach(marker => map.removeLayer(marker));
    waypoints = [];
    selectedLegIndex = -1;
    selectedWaypointIndex = -1;
    expandedFamilySource = null;
    clearActiveConditionEditor();
    hideMapInfo();

    perLegWind = routeSnapshot.perLegWind || {};
    perLegTide = routeSnapshot.perLegTide || {};

    const savedDefaults = routeSnapshot.defaults || {};
    defaults.windDir = Number.isFinite(savedDefaults.windDir) ? savedDefaults.windDir : defaults.windDir;
    defaults.windSpeed = Number.isFinite(savedDefaults.windSpeed) ? savedDefaults.windSpeed : defaults.windSpeed;
    defaults.tideDir = Number.isFinite(savedDefaults.tideDir) ? savedDefaults.tideDir : defaults.tideDir;
    defaults.tideSpeed = Number.isFinite(savedDefaults.tideSpeed) ? savedDefaults.tideSpeed : defaults.tideSpeed;
    defaults.startLocation = savedDefaults.startLocation || '';
    defaults.destination = savedDefaults.destination || '';

    if (defaultWindDirInput) defaultWindDirInput.value = String(defaults.windDir);
    if (defaultWindSpeedInput) defaultWindSpeedInput.value = String(defaults.windSpeed);
    if (defaultTideDirInput) defaultTideDirInput.value = String(defaults.tideDir);
    if (defaultTideSpeedInput) defaultTideSpeedInput.value = String(defaults.tideSpeed);
    if (startLocationInput) startLocationInput.value = defaults.startLocation;
    if (destinationInput) destinationInput.value = defaults.destination;
    windInputSource = 'manual';
    tideInputSource = 'manual';

    const savedBoatSpeed = Number(routeSnapshot.boatSpeed);
    if (boatSpeedInput && Number.isFinite(savedBoatSpeed)) {
        boatSpeedInput.value = String(Math.max(1, Math.min(10, savedBoatSpeed)));
    }

    autoSplitLegsEnabled = !!routeSnapshot.autoSplitLegsEnabled;
    if (autoSplitLegsInput) autoSplitLegsInput.checked = autoSplitLegsEnabled;

    (routeSnapshot.waypoints || []).forEach(point => {
        if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return;
        const marker = createWaypointMarker(L.latLng(point.lat, point.lng));
        waypoints.push(marker);
    });

    updateRoute();
}

function openSavedRoutesModal() {
    if (!savedRoutesModal || !savedRoutesBackdrop || !savedRoutesList) return;
    const routes = getSavedRoutes();
    savedRoutesList.innerHTML = '';

    if (!routes.length) {
        savedRoutesList.innerHTML = '<div class="saved-route-empty">No saved routes on this device yet.</div>';
    } else {
        routes.forEach(route => {
            const item = document.createElement('div');
            item.className = 'saved-route-item';

            const savedAtText = route.savedAt
                ? new Date(route.savedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
                : '';

            item.innerHTML = `
                <div class="saved-route-name">${route.name || 'Saved Route'}</div>
                <div class="saved-route-meta">${savedAtText}</div>
                <div class="saved-route-actions">
                    <button class="saved-route-btn primary" type="button" data-load-route-id="${route.id}">Load</button>
                    <button class="saved-route-btn" type="button" data-delete-route-id="${route.id}">Delete</button>
                </div>
            `;
            savedRoutesList.appendChild(item);
        });
    }

    savedRoutesModal.classList.remove('hidden');
    savedRoutesBackdrop.classList.remove('hidden');
    savedRoutesModal.setAttribute('aria-hidden', 'false');
    savedRoutesBackdrop.setAttribute('aria-hidden', 'false');
}

function closeSavedRoutesModal() {
    if (!savedRoutesModal || !savedRoutesBackdrop) return;
    savedRoutesModal.classList.add('hidden');
    savedRoutesBackdrop.classList.add('hidden');
    savedRoutesModal.setAttribute('aria-hidden', 'true');
    savedRoutesBackdrop.setAttribute('aria-hidden', 'true');
}

function loadSavedRouteById(routeId) {
    const routes = getSavedRoutes();
    const entry = routes.find(route => route.id === routeId);
    if (!entry || !entry.snapshot) {
        showToast('Saved route could not be loaded.');
        return;
    }
    closeSavedRoutesModal();
    closeActionMenu();
    applyRouteSnapshot(entry.snapshot);
    showToast(`Loaded ${entry.name || 'saved route'}.`);
}

function deleteSavedRouteById(routeId) {
    const routes = getSavedRoutes().filter(route => route.id !== routeId);
    try {
        setSavedRoutes(routes);
        openSavedRoutesModal();
        showToast('Saved route removed.');
    } catch (err) {
        showToast('Unable to remove saved route.');
    }
}

function loadSavedRoute() {
    closeActionMenu();
    openSavedRoutesModal();
}

function closeActionMenu() {

    if (!actionMenu) return;
    actionMenu.classList.add('hidden');
    actionMenu.setAttribute('aria-hidden', 'true');
}

function toggleActionMenu() {
    if (!actionMenu) return;
    const willOpen = actionMenu.classList.contains('hidden');
    if (willOpen) {
        hideMapInfo();
        actionMenu.classList.remove('hidden');
        actionMenu.setAttribute('aria-hidden', 'false');
    } else {
        closeActionMenu();
    }
}

function useLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 12);
    });
}

function setInfoCardSideFromLatLng() {
    if (!mapInfoCard) return;
    mapInfoCard.classList.remove('left');
    mapInfoCard.classList.add('right');
}

function showMapInfo(latlng, html) {
    if (!mapInfoCard || !mapInfoContent) return;
    setInfoCardSideFromLatLng(latlng);
    mapInfoCard.classList.toggle('editing', typeof html === 'string' && html.includes('wind-popup-editor'));
    mapInfoContent.innerHTML = html;
    mapInfoCard.classList.add('hidden');
    void mapInfoCard.offsetWidth;
    mapInfoCard.classList.remove('hidden');
}

function hideMapInfo() {
    if (!mapInfoCard) return;
    mapInfoCard.classList.remove('editing');
    mapInfoCard.classList.add('hidden');
}

function getFamilyLegData(sourceSegmentIndex) {
    return currentLegData.filter(l => l.sourceSegmentIndex === sourceSegmentIndex);
}

function buildMapInfoActionsHtml(sourceSegmentIndex) {
    const canDeleteWaypoint = selectedWaypointIndex >= 0;
    return `
        <div class="wind-popup-actions">
            <button type="button" class="wind-popup-action-btn primary" onclick="openLegConditionEditorFromPopup(${sourceSegmentIndex}); event.stopPropagation();">Edit conditions</button>
            ${canDeleteWaypoint ? '<button type="button" class="wind-popup-action-btn" onclick="deleteWaypointFromPopup(event)">Delete</button>' : ''}
        </div>
    `;
}

function buildFamilyInfoHtml(sourceSegmentIndex) {
    const family = getFamilyLegData(sourceSegmentIndex);
    if (!family.length) return '<div class="wind-popup"><strong>Leg</strong></div>';

    const first = family[0];
    const legNumber = sourceSegmentIndex + 1;
    const endWaypoint = sourceSegmentIndex + 2;
    const statusLine = first.status ? `<div class="wind-popup-status">${first.status}</div>` : '';

    const warningsHtml = renderWarningsHtml(getFamilyWarnings(sourceSegmentIndex));
    const actionsHtml = buildMapInfoActionsHtml(sourceSegmentIndex);

    return `
        <div class="wind-popup compact">
            <strong>Leg ${legNumber}</strong>
            ${statusLine}
            <div class="wind-popup-line">Waypoint ${endWaypoint}: ${Math.round(first.track)}°</div>
            <div class="wind-popup-line">CTS: ${Math.round(first.cts)}°</div>
            <div class="wind-popup-line">Wind: ${Math.round(first.avgWindDir)}° @ ${first.avgWindSpeed.toFixed(1)} kt</div>
            <div class="wind-popup-line">Tide: ${Math.round(first.avgTideDir)}° @ ${first.avgTideSpeed.toFixed(1)} kt</div>
            ${warningsHtml}
            ${actionsHtml}
        </div>
    `;
}

function showQuickLegPopupForLeg(legIndex, latlng = null) {
    const leg = currentLegData[legIndex];
    if (!leg) return;

    const popupLatLng = latlng || interpolateLatLng(leg.start, leg.end, 0.5);
    showMapInfo(popupLatLng, buildFamilyInfoHtml(leg.sourceSegmentIndex));
}

function getPopupLatLngForSource(sourceSegmentIndex) {
    if (selectedWaypointIndex >= 0 && waypoints[selectedWaypointIndex]) {
        return waypoints[selectedWaypointIndex].getLatLng();
    }

    const firstLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    const leg = firstLegIndex >= 0 ? currentLegData[firstLegIndex] : null;
    if (leg) return interpolateLatLng(leg.start, leg.end, 0.5);
    if (waypoints[sourceSegmentIndex]) return waypoints[sourceSegmentIndex].getLatLng();
    return map.getCenter();
}

function buildPopupConditionEditorHtml(sourceSegmentIndex) {
    const firstLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    const leg = firstLegIndex >= 0 ? currentLegData[firstLegIndex] : null;
    if (!leg) return '<div class="wind-popup wind-popup-editor"><strong>Leg conditions</strong></div>';

    const warningsHtml = renderWarningsHtml(getFamilyWarnings(sourceSegmentIndex));
    const windSpeedText = Number(leg.windSpeed).toFixed(leg.windSpeed % 1 ? 1 : 0);
    const tideSpeedText = Number(leg.tideSpeed).toFixed(leg.tideSpeed % 1 ? 1 : 0);
    const canDeleteWaypoint = selectedWaypointIndex >= 0;

    return `
        <div class="wind-popup wind-popup-editor" onclick="event.stopPropagation()">
            <div class="popup-editor-header">
                <strong>Leg ${escapeHtml(leg.label)} conditions</strong>
                <div class="popup-editor-subtitle">CTS ${Math.round(leg.cts)}° • ${leg.distance.toFixed(2)} NM • ${leg.status}</div>
            </div>
            ${warningsHtml}
            <div class="popup-editor-grid">
                <div class="popup-editor-group">
                    <div class="popup-editor-group-title">Wind</div>
                    <label class="popup-editor-field" for="popupWindDir">
                        <span>Dir</span>
                        <input id="popupWindDir" type="number" inputmode="numeric" step="1" value="${Math.round(leg.windDir)}">
                    </label>
                    <label class="popup-editor-field" for="popupWindSpeed">
                        <span>Speed</span>
                        <input id="popupWindSpeed" type="number" inputmode="decimal" step="0.1" value="${windSpeedText}">
                    </label>
                </div>
                <div class="popup-editor-group">
                    <div class="popup-editor-group-title">Tide</div>
                    <label class="popup-editor-field" for="popupTideDir">
                        <span>Dir</span>
                        <input id="popupTideDir" type="number" inputmode="numeric" step="1" value="${Math.round(leg.tideDir)}">
                    </label>
                    <label class="popup-editor-field" for="popupTideSpeed">
                        <span>Speed</span>
                        <input id="popupTideSpeed" type="number" inputmode="decimal" step="0.1" value="${tideSpeedText}">
                    </label>
                </div>
            </div>
            <div class="wind-popup-actions popup-editor-actions">
                <button type="button" class="wind-popup-action-btn primary" onclick="applyPopupConditionChanges(${sourceSegmentIndex}); event.stopPropagation();">Apply</button>
                <button type="button" class="wind-popup-action-btn" onclick="closePopupConditionEditor(${sourceSegmentIndex}); event.stopPropagation();">Done</button>
                ${canDeleteWaypoint ? '<button type="button" class="wind-popup-action-btn" onclick="deleteWaypointFromPopup(event)">Delete</button>' : ''}
            </div>
        </div>
    `;
}

function openLegConditionEditorFromPopup(sourceSegmentIndex) {
    closeActionMenu();
    closeSettingsDrawer();
    const targetLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    if (targetLegIndex < 0) return;

    selectedLegIndex = targetLegIndex;
    setActiveConditionEditor('wind', currentLegData[targetLegIndex]?.key);
    expandedFamilySource = familyHasChildren(sourceSegmentIndex) ? sourceSegmentIndex : expandedFamilySource;
    updateRoute();

    const popupLatLng = getPopupLatLngForSource(sourceSegmentIndex);
    showMapInfo(popupLatLng, buildPopupConditionEditorHtml(sourceSegmentIndex));

    requestAnimationFrame(() => {
        const input = document.getElementById('popupWindDir');
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function applyPopupConditionChanges(sourceSegmentIndex) {
    const firstLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    const leg = firstLegIndex >= 0 ? currentLegData[firstLegIndex] : null;
    if (!leg) return;

    setLegConditionValue('wind', leg.key, 'dir', document.getElementById('popupWindDir')?.value);
    setLegConditionValue('wind', leg.key, 'speed', document.getElementById('popupWindSpeed')?.value);
    setLegConditionValue('tide', leg.key, 'dir', document.getElementById('popupTideDir')?.value);
    setLegConditionValue('tide', leg.key, 'speed', document.getElementById('popupTideSpeed')?.value);

    selectedLegIndex = firstLegIndex;
    updateRoute();

    const popupLatLng = getPopupLatLngForSource(sourceSegmentIndex);
    showMapInfo(popupLatLng, buildPopupConditionEditorHtml(sourceSegmentIndex));
}

function closePopupConditionEditor(sourceSegmentIndex) {
    clearActiveConditionEditor();
    const popupLatLng = getPopupLatLngForSource(sourceSegmentIndex);
    showMapInfo(popupLatLng, buildFamilyInfoHtml(sourceSegmentIndex) + getWaypointWarningHtml(selectedWaypointIndex));
}

function openRouteEditorFromPopup(sourceSegmentIndex) {
    hideMapInfo();
    closeActionMenu();
    closeSettingsDrawer();

    const targetLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    if (targetLegIndex < 0) return;

    selectedWaypointIndex = -1;
    clearActiveConditionEditor();
    expandedFamilySource = familyHasChildren(sourceSegmentIndex) ? sourceSegmentIndex : null;
    selectedLegIndex = targetLegIndex;

    if (drawer) {
        const currentHeight = parseFloat(getComputedStyle(drawer).height) || 0;
        const targetHeight = Math.max(currentHeight, getSnapHeight('middle'));
        setDrawerHeight(targetHeight, true);
    }

    updateRoute();
    requestAnimationFrame(() => scrollSelectedLegIntoView());
}

function deleteWaypointFromPopup(event) {
    if (event) event.stopPropagation();
    if (selectedWaypointIndex < 0) return;
    deleteSelectedWaypoint();
}

function clearActiveConditionEditor() {
    activeConditionEditor.key = null;
    activeConditionEditor.kind = null;
}

function isCompactEditorMode() {
    return window.matchMedia('(max-width: 767px)').matches;
}

function getLegByIndex(index) {
    return index >= 0 ? currentLegData[index] || null : null;
}

function getActiveEditorLeg() {
    if (!activeConditionEditor.key) return null;
    return currentLegData.find(leg => leg.key === activeConditionEditor.key) || getLegByIndex(selectedLegIndex);
}

function setLegConditionValue(kind, key, type, value) {
    const store = kind === 'wind' ? perLegWind : perLegTide;
    const fallback = kind === 'wind'
        ? defaults[type === 'dir' ? 'windDir' : 'windSpeed']
        : defaults[type === 'dir' ? 'tideDir' : 'tideSpeed'];
    if (!store[key]) store[key] = {};
    const parsed = parseFloat(value);
    store[key][type] = Number.isFinite(parsed) ? parsed : fallback;
}

function renderLegEditorFields(leg) {
    if (!leg) return '';
    const focusKind = activeConditionEditor.kind || 'wind';
    const windSpeedText = Number(leg.windSpeed).toFixed(leg.windSpeed % 1 ? 1 : 0);
    const tideSpeedText = Number(leg.tideSpeed).toFixed(leg.tideSpeed % 1 ? 1 : 0);
    return `
        <div class="leg-editor-grid">
            <div class="leg-editor-group ${focusKind === 'wind' ? 'focused' : ''}">
                <div class="leg-editor-group-title">Wind</div>
                <div class="leg-editor-inline-row">
                    <label class="leg-editor-field" for="editorWindDir">
                        <span class="leg-editor-label">Direction</span>
                        <input id="editorWindDir" class="leg-editor-input" type="number" inputmode="numeric" step="1" value="${Math.round(leg.windDir)}">
                    </label>
                    <label class="leg-editor-field" for="editorWindSpeed">
                        <span class="leg-editor-label">Speed</span>
                        <input id="editorWindSpeed" class="leg-editor-input" type="number" inputmode="decimal" step="0.1" value="${windSpeedText}">
                    </label>
                </div>
            </div>
            <div class="leg-editor-group ${focusKind === 'tide' ? 'focused' : ''}">
                <div class="leg-editor-group-title">Tide</div>
                <div class="leg-editor-inline-row">
                    <label class="leg-editor-field" for="editorTideDir">
                        <span class="leg-editor-label">Direction</span>
                        <input id="editorTideDir" class="leg-editor-input" type="number" inputmode="numeric" step="1" value="${Math.round(leg.tideDir)}">
                    </label>
                    <label class="leg-editor-field" for="editorTideSpeed">
                        <span class="leg-editor-label">Speed</span>
                        <input id="editorTideSpeed" class="leg-editor-input" type="number" inputmode="decimal" step="0.1" value="${tideSpeedText}">
                    </label>
                </div>
            </div>
        </div>
    `;
}

function openLegEditorSheet() {
    const leg = getActiveEditorLeg();
    if (!leg || !legEditorSheet || !legEditorBackdrop || !legEditorBody) return;
    if (legEditorTitle) legEditorTitle.textContent = `Leg ${leg.label} conditions`;
    if (legEditorSubtitle) legEditorSubtitle.textContent = `Waypoint ${leg.sourceSegmentIndex + 1} → Waypoint ${leg.sourceSegmentIndex + 2} • ${leg.status}`;
    legEditorBody.innerHTML = renderLegEditorFields(leg);
    legEditorSheet.classList.remove('hidden');
    legEditorBackdrop.classList.remove('hidden');
    legEditorSheet.setAttribute('aria-hidden', 'false');
    legEditorBackdrop.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        const focusId = activeConditionEditor.kind === 'tide' ? 'editorTideDir' : 'editorWindDir';
        const input = document.getElementById(focusId);
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function closeLegEditorSheet() {
    if (!legEditorSheet || !legEditorBackdrop) return;
    legEditorSheet.classList.add('hidden');
    legEditorBackdrop.classList.add('hidden');
    legEditorSheet.setAttribute('aria-hidden', 'true');
    legEditorBackdrop.setAttribute('aria-hidden', 'true');
}

function applyLegEditorChanges() {
    const leg = getActiveEditorLeg();
    if (!leg) return;

    const wasPopupVisible = !!(mapInfoCard && !mapInfoCard.classList.contains('hidden'));
    const sourceSegmentIndex = leg.sourceSegmentIndex;
    const popupLatLng = selectedWaypointIndex >= 0 && waypoints[selectedWaypointIndex]
        ? waypoints[selectedWaypointIndex].getLatLng()
        : leg.start;

    const windDirInput = document.getElementById('editorWindDir') || document.getElementById('popupWindDir');
    const windSpeedInput = document.getElementById('editorWindSpeed') || document.getElementById('popupWindSpeed');
    const tideDirInput = document.getElementById('editorTideDir') || document.getElementById('popupTideDir');
    const tideSpeedInput = document.getElementById('editorTideSpeed') || document.getElementById('popupTideSpeed');

    setLegConditionValue('wind', leg.key, 'dir', windDirInput?.value);
    setLegConditionValue('wind', leg.key, 'speed', windSpeedInput?.value);
    setLegConditionValue('tide', leg.key, 'dir', tideDirInput?.value);
    setLegConditionValue('tide', leg.key, 'speed', tideSpeedInput?.value);

    if (isCompactEditorMode()) closeLegEditorSheet();
    clearActiveConditionEditor();
    updateRoute();

    if (wasPopupVisible && sourceSegmentIndex >= 0) {
        showMapInfo(popupLatLng, buildFamilyInfoHtml(sourceSegmentIndex) + getWaypointWarningHtml(selectedWaypointIndex));
    }
}

function setActiveConditionEditor(kind, key) {
    activeConditionEditor.key = key;
    activeConditionEditor.kind = kind;
}

function isConditionEditorActive(kind, key) {
    return activeConditionEditor.kind === kind && activeConditionEditor.key === key;
}

function updateRouteEditUI() {
    document.body.classList.toggle('route-editing', routeEditingEnabled);

    if (routeEditToggleBtn) {
        routeEditToggleBtn.textContent = routeEditingEnabled ? 'Stop Adding' : 'Add Waypoints';
    }
    if (deleteWaypointBtn) {
        deleteWaypointBtn.disabled = selectedWaypointIndex < 0;
        deleteWaypointBtn.textContent = 'Delete Waypoint';
    }
    if (routeEditStatus) {
        routeEditStatus.textContent = '';
    }
    if (routeModeBadge) {
        routeModeBadge.classList.toggle('hidden', !routeEditingEnabled);
        routeModeBadge.setAttribute('aria-hidden', routeEditingEnabled ? 'false' : 'true');
    }

    renderTopRouteHeader();
    renderWorkspaceSummary();
    renderSelectedLegCard();
}

function refreshWaypointIcons() {
    const activeFamilySource = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex]?.sourceSegmentIndex : -1;

    waypoints.forEach((marker, idx) => {
        const linked = idx === activeFamilySource;
        const selected = idx === selectedWaypointIndex || idx === activeFamilySource;
        marker.setIcon(waypointIcon(idx + 1, selected, linked));
        marker.setZIndexOffset(selected ? 1500 : (linked ? 1450 : 1300));
    });

    updateRouteEditUI();
}

function getFirstLegIndexForSource(sourceSegmentIndex) {
    return currentLegData.findIndex(leg => leg.sourceSegmentIndex === sourceSegmentIndex);
}

function familyHasChildren(sourceSegmentIndex) {
    return currentLegData.some(leg => leg.sourceSegmentIndex === sourceSegmentIndex && /[a-z]+$/i.test(leg.label));
}

function toggleFamilyExpansion(sourceSegmentIndex) {
    const firstLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
    if (firstLegIndex < 0) return;

    selectedWaypointIndex = -1;
    clearActiveConditionEditor();
    selectedLegIndex = firstLegIndex;

    if (familyHasChildren(sourceSegmentIndex)) {
        expandedFamilySource = expandedFamilySource === sourceSegmentIndex ? null : sourceSegmentIndex;
    } else {
        expandedFamilySource = null;
    }

    updateRoute();
    scrollSelectedLegIntoView();
}

function selectWaypoint(index, popupLatLng = null) {
    hideMapInfo();
    selectedWaypointIndex = index;
    clearActiveConditionEditor();

    let sourceSegmentIndex = -1;
    if (index >= 0 && index < waypoints.length - 1) sourceSegmentIndex = index;
    else if (index === waypoints.length - 1 && waypoints.length > 1) sourceSegmentIndex = index - 1;

    expandedFamilySource = sourceSegmentIndex >= 0 && familyHasChildren(sourceSegmentIndex) ? sourceSegmentIndex : null;
    selectedLegIndex = sourceSegmentIndex >= 0 ? getFirstLegIndexForSource(sourceSegmentIndex) : -1;
    updateRoute();

    if (sourceSegmentIndex >= 0 && popupLatLng) {
        showMapInfo(popupLatLng, buildFamilyInfoHtml(sourceSegmentIndex));
    }
}

function selectLeg(index) {
    hideMapInfo();
    selectedLegIndex = index;
    selectedWaypointIndex = -1;
    clearActiveConditionEditor();
    expandedFamilySource = familyHasChildren(currentLegData[index]?.sourceSegmentIndex) ? currentLegData[index]?.sourceSegmentIndex : null;
    updateRoute();
    scrollSelectedLegIntoView();
}

function deleteSelectedWaypoint() {
    if (selectedWaypointIndex < 0 || selectedWaypointIndex >= waypoints.length) return;

    const marker = waypoints[selectedWaypointIndex];
    map.removeLayer(marker);
    waypoints.splice(selectedWaypointIndex, 1);

    selectedWaypointIndex = -1;
    expandedFamilySource = null;
    if (waypoints.length < 2) {
        selectedLegIndex = -1;
    } else if (selectedLegIndex >= currentLegData.length - 1) {
        selectedLegIndex = -1;
    }

    hideMapInfo();
    clearActiveConditionEditor();
    updateRoute();
}

function openConditionEditor(kind, key, legIndex) {
    const leg = getLegByIndex(legIndex);
    if (!leg) return;

    selectedLegIndex = legIndex;
    selectedWaypointIndex = -1;
    setActiveConditionEditor(kind, key);
    expandedFamilySource = familyHasChildren(leg.sourceSegmentIndex)
        ? leg.sourceSegmentIndex
        : expandedFamilySource;
    closeLegEditorSheet();
    updateRoute();

    const popupLatLng = getPopupLatLngForSource(leg.sourceSegmentIndex);
    showMapInfo(popupLatLng, buildPopupConditionEditorHtml(leg.sourceSegmentIndex));

    requestAnimationFrame(() => {
        const focusId = kind === 'tide' ? 'popupTideDir' : 'popupWindDir';
        const input = document.getElementById(focusId);
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function clearArrowMarkers() {
    arrowMarkers.forEach(m => map.removeLayer(m));
    arrowMarkers = [];
}

function clearWindBarbs() {
    windBarbMarkers.forEach(m => map.removeLayer(m));
    windBarbMarkers = [];
}

function clearLegSegments() {
    legSegments.forEach(s => map.removeLayer(s));
    legSegments = [];
}

function clearGeneratedWaypointMarkers() {
    generatedWaypointMarkers.forEach(m => map.removeLayer(m));
    generatedWaypointMarkers = [];
}

function addGeneratedWaypointMarker(latlng, label, legIndex, infoHtml, selected = false, linked = false) {
    const marker = L.marker(latlng, {
        icon: generatedWaypointIcon(label, selected, linked),
        interactive: true,
        zIndexOffset: selected ? 1450 : (linked ? 1400 : 1350)
    }).addTo(map);

    marker.on('click', () => {
        activateTab('routePanel');
        selectLeg(legIndex);
        showQuickLegPopupForLeg(legIndex, latlng);
    });

    generatedWaypointMarkers.push(marker);
}

function addLegArrow(lat, lng, track) {
    const icon = L.divIcon({
        className: '',
        html: `<div class="leg-arrow" style="transform: rotate(${track}deg);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
    const marker = L.marker([lat, lng], { icon, interactive: false }).addTo(map);
    arrowMarkers.push(marker);
}

function buildLegSegments(displayLegs) {
    clearLegSegments();
    const activeFamilySource = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex]?.sourceSegmentIndex : -1;

    displayLegs.forEach((leg, i) => {
        const inActiveFamily = leg.sourceSegmentIndex === activeFamilySource;
        const seg = L.polyline([leg.start, leg.end], {
            color: inActiveFamily ? '#ff7b00' : '#2b6ea3',
            weight: inActiveFamily ? 6 : 3,
            opacity: inActiveFamily ? 1 : 0.88
        }).addTo(map);

        seg.on('click', () => {
            selectLeg(i);
            activateTab('routePanel');
            showQuickLegPopupForLeg(i, interpolateLatLng(leg.start, leg.end, 0.5));
        });

        legSegments.push(seg);
    });
}

function buildWindBarbSVG(speed, dir) {
    const s = Math.max(0, Number(speed) || 0);
    let remaining = Math.round(s / 5) * 5;

    let svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <g transform="translate(24,24) rotate(${dir})">
        <line x1="0" y1="14" x2="0" y2="-12" stroke="#003049" stroke-width="2"/>
    `;

    let y = -12;

    while (remaining >= 50) {
        svg += `<polygon points="0,${y} 12,${y + 4} 0,${y + 8}" fill="#003049"/>`;
        remaining -= 50;
        y += 8;
    }
    while (remaining >= 10) {
        svg += `<line x1="0" y1="${y}" x2="12" y2="${y + 4}" stroke="#003049" stroke-width="2"/>`;
        remaining -= 10;
        y += 5;
    }
    if (remaining >= 5) {
        svg += `<line x1="0" y1="${y}" x2="7" y2="${y + 2.5}" stroke="#003049" stroke-width="2"/>`;
    }

    svg += `</g></svg>`;
    return svg;
}

function getOffsetBarbLatLng(a, b, legIndex) {
    const p1 = map.latLngToContainerPoint(a);
    const p2 = map.latLngToContainerPoint(b);

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    const along = Math.min(0.68, Math.max(0.52, len < 90 ? 0.5 : 0.68));
    const baseX = p1.x + dx * along;
    const baseY = p1.y + dy * along;

    const nx = -dy / len;
    const ny = dx / len;

    const offsetPx = len < 70 ? 42 : (len < 120 ? 34 : 26);
    const side = (legIndex % 2 === 0) ? 1 : -1;

    const finalPoint = L.point(
        baseX + nx * offsetPx * side,
        baseY + ny * offsetPx * side
    );

    return map.containerPointToLatLng(finalPoint);
}

function addWindBarb(latlng, sourceSegmentIndex) {
    const family = getFamilyLegData(sourceSegmentIndex);
    const first = family[0];
    if (!first) return;

    const icon = L.divIcon({
        className: '',
        html: `<div class="wind-barb-wrap">${buildWindBarbSVG(first.avgWindSpeed, first.avgWindDir)}</div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
    });

    const marker = L.marker(latlng, { icon, interactive: true }).addTo(map);
    marker.on('click', () => {
        const firstLegIndex = getFirstLegIndexForSource(sourceSegmentIndex);
        if (firstLegIndex >= 0) {
            selectLeg(firstLegIndex);
            showQuickLegPopupForLeg(firstLegIndex, latlng);
        } else {
            showMapInfo(latlng, buildFamilyInfoHtml(sourceSegmentIndex));
        }
    });

    windBarbMarkers.push(marker);
}

function angleDiff(a, b) {
    let d = Math.abs((a - b) % 360);
    return d > 180 ? 360 - d : d;
}

function getStatusFromRelativeAngle(relativeAngle) {
    if (relativeAngle < 45) return 'Tacking';
    if (relativeAngle > 135) return 'Running';
    return 'Reaching';
}

function getWindBand(windSpeed) {
    return windPerformanceBands.find(b => windSpeed >= b.min && windSpeed <= b.max)
        || windPerformanceBands[windPerformanceBands.length - 1];
}

function midpoint(range) {
    return (range[0] + range[1]) / 2;
}

function getPerformanceBoatSpeed(windSpeed, relativeAngle, performancePercent) {
    const enteredSpeed = Number(performancePercent);
    return Math.max(0.5, Math.min(10, Number.isFinite(enteredSpeed) ? enteredSpeed : 5));
}


function calculateLeg(p1, p2, performancePercent, windDir, windSpeed, tideDir, tideSpeed) {
    const dist = distance(p1.lat, p1.lng, p2.lat, p2.lng);
    const track = bearing(p1.lat, p1.lng, p2.lat, p2.lng);

    const relativeAngle = angleDiff(track, windDir);
    const status = getStatusFromRelativeAngle(relativeAngle);
    const stw = getPerformanceBoatSpeed(windSpeed, relativeAngle, performancePercent);

    const tideX = tideSpeed * Math.sin(toRad(tideDir));
    const tideY = tideSpeed * Math.cos(toRad(tideDir));
    const boatX = stw * Math.sin(toRad(track));
    const boatY = stw * Math.cos(toRad(track));

    const resX = boatX + tideX;
    const resY = boatY + tideY;
    const sog = Math.sqrt(resX * resX + resY * resY);

    const groundTrack = (toDeg(Math.atan2(resX, resY)) + 360) % 360;
    const cts = (track + (track - groundTrack) + 360) % 360;
    const hours = dist / Math.max(sog, 0.1);

    return { track, cts, distance: dist, hours, status, stw, sog, relativeAngle };
}

function getChunkWind(sourceSegmentIndex, chunkIndex) {
    const key = makeLegKey(sourceSegmentIndex, chunkIndex);
    return {
        dir: perLegWind[key]?.dir ?? defaults.windDir,
        speed: perLegWind[key]?.speed ?? defaults.windSpeed
    };
}

function getChunkTide(sourceSegmentIndex, chunkIndex) {
    const key = makeLegKey(sourceSegmentIndex, chunkIndex);
    return {
        dir: perLegTide[key]?.dir ?? defaults.tideDir,
        speed: perLegTide[key]?.speed ?? defaults.tideSpeed
    };
}

function estimateSourceSegmentChunkCount(a, b, sourceSegmentIndex, performancePercent) {
    const baseWind = getChunkWind(sourceSegmentIndex, 0);
    const baseTide = getChunkTide(sourceSegmentIndex, 0);

    const estimate = calculateLeg(
        a, b, performancePercent,
        baseWind.dir, baseWind.speed,
        baseTide.dir, baseTide.speed
    );

    return Math.max(1, Math.ceil(estimate.hours / MAX_LEG_HOURS));
}

function getParentLegCTSFromAverage(sourceIndex, latlngs, performancePercent) {
    const start = latlngs[sourceIndex];
    const end = latlngs[sourceIndex + 1];

    const chunkCount = autoSplitLegsEnabled
        ? estimateSourceSegmentChunkCount(start, end, sourceIndex, performancePercent)
        : 1;

    let windDirSum = 0;
    let windSpeedSum = 0;
    let tideDirSum = 0;
    let tideSpeedSum = 0;

    for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
        const wind = getChunkWind(sourceIndex, chunkIndex);
        const tide = getChunkTide(sourceIndex, chunkIndex);

        windDirSum += wind.dir;
        windSpeedSum += wind.speed;
        tideDirSum += tide.dir;
        tideSpeedSum += tide.speed;
    }

    const avgWindDir = windDirSum / chunkCount;
    const avgWindSpeed = windSpeedSum / chunkCount;
    const avgTideDir = tideDirSum / chunkCount;
    const avgTideSpeed = tideSpeedSum / chunkCount;

    const parentLeg = calculateLeg(
        start,
        end,
        performancePercent,
        avgWindDir,
        avgWindSpeed,
        avgTideDir,
        avgTideSpeed
    );

    return {
        cts: parentLeg.cts,
        avgWindDir,
        avgWindSpeed,
        avgTideDir,
        avgTideSpeed
    };
}


function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getRouteDisplayTitle() {
    const from = (startLocationInput?.value || defaults.startLocation || '').trim();
    const to = (destinationInput?.value || defaults.destination || '').trim();
    if (from && to) return `${from} → ${to}`;
    if (from) return `${from} route`;
    if (to) return `Route to ${to}`;
    return 'Untitled route';
}

function formatDistanceText(totalDistance) {
    return totalDistance > 0 ? `${totalDistance.toFixed(2)} NM` : '—';
}

function formatDurationText(totalHours) {
    return totalHours > 0 ? formatDurationHours(totalHours) : '—';
}


function getEditedLegCount() {
    const keys = new Set([
        ...Object.keys(perLegWind || {}),
        ...Object.keys(perLegTide || {})
    ]);
    return keys.size;
}

function getSplitLegCount() {
    return currentLegData.filter(leg => /[a-z]+$/i.test(leg.label)).length;
}

function formatSourceLabel(kind, source) {
    const prefix = kind === 'wind' ? 'Wind' : 'Tide';
    return source === 'live' ? `${prefix}: Live` : `${prefix}: Manual`;
}

function renderRoutePreview(totalDistance = null, totalHours = null) {
    if (!routePreviewCard || !routePreviewContent) return;

    const distanceText = totalDistance === null
        ? (document.getElementById('summaryDistance')?.textContent || '—')
        : formatDistanceText(totalDistance);
    const durationText = totalHours === null
        ? (document.getElementById('summaryDuration')?.textContent || '—')
        : formatDurationText(totalHours);

    const waypointsCount = waypoints.length;
    const legsCount = currentLegData.length;
    const splitLegCount = getSplitLegCount();
    const selectedLeg = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex] : null;
    const boatSpeedText = `${escapeHtml(String(boatSpeedInput?.value || 5))} kt`;
    const windSourceText = escapeHtml(formatSourceLabel('wind', windInputSource));
    const tideSourceText = escapeHtml(formatSourceLabel('tide', tideInputSource));
    const subtitleText = waypoints.length < 2
        ? 'Add at least two waypoints to generate a passage summary.'
        : `${waypointsCount} waypoint${waypointsCount === 1 ? '' : 's'} • ${legsCount} displayed leg${legsCount === 1 ? '' : 's'} • ${distanceText} • ${durationText}`;
    const selectionText = selectedLeg
        ? `Selected: Leg ${selectedLeg.label}`
        : (legsCount ? 'No leg selected' : 'No route yet');

    if (window.matchMedia('(min-width: 768px)').matches) {
        routePreviewCard.classList.add('hidden');
        routePreviewContent.innerHTML = '';
        return;
    }

    routePreviewCard.classList.remove('hidden');
    routePreviewContent.innerHTML = `
        <div class="route-preview-header">
            <div class="route-preview-main">
                <div class="route-preview-kicker">Route preview</div>
                <div class="route-preview-title">${escapeHtml(getRouteDisplayTitle())}</div>
                <div class="route-preview-subtitle">${escapeHtml(subtitleText)}</div>
            </div>
            <div class="route-preview-selection">${escapeHtml(selectionText)}</div>
        </div>
        <div class="route-preview-chip-row">
            <span class="route-preview-chip">Split legs: ${splitLegCount}</span>
            <span class="route-preview-chip">Boat: ${boatSpeedText}</span>
            <span class="route-preview-note-pill">${windSourceText}</span>
            <span class="route-preview-note-pill">${tideSourceText}</span>
            <span class="route-preview-note-pill">Auto split: ${autoSplitLegsEnabled ? 'On' : 'Off'}</span>
        </div>
    `;
}

function renderWorkspaceSummary(totalDistance = null, totalHours = null) {
    const distanceText = totalDistance === null
        ? (document.getElementById('summaryDistance')?.textContent || '—')
        : formatDistanceText(totalDistance);
    const durationText = totalHours === null
        ? (document.getElementById('summaryDuration')?.textContent || '—')
        : formatDurationText(totalHours);

    const distanceEl = document.getElementById('summaryDistance');
    const durationEl = document.getElementById('summaryDuration');
    if (distanceEl) distanceEl.textContent = distanceText;
    if (durationEl) durationEl.textContent = durationText;

    if (!routeWorkspaceLabel || !routeWorkspaceNote) return;

    if (routeEditingEnabled) {
        routeWorkspaceLabel.textContent = 'Adding waypoints';
        routeWorkspaceNote.textContent = waypoints.length >= 2
            ? 'Tap the map to place the next point, or tap a route line to inspect a leg.'
            : 'Tap the map to place the next point.';
        return;
    }

    if (waypoints.length < 2) {
        routeWorkspaceLabel.textContent = 'Ready to plot';
        routeWorkspaceNote.textContent = '';
        return;
    }

    const leg = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex] : null;
    if (leg) {
        routeWorkspaceLabel.textContent = 'Active leg';
        routeWorkspaceNote.textContent = `Waypoint ${leg.sourceSegmentIndex + 1} → Waypoint ${leg.sourceSegmentIndex + 2} • ${leg.status}`;
        return;
    }

    routeWorkspaceLabel.textContent = 'Route ready';
    routeWorkspaceNote.textContent = `${waypoints.length} waypoint${waypoints.length === 1 ? '' : 's'} plotted.`;
}

function renderTopRouteHeader(totalDistance = null, totalHours = null) {
    const distanceText = totalDistance === null
        ? (document.getElementById('summaryDistance')?.textContent || '—')
        : formatDistanceText(totalDistance);
    const durationText = totalHours === null
        ? (document.getElementById('summaryDuration')?.textContent || '—')
        : formatDurationText(totalHours);

    if (topRouteTitle) topRouteTitle.textContent = getRouteDisplayTitle();
    if (topRouteDistance) topRouteDistance.textContent = distanceText;
    if (topRouteDuration) topRouteDuration.textContent = durationText;
    if (topRouteInlineStats) topRouteInlineStats.textContent = `${distanceText} • ${durationText}`;

    if (!topRouteSubtitle) return;

    if (routeEditingEnabled) {
        topRouteSubtitle.textContent = 'Tap the map to place the next point.';
        return;
    }

    if (waypoints.length < 2) {
        topRouteSubtitle.textContent = 'Turn on Add Waypoints to start plotting.';
        return;
    }

    if (selectedLegIndex >= 0 && currentLegData[selectedLegIndex]) {
        const leg = currentLegData[selectedLegIndex];
        topRouteSubtitle.textContent = `Leg ${leg.label} selected • ${leg.status} • ${leg.distance.toFixed(2)} NM`;
        return;
    }

    topRouteSubtitle.textContent = `${waypoints.length} waypoint${waypoints.length === 1 ? '' : 's'} plotted.`;
}

function renderSelectedLegCard(totalDistance = null, totalHours = null) {
    if (!selectedLegCardContent || !selectedLegCard) return;
    selectedLegCard.style.display = 'none';
    selectedLegCardContent.innerHTML = '';
}

function toggleSelectedLegFamilyFromCard() {
    if (selectedLegIndex < 0 || !currentLegData[selectedLegIndex]) return;
    toggleFamilyExpansion(currentLegData[selectedLegIndex].sourceSegmentIndex);
}

function renderLegRail() {
    const track = document.getElementById('legRailTrack');
    if (!track) return;

    if (!currentLegData.length) {
        track.innerHTML = '<div class="leg-rail-empty">Add at least two waypoints to generate route legs.</div>';
        return;
    }

    track.innerHTML = currentLegData.map((leg, index) => `
        <button type="button" class="leg-rail-card${index === selectedLegIndex ? ' selected' : ''}" data-leg-rail-index="${index}">
            <div class="leg-rail-card-top">
                <div class="leg-rail-card-label">${escapeHtml(leg.label)}</div>
                <div class="leg-rail-card-distance">${leg.distance.toFixed(2)} NM</div>
            </div>
            <div class="leg-rail-card-cts">CTS ${leg.cts.toFixed(1)}°</div>
            <div class="leg-rail-card-status">${renderStatus(leg.status)}</div>
        </button>
    `).join('');

    track.querySelectorAll('[data-leg-rail-index]').forEach((el) => {
        el.addEventListener('click', () => {
            const index = Number(el.dataset.legRailIndex);
            if (!Number.isFinite(index)) return;
            selectLeg(index);
        });
    });

    syncLegRailSelection();
}

function syncLegRailSelection() {
    const track = document.getElementById('legRailTrack');
    if (!track) return;
    const cards = track.querySelectorAll('[data-leg-rail-index]');
    cards.forEach((card) => {
        const index = Number(card.dataset.legRailIndex);
        card.classList.toggle('selected', index === selectedLegIndex);
    });

    if (selectedLegIndex >= 0) {
        const activeCard = track.querySelector(`[data-leg-rail-index="${selectedLegIndex}"]`);
        if (activeCard) {
            activeCard.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    }
}

function updateSummary(totalDistance, totalHours) {
    const distanceEl = document.getElementById('summaryDistance');
    const durationEl = document.getElementById('summaryDuration');

    if (distanceEl) distanceEl.textContent = formatDistanceText(totalDistance);
    if (durationEl) durationEl.textContent = formatDurationText(totalHours);
    renderTopRouteHeader(totalDistance, totalHours);
    renderWorkspaceSummary(totalDistance, totalHours);
    renderLegRail();
    renderSelectedLegCard(totalDistance, totalHours);
    renderRoutePreview(totalDistance, totalHours);
}

function updateDefaultsFromSettings() {
    const windDir = parseFloat(defaultWindDirInput?.value);
    const windSpeed = parseFloat(defaultWindSpeedInput?.value);
    const tideDir = parseFloat(defaultTideDirInput?.value);
    const tideSpeed = parseFloat(defaultTideSpeedInput?.value);

    defaults.windDir = Number.isFinite(windDir) ? windDir : 180;
    defaults.windSpeed = Number.isFinite(windSpeed) ? windSpeed : 15;
    defaults.tideDir = Number.isFinite(tideDir) ? tideDir : 0;
    defaults.tideSpeed = Number.isFinite(tideSpeed) ? tideSpeed : 1;
    defaults.startLocation = startLocationInput?.value || '';
    defaults.destination = destinationInput?.value || '';
    windInputSource = 'manual';
    tideInputSource = 'manual';

    updateRoute();
}

function getLiveWindTargetLatLng() {
    if (waypoints.length > 0) return waypoints[0].getLatLng();
    return map.getCenter();
}

async function applyLiveWind() {
    const target = getLiveWindTargetLatLng();
    if (actionMenuLiveWind) actionMenuLiveWind.disabled = true;
    if (liveWindStatus) liveWindStatus.textContent = '';

    try {
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}&longitude=${target.lng}` +
            `&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn`;

        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const current = data?.current;
        const windSpeed = Number(current?.wind_speed_10m);
        const windDir = Number(current?.wind_direction_10m);

        if (!Number.isFinite(windSpeed) || !Number.isFinite(windDir)) {
            throw new Error('Wind data missing');
        }

        if (defaultWindDirInput) defaultWindDirInput.value = String(Math.round(windDir));
        if (defaultWindSpeedInput) defaultWindSpeedInput.value = windSpeed.toFixed(1);

        defaults.windDir = Math.round(windDir);
        defaults.windSpeed = Number(windSpeed.toFixed(1));
        windInputSource = 'live';

        if (liveWindStatus) {
            liveWindStatus.textContent = '';
        }

        updateRoute();
    } catch (err) {
        console.warn('Live wind fetch failed:', err);
        if (liveWindStatus) {
            liveWindStatus.textContent = '';
        }
    } finally {
        if (actionMenuLiveWind) actionMenuLiveWind.disabled = false;
    }
}

async function applyLiveTide() {
    const target = getLiveWindTargetLatLng();
    if (actionMenuLiveTide) actionMenuLiveTide.disabled = true;
    closeActionMenu();

    const apiKey = (stormglassApiKeyInput?.value || getStormglassApiKey() || '').trim();
    if (!apiKey) {
        if (liveTideStatus) {
            liveTideStatus.textContent = '';
        }
        revealLiveTideKeyCard('Add your Stormglass API key to use Live Tide.', true);
        if (actionMenuLiveTide) actionMenuLiveTide.disabled = false;
        return;
    }

    if (liveTideStatus) liveTideStatus.textContent = '';

    try {
        const url =
            `https://api.stormglass.io/v2/weather/point?lat=${target.lat}&lng=${target.lng}` +
            `&params=currentSpeed,currentDirection`;

        const response = await fetch(url, {
            cache: 'no-store',
            headers: {
                Authorization: apiKey
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const hour = data?.hours?.[0] || {};

        const pickValue = (obj) => {
            if (typeof obj === 'number') return obj;
            if (!obj || typeof obj !== 'object') return NaN;
            if (Number.isFinite(obj.sg)) return obj.sg;
            for (const value of Object.values(obj)) {
                if (Number.isFinite(value)) return value;
            }
            return NaN;
        };

        const tideSpeed = Number(pickValue(hour.currentSpeed));
        const tideDir = Number(pickValue(hour.currentDirection));

        if (!Number.isFinite(tideSpeed) || !Number.isFinite(tideDir)) {
            throw new Error('Tide current data missing');
        }

        if (defaultTideDirInput) defaultTideDirInput.value = String(Math.round(tideDir));
        if (defaultTideSpeedInput) defaultTideSpeedInput.value = tideSpeed.toFixed(1);

        defaults.tideDir = Math.round(tideDir);
        defaults.tideSpeed = Number(tideSpeed.toFixed(1));
        tideInputSource = 'live';

        if (liveTideStatus) {
            liveTideStatus.textContent = '';
        }
        updateLiveTideKeyUI('Stormglass API key saved. Live Tide is ready.');
        updateRoute();
    } catch (err) {
        console.warn('Live tide fetch failed:', err);
        if (liveTideStatus) {
            liveTideStatus.textContent = '';
        }
        if (String(err).includes('401') || String(err).includes('403')) {
            revealLiveTideKeyCard('That Stormglass API key was not accepted. Check it and try again.', true);
        }
    } finally {
        if (actionMenuLiveTide) actionMenuLiveTide.disabled = false;
    }
}

function getWaypointWarningHtml(index) {
    return '';
}

function getFamilyWarnings(sourceSegmentIndex) {
    return [];
}

function renderWarningsHtml(warnings) {
    return '';
}

function getLatLngRouteKey(latlngs) {
    return (latlngs || []).map(latlng => `${latlng.lat.toFixed(5)},${latlng.lng.toFixed(5)}`).join('|');
}

async function fetchWaterState(latlng) {
    return null;
}

async function refreshLandWarningsForRoute(latlngs) {
    waypointWarnings = {};
    legWarnings = {};
    lastCompletedLandWarningRouteKey = getLatLngRouteKey(latlngs);
}


function highlightSelection() {
    refreshWaypointIcons();
    const activeFamilySource = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex]?.sourceSegmentIndex : -1;

    legSegments.forEach((seg, idx) => {
        const legData = currentLegData[idx];
        const inActiveFamily = legData && legData.sourceSegmentIndex === activeFamilySource;

        seg.setStyle({
            color: inActiveFamily ? '#ff7b00' : '#2b6ea3',
            weight: inActiveFamily ? 6 : 3,
            opacity: inActiveFamily ? 1 : 0.88
        });
    });

    document.querySelectorAll('#legsBody tr').forEach((row) => {
        const sourceIndex = Number(row.dataset.sourceSegmentIndex);
        const inActiveFamily = sourceIndex === activeFamilySource;
        row.classList.toggle('selected-leg-row', inActiveFamily);
    });
    syncLegRailSelection();
}

function scrollSelectedLegIntoView() {
    if (selectedLegIndex < 0) return;
    const rows = document.querySelectorAll('#legsBody tr');
    if (rows[selectedLegIndex]) {
        rows[selectedLegIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

function renderConditionPill(kind, key, dir, speed, legIndex) {
    const activeClass = isConditionEditorActive(kind, key) ? ' active' : '';
    return `
        <button
            type="button"
            class="cond-pill${activeClass}"
            onclick="openConditionEditor('${kind}', '${key}', ${legIndex}); event.stopPropagation();"
            aria-label="Edit ${kind} for leg ${legIndex + 1}"
        >${Math.round(dir)}° @ ${Number(speed).toFixed(speed % 1 ? 1 : 0)} kt</button>
    `;
}

function renderConditionEditor(kind, key, dir, speed) {
    const fn = kind === 'wind' ? 'changeWind' : 'changeTide';
    return `
        <div class="cond-editor" onclick="event.stopPropagation()">
            <input
                class="leg-inline-input"
                data-editor-kind="${kind}"
                data-editor-key="${key}"
                type="number"
                inputmode="decimal"
                value="${dir}"
                step="1"
                onclick="this.select(); event.stopPropagation();"
                onfocus="this.select()"
                onchange="${fn}('${key}', this.value, 'dir')"
                onblur="closeConditionEditor()"
                onkeydown="handleLegInputKeydown(event, this)"
            >
            <span class="cond-editor-text">° @</span>
            <input
                class="leg-inline-input"
                data-editor-kind="${kind}"
                data-editor-key="${key}"
                type="number"
                inputmode="decimal"
                value="${speed}"
                step="0.1"
                onclick="this.select(); event.stopPropagation();"
                onfocus="this.select()"
                onchange="${fn}('${key}', this.value, 'speed')"
                onblur="closeConditionEditor()"
                onkeydown="handleLegInputKeydown(event, this)"
            >
            <span class="cond-editor-text">kt</span>
        </div>
    `;
}

function updateRoute() {
    const performancePercent = Math.max(1, Math.min(10, parseFloat(boatSpeedInput?.value) || 5));
    const latlngs = waypoints.map(m => m.getLatLng());

    currentLegData = [];
    polyline.setLatLngs([]);
    clearArrowMarkers();
    clearWindBarbs();
    clearLegSegments();
    clearGeneratedWaypointMarkers();

    const tbody = document.getElementById('legsBody');
    if (tbody) tbody.innerHTML = '';

    refreshWaypointIcons();

    if (latlngs.length === 0) {
        selectedLegIndex = -1;
        updateSummary(0, 0);
        return;
    }

    if (latlngs.length < 2) {
        selectedLegIndex = -1;
        polyline.setLatLngs(latlngs);
        updateSummary(0, 0);
        highlightSelection();
        return;
    }

    const displayLegs = [];
    const parentCTSBySource = {};

    for (let sourceIndex = 0; sourceIndex < latlngs.length - 1; sourceIndex++) {
        const a = latlngs[sourceIndex];
        const b = latlngs[sourceIndex + 1];

        parentCTSBySource[sourceIndex] = getParentLegCTSFromAverage(sourceIndex, latlngs, performancePercent);

        const chunkCount = autoSplitLegsEnabled
            ? estimateSourceSegmentChunkCount(a, b, sourceIndex, performancePercent)
            : 1;

        for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex++) {
            const start = interpolateLatLng(a, b, chunkIndex / chunkCount);
            const end = interpolateLatLng(a, b, (chunkIndex + 1) / chunkCount);
            const label = getDisplayLegLabel(sourceIndex, chunkIndex);

            displayLegs.push({
                sourceSegmentIndex: sourceIndex,
                chunkIndex,
                key: makeLegKey(sourceIndex, chunkIndex),
                start,
                end,
                label
            });
        }
    }

    if (selectedLegIndex >= displayLegs.length) {
        selectedLegIndex = displayLegs.length - 1;
    }

    buildLegSegments(displayLegs);

    let totalDistance = 0;
    let totalHours = 0;

    displayLegs.forEach((displayLeg, i) => {
        const wind = getChunkWind(displayLeg.sourceSegmentIndex, displayLeg.chunkIndex);
        const tide = getChunkTide(displayLeg.sourceSegmentIndex, displayLeg.chunkIndex);

        const leg = calculateLeg(
            displayLeg.start,
            displayLeg.end,
            performancePercent,
            wind.dir,
            wind.speed,
            tide.dir,
            tide.speed
        );

        totalDistance += leg.distance;
        totalHours += leg.hours;

        const parentResult = parentCTSBySource[displayLeg.sourceSegmentIndex];
        const familyWarnings = getFamilyWarnings(displayLeg.sourceSegmentIndex);

        const legData = {
            index: i,
            key: displayLeg.key,
            label: displayLeg.label,
            sourceSegmentIndex: displayLeg.sourceSegmentIndex,
            ...leg,
            cts: parentResult.cts,
            windDir: wind.dir,
            windSpeed: wind.speed,
            tideDir: tide.dir,
            tideSpeed: tide.speed,
            avgWindDir: parentResult.avgWindDir,
            avgWindSpeed: parentResult.avgWindSpeed,
            avgTideDir: parentResult.avgTideDir,
            avgTideSpeed: parentResult.avgTideSpeed,
            warnings: familyWarnings
        };

        currentLegData.push(legData);

        const isExpandedFamily = expandedFamilySource === displayLeg.sourceSegmentIndex;
        const shouldShowRow = displayLeg.chunkIndex === 0 || isExpandedFamily;

        if (tbody && shouldShowRow) {
            const row = document.createElement('tr');
            row.dataset.legIndex = String(i);
            row.dataset.sourceSegmentIndex = String(displayLeg.sourceSegmentIndex);
            row.classList.add(displayLeg.chunkIndex === 0 ? 'route-parent-row' : 'route-child-row');
            row.innerHTML = `
                <td>${displayLeg.label}</td>
                <td>${leg.track.toFixed(1)}°</td>
                <td>${legData.cts.toFixed(1)}°</td>
                <td>${leg.distance.toFixed(2)}</td>
                <td>${renderConditionPill('wind', displayLeg.key, wind.dir, wind.speed, i)}</td>
                <td>${renderConditionPill('tide', displayLeg.key, tide.dir, tide.speed, i)}</td>
                <td><div class="status-stack">${renderStatus(leg.status)}${displayLeg.chunkIndex === 0 ? renderWarningsHtml(familyWarnings) : ''}</div></td>
            `;

            row.addEventListener('click', (e) => {
                if (e.target.closest('input') || e.target.closest('.cond-pill')) return;
                if (displayLeg.chunkIndex === 0) {
                    toggleFamilyExpansion(displayLeg.sourceSegmentIndex);
                } else {
                    selectLeg(i);
                }
            });

            tbody.appendChild(row);
        }

        addLegArrow(
            (displayLeg.start.lat + displayLeg.end.lat) / 2,
            (displayLeg.start.lng + displayLeg.end.lng) / 2,
            leg.track
        );

        const activeFamilySource = selectedLegIndex >= 0 ? currentLegData[selectedLegIndex]?.sourceSegmentIndex : -1;
        const inActiveFamily = displayLeg.sourceSegmentIndex === activeFamilySource;
        const familyHtml = buildFamilyInfoHtml(displayLeg.sourceSegmentIndex);

        if (displayLeg.chunkIndex > 0) {
            addGeneratedWaypointMarker(
                displayLeg.start,
                displayLeg.label,
                i,
                familyHtml,
                inActiveFamily,
                false
            );
        }

        if (i === selectedLegIndex && selectedLegIndex >= 0) {
            const barbLatLng = getOffsetBarbLatLng(displayLeg.start, displayLeg.end, i);
            addWindBarb(barbLatLng, displayLeg.sourceSegmentIndex);
        }
    });

    if (selectedLegIndex >= 0) {
        const activeSource = currentLegData[selectedLegIndex]?.sourceSegmentIndex;
        const activeLeg = currentLegData[selectedLegIndex];
        if (activeSource >= 0 && activeLeg && mapInfoCard && !mapInfoCard.classList.contains('hidden')) {
            const popupLatLng = selectedWaypointIndex >= 0 && waypoints[selectedWaypointIndex]
                ? waypoints[selectedWaypointIndex].getLatLng()
                : activeLeg.start;
            showMapInfo(popupLatLng, buildFamilyInfoHtml(activeSource) + getWaypointWarningHtml(selectedWaypointIndex));
        }
    } else {
        hideMapInfo();
    }

    polyline.setLatLngs(latlngs);
    highlightSelection();
    updateSummary(totalDistance, totalHours);
    refreshLandWarningsForRoute(latlngs);
}

function renderStatus(status) {
    let cls = 'status-reaching';
    if (status === 'Tacking') cls = 'status-tacking';
    if (status === 'Running') cls = 'status-running';
    return `<span class="status-chip ${cls}">${status}</span>`;
}

function handleLegInputKeydown(event, input) {
    if (event.key === 'Enter') input.blur();
    event.stopPropagation();
}

function changeWind(key, value, type) {
    if (!perLegWind[key]) perLegWind[key] = {};
    const parsed = parseFloat(value);
    perLegWind[key][type] = Number.isFinite(parsed)
        ? parsed
        : (perLegWind[key][type] ?? defaults[type === 'dir' ? 'windDir' : 'windSpeed']);
    updateRoute();
}

function changeTide(key, value, type) {
    if (!perLegTide[key]) perLegTide[key] = {};
    const parsed = parseFloat(value);
    perLegTide[key][type] = Number.isFinite(parsed)
        ? parsed
        : (perLegTide[key][type] ?? defaults[type === 'dir' ? 'tideDir' : 'tideSpeed']);
    updateRoute();
}

function closeConditionEditor() {
    clearActiveConditionEditor();
    closeLegEditorSheet();
    updateRoute();
}

window.changeWind = changeWind;
window.changeTide = changeTide;
window.handleLegInputKeydown = handleLegInputKeydown;
window.openConditionEditor = openConditionEditor;
window.closeConditionEditor = closeConditionEditor;
window.openRouteEditorFromPopup = openRouteEditorFromPopup;
window.openLegConditionEditorFromPopup = openLegConditionEditorFromPopup;
window.applyPopupConditionChanges = applyPopupConditionChanges;
window.closePopupConditionEditor = closePopupConditionEditor;
window.deleteWaypointFromPopup = deleteWaypointFromPopup;
window.toggleSelectedLegFamilyFromCard = toggleSelectedLegFamilyFromCard;
window.deleteSelectedWaypoint = deleteSelectedWaypoint;
window.applyLegEditorChanges = applyLegEditorChanges;

document.querySelectorAll('.summary-tab').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

if (mapInfoClose) {
    mapInfoClose.addEventListener('click', hideMapInfo);
}

if (settingsDrawerHandle) settingsDrawerHandle.addEventListener('click', () => {
    if (settingsDrawer && settingsDrawer.classList.contains('hidden')) openSettingsDrawer();
    else closeSettingsDrawer();
});
if (settingsDrawerClose) settingsDrawerClose.addEventListener('click', closeSettingsDrawer);
if (settingsBackdrop) settingsBackdrop.addEventListener('click', closeSettingsDrawer);
if (savedRoutesClose) savedRoutesClose.addEventListener('click', closeSavedRoutesModal);
if (legEditorClose) legEditorClose.addEventListener('click', closeConditionEditor);
if (legEditorCancel) legEditorCancel.addEventListener('click', closeConditionEditor);
if (legEditorApply) legEditorApply.addEventListener('click', applyLegEditorChanges);
if (legEditorBackdrop) legEditorBackdrop.addEventListener('click', closeConditionEditor);
if (savedRoutesBackdrop) savedRoutesBackdrop.addEventListener('click', closeSavedRoutesModal);
if (savedRoutesList) savedRoutesList.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('[data-load-route-id]');
    if (loadBtn) {
        loadSavedRouteById(loadBtn.getAttribute('data-load-route-id'));
        return;
    }
    const deleteBtn = e.target.closest('[data-delete-route-id]');
    if (deleteBtn) {
        deleteSavedRouteById(deleteBtn.getAttribute('data-delete-route-id'));
    }
});
if (liveTideSetupBtn) liveTideSetupBtn.addEventListener('click', () => { revealLiveTideKeyCard('', true); });
if (saveStormglassKeyBtn) saveStormglassKeyBtn.addEventListener('click', () => {
    const value = (stormglassApiKeyInput?.value || '').trim();
    setStormglassApiKey(value);
    updateLiveTideKeyUI(value ? 'Stormglass API key saved.' : 'No Stormglass API key saved.');
    if (liveTideStatus && value) liveTideStatus.textContent = '';
});
if (clearStormglassKeyBtn) clearStormglassKeyBtn.addEventListener('click', () => {
    setStormglassApiKey('');
    if (stormglassApiKeyInput) stormglassApiKeyInput.value = '';
    updateLiveTideKeyUI('Stormglass API key cleared.');
    if (liveTideStatus) liveTideStatus.textContent = '';
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSettingsDrawer();
        closeSavedRoutesModal();
        closeActionMenu();
    }
});

if (routeEditToggleBtn) {
    routeEditToggleBtn.addEventListener('click', () => {
        routeEditingEnabled = !routeEditingEnabled;
        if (routeEditingEnabled && drawer) {
            drawerStateIndex = 0;
            setDrawerHeight(getSnapHeight('collapsed'), true);
        }
        updateRouteEditUI();
    });
}

if (deleteWaypointBtn) {
    deleteWaypointBtn.addEventListener('click', deleteSelectedWaypoint);
}

if (drawerHandle) {
    let drawerPointerStartY = 0;
    let drawerPointerMoved = false;

    drawerHandle.addEventListener('pointerdown', (e) => {
        drawerDragging = true;
        drawerPointerMoved = false;
        drawerPointerStartY = e.clientY;
        drawerHandle.setPointerCapture(e.pointerId);
    });

    drawerHandle.addEventListener('pointermove', (e) => {
        if (!drawerDragging) return;
        if (Math.abs(e.clientY - drawerPointerStartY) > 6) drawerPointerMoved = true;
        const newHeight = window.innerHeight - e.clientY;
        setDrawerHeight(newHeight);
    });

    drawerHandle.addEventListener('pointerup', () => {
        if (!drawerDragging) return;
        drawerDragging = false;

        if (!drawerPointerMoved) {
            const current = parseFloat(getComputedStyle(drawer).height);
            const collapsed = getSnapHeight('collapsed');
            const middle = getSnapHeight('middle');
            const target = current <= collapsed + 4 ? middle : collapsed;
            setDrawerHeight(target, true);
            return;
        }

        const current = parseFloat(getComputedStyle(drawer).height);
        snapDrawerToNearest(current);
    });
}

window.addEventListener('resize', () => {
    syncHeaderInset();
    setDrawerHeight(getSnapHeight(drawerStateOrder[drawerStateIndex]), true);
    updateRoute();
});

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

if (locateBtn) locateBtn.addEventListener('click', useLocation);
if (actionMenuBtn) actionMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleActionMenu(); });
if (actionMenuCurrentLocation) actionMenuCurrentLocation.addEventListener('click', () => { useLocation(); closeActionMenu(); });
if (actionMenuLiveWind) actionMenuLiveWind.addEventListener('click', async () => { closeActionMenu(); await applyLiveWind(); });
if (actionMenuLiveTide) actionMenuLiveTide.addEventListener('click', async () => { closeActionMenu(); await applyLiveTide(); });
if (actionMenuSaveRoute) actionMenuSaveRoute.addEventListener('click', saveCurrentRoute);
if (actionMenuLoadRoute) actionMenuLoadRoute.addEventListener('click', loadSavedRoute);
document.addEventListener('click', (e) => {
    if (!actionMenu || actionMenu.classList.contains('hidden')) return;
    if (actionMenu.contains(e.target) || actionMenuBtn?.contains(e.target)) return;
    closeActionMenu();
});

if (autoSplitLegsInput) {
    autoSplitLegsInput.addEventListener('change', () => {
        autoSplitLegsEnabled = autoSplitLegsInput.checked;
        clearActiveConditionEditor();
        updateRoute();
    });
}

if (boatSpeedInput) boatSpeedInput.addEventListener('input', updateRoute);
if (defaultWindDirInput) defaultWindDirInput.addEventListener('input', updateDefaultsFromSettings);
if (defaultWindSpeedInput) defaultWindSpeedInput.addEventListener('input', updateDefaultsFromSettings);
if (defaultTideDirInput) defaultTideDirInput.addEventListener('input', updateDefaultsFromSettings);
if (defaultTideSpeedInput) defaultTideSpeedInput.addEventListener('input', updateDefaultsFromSettings);
if (startLocationInput) startLocationInput.addEventListener('input', updateDefaultsFromSettings);
if (destinationInput) destinationInput.addEventListener('input', updateDefaultsFromSettings);

map.on('click', function (e) {
    if (!routeEditingEnabled) return;

    const marker = createWaypointMarker(e.latlng);
    waypoints.push(marker);

    selectedWaypointIndex = waypoints.length - 1;
    selectedLegIndex = -1;
    hideMapInfo();
    clearActiveConditionEditor();
    updateRoute();
});

activateTab('routePanel');
syncHeaderInset();
setDrawerHeight(getSnapHeight('middle'), true);
syncSettingsDrawerPosition();
updateOnlineStatus();
registerServiceWorker();
initLaunchSplash();
updateDefaultsFromSettings();
updateRouteEditUI();