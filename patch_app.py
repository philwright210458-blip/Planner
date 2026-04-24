# -*- coding: utf-8 -*-
from pathlib import Path
p=Path('app.js')
js=p.read_text()

def replace_between(text,start,end,new):
    a=text.index(start)
    b=text.index(end,a)
    return text[:a]+new+text[b:]

js=js.replace("const toastMessage = document.getElementById('toastMessage');\nconst liveTideKeyStatus = document.getElementById('liveTideKeyStatus');",
"const toastMessage = document.getElementById('toastMessage');\nconst liveTideKeyStatus = document.getElementById('liveTideKeyStatus');\nconst legEditorBackdrop = document.getElementById('legEditorBackdrop');\nconst legEditorSheet = document.getElementById('legEditorSheet');\nconst legEditorClose = document.getElementById('legEditorClose');\nconst legEditorCancel = document.getElementById('legEditorCancel');\nconst legEditorApply = document.getElementById('legEditorApply');\nconst legEditorBody = document.getElementById('legEditorBody');\nconst legEditorTitle = document.getElementById('legEditorTitle');\nconst legEditorSubtitle = document.getElementById('legEditorSubtitle');")

start = "function clearActiveConditionEditor() {\n    activeConditionEditor.key = null;\n    activeConditionEditor.kind = null;\n}\n"
insert = start + '''
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
                <label class="leg-editor-label" for="editorWindDir">Direction</label>
                <input id="editorWindDir" class="leg-editor-input" type="number" inputmode="numeric" step="1" value="${Math.round(leg.windDir)}">
                <label class="leg-editor-label" for="editorWindSpeed">Speed</label>
                <input id="editorWindSpeed" class="leg-editor-input" type="number" inputmode="decimal" step="0.1" value="${windSpeedText}">
            </div>
            <div class="leg-editor-group ${focusKind === 'tide' ? 'focused' : ''}">
                <div class="leg-editor-group-title">Tide</div>
                <label class="leg-editor-label" for="editorTideDir">Direction</label>
                <input id="editorTideDir" class="leg-editor-input" type="number" inputmode="numeric" step="1" value="${Math.round(leg.tideDir)}">
                <label class="leg-editor-label" for="editorTideSpeed">Speed</label>
                <input id="editorTideSpeed" class="leg-editor-input" type="number" inputmode="decimal" step="0.1" value="${tideSpeedText}">
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
    setLegConditionValue('wind', leg.key, 'dir', document.getElementById('editorWindDir')?.value);
    setLegConditionValue('wind', leg.key, 'speed', document.getElementById('editorWindSpeed')?.value);
    setLegConditionValue('tide', leg.key, 'dir', document.getElementById('editorTideDir')?.value);
    setLegConditionValue('tide', leg.key, 'speed', document.getElementById('editorTideSpeed')?.value);
    if (isCompactEditorMode()) closeLegEditorSheet();
    clearActiveConditionEditor();
    updateRoute();
}
'''
js = js.replace(start, insert)

js = replace_between(js, "function openConditionEditor(kind, key, legIndex) {", "function clearArrowMarkers() {", '''function openConditionEditor(kind, key, legIndex) {
    selectedLegIndex = legIndex;
    selectedWaypointIndex = -1;
    setActiveConditionEditor(kind, key);
    expandedFamilySource = familyHasChildren(currentLegData[legIndex]?.sourceSegmentIndex)
        ? currentLegData[legIndex]?.sourceSegmentIndex
        : expandedFamilySource;
    if (drawer) {
        const currentHeight = parseFloat(getComputedStyle(drawer).height) || 0;
        const targetHeight = Math.max(currentHeight, getSnapHeight('middle'));
        setDrawerHeight(targetHeight, true);
    }
    updateRoute();
    if (isCompactEditorMode()) {
        openLegEditorSheet();
    } else {
        requestAnimationFrame(() => {
            selectedLegCard?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const focusId = kind === 'tide' ? 'editorTideDir' : 'editorWindDir';
            const input = document.getElementById(focusId);
            if (input) {
                input.focus();
                input.select();
            }
        });
    }
}

''')

js = replace_between(js, "function renderRoutePreview(totalDistance = null, totalHours = null) {", "function renderWorkspaceSummary", '''function renderRoutePreview(totalDistance = null, totalHours = null) {
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

''')

