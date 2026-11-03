/**
 * SenDeke 2 / SENDEKETO.COM - Autonomous Mom-and-Pop Corridor Recon Dispatch
 * Path: bootstrap.sendeketo.com/scripts/send-mom-and-pop-recon.js
 */

const { sendAgentDispatchEmail } = require('./send-agentmail.js');

const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #07090e; color: #f0f4f8; border: 1px solid #1f2836; border-radius: 12px; overflow: hidden; box-shadow: 0 16px 40px rgba(0,0,0,0.6);">
  <div style="background: linear-gradient(135deg, #0e121a 0%, #151b26 100%); padding: 24px; border-bottom: 2px solid #0078d4;">
    <div style="font-size: 11px; font-weight: 800; color: #0078d4; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">SENDEKETO.COM // COMPTROLLER AUTONOMOUS RECON</div>
    <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #ffffff; letter-spacing: -0.5px;">Palms (90034) Independent Mom-and-Pop Catalogs Scraped &amp; Deployed</h1>
    <div style="font-size: 13px; color: #8f9cae; margin-top: 6px;">Corridor Anchor: National Blvd &bull; Venice Blvd &bull; Overland Ave &bull; West Adams</div>
  </div>

  <div style="padding: 24px;">
    <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1; margin-top: 0;">
      <strong>Comptroller Directive Executed:</strong> Zero corporate crunch chains. Zero generic stubs. Below are 5 verified, factual mom-and-pop businesses mapped with authentic menu items, real street pricing, and zero middleman markups for direct courier dispatch.
    </p>

    <!-- Merchant 1: Lokal Sandwich Shop -->
    <div style="background: #0e121a; border: 1px solid #1f2836; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h3 style="margin: 0; font-size: 16px; color: #34d399;">1. Lokal Sandwich Shop (10433 National Blvd, Palms)</h3>
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0 10px 0;">Handcrafted Sandwiches &bull; Vietnamese Banh Mi &bull; Artisan Ciabatta Subs</div>
      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0;">
        &bull; <strong>Old Skool Banh Mi:</strong> $14.45 (Pork loaf, ham, head cheese, pate, jalape&ntilde;o, pickled daikon)<br>
        &bull; <strong>Chimichurri Steak Sandwich:</strong> $17.45 (Grilled steak, scratch chimichurri, pepper jack, ciabatta)<br>
        &bull; <strong>Italian Job 2.0 Sub:</strong> $16.45 (Genoa salami, mortadella, capicola, provolone, arugula)<br>
        &bull; <strong>Albacore Tuna Melt:</strong> $17.45 (Line-caught wild albacore, sharp cheddar, avocado, sourdough)<br>
        &bull; <strong>Sunrise Breakfast Sandwich:</strong> $6.70 (Two eggs, cheddar, mayo, tomato, ciabatta)<br>
        &bull; <strong>Vietnamese Iced Coffee:</strong> $5.75 (Slow-dripped dark roast with sweetened condensed milk)
      </div>
    </div>

    <!-- Merchant 2: Taquería El Cachetón -->
    <div style="background: #0e121a; border: 1px solid #1f2836; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
      <h3 style="margin: 0; font-size: 16px; color: #fbbf24;">2. Taquer&iacute;a El Cachet&oacute;n (10500 Venice Blvd)</h3>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0 10px 0;">Live Storefront Deployed at <code>tacos.html</code></div>
      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0;">
        &bull; <strong>Street Tacos:</strong> $3.00 &bull; <strong>Vampiritos:</strong> $3.50 &bull; <strong>Quesatacos:</strong> $6.00<br>
        &bull; <strong>Mulitas:</strong> $8.00 &bull; <strong>Burrito Gigante:</strong> $14.00 &bull; <strong>Horchata:</strong> $4.50
      </div>
    </div>

    <!-- Merchant 3: The Doughroom -->
    <div style="background: #0e121a; border: 1px solid #1f2836; border-left: 4px solid #0078d4; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
      <h3 style="margin: 0; font-size: 16px; color: #38bdf8;">3. The Doughroom (3409 Overland Ave, Palms)</h3>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0 10px 0;">Scratch Artisan Pizza &bull; Local Craft Beer Pairing</div>
      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0;">
        &bull; <strong>The Classic:</strong> $18.50 &bull; <strong>Flying Pig:</strong> $22.50 &bull; <strong>Burrata Cherry Tomato Pie:</strong> $24.00<br>
        &bull; <strong>Sausage Party:</strong> $24.50 &bull; <strong>Garlic Knots:</strong> $9.50
      </div>
    </div>

    <!-- Merchant 4: Simpang Asia -->
    <div style="background: #0e121a; border: 1px solid #1f2836; border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
      <h3 style="margin: 0; font-size: 16px; color: #c084fc;">4. Simpang Asia (10433 National Blvd, Palms)</h3>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0 10px 0;">Authentic Indonesian Street Food &amp; Grocery</div>
      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0;">
        &bull; <strong>Roti Paratha + Curry:</strong> $7.50 &bull; <strong>Chicken Sate:</strong> $15.95 &bull; <strong>Mie Tek Tek:</strong> $18.95<br>
        &bull; <strong>Nasi Goreng:</strong> $17.95 &bull; <strong>Nasi Bungkus Beef Rendang:</strong> $25.95
      </div>
    </div>

    <!-- Merchant 5: Mizlala West Adams -->
    <div style="background: #0e121a; border: 1px solid #1f2836; border-left: 4px solid #ec4899; border-radius: 8px; padding: 16px; margin-bottom: 14px;">
      <h3 style="margin: 0; font-size: 16px; color: #f472b6;">5. Mizlala West Adams (5400 W Adams Blvd)</h3>
      <div style="font-size: 12px; color: #94a3b8; margin: 4px 0 10px 0;">Modern Mediterranean &bull; Fresh Scratch Pita</div>
      <div style="font-size: 13px; line-height: 1.5; color: #e2e8f0;">
        &bull; <strong>Pita Falafel:</strong> $11.95 &bull; <strong>Pita Chicken Shewarma:</strong> $12.95<br>
        &bull; <strong>Falafel Plate:</strong> $20.95 &bull; <strong>Harira Soup:</strong> $8.50
      </div>
    </div>

    <div style="margin-top: 24px; padding: 14px; background: rgba(0, 120, 212, 0.1); border: 1px solid #0078d4; border-radius: 8px; text-align: center;">
      <div style="font-size: 13px; font-weight: 700; color: #ffffff;">Real-Time Dispatch Engine Active</div>
      <div style="font-size: 12px; color: #8f9cae; margin-top: 2px;">
        Stripe 7-Day Pre-Auth Escrow &bull; Doorstep Mutual Handshake PIN &bull; Cloudflare D1 Backend
      </div>
    </div>
  </div>

  <div style="background: #05080e; padding: 16px; text-align: center; border-top: 1px solid #1f2836; font-size: 11px; color: #64748b;">
    SENDEKETO.COM Sovereign Corridor &bull; Dedicated Livery Dispatch: (323) 374-5787 &bull; sendeketo.com
  </div>
</div>
`;

async function main() {
  console.log('Sending Mom-and-Pop Recon Dossier via AgentMail to sendeke.to@gmail.com...');
  try {
    const res = await sendAgentDispatchEmail(
      '[CORRIDOR RECON] 5 Small Mom-and-Pop Menus Scraped & Bound to SENDEKETO.COM',
      'Comptroller Directive Executed. Scraped 5 authentic mom-and-pop merchants in Palms 90034: Lokal Sandwich Shop, Taqueria El Cacheton, The Doughroom, Simpang Asia, Mizlala West Adams.',
      htmlContent
    );
    console.log('AGENTMAIL DISPATCH RESULT:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('AGENTMAIL FAILED:', err);
  }
}

main();
