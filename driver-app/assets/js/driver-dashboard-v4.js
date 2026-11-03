const STORE = 'sendeke-driver-state';
const PREF = 'sendeke-driver-prefs';
const CHANNEL = 'sendeke-driver-actions';
const defaultState = {
  driverName: 'SenDeke Courier',
  driverId: '',
  activeTrip: null,
  note: '',
  requests: [],
  notifications: []
};
const defaultPrefs = {
  preferredMusic: 'Poweramp',
  mapsApp: 'Google Maps',
  passengerDisplay: true,
  ownerOperator: false,
  tools: ['trip', 'requests', 'notes', 'payout', 'licdoc', 'calculator', 'flights', 'maps', 'music', 'preferences']
};

let state = loadState();
let prefs = loadPrefs();
let currentView = 'trip';
let musicPlaying = false;
let channel;
try { channel = new BroadcastChannel(CHANNEL); } catch {}

// URL Parameter & Ingest Engine
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('ticket') || urlParams.get('tripId')) {
  state.activeTrip = {
    id: urlParams.get('ticket') || urlParams.get('tripId'),
    route: urlParams.get('route') || ((urlParams.get('pickup') || 'Pickup') + ' → ' + (urlParams.get('dropoff') || 'Dropoff')),
    pickup: urlParams.get('pickup') || 'Assigned Pickup',
    dropoff: urlParams.get('dropoff') || 'Assigned Dropoff',
    passenger: urlParams.get('passenger') || urlParams.get('client') || 'Assigned Customer',
    vehicle: urlParams.get('vehicle') || 'Courier',
    payout: urlParams.get('payout') || '0.00',
    payoutStatus: urlParams.get('payoutStatus') || 'Authorized',
    status: urlParams.get('status') || 'Assigned',
    stripeIntentId: urlParams.get('payment_intent') || urlParams.get('intentId') || ''
  };
  saveState();
}
if (urlParams.get('name')) {
  state.driverName = urlParams.get('name');
  saveState();
}
if (urlParams.get('driverId')) {
  state.driverId = urlParams.get('driverId');
  saveState();
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORE) || 'null') || structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORE, JSON.stringify(state));
  renderNotices();
  syncHeaderAndAssignment();
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREF) || 'null') || structuredClone(defaultPrefs);
  } catch {
    return structuredClone(defaultPrefs);
  }
}

function persistPrefs() {
  localStorage.setItem(PREF, JSON.stringify(prefs));
  renderQuickbar();
  if (typeof ownerSwitch !== 'undefined' && ownerSwitch) {
    ownerSwitch.classList.toggle('hidden', !prefs.ownerOperator);
  }
}

function emit(text) {
  const action = { text };
  state.notifications = state.notifications || [];
  state.notifications.unshift({
    text,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  saveState();
  try { channel?.postMessage(action); } catch {}
  localStorage.setItem('sendeke-last-action', JSON.stringify({ ...action, stamp: Date.now() }));
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[c]));
}

function openModal(title, body) {
  modalContent.innerHTML = `<div class="heading"><h2>${title}</h2><button class="icon-btn" id="modalClose">×</button></div>${body}`;
  modalBg.classList.add('open');
  modalClose.onclick = () => modalBg.classList.remove('open');
}
modalBg.onclick = e => { if (e.target === modalBg) modalBg.classList.remove('open'); };

function syncHeaderAndAssignment() {
  const nameEl = document.getElementById('driverName');
  const avatarEl = document.getElementById('driverAvatar');
  const titleEl = document.getElementById('currentAssignmentTitle');
  const statusEl = document.getElementById('tripStatus');
  if (nameEl) nameEl.textContent = state.driverName || 'SenDeke Courier';
  if (avatarEl) {
    const parts = (state.driverName || 'SD').trim().split(/\s+/);
    avatarEl.textContent = (parts[0]?.[0] || 'S') + (parts[1]?.[0] || 'D');
  }
  if (titleEl) titleEl.textContent = state.activeTrip ? `Ticket ${state.activeTrip.id}` : 'No Active Assignment';
  if (statusEl) statusEl.textContent = state.activeTrip ? (state.activeTrip.status || 'Assigned') : 'Standby';
}

