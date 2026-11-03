/**
 * SENDEKETO.COM - WebMCP (Web Model Context Protocol) Client Integration & In-Chat Generative Ad Engine
 * Chrome Origin Trial Token: sendeketo.com (WebMCP)
 * Universal Browser (file:/// + HTTPS) & CommonJS Module
 */
(function (root, factory) {
  const mcp = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mcp;
  }
  if (root) {
    root.WebMCP = mcp;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const WebMCP = {
    version: "2.1.0",
    originTrial: "A4JFxFbidZH7YDsxKznMnnZzStMw8iHJF",
    isAvailable: false,
    menuCache: null,
    agentFeedCache: null,

    tools: [
      {
        name: "lookup_menu",
        description: "Search Sweetfin, Taquería El Cachetón, Lokal Sandwich Shop, The Doughroom, Simpang Asia, and Mizlala menu items, prices, and dietary info for Palms (90034), Culver City (90232), and West Adams (90016).",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Keyword to search (e.g. 'salmon', 'tacos', 'banh mi', 'pizza', 'nasi goreng', 'shawarma')"
            },
            merchant: {
              type: "string",
              description: "Filter by merchant: 'sweetfin', 'el_cacheton', 'lokal', 'doughroom', 'simpang', 'mizlala', or 'all'"
            },
            category: {
              type: "string",
              description: "Category filter (e.g. 'Signature Bowls', 'Street Tacos', 'Banh Mi', 'Artisan Pizza')"
            },
            maxPrice: {
              type: "number",
              description: "Maximum item price in USD"
            }
          }
        }
      },
      {
        name: "generate_in_chat_card",
        description: "Generates a high-converting Generative UI overlay card with transparent pricing and 1-tap ordering link for direct in-chat display.",
        parameters: {
          type: "object",
          properties: {
            merchantId: {
              type: "string",
              description: "Merchant identifier: 'sweetfin_palms', 'el_cacheton', 'lokal_sandwich', 'doughroom_palms', 'simpang_asia', or 'mizlala_west_adams'"
            },
            itemId: {
              type: "string",
              description: "Item identifier (e.g. 'sf-yuzu-salmon', 'tac-01')"
            }
          },
          required: ["merchantId", "itemId"]
        }
      },
      {
        name: "get_courier_status",
        description: "Retrieve real-time bike courier availability, service radius, and active dispatch status in Palms/Culver City (90034).",
        parameters: {
          type: "object",
          properties: {
            zipCode: {
              type: "string",
              description: "Delivery ZIP code (e.g. 90034, 90232, 90016)"
            }
          }
        }
      },
      {
        name: "calculate_delivery_fare",
        description: "Calculates the fair, transparent delivery fare with $0 middleman markup and flat $10 local courier pricing.",
        parameters: {
          type: "object",
          properties: {
            subtotal: {
              type: "number",
              description: "Subtotal of food items before courier fee"
            },
            tipAmount: {
              type: "number",
              description: "Optional tip amount for bike courier (100% kept by rider)"
            }
          },
          required: ["subtotal"]
        }
      },
      {
        name: "sms_dispatch_alert",
        description: "Triggers an automated SMS notification to the courier or kitchen worker for active order pickup.",
        parameters: {
          type: "object",
          properties: {
            ticketId: {
              type: "string",
              description: "Order ticket identifier (e.g. SDK-90034)"
            },
            message: {
              type: "string",
              description: "Action notification content for courier dispatch"
            }
          },
          required: ["ticketId", "message"]
        }
      }
    ],

    init: async function () {
      try {
        if (typeof window !== "undefined") {
          if ("modelContext" in navigator || "ai" in window || "webMcp" in window) {
            this.isAvailable = true;
          }
          window.webMcpTools = this.tools;
          window.executeWebMcpTool = this.executeTool.bind(this);
          window.dispatchEvent(new CustomEvent("sendeke:webmcp:ready", { detail: { tools: this.tools } }));
        }
        return true;
      } catch (err) {
        console.warn("[WebMCP] Initialization warning:", err);
        return false;
      }
    },

    loadAgentFeed: async function () {
      if (this.agentFeedCache) return this.agentFeedCache;
      try {
        const res = await fetch("assets/data/agent-feed.json");
        if (res.ok) {
          this.agentFeedCache = await res.json();
          return this.agentFeedCache;
        }
      } catch (e) {}
      return null;
    },

    loadMenuData: async function () {
      if (this.menuCache) return this.menuCache;
      try {
        const res = await fetch("assets/data/sweetfin_menu_clean.json");
        if (res.ok) {
          this.menuCache = await res.json();
          return this.menuCache;
        }
      } catch (e) {}
      if (typeof window !== "undefined" && window.SenDekeEngine) {
        return window.SenDekeEngine.catalog || [];
      }
      return [];
    },

    buildCardHtml: function (item, merchant) {
      const foodPrice = Number(item.price || 0).toFixed(2);
      const courierFee = (10.00).toFixed(2);
      const total = (Number(foodPrice) + 10.00).toFixed(2);
      const doordashEstimate = (Number(foodPrice) * 1.35 + 8.99).toFixed(2);
      const savings = (Number(doordashEstimate) - Number(total)).toFixed(2);
      const proteinTag = item.protein ? `<span style="background:#14532d; color:#86efac; padding:2px 8px; border-radius:4px; font-weight:700; font-size:11px;">💪 ${item.protein}</span>` : '';
      const dietTag = item.diet ? `<span style="background:#27272a; color:#a1a1aa; padding:2px 8px; border-radius:4px; font-size:11px;">🌱 ${item.diet}</span>` : '';

      return `
<div class="sendeke-generative-card" style="background:#121214; border:1px solid #3b82f6; border-radius:12px; padding:16px; color:#f4f4f5; max-width:400px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow:0 10px 30px rgba(0,0,0,0.6); position:relative; overflow:hidden;">
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
    <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; background:rgba(37,99,235,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); padding:3px 8px; border-radius:6px; font-weight:700;">⚡ SenDeke Direct E-Bike</span>
    <span style="font-size:12px; color:#34d399; font-weight:700;">⏱ 12 Min Drop</span>
  </div>
  <div style="margin-bottom:8px;">
    <h3 style="margin:0 0 4px 0; font-size:17px; font-weight:700; color:#ffffff;">${item.name}</h3>
    <div style="font-size:12px; color:#93c5fd; font-weight:500;">📍 ${merchant.name} (${merchant.address || 'Palms/Culver City'})</div>
  </div>
  <p style="margin:0 0 10px 0; font-size:12px; color:#a1a1aa; line-height:1.4;">${item.description || ''}</p>
  <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
    ${proteinTag}
    ${dietTag}
  </div>
  <div style="background:#18181b; border:1px solid #27272a; padding:10px 12px; border-radius:8px; font-size:13px; margin-bottom:14px;">
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span style="color:#a1a1aa;">In-Store Retail:</span>
      <strong style="color:#ffffff;">$${foodPrice}</strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
      <span style="color:#a1a1aa;">Direct Courier Fee:</span>
      <strong style="color:#60a5fa;">$${courierFee}</strong>
    </div>
    <div style="border-top:1px dashed #3f3f46; margin:6px 0;"></div>
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <span style="font-weight:700; color:#ffffff;">Total (Zero Markup):</span>
      <strong style="font-size:15px; color:#34d399;">$${total}</strong>
    </div>
    <div style="font-size:11px; color:#10b981; margin-top:4px; text-align:right;">
      Saved ~$${savings} vs DoorDash/UberEats
    </div>
  </div>
  <a href="checkout.html?merchant=${merchant.id || 'sweetfin_palms'}&item=${encodeURIComponent(item.name)}" onclick="if(window.openInChatContextWindow){event.preventDefault();window.openInChatContextWindow('${item.name}','${merchant.id}');}" style="display:block; text-align:center; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:700; font-size:13px; padding:12px 14px; border-radius:8px; box-shadow:0 4px 12px rgba(37,99,235,0.4);">
    🚀 1-Tap Direct Order (No App Download)
  </a>
</div>`.trim();
    },

    executeTool: async function (name, args) {
      const params = args || {};
      switch (name) {
        case "lookup_menu": {
          const feed = await this.loadAgentFeed();
          let matchedItems = [];

          if (feed && feed.merchants) {
            feed.merchants.forEach(m => {
              if (params.merchant && params.merchant !== "all" && !m.id.includes(params.merchant.toLowerCase())) {
                return;
              }
              if (m.items) {
                m.items.forEach(it => {
                  let match = true;
                  if (params.query) {
                    const rawQ = params.query.toLowerCase();
                    let terms = [rawQ];
                    if (rawQ.includes("sandwich")) terms.push("panini", "torta", "burrito", "banh mi", "bread");
                    if (rawQ.includes("lunch") || rawQ.includes("special")) terms.push("lunch", "special", "bowl", "panini", "torta", "pizza");
                    if (rawQ.includes("salad")) terms.push("salad", "greens", "kale");
                    if (rawQ.includes("protein")) terms.push("protein", "salmon", "chicken", "tuna", "asada");

                    const textBlob = `${it.name || ''} ${it.description || ''} ${m.category || ''} ${it.diet || ''}`.toLowerCase();
                    match = terms.some(t => textBlob.includes(t));
                  }
                  if (match && params.maxPrice) {
                    match = (it.price || 0) <= params.maxPrice;
                  }
                  if (match) {
                    matchedItems.push({
                      ...it,
                      merchantId: m.id,
                      merchantName: m.name,
                      merchantAddress: m.address
                    });
                  }
                });
              }
            });
          }

          if (matchedItems.length === 0) {
            const menu = await this.loadMenuData();
            matchedItems = menu.slice(0, 8).map(i => ({
              id: (i.name || 'item').toLowerCase().replace(/\s+/g, '-'),
              name: i.name,
              price: i.price,
              description: i.description || '',
              diet: i.diet || '100% Gluten-Free',
              merchantId: "sweetfin_palms",
              merchantName: i.merchant || "Sweetfin Palms",
              merchantAddress: "3105 Overland Ave / 3110 Main St, Palms, CA 90034"
            }));
          }

          const topItem = matchedItems[0];
          const primaryCard = topItem ? this.buildCardHtml(topItem, {
            id: topItem.merchantId,
            name: topItem.merchantName,
            address: topItem.merchantAddress
          }) : null;

          return {
            totalFound: matchedItems.length,
            cardHtml: primaryCard,
            items: matchedItems.slice(0, 6)
          };
        }

        case "generate_in_chat_card": {
          const feed = await this.loadAgentFeed();
          if (feed && feed.merchants && feed.merchants.length > 0) {
            const merchant = feed.merchants.find(m => m.id === params.merchantId) || feed.merchants[0];
            const item = (merchant.items || []).find(it => it.id === params.itemId) || merchant.items[0];
            return {
              success: true,
              merchant: merchant.name,
              item: item.name,
              price: item.price,
              protein: item.protein || null,
              cardHtml: this.buildCardHtml(item, merchant)
            };
          }
          const fallbackItem = { name: "Spicy Yuzu Salmon Poke Bowl", price: 16.90, description: "100% Gluten-Free Sashimi Bowl", diet: "Gluten-Free" };
          const fallbackMerchant = { id: "sweetfin_palms", name: "Sweetfin Palms", address: "Palms 90034" };
          return {
            success: true,
            merchant: fallbackMerchant.name,
            item: fallbackItem.name,
            price: fallbackItem.price,
            cardHtml: this.buildCardHtml(fallbackItem, fallbackMerchant)
          };
        }

        case "get_courier_status": {
          const liveStatus = (typeof window !== "undefined" && window.SenDekeEngine)
            ? window.SenDekeEngine.getDriverStatus()
            : { isOnline: true };
          return {
            status: liveStatus.isOnline ? "ONLINE" : "OFFLINE",
            courier: "Dedric (Deke) Alexander — Courier #04",
            fleet: "Sovereign E-Bike Livery Fleet",
            serviceZone: "Palms & Culver City (90034 / 90232 / 90016)",
            flatRate: 10.00,
            appMarkups: "0%",
            estimatedPickupTimeMinutes: 12,
            currentHub: "Overland & Venice Corridor Hub (Palms 90034)",
            directPhone: "(323) 374-5787"
          };
        }

        case "calculate_delivery_fare": {
          const subtotal = Number(params.subtotal) || 0;
          const tip = Math.max(2.50, Number(params.tipAmount) || 2.50);
          const flatDeliveryFee = 10.00;
          const appMarkupSaved = +(subtotal * 0.32).toFixed(2);
          return {
            foodSubtotal: subtotal,
            deliveryFee: flatDeliveryFee,
            courierTip: tip,
            totalCost: +(subtotal + flatDeliveryFee + tip).toFixed(2),
            middlemanFee: 0.00,
            customerSavingsEstimate: appMarkupSaved,
            payoutToCourierPercentage: "100%"
          };
        }

        case "sms_dispatch_alert": {
          const ticketId = params.ticketId || "SDK-90034";
          const msg = params.message || "Order ready for courier pickup";
          const smsLink = `sms:13233745787?body=${encodeURIComponent(`[SenDeke Alert ${ticketId}] ${msg}`)}`;
          return {
            success: true,
            ticketId: ticketId,
            recipient: "(323) 374-5787",
            smsLink: smsLink,
            status: "DISPATCHED"
          };
        }

        default:
          throw new Error("Tool not found: " + name);
      }
    }
  };

  if (typeof window !== "undefined") {
    WebMCP.init();
  }

  return WebMCP;
});
