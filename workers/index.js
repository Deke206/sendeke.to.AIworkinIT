import { firebaseConfig } from '../assets/js/firebase-config.js';
import escrowBroker from './escrow-broker.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Escrow & Dispatch API Routes (Stripe PaymentIntents & D1 Database)
    if (url.pathname.startsWith('/api/escrow') || url.pathname.startsWith('/api/dispatch')) {
      return escrowBroker.fetch(request, env, ctx);
    }

    // 2. Firebase Edge Configuration
    if (url.pathname === '/api/firebase-config') {
      return new Response(JSON.stringify(firebaseConfig, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 3. System Health
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ONLINE',
        system: 'SenDeke Sovereign Corridor Edge Worker',
        firebaseProject: firebaseConfig.projectId,
        database: 'sendeke-production-d1',
        theater: 'Southern California (Palms 90034 / West Adams 90016 / Culver City)'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 4. Serve static assets via Cloudflare Workers Assets binding
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      
      // Mirror Firebase Hosting security headers
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }
    
    return new Response('SenDeke Sovereign Corridor Online', { status: 200 });
  }
};
