/**
 * SenDeke.to - Cloudflare Worker: Edge AI Shopping List Parser
 * Deployed to api.sendeke.to/api/ai/parse-shopping-list
 * Uses Cloudflare Workers AI (@cf/meta/llama-3-8b-instruct) to transform messy text lists into structured grocery items.
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

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    try {
      const { rawText } = await request.json();
      if (!rawText || typeof rawText !== "string") {
        return new Response(JSON.stringify({ error: "Missing 'rawText' property" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // If env.AI is bound (Cloudflare Workers AI platform)
      let parsedItems = [];
      if (env.AI) {
        const prompt = `You are a grocery shopping list assistant for a neighborhood courier in 90034.
Convert this raw shopping list into a strict JSON array of objects with keys "name", "category", "estimatedPrice", "notes".
Return ONLY valid JSON and no markdown formatting or extra text.

Raw List:
${rawText}

Example Output:
[{"name": "Whole Milk (1 Gallon)", "category": "Dairy", "estimatedPrice": 4.50, "notes": "Cold refrigerated"}]`;

        const response = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          prompt: prompt,
          max_tokens: 512
        });

        try {
          const cleanedText = response.response.replace(/```json/gi, "").replace(/```/gi, "").trim();
          parsedItems = JSON.parse(cleanedText);
        } catch (e) {
          // Fallback if model output contained comments
        }
      }

      // High-speed edge heuristic fallback if Workers AI is not yet bound
      if (parsedItems.length === 0) {
        const lines = rawText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
        parsedItems = lines.map(line => {
          let category = "Pantry / General";
          let estPrice = 4.50;

          const l = line.toLowerCase();
          if (l.includes("milk") || l.includes("cheese") || l.includes("yogurt") || l.includes("butter")) {
            category = "Dairy & Eggs";
            estPrice = 4.99;
          } else if (l.includes("egg")) {
            category = "Dairy & Eggs";
            estPrice = 5.49;
          } else if (l.includes("apple") || l.includes("banana") || l.includes("salad") || l.includes("berry") || l.includes("spinach")) {
            category = "Fresh Produce";
            estPrice = 3.99;
          } else if (l.includes("bread") || l.includes("sourdough") || l.includes("bagel") || l.includes("croissant")) {
            category = "Bakery";
            estPrice = 4.75;
          } else if (l.includes("chicken") || l.includes("beef") || l.includes("pork") || l.includes("salmon")) {
            category = "Meat & Seafood";
            estPrice = 9.99;
          } else if (l.includes("paper") || l.includes("soap") || l.includes("paste") || l.includes("shampoo")) {
            category = "Household & Hygiene";
            estPrice = 6.50;
          }

          return {
            name: line,
            category: category,
            estimatedPrice: estPrice,
            notes: "Parsed at edge"
          };
        });
      }

      return new Response(JSON.stringify({
        success: true,
        itemsCount: parsedItems.length,
        items: parsedItems
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
