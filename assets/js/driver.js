import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import DriverNavigationConsole from "./driver-map.js";

(() => {
  'use strict';

  const DISPATCH_PHONE = '(310) 945-2378';
  const DISPATCH_PIN = '90034';
  const ADMIN_EMAIL = 'sendeke.to@gmail.com';
  const STATUS_STEPS = ['requested', 'accepted', 'heading_to_pickup', 'picked_up', 'delivering', 'completed'];
  const STATUS_LABELS = {
    requested: 'REQUESTED',
    accepted: 'ACCEPTED',
    heading_to_pickup: 'HEADING TO PICKUP',
    picked_up: 'PICKED UP',
    delivering: 'OUT FOR DELIVERY',
    completed: 'DELIVERED',
    cancelled: 'CANCELLED'
  };

  let state = {
    driverOnline: true,
    capacity: 3,
    serviceArea: 'West L.A. / Culver City (90034)',
    queueFilter: 'active',
    tickets: [],
    isGpsBroadcasting: false,
    gpsWatchId: null
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  function showToast(message) {
    const el = $('#toastMessage');
    if (el) el.textContent = message;
    const toastEl = $('#appToast');
    if (toastEl && window.bootstrap) {
      bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }
  }

  function makeTicketId() {
    const fragment = Date.now().toString(36).slice(-5).toUpperCase();
    return `SDK-${fragment}`;
  }

  function getActiveTickets() {
    return state.tickets.filter(ticket => !['completed', 'cancelled'].includes(ticket.status));
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  const ADMIN_EMAILS = [
    'shynetyme@gmail.com',
    'sendeke.to@gmail.com',
    'shynetyme.works@gmail.com',
    'deke@sendeketo.com',
    'transxlimo@gmail.com'
  ];

  // --- Auth Management ---
  function unlockDashboard(userName = 'Deke') {
    $('#driverAuthGate')?.classList.add('d-none');
    $('#driverMainContent')?.classList.remove('d-none');
    $('#driverNavControls')?.classList.remove('d-none');
    $('#driverNavToggler')?.classList.remove('d-none');
    showToast(`Welcome back, ${userName}. Live dispatch ready.`);
    if (typeof initInlineMap === 'function') {
      setTimeout(initInlineMap, 150);
    }
  }

  function lockDashboard() {
    $('#driverAuthGate')?.classList.remove('d-none');
    $('#driverMainContent')?.classList.add('d-none');
    $('#driverNavControls')?.classList.add('d-none');
    $('#driverNavToggler')?.classList.add('d-none');
    localStorage.removeItem('sendeke_pin_unlocked');
    sessionStorage.removeItem('sendeke_pin_unlocked');
  }

  // Check if previously unlocked in session via PIN
  if (sessionStorage.getItem('sendeke_pin_unlocked') === 'true' || localStorage.getItem('sendeke_pin_unlocked') === 'true') {
    unlockDashboard('Courier');
  }

  // Wire Stripe Issuing Card Quick Actions
  const handleCopyCard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText('7135').then(() => {
        showToast('Copied fleet card last 4 (7135) to clipboard!');
      }).catch(() => {
        showToast('Card: •••• 7135 (Dedric Alexander)');
      });
    } else {
      showToast('Card: •••• 7135 (Dedric Alexander)');
    }
  };
  $('#copyCardLast4Btn')?.addEventListener('click', handleCopyCard);
  $('#modalCopyLast4Btn')?.addEventListener('click', handleCopyCard);

  // Process OAuth redirect result (smooth fallback from popup blockers, COOP, or mobile Safari)
  getRedirectResult(auth).then(result => {
    if (result && result.user) {
      const email = (result.user.email || '').toLowerCase();
      const isAuthorized = ADMIN_EMAILS.some(e => e.toLowerCase() === email);
      if (isAuthorized) {
        localStorage.setItem('sendeke_pin_unlocked', 'true');
        unlockDashboard(result.user.displayName || result.user.email);
      } else {
        showToast(`Signed in as ${result.user.email}, but this account is not in the authorized couriers list. Use PIN 90034 or switch accounts.`);
      }
    }
  }).catch(err => {
    console.warn('OAuth redirect result error:', err);
  });

  onAuthStateChanged(auth, user => {
    if (user) {
      const email = (user.email || '').toLowerCase();
      const isAuthorized = ADMIN_EMAILS.some(e => e.toLowerCase() === email);
      if (isAuthorized) {
        localStorage.setItem('sendeke_pin_unlocked', 'true');
        unlockDashboard(user.displayName || user.email);
      } else {
        showToast(`Signed in as ${user.email}, but this account is not in the authorized couriers list. Use PIN 90034 or switch accounts.`);
      }
    }
  });

  $('#googleSignInBtn')?.addEventListener('click', async () => {
    try {
      if (!auth) {
        showToast('Initializing auth service... please retry.');
        return;
      }
      showToast('Opening Google Sign-In...');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await signInWithPopup(auth, provider);
      } catch (popupErr) {
        console.warn('Google popup failed, attempting redirect fallback:', popupErr);
        if (popupErr.code === 'auth/popup-blocked' ||
            popupErr.code === 'auth/popup-closed-by-user' ||
            popupErr.code === 'auth/cancelled-popup-request' ||
            popupErr.message?.includes('popup') ||
            popupErr.code === 'auth/internal-error') {
          showToast('Popup unavailable. Redirecting to Google Sign-In...');
          await signInWithRedirect(auth, provider);
        } else {
          showToast('Google Sign-in: ' + (popupErr.message || 'Error'));
        }
      }
    } catch (err) {
      console.warn('Google sign-in error:', err);
      showToast('Google Sign-in: ' + (err.message || 'Please retry'));
    }
  });

  $('#appleSignInBtn')?.addEventListener('click', async () => {
    try {
      if (!auth) {
        showToast('Initializing auth service... please retry.');
        return;
      }
      showToast('Opening Apple Sign-In...');
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn('Apple sign-in error:', err);
      if (err.code === 'auth/popup-blocked') {
        showToast('Popup was blocked by your browser. Please allow popups or enter PIN (90034).');
      } else if (err.code === 'auth/popup-closed-by-user') {
        showToast('Sign-in cancelled.');
      } else {
        showToast('Apple Sign-in: ' + (err.message || 'Cancelled'));
      }
    }
  });

  $('#passcodeForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const pin = $('#passcodeInput')?.value.trim();
    if (pin === DISPATCH_PIN) {
      localStorage.setItem('sendeke_pin_unlocked', 'true');
      sessionStorage.setItem('sendeke_pin_unlocked', 'true');
      unlockDashboard('Courier (PIN Access)');
    } else {
      showToast('Incorrect courier PIN.');
    }
  });

  $('#driverSignOutBtn')?.addEventListener('click', async () => {
    sessionStorage.removeItem('sendeke_pin_unlocked');
    if (state.gpsWatchId !== null) {
      navigator.geolocation?.clearWatch(state.gpsWatchId);
      state.gpsWatchId = null;
    }
    try {
      await signOut(auth);
    } catch (e) {}
    lockDashboard();
    showToast('Signed out of Courier Portal.');
  });

  // --- Driver Status & Controls ---
  function renderDriverStatus() {
    const activeCount = getActiveTickets().length;
    const openSlots = Math.max(0, state.capacity - activeCount);
    const statusText = state.driverOnline ? (openSlots > 0 ? 'ONLINE' : 'QUEUE FULL') : 'OFFLINE';

    if ($('#driverOnlineSwitch')) $('#driverOnlineSwitch').checked = state.driverOnline;
    if ($('#driverSwitchLabel')) $('#driverSwitchLabel').textContent = state.driverOnline ? 'ONLINE' : 'OFFLINE';
    if ($('#capacitySelect')) $('#capacitySelect').value = String(state.capacity);
    if ($('#areaInput')) $('#areaInput').value = state.serviceArea;

    if ($('#navDriverStatusText')) $('#navDriverStatusText').textContent = statusText;
    if ($('#navDriverStatusDot')) $('#navDriverStatusDot').classList.toggle('offline', !state.driverOnline || openSlots === 0);

    if ($('#statRequests')) $('#statRequests').textContent = state.tickets.length;
    if ($('#statActive')) $('#statActive').textContent = activeCount;
    if ($('#statDone')) $('#statDone').textContent = state.tickets.filter(t => t.status === 'completed').length;
  }

  // --- Real-time Queue Render ---
  function visibleTickets() {
    if (state.queueFilter === 'all') return state.tickets;
    if (state.queueFilter === 'completed') return state.tickets.filter(t => t.status === 'completed');
    return state.tickets.filter(t => !['completed', 'cancelled'].includes(t.status));
  }

  function renderQueue() {
    const list = $('#queueList');
    if (!list) return;
    const tickets = visibleTickets();

    const urgentTicket = tickets.find(t => t.status === 'requested') || tickets.find(t => !['completed', 'cancelled'].includes(t.status));
    const overlayContainer = $('#floatingTripOverlay');

    // --- DoorDash / Uber Style Floating Trip Offer Overlay (Over the Live Map) ---
    if (overlayContainer) {
      if (urgentTicket) {
        const uPickupName = urgentTicket.pickupName || urgentTicket.pickup_name || "Sweetfin Culver City";
        const uPickupAddress = urgentTicket.pickupAddress || urgentTicket.pickup_address || "9518 Washington Blvd, Culver City, CA 90232";
        const uDeliveryAddress = urgentTicket.deliveryAddress || urgentTicket.delivery_address || urgentTicket.dropoffAddress || urgentTicket.dropoff_address || "Palms / Culver City (90034)";
        const uCustomerName = urgentTicket.customerName || urgentTicket.customer_name || "Customer";
        const uPhoneClean = (urgentTicket.customerPhone || '').replace(/[^\d+]/g, '');
        const uCourierPay = Number(urgentTicket.courierFee || 10.00) + Number(urgentTicket.tipAmount !== undefined ? urgentTicket.tipAmount : 2.50);
        const uIsRequested = urgentTicket.status === 'requested';

        overlayContainer.classList.remove('d-none');
        overlayContainer.innerHTML = `
          <div class="card bg-black bg-opacity-95 text-light border border-primary rounded-4 shadow-lg p-3 p-md-4" style="pointer-events: auto; backdrop-filter: blur(16px); box-shadow: 0 16px 40px rgba(0,0,0,0.9);">
            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom border-secondary border-opacity-25">
              <div class="d-flex align-items-center gap-2">
                <span class="badge bg-primary text-white fw-bold">ACTIVE OFFER</span>
                <strong class="text-white font-monospace">${escapeHtml(urgentTicket.id)}</strong>
                <span class="badge bg-secondary text-light">${(STATUS_LABELS[urgentTicket.status] || urgentTicket.status).toUpperCase()}</span>
              </div>
              <div class="text-end">
                <span class="small text-secondary d-block" style="font-size: 0.7rem;">GUARANTEED PAY</span>
                <strong class="fs-4 text-primary fw-black">${money.format(uCourierPay)}</strong>
              </div>
            </div>

            <!-- TWO AND FRO ADDRESSES (DoorDash / Uber Style) -->
            <div class="p-3 bg-dark rounded-3 border border-secondary border-opacity-25 mb-3">
              <div class="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom border-secondary border-opacity-25">
                <span class="badge bg-primary text-white mt-1 px-2 py-1" style="min-width: 52px; text-align: center;">FROM</span>
                <div class="flex-grow-1 min-w-0">
                  <strong class="text-white d-block fs-6 text-truncate">${escapeHtml(uPickupName)}</strong>
                  <span class="text-secondary small font-monospace d-block text-truncate">${escapeHtml(uPickupAddress)}</span>
                </div>
              </div>
              <div class="d-flex align-items-start gap-2">
                <span class="badge bg-secondary text-white mt-1 px-2 py-1" style="min-width: 52px; text-align: center;">TO</span>
                <div class="flex-grow-1 min-w-0">
                  <strong class="text-white d-block fs-6 text-truncate">${escapeHtml(uCustomerName)}</strong>
                  <span class="text-secondary small font-monospace d-block text-truncate">${escapeHtml(uDeliveryAddress)}</span>
                </div>
              </div>
            </div>

            <!-- Uniform Blue / Gray / Black Action Buttons -->
            <div class="row g-2 mb-2">
              ${uIsRequested ? `
                <div class="col-6">
                  <button class="btn btn-primary fw-bold w-100 d-flex align-items-center justify-content-center accept-trip-btn" data-id="${escapeHtml(urgentTicket.id)}" style="min-height: 48px;">
                    ✔ ACCEPT TRIP (${money.format(uCourierPay)})
                  </button>
                </div>
                <div class="col-6">
                  <button class="btn btn-secondary fw-bold w-100 d-flex align-items-center justify-content-center decline-trip-btn" data-id="${escapeHtml(urgentTicket.id)}" style="min-height: 48px;">
                    ✕ DECLINE
                  </button>
                </div>
              ` : `
                <div class="col-12">
                  <button class="btn btn-primary fw-bold w-100 d-flex align-items-center justify-content-center advance-ticket" data-id="${escapeHtml(urgentTicket.id)}" style="min-height: 48px;">
                    Next: ${STATUS_LABELS[STATUS_STEPS[Math.min(STATUS_STEPS.indexOf(urgentTicket.status) + 1, STATUS_STEPS.length - 1)]] || 'Advance'}
                  </button>
                </div>
              `}
            </div>

            <div class="row g-2">
              <div class="col-6">
                <a href="tel:${uPhoneClean}" class="btn btn-outline-primary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                  📞 Call Customer
                </a>
              </div>
              <div class="col-6">
                <a href="sms:${uPhoneClean}?&body=${encodeURIComponent(`Hi ${uCustomerName}, this is Deke with SenDeke.to courier regarding order ${urgentTicket.id}...`)}" class="btn btn-outline-primary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                  💬 Text Customer
                </a>
              </div>
            </div>
          </div>
        `;
      } else {
        overlayContainer.classList.add('d-none');
        overlayContainer.innerHTML = '';
      }
    }

    if (!tickets.length) {
      list.innerHTML = `
        <div class="empty-state border border-secondary border-opacity-25 rounded-4 p-4 text-center">
          <div class="fs-1 mb-2 text-secondary">✓</div>
          <h4 class="text-light">No tickets in this view</h4>
          <p class="text-secondary mb-0">Incoming customer orders appear here in real time.</p>
        </div>`;
      return;
    }

    list.innerHTML = tickets.map(ticket => {
      const index = STATUS_STEPS.indexOf(ticket.status);
      const nextStatus = STATUS_STEPS[Math.min(index + 1, STATUS_STEPS.length - 1)];
      const nextLabel = ticket.status === 'requested' ? 'Accept ticket' : ticket.status === 'completed' ? 'Completed' : `Mark: ${STATUS_LABELS[nextStatus]}`;
      const created = new Date(ticket.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const phoneClean = (ticket.customerPhone || '').replace(/[^\d+]/g, '');

      // Robust Address Resolution (Never Blank)
      const pickupAddress = ticket.pickupAddress || ticket.pickup_address || "Sweetfin Poke - 9518 Washington Blvd, Culver City, CA 90232";
      const pickupName = ticket.pickupName || ticket.pickup_name || "Sweetfin Culver City";
      const deliveryAddress = ticket.deliveryAddress || ticket.delivery_address || ticket.dropoffAddress || ticket.dropoff_address || "3650 Motor Ave, Palms, Los Angeles, CA 90034";
      const customerName = ticket.customerName || ticket.customer_name || "Customer";

      const totalEstimated = Number(ticket.estimate || ticket.totalAmount || 12.50);
      const courierBaseFee = Number(ticket.courierFee || 10.00);
      const totalTip = Number(ticket.tipAmount !== undefined ? ticket.tipAmount : 2.50);
      const foodItemCost = Number(ticket.foodCost || ticket.foodEstimate || Math.max(0, totalEstimated - courierBaseFee - totalTip));
      const courierTotalTakeHome = courierBaseFee + totalTip;
      const isRequested = ticket.status === 'requested';

      // Uniform Flow Badge
      let flowBadgeHtml = '<span class="badge bg-secondary text-light">SWEETFIN TAKEOUT</span>';
      if (ticket.orderFlow === 'SHOP_AND_PAY') {
        flowBadgeHtml = '<span class="badge bg-primary text-white">SHOP &amp; PAY</span>';
      } else if (ticket.orderFlow === 'SPECIAL_REQUEST') {
        flowBadgeHtml = '<span class="badge bg-primary text-white">SPECIAL ORDER</span>';
      }

      return `
        <article class="card bg-black border border-secondary border-opacity-25 rounded-4 p-3 p-md-4 shadow-sm" data-ticket-id="${escapeHtml(ticket.id)}">
          <!-- Card Header -->
          <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
            <div>
              <strong class="text-white fs-5 font-monospace">${escapeHtml(ticket.id)}</strong>
              <div class="small text-secondary">${escapeHtml(customerName)} • ${created}</div>
            </div>
            <div class="d-flex align-items-center gap-2">
              ${flowBadgeHtml}
              <span class="badge ${ticket.status === 'completed' ? 'bg-secondary text-light' : 'bg-primary text-white'}">${STATUS_LABELS[ticket.status] || ticket.status}</span>
            </div>
          </div>

          <!-- TWO AND FRO ADDRESSES (The Core Courier View) -->
          <div class="p-3 bg-dark rounded-3 border border-secondary border-opacity-25 mb-3">
            <div class="d-flex align-items-start gap-2 mb-2 pb-2 border-bottom border-secondary border-opacity-25">
              <span class="badge bg-primary text-white mt-1 px-2 py-1" style="min-width: 52px; text-align: center;">FROM</span>
              <div class="flex-grow-1 min-w-0">
                <strong class="text-white d-block fs-6 text-truncate">${escapeHtml(pickupName)}</strong>
                <span class="text-secondary small font-monospace d-block text-truncate">${escapeHtml(pickupAddress)}</span>
              </div>
            </div>
            <div class="d-flex align-items-start gap-2">
              <span class="badge bg-secondary text-white mt-1 px-2 py-1" style="min-width: 52px; text-align: center;">TO</span>
              <div class="flex-grow-1 min-w-0">
                <strong class="text-white d-block fs-6 text-truncate">${escapeHtml(customerName)}</strong>
                <span class="text-secondary small font-monospace d-block text-truncate">${escapeHtml(deliveryAddress)}</span>
              </div>
            </div>
          </div>

          <!-- Financial Breakdown Panel -->
          <div class="p-3 rounded-3 bg-dark border border-secondary border-opacity-25 mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-secondary border-opacity-25">
              <span class="small fw-bold text-uppercase text-secondary" style="font-size: 0.72rem;">TRANSPARENT COURIER PAY (100% DIRECT TO DEKE)</span>
              <span class="badge bg-primary text-white fw-bold">GUARANTEED: ${money.format(courierTotalTakeHome)}</span>
            </div>
            <div class="row g-2 small">
              <div class="col-6">
                <span class="text-secondary">Base Delivery Pay:</span>
                <strong class="text-light float-end">$${courierBaseFee.toFixed(2)}</strong>
              </div>
              <div class="col-6">
                <span class="text-secondary">Customer Tip:</span>
                <strong class="text-light float-end">$${totalTip.toFixed(2)}</strong>
              </div>
              <div class="col-6">
                <span class="text-secondary">Food Register Cost:</span>
                <strong class="text-secondary float-end">$${foodItemCost.toFixed(2)}</strong>
              </div>
              <div class="col-6">
                <span class="text-secondary">Customer Total:</span>
                <strong class="text-white float-end">${money.format(totalEstimated)}</strong>
              </div>
            </div>
          </div>

          <!-- Strict Blue, Gray, Black Uniform Action Buttons -->
          <!-- Row 1: Primary Dispatch Decision (Uniform 48px Height) -->
          <div class="row g-2 mb-2">
            ${isRequested ? `
              <div class="col-6">
                <button class="btn btn-primary fw-bold w-100 d-flex align-items-center justify-content-center accept-trip-btn" data-id="${escapeHtml(ticket.id)}" style="min-height: 48px;">
                  ✔ ACCEPT TRIP (${money.format(courierTotalTakeHome)})
                </button>
              </div>
              <div class="col-6">
                <button class="btn btn-secondary fw-bold w-100 d-flex align-items-center justify-content-center decline-trip-btn" data-id="${escapeHtml(ticket.id)}" style="min-height: 48px;">
                  ✕ DECLINE
                </button>
              </div>
            ` : `
              <div class="col-12">
                <button class="btn btn-primary fw-bold w-100 d-flex align-items-center justify-content-center advance-ticket" data-id="${escapeHtml(ticket.id)}" style="min-height: 48px;" ${ticket.status === 'completed' ? 'disabled' : ''}>
                  ${nextLabel}
                </button>
              </div>
            `}
          </div>

          <!-- Row 2: Customer & Navigation Controls (Uniform 40px Height) -->
          <div class="row g-2 mb-2">
            <div class="col-6 col-md-3">
              <a href="tel:${phoneClean}" class="btn btn-outline-primary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                📞 Call
              </a>
            </div>
            <div class="col-6 col-md-3">
              <a href="sms:${phoneClean}?&body=${encodeURIComponent(`Hi ${customerName}, this is Deke with SenDeke.to courier regarding order ${ticket.id}...`)}" class="btn btn-outline-primary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                💬 Text
              </a>
            </div>
            <div class="col-6 col-md-3">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pickupAddress)}&travelmode=bicycling" target="_blank" rel="noopener noreferrer" class="btn btn-dark border-secondary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                🗺️ Pickup GPS
              </a>
            </div>
            <div class="col-6 col-md-3">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(deliveryAddress)}&travelmode=bicycling" target="_blank" rel="noopener noreferrer" class="btn btn-dark border-secondary text-light fw-bold w-100 d-flex align-items-center justify-content-center" style="min-height: 40px;">
                🚴 Dropoff GPS
              </a>
            </div>
          </div>

          <!-- Row 3: Admin & Utility Controls (Uniform 36px Height) -->
          <div class="d-flex gap-2">
            <button class="btn btn-sm btn-dark border-secondary text-secondary flex-fill copy-ticket" data-id="${escapeHtml(ticket.id)}" style="min-height: 36px;">Copy ID</button>
            <button class="btn btn-sm btn-dark border-secondary text-secondary flex-fill cancel-ticket" data-id="${escapeHtml(ticket.id)}" style="min-height: 36px;" ${ticket.status === 'completed' ? 'disabled' : ''}>Cancel</button>
            <button class="btn btn-sm btn-dark border-secondary text-secondary flex-fill ban-customer-btn" data-id="${escapeHtml(ticket.id)}" data-phone="${escapeHtml(phoneClean)}" data-name="${escapeHtml(customerName)}" style="min-height: 36px;">86 Customer</button>
          </div>
        </article>`;
    }).join('');
  }

  // --- Real-time GPS Streaming to Firestore ---
  function startGpsBroadcast() {
    if (!navigator.geolocation) {
      showToast('Geolocation not supported on this browser.');
      $('#gpsToggle').checked = false;
      return;
    }

    $('#gpsPill').textContent = 'BROADCASTING';
    $('#gpsPill').className = 'badge text-bg-success gps-active-badge';
    $('#gpsStatusLabel').textContent = 'Live Broadcasting';
    $('#gpsStatusItem span').className = 'bg-success border-success';

    state.gpsWatchId = navigator.geolocation.watchPosition(
      async position => {
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        const readout = `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)}m)`;
        $('#gpsReadout').textContent = `Broadcasting GPS: ${readout}`;

        try {
          await updateDoc(doc(db, "driver_status", "current"), {
            is_sharing_location: true,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            heading: heading || 0,
            speed: speed || 0,
            location_updated_at: new Date().toISOString()
          });
        } catch (err) {
          console.warn('Error broadcasting GPS to Firestore:', err);
        }
      },
      error => {
        console.warn('GPS watch error:', error);
        $('#gpsReadout').textContent = `GPS error: ${error.message}`;
        stopGpsBroadcast();
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  }

  async function stopGpsBroadcast() {
    if (state.gpsWatchId !== null) {
      navigator.geolocation.clearWatch(state.gpsWatchId);
      state.gpsWatchId = null;
    }
    $('#gpsPill').textContent = 'OFF';
    $('#gpsPill').className = 'badge text-bg-secondary';
    $('#gpsStatusLabel').textContent = 'Standby';
    $('#gpsStatusItem span').className = '';
    $('#gpsReadout').textContent = 'Turn ON to display your bike/courier icon on customer tracker maps.';

    try {
      await updateDoc(doc(db, "driver_status", "current"), {
        is_sharing_location: false,
        location_updated_at: new Date().toISOString()
      });
    } catch (e) {}
  }

  $('#gpsToggle')?.addEventListener('change', event => {
    if (event.target.checked) {
      startGpsBroadcast();
      showToast('GPS broadcast activated — Customer maps now show your location.');
    } else {
      stopGpsBroadcast();
      showToast('GPS broadcast turned off.');
    }
  });

  // --- Firestore Listeners ---
  const driverDocRef = doc(db, "driver_status", "current");
  onSnapshot(driverDocRef, snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      state.driverOnline = data.is_online ?? true;
      state.capacity = data.capacity ?? 3;
      state.serviceArea = data.service_area || state.serviceArea;
      renderDriverStatus();
    }
  });

  // --- Audio Alert for New Orders ---
  function playDispatchChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn("Audio chime error:", e);
    }
  }

  let isFirstTicketsLoad = true;
  const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"), limit(50));
  onSnapshot(ticketsQuery, snapshot => {
    if (!isFirstTicketsLoad) {
      const added = snapshot.docChanges().filter(c => c.type === 'added');
      if (added.length > 0) {
        playDispatchChime();
        const first = added[0].doc.data();
        showToast(`🔔 NEW DISPATCH: ${first.pickupAddress || 'Sweetfin'} (Total: $${(first.totalAmount || first.estimate || 15).toFixed(2)})`);
      }
    }
    isFirstTicketsLoad = false;
    state.tickets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderQueue();
    renderDriverStatus();
  });

  // --- Controls Handlers ---
  $('#driverOnlineSwitch')?.addEventListener('change', async event => {
    const isOnline = event.target.checked;
    state.driverOnline = isOnline;
    renderDriverStatus();
    try {
      await updateDoc(driverDocRef, {
        is_online: isOnline,
        updated_at: new Date().toISOString()
      });
      showToast(`Public status updated to ${isOnline ? 'ONLINE' : 'OFFLINE'}.`);
    } catch (e) {
      console.warn(e);
    }
  });

  $('#capacitySelect')?.addEventListener('change', async event => {
    const capacity = Number(event.target.value);
    state.capacity = capacity;
    renderDriverStatus();
    try {
      await updateDoc(driverDocRef, {
        capacity: capacity,
        updated_at: new Date().toISOString()
      });
      showToast(`Capacity updated to ${capacity}.`);
    } catch (e) {
      console.warn(e);
    }
  });

  $('#saveAreaBtn')?.addEventListener('click', async () => {
    const newArea = $('#areaInput')?.value.trim() || state.serviceArea;
    state.serviceArea = newArea;
    try {
      await updateDoc(driverDocRef, {
        service_area: newArea,
        updated_at: new Date().toISOString()
      });
      showToast('Service area updated.');
    } catch (e) {
      console.warn(e);
    }
  });

  $('#queueList')?.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button) return;
    const id = button.dataset.id;
    const ticket = state.tickets.find(t => t.id === id);
    if (!ticket) return;

    if (button.classList.contains('accept-trip-btn')) {
      await updateDoc(doc(db, "tickets", id), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        driver_id: 'Deke (sendeke.to)',
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, "ticket_events"), {
        ticket_id: id,
        status: 'accepted',
        note: 'Courier Deke accepted delivery request.',
        timestamp: new Date().toISOString()
      });
      showToast(`Trip ${id} ACCEPTED! Safe riding.`);
      return;
    }

    if (button.classList.contains('decline-trip-btn')) {
      const modal = $('#declineTripModal');
      const badge = $('#declineTicketIdBadge');
      if (badge) badge.textContent = id;
      state.currentDecliningTicketId = id;
      if (modal && window.bootstrap) {
        bootstrap.Modal.getOrCreateInstance(modal).show();
      }
      return;
    }

    if (button.classList.contains('advance-ticket') && ticket.status !== 'completed') {
      const idx = STATUS_STEPS.indexOf(ticket.status);
      const nextStatus = STATUS_STEPS[Math.min(idx + 1, STATUS_STEPS.length - 1)];
      await updateDoc(doc(db, "tickets", id), {
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, "ticket_events"), {
        ticket_id: id,
        status: nextStatus,
        note: `Courier updated stage to ${nextStatus}`,
        timestamp: new Date().toISOString()
      });
      showToast(`${id} updated to ${STATUS_LABELS[nextStatus]}.`);
    }

    if (button.classList.contains('view-booklet-btn')) {
      openDriverBooklet(id);
      return;
    }

    if (button.classList.contains('ban-customer-btn')) {
      const phone = button.dataset.phone || ticket.customerPhoneClean || ticket.customerPhone;
      const name = button.dataset.name || ticket.customerName || 'Customer';
      const confirmed = window.confirm(`Are you sure you want to 86 (permanently ban) customer "${name}" (${phone})?\n\nThis will cancel the active ticket, add them to the blacklist, and lock them out with code 86.86.86.86.`);
      if (!confirmed) return;

      const cleanP = String(phone).replace(/\D/g, '');
      if (cleanP) {
        try {
          await setDoc(doc(db, "banned_users", cleanP), {
            phone: cleanP,
            customerName: name,
            ticketId: id,
            reason: 'Courier manual 86 ban',
            bannedAt: new Date().toISOString(),
            bannedBy: 'Deke / Courier Dispatch'
          });
        } catch (e) {
          console.warn('Firestore ban record error:', e);
        }
        try {
          const localBanned = JSON.parse(localStorage.getItem('sendeke_banned_list') || '[]');
          if (!localBanned.includes(cleanP)) {
            localBanned.push(cleanP);
            localStorage.setItem('sendeke_banned_list', JSON.stringify(localBanned));
          }
        } catch (e) {}
      }

      await updateDoc(doc(db, "tickets", id), {
        status: 'cancelled',
        cancelReason: `Customer 86'd by Courier (${name})`,
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, "ticket_events"), {
        ticket_id: id,
        status: 'cancelled',
        timestamp: new Date().toISOString(),
        note: `Customer 86'd / banned by courier. Access revoked (86.86.86.86).`
      });

      showToast(`Customer ${name} (${phone}) has been 86'd. Access revoked.`);
      return;
    }

    if (button.classList.contains('toggle-item-cart-btn')) {
      const ticketId = button.dataset.ticketId;
      const itemIdx = Number(button.dataset.itemIdx);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t && Array.isArray(t.items) && t.items[itemIdx]) {
        t.items[itemIdx].inCart = !t.items[itemIdx].inCart;
        if (t.items[itemIdx].inCart) t.items[itemIdx].outOfStock = false;
        
        await updateDoc(doc(db, "tickets", ticketId), {
          items: t.items,
          updatedAt: new Date().toISOString()
        });
        const foundCount = t.items.filter(i => i.inCart).length;
        await addDoc(collection(db, "ticket_events"), {
          ticket_id: ticketId,
          status: t.status,
          timestamp: new Date().toISOString(),
          note: `Courier updated checklist: ${t.items[itemIdx].name} (${foundCount}/${t.items.length} in cart)`
        });
        showToast(`${t.items[itemIdx].name}: ${t.items[itemIdx].inCart ? 'Secured in cart ✓' : 'Marked pending'}`);
      }
      return;
    }

    if (button.classList.contains('toggle-item-oos-btn')) {
      const ticketId = button.dataset.ticketId;
      const itemIdx = Number(button.dataset.itemIdx);
      const t = state.tickets.find(x => x.id === ticketId);
      if (t && Array.isArray(t.items) && t.items[itemIdx]) {
        t.items[itemIdx].outOfStock = !t.items[itemIdx].outOfStock;
        if (t.items[itemIdx].outOfStock) t.items[itemIdx].inCart = false;

        await updateDoc(doc(db, "tickets", ticketId), {
          items: t.items,
          updatedAt: new Date().toISOString()
        });
        await addDoc(collection(db, "ticket_events"), {
          ticket_id: ticketId,
          status: t.status,
          timestamp: new Date().toISOString(),
          note: `Courier marked item out-of-stock / substitute needed: ${t.items[itemIdx].name}`
        });
        showToast(`${t.items[itemIdx].name} marked out-of-stock.`);
      }
      return;
    }

    if (button.classList.contains('copy-ticket')) {
      navigator.clipboard?.writeText(id);
      showToast(`Copied ${id}.`);
    }

    if (button.classList.contains('cancel-ticket')) {
      await updateDoc(doc(db, "tickets", id), {
        status: 'cancelled',
        updatedAt: new Date().toISOString()
      });
      showToast(`${id} cancelled.`);
    }
  });

  // --- Driver Flip-Booklet Modal Viewer ---
  let currentBookletPages = [];
  let currentBookletIndex = 0;

  function openDriverBooklet(ticketId) {
    const ticket = state.tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    currentBookletPages = (Array.isArray(ticket.bookletImages) && ticket.bookletImages.length > 0)
      ? ticket.bookletImages
      : (ticket.receiptImage ? [ticket.receiptImage] : []);

    if (!currentBookletPages.length) {
      showToast('No receipt or menu booklet images attached to this ticket.');
      return;
    }

    currentBookletIndex = 0;
    const idEl = $('#driverBookletTicketId');
    if (idEl) idEl.textContent = `${ticket.id} (${ticket.customerName || 'Customer'})`;
    updateDriverBookletUI();

    const modal = $('#driverBookletModal');
    if (modal && window.bootstrap) {
      bootstrap.Modal.getOrCreateInstance(modal).show();
    }
  }

  function updateDriverBookletUI() {
    const total = currentBookletPages.length;
    if (!total) return;
    if (currentBookletIndex >= total) currentBookletIndex = total - 1;
    if (currentBookletIndex < 0) currentBookletIndex = 0;

    const badge = $('#driverBookletBadge');
    if (badge) badge.textContent = `${currentBookletIndex + 1} / ${total}`;
    const pageInd = $('#driverBookletPageIndicator');
    if (pageInd) pageInd.textContent = `Page ${currentBookletIndex + 1} of ${total}`;
    const counterText = $('#driverBookletCounterText');
    if (counterText) counterText.textContent = `Page ${currentBookletIndex + 1} of ${total}`;
    const mainImg = $('#driverBookletMainImg');
    if (mainImg) mainImg.src = currentBookletPages[currentBookletIndex];

    const thumbWrap = $('#driverBookletThumbnails');
    if (thumbWrap) {
      thumbWrap.innerHTML = currentBookletPages.map((src, i) => `
        <button type="button" class="btn btn-sm p-1 rounded ${i === currentBookletIndex ? 'btn-info' : 'btn-outline-secondary'}" data-driver-page="${i}" style="min-width: 44px; height: 44px;">
          <img src="${src}" alt="Thumb ${i+1}" style="width: 34px; height: 34px; object-fit: cover; border-radius: 4px;">
        </button>
      `).join('');
    }
  }

  $('#driverBookletPrevBtn')?.addEventListener('click', () => {
    if (currentBookletIndex > 0) {
      currentBookletIndex--;
      updateDriverBookletUI();
    }
  });

  $('#driverBookletNextBtn')?.addEventListener('click', () => {
    if (currentBookletIndex < currentBookletPages.length - 1) {
      currentBookletIndex++;
      updateDriverBookletUI();
    }
  });

  $('#driverBookletThumbnails')?.addEventListener('click', event => {
    const btn = event.target.closest('button[data-driver-page]');
    if (btn) {
      currentBookletIndex = Number(btn.dataset.driverPage);
      updateDriverBookletUI();
    }
  });

  $$('.queue-filter').forEach(btn => btn.addEventListener('click', () => {
    state.queueFilter = btn.dataset.filter;
    $$('.queue-filter').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.classList.toggle('btn-light', active);
      b.classList.toggle('btn-outline-light', !active);
    });
    renderQueue();
  }));

  // Wire Decline Trip Modal Reason Buttons
  $$('.decline-reason-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reason = btn.dataset.reason || 'Declined by courier';
      const id = state.currentDecliningTicketId;
      if (!id) return;

      try {
        await updateDoc(doc(db, "tickets", id), {
          status: 'declined',
          declineReason: reason,
          declinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await addDoc(collection(db, "ticket_events"), {
          ticket_id: id,
          status: 'declined',
          note: `Courier declined trip: ${reason}`,
          timestamp: new Date().toISOString()
        });

        const modal = $('#declineTripModal');
        if (modal && window.bootstrap) {
          bootstrap.Modal.getInstance(modal)?.hide();
        }
        showToast(`Trip ${id} declined: ${reason}`);
      } catch (err) {
        console.warn('Decline trip error:', err);
        showToast('Error declining trip: ' + err.message);
      }
    });
  });

  $('#manualTicketForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const ticket = {
      id: makeTicketId(),
      customerName: $('#manualCustomer').value.trim(),
      customerPhone: $('#manualPhone').value.trim() || DISPATCH_PHONE,
      pickupAddress: $('#manualPickup').value.trim(),
      dropoffAddress: $('#manualDropoff').value.trim(),
      requestType: 'Phone/text request',
      itemDetails: $('#manualDetails').value.trim(),
      requestedTime: 'As soon as possible',
      estimate: Number($('#manualFee').value || 11.50),
      status: 'accepted', // Auto-accepted since Deke took it
      createdAt: new Date().toISOString(),
      source: 'dispatch-phone'
    };

    try {
      await setDoc(doc(db, "tickets", ticket.id), ticket);
      await addDoc(collection(db, "ticket_events"), {
        ticket_id: ticket.id,
        status: 'accepted',
        timestamp: new Date().toISOString(),
        note: `Order booked via direct courier line ${DISPATCH_PHONE}`
      });
      event.currentTarget.reset();
      const modal = $('#manualTicketModal');
      if (modal && window.bootstrap) bootstrap.Modal.getInstance(modal)?.hide();
      showToast(`${ticket.id} created and accepted.`);
    } catch (e) {
      console.warn(e);
      showToast('Error saving ticket: ' + e.message);
    }
  });

  $('#copyPublicLinkBtn')?.addEventListener('click', () => {
    const link = 'https://sendeketo.com';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast(`Copied ${link} customer order link to clipboard.`);
  });

  $('#copyDriverMenuLinkBtn')?.addEventListener('click', () => {
    const link = 'https://sendeketo.com/menu.html';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    showToast(`Copied ${link} Sweetfin menu link to clipboard.`);
  });

  $('#copyDriverFlyerTextBtn')?.addEventListener('click', () => {
    const flyer = `DID YOU PAY TOO MUCH FOR DINNER?
• Delivery apps charge extra in menu markups & hidden fees
• The kitchen loses up to 30% of your food ticket
• Your courier was offered as little as $2.50 to bring it

STOP FEEDING THE MIDDLEMAN. KEEP IT IN 90034.
Order direct on our neighborhood courier network:
1. True in-store menu prices (0% markups)
2. Fast, traffic-free e-bike delivery
3. Flat $10 delivery fee — 100% of fees and tips stay with your rider

View Sweetfin Menu: https://sendeketo.com/menu.html
Direct Courier Line: (310) 945-2378`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(flyer);
    }
    showToast('Copied 90034 bag flyer text to clipboard!');
  });

  // --- 3D Navigation Console & Drive Mode Integration ---
  let navConsole = null;
  let inlineNavConsole = null;

  function initInlineMap() {
    const inlineCanvas = document.getElementById('inlineDriverMapCanvas');
    if (inlineCanvas) {
      if (!inlineNavConsole) {
        inlineNavConsole = new DriverNavigationConsole();
        inlineNavConsole.initMap(inlineCanvas);
      }
      setTimeout(() => {
        if (inlineNavConsole.map && window.google) {
          google.maps.event.trigger(inlineNavConsole.map, 'resize');
          if (inlineNavConsole.currentPosition) {
            inlineNavConsole.map.setCenter(inlineNavConsole.currentPosition);
          }
        } else if (inlineNavConsole.fallbackMap) {
          inlineNavConsole.fallbackMap.invalidateSize();
        }
      }, 250);
      setTimeout(() => {
        if (inlineNavConsole.fallbackMap) {
          inlineNavConsole.fallbackMap.invalidateSize();
        }
      }, 800);
    }
  }

  // Trigger inline map on startup & wire inline windowpane controls
  const wireInlineHudControls = () => {
    initInlineMap();

    $('#inlineHudPlayPauseBtn')?.addEventListener('click', () => {
      if (inlineNavConsole) {
        inlineNavConsole.togglePlay();
        const playBtn = $('#inlineHudPlayPauseBtn');
        if (playBtn) {
          playBtn.classList.toggle('btn-info', inlineNavConsole.isPlaying);
          playBtn.classList.toggle('btn-outline-info', !inlineNavConsole.isPlaying);
        }
      }
    });

    $('#inline3dToggleBtn')?.addEventListener('click', () => {
      if (inlineNavConsole) {
        inlineNavConsole.toggle3dView();
        const btn = $('#inline3dToggleBtn');
        if (btn) btn.textContent = inlineNavConsole.is3D ? '3D ON' : '2D FLAT';
      }
    });

    $('#inlineHeadingToggleBtn')?.addEventListener('click', () => {
      if (inlineNavConsole) {
        inlineNavConsole.toggleHeadingLock();
        const btn = $('#inlineHeadingToggleBtn');
        if (btn) btn.textContent = inlineNavConsole.headingUpMode ? 'HEADING UP' : 'NORTH UP';
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(wireInlineHudControls, 300));
  } else {
    setTimeout(wireInlineHudControls, 300);
  }

  const navModalEl = document.getElementById('driverNavModal');
  if (navModalEl) {
    navModalEl.addEventListener('shown.bs.modal', () => {
      if (!navConsole) {
        navConsole = new DriverNavigationConsole();
      }
      const canvasEl = document.getElementById('driverMapCanvas');
      if (canvasEl) {
        navConsole.initMap(canvasEl);
      }
      setTimeout(() => {
        if (navConsole.map && window.google) {
          google.maps.event.trigger(navConsole.map, 'resize');
          if (navConsole.currentPosition) {
            navConsole.map.setCenter(navConsole.currentPosition);
          }
        } else if (navConsole.fallbackMap) {
          navConsole.fallbackMap.invalidateSize();
        }
      }, 300);
      setTimeout(() => {
        if (navConsole.fallbackMap) {
          navConsole.fallbackMap.invalidateSize();
        }
      }, 900);
      showToast('3D Navigation Cockpit active in Ambient Drive Mode.');
    });
  }
})();
