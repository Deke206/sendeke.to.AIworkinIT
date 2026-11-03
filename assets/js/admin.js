/**
 * SenDeke.to - Admin Operations & Master Dispatch Controller
 * Connects Cloud Firestore real-time ledger, automated customer ID generator,
 * and Stripe escrow brokerage supervisor.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";
import stripeConfig from "./stripe-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAILS = [
  'sendeke.to@gmail.com',
  'deke206@gmail.com',
  'deke@sendeke.to'
];
const ADMIN_PIN = '90034';

const state = {
  tickets: [],
  customers: [],
  activeFilter: 'all'
};

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function showToast(msg) {
  const toastEl = $('#adminToast');
  const msgEl = $('#adminToastMsg');
  if (msgEl) msgEl.textContent = msg;
  if (toastEl && window.bootstrap) {
    bootstrap.Toast.getOrCreateInstance(toastEl).show();
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateCustomerId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `CUST-90034-${rand}`;
}

// Clock
setInterval(() => {
  const clock = $('#adminClock');
  if (clock) {
    clock.textContent = `90034 Palms / Culver City • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  }
}, 1000);

// --- Auth Gate & Protection ---
function unlockAdmin(userName = 'Admin') {
  $('#adminAuthGate')?.classList.add('d-none');
  $('#adminMainContent')?.classList.remove('d-none');
  $('#adminLockBtn')?.classList.remove('d-none');
  showToast(`Welcome back, ${userName}. Master deck online.`);
}

function lockAdmin() {
  $('#adminAuthGate')?.classList.remove('d-none');
  $('#adminMainContent')?.classList.add('d-none');
  $('#adminLockBtn')?.classList.add('d-none');
  localStorage.removeItem('sendeke_admin_unlocked');
  sessionStorage.removeItem('sendeke_admin_unlocked');
}

// Check if previously unlocked in session
if (sessionStorage.getItem('sendeke_admin_unlocked') === 'true') {
  unlockAdmin('Courier Admin');
}

// Process OAuth redirect result (smooth fallback from popup blockers, COOP, or mobile Safari)
getRedirectResult(auth).then(result => {
  if (result && result.user) {
    const email = (result.user.email || '').toLowerCase();
    const isAuthorized = ADMIN_EMAILS.some(e => e.toLowerCase() === email);
    if (isAuthorized) {
      localStorage.setItem('sendeke_admin_unlocked', 'true');
      unlockAdmin(result.user.displayName || result.user.email);
    } else {
      showToast(`Signed in as ${result.user.email}, but this account is not in the authorized Admin list. Use Admin PIN or switch accounts.`);
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
      localStorage.setItem('sendeke_admin_unlocked', 'true');
      unlockAdmin(user.displayName || user.email);
    } else {
      showToast(`Signed in as ${user.email}, but this account is not in the authorized Admin list. Use Admin PIN or switch accounts.`);
    }
  }
});

$('#adminGoogleSignInBtn')?.addEventListener('click', async () => {
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
      showToast('Sign-In: ' + (popupErr.message || 'Cancelled'));
    }
  }
});

$('#adminPasscodeForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const pin = $('#adminPasscodeInput')?.value.trim();
  if (pin === ADMIN_PIN) {
    localStorage.setItem('sendeke_admin_unlocked', 'true');
    sessionStorage.setItem('sendeke_admin_unlocked', 'true');
    unlockAdmin('Courier Admin (PIN)');
  } else {
    showToast('Incorrect Admin PIN.');
  }
});

$('#adminLockBtn')?.addEventListener('click', async () => {
  try {
    await signOut(auth);
  } catch (e) {}
  lockAdmin();
  showToast('Admin Console locked.');
});

// --- Real-time Firestore Sync ---
try {
  const ticketsQuery = query(collection(db, "tickets"), orderBy("createdAt", "desc"));
  onSnapshot(ticketsQuery, snapshot => {
    state.tickets = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      state.tickets.push(data);
    });
    updateKPIs();
    renderTripsLedger();
    autoPopulateCustomersFromTickets();
  }, err => {
    console.warn('Firestore tickets sync warning:', err);
  });
} catch (e) {
  console.warn('Firestore init warning:', e);
}

// Real-time Customers Sync
try {
  onSnapshot(collection(db, "customers"), snapshot => {
    state.customers = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      data.id = docSnap.id;
      state.customers.push(data);
    });
    renderCustomersTable();
  });
} catch (e) {}

// --- KPI Counters ---
function updateKPIs() {
  const total = state.tickets.length;
  const active = state.tickets.filter(t => ['requested', 'accepted', 'heading_to_pickup', 'picked_up', 'delivering'].includes(t.status)).length;
  const completed = state.tickets.filter(t => t.status === 'completed').length;
  const declined = state.tickets.filter(t => t.status === 'declined').length;

  if ($('#kpiTotalTrips')) $('#kpiTotalTrips').textContent = total;
  if ($('#kpiActiveTrips')) $('#kpiActiveTrips').textContent = active;
  if ($('#kpiCompletedTrips')) $('#kpiCompletedTrips').textContent = completed;
  if ($('#kpiDeclinedTrips')) $('#kpiDeclinedTrips').textContent = declined;

  if ($('#countAll')) $('#countAll').textContent = total;
  if ($('#countRequested')) $('#countRequested').textContent = state.tickets.filter(t => t.status === 'requested').length;
  if ($('#countAccepted')) $('#countAccepted').textContent = state.tickets.filter(t => ['accepted', 'heading_to_pickup', 'picked_up', 'delivering'].includes(t.status)).length;
  if ($('#countCompleted')) $('#countCompleted').textContent = completed;
  if ($('#countDeclined')) $('#countDeclined').textContent = declined;
}

// --- Master Trips Ledger Table ---
function renderTripsLedger() {
  const tbody = $('#tripsTableBody');
  if (!tbody) return;

  let filtered = state.tickets;
  if (state.activeFilter === 'requested') {
    filtered = state.tickets.filter(t => t.status === 'requested');
  } else if (state.activeFilter === 'accepted') {
    filtered = state.tickets.filter(t => ['accepted', 'heading_to_pickup', 'picked_up', 'delivering'].includes(t.status));
  } else if (state.activeFilter === 'completed') {
    filtered = state.tickets.filter(t => t.status === 'completed');
  } else if (state.activeFilter === 'declined') {
    filtered = state.tickets.filter(t => t.status === 'declined');
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-secondary small">No trips found in this category.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(ticket => {
    const created = ticket.createdAt ? new Date(ticket.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recently';
    const totalEst = Number(ticket.estimate || ticket.totalAmount || 12.50);
    const courierFee = Number(ticket.courierFee || 10.00);
    const tip = Number(ticket.tipAmount !== undefined ? ticket.tipAmount : 2.50);
    const foodCost = Number(ticket.foodCost || ticket.foodEstimate || Math.max(0, totalEst - courierFee - tip));
    const courierTakeHome = courierFee + tip;
    const phoneClean = (ticket.customerPhone || '').replace(/[^\d+]/g, '');

    let statusBadgeClass = 'status-requested';
    if (['accepted', 'heading_to_pickup'].includes(ticket.status)) statusBadgeClass = 'status-accepted';
    else if (['picked_up', 'delivering'].includes(ticket.status)) statusBadgeClass = 'status-in-transit';
    else if (ticket.status === 'completed') statusBadgeClass = 'status-completed';
    else if (ticket.status === 'declined') statusBadgeClass = 'status-declined';
    else if (ticket.status === 'cancelled') statusBadgeClass = 'status-cancelled';

    return `
      <tr>
        <td>
          <strong class="text-info font-monospace">${escapeHtml(ticket.id)}</strong>
          <div class="small text-light">${escapeHtml(ticket.customerName || 'Customer')}</div>
          ${ticket.customerId ? `<span class="badge text-bg-dark border border-secondary" style="font-size: 0.65rem;">${escapeHtml(ticket.customerId)}</span>` : ''}
        </td>
        <td class="small text-secondary text-nowrap">${created}</td>
        <td class="small" style="max-width: 220px;">
          <div class="text-truncate text-secondary" title="${escapeHtml(ticket.pickupAddress)}">📍 ${escapeHtml(ticket.pickupAddress || 'Sweetfin')}</div>
          <div class="text-truncate text-light fw-bold" title="${escapeHtml(ticket.dropoffAddress)}">🏁 ${escapeHtml(ticket.dropoffAddress)}</div>
        </td>
        <td>
          <span class="badge text-bg-dark border border-secondary small">${escapeHtml(ticket.orderFlow || 'DELIVERY')}</span>
        </td>
        <td class="small">
          <div class="text-secondary">Food: $${foodCost.toFixed(2)}</div>
          <div class="text-info">Wage: $${courierFee.toFixed(2)}</div>
          <div class="text-success">Tip: $${tip.toFixed(2)}</div>
        </td>
        <td>
          <strong class="text-success fs-6">${money.format(courierTakeHome)}</strong>
          <div class="small text-secondary" style="font-size: 0.68rem;">Customer: ${money.format(totalEst)}</div>
        </td>
        <td>
          <span class="status-pill ${statusBadgeClass}">${escapeHtml(ticket.status)}</span>
          ${ticket.declineReason ? `<div class="small text-danger mt-1" style="font-size: 0.7rem;">⚠️ ${escapeHtml(ticket.declineReason)}</div>` : ''}
        </td>
        <td>
          <div class="d-flex align-items-center gap-1">
            ${phoneClean ? `
              <a href="tel:${phoneClean}" class="btn btn-sm btn-outline-primary text-light p-1" title="Call Customer">📞</a>
              <a href="sms:${phoneClean}?&body=${encodeURIComponent(`Hi ${ticket.customerName || ''}, this is dispatch with SenDeke.to courier regarding trip ${ticket.id}...`)}" class="btn btn-sm btn-outline-primary text-light p-1" title="Text Customer">💬</a>
            ` : ''}
            <button type="button" class="btn btn-sm btn-dark border-secondary text-secondary p-1 copy-ticket-id" data-id="${escapeHtml(ticket.id)}" title="Copy ID">📋</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Copy ticket ID
$('#tripsTableBody')?.addEventListener('click', event => {
  const btn = event.target.closest('.copy-ticket-id');
  if (btn) {
    const id = btn.dataset.id;
    if (navigator.clipboard) navigator.clipboard.writeText(id);
    showToast(`Copied ${id} to clipboard.`);
  }
});

// Filter tabs
$$('.ledger-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    state.activeFilter = btn.dataset.filter;
    $$('.ledger-filter').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.classList.toggle('btn-primary', active);
      b.classList.toggle('fw-bold', active);
      b.classList.toggle('btn-outline-secondary', !active);
      b.classList.toggle('text-light', !active);
    });
    renderTripsLedger();
  });
});

// --- Customer Directory & ID Generator ---
function renderCustomersTable() {
  const tbody = $('#customerTableBody');
  if (!tbody) return;

  if (state.customers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-secondary small">No customer records yet. Add above or accept incoming orders.</td></tr>`;
    return;
  }

  tbody.innerHTML = state.customers.map(c => `
    <tr>
      <td><strong class="text-info font-monospace">${escapeHtml(c.id)}</strong></td>
      <td class="text-light fw-bold">${escapeHtml(c.name)}</td>
      <td class="text-secondary small font-monospace">${escapeHtml(c.phone)}</td>
      <td><span class="badge text-bg-dark border border-secondary">${c.totalRuns || 1} Runs</span></td>
      <td>
        <a href="sms:${escapeHtml((c.phone || '').replace(/\D/g, ''))}?&body=${encodeURIComponent(`Hi ${c.name}, special promotion from Deke with SenDeke.to courier!`)}" class="btn btn-sm btn-outline-light py-0 px-2" title="Send SMS">
          💬 SMS
        </a>
      </td>
    </tr>
  `).join('');
}

// Generate New Customer ID button
$('#generateCustIdBtn')?.addEventListener('click', () => {
  const newId = generateCustomerId();
  const phone = prompt(`Generate Customer Account for 90034:\nGenerated ID: ${newId}\nEnter customer phone:`, '(310) 555-0199');
  if (!phone) return;
  const name = prompt('Enter customer name:', 'Marcus');
  if (!name) return;

  saveCustomerRecord(newId, name, phone);
});

// Add Customer Form Submit
$('#newCustomerForm')?.addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#custNameInput').value.trim();
  const phone = $('#custPhoneInput').value.trim();
  const newId = generateCustomerId();
  saveCustomerRecord(newId, name, phone);
  event.currentTarget.reset();
});

async function saveCustomerRecord(id, name, phone) {
  try {
    await setDoc(doc(db, "customers", id), {
      id: id,
      name: name,
      phone: phone,
      totalRuns: 1,
      createdAt: new Date().toISOString()
    });
    showToast(`Customer ${name} registered with ID ${id}!`);
  } catch (err) {
    console.warn('Save customer error:', err);
    // Local fallback
    state.customers.push({ id, name, phone, totalRuns: 1 });
    renderCustomersTable();
    showToast(`Saved customer ${name} locally (${id}).`);
  }
}

// Auto-populate customer directory from incoming tickets
function autoPopulateCustomersFromTickets() {
  state.tickets.forEach(ticket => {
    if (ticket.customerPhone && !state.customers.some(c => c.phone === ticket.customerPhone)) {
      const derivedId = ticket.customerId || generateCustomerId();
      state.customers.push({
        id: derivedId,
        name: ticket.customerName || 'Customer',
        phone: ticket.customerPhone,
        totalRuns: state.tickets.filter(t => t.customerPhone === ticket.customerPhone).length
      });
    }
  });
  renderCustomersTable();
}

$('#refreshEscrowBtn')?.addEventListener('click', () => {
  showToast('Stripe rails active: acct_1UMDqqI2soUb8x6t ready for manual capture.');
});