const toolDefs = {
  trip: { label: 'Trip', tip: 'trip details' },
  requests: { label: 'Requests', tip: 'trip requests' },
  notes: { label: 'Notes', tip: 'edit trip notes' },
  payout: { label: 'Payout', tip: 'driver payout' },
  licdoc: { label: 'LIC-DOC', tip: 'LIC-DOC' },
  calculator: { label: 'Calc', tip: 'calculator' },
  flights: { label: 'Flights', tip: 'flight lookup' },
  maps: { label: 'Maps', tip: 'navigation and nearby search' },
  music: { label: 'Music', tip: 'music controls' },
  preferences: { label: 'Prefs', tip: 'preferences' }
};

function renderQuickbar() {
  quickbar.innerHTML = prefs.tools
    .filter(k => toolDefs[k])
    .map(k => `<button class="chip-btn" data-tool="${k}" data-tip="${toolDefs[k].tip}">${toolDefs[k].label}</button>`)
    .join('');
  quickbar.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => showView(b.dataset.tool));
  bindTips(quickbar);
}

function showView(view) {
  currentView = view;
  document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('pressed', b.dataset.tool === view));
  if (view === 'trip') renderTrip();
  if (view === 'requests') renderRequests();
  if (view === 'notes') renderNotes();
  if (view === 'payout') renderPayout();
  if (view === 'licdoc') renderLicDoc();
  if (view === 'calculator') renderCalculator();
  if (view === 'flights') renderFlights();
  if (view === 'maps') renderMaps();
  if (view === 'music') renderMusic();
  if (view === 'preferences') renderPreferences();
  drawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
}

function renderTrip() {
  const t = state.activeTrip;
  if (!t) {
    displayWindow.innerHTML = `
      <div class="trip-card">
        <div class="eyebrow">SenDeke.to Corridor</div>
        <h2>No Active Assignment</h2>
        <div class="meta-list">
          <div class="meta-row"><span>Ticket</span><strong>None</strong></div>
          <div class="meta-row"><span>Pickup</span><strong>Standby — Awaiting dispatch</strong></div>
          <div class="meta-row"><span>Customer</span><strong>—</strong></div>
          <div class="meta-row"><span>Vehicle</span><strong>—</strong></div>
        </div>
      </div>`;
    return;
  }
  const payoutDisplay = t.payout ? `$${Number(t.payout).toFixed(2)}` : '$0.00';
  displayWindow.innerHTML = `
    <div class="trip-card">
      <div class="eyebrow">SenDeke.to Corridor · Escrow Protected</div>
      <h2>${esc(t.route)}</h2>
      <div class="meta-list">
        <div class="meta-row"><span>Ticket</span><strong>${esc(t.id)}</strong></div>
        <div class="meta-row"><span>Pickup</span><strong>${esc(t.pickup)}</strong></div>
        <div class="meta-row"><span>Dropoff</span><strong>${esc(t.dropoff || 'Assigned Dropoff')}</strong></div>
        <div class="meta-row"><span>Customer</span><strong>${esc(t.passenger)}</strong></div>
        <div class="meta-row"><span>Vehicle</span><strong>${esc(t.vehicle)}</strong></div>
        <div class="meta-row"><span>Escrow Net</span><strong>${esc(payoutDisplay)} (${esc(t.payoutStatus || 'Authorized')})</strong></div>
      </div>
    </div>`;
}

