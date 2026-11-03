/**
 * SenDeke.to - Cloudflare Worker: Menu Scraper & Link Auto-Parser
 * Deployed to api.sendeke.to/api/scrape-menu
 * Extracts menu items, prices, and descriptions from restaurant URLs or Google Maps links.
 */

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      // Validate URL format
      const parsedTarget = new URL(targetUrl);
      if (!["http:", "https:"].includes(parsedTarget.protocol)) {
        return new Response(JSON.stringify({ error: "Invalid URL protocol" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Fetch the page with clean browser headers
      const pageRes = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9"
        }
      });

      const html = await pageRes.text();

      // Extract items using pattern matching for common restaurant menu schemas (schema.org/MenuItem or standard class names)
      const extractedItems = [];

      // 1. Check for schema.org MenuItem JSON-LD
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
      for (const match of jsonLdMatches) {
        try {
          const parsed = JSON.parse(match[1]);
          const findMenuItems = (obj) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
              obj.forEach(findMenuItems);
            } else if (typeof obj === "object") {
              if (obj["@type"] === "MenuItem" || obj["@type"] === "FoodEvent") {
                extractedItems.push({
                  name: obj.name || "Menu Item",
                  description: obj.description || "",
                  price: parseFloat(obj.offers?.price || obj.price || "0") || 12.00,
                  source: "schema.org"
                });
              }
              Object.values(obj).forEach(findMenuItems);
            }
          };
          findMenuItems(parsed);
        } catch (e) {}
      }

      // 2. If no JSON-LD found, fall back to heuristic extraction of price patterns ($X.XX alongside titles)
      if (extractedItems.length === 0) {
        // Regex looking for items followed by prices: e.g. "Chicken Burrito ... $14.50"
        const heuristicRegex = /(?:<h[2-5][^>]*>|<strong[^>]*>|<span class="[^"]*(?:title|name|item)[^"]*">)([^<]{3,60})(?:<\/h[2-5]>|<\/strong>|<\/span>)[^$]{0,120}\$(\d{1,3}(?:\.\d{2})?)/gi;
        let match;
        while ((match = heuristicRegex.exec(html)) !== null && extractedItems.length < 25) {
          const rawName = match[1].replace(/&amp;/g, "&").trim();
          const price = parseFloat(match[2]);
          if (rawName && !isNaN(price) && price > 1 && price < 150) {
            extractedItems.push({
              name: rawName,
              description: "Extracted from menu page",
              price: price,
              source: "page-heuristic"
            });
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        sourceUrl: targetUrl,
        itemsFound: extractedItems.length,
        items: extractedItems
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: "Failed to scrape menu: " + err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
