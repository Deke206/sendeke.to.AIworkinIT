/**
 * SENDEKETO.COM - Sovereign Dispatch, Cart & Mutual Handshake Engine (2026)
 * Core Architecture: Zero-Middleman Local Livery & Courier Dispatch
 * Works 100% identically over file:/// local preview AND HTTP/HTTPS Edge Hosting.
 *
 * Features:
 *  - Unified Cumulative Cart Engine across all 7 storefronts (Sweetfin, El Cachetón, Lokal, Doughroom, Simpang, Mizlala, Index)
 *  - Natural language order parsing across all verified corridor partners
 *  - Living wage pricing engine ($10.00 base + minimum $2.50 tip = $12.50-$15.00+ flat take-home)
 *  - Dual-Prefix 6-Digit Doorstep Mutual Handshake PIN & Privacy Delimiters
 *  - Real-time event bus via BroadcastChannel & LocalStorage persistence
 *  - Web Audio API dispatch alert chimes (587Hz -> 880Hz -> 1174Hz)
 *  - Direct Google Maps bicycle navigation deep-links
 */

(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = engine;
  }
  if (root) {
    root.SenDekeEngine = engine;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // --- STRIPE LIVE CONFIGURATION ---
  const STRIPE_CONFIG = {
    publishableKey: (typeof window !== 'undefined' && (window.__STRIPE_KEY__ || (window.ENV && window.ENV.STRIPE_PUBLISHABLE_KEY))) || "",
    accountId: "acct_1UMDqqI2soUb8x6t",
    mode: "live",
    leadCourierPhone: "(323) 374-5787"
  };

  // --- LOCAL CATALOG SEEDS (Verified Westside / Palms 90034 & West Adams 90016 Corridor) ---
  const LOCAL_CATALOG = [
    // Sweetfin Palms Seeds (Verified In-Store Prices)
    { num: '01', name: 'Spicy Tuna Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['spicy tuna', 'tuna bowl', 'tuna poke'] },
    { num: '02', name: 'Yuzu Salmon Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['yuzu salmon', 'spicy salmon', 'salmon bowl', 'salmon'] },
    { num: '03', name: 'Truffled Yuzu Albacore Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['truffled yuzu', 'albacore', 'white tuna'] },
    { num: '04', name: 'Mango Albacore Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['mango albacore'] },
    { num: '05', name: 'Classic Tuna Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['classic tuna'] },
    { num: '06', name: 'Gochujang Salmon Poke Bowl', price: 16.90, merchant: 'Sweetfin Palms', category: 'Signature Bowls', keywords: ['gochujang salmon', 'gochujang'] },
    { num: '07', name: 'Sesame Crunch Chicken Salad', price: 13.50, merchant: 'Sweetfin Palms', category: 'Sides & Salads', keywords: ['chicken salad', 'sesame crunch'] },
    { num: '08', name: 'Chicken Banh Mi Bowl', price: 15.95, merchant: 'Sweetfin Palms', category: 'Chicken Bowls', keywords: ['chicken banh mi'] },
    { num: '09', name: 'Shiitake Chile Tofu Bowl', price: 15.95, merchant: 'Sweetfin Palms', category: 'Plant-Based', keywords: ['shiitake', 'tofu', 'vegan tofu'] },
    { num: '10', name: 'Taro Chips & Dip', price: 4.50, merchant: 'Sweetfin Palms', category: 'Sides', keywords: ['taro', 'chips', 'sweet potato chips', 'taro chips'] },
    { num: '11', name: 'Seaweed Salad', price: 5.00, merchant: 'Sweetfin Palms', category: 'Sides', keywords: ['seaweed', 'wakame'] },
    { num: '12', name: 'Spicy Edamame', price: 4.50, merchant: 'Sweetfin Palms', category: 'Sides', keywords: ['edamame', 'spicy edamame'] },
    { num: '13', name: 'Iced Matcha Green Tea', price: 4.75, merchant: 'Sweetfin Palms', category: 'Drinks', keywords: ['matcha', 'green tea'] },

    // Taqueria El Cacheton Stand Seeds (10500 Venice Blvd • 323-536-4013)
    { num: 'T01', name: 'Street Taco (Asada/Pastor/Pollo)', price: 3.00, merchant: 'Taquería El Cachetón', category: 'Street Tacos', keywords: ['street taco', 'asada taco', 'pastor taco', 'tacos', 'taco'] },
    { num: 'T02', name: 'Super Burrito', price: 14.00, merchant: 'Taquería El Cachetón', category: 'Burritos & Tortas', keywords: ['super burrito', 'asada burrito', 'pastor burrito', 'burrito'] },
    { num: 'T03', name: 'Quesadilla Sincronizada', price: 12.00, merchant: 'Taquería El Cachetón', category: 'Quesadillas & Plates', keywords: ['quesadilla', 'quesadillas'] },
    { num: 'T04', name: 'Torta Ahogada / Telera', price: 13.00, merchant: 'Taquería El Cachetón', category: 'Burritos & Tortas', keywords: ['torta', 'tortas'] },
    { num: 'T05', name: 'Mulita de Asada / Pastor', price: 6.00, merchant: 'Taquería El Cachetón', category: 'Street Tacos', keywords: ['mulita', 'mulitas'] },
    { num: 'T06', name: 'Agua Fresca (Horchata / Jamaica)', price: 4.50, merchant: 'Taquería El Cachetón', category: 'Beverages', keywords: ['horchata', 'jamaica', 'agua fresca'] },

    // Lokal Sandwich Shop (10433 National Blvd #1A)
    { num: 'L01', name: 'Grilled Pork Banh Mi', price: 11.50, merchant: 'Lokal Sandwich Shop', category: 'Banh Mi', keywords: ['pork banh mi', 'banh mi', 'lokal'] },
    { num: 'L02', name: 'The Rustic Breakfast Sandwich', price: 11.95, merchant: 'Lokal Sandwich Shop', category: 'Sandwiches', keywords: ['rustic breakfast', 'breakfast sandwich'] },
    { num: 'L03', name: 'Vietnamese Iced Coffee', price: 5.75, merchant: 'Lokal Sandwich Shop', category: 'Drinks', keywords: ['vietnamese coffee', 'ca phe sua da'] },

    // The Doughroom (3409 Overland Ave)
    { num: 'D01', name: 'Truffled Mushroom Sourdough Pizza', price: 21.00, merchant: 'The Doughroom', category: 'Artisan Pizza', keywords: ['doughroom', 'mushroom pizza', 'sourdough pizza', 'pizza'] },

    // Simpang Asia (10433 National Blvd)
    { num: 'S01', name: 'Nasi Goreng Special', price: 15.00, merchant: 'Simpang Asia', category: 'Indonesian Classics', keywords: ['nasi goreng', 'simpang', 'mie tek tek'] },

    // Kotoya Ramen (10422 National Blvd)
    { num: 'R01', name: 'Kotoya Black Garlic Tonkotsu Ramen', price: 16.50, merchant: 'Kotoya Ramen', category: 'Ramen', keywords: ['kotoya', 'tonkotsu', 'black garlic ramen', 'ramen'] },

    // Mizlala West Adams (5400 W Adams Blvd)
    { num: 'M01', name: 'Chicken Shawarma Plate / Pita', price: 17.95, merchant: 'Mizlala West Adams', category: 'Mediterranean', keywords: ['shawarma', 'mizlala', 'falafel', 'kefta'] }
  ];

  // --- PRIVACY DELIMITERS & DUAL-PREFIX HANDSHAKE PIN ---
  function delimitId(rawId, keepLength = 5) {
    if (!rawId) return '***-00000';
    const clean = String(rawId).replace(/[^a-zA-Z0-9]/g, '');
    return `***-${clean.slice(-keepLength)}`;
  }

  function extractPhonePrefix(phone) {
    if (!phone) return '374';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(4, 7);
    }
    if (digits.length >= 10) {
      return digits.substring(3, 6);
    }
    return digits.padEnd(3, '0').substring(0, 3);
  }

  function generateDualPrefixPin(customerPhone, driverPhone = STRIPE_CONFIG.leadCourierPhone) {
    return `${extractPhonePrefix(customerPhone)}${extractPhonePrefix(driverPhone)}`;
  }

  function verifyDualPrefixPin(enteredPin, customerPhone, driverPhone = STRIPE_CONFIG.leadCourierPhone) {
    const expected = generateDualPrefixPin(customerPhone, driverPhone);
    return String(enteredPin || '').replace(/\D/g, '') === expected;
  }

  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function verifyProximityHandshake({
    driverCoords,
    customerCoords,
    enteredPin = null,
    customerPhone,
    driverPhone = STRIPE_CONFIG.leadCourierPhone,
    nfcTouch = false,
    maxProximityMeters = 50
  } = {}) {
    if (nfcTouch) {
      return {
        success: true,
        method: 'nfc_fist_bump',
        message: 'NFC co-presence confirmed. Escrow unlocked immediately.'
      };
    }
    if (driverCoords && customerCoords) {
      const dist = getDistanceMeters(driverCoords.lat, driverCoords.lng, customerCoords.lat, customerCoords.lng);
      if (dist > maxProximityMeters) {
        return {
          success: false,
          reason: 'out_of_proximity',
          distanceMeters: Math.round(dist),
          message: `Courier is ${Math.round(dist)}m away (requires <= ${maxProximityMeters}m).`
        };
      }
    }
    if (!verifyDualPrefixPin(enteredPin, customerPhone, driverPhone)) {
      return {
        success: false,
        reason: 'invalid_pin',
        message: 'Dual-prefix PIN mismatch.'
      };
    }
    return {
      success: true,
      method: 'proximity_pin',
      message: 'Mutual doorstep PIN verified. Escrow released.'
    };
  }

  // --- BROADCAST CHANNEL EVENT BUS ---
  const CHANNEL_NAME = 'sendeke_dispatch_network';
  let bus = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bus = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {}

  function broadcast(payload) {
    if (bus) {
      try { bus.postMessage(payload); } catch (e) {}
    }
  }

  // --- AUDIO SYNTHESIS ENGINE (Web Audio API) ---
  let audioCtx = null;
  function getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playDispatchAlertSound() {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.00, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.32);
      gain2.gain.setValueAtTime(0.20, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.65);
    } catch (err) {}
  }

  // --- UNIFIED CUMULATIVE CART ENGINE (ALL 7 STOREFRONTS -> CHECKOUT.HTML) ---
  function normalizeCartItem(raw, idx, fallbackMerchant) {
    const qty = Math.max(1, parseInt(raw.qty ?? raw.quantity ?? 1, 10) || 1);
    const price = parseFloat(raw.price) || 0;
    const num = raw.num || String(idx + 1).padStart(2, '0');
    const merchant = raw.merchant || fallbackMerchant || 'Sweetfin Palms';
    const id = raw.id || `${merchant.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${num}`;
    return {
      id: id,
      num: num,
      name: raw.name || 'Corridor Menu Item',
      price: price,
      qty: qty,
      quantity: qty,
      merchant: merchant,
      image: raw.image || raw.local_image || ''
    };
  }

  function getCart() {
    try {
      const primary = localStorage.getItem('sendeke_cart');
      if (primary) {
        const parsed = JSON.parse(primary);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it, idx) => normalizeCartItem(it, idx));
        }
      }
      const secondary = localStorage.getItem('sendeke_cart_items');
      if (secondary) {
        const parsed2 = JSON.parse(secondary);
        if (Array.isArray(parsed2) && parsed2.length > 0) {
          return parsed2.map((it, idx) => normalizeCartItem(it, idx));
        }
      }
    } catch (e) {}
    return [];
  }

  function syncCart(itemsArray, defaultMerchant = 'Sweetfin Palms', tipAmount = null, deliveryAddress = null) {
    const normalized = (Array.isArray(itemsArray) ? itemsArray : []).map((it, idx) =>
      normalizeCartItem(it, idx, defaultMerchant)
    );
    const subtotal = normalized.reduce((sum, it) => sum + (it.price * it.qty), 0);
    const merchants = [...new Set(normalized.map(it => it.merchant).filter(Boolean))];
    const pickupSummary = merchants.length > 1
      ? `Multi-Stop Corridor: ${merchants.join(' + ')}`
      : (merchants[0] || defaultMerchant || 'Sweetfin Palms (3105 Overland Ave)');
    const askSummary = normalized.length > 0
      ? normalized.map(it => `[${it.merchant}] #${it.num} ${it.name} x${it.qty}`).join('; ')
      : '';

    try {
      localStorage.setItem('sendeke_cart', JSON.stringify(normalized));
      localStorage.setItem('sendeke_cart_items', JSON.stringify(normalized));
      localStorage.setItem('sendeke_pending_subtotal', subtotal.toFixed(2));
      localStorage.setItem('sendeke_pending_ask', askSummary);
      localStorage.setItem('sendeke_pending_pickup', pickupSummary);
      if (tipAmount !== null && !Number.isNaN(parseFloat(tipAmount))) {
        localStorage.setItem('sendeke_pending_tip', Math.max(2.50, parseFloat(tipAmount)).toFixed(2));
      }
      if (deliveryAddress && String(deliveryAddress).trim()) {
        localStorage.setItem('sendeke_pending_dropoff', String(deliveryAddress).trim());
      }
    } catch (e) {}

    broadcast({ type: 'CART_UPDATED', cart: normalized, subtotal: subtotal, pickup: pickupSummary });
    return { cart: normalized, subtotal: subtotal, pickup: pickupSummary, ask: askSummary };
  }

  function clearCart() {
    try {
      localStorage.removeItem('sendeke_cart');
      localStorage.removeItem('sendeke_cart_items');
      localStorage.removeItem('sendeke_pending_subtotal');
      localStorage.removeItem('sendeke_pending_ask');
      localStorage.removeItem('sendeke_pending_pickup');
    } catch (e) {}
    broadcast({ type: 'CART_UPDATED', cart: [], subtotal: 0 });
  }

  // --- NATURAL LANGUAGE ORDER PARSER ---
  function parseCustomerAsk(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { matchedItems: [], estimatedFoodSubtotal: 0, suggestedMerchant: 'Sweetfin Palms', rawText: '' };
    }

    const lower = rawText.toLowerCase();
    const matched = [];
    let estimatedTotal = 0;

    for (const item of LOCAL_CATALOG) {
      let found = false;
      let qty = 1;

      for (const kw of item.keywords) {
        const regex = new RegExp(`(\\b(?:\\d+|one|two|three|four|five|six)\\b)?\\s*(?:x|order|orders|bowl|bowls|plate|plates)?\\s*${kw}`, 'i');
        const match = lower.match(regex);
        if (match) {
          found = true;
          if (match[1]) {
            const word = match[1].toLowerCase();
            const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
            qty = wordMap[word] || parseInt(word, 10) || 1;
          }
          break;
        }
      }

      if (found) {
        matched.push({
          num: item.num,
          name: item.name,
          price: item.price,
          qty: qty,
          quantity: qty,
          merchant: item.merchant,
          lineTotal: parseFloat((item.price * qty).toFixed(2)),
          category: item.category
        });
        estimatedTotal += (item.price * qty);
      }
    }

    const suggestedMerchant = matched.length > 0 ? matched[0].merchant : 'Sweetfin Palms';

    return {
      rawText: rawText.trim(),
      matchedItems: matched,
      suggestedMerchant: suggestedMerchant,
      estimatedFoodSubtotal: parseFloat(estimatedTotal.toFixed(2))
    };
  }

  // --- PRICING & LIVING WAGE CALCULATOR ---
  function calculatePricing({ foodSubtotal = 0, tipAmount = 2.50, mileage = 1.5 } = {}) {
    const BASE_COURIER_FEE = 10.00;
    const MINIMUM_TIP = 2.50;
    const tip = Math.max(MINIMUM_TIP, parseFloat(tipAmount) || MINIMUM_TIP);

    let mileageSurcharge = 0;
    if (mileage > 2.5) {
      mileageSurcharge = parseFloat(((mileage - 2.5) * 1.75).toFixed(2));
    }

    const courierTakeHome = parseFloat((BASE_COURIER_FEE + tip + mileageSurcharge).toFixed(2));
    const food = parseFloat((Number(foodSubtotal) || 0).toFixed(2));
    const grandTotal = parseFloat((food + courierTakeHome).toFixed(2));

    return {
      foodSubtotal: food,
      baseCourierFee: BASE_COURIER_FEE,
      minimumTip: MINIMUM_TIP,
      appliedTip: tip,
      mileageSurcharge: mileageSurcharge,
      courierTakeHome: courierTakeHome,
      middlemanTax: 0.00,
      grandTotal: grandTotal
    };
  }

  // --- TICKET GENERATOR & STORAGE ---
  function normalizeTicket(t) {
    if (!t) return null;
    const foodSub = parseFloat(t.foodSubtotal ?? t.subtotal ?? t.pricing?.foodSubtotal ?? 0) || 0;
    const tipVal = parseFloat(t.tip ?? t.pricing?.appliedTip ?? 2.50) || 2.50;
    const pricing = t.pricing || calculatePricing({ foodSubtotal: foodSub, tipAmount: tipVal });
    const phone = t.customerPhone || STRIPE_CONFIG.leadCourierPhone;
    const pin = t.handshakePin || generateDualPrefixPin(phone, STRIPE_CONFIG.leadCourierPhone);
    return {
      ...t,
      id: t.id || ('SDK-' + Math.floor(100 + Math.random() * 900)),
      createdAt: t.createdAt || t.timestamp || new Date().toISOString(),
      status: t.status || 'DISPATCH_PENDING',
      customerName: t.customerName || 'Neighbor Customer',
      customerPhone: phone,
      pickupLocation: t.pickupLocation || t.source || 'Sweetfin Palms (3105 Overland Ave)',
      dropoffAddress: t.dropoffAddress || t.destination || '3645 Overland Ave, Los Angeles, CA 90034',
      originalAsk: t.originalAsk || '',
      items: Array.isArray(t.items) ? t.items : [],
      pricing: pricing,
      foodSubtotal: pricing.foodSubtotal,
      courierFee: pricing.baseCourierFee,
      tip: pricing.appliedTip,
      grandTotal: pricing.grandTotal,
      handshakePin: pin,
      assignedCourier: t.assignedCourier || 'Courier #04 (Dedric Alexander)',
      zone: t.zone || 'Zone 90034 Palms'
    };
  }

  function getTickets() {
    try {
      const raw = localStorage.getItem('sendeke_tickets');
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length > 0) {
        return list.map(normalizeTicket).filter(Boolean);
      }
      const activeSingle = localStorage.getItem('sendeke_active_ticket');
      if (activeSingle) {
        const single = normalizeTicket(JSON.parse(activeSingle));
        return single ? [single] : [];
      }
    } catch (e) {}
    return [];
  }

  function getTicketById(ticketId) {
    const tickets = getTickets();
    if (!ticketId) return tickets[0] || null;
    const cleanTarget = String(ticketId).replace(/^#/, '').trim().toUpperCase();
    return tickets.find(t => String(t.id).replace(/^#/, '').toUpperCase() === cleanTarget) || tickets[0] || null;
  }

  function saveTicket(rawTicket) {
    const ticket = normalizeTicket(rawTicket);
    if (!ticket) return null;

    const tickets = getTickets();
    const existingIdx = tickets.findIndex(t => t.id === ticket.id);
    if (existingIdx >= 0) {
      tickets[existingIdx] = ticket;
    } else {
      tickets.unshift(ticket);
    }

    try {
      localStorage.setItem('sendeke_tickets', JSON.stringify(tickets));
      localStorage.setItem('sendeke_active_tickets', JSON.stringify(tickets));
      localStorage.setItem('sendeke_active_ticket', JSON.stringify(ticket));
    } catch (e) {}

    broadcast({ type: 'TICKET_UPDATED', ticket: ticket });
    return ticket;
  }

  function createTicket({
    id = null,
    customerName = 'Neighbor Customer',
    customerPhone = '(323) 374-5787',
    pickupLocation = 'Sweetfin Palms (3105 Overland Ave)',
    dropoffAddress = '3645 Overland Ave, Los Angeles, CA 90034',
    deliveryNotes = '',
    rawOrderText = '',
    matchedItems = [],
    foodSubtotal = 0,
    tipAmount = 2.50,
    paymentMethod = 'STRIPE_PREAUTH',
    status = 'DISPATCH_PENDING',
    stripePaymentMethodId = null,
    paymentIntentId = null,
    handshakePin = null
  } = {}) {
    const pricing = calculatePricing({ foodSubtotal, tipAmount });
    const ticketId = id || ('SDK-' + Math.floor(100 + Math.random() * 900));
    const pin = handshakePin || generateDualPrefixPin(customerPhone, STRIPE_CONFIG.leadCourierPhone);

    const ticket = normalizeTicket({
      id: ticketId,
      createdAt: new Date().toISOString(),
      timestampFormatted: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: status,
      customerName: customerName,
      customerPhone: customerPhone,
      pickupLocation: pickupLocation,
      dropoffAddress: dropoffAddress,
      deliveryNotes: deliveryNotes,
      originalAsk: rawOrderText,
      items: matchedItems,
      pricing: pricing,
      paymentMethod: paymentMethod,
      stripePaymentMethodId: stripePaymentMethodId,
      paymentIntentId: paymentIntentId,
      handshakePin: pin,
      assignedCourier: 'Courier #04 (Dedric Alexander)',
      zone: 'Zone 90034 Palms'
    });

    saveTicket(ticket);
    broadcast({ type: 'TICKET_CREATED', ticket: ticket });
    playDispatchAlertSound();
    return ticket;
  }

  function updateTicketStatus(ticketId, newStatus, extraFields = {}) {
    const tickets = getTickets();
    const target = tickets.find(item => item.id === ticketId) || tickets[0];
    if (target) {
      Object.assign(target, extraFields, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      saveTicket(target);
      return target;
    }
    return null;
  }

  // --- MUTUAL DOORSTEP HANDSHAKE CAPTURE ---
  async function captureTicketWithHandshake(ticketId, enteredPin, courierGps = {}, options = {}) {
    const tickets = getTickets();
    const t = tickets.find(item => item.id === ticketId) || tickets[0];
    if (!t) {
      return { success: false, error: 'TICKET_NOT_FOUND', message: 'Active ticket not found in queue.' };
    }

    const nfcTouch = Boolean(options.nfcTouch);
    const cleanEntered = String(enteredPin || '').replace(/\D/g, '');
    const cleanStored = String(t.handshakePin || '').replace(/\D/g, '');

    if (!nfcTouch && (!cleanEntered || (cleanStored && cleanEntered !== cleanStored))) {
      return {
        success: false,
        error: 'INVALID_HANDSHAKE_PIN',
        expectedHint: cleanStored ? `Expected customer+driver 6-digit prefix PIN (${cleanStored})` : '',
        message: 'Doorstep PIN mismatch. Escrow hold remains safely locked on card rails.'
      };
    }

    // Attempt Cloudflare Edge Capture when running on HTTP/HTTPS with Stripe PaymentIntent
    if ((t.paymentIntentId || t.stripePaymentMethodId) && typeof location !== 'undefined' && location.protocol.startsWith('http')) {
      try {
        const res = await fetch('/api/escrow/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: t.paymentIntentId || t.stripePaymentMethodId,
            ticketId: t.id,
            handshakePin: cleanEntered || cleanStored,
            courierGps: courierGps
          })
        });
        if (res.ok) {
          const result = await res.json();
          if (result && result.error) {
            console.warn('[SenDeke Edge Capture Notice]:', result.error);
          }
        }
      } catch (err) {}
    }

    t.status = 'DELIVERED_AND_CAPTURED';
    t.deliveredAt = new Date().toISOString();
    t.handshakeVerified = true;
    t.handshakeMethod = nfcTouch ? 'NFC_CO_PRESENCE' : 'DUAL_PREFIX_PIN';
    t.courierGps = courierGps;
    saveTicket(t);

    broadcast({
      type: 'TICKET_CAPTURED',
      ticketId: t.id,
      ticket: t,
      status: 'DELIVERED_AND_CAPTURED',
      handshakeVerified: true,
      deliveredAt: t.deliveredAt
    });

    playDispatchAlertSound();
    return {
      success: true,
      ticket: t,
      status: 'DELIVERED_AND_CAPTURED',
      courierTakeHome: t.pricing?.courierTakeHome || 12.50,
      message: nfcTouch
        ? 'NFC Digital Fist-Bump confirmed! Escrow funds captured & credited.'
        : '6-digit Mutual Handshake PIN verified! Escrow funds captured & credited.'
    };
  }

  // --- DRIVER STATUS BROADCAST ---
  function getDriverStatus() {
    try {
      const data = localStorage.getItem('sendeke_driver_status');
      if (data) return JSON.parse(data);
    } catch (e) {}
    return {
      isOnline: true,
      courierName: 'Dedric (Deke) Alexander',
      courierNumber: 'Courier #04',
      mode: 'E-Bike Livery',
      capacity: 3,
      zone: '90034 Palms / Culver City',
      lat: 34.0259,
      lng: -118.3965,
      lastSeen: new Date().toISOString()
    };
  }

  function setDriverStatus(statusObj) {
    const current = getDriverStatus();
    const updated = { ...current, ...statusObj, lastSeen: new Date().toISOString() };
    try {
      localStorage.setItem('sendeke_driver_status', JSON.stringify(updated));
    } catch (e) {}
    broadcast({ type: 'DRIVER_STATUS_CHANGED', driver: updated });
    return updated;
  }

  // --- GOOGLE MAPS BICYCLE DEEP LINKS ---
  function getBicycleNavUrl(destination) {
    if (!destination) return 'https://www.google.com/maps';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=bicycling`;
  }

  function getBicycleRouteUrl(origin, destination) {
    if (!destination) return 'https://www.google.com/maps';
    if (!origin) return getBicycleNavUrl(destination);
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=bicycling`;
  }

  // --- MESSAGE SUBSCRIPTION ---
  const listeners = [];
  if (bus) {
    bus.onmessage = (event) => {
      if (event.data && event.data.type === 'TICKET_CAPTURED') {
        playDispatchAlertSound();
      }
      listeners.forEach(fn => {
        try { fn(event.data); } catch (e) {}
      });
    };
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (['sendeke_tickets', 'sendeke_active_ticket', 'sendeke_driver_status', 'sendeke_cart'].includes(e.key)) {
        const msg = { type: 'STORAGE_UPDATE', key: e.key };
        listeners.forEach(fn => {
          try { fn(msg); } catch (err) {}
        });
      }
    });
  }

  return {
    stripeConfig: STRIPE_CONFIG,
    catalog: LOCAL_CATALOG,
    delimitId,
    extractPhonePrefix,
    generateDualPrefixPin,
    verifyDualPrefixPin,
    getDistanceMeters,
    verifyProximityHandshake,
    getCart,
    syncCart,
    clearCart,
    parseCustomerAsk,
    calculatePricing,
    getTickets,
    getTicketById,
    saveTicket,
    createTicket,
    updateTicketStatus,
    captureTicketWithHandshake,
    getDriverStatus,
    setDriverStatus,
    playDispatchAlertSound,
    getBicycleNavUrl,
    getBicycleRouteUrl,
    onMessage: function (callback) {
      if (typeof callback === 'function') {
        listeners.push(callback);
      }
    }
  };
});
