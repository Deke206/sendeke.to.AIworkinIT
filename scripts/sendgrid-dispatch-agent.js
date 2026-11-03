/**
 * SENDEKE.TO SENDGRID DISPATCH AGENT
 * -------------------------------------------------------------
 * Powers automated transactional courier receipts, order confirmations,
 * and AI-driven inbound order parsing using SendGrid v3 & Gemini 3.8 Flash.
 */

import fetch from 'node-fetch';

export class SendGridDispatchAgent {
  constructor(options = {}) {
    this.sendgridApiKey = options.sendgridApiKey || process.env.SENDGRID_API_KEY;
    this.geminiApiKey = options.geminiApiKey || process.env.GEMINI_API_KEY;
    this.senderEmail = options.senderEmail || "dispatch@sendeketo.com";
    this.senderName = options.senderName || "SenDeke.to Dispatch";
    this.domain = options.domain || "https://sendeketo.com";
  }

  /**
   * Sends a branded transactional receipt and live GPS tracking link to the customer
   */
  async sendOrderReceipt(ticket) {
    if (!this.sendgridApiKey) {
      throw new Error("SENDGRID_API_KEY is required to send emails.");
    }

    const recipientEmail = ticket.customerEmail || ticket.customer_email;
    const recipientName = ticket.customerName || ticket.customer_name || "Valued Customer";
    const ticketId = ticket.ticketId || ticket.ticket_id || "SDK-" + Date.now().toString(36).toUpperCase();
    const trackingUrl = `${this.domain}?ticket=${encodeURIComponent(ticketId)}`;
    const fare = Number(ticket.fare || 15).toFixed(2);
    const store = ticket.pickupStore || ticket.pickup_store || "Local Partner Store";
    const dropoff = ticket.deliveryAddress || ticket.delivery_address || "Delivery Address";
    const items = ticket.itemsSummary || ticket.items_summary || "Courier Delivery Items";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f3f4f6; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
          .header p { margin: 6px 0 0; color: #ecfdf5; font-size: 13px; font-weight: 500; }
          .content { padding: 28px; }
          .badge { display: inline-block; background-color: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .details-table td { padding: 10px 0; border-bottom: 1px solid #1f2937; font-size: 14px; }
          .label { color: #9ca3af; font-weight: 500; }
          .value { text-align: right; color: #ffffff; font-weight: 600; }
          .total-row td { border-bottom: none; font-size: 18px; font-weight: 800; color: #34d399; padding-top: 14px; }
          .btn-container { text-align: center; margin: 32px 0 16px; }
          .btn { background-color: #10b981; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; text-decoration: none; display: inline-block; }
          .footer { padding: 20px 28px; background-color: #0d131f; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #1f2937; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SenDeke.to</h1>
            <p>Hyper-Local Bike Courier & Zero-Commission Dispatch</p>
          </div>
          <div class="content">
            <span class="badge">Ticket Confirmed • ${ticketId}</span>
            <p>Hi <strong>${recipientName}</strong>,</p>
            <p>Your bike courier ticket has been dispatched in the Palms & Culver City zone.</p>
            
            <table class="details-table">
              <tr>
                <td class="label">Pickup Location:</td>
                <td class="value">${store}</td>
              </tr>
              <tr>
                <td class="label">Drop-off:</td>
                <td class="value">${dropoff}</td>
              </tr>
              <tr>
                <td class="label">Items:</td>
                <td class="value">${items}</td>
              </tr>
              <tr class="total-row">
                <td class="label" style="color: #ffffff;">Courier Fare:</td>
                <td class="value">$${fare}</td>
              </tr>
            </table>

            <div class="btn-container">
              <a href="${trackingUrl}" class="btn">Track Live Courier 🚴💨</a>
            </div>
          </div>
          <div class="footer">
            <p>SenDeke.to | Palms, Culver City, West LA 90034</p>
            <p>Questions? Call dispatch directly: (310) 945-2378</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const payload = {
      personalizations: [
        {
          to: [{ email: recipientEmail, name: recipientName }],
          subject: `Your SenDeke.to Courier Ticket [${ticketId}]`
        }
      ],
      from: {
        email: this.senderEmail,
        name: this.senderName
      },
      content: [
        {
          type: "text/html",
          value: htmlContent
        }
      ]
    };

    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.sendgridApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (res.status >= 200 && res.status < 300) {
      return { success: true, ticketId, recipientEmail };
    } else {
      const errBody = await res.text();
      throw new Error(`SendGrid Error (${res.status}): ${errBody}`);
    }
  }

  /**
   * Uses Gemini AI to parse inbound emails or text transcripts into structured tickets
   */
  async parseInboundEmailWithGemini(emailContent) {
    if (!this.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required for AI parsing.");
    }

    const systemPrompt = `You are the SenDeke.to Dispatch Agent. Extract order details from customer emails into JSON.
Output ONLY a raw JSON object with these exact keys:
{
  "customerName": "string or 'Customer'",
  "customerPhone": "string or ''",
  "pickupStore": "string (e.g. 'Sweetfin', 'Health Nut', or store name)",
  "deliveryAddress": "full street address",
  "itemsSummary": "summary of items requested",
  "estimatedFoodCost": number (or 0),
  "specialInstructions": "string"
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\nEmail Content:\n${emailContent}` }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Empty response from Gemini AI.");
    return JSON.parse(rawText);
  }
}
