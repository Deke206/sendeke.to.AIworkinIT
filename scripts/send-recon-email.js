const { sendAgentDispatchEmail } = require('./send-agentmail.js');

const htmlReport = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #334155; background: #0f172a; color: #f8fafc; border-radius: 12px; padding: 24px;">
  <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 20px;">
    <div style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1px;">Sovereign Corridor Recon // Palms 90034 • West Adams 90016</div>
    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 4px 0 0 0;">SENDEKETO.COM Headless Merchant Dossier</h1>
  </div>

  <p style="font-size: 14px; line-height: 1.5; color: #cbd5e1;">
    Comptroller Directive Executed. Zero corporate crunch chains. Focused strictly on independent mom-and-pop operators along Venice, Overland, National, and Adams boulevards.
  </p>

  <div style="margin: 16px 0; padding: 14px; background: #1e293b; border-radius: 8px; border-left: 4px solid #f59e0b;">
    <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #fbbf24;">1. Taquería El Cachetón (10500 Venice Blvd)</h3>
    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      • <strong>Status:</strong> Live Storefront Deployed at <code>tacos.html</code><br>
      • <strong>Items:</strong> Street Tacos ($3.00), Vampiritos ($3.50), Quesatacos ($6.00), Mulitas ($8.00), Burrito Gigante ($14.00), Wet Burrito ($15.00), Horchata ($4.50).
    </p>
  </div>

  <div style="margin: 16px 0; padding: 14px; background: #1e293b; border-radius: 8px; border-left: 4px solid #38bdf8;">
    <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #38bdf8;">2. The Doughroom (3409 Overland Ave, Palms 90034)</h3>
    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      • <strong>Status:</strong> Catalog Scraped • <code>the_doughroom_menu.json</code><br>
      • <strong>Items:</strong> The Classic ($18.50), Flying Pig Sausage & Piquillo ($22.50), She's My Cherry Tomato Burrata Pie ($24.00), Sausage Party ($24.50), Bird is the Word BBQ Chicken ($24.00), Garlic Knots ($9.50).
    </p>
  </div>

  <div style="margin: 16px 0; padding: 14px; background: #1e293b; border-radius: 8px; border-left: 4px solid #10b981;">
    <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #34d399;">3. Simpang Asia (10433 National Blvd, Palms 90034)</h3>
    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      • <strong>Status:</strong> Catalog Scraped • <code>simpang_asia_menu.json</code><br>
      • <strong>Items:</strong> Roti Paratha with Curry Dip ($7.50), Martabak Telor ($15.95), Chicken Sate ($15.95), Mie Tek Tek ($18.95), Nasi Goreng ($17.95), Nasi Bungkus Beef Rendang ($25.95), Teh Botol ($3.00).
    </p>
  </div>

  <div style="margin: 16px 0; padding: 14px; background: #1e293b; border-radius: 8px; border-left: 4px solid #ec4899;">
    <h3 style="margin: 0 0 6px 0; font-size: 15px; color: #f472b6;">4. Mizlala West Adams (5400 W Adams Blvd, 90016)</h3>
    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.4;">
      • <strong>Status:</strong> Catalog Scraped • <code>mizlala_west_adams_menu.json</code><br>
      • <strong>Items:</strong> Warm Pita Falafel ($11.95), Pita Chicken Shewarma ($12.95), Falafel Plate with Hummus ($20.95), Shewarma Feast ($21.95), Harira Soup ($8.50).
    </p>
  </div>

  <div style="border-top: 1px solid #334155; padding-top: 14px; margin-top: 20px; font-size: 11px; color: #64748b; text-align: center;">
    SENDEKETO.COM Autonomous Livery &amp; Ground Dispatch • Dedicated Line: (323) 374-5787
  </div>
</div>
`;

sendAgentDispatchEmail(
  '[CORRIDOR RECON] 4 New Small Mom-and-Pop Menus Scraped & Integrated into SENDEKETO.COM',
  'Comptroller Directive Executed. Scraped 4 authentic mom-and-pop merchants along the Palms / Culver / West Adams corridor: Taqueria El Cacheton, The Doughroom, Simpang Asia, Mizlala West Adams.',
  htmlReport
).then(res => {
  console.log('RECON EMAIL SENT SUCCESSFULLY:', JSON.stringify(res, null, 2));
}).catch(err => {
  console.error('RECON EMAIL ERROR:', err);
});
