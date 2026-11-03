import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  GoogleAuthProvider,
  OAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import mapsConfig from "./maps-config.js";

(() => {
  'use strict';

  const STORAGE_KEY = 'sendeke_proto_v1';
  const DISPATCH_PHONE = '(310) 945-2378';
  const DISPATCH_TEL = 'tel:3109452378';
  const DISPATCH_PIN = '90034';
  const ADMIN_EMAILS = [
    'shynetyme@gmail.com',
    'sendeke.to@gmail.com',
    'shynetyme.works@gmail.com',
    'deke@sendeketo.com',
    'transxlimo@gmail.com'
  ];

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

  const defaultState = {
    driverOnline: true,
    capacity: 3,
    serviceArea: 'West L.A. / Culver City (90034)',
    activeTrips: 0,
    tickets: []
  };

  let state = loadLocalState();
  let app = null;
  let db = null;
  let auth = null;
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (bootstrapErr) {
    console.warn('Initial Firebase bootstrap:', bootstrapErr);
  }
  let activeTrackingId = null;
  let unsubscribeTracking = null;
  let map = null;
  let courierMarker = null;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

  function loadLocalState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored ? { ...defaultState, ...stored } : structuredClone(defaultState);
    } catch (e) {
      return structuredClone(defaultState);
    }
  }

  function saveLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

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

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  // --- Mobile SPA View Switcher (Zero-Scroll Navigation) ---
  function switchView(target) {
    const viewMap = {
      home: $('#viewHome'),
      request: $('#viewRequest'),
      track: $('#viewTrack')
    };

    const targetEl = viewMap[target] || viewMap.home;

    // Toggle active class on views
    Object.values(viewMap).forEach(v => {
      if (v) {
        v.classList.remove('active');
        v.style.display = 'none';
      }
    });

    targetEl.style.display = 'block';
    // Allow display block to paint, then trigger fade transition
    requestAnimationFrame(() => {
      targetEl.classList.add('active');
    });

    // Update active nav triggers
    $$('.nav-view-trigger').forEach(trigger => {
      trigger.classList.toggle('active', trigger.dataset.target === target);
    });

    // Close mobile navbar if open
    const navCollapse = $('#appNav');
    if (navCollapse && navCollapse.classList.contains('show') && window.bootstrap) {
      bootstrap.Collapse.getInstance(navCollapse)?.hide();
    }

    // Scroll window smoothly to top of view
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh map sizing if switching to track view
    if (target === 'track' && map) {
      setTimeout(() => map.invalidateSize(), 200);
    }
  }

  // Attach event listeners to all view triggers
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.nav-view-trigger');
    if (trigger && trigger.dataset.target) {
      event.preventDefault();
      switchView(trigger.dataset.target);
    }
  });

  let currentTip = 2.50;
  let currentFlow = 'PARTNER_DELIVERY';
  let attachedReceiptData = null;
  let attachedBookletPages = [];
  let bookletCurrentIndex = 0;

  // --- Pricing Calculator ---
  function calculateEstimate() {
    const isPrepaid = currentFlow === 'PREPAID_PICKUP';
    const isShopPay = currentFlow === 'SHOP_AND_PAY';
    const isSpecial = currentFlow === 'SPECIAL_REQUEST';

    const rawFoodCost = Math.max(0, Number($('#foodCostInput')?.value || 0));
    const foodCost = isPrepaid ? 0 : rawFoodCost;
    const miles = Math.min(3.0, Math.max(0.5, Number($('#estimatedMiles')?.value || 1.5)));

    // Base fee rules:
    // Shop & Pay: $30 base (2-hour minimum @ $15/hr)
    // Special Request: $15 base
    // Traditional Partner / Pre-Paid: $10 base
    let base = 10.00;
    if (isShopPay) {
      base = 30.00;
    } else if (isSpecial) {
      base = 15.00;
    }

    // Mileage: 1.0 - 2.0 mi included. >2.0 mi (up to 3.0 mi max): $1.50/mi
    const mileage = miles > 2.0 ? (miles - 2.0) * 1.50 : 0;
    const courierFee = base + mileage;

    // Upfront tip: Enforce $2.50 minimum (no tip-baiting)
    const tipInput = $('#directTipInput');
    const tipInputVal = tipInput ? Number(tipInput.value || currentTip) : currentTip;
    const tip = Math.max(2.50, tipInputVal);
    currentTip = tip;

    const courierTakeHome = courierFee + tip;
    const total = foodCost + courierFee + tip;

    if ($('#foodSubtotalPrice')) {
      $('#foodSubtotalPrice').textContent = isPrepaid ? '$0.00 (Pre-paid)' : money.format(foodCost);
    }
    if ($('#basePrice')) {
      let baseLabel = money.format(base);
      if (isShopPay) baseLabel += ' (2-Hr Min)';
      $('#basePrice').textContent = baseLabel;
    }
    if ($('#mileagePrice')) $('#mileagePrice').textContent = money.format(mileage);
    if ($('#indexTipDisplay')) $('#indexTipDisplay').textContent = `+${money.format(tip)}`;
    if ($('#indexTipTakeHomeLabel')) $('#indexTipTakeHomeLabel').textContent = `Courier takes: ${money.format(courierTakeHome)}`;
    if ($('#estimatedTotal')) $('#estimatedTotal').textContent = money.format(total);

    const submitBtn = $('#submitTicketBtn');
    if (submitBtn) {
      submitBtn.textContent = `Confirm & Dispatch (${money.format(total)}) 🚴`;
    }

    const cashAppDirectBtn = $('#directCashAppBtn');
    if (cashAppDirectBtn) {
      cashAppDirectBtn.href = `https://cash.app/$senDeketo310/${total.toFixed(2)}`;
      cashAppDirectBtn.textContent = `Pay ${money.format(total)} on Cash App ↗`;
    }

    const cashAppQrImg = $('#cashAppDynamicQr');
    if (cashAppQrImg) {
      cashAppQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=https%3A%2F%2Fcash.app%2F%24senDeketo310%2F${total.toFixed(2)}`;
    }

    return { foodCost, courierFee, tip, courierTakeHome, total, isPrepaid, isShopPay, isSpecial };
  }

  // --- Public Status Renderer ---
  function renderAvailability() {
    const activeCount = state.activeTrips;
    const openSlots = Math.max(0, state.capacity - activeCount);
    const statusText = state.driverOnline ? (openSlots > 0 ? 'ONLINE' : 'QUEUE FULL') : 'OFFLINE';

    if ($('#heroStatus')) $('#heroStatus').textContent = statusText;
    if ($('#navStatusText')) $('#navStatusText').textContent = statusText;
    if ($('#activeTrips')) $('#activeTrips').textContent = activeCount;
    if ($('#maxTrips')) $('#maxTrips').textContent = state.capacity;
    if ($('#openSlots')) $('#openSlots').textContent = openSlots;
    if ($('#serviceArea')) $('#serviceArea').textContent = state.serviceArea;

    const isOffline = !state.driverOnline || openSlots === 0;
    if ($('#navStatusDot')) $('#navStatusDot').classList.toggle('offline', isOffline);
    if ($('#heroLivePill')) $('#heroLivePill').classList.toggle('offline', isOffline);
  }

  // --- Live Google Maps API Tracker ---
  async function initTrackerMap() {
    const mapEl = $('#trackerMap');
    if (!mapEl) return;

    // Centered on 90034 (Palms / Culver City / West LA)
    const defaultCoords = { lat: 34.0259, lng: -118.3965 };

    // Function to initialize Google Map once script is available
    const setupGoogleMap = () => {
      try {
        if (!window.google || !window.google.maps) return false;

        // Custom obsidian dark styling for Google Maps
        const darkStyles = [
          { elementType: "geometry", stylers: [{ color: "#0c0f17" }] },
          { elementType: "labels.text.stroke", stylers: [{ color: "#0c0f17" }] },
          { elementType: "labels.text.fill", stylers: [{ color: "#8f9cae" }] },
          { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#0078d4" }] },
          { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#4f5e74" }] },
          { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#111722" }] },
          { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2230" }] },
          { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0c0f17" }] },
          { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
          { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#253041" }] },
          { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2937" }] },
          { featureType: "transit", elementType: "geometry", stylers: [{ color: "#151b26" }] },
          { featureType: "water", elementType: "geometry", stylers: [{ color: "#05070a" }] }
        ];

        map = new google.maps.Map(mapEl, {
          center: defaultCoords,
          zoom: 14,
          styles: darkStyles,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy"
        });

        // Live E-Bike Courier Marker
        courierMarker = new google.maps.Marker({
          position: defaultCoords,
          map: map,
          title: "Deke (Courier) - West L.A.",
          icon: {
            url: "assets/img/icon-192.png",
            scaledSize: new google.maps.Size(34, 34),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 17)
          }
        });

        const infoWindow = new google.maps.InfoWindow({
          content: '<div style="color:#000; font-family:sans-serif; padding:4px;"><strong>Deke (Courier)</strong><br>West L.A. Palms / Culver Corridor</div>'
        });

        courierMarker.addListener("click", () => {
          infoWindow.open(map, courierMarker);
        });

        return true;
      } catch (err) {
        console.warn("Google Maps init warning:", err);
        return false;
      }
    };

    // Load Google Maps cleanly via unified single-loader with Leaflet fallback
    mapsConfig.loadScript('places,geometry').then(gmaps => {
      if (gmaps) {
        setupGoogleMap();
      } else {
        fallbackLeafletMap();
      }
    }).catch(err => {
      console.warn("Google Maps load fallback to Leaflet:", err);
      fallbackLeafletMap();
    });
  }

  function fallbackLeafletMap() {
    const mapEl = $('#trackerMap');
    if (!mapEl || typeof L === 'undefined' || map) return;
    const defaultCoords = [34.0259, -118.3965];
    map = L.map('trackerMap', {
      center: defaultCoords,
      zoom: 14,
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    const courierIcon = L.divIcon({
      className: 'custom-courier-marker',
      html: '<div style="background:#0078D4; color:#fff; font-weight:900; font-size:12px; border-radius:50%; width:32px; height:32px; display:grid; place-items:center; box-shadow:0 0 15px rgba(0,120,212,0.8); border:2px solid #fff;">🚲</div>',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    courierMarker = L.marker(defaultCoords, { icon: courierIcon }).addTo(map);
  }

  function updateCourierGps(latitude, longitude, isSharing) {
    if (!map || !courierMarker) return;

    const badge = $('#trackerGpsStatusBadge');
    const overlayText = $('#mapOverlayText');

    if (isSharing && latitude && longitude) {
      if (window.google && window.google.maps && courierMarker.setPosition) {
        const newPos = new google.maps.LatLng(latitude, longitude);
        courierMarker.setPosition(newPos);
        map.panTo(newPos);
      } else if (courierMarker.setLatLng) {
        courierMarker.setLatLng([latitude, longitude]);
        map.panTo([latitude, longitude]);
      }

      if (badge) {
        badge.textContent = 'LIVE COURIER GPS';
        badge.className = 'badge text-bg-success';
      }
      if (overlayText) overlayText.textContent = 'Courier En Route (Live GPS)';
    } else {
      if (badge) {
        badge.textContent = 'GPS STANDBY';
        badge.className = 'badge text-bg-secondary';
      }
      if (overlayText) overlayText.textContent = '90034 Courier Radar (Standby)';
    }
  }

  // --- Customer Live Tracking Timeline ---
  function renderTracking(ticket) {
    const trackingResult = $('#trackingResult');
    if (!trackingResult) return;

    if (!ticket) {
      trackingResult.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">!</div>
          <h3 class="h4 fw-bold">Ticket not found</h3>
          <p class="text-secondary mb-0">Check the ticket number or create a new delivery request.</p>
        </div>`;
      return;
    }

    const currentIndex = Math.max(0, STATUS_STEPS.indexOf(ticket.status));
    const steps = [
      ['requested', 'Request received by SenDeke.to'],
      ['accepted', 'Courier accepted ticket & geared up'],
      ['heading_to_pickup', 'Heading to pickup location / store'],
      ['picked_up', 'Items secured & picked up'],
      ['delivering', 'Out for direct delivery'],
      ['completed', 'Delivered safely']
    ];

    // Live In-Store Shopping Progress Feed
    let itemsFeedHtml = '';
    if (Array.isArray(ticket.items) && ticket.items.length > 0) {
      const foundCount = ticket.items.filter(i => i.inCart).length;
      const totalCount = ticket.items.length;
      const pct = Math.round((foundCount / totalCount) * 100);

      itemsFeedHtml = `
        <div class="p-3 my-3 rounded-3 bg-black border border-info shadow-sm">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
            <strong class="text-info small text-uppercase letter-wide">🛒 Live In-Store Aisle Feed</strong>
            <span class="badge text-bg-info text-dark fw-bold">${foundCount} / ${totalCount} Items in Cart (${pct}%)</span>
          </div>
          <div class="progress mb-3 bg-dark" style="height: 8px;">
            <div class="progress-bar bg-info progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${pct}%;" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
          <div class="d-flex flex-column gap-1">
            ${ticket.items.map(item => `
              <div class="d-flex justify-content-between align-items-center p-2 rounded bg-dark border border-secondary-subtle small">
                <div>
                  <span class="${item.outOfStock ? 'text-decoration-line-through text-danger' : 'text-light fw-semibold'}">${escapeHtml(item.name)}</span>
                  <small class="text-secondary d-block">${escapeHtml(item.size || 'std')} • $${Number(item.price).toFixed(2)}</small>
                </div>
                <div>
                  ${item.inCart 
                    ? '<span class="badge text-bg-success">✓ In Cart</span>' 
                    : (item.outOfStock ? '<span class="badge text-bg-danger">⚠️ Out of Stock</span>' : '<span class="badge text-bg-secondary">🔍 In Aisle</span>')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    }

    // 20-min Timeout Safeguard
    let timeoutNoticeHtml = '';
    if (ticket.status === 'requested') {
      const waitMinutes = (Date.now() - new Date(ticket.createdAt).getTime()) / (60 * 1000);
      if (waitMinutes >= 20) {
        timeoutNoticeHtml = `
          <div class="p-3 rounded bg-black border border-warning text-warning mb-3 small">
            <div class="fw-bold mb-1">⏱️ Dispatch Delay Notice</div>
            Your request has been in queue for ${Math.round(waitMinutes)} minutes. If our courier is at peak capacity, a full refund will be triggered immediately.
          </div>`;
      }
    }

    // Courier Proximity Alert
    let proximityAlertHtml = '';
    if (ticket.status === 'delivering') {
      proximityAlertHtml = `
        <div class="p-3 rounded bg-info bg-opacity-25 border border-info text-info mb-3 d-flex align-items-center gap-2">
          <span class="fs-4">🚴⚡</span>
          <div>
            <strong class="d-block text-white">COURIER IS NEARBY ON VENICE BLVD / 2 BLOCKS AWAY!</strong>
            <span class="small">Arriving in approximately 1–2 minutes. Please be ready for in-person hand-off.</span>
          </div>
        </div>`;
    }

    trackingResult.innerHTML = `
      <div class="tracking-header mb-4">
        <div>
          <div class="small text-secondary">ACTIVE TICKET</div>
          <h3 class="h4 fw-black mb-0">${escapeHtml(ticket.id)}</h3>
        </div>
        <div class="d-flex align-items-center gap-2">
          <a href="${DISPATCH_TEL}" class="btn btn-sm btn-outline-light" title="Direct Courier Line">📞 ${DISPATCH_PHONE}</a>
          <span class="queue-status ${ticket.status === 'completed' ? 'completed' : ''}">${STATUS_LABELS[ticket.status] || ticket.status}</span>
        </div>
      </div>

      ${proximityAlertHtml}
      ${timeoutNoticeHtml}

      <div class="row g-3 mb-4">
        <div class="col-md-6"><small class="text-secondary">PICKUP</small><div class="fw-semibold">${escapeHtml(ticket.pickupAddress)}</div></div>
        <div class="col-md-6"><small class="text-secondary">DROP-OFF</small><div class="fw-semibold">${escapeHtml(ticket.dropoffAddress)}</div></div>
      </div>

      ${itemsFeedHtml}

      ${ticket.storeMenuUrl ? `
        <div class="mb-3">
          <a href="${escapeHtml(ticket.storeMenuUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info d-inline-flex align-items-center gap-2 py-1 px-2">
            <span>🔗</span> View Merchant Store / Menu Link ↗
          </a>
        </div>
      ` : ''}

      <ol class="timeline">
        ${steps.map(([key, label], i) => `
          <li class="${i <= currentIndex ? 'active' : ''}">
            <strong>${label}</strong>
            ${i === currentIndex ? `<div class="small text-secondary">Current stage • ${ticket.status === 'completed' ? 'Done' : 'Live updates connected'}</div>` : ''}
          </li>
        `).join('')}
      </ol>`;
  }

  function startLiveTracking(ticketId) {
    if (unsubscribeTracking) {
      unsubscribeTracking();
      unsubscribeTracking = null;
    }
    activeTrackingId = ticketId;

    if (db) {
      unsubscribeTracking = onSnapshot(doc(db, "tickets", ticketId), snapshot => {
        if (snapshot.exists()) {
          const liveData = { id: snapshot.id, ...snapshot.data() };
          renderTracking(liveData);
        } else {
          renderTracking(null);
        }
      }, err => {
        console.warn('Live tracking error:', err);
      });
    }
  }

  // --- Firebase & Auth Initialization ---
  function initApp() {
    try {
      if (!app) {
        app = initializeApp(firebaseConfig);
      }
      if (!auth) {
        auth = getAuth(app);
      }
      if (!db) {
        db = getFirestore(app);
      }

      // Process OAuth redirect result (smooth fallback from popup blockers, COOP, or mobile Safari)
      getRedirectResult(auth).then(result => {
        if (result && result.user) {
          dismissCustomerGate();
          showToast(`Welcome back, ${result.user.displayName || result.user.email}!`);
        }
      }).catch(err => {
        console.warn('OAuth redirect result:', err);
      });

      // Auth Observer: Handle Customer profile state
      onAuthStateChanged(auth, user => {
        if (user) {
          // Logged in user: Dismiss blackout gate and populate profile dropdown
          $('#customerAuthGate')?.classList.add('d-none');
          $('#navCustomerLoginBtn')?.classList.add('d-none');
          $('#navCustomerProfile')?.classList.remove('d-none');
          if ($('#navCustomerName')) $('#navCustomerName').textContent = user.displayName || user.email.split('@')[0];
          if ($('#navCustomerEmail')) $('#navCustomerEmail').textContent = user.email;
        } else {
          $('#navCustomerProfile')?.classList.add('d-none');
          $('#navCustomerLoginBtn')?.classList.remove('d-none');
          // If guest session active, dismiss gate; otherwise keep gate active
          if (localStorage.getItem('sendeke_guest') === 'true' || sessionStorage.getItem('sendeke_guest') === 'true') {
            $('#customerAuthGate')?.classList.add('d-none');
          } else {
            $('#customerAuthGate')?.classList.remove('d-none');
          }
        }
      });

      // 1. Sync Driver Status & Courier GPS in real time
      const driverDocRef = doc(db, "driver_status", "current");
      onSnapshot(driverDocRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          state.driverOnline = data.is_online ?? true;
          state.capacity = data.capacity ?? 3;
          state.serviceArea = data.service_area || defaultState.serviceArea;
          renderAvailability();

          // Live Map GPS Update
          updateCourierGps(data.latitude, data.longitude, data.is_sharing_location);
        }
      });

      // 2. Count Active Trips for the slot indicator
      const ticketsQuery = query(collection(db, "tickets"), limit(50));
      onSnapshot(ticketsQuery, snapshot => {
        const active = snapshot.docs.filter(d => !['completed', 'cancelled'].includes(d.data().status));
        state.activeTrips = active.length;
        renderAvailability();
      });

    } catch (err) {
      console.warn('Firebase init error, using local fallback:', err);
    }
  }

  // --- Customer Quick Profile Engine ---
  function initCustomerQuickProfile() {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('sendeke_customer_profile') || 'null');
      if (savedProfile && savedProfile.name) {
        const banner = $('#quickReorderBanner');
        const nameEl = $('#quickReorderName');
        if (banner) banner.classList.remove('d-none');
        if (nameEl) nameEl.textContent = savedProfile.name;
      }
    } catch (e) {}
  }

  $('#quickReorderApplyBtn')?.addEventListener('click', () => {
    try {
      const savedProfile = JSON.parse(localStorage.getItem('sendeke_customer_profile') || 'null');
      if (savedProfile) {
        if (savedProfile.name && $('#customerName')) $('#customerName').value = savedProfile.name;
        if (savedProfile.phone && $('#customerPhone')) $('#customerPhone').value = savedProfile.phone;
        if (savedProfile.address && $('#dropoffAddress')) $('#dropoffAddress').value = savedProfile.address;
        if (savedProfile.handOffPreference && $('#handOffPreference')) $('#handOffPreference').value = savedProfile.handOffPreference;
        if (savedProfile.trustedPersonName && $('#trustedPersonName')) $('#trustedPersonName').value = savedProfile.trustedPersonName;
        showToast(`Autofilled delivery info for ${savedProfile.name}.`);
        calculateEstimate();
      }
    } catch (e) {}
  });

  // --- Blacklist / 86'd Verification Engine ---
  async function checkCustomerBanned(phone = '', email = '') {
    const cleanP = String(phone).replace(/\D/g, '');
    const cleanE = String(email).trim().toLowerCase();

    // Check local blacklist
    const localBanned = JSON.parse(localStorage.getItem('sendeke_banned_list') || '[]');
    if (localBanned.some(b => b === cleanP || b === cleanE)) {
      $('#bannedScreenOverlay')?.classList.remove('d-none');
      return true;
    }

    // Check Firestore banned_users collection if db initialized
    if (db) {
      try {
        if (cleanP) {
          const phoneDoc = await getDoc(doc(db, "banned_users", cleanP));
          if (phoneDoc.exists()) {
            $('#bannedScreenOverlay')?.classList.remove('d-none');
            return true;
          }
        }
        if (cleanE) {
          const emailDoc = await getDoc(doc(db, "banned_users", cleanE));
          if (emailDoc.exists()) {
            $('#bannedScreenOverlay')?.classList.remove('d-none');
            return true;
          }
        }
      } catch (e) {}
    }
    return false;
  }

  // --- 4 Order Flow Toggle Handler ---
  $$('input[name="orderFlow"]').forEach(radio => {
    radio.addEventListener('change', event => {
      currentFlow = event.target.value;
      const isPartner = currentFlow === 'PARTNER_DELIVERY';
      const isPrepaid = currentFlow === 'PREPAID_PICKUP';
      const isSpecial = currentFlow === 'SPECIAL_REQUEST';
      const isShopPay = currentFlow === 'SHOP_AND_PAY';

      $('#cardFlowPartner')?.classList.toggle('active', isPartner);
      $('#cardFlowPrepaid')?.classList.toggle('active', isPrepaid);
      $('#cardFlowSpecial')?.classList.toggle('active', isSpecial);
      $('#cardFlowShopPay')?.classList.toggle('active', isShopPay);

      $('#prepaidSection')?.classList.toggle('d-none', !isPrepaid);
      $('#foodCostInputGroup')?.classList.toggle('d-none', isPrepaid);

      if ($('#pricingDescriptionText')) {
        if (isShopPay) {
          $('#pricingDescriptionText').textContent = 'Shop & Pay: $30 base (2-hour minimum @ $15/hr) + pre-funded grocery total via Cash App.';
        } else if (isSpecial) {
          $('#pricingDescriptionText').textContent = 'Special Request: $15 base rate. Courier places order & waits. Attach menu screenshots below.';
        } else if (isPrepaid) {
          $('#pricingDescriptionText').textContent = 'Pre-paid in merchant app: $10 flat courier delivery. $0 food charge.';
        } else {
          $('#pricingDescriptionText').textContent = 'Sweetfin Partner: $10 flat delivery with 0% menu markups.';
        }
      }
      calculateEstimate();
    });
  });

  // --- Multi-Page Flip-Booklet Intake (Up to 20 Images) ---
  const receiptFileInput = $('#receiptFileInput');
  receiptFileInput?.addEventListener('change', async event => {
    const files = [...(event.target.files || [])].slice(0, 20);
    if (!files.length) return;

    for (const file of files) {
      if (attachedBookletPages.length >= 20) break;
      await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDim = 900;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            attachedBookletPages.push(dataUrl);
            resolve();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    renderBookletPreview();
    showToast(`Attached ${attachedBookletPages.length} image page(s) to booklet.`);
  });

  function renderBookletPreview() {
    const previewWrap = $('#bookletPreviewWrap');
    const pageCounter = $('#bookletPageCounter');
    const activeImg = $('#bookletActiveImg');
    const pageLabel = $('#bookletCurrentPageLabel');
    const thumbWrap = $('#bookletThumbnails');

    if (!attachedBookletPages.length) {
      if (previewWrap) previewWrap.classList.add('d-none');
      if (pageCounter) pageCounter.textContent = '0 / 20 Pages';
      return;
    }

    if (bookletCurrentIndex >= attachedBookletPages.length) {
      bookletCurrentIndex = attachedBookletPages.length - 1;
    }

    if (previewWrap) previewWrap.classList.remove('d-none');
    if (pageCounter) pageCounter.textContent = `${attachedBookletPages.length} / 20 Pages`;
    if (activeImg) activeImg.src = attachedBookletPages[bookletCurrentIndex];
    if (pageLabel) pageLabel.textContent = `Page ${bookletCurrentIndex + 1} of ${attachedBookletPages.length}`;

    if (thumbWrap) {
      thumbWrap.innerHTML = attachedBookletPages.map((src, i) => `
        <button type="button" class="btn btn-sm p-1 rounded ${i === bookletCurrentIndex ? 'btn-info' : 'btn-outline-secondary'}" data-page="${i}" style="min-width: 44px; height: 44px;">
          <img src="${src}" alt="Thumb ${i+1}" style="width: 34px; height: 34px; object-fit: cover; border-radius: 4px;">
        </button>
      `).join('');
    }
  }

  $('#bookletPrevBtn')?.addEventListener('click', () => {
    if (bookletCurrentIndex > 0) {
      bookletCurrentIndex--;
      renderBookletPreview();
    }
  });

  $('#bookletNextBtn')?.addEventListener('click', () => {
    if (bookletCurrentIndex < attachedBookletPages.length - 1) {
      bookletCurrentIndex++;
      renderBookletPreview();
    }
  });

  $('#bookletThumbnails')?.addEventListener('click', event => {
    const btn = event.target.closest('button[data-page]');
    if (btn) {
      bookletCurrentIndex = Number(btn.dataset.page);
      renderBookletPreview();
    }
  });

  $('#bookletClearBtn')?.addEventListener('click', () => {
    attachedBookletPages = [];
    bookletCurrentIndex = 0;
    if ($('#receiptFileInput')) $('#receiptFileInput').value = '';
    renderBookletPreview();
    showToast('Booklet pages cleared.');
  });

  // --- DoorDash-Style Itemized Shopping Checklist & Cart ---
  let itemizedCart = [];

  function updateItemizedCartUI() {
    const tableBody = $('#itemizedCartTableBody');
    const badge = $('#itemizedCartBadge');
    const subtotalDisplay = $('#itemizedCartSubtotalDisplay');
    const foodInput = $('#foodCostInput');
    const detailsInput = $('#itemDetails');

    const totalCost = itemizedCart.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
    const totalCount = itemizedCart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    if (badge) badge.textContent = `${totalCount} ${totalCount === 1 ? 'Item' : 'Items'} ($${totalCost.toFixed(2)})`;
    if (subtotalDisplay) subtotalDisplay.textContent = `$${totalCost.toFixed(2)}`;

    if (tableBody) {
      if (!itemizedCart.length) {
        tableBody.innerHTML = `<tr id="itemizedEmptyRow"><td colspan="4" class="text-center text-secondary py-2 small">No items added yet. Click a quick staple chip above or enter an item!</td></tr>`;
      } else {
        tableBody.innerHTML = itemizedCart.map((item, idx) => `
          <tr>
            <td>
              <div class="fw-bold text-light">${escapeHtml(item.name)}</div>
            </td>
            <td><span class="badge bg-secondary-subtle text-light">${escapeHtml(item.size || 'Standard')}</span></td>
            <td class="text-end fw-semibold text-info">$${Number(item.price).toFixed(2)}</td>
            <td class="text-center">
              <button type="button" class="btn btn-sm btn-outline-danger py-0 px-2 remove-cart-item-btn" data-index="${idx}" title="Remove item">×</button>
            </td>
          </tr>
        `).join('');

        if (foodInput && totalCost > 0) {
          foodInput.value = totalCost.toFixed(2);
        }

        if (detailsInput && totalCost > 0) {
          detailsInput.value = itemizedCart.map(i => `${i.quantity || 1}x ${i.name} (${i.size || 'std'} • $${Number(i.price).toFixed(2)})`).join(', ');
        }
      }
    }

    calculateEstimate();
  }

  // Pre-packaged Grocery Bundles Data
  const GROCERY_BUNDLES = {
    breakfast: [
      { name: "Organic Whole Milk", size: "1 Gallon", price: 5.49 },
      { name: "Pasture-Raised Large Eggs", size: "1 Dozen", price: 6.29 },
      { name: "Dave's Killer Bread 21 Whole Grains", size: "27 oz", price: 6.99 }
    ],
    produce: [
      { name: "Organic Hass Avocados", size: "4-Pack Bag", price: 4.49 },
      { name: "Organic Honeycrisp Apples", size: "2 lbs", price: 4.99 },
      { name: "Organic Baby Spinach", size: "16 oz Tub", price: 4.52 }
    ],
    household: [
      { name: "Bounty Select-A-Size Paper Towels", size: "6 Triple Rolls", price: 14.99 },
      { name: "Colgate Total Whitening Toothpaste", size: "4.8 oz", price: 4.99 },
      { name: "Dawn Platinum Dish Soap", size: "24 oz", price: 3.99 }
    ],
    pantry: [
      { name: "Honey Nut Cheerios", size: "18.8 oz Box", price: 5.49 },
      { name: "LaCroix Sparkling Water", size: "12 pk (12 oz)", price: 5.99 },
      { name: "Jif Creamy Peanut Butter", size: "28 oz", price: 4.52 }
    ]
  };

  // Grocery Bundle Button Listeners
  $$('.grocery-bundle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const bundleKey = btn.dataset.bundle;
      const items = GROCERY_BUNDLES[bundleKey];
      if (items && items.length) {
        items.forEach(item => {
          itemizedCart.push({
            name: item.name,
            size: item.size,
            price: item.price,
            quantity: 1,
            inCart: false,
            outOfStock: false
          });
        });
        updateItemizedCartUI();
        showToast(`Added ${items.length} items from ${btn.textContent.trim()}!`);
        showConciergeMessage('Bundle Added', `Loaded ${items.length} items into your shopping checklist. Ready for checkout!`, 4000);
      }
    });
  });

  // Natural Text List Parser
  const COMMON_GROCERY_LOOKUP = [
    { regex: /milk/i, name: "Whole Milk", size: "1 Gallon", price: 5.49 },
    { regex: /egg/i, name: "Large Grade A Eggs", size: "1 Dozen", price: 6.29 },
    { regex: /bread/i, name: "Whole Grain Sliced Bread", size: "24 oz", price: 5.99 },
    { regex: /colgate|toothpaste/i, name: "Colgate Total Toothpaste", size: "4.8 oz", price: 4.99 },
    { regex: /avocado/i, name: "Hass Avocados", size: "4-Pack", price: 4.49 },
    { regex: /cheerio|cereal/i, name: "Cheerios Cereal", size: "18.8 oz", price: 5.49 },
    { regex: /water|lacroix|seltzer/i, name: "Sparkling Water", size: "12-Pack", price: 5.99 },
    { regex: /paper towel|bounty/i, name: "Paper Towels", size: "6 Rolls", price: 14.99 },
    { regex: /butter/i, name: "Sweet Cream Butter", size: "16 oz (4 Sticks)", price: 4.99 },
    { regex: /coffee/i, name: "Ground Organic Coffee", size: "12 oz Bag", price: 9.99 },
    { regex: /banana/i, name: "Organic Bananas", size: "1 Bunch (~2 lbs)", price: 1.99 },
    { regex: /apple/i, name: "Honeycrisp Apples", size: "2 lbs", price: 4.99 },
    { regex: /chicken/i, name: "Boneless Skinless Chicken Breast", size: "1.5 lbs", price: 8.99 },
    { regex: /beef|steak|ribeye/i, name: "Choice Ribeye Steak", size: "1 lb", price: 14.99 },
    { regex: /soap|body wash/i, name: "Dove Deep Moisture Body Wash", size: "22 oz", price: 7.49 }
  ];

  $('#parseListBtn')?.addEventListener('click', () => {
    const listInput = $('#naturalListInput');
    const rawText = listInput?.value.trim();
    if (!rawText) {
      showToast('Please type or paste some grocery items (e.g. milk, eggs, bread).');
      listInput?.focus();
      return;
    }

    // Split by commas or line breaks
    const rawItems = rawText.split(/[\n,]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (!rawItems.length) return;

    let addedCount = 0;
    rawItems.forEach(rawItem => {
      // Look for a known standard staple match
      const matched = COMMON_GROCERY_LOOKUP.find(lookup => lookup.regex.test(rawItem));
      if (matched) {
        itemizedCart.push({
          name: matched.name,
          size: matched.size,
          price: matched.price,
          quantity: 1,
          inCart: false,
          outOfStock: false
        });
      } else {
        // Fallback generic item
        const capitalized = rawItem.charAt(0).toUpperCase() + rawItem.slice(1);
        itemizedCart.push({
          name: capitalized,
          size: "Standard Size",
          price: 5.00,
          quantity: 1,
          inCart: false,
          outOfStock: false
        });
      }
      addedCount++;
    });

    if (listInput) listInput.value = '';
    updateItemizedCartUI();
    showToast(`Parsed and added ${addedCount} grocery items to checklist!`);
    showConciergeMessage('List Parsed & Auto-Filled', `Successfully converted <strong>${addedCount} items</strong> into your grocery shopping checklist!`, 4000);
  });

  // Store / Menu Link Auto-Scraper Handler
  $('#autoScrapeMenuBtn')?.addEventListener('click', async () => {
    const urlInput = $('#storeMenuUrlInput');
    const targetUrl = urlInput?.value.trim();
    if (!targetUrl) {
      showToast('Please paste a menu or store webpage URL first.');
      urlInput?.focus();
      return;
    }

    const btn = $('#autoScrapeMenuBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Fetching...';
    btn.disabled = true;

    try {
      let res;
      try {
        res = await fetch(`/api/scrape-menu?url=${encodeURIComponent(targetUrl)}`);
      } catch (e) {
        res = null;
      }

      if (res && res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          data.items.forEach(item => {
            itemizedCart.push({
              name: item.name,
              size: item.description || 'Standard',
              price: Number(item.price) || 12.00,
              quantity: 1,
              inCart: false,
              outOfStock: false
            });
          });
          updateItemizedCartUI();
          showToast(`Extracted ${data.items.length} items from online menu!`);
          showConciergeMessage('Menu Auto-Fetched', `Extracted <strong>${data.items.length} items</strong> directly from the menu link!`, 4000);
        } else {
          showToast('Menu link saved. Courier will reference online page during shopping.');
        }
      } else {
        const domain = new URL(targetUrl).hostname.replace('www.', '');
        showToast(`Linked to ${domain}. Courier will open directly during pickup.`);
      }
    } catch (err) {
      showToast('Store link saved for courier reference.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Quick Staple Chips click handlers
  $$('.staple-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.name;
      const size = btn.dataset.size || 'Standard';
      const price = Number(btn.dataset.price || 4.99);

      itemizedCart.push({
        name,
        size,
        price,
        quantity: 1,
        inCart: false,
        outOfStock: false
      });
      updateItemizedCartUI();
      showToast(`Added ${name} (${size}) to checklist!`);
      showConciergeMessage('Item Added to Checklist', `Added <strong>${escapeHtml(name)}</strong> ($${price.toFixed(2)}). Live total updated!`, 3500);
    });
  });

  // Manual Item Adder
  $('#addItemBtn')?.addEventListener('click', () => {
    const nameInput = $('#newItemName');
    const sizeInput = $('#newItemSize');
    const priceInput = $('#newItemPrice');

    const name = nameInput?.value.trim();
    const size = sizeInput?.value.trim() || 'Standard';
    const price = Number(priceInput?.value || 0);

    if (!name) {
      showToast('Please enter an item name or brand description.');
      nameInput?.focus();
      return;
    }
    if (price <= 0) {
      showToast('Please enter an estimated price.');
      priceInput?.focus();
      return;
    }

    itemizedCart.push({
      name,
      size,
      price,
      quantity: 1,
      inCart: false,
      outOfStock: false
    });

    if (nameInput) nameInput.value = '';
    if (sizeInput) sizeInput.value = '';
    if (priceInput) priceInput.value = '';

    updateItemizedCartUI();
    showToast(`Added ${name} ($${price.toFixed(2)})!`);
  });

  $('#itemizedCartTableBody')?.addEventListener('click', event => {
    const removeBtn = event.target.closest('.remove-cart-item-btn');
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.index);
      if (!isNaN(idx) && idx >= 0 && idx < itemizedCart.length) {
        const removed = itemizedCart.splice(idx, 1);
        updateItemizedCartUI();
        showToast(`Removed ${removed[0]?.name}.`);
      }
    }
  });

  // --- Front-of-Screen AI Concierge Helper ---
  let conciergeTimeout = null;

  function showConciergeMessage(title, textHtml, durationMs = 5000) {
    const bubble = $('#aiConciergeBubble');
    const titleEl = $('#aiConciergeTitle');
    const textEl = $('#aiConciergeMessage');
    if (!bubble || !titleEl || !textEl) return;

    if (conciergeTimeout) {
      clearTimeout(conciergeTimeout);
      conciergeTimeout = null;
    }

    titleEl.textContent = title;
    textEl.innerHTML = textHtml;
    bubble.classList.remove('d-none');

    if (durationMs > 0) {
      conciergeTimeout = setTimeout(() => {
        bubble.classList.add('d-none');
      }, durationMs);
    }
  }

  $('#closeConciergeBubbleBtn')?.addEventListener('click', () => {
    $('#aiConciergeBubble')?.classList.add('d-none');
    if (conciergeTimeout) clearTimeout(conciergeTimeout);
  });

  $('#aiConciergePill')?.addEventListener('click', () => {
    const bubble = $('#aiConciergeBubble');
    if (bubble && !bubble.classList.contains('d-none')) {
      bubble.classList.add('d-none');
    } else {
      showConciergeMessage(
        '90034 Concierge Radar',
        '⚡ <strong>Direct Neighborhood Service:</strong> We operate strictly in 90034 (Palms & Culver City). Flat $10 partner delivery, zero app markups, and in-person hand-offs guaranteed.',
        7000
      );
    }
  });

  // Contextual Concierge Triggers
  $('#handOffPreference')?.addEventListener('change', () => {
    showConciergeMessage(
      'Zero Unattended Porch Drops',
      '🔒 <strong>Proof of Hand-off:</strong> Deliveries must be received in person, given to a designated contact, or placed behind a secure keypad barrier.',
      5000
    );
  });

  $('#paymentMethodSelect')?.addEventListener('change', e => {
    if (e.target.value === 'CASH_APP') {
      showConciergeMessage(
        'Cash App Stand-In Pre-Funding',
        '💚 <strong>Payment Comment Required:</strong> Put your Full Name & 1st-person cell in Cash App note. Unfunded attempts refunded minus $5 attempt fee.',
        6000
      );
    }
  });

  // --- Google Places Autocomplete Engine for Store & Dropoff ---
  function initPlacesAutocomplete() {
    if (window.google && window.google.maps && window.google.maps.places) {
      const pickupInput = $('#pickupAddress');
      const dropoffInput = $('#dropoffAddress');

      const defaultBounds = {
        north: 34.0500,
        south: 34.0000,
        east: -118.3700,
        west: -118.4200
      };

      if (pickupInput) {
        try {
          const pickupAuto = new google.maps.places.Autocomplete(pickupInput, {
            bounds: defaultBounds,
            componentRestrictions: { country: 'us' },
            fields: ['name', 'formatted_address', 'place_id', 'website']
          });
          pickupAuto.addListener('place_changed', () => {
            const place = pickupAuto.getPlace();
            if (place && place.name) {
              pickupInput.value = `${place.name} (${place.formatted_address || ''})`.trim();
              if (place.website && $('#storeMenuUrlInput') && !$('#storeMenuUrlInput').value) {
                $('#storeMenuUrlInput').value = place.website;
                showConciergeMessage('Menu Website Detected', `Linked official store website: ${escapeHtml(place.name)}`, 4000);
              }
            }
          });
        } catch (e) {
          console.warn('Places Autocomplete init error:', e);
        }
      }

      if (dropoffInput) {
        try {
          const dropoffAuto = new google.maps.places.Autocomplete(dropoffInput, {
            bounds: defaultBounds,
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address']
          });
          dropoffAuto.addListener('place_changed', () => {
            const place = dropoffAuto.getPlace();
            if (place && place.formatted_address) {
              dropoffInput.value = place.formatted_address;
            }
          });
        } catch (e) {
          console.warn('Places Autocomplete dropoff init error:', e);
        }
      }
    }
  }

  // Ensure Places Autocomplete is initialized via unified single loader
  mapsConfig.loadScript('places,geometry').then(() => {
    setTimeout(initPlacesAutocomplete, 100);
  }).catch(e => {
    console.warn('Places script load notice:', e);
  });

  // --- Upfront Tip Input ($2.50 Minimum Enforced Floor) ---
  const directTipInput = $('#directTipInput');
  directTipInput?.addEventListener('focus', function() {
    // Tap to edit: select all for effortless typing
    this.select();
  });

  directTipInput?.addEventListener('input', () => {
    calculateEstimate();
  });

  directTipInput?.addEventListener('blur', function() {
    const val = Number(this.value);
    if (!this.value || isNaN(val) || val < 2.50) {
      this.value = '2.50';
      showToast('Minimum upfront courier tip is $2.50 (zero tip-baiting).');
    }
    calculateEstimate();
  });

  $$('.quick-tip-add').forEach(btn => {
    btn.addEventListener('click', () => {
      const add = Number(btn.dataset.add || 2.50);
      const current = Number(directTipInput?.value || 2.50);
      if (directTipInput) directTipInput.value = (current + add).toFixed(2);
      calculateEstimate();
    });
  });

  // --- Form Submission & Validation ---
  $('#ticketForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.checkValidity()) {
      event.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    // 1st-Person Direct Cell Phone Validation
    const rawPhone = $('#customerPhone')?.value || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      event.stopPropagation();
      $('#customerPhone')?.classList.add('is-invalid');
      showToast('Must be a direct 10-digit mobile cell phone (no switchboards or receptionists).');
      return;
    }

    // Check if customer is 86'd (banned)
    const userEmail = auth?.currentUser?.email || '';
    if (await checkCustomerBanned(cleanPhone, userEmail)) {
      event.stopPropagation();
      $('#bannedScreenOverlay')?.classList.remove('d-none');
      showToast('Access Revoked: Account has been 86\'d.');
      return;
    }

    const { foodCost, courierFee, tip, courierTakeHome, total, isPrepaid } = calculateEstimate();
    const paymentMethod = $('#paymentMethodSelect')?.value || 'CASH_APP';
    const orderNumber = $('#prepaidOrderNumber')?.value.trim() || '';
    const pickupName = $('#prepaidPickupName')?.value.trim() || '';
    const handOffPref = $('#handOffPreference')?.value || 'HAND_TO_ME';
    const trustedName = $('#trustedPersonName')?.value.trim() || '';

    let customerId = localStorage.getItem('sendeke_customer_id');
    if (!customerId) {
      customerId = `CUST-90034-${Math.floor(1000 + Math.random() * 9000)}`;
      localStorage.setItem('sendeke_customer_id', customerId);
    }

    const ticket = {
      id: makeTicketId(),
      customerId: customerId,
      customerName: $('#customerName').value.trim(),
      customerPhone: rawPhone.trim() || DISPATCH_PHONE,
      customerPhoneClean: cleanPhone,
      pickupAddress: $('#pickupAddress').value.trim(),
      dropoffAddress: $('#dropoffAddress').value.trim(),
      handOffPreference: handOffPref,
      trustedPersonName: trustedName,
      requestType: $('#requestType').value,
      requestedTime: $('#requestedTime').value,
      itemDetails: $('#itemDetails').value.trim(),
      specialInstructions: $('#specialInstructions')?.value.trim() || '',
      orderFlow: currentFlow,
      orderNumber: orderNumber,
      pickupName: pickupName,
      storeMenuUrl: $('#storeMenuUrlInput')?.value.trim() || '',
      items: [...itemizedCart],
      bookletImages: attachedBookletPages || [],
      receiptImage: attachedBookletPages.length > 0 ? attachedBookletPages[0] : (attachedReceiptData || null),
      foodCost: foodCost,
      courierFee: courierFee,
      tipAmount: tip,
      courierTakeHome: courierTakeHome,
      estimate: total,
      totalAmount: total,
      paymentMethod: paymentMethod,
      paymentStatus: 'ESCROW_HELD',
      escrowStatus: 'held_in_escrow',
      status: 'requested',
      createdAt: new Date().toISOString(),
      source: 'customer-form-2026'
    };

    // Save Customer Quick Re-Order Profile
    const profile = {
      customerId: customerId,
      name: ticket.customerName,
      phone: ticket.customerPhone,
      address: ticket.dropoffAddress,
      handOffPreference: handOffPref,
      trustedPersonName: trustedName,
      lastUpdated: new Date().toISOString()
    };
    try {
      localStorage.setItem('sendeke_customer_profile', JSON.stringify(profile));
    } catch (e) {}

    if (db) {
      try {
        await setDoc(doc(db, "tickets", ticket.id), ticket);
        await setDoc(doc(db, "customers", customerId), {
          id: customerId,
          name: ticket.customerName,
          phone: ticket.customerPhone,
          lastActive: new Date().toISOString()
        }, { merge: true });
        await addDoc(collection(db, "ticket_events"), {
          ticket_id: ticket.id,
          status: 'requested',
          timestamp: new Date().toISOString(),
          note: `Customer dispatched [${currentFlow}] (Base: $${courierFee.toFixed(2)}, Tip: $${tip.toFixed(2)}, Escrow Held: $${total.toFixed(2)})`
        });
      } catch (err) {
        console.warn('Firestore ticket save error:', err);
      }
    }

    // Play 2026 Micro-Story E-Bike Courier Sequence
    const dioramaBtn = $('#dioramaSubmitBtn');
    const sprite = $('#courierSprite');
    const defaultLabel = $('#dioramaDefaultLabel');
    const statusOverlay = $('#dioramaStatusOverlay');
    const statusText = $('#dioramaStatusText');

    if (dioramaBtn && sprite && defaultLabel && statusOverlay && statusText) {
      defaultLabel.style.opacity = '0';
      statusOverlay.style.opacity = '1';
      statusText.textContent = '⚡ Courier Approaching Store...';

      sprite.classList.remove('animating-courier');
      void sprite.offsetWidth; // trigger reflow
      sprite.classList.add('animating-courier');

      setTimeout(() => {
        if (statusText) statusText.textContent = '🍱 Grabbing Orders & Securing Backpack...';
      }, 700);

      setTimeout(() => {
        if (statusText) statusText.textContent = '🚀 Fastening Helmet & Hitting the Street!';
      }, 1500);

      // Allow micro-story animation to execute
      await new Promise(resolve => setTimeout(resolve, 2200));

      sprite.classList.remove('animating-courier');
      defaultLabel.style.opacity = '1';
      statusOverlay.style.opacity = '0';
    }

    form.reset();
    form.classList.remove('was-validated');
    attachedReceiptData = null;
    attachedBookletPages = [];
    bookletCurrentIndex = 0;
    renderBookletPreview();
    itemizedCart = [];
    updateItemizedCartUI();
    if ($('#storeMenuUrlInput')) $('#storeMenuUrlInput').value = '';
    currentFlow = 'PARTNER_DELIVERY';
    currentTip = 2.50;
    if (directTipInput) directTipInput.value = '2.50';

    $('#prepaidSection')?.classList.add('d-none');
    $('#foodCostInputGroup')?.classList.remove('d-none');
    $('#cardFlowPartner')?.classList.add('active');
    $('#cardFlowPrepaid')?.classList.remove('active');
    $('#cardFlowSpecial')?.classList.remove('active');
    $('#cardFlowShopPay')?.classList.remove('active');

    // Auto-populate ticket code in tracker
    const trackingCodeInput = $('#trackingCode');
    if (trackingCodeInput) trackingCodeInput.value = ticket.id;

    // Smoothly switch to the Live Tracking view
    switchView('track');
    startLiveTracking(ticket.id);
    showToast(`Ticket ${ticket.id} dispatched! Total: $${total.toFixed(2)} (${paymentMethod.replace(/_/g, ' ')}). Courier takes: $${courierTakeHome.toFixed(2)}.`);
  });

  // Wire 2026 Diorama Button click to form submit
  $('#dioramaSubmitBtn')?.addEventListener('click', () => {
    const form = $('#ticketForm');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        $('#submitTicketBtn')?.click();
      }
    }
  });

  // Sweetfin Cumulative Quick Order Handler
  document.addEventListener('click', event => {
    const bowlBtn = event.target.closest('.sweetfin-quick-order-btn');
    if (bowlBtn) {
      const name = bowlBtn.dataset.name || 'Signature Poke Bowl';
      const price = Number(bowlBtn.dataset.price || 16.95);
      const store = bowlBtn.dataset.store || 'Sweetfin (Culver City / Palms)';

      currentFlow = 'COUNTER_PURCHASE';
      $('#prepaidSection')?.classList.add('d-none');
      $('#foodCostInputGroup')?.classList.remove('d-none');

      if ($('#pickupAddress')) $('#pickupAddress').value = store;

      // Cumulative itemDetails and food cost calculation
      const detailsInput = $('#itemDetails');
      const foodInput = $('#foodCostInput');
      const existingDetails = (detailsInput?.value || '').trim();
      const existingCost = Number(foodInput?.value || 0);

      if (existingDetails && existingCost > 0) {
        detailsInput.value = `${existingDetails} + 1x ${name} ($${price.toFixed(2)})`;
        foodInput.value = (existingCost + price).toFixed(2);
      } else {
        detailsInput.value = `1x ${name} ($${price.toFixed(2)})`;
        foodInput.value = price.toFixed(2);
      }

      if ($('#requestedTime')) $('#requestedTime').value = 'Lunch Window 2 (12:15 PM - 1:00 PM)';
      if ($('#estimatedMiles')) $('#estimatedMiles').value = '1.5';

      const est = calculateEstimate();
      switchView('request');
      showToast(`Added ${name}! Cumulative Cart: $${est.foodCost.toFixed(2)} food + $10 courier + $${est.tip.toFixed(2)} tip = $${est.total.toFixed(2)}. Text Allotment: 5/5 remaining.`);
      $('#dropoffAddress')?.focus();
    }
  });

  // 4-Daypart Station Tab Switcher (Morning, Midday Lunch, Evening, Late-Night Bodega)
  document.addEventListener('click', event => {
    const tabBtn = event.target.closest('.daypart-pill-btn');
    if (!tabBtn) return;
    const targetStation = tabBtn.dataset.station;
    if (!targetStation) return;

    document.querySelectorAll('.daypart-pill-btn').forEach(btn => btn.classList.remove('active'));
    tabBtn.classList.add('active');

    document.querySelectorAll('.daypart-station-panel').forEach(panel => {
      if (panel.id === `stationPanel_${targetStation}`) {
        panel.classList.remove('d-none');
      } else {
        panel.classList.add('d-none');
      }
    });
  });

  // Check Transferred Cart from menu.html
  function checkTransferredCart() {
    try {
      const raw = localStorage.getItem('sendeke_pending_cart');
      if (raw) {
        const data = JSON.parse(raw);
        localStorage.removeItem('sendeke_pending_cart');
        if (data.itemDetails && data.foodSubtotal) {
          currentFlow = 'COUNTER_PURCHASE';
          $('#prepaidSection')?.classList.add('d-none');
          $('#foodCostInputGroup')?.classList.remove('d-none');

          if ($('#pickupAddress')) $('#pickupAddress').value = 'Sweetfin (Culver City / Palms)';
          if ($('#itemDetails')) $('#itemDetails').value = data.itemDetails;
          if ($('#foodCostInput')) $('#foodCostInput').value = Number(data.foodSubtotal).toFixed(2);
          if (data.tip) currentTip = Number(data.tip);

          calculateEstimate();
          switchView('request');
          showToast(`Transferred Sweetfin Cart (${data.count} items). Food: $${Number(data.foodSubtotal).toFixed(2)} • Total: $${Number(data.total).toFixed(2)}. Enter drop-off address to confirm!`);
        }
      }
    } catch (e) {}
  }

  $('#trackingForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const code = $('#trackingCode')?.value.trim().toUpperCase();
    if (code) {
      startLiveTracking(code);
    }
  });

  $('#recalculateBtn')?.addEventListener('click', calculateEstimate);
  $('#estimatedMiles')?.addEventListener('input', calculateEstimate);
  $('#foodCostInput')?.addEventListener('input', calculateEstimate);
  $('#requestType')?.addEventListener('change', calculateEstimate);



  // --- Customer Blackout Gate & Zero-Auth Controls ---
  const dismissCustomerGate = () => {
    $('#customerAuthGate')?.classList.add('d-none');
  };

  // 1. Zero-Auth: Continue as Guest
  $('#guestContinueBtn')?.addEventListener('click', () => {
    localStorage.setItem('sendeke_guest', 'true');
    dismissCustomerGate();
    showToast('Zero-barrier guest mode enabled. Welcome to SenDeke.to!');
  });

  // 5. Shared Google Sign-In Trigger (invoked from both navbar and modal)
  const triggerGoogleSignIn = async () => {
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
        dismissCustomerGate();
        showToast('Signed in with Google!');
      } catch (popupErr) {
        console.warn('Customer Google popup error:', popupErr);
        if (popupErr.code === 'auth/popup-blocked' ||
            popupErr.code === 'auth/popup-closed-by-user' ||
            popupErr.code === 'auth/cancelled-popup-request' ||
            popupErr.message?.includes('popup') ||
            popupErr.code === 'auth/internal-error') {
          showToast('Popup blocked. Redirecting to Google Sign-In...');
          await signInWithRedirect(auth, provider);
        } else {
          showToast('Google Sign-in: ' + (popupErr.message || 'Error'));
        }
      }
    } catch (err) {
      console.warn('Customer Google sign-in failure:', err);
      showToast('Google Sign-in: ' + (err.message || 'Please retry'));
    }
  };

  $('#customerGoogleBtn')?.addEventListener('click', triggerGoogleSignIn);
  $('#navCustomerLoginBtn')?.addEventListener('click', triggerGoogleSignIn);

  // 6. Sign Out Button in Account Dropdown
  $('#customerSignOutBtn')?.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    localStorage.removeItem('sendeke_guest');
    localStorage.removeItem('sendeke_customer_email');
    $('#navCustomerProfile')?.classList.add('d-none');
    $('#navCustomerLoginBtn')?.classList.remove('d-none');
    $('#customerAuthGate')?.classList.remove('d-none');
    showToast('Signed out successfully.');
  });


  // Service worker registration
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('assets/js/sw.js', { scope: './' }).catch(console.warn));
  }

  // Initialize view & components
  initApp();
  initCustomerQuickProfile();
  calculateEstimate();
  renderAvailability();
  initTrackerMap();

  // Check if arriving with transferred Sweetfin cart or #request
  if (location.hash === '#request' || localStorage.getItem('sendeke_pending_cart')) {
    switchView('request');
    checkTransferredCart();
  } else if (location.hash === '#track') {
    switchView('track');
  } else {
    switchView('home');
    checkTransferredCart();
  }
})();
