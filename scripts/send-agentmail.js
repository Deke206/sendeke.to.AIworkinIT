/**
 * SenDeke 2 / SENDEKETO.COM - AgentMail Autonomous Dispatch Messenger
 * Path: bootstrap.sendeketo.com/scripts/send-agentmail.js
 */

const https = require('https');

const API_KEY = process.env.AGENTMAIL_API_KEY || 'am_us_6bf9421a86a6dd4aeb0c4a50aaea627bad26e042ae8885ac7933b3dbd688ddc3';
const INBOX_ID = 'sendeke.to@agentmail.to';
const HUMAN_TARGET = 'sendeke.to@gmail.com';

async function sendAgentDispatchEmail(subject, text, htmlContent) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      to: [HUMAN_TARGET],
      subject: subject,
      text: text,
      html: htmlContent || `<p>${text.replace(/\n/g, '<br>')}</p>`,
      labels: ['dispatch', 'corridor-recon']
    });

    const options = {
      hostname: 'api.agentmail.to',
      path: `/v0/inboxes/${encodeURIComponent(INBOX_ID)}/messages/send`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// If run directly from CLI
if (require.main === module) {
  const subject = process.argv[2] || '[SENDEKETO.COM] Sovereign Fleet Live Dispatch Verified';
  const text = process.argv[3] || 'Comptroller Directive Executed.\n\nAgent Reddington active on SENDEKETO.COM.\n\nBackend dispatch connected to sendeke.to@gmail.com.';

  console.log(`Sending AgentMail from ${INBOX_ID} to ${HUMAN_TARGET}...`);
  sendAgentDispatchEmail(subject, text)
    .then(result => {
      console.log('AGENTMAIL RESULT:', JSON.stringify(result, null, 2));
    })
    .catch(err => {
      console.error('AGENTMAIL ERROR:', err);
    });
}

module.exports = { sendAgentDispatchEmail };