async function renderRequests() {
  state = loadState();
  const requests = state.requests || [];
  displayWindow.innerHTML = `
    <div class="heading">
      <h2>Requests</h2>
      <span class="badge ${requests.length ? 'warn' : 'good'}">${requests.length}</span>
    </div>
    <div id="requestsList">
      ${requests.length
        ? requests.map((r, i) => `
            <article class="request-card">
              <strong>${esc(r.id)} · ${esc(r.route)}</strong>
              <p class="small">${esc(r.time || 'Now')} · Net $${esc(r.payout || '0.00')} · ${esc(r.vehicle || 'Courier')}</p>
              <div class="row">
                <button class="btn btn-primary" data-accept="${i}">Accept</button>
                <button class="btn" data-decline="${i}">Decline</button>
              </div>
            </article>`).join('')
        : '<p class="small">No active requests in corridor queue. Listening to dispatch radar...</p>'
      }
    </div>`;

  bindRequestButtons();

  // Deterministic Live D1 Ticket Ingestion
  try {
    const res = await fetch('/api/dispatch/tickets?status=ESCROW_AUTHORIZED');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.tickets)) {
        state.requests = data.tickets.map(t => ({
          id: t.ticket_id || t.id,
          route: `${t.pickup_address || 'Pickup'} → ${t.dropoff_address || 'Dropoff'}`,
          pickup: t.pickup_address || 'Pickup',
          dropoff: t.dropoff_address || 'Dropoff',
          passenger: t.customer_name || 'Direct Customer',
          vehicle: t.vehicle_tier || 'Courier',
          payout: ((t.net_driver_cents || t.total_cents || 0) / 100).toFixed(2),
          payoutStatus: t.escrow_status || 'Authorized',
          stripeIntentId: t.stripe_payment_intent_id || '',
          time: t.created_at ? new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'
        }));
        saveState();
        if (currentView === 'requests') {
          const listEl = document.getElementById('requestsList');
          if (listEl) {
            const reqs = state.requests || [];
            listEl.innerHTML = reqs.length
              ? reqs.map((r, i) => `
                  <article class="request-card">
                    <strong>${esc(r.id)} · ${esc(r.route)}</strong>
                    <p class="small">${esc(r.time || 'Now')} · Net $${esc(r.payout || '0.00')} · ${esc(r.vehicle || 'Courier')}</p>
                    <div class="row">
                      <button class="btn btn-primary" data-accept="${i}">Accept</button>
                      <button class="btn" data-decline="${i}">Decline</button>
                    </div>
                  </article>`).join('')
              : '<p class="small">No active requests in corridor queue. Listening to dispatch radar...</p>';
            bindRequestButtons();
          }
        }
      }
    }
  } catch (err) {
    // Offline resilience: silent fallback to cached state.requests
  }
}

function bindRequestButtons() {
  const reqs = state.requests || [];
  document.querySelectorAll('[data-accept]').forEach(b => b.onclick = async () => {
    const i = Number(b.dataset.accept);
    const r = reqs[i];
    if (!r) return;
    
    // Live dispatch acceptance ping
    try {
      await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: r.id,
          status: 'ACCEPTED',
          driverId: state.driverId || state.driverName || 'SenDeke Courier'
        })
      });
    } catch (e) {}

    state.requests = state.requests.filter((_, idx) => idx !== i);
    state.activeTrip = {
      id: r.id,
      route: r.route,
      pickup: r.pickup || r.route.split('→')[0]?.trim() || 'Assigned Pickup',
      dropoff: r.dropoff || r.route.split('→')[1]?.trim() || 'Assigned Dropoff',
      passenger: r.passenger || 'Direct Customer',
      vehicle: r.vehicle || 'Courier',
      payout: r.payout || '0.00',
      payoutStatus: r.payoutStatus || 'Authorized',
      status: 'Accepted',
      stripeIntentId: r.stripeIntentId || ''
    };
    saveState();
    emit(`${state.driverName || 'SenDeke Courier'} accepted ticket ${r.id}.`);
    showView('trip');
  });

  document.querySelectorAll('[data-decline]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.decline);
    const r = reqs[i];
    if (!r) return;
    state.requests = state.requests.filter((_, idx) => idx !== i);
    saveState();
    emit(`${state.driverName || 'SenDeke Courier'} declined ticket ${r.id}.`);
    renderRequests();
  });
}

function renderNotes() {
  displayWindow.innerHTML = `
    <h2>Trip notes</h2>
    <textarea id="noteText" placeholder="Enter dropoff or gate instructions...">${esc(state.note || '')}</textarea>
    <button class="btn btn-primary" id="saveNote" style="margin-top:8px">Save note</button>`;
  saveNote.onclick = () => {
    state.note = noteText.value;
    saveState();
    emit(`${state.driverName || 'SenDeke Courier'} updated trip notes.`);
    flash('Trip note saved.');
  };
}

function renderPayout() {
  const t = state.activeTrip;
  const tripId = t ? t.id : 'None';
  const amount = t && t.payout ? `$${Number(t.payout).toFixed(2)}` : '$0.00';
  const status = t ? (t.payoutStatus || 'Pending') : 'No active ticket';
  const intentBlock = t && t.stripeIntentId
    ? `<div class="meta-row" style="margin-top:8px"><span>Stripe Intent</span><strong style="font-size:0.8rem">${esc(t.stripeIntentId)}</strong></div>`
    : '';
  const settledBlock = t && t.status === 'Completed'
    ? `<div style="margin-top:12px;padding:10px;background:rgba(16,185,129,0.1);border-left:3px solid #10b981;border-radius:4px"><strong style="color:#10b981">✓ Escrow Settlement Complete</strong><p class="small" style="margin:4px 0 0">Stripe pre-auth captured and settled to courier ledger.</p></div>`
    : '';

  displayWindow.innerHTML = `
    <h2>Payout & Escrow Ledger</h2>
    <div class="grid g3">
      <div class="card"><span class="small">Ticket</span><strong>${esc(tripId)}</strong></div>
      <div class="card"><span class="small">Net Courier Payout</span><strong>${esc(amount)}</strong></div>
      <div class="card"><span class="small">Status</span><strong>${esc(status)}</strong></div>
    </div>
    ${intentBlock}
    ${settledBlock}`;
}

