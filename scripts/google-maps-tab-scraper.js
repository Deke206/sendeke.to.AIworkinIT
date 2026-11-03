/**
 * SENDEKE 2 // GOOGLE MAPS MULTI-TAB DEEP-SCRAPER (HARD-STOP FENCED)
 * Path: bootstrap.sendeketo.com/scripts/google-maps-tab-scraper.js
 * 
 * SAFETY GUARDS & HARD STOPS ENFORCED:
 * 1. Global Safety Kill-Switch: 25-second absolute timeout.
 * 2. Hard Tab Ceiling: Maximum 12 category tabs processed.
 * 3. Hard Scroll Ceiling: Maximum 3 scroll passes per tab with dead-stop detection.
 * 4. Emergency Escape Brake: Press 'Escape' key at ANY point to immediately halt execution.
 * 5. Zero Unbounded Fetch: No infinite request loops.
 */

(async function scrapeGoogleMapsMenuSafely() {
  console.log("%c[SENDEKE RECON] Initializing Fenced Multi-Tab Scraper (Press 'Esc' to Emergency Stop)...", "color: #38bdf8; font-weight: bold; font-size: 14px;");

  // =========================================================================
  // HARD STOP PARAMETERS (PREVENTS INFINITE LOOPS & BROWSER FREEZES)
  // =========================================================================
  const HARD_MAX_TABS = 12;           // Absolute ceiling on tabs to click
  const MAX_SCROLLS_PER_TAB = 3;      // Absolute ceiling on scroll cycles
  const GLOBAL_TIMEOUT_MS = 25000;    // Hard kill switch: 25 seconds total max
  let isAborted = false;

  // 1. Emergency Escape Key Listener
  const abortHandler = (e) => {
    if (e.key === "Escape") {
      isAborted = true;
      console.warn("%c[EMERGENCY BRAKE ENGAGED] 'Escape' pressed. Halting scraper immediately.", "color: #ef4444; font-weight: bold; font-size: 14px;");
    }
  };
  window.addEventListener("keydown", abortHandler, { once: true });

  // 2. Global Safety Timeout Timer
  const safetyTimer = setTimeout(() => {
    isAborted = true;
    console.warn("%c[SAFETY TIMER EXPIRED] Hit 25s global ceiling. Forcing graceful stop.", "color: #f59e0b; font-weight: bold; font-size: 13px;");
  }, GLOBAL_TIMEOUT_MS);

  const cleanup = () => {
    clearTimeout(safetyTimer);
    window.removeEventListener("keydown", abortHandler);
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  try {
    // 3. Extract Business Meta
    const businessName = document.querySelector('h1')?.innerText?.trim() || "Unknown Business";
    const addressBtn = document.querySelector('button[data-item-id="address"]');
    const address = addressBtn ? addressBtn.innerText.replace(/[\n\r]+/g, ' ').trim() : "Address not found";
    const phoneBtn = document.querySelector('button[data-item-id*="phone"]');
    const phone = phoneBtn ? phoneBtn.innerText.trim() : "";

    console.log(`%cTarget: ${businessName} | ${address}`, "color: #34d399; font-weight: bold;");

    // 4. Locate scroll container and tabs with strict limits
    const scrollContainer = document.querySelector('div[role="main"]') || document.querySelector('.m6QErb[aria-label]') || document.body;
    const rawTabs = Array.from(document.querySelectorAll('button[role="tab"], div[role="tab"], button.w6Ivbe'));
    const tabList = rawTabs.slice(0, HARD_MAX_TABS); // HARD CAP: Never exceed 12 tabs

    const fullCatalog = {
      store: {
        name: businessName,
        address: address,
        phone: phone,
        scraped_at: new Date().toISOString()
      },
      categories: []
    };

    // 5. Scrape currently mounted items in viewport
    function extractVisibleItems() {
      const items = [];
      const itemContainers = document.querySelectorAll('div.m6QErb > div');
      
      itemContainers.forEach((el) => {
        const text = el.innerText || "";
        if (text.includes('$') && text.length < 500) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          const priceMatch = text.match(/\$\s?(\d+\.?\d{0,2})/);
          if (priceMatch && lines.length >= 2) {
            const price = parseFloat(priceMatch[1]);
            const name = lines[0].replace(/\$\s?\d+\.?\d{0,2}/, '').trim();
            const desc = lines.length > 2 ? lines[1] : "";
            
            if (name && name.length > 2 && !name.toLowerCase().includes('review') && !name.toLowerCase().includes('popular')) {
              if (!items.some(i => i.item_name === name)) {
                items.push({
                  item_name: name,
                  description: desc,
                  price_cents: Math.round(price * 100),
                  price_display: `$${price.toFixed(2)}`,
                  package_tier: price > 30 ? "BULK_CATERING" : "STANDARD_HOT_FOOD"
                });
              }
            }
          }
        }
      });
      return items;
    }

    // 6. Gated Execution Loop
    if (tabList.length > 0) {
      console.log(`Processing up to ${tabList.length} tabs with strict cycle limits...`);

      for (let i = 0; i < tabList.length; i++) {
        if (isAborted) break;

        const tab = tabList[i];
        const tabName = tab.innerText?.trim() || `Category_${i + 1}`;
        console.log(`%c[Tab ${i + 1}/${tabList.length}] Clicking: "${tabName}"...`, "color: #f59e0b; font-weight: bold;");

        tab.click();
        await wait(1000); // 1.0s settle delay
        if (isAborted) break;

        // Fenced Virtual Scroll Pass with Dead-Stop Detection
        let lastScrollTop = scrollContainer.scrollTop;
        for (let s = 0; s < MAX_SCROLLS_PER_TAB; s++) {
          if (isAborted) break;
          scrollContainer.scrollBy({ top: 800, behavior: 'smooth' });
          await wait(500);
          
          // Dead-stop check: if container didn't move, we hit the bottom
          if (scrollContainer.scrollTop === lastScrollTop && s > 0) {
            break;
          }
          lastScrollTop = scrollContainer.scrollTop;
        }

        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        await wait(300);

        const tabItems = extractVisibleItems();
        console.log(`   -> Extracted ${tabItems.length} items from "${tabName}"`);

        fullCatalog.categories.push({
          category_name: tabName,
          item_count: tabItems.length,
          items: tabItems
        });
      }
    } else {
      console.log("Single-page layout detected. Executing bounded scroll pass (max 3 cycles)...");
      let lastScrollTop = scrollContainer.scrollTop;
      for (let s = 0; s < 3; s++) {
        if (isAborted) break;
        scrollContainer.scrollBy({ top: 1000, behavior: 'smooth' });
        await wait(700);
        if (scrollContainer.scrollTop === lastScrollTop && s > 0) break;
        lastScrollTop = scrollContainer.scrollTop;
      }
      const singleList = extractVisibleItems();
      fullCatalog.categories.push({
        category_name: "All Items",
        item_count: singleList.length,
        items: singleList
      });
    }

    // 7. Deduplicate & Deliver Payload
    const totalItems = fullCatalog.categories.reduce((acc, cat) => acc + cat.items.length, 0);
    console.log(`%c✓ SCRAPE COMPLETE: ${totalItems} items gathered. Zero runaway cycles.`, "color: #10b981; font-weight: bold; font-size: 15px;");

    const jsonString = JSON.stringify(fullCatalog, null, 2);

    try {
      await navigator.clipboard.writeText(jsonString);
      console.log("%c✓ JSON copied directly to clipboard! Ready to paste into Antigravity chat.", "color: #38bdf8; font-weight: bold;");
    } catch (err) {}

    // Auto-download file
    const blob = new Blob([jsonString], { type: 'application/json' });
    const a = document.createElement('a');
    const safeSlug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    a.href = URL.createObjectURL(blob);
    a.download = `${safeSlug}_menu_fenced.json`;
    a.click();

    cleanup();
    return fullCatalog;

  } catch (error) {
    cleanup();
    console.error("%c[SCRAPER HALTED ON ERROR]:", "color: #ef4444; font-weight: bold;", error);
  }
})();
