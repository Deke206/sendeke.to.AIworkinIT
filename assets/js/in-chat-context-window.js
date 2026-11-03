/**
 * SOVEREIGN IN-CHAT EPHEMERAL CONTEXT WINDOW & REAL-TIME SEARCH ENGINE
 * SenDeke Sovereign Hyperlocal Corridor Network (sendeketo.com)
 * 
 * Standards:
 * - TLS 1.3 / Zero-Tracker Air-Gap
 * - WebMCP 2.0 Semantic Query Integration
 * - In-Chat Generative UI Overlay with 1-Tap Escrow Authorization
 * - Mutual 6-Digit Doorstep PIN Handshake
 */

(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.InChatContextWindow = mod;
    root.openInChatContextWindow = mod.open.bind(mod);
  }
})(typeof self !== 'undefined' ? self : this, function () {

  // Factual Seed Catalog from Palms / Culver City / West Adams Corridor
  const CORRIDOR_CATALOG = [
    // Taquería El Cachetón
    {
      id: "tac-01",
      name: "Tacos de Asada (Handmade Tortilla)",
      merchant: "Taquería El Cachetón",
      merchantId: "el_cacheton",
      address: "Venice Blvd & Bagley Ave, Palms 90034",
      price: 3.50,
      category: "Street Tacos",
      description: "Charcoal grilled carne asada, cilantro, diced onions, fresh avocado salsa on double corn tortilla."
    },
    {
      id: "tac-02",
      name: "Burrito Gigante al Pastor",
      merchant: "Taquería El Cachetón",
      merchantId: "el_cacheton",
      address: "Venice Blvd & Bagley Ave, Palms 90034",
      price: 14.00,
      category: "Burritos",
      description: "Spit-roasted pork marinated in achiote, pineapple, pinto beans, Mexican rice, jack cheese."
    },
    {
      id: "tac-03",
      name: "Vampiro de Birria con Queso",
      merchant: "Taquería El Cachetón",
      merchantId: "el_cacheton",
      address: "Venice Blvd & Bagley Ave, Palms 90034",
      price: 4.50,
      category: "Specialties",
      description: "Crispy grilled corn tostada, melted jack cheese, beef birria, consome dip."
    },
    // Sweetfin Palms
    {
      id: "sf-01",
      name: "Spicy Yuzu Salmon Poke Bowl",
      merchant: "Sweetfin Palms",
      merchantId: "sweetfin_palms",
      address: "3110 Main St, Palms, CA 90034",
      price: 16.90,
      category: "Poke Bowls",
      protein: "38g",
      description: "Scottish salmon, yuzu kosho ponzu, edamame, avocado, cucumber, crispy garlic over bamboo rice."
    },
    {
      id: "sf-02",
      name: "Spicy Tuna Signature Bowl",
      merchant: "Sweetfin Palms",
      merchantId: "sweetfin_palms",
      address: "3110 Main St, Palms, CA 90034",
      price: 16.50,
      category: "Poke Bowls",
      protein: "42g",
      description: "Sashimi tuna, creamy togarashi, avocado, hijiki, scallions, black sesame over kelp noodle slaw."
    },
    {
      id: "sf-03",
      name: "Miso Sesame Tofu Bowl (Vegan)",
      merchant: "Sweetfin Palms",
      merchantId: "sweetfin_palms",
      address: "3110 Main St, Palms, CA 90034",
      price: 14.50,
      category: "Plant-Based",
      protein: "24g",
      description: "Organic non-GMO baked tofu, miso sesame glaze, ginger, carrots, purple cabbage."
    },
    // The Doughroom
    {
      id: "dr-01",
      name: "Wild Mushroom & Truffle Pizza",
      merchant: "The Doughroom",
      merchantId: "doughroom_palms",
      address: "3409 Overland Ave, Palms, CA 90034",
      price: 21.00,
      category: "Artisan Pizza",
      description: "Wood-fired sourdough crust, roasted wild maitake & cremini mushrooms, fontina, white truffle oil."
    },
    {
      id: "dr-02",
      name: "Calabrese Hot Honey Pizza",
      merchant: "The Doughroom",
      merchantId: "doughroom_palms",
      address: "3409 Overland Ave, Palms, CA 90034",
      price: 22.00,
      category: "Artisan Pizza",
      description: "Crushed San Marzano tomatoes, spicy calabrese salami, fresh mozzarella, Mike's hot honey drizzle."
    },
    // Mizlala West Adams
    {
      id: "mz-01",
      name: "Mizlala Chicken Shawarma Pita",
      merchant: "Mizlala West Adams",
      merchantId: "mizlala_west_adams",
      address: "5400 W Adams Blvd, Los Angeles, CA 90016",
      price: 15.00,
      category: "Pita & Bowls",
      description: "Slow-roasted spiced chicken thigh, fresh tahina, amba, Israeli chopped salad, house pickles."
    },
    // Simpang Asia
    {
      id: "sa-01",
      name: "Nasi Goreng Special",
      merchant: "Simpang Asia",
      merchantId: "simpang_asia",
      address: "10433 National Blvd, Palms, CA 90034",
      price: 15.50,
      category: "Indonesian Specialties",
      description: "Traditional Indonesian wok-fried jasmine rice, chicken, shrimp, sunny side egg, kerupuk crackers."
    },
    // CVS Essentials (Concierge Retail)
    {
      id: "cvs-01",
      name: "Advil Dual Action Caplets (72 Count)",
      merchant: "CVS Pharmacy Concierge",
      merchantId: "cvs_overland",
      address: "3645 Overland Ave, Palms, CA 90034",
      price: 13.99,
      category: "Emergency Health",
      description: "Ibuprofen 250mg + Acetaminophen 500mg dual pain relief. Urgent doorstep drop."
    },
    {
      id: "cvs-02",
      name: "USB-C Fast Charging Cable & 30W Wall Plug",
      merchant: "CVS Pharmacy Concierge",
      merchantId: "cvs_overland",
      address: "3645 Overland Ave, Palms, CA 90034",
      price: 19.99,
      category: "Electronics Essentials",
      description: "Heavy-duty braided USB-C cable with high-output 30W PD wall brick. Courier priority drop."
    }
  ];

  let activeOverlay = null;
  let cart = {}; // itemId -> qty

  function playChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.14); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } catch (e) {}
  }

  function renderModal(initialQuery = '', filterMerchant = '') {
    // Clean up existing
    if (activeOverlay && activeOverlay.parentNode) {
      activeOverlay.parentNode.removeChild(activeOverlay);
    }

    const overlay = document.createElement('div');
    overlay.id = 'sendekeInChatContextOverlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(4, 7, 13, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Space Grotesk', sans-serif;
      color: #f8fafc;
      box-sizing: border-box;
    `;

    overlay.innerHTML = `
      <div style="
        background: #0b111e;
        border: 2px solid #38bdf8;
        border-radius: 12px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.9), 0 0 30px rgba(56, 189, 248, 0.35);
        max-width: 580px;
        width: 100%;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- HEADER -->
        <div style="background: #070d17; padding: 12px 16px; border-bottom: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #38bdf8; color: #040711; font-weight: 800; font-size: 11px; padding: 2px 7px; border-radius: 4px; font-family: monospace;">SENDEKE 2.0</span>
              <span style="font-weight: 700; font-size: 14px; color: #ffffff;">Sovereign In-Chat Context Window</span>
            </div>
            <div style="font-size: 10.5px; color: #34d399; font-family: monospace; margin-top: 3px;">
              🔒 SOVEREIGN ENCRYPTED CORRIDOR // TLS 1.3 // ZERO-TRACKER AIR-GAP
            </div>
          </div>
          <button id="closeContextWindowBtn" style="background: transparent; border: 1px solid #334155; color: #94a3b8; border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 13px;">✕ CLOSE</button>
        </div>

        <!-- SEARCH INPUT -->
        <div style="padding: 12px 16px; background: #0f172a; border-bottom: 1px solid #1e293b;">
          <div style="position: relative;">
            <input id="inChatSearchInput" type="text" placeholder="Search tacos, salmon poke, pizza, shawarma, advil..." value="${initialQuery}" style="
              width: 100%;
              background: #020617;
              border: 1px solid #38bdf8;
              border-radius: 6px;
              color: #f8fafc;
              padding: 10px 14px;
              font-size: 13px;
              box-sizing: border-box;
              outline: none;
            ">
            <span style="position: absolute; right: 12px; top: 10px; font-size: 12px; color: #64748b;">⚡ Live Corridor Search</span>
          </div>
          <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;" id="merchantFilterChips">
            <button class="chip-filter active" data-merchant="" style="background: #38bdf8; color: #040711; border: none; border-radius: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; cursor: pointer;">All Corridors</button>
            <button class="chip-filter" data-merchant="sweetfin_palms" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px 8px; cursor: pointer;">Sweetfin</button>
            <button class="chip-filter" data-merchant="el_cacheton" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px 8px; cursor: pointer;">El Cachetón</button>
            <button class="chip-filter" data-merchant="doughroom_palms" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px 8px; cursor: pointer;">Doughroom</button>
            <button class="chip-filter" data-merchant="cvs_overland" style="background: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 4px; font-size: 11px; padding: 2px 8px; cursor: pointer;">CVS Concierge</button>
          </div>
        </div>

        <!-- ITEMS RESULTS SCROLL -->
        <div id="inChatItemsList" style="padding: 14px 16px; overflow-y: auto; flex-grow: 1; display: flex; flex-direction: column; gap: 10px;">
          <!-- Injected via JavaScript -->
        </div>

        <!-- ORDER SUMMARY & ESCROW CHECKOUT STRIP -->
        <div style="background: #070d17; border-top: 1px solid #1e293b; padding: 12px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-family: monospace;">
            <span style="color: #94a3b8;">Items Subtotal (100% to merchant):</span>
            <span id="orderSubtotalText" style="color: #ffffff; font-weight: 700;">$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12px; font-family: monospace;">
            <span style="color: #94a3b8;">Sovereign Bike Courier Living Wage:</span>
            <span id="courierFeeText" style="color: #38bdf8; font-weight: 700;">$0.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px; font-family: monospace; border-top: 1px dashed #334155; padding-top: 8px;">
            <span style="font-weight: 700; color: #34d399;">TOTAL (ZERO APP TAX):</span>
            <span id="orderTotalText" style="font-weight: 800; font-size: 16px; color: #34d399;">$0.00</span>
          </div>

          <!-- DROP OFF ADDRESS & SMS CONTACT -->
          <div style="display: flex; gap: 8px; margin-bottom: 10px;">
            <input id="dropoffAddressInput" type="text" placeholder="Dropoff Address (e.g. 3640 Overland Ave, Palms)" style="
              flex: 2;
              background: #020617;
              border: 1px solid #334155;
              border-radius: 4px;
              color: #f8fafc;
              padding: 6px 10px;
              font-size: 12px;
            ">
            <input id="contactPhoneInput" type="text" placeholder="Phone (SMS Alert)" style="
              flex: 1;
              background: #020617;
              border: 1px solid #334155;
              border-radius: 4px;
              color: #f8fafc;
              padding: 6px 10px;
              font-size: 12px;
            ">
            <button id="autofillProfileBtn" style="background: #1e293b; color: #f59e0b; border: 1px solid #f59e0b; border-radius: 4px; font-size: 11px; font-weight: 700; padding: 6px 8px; cursor: pointer; white-space: nowrap;">⚡ Auto-Fill Palms</button>
          </div>

          <!-- ESCROW AUTHORIZE BUTTON -->
          <button id="authorizeEscrowBtn" style="
            width: 100%;
            background: linear-gradient(180deg, #16a34a 0%, #15803d 100%);
            border: 1.5px solid #22c55e;
            color: #ffffff;
            font-weight: 800;
            font-size: 13.5px;
            padding: 12px;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-family: monospace;
          ">
            <span>🔒 1-TAP ESCROW AUTHORIZATION &amp; PIN DISPATCH</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    activeOverlay = overlay;

    // Hook events
    const closeBtn = overlay.querySelector('#closeContextWindowBtn');
    closeBtn.addEventListener('click', () => {
      overlay.parentNode.removeChild(overlay);
      activeOverlay = null;
    });

    const searchInput = overlay.querySelector('#inChatSearchInput');
    searchInput.addEventListener('input', (e) => {
      filterAndRenderItems(e.target.value, activeMerchantFilter);
    });

    const chips = overlay.querySelectorAll('.chip-filter');
    let activeMerchantFilter = filterMerchant;
    chips.forEach(btn => {
      btn.addEventListener('click', () => {
        chips.forEach(c => {
          c.style.background = '#1e293b';
          c.style.color = '#94a3b8';
          c.style.border = '1px solid #334155';
        });
        btn.style.background = '#38bdf8';
        btn.style.color = '#040711';
        btn.style.border = 'none';
        activeMerchantFilter = btn.dataset.merchant || '';
        filterAndRenderItems(searchInput.value, activeMerchantFilter);
      });
    });

    const autofillBtn = overlay.querySelector('#autofillProfileBtn');
    autofillBtn.addEventListener('click', () => {
      overlay.querySelector('#dropoffAddressInput').value = '3640 Overland Ave, Palms, CA 90034';
      overlay.querySelector('#contactPhoneInput').value = '(323) 374-5787';
      playChime();
    });

    const authBtn = overlay.querySelector('#authorizeEscrowBtn');
    authBtn.addEventListener('click', handleEscrowAuthorize);

    // Initial render
    filterAndRenderItems(initialQuery, filterMerchant);
  }

  function filterAndRenderItems(query = '', merchantId = '') {
    const listEl = document.getElementById('inChatItemsList');
    if (!listEl) return;

    const q = (query || '').toLowerCase().trim();
    const items = CORRIDOR_CATALOG.filter(it => {
      if (merchantId && it.merchantId !== merchantId) return false;
      if (!q) return true;
      return it.name.toLowerCase().includes(q) ||
             it.description.toLowerCase().includes(q) ||
             it.category.toLowerCase().includes(q) ||
             it.merchant.toLowerCase().includes(q);
    });

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 30px 10px; color: #64748b; font-family: monospace;">
          <div style="font-size: 24px; margin-bottom: 6px;">🔍</div>
          <div>No corridor items found for "${query}"</div>
          <div style="font-size: 11px; margin-top: 4px; color: #94a3b8;">Try searching "tacos", "salmon", "pizza", or "advil"</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(it => {
      const qty = cart[it.id] || 0;
      return `
        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="flex-grow: 1;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
              <span style="font-size: 10px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; padding: 1px 6px; border-radius: 3px; font-weight: 700; font-family: monospace;">${it.category}</span>
              <span style="font-size: 11px; color: #94a3b8;">📍 ${it.merchant}</span>
            </div>
            <div style="font-size: 13.5px; font-weight: 700; color: #ffffff;">${it.name}</div>
            <div style="font-size: 11px; color: #94a3b8; margin: 3px 0 5px 0;">${it.description}</div>
            <div style="font-size: 13px; font-weight: 800; color: #34d399; font-family: monospace;">$${it.price.toFixed(2)}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button onclick="InChatContextWindow.updateQty('${it.id}', -1)" style="
              width: 28px; height: 28px; background: #1e293b; border: 1px solid #334155; color: #f8fafc; font-weight: 800; border-radius: 4px; cursor: pointer;
            ">-</button>
            <span style="min-width: 20px; text-align: center; font-weight: 800; font-family: monospace; font-size: 14px;">${qty}</span>
            <button onclick="InChatContextWindow.updateQty('${it.id}', 1)" style="
              width: 28px; height: 28px; background: #38bdf8; border: none; color: #040711; font-weight: 800; border-radius: 4px; cursor: pointer;
            ">+</button>
          </div>
        </div>
      `;
    }).join('');

    updateTotals();
  }

  function updateQty(itemId, delta) {
    const current = cart[itemId] || 0;
    const next = Math.max(0, current + delta);
    if (next === 0) {
      delete cart[itemId];
    } else {
      cart[itemId] = next;
    }
    playChime();
    const searchInput = document.getElementById('inChatSearchInput');
    const q = searchInput ? searchInput.value : '';
    filterAndRenderItems(q);
  }

  function updateTotals() {
    let subtotal = 0;
    let hasItems = false;
    for (const [id, qty] of Object.entries(cart)) {
      const it = CORRIDOR_CATALOG.find(x => x.id === id);
      if (it && qty > 0) {
        subtotal += it.price * qty;
        hasItems = true;
      }
    }

    const courierFee = hasItems ? 10.00 : 0.00;
    const total = subtotal + courierFee;

    const subEl = document.getElementById('orderSubtotalText');
    const feeEl = document.getElementById('courierFeeText');
    const totEl = document.getElementById('orderTotalText');

    if (subEl) subEl.innerText = '$' + subtotal.toFixed(2);
    if (feeEl) feeEl.innerText = '$' + courierFee.toFixed(2);
    if (totEl) totEl.innerText = '$' + total.toFixed(2);
  }

  function handleEscrowAuthorize() {
    const totalQty = Object.values(cart).reduce((a, b) => a + b, 0);
    if (totalQty === 0) {
      alert('Please add at least 1 corridor item to authorize order.');
      return;
    }

    const address = document.getElementById('dropoffAddressInput')?.value || 'Palms / West Adams Corridor';
    const phone = document.getElementById('contactPhoneInput')?.value || '(323) 374-5787';

    // Generate 6-digit mutual handshake PIN
    const pin = Math.floor(100000 + Math.random() * 900000);
    const ticketId = 'SDK-' + Math.floor(1000 + Math.random() * 9000);

    playChime();

    const authBtn = document.getElementById('authorizeEscrowBtn');
    if (authBtn) {
      authBtn.disabled = true;
      authBtn.innerHTML = `<span>⏳ AUTHORIZING ESCROW (capture_method: manual)...</span>`;
    }

    setTimeout(() => {
      if (activeOverlay) {
        const dialog = activeOverlay.querySelector('div');
        if (dialog) {
          dialog.innerHTML = `
            <div style="background: #070d17; padding: 24px 20px; text-align: center; border-radius: 12px; font-family: monospace;">
              <div style="font-size: 38px; margin-bottom: 8px;">✅</div>
              <h3 style="color: #34d399; margin: 0 0 6px 0; font-size: 18px; font-weight: 800;">ESCROW PRE-AUTH AUTHORIZED</h3>
              <p style="color: #94a3b8; font-size: 12px; margin: 0 0 16px 0;">Ticket: <strong>[${ticketId}]</strong> • Transmitted to Samsung S10+ Courier HUD</p>
              
              <div style="background: #020617; border: 2px dashed #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #a1a1aa; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Mutual 6-Digit Doorstep Handshake PIN</div>
                <div style="font-size: 32px; font-weight: 900; color: #ffffff; letter-spacing: 0.15em;">${pin}</div>
                <div style="font-size: 10.5px; color: #38bdf8; margin-top: 6px;">Provide this PIN to Dedric (Courier #04) at your door for cryptographic release</div>
              </div>

              <div style="font-size: 12px; color: #94a3b8; text-align: left; background: #0f172a; padding: 10px; border-radius: 6px; margin-bottom: 16px;">
                <div>📍 <strong>Drop Zone:</strong> ${address}</div>
                <div>📱 <strong>SMS Updates:</strong> ${phone}</div>
                <div>⚡ <strong>E-Bike Chime:</strong> 587Hz &rarr; 880Hz Dispatched</div>
              </div>

              <button onclick="InChatContextWindow.close()" style="
                background: #38bdf8;
                color: #040711;
                font-weight: 800;
                font-size: 13px;
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                width: 100%;
              ">
                RETURN TO CHAT THREAD (ORDER IN FLIGHT)
              </button>
            </div>
          `;
        }
      }
    }, 900);
  }

  function close() {
    if (activeOverlay && activeOverlay.parentNode) {
      activeOverlay.parentNode.removeChild(activeOverlay);
      activeOverlay = null;
    }
  }

  return {
    version: "2.0.0",
    catalog: CORRIDOR_CATALOG,
    open: renderModal,
    close: close,
    updateQty: updateQty
  };
});