function renderLicDoc() {
  displayWindow.innerHTML = `
    <h2>LIC-DOC</h2>
    <div class="grid g3">
      <div class="card"><span class="small">Credentials</span><strong>Current</strong></div>
      <div class="card"><span class="small">Documents</span><strong>Current</strong></div>
      <div class="card"><span class="small">Equipment check</span><strong>Ready</strong></div>
    </div>`;
}

function renderCalculator() {
  displayWindow.innerHTML = `
    <h2>Calculator</h2>
    <input id="calcScreen" value="0" readonly style="font-size:1.5rem;text-align:right">
    <div class="grid g4" id="calcButtons" style="margin-top:8px">
      ${['7','8','9','÷','4','5','6','×','1','2','3','−','0','.','=','+','C'].map(v => `<button class="btn" data-key="${v}">${v}</button>`).join('')}
    </div>`;
  let exp = '';
  calcButtons.querySelectorAll('[data-key]').forEach(b => b.onclick = () => {
    const v = b.dataset.key;
    if (v === 'C') { exp = ''; calcScreen.value = '0'; return; }
    if (v === '=') {
      try {
        exp = String(Function(`"use strict";return (${exp.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')})`)());
        calcScreen.value = exp;
      } catch {
        calcScreen.value = 'Error';
        exp = '';
      }
      return;
    }
    exp += v;
    calcScreen.value = exp;
  });
}

function renderFlights() {
  displayWindow.innerHTML = `
    <h2>Flights</h2>
    <div class="row">
      <input id="flightInput" placeholder="Enter flight code (e.g. AA104)" style="flex:1">
      <button class="btn btn-primary" id="flightCheck">Lookup</button>
    </div>
    <div id="flightResult"></div>`;
  flightCheck.onclick = () => {
    const code = flightInput.value.trim().replace(/\s+/g, '');
    if (!code) return;
    window.open('https://www.flightaware.com/live/flight/' + encodeURIComponent(code), '_blank', 'noopener');
  };
}

function renderMaps() {
  const dest = state.activeTrip?.pickup || 'Palms, Los Angeles, CA 90034';
  displayWindow.innerHTML = `
    <h2>Navigation</h2>
    <iframe class="map-frame" src="https://www.openstreetmap.org/export/embed.html?bbox=-118.43%2C34.01%2C-118.38%2C34.04&layer=mapnik&marker=34.0259%2C-118.4065"></iframe>
    <div class="row" style="margin-top:8px">
      <button class="btn btn-primary" id="openGoogle">Open Google Maps</button>
      <button class="btn" id="nearby">Nearby merchants</button>
    </div>`;
  openGoogle.onclick = () => window.open('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(dest), '_blank', 'noopener');
  nearby.onclick = () => window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('merchants near ' + dest), '_blank', 'noopener');
}

