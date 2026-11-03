import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  onSnapshot,
  limit
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

(() => {
  'use strict';

  const DISPATCH_PIN = '90034';
  const ADMIN_EMAILS = [
    'sendeke.to@gmail.com',
    'shynetyme@gmail.com',
    'shynetyme.works@gmail.com',
    'deke206@gmail.com',
    'deke@sendeke.to',
    'deke@sendeketo.com',
    'transxlimo@gmail.com'
  ];

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

  let state = {
    driverOnline: true,
    capacity: 3,
    serviceArea: 'West L.A. / Culver City (90034)',
    isGpsBroadcasting: false,
    gpsWatchId: null
  };

  function showToast(message) {
    const el = $('#settingsToastMessage');
    if (el) el.textContent = message;
    const toastEl = $('#settingsToast');
    if (toastEl && window.bootstrap) {
      bootstrap.Toast.getOrCreateInstance(toastEl).show();
    }
  }

  function unlockSettings(userName = 'Courier') {
    $('#driverAuthGate')?.classList.add('d-none');
    $('#settingsMainContent')?.classList.remove('d-none');
    $('#driverSettingsNavActions')?.classList.remove('d-none');
    localStorage.setItem('sendeke_pin_unlocked', 'true');
    sessionStorage.setItem('sendeke_pin_unlocked', 'true');
    localStorage.setItem('sendeke_admin_unlocked', 'true');
    sessionStorage.setItem('sendeke_admin_unlocked', 'true');
    showToast(`Welcome back, ${userName}. Settings ready.`);
  }

  function lockSettings() {
    $('#driverAuthGate')?.classList.remove('d-none');
    $('#settingsMainContent')?.classList.add('d-none');
    $('#driverSettingsNavActions')?.classList.add('d-none');
    localStorage.removeItem('sendeke_pin_unlocked');
    sessionStorage.removeItem('sendeke_pin_unlocked');
    localStorage.removeItem('sendeke_admin_unlocked');
    sessionStorage.removeItem('sendeke_admin_unlocked');
  }

  // Check persistent unlock
  const initialPinUnlocked = localStorage.getItem('sendeke_pin_unlocked') === 'true' ||
                             sessionStorage.getItem('sendeke_pin_unlocked') === 'true' ||
                             localStorage.getItem('sendeke_admin_unlocked') === 'true' ||
                             sessionStorage.getItem('sendeke_admin_unlocked') === 'true';
  if (initialPinUnlocked) {
    unlockSettings('Authorized Courier');
  }

  onAuthStateChanged(auth, user => {
    if (user) {
      const email = (user.email || '').toLowerCase();
      const isAuthorized = ADMIN_EMAILS.some(e => e.toLowerCase() === email);
      if (isAuthorized) {
        unlockSettings(user.displayName || user.email);
      } else {
        const pinUnlocked = localStorage.getItem('sendeke_pin_unlocked') === 'true' ||
                            localStorage.getItem('sendeke_admin_unlocked') === 'true';
        if (!pinUnlocked) {
          lockSettings();
          showToast(`Access Denied: ${user.email} not authorized.`);
        }
      }
    } else {
      const pinUnlocked = localStorage.getItem('sendeke_pin_unlocked') === 'true' ||
                          sessionStorage.getItem('sendeke_pin_unlocked') === 'true' ||
                          localStorage.getItem('sendeke_admin_unlocked') === 'true' ||
                          sessionStorage.getItem('sendeke_admin_unlocked') === 'true';
      if (pinUnlocked) {
        unlockSettings('Authorized Courier');
      } else {
        lockSettings();
      }
    }
  });

  // Auth Button Handlers
  $('#googleSignInBtn')?.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn('Google sign-in error:', err);
      showToast('Google Sign-in: ' + (err.message || 'Cancelled'));
    }
  });

  $('#passcodeForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const pin = $('#passcodeInput')?.value.trim();
    if (pin === DISPATCH_PIN) {
      localStorage.setItem('sendeke_pin_unlocked', 'true');
      sessionStorage.setItem('sendeke_pin_unlocked', 'true');
      unlockSettings('Courier (PIN)');
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
    lockSettings();
    showToast('Settings Console locked.');
  });

  // --- Real-time Sync from Firestore ---
  function initFirestoreSync() {
    try {
      const driverDocRef = doc(db, "driver_status", "current");
      onSnapshot(driverDocRef, snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          state.driverOnline = data.is_online ?? true;
          state.capacity = data.capacity ?? 3;
          state.serviceArea = data.service_area || 'West L.A. / Culver City (90034)';
          state.isGpsBroadcasting = data.is_sharing_location ?? false;

          renderFormFields();
        }
      });

      // Active tickets query for live load badge
      const ticketsQuery = query(collection(db, "tickets"), limit(50));
      onSnapshot(ticketsQuery, snapshot => {
        const active = snapshot.docs.filter(d => !['completed', 'cancelled'].includes(d.data().status));
        const activeCountEl = $('#settingsActiveCount');
        if (activeCountEl) {
          activeCountEl.textContent = `${active.length} / ${state.capacity} Active`;
        }
      });
    } catch (err) {
      console.warn('Firestore sync error:', err);
    }
  }

  function renderFormFields() {
    const onlineSwitch = $('#settingsOnlineSwitch');
    if (onlineSwitch) onlineSwitch.checked = state.driverOnline;

    const availBadge = $('#availabilityBadge');
    if (availBadge) {
      availBadge.textContent = state.driverOnline ? 'ONLINE' : 'OFFLINE';
      availBadge.className = state.driverOnline ? 'badge text-bg-success px-3 py-2 fs-6' : 'badge text-bg-danger px-3 py-2 fs-6';
    }

    const navStatusDot = $('#navDriverStatusDot');
    const navStatusText = $('#navDriverStatusText');
    if (navStatusDot && navStatusText) {
      navStatusDot.style.backgroundColor = state.driverOnline ? '#00D632' : '#dc3545';
      navStatusText.textContent = state.driverOnline ? 'ONLINE' : 'OFFLINE';
    }

    const capacitySelect = $('#settingsCapacitySelect');
    if (capacitySelect) capacitySelect.value = String(state.capacity);

    const areaInput = $('#settingsAreaInput');
    if (areaInput) areaInput.value = state.serviceArea;

    const gpsToggle = $('#settingsGpsToggle');
    if (gpsToggle) gpsToggle.checked = state.isGpsBroadcasting;

    const gpsPill = $('#settingsGpsPill');
    if (gpsPill) {
      gpsPill.textContent = state.isGpsBroadcasting ? 'BROADCASTING' : 'STANDBY';
      gpsPill.className = state.isGpsBroadcasting ? 'badge text-bg-success px-3 py-2 fs-6' : 'badge text-bg-secondary px-3 py-2 fs-6';
    }
  }

  // --- Save Settings to Firestore ---
  async function saveSettings() {
    const isOnline = Boolean($('#settingsOnlineSwitch')?.checked);
    const capacity = Number($('#settingsCapacitySelect')?.value || 3);
    const serviceArea = $('#settingsAreaInput')?.value.trim() || 'West L.A. / Culver City (90034)';
    const isGpsBroadcasting = Boolean($('#settingsGpsToggle')?.checked);

    state.driverOnline = isOnline;
    state.capacity = capacity;
    state.serviceArea = serviceArea;
    state.isGpsBroadcasting = isGpsBroadcasting;

    try {
      const driverDocRef = doc(db, "driver_status", "current");
      await setDoc(driverDocRef, {
        is_online: isOnline,
        capacity: capacity,
        service_area: serviceArea,
        is_sharing_location: isGpsBroadcasting,
        updated_at: new Date().toISOString()
      }, { merge: true });

      showToast(`Settings synchronized: ${isOnline ? 'ONLINE' : 'OFFLINE'}, Capacity ${capacity}, Area updated.`);
      renderFormFields();
    } catch (err) {
      console.error('Failed to save settings:', err);
      showToast('Error saving settings to cloud: ' + err.message);
    }
  }

  // Real-time GPS Broadcast handling
  function handleGpsToggle() {
    const isChecked = $('#settingsGpsToggle')?.checked;
    if (isChecked) {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported on this browser.');
        $('#settingsGpsToggle').checked = false;
        return;
      }

      state.gpsWatchId = navigator.geolocation.watchPosition(
        async position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = Math.round(position.coords.accuracy);

          const coordsEl = $('#settingsGpsCoords');
          if (coordsEl) coordsEl.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

          const accEl = $('#settingsGpsAccuracy');
          if (accEl) accEl.textContent = `±${accuracy}m`;

          try {
            await setDoc(doc(db, "driver_status", "current"), {
              latitude: lat,
              longitude: lng,
              heading: position.coords.heading || 0,
              speed: position.coords.speed || 0,
              is_sharing_location: true,
              last_gps_ping: new Date().toISOString()
            }, { merge: true });
          } catch (e) {}
        },
        error => {
          console.warn('GPS Watch error:', error);
          showToast(`GPS Error: ${error.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 12000 }
      );
    } else {
      if (state.gpsWatchId !== null) {
        navigator.geolocation?.clearWatch(state.gpsWatchId);
        state.gpsWatchId = null;
      }
      const coordsEl = $('#settingsGpsCoords');
      if (coordsEl) coordsEl.textContent = 'Standby (GPS Off)';
      const accEl = $('#settingsGpsAccuracy');
      if (accEl) accEl.textContent = '—';

      try {
        setDoc(doc(db, "driver_status", "current"), {
          is_sharing_location: false,
          last_gps_ping: new Date().toISOString()
        }, { merge: true });
      } catch (e) {}
    }
  }

  $('#saveSettingsBtn')?.addEventListener('click', saveSettings);
  $('#topSaveBtn')?.addEventListener('click', saveSettings);
  $('#settingsOnlineSwitch')?.addEventListener('change', saveSettings);
  $('#settingsGpsToggle')?.addEventListener('change', handleGpsToggle);

  initFirestoreSync();
})();