js = replace_between(js, "function renderSelectedLegCard(totalDistance = null, totalHours = null) {", "function toggleSelectedLegFamilyFromCard() {", '''function renderSelectedLegCard(totalDistance = null, totalHours = null) {
    if (!selectedLegCardContent || !selectedLegCard) return;

    const leg = getActiveEditorLeg();
    const showDesktopEditor = !isCompactEditorMode() && !!leg && !!activeConditionEditor.key;

    if (!showDesktopEditor) {
        selectedLegCard.style.display = 'none';
        selectedLegCardContent.innerHTML = '';
        return;
    }

    selectedLegCard.style.display = '';
    selectedLegCard.classList.remove('selected-leg-card-empty');
    const canExpandFamily = familyHasChildren(leg.sourceSegmentIndex);
    const warningsHtml = renderWarningsHtml(leg.warnings || []);

    selectedLegCardContent.innerHTML = `
        <div class="selected-leg-card-header">
            <div>
                <div class="selected-leg-card-kicker">Edit local conditions</div>
                <div class="selected-leg-card-title">Leg ${escapeHtml(leg.label)} conditions</div>
                <div class="selected-leg-card-subtitle">Waypoint ${leg.sourceSegmentIndex + 1} → Waypoint ${leg.sourceSegmentIndex + 2} • ${leg.status}</div>
            </div>
            <div class="selected-leg-status">${renderStatus(leg.status)}</div>
        </div>
        <div class="selected-leg-grid selected-leg-grid-compact">
            <div class="selected-leg-metric"><div class="selected-leg-metric-label">Track</div><div class="selected-leg-metric-value">${leg.track.toFixed(1)}°</div></div>
            <div class="selected-leg-metric"><div class="selected-leg-metric-label">CTS</div><div class="selected-leg-metric-value">${leg.cts.toFixed(1)}°</div></div>
            <div class="selected-leg-metric"><div class="selected-leg-metric-label">Distance</div><div class="selected-leg-metric-value">${leg.distance.toFixed(2)} NM</div></div>
            <div class="selected-leg-metric"><div class="selected-leg-metric-label">Duration</div><div class="selected-leg-metric-value">${formatDurationHours(leg.hours)}</div></div>
        </div>
        ${warningsHtml}
        ${renderLegEditorFields(leg)}
        <div class="selected-leg-actions">
            <button type="button" class="ghost compact selected-leg-action primary" onclick="applyLegEditorChanges()">Apply changes</button>
            <button type="button" class="ghost compact selected-leg-action" onclick="closeConditionEditor()">Done</button>
            ${canExpandFamily ? `<button type="button" class="ghost compact selected-leg-action" onclick="toggleSelectedLegFamilyFromCard()">${expandedFamilySource === leg.sourceSegmentIndex ? 'Collapse Family' : 'Expand Family'}</button>` : ''}
        </div>
    `;
}

''')

js = replace_between(js, "function renderConditionPill(kind, key, dir, speed, legIndex) {", "function renderConditionEditor", '''function renderConditionPill(kind, key, dir, speed, legIndex) {
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

''')

js = js.replace("""                <td>${
                    isConditionEditorActive('wind', displayLeg.key)
                        ? renderConditionEditor('wind', displayLeg.key, wind.dir, wind.speed)
                        : renderConditionPill('wind', displayLeg.key, wind.dir, wind.speed, i)
                }</td>
                <td>${
                    isConditionEditorActive('tide', displayLeg.key)
                        ? renderConditionEditor('tide', displayLeg.key, tide.dir, tide.speed)
                        : renderConditionPill('tide', displayLeg.key, tide.dir, tide.speed, i)
                }</td>""", """                <td>${renderConditionPill('wind', displayLeg.key, wind.dir, wind.speed, i)}</td>
                <td>${renderConditionPill('tide', displayLeg.key, tide.dir, tide.speed, i)}</td>""")
js = js.replace("if (e.target.closest('input') || e.target.closest('.cond-editor') || e.target.closest('.cond-pill')) return;", "if (e.target.closest('input') || e.target.closest('.cond-pill')) return;")
js = replace_between(js, "function closeConditionEditor() {", "window.changeWind = changeWind;", '''function closeConditionEditor() {
    clearActiveConditionEditor();
    closeLegEditorSheet();
    updateRoute();
}

''')
js = js.replace("window.deleteSelectedWaypoint = deleteSelectedWaypoint;", "window.deleteSelectedWaypoint = deleteSelectedWaypoint;\nwindow.applyLegEditorChanges = applyLegEditorChanges;")
js = js.replace("if (savedRoutesClose) savedRoutesClose.addEventListener('click', closeSavedRoutesModal);", "if (savedRoutesClose) savedRoutesClose.addEventListener('click', closeSavedRoutesModal);\nif (legEditorClose) legEditorClose.addEventListener('click', closeConditionEditor);\nif (legEditorCancel) legEditorCancel.addEventListener('click', closeConditionEditor);\nif (legEditorApply) legEditorApply.addEventListener('click', applyLegEditorChanges);\nif (legEditorBackdrop) legEditorBackdrop.addEventListener('click', closeConditionEditor);")
if "window.addEventListener('resize'" not in js:
    js += "\nwindow.addEventListener('resize', () => { if (!isCompactEditorMode()) closeLegEditorSheet(); });\n"
p.write_text(js)
print('ok')