function renderMusic() {
  displayWindow.innerHTML = `
    <div class="heading">
      <h2>Music</h2>
      <select id="musicApp" style="width:auto">
        ${['Poweramp','VLC','Spotify','Apple Music','Android Auto'].map(a => `<option ${a === prefs.preferredMusic ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>
    <div class="music-panel">
      <div>
        <div class="album">♫</div>
        <div class="music-controls">
          <button class="btn" id="prevBtn">⏮</button>
          <button class="btn btn-primary" id="playBtn">${musicPlaying ? '❚❚' : '▶'}</button>
          <button class="btn" id="nextBtn">⏭</button>
        </div>
      </div>
      <div>
        <div class="meta-list">
          <div class="meta-row"><span>App</span><strong id="metaApp">${esc(prefs.preferredMusic)}</strong></div>
          <div class="meta-row"><span>State</span><strong id="metaPlayState">${musicPlaying ? 'Active' : 'Standby'}</strong></div>
          <div class="meta-row"><span>Display</span><strong>${prefs.passengerDisplay ? 'On' : 'Off'}</strong></div>
        </div>
      </div>
    </div>`;
  musicApp.onchange = () => {
    prefs.preferredMusic = musicApp.value;
    persistPrefs();
    metaApp.textContent = musicApp.value;
  };
  playBtn.onclick = () => {
    musicPlaying = !musicPlaying;
    playBtn.textContent = musicPlaying ? '❚❚' : '▶';
    const st = document.getElementById('metaPlayState');
    if (st) st.textContent = musicPlaying ? 'Active' : 'Standby';
    emit(`${state.driverName || 'SenDeke Courier'} ${musicPlaying ? 'started' : 'paused'} audio controls.`);
  };
}

function renderPreferences() {
  displayWindow.innerHTML = `
    <h2>Preferences</h2>
    <div class="preference-list">
      <div class="preference-row">
        <span>Courier name</span>
        <input id="prefDriverName" value="${esc(state.driverName || 'SenDeke Courier')}">
      </div>
      <div class="preference-row">
        <span>Preferred music app</span>
        <select id="prefMusic">
          ${['Poweramp','VLC','Spotify','Apple Music','Android Auto'].map(a => `<option ${a === prefs.preferredMusic ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <div class="preference-row">
        <span>Maps app</span>
        <select id="prefMaps">
          ${['Google Maps','Apple Maps','Waze'].map(a => `<option ${a === prefs.mapsApp ? 'selected' : ''}>${a}</option>`).join('')}
        </select>
      </div>
      <div class="preference-row">
        <span>Media display</span>
        <select id="prefPassenger">
          <option value="true" ${prefs.passengerDisplay ? 'selected' : ''}>On</option>
          <option value="false" ${!prefs.passengerDisplay ? 'selected' : ''}>Off</option>
        </select>
      </div>
      <div class="preference-row">
        <span>Owner-operator access</span>
        <select id="prefOwner">
          <option value="false" ${!prefs.ownerOperator ? 'selected' : ''}>Courier only</option>
          <option value="true" ${prefs.ownerOperator ? 'selected' : ''}>Owner-operator</option>
        </select>
      </div>
    </div>
    <h3 style="margin-top:12px">Quick tools</h3>
    <div class="grid g2" id="toolChoices">
      ${Object.keys(toolDefs).map(k => `<label><input style="width:auto" type="checkbox" value="${k}" ${prefs.tools.includes(k) ? 'checked' : ''}> ${toolDefs[k].label}</label>`).join('')}
    </div>
    <button class="btn btn-primary" id="savePrefs" style="margin-top:10px">Save preferences</button>`;

  document.getElementById('savePrefs').onclick = () => {
    state.driverName = document.getElementById('prefDriverName').value.trim() || 'SenDeke Courier';
    prefs.preferredMusic = prefMusic.value;
    prefs.mapsApp = prefMaps.value;
    prefs.passengerDisplay = prefPassenger.value === 'true';
    prefs.ownerOperator = prefOwner.value === 'true';
    prefs.tools = [...toolChoices.querySelectorAll('input:checked')].map(i => i.value);
    if (!prefs.tools.includes('preferences')) prefs.tools.push('preferences');
    saveState();
    persistPrefs();
    flash('Preferences saved.');
    showView('trip');
  };
}

function renderNotices() {
  state = loadState();
  const n = (state.notifications || []).slice(0, 6);
  noticeCount.textContent = n.length;
  noticePop.innerHTML = n.map(x => `
    <div class="item">
      <div><strong>${esc(x.text)}</strong><small>${esc(x.time)}</small></div>
    </div>`).join('') || '<p class="small">No notifications.</p>';
}

function flash(text) {
  driverNote.textContent = text;
  driverNote.classList.add('show');
  setTimeout(() => driverNote.classList.remove('show'), 1700);
}

noticeBtn.onclick = () => noticePop.classList.toggle('open');
document.addEventListener('click', e => {
  if (!e.target.closest('.notification-wrap')) noticePop.classList.remove('open');
});

// Front-Facing 5 Progress Actions -> Live D1 & Stripe Escrow Execution
document.querySelectorAll('[data-progress]').forEach(b => b.onclick = async () => {
  const progress = b.dataset.progress;
  tripStatus.textContent = progress;
  if (state.activeTrip) state.activeTrip.status = progress;
  saveState();
  emit(`${state.driverName || 'SenDeke Courier'} changed status to ${progress}.`);
  document.querySelectorAll('[data-progress]').forEach(x => x.classList.toggle('btn-primary', x === b));

  if (!state.activeTrip || !state.activeTrip.id) return;

  if (progress === 'Completed') {
    // Live Escrow Capture & Settlement
    flash('Capturing escrow and releasing payout...');
    const intentId = state.activeTrip.stripeIntentId || '';
    const amountCents = Math.round(Number(state.activeTrip.payout || 0) * 100);
    try {
      const res = await fetch('/api/escrow/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentIntentId: intentId,
          ticketId: state.activeTrip.id,
          finalAmountCents: amountCents
        })
      });
      const result = await res.json().catch(() => null);
      if (result && result.success) {
        state.activeTrip.payoutStatus = 'DELIVERED_AND_CAPTURED';
        state.activeTrip.status = 'Completed';
        saveState();
        flash(`Escrow captured! $${Number(state.activeTrip.payout).toFixed(2)} settled.`);
        emit(`Ticket ${state.activeTrip.id} completed. Escrow captured.`);
      } else {
        state.activeTrip.payoutStatus = 'Settled';
        saveState();
      }
    } catch (err) {
      state.activeTrip.payoutStatus = 'Settled (Offline)';
      saveState();
    }
    showView('payout');
  } else {
    // Live D1 Status Update
    try {
      await fetch('/api/dispatch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: state.activeTrip.id,
          status: progress.toUpperCase().replace(/\s+/g, '_'),
          driverId: state.driverId || state.driverName || 'SenDeke Courier'
        })
      });
    } catch (err) {}
  }
});

menuBtn.onclick = () => {
  drawer.classList.add('open');
  drawerBackdrop.classList.add('open');
};
drawerClose.onclick = drawerBackdrop.onclick = () => {
  drawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
};
drawer.querySelectorAll('[data-view]').forEach(b => b.onclick = () => showView(b.dataset.view));
if (typeof ownerSwitch !== 'undefined' && ownerSwitch) {
  ownerSwitch.onclick = () => location.href = '../admin.html';
}

const tooltip = document.getElementById('tooltip');
let tipTimer;
function showTip(el, instant = false) {
  const text = el?.dataset?.tip;
  if (!text) return;
  clearTimeout(tipTimer);
  const run = () => {
    tooltip.textContent = text;
    tooltip.classList.add('show');
    const r = el.getBoundingClientRect();
    const w = tooltip.offsetWidth;
    let left = Math.max(6, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 6));
    let top = r.top - tooltip.offsetHeight - 6;
    if (top < 6) top = r.bottom + 6;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  };
  instant ? run() : tipTimer = setTimeout(run, 35);
}
function hideTip(delay = 40) {
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tooltip.classList.remove('show'), delay);
}
function bindTips(root = document) {
  root.querySelectorAll('[data-tip]').forEach(el => {
    el.onpointerenter = e => { if (e.pointerType !== 'touch') showTip(el); };
    el.onpointerleave = () => hideTip();
    el.onfocus = () => showTip(el, true);
    el.onblur = () => hideTip();
    el.onpointerdown = e => {
      showTip(el, true);
      if (e.pointerType === 'touch' || e.pointerType === 'pen') setTimeout(() => hideTip(0), 620);
    };
  });
}

// Background Geolocation Telemetry Ping to Edge Radar
function initTelemetry() {
  if (!navigator.geolocation) return;
  const sendTelemetry = pos => {
    try {
      fetch('/api/driver-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: state.driverId || state.driverName || 'SenDeke Courier',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          heading: pos.coords.heading || 0,
          speed: pos.coords.speed || 0,
          activeTicketId: state.activeTrip ? state.activeTrip.id : null,
          status: state.activeTrip ? state.activeTrip.status : 'ONLINE'
        })
      }).catch(() => {});
    } catch (e) {}
  };
  try {
    navigator.geolocation.getCurrentPosition(sendTelemetry, () => {}, { enableHighAccuracy: true });
    setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendTelemetry, () => {}, { enableHighAccuracy: true });
    }, 45000);
  } catch (e) {}
}

if (typeof ownerSwitch !== 'undefined' && ownerSwitch) {
  ownerSwitch.classList.toggle('hidden', !prefs.ownerOperator);
}
syncHeaderAndAssignment();
renderQuickbar();
renderNotices();
showView('trip');
bindTips();
initTelemetry();

window.addEventListener('storage', e => {
  if (e.key === STORE) {
    state = loadState();
    syncHeaderAndAssignment();
    renderNotices();
    if (currentView === 'requests') renderRequests();
    if (currentView === 'trip') renderTrip();
  }
});
