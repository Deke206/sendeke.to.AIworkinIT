// Google Maps Client Configuration & Platform Environment Resolver for SenDeke.to
// Secured via Google Cloud Console HTTP Referrer Restrictions (*.sendeke.to, sendeke-to-web.web.app)

export const mapsConfig = {
  apiKey: (typeof window !== 'undefined' && (window.__GOOGLE_MAPS_KEY__ || (window.ENV && window.ENV.GOOGLE_MAPS_API_KEY))) || "",

  // Device & User Agent Resolver (iOS / iPhone, Android version, mobile vs desktop)
  getUserAgent: () => (typeof navigator !== 'undefined' ? navigator.userAgent : ''),

  getPlatform: () => {
    if (typeof navigator === 'undefined') return { os: 'unknown', isMobile: false, version: null };
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    
    let androidVersion = null;
    if (isAndroid) {
      const match = ua.match(/Android\s([0-9\.]*)/i);
      if (match && match[1]) androidVersion = match[1];
    }

    let iosVersion = null;
    if (isIOS) {
      const match = ua.match(/OS\s([0-9_]*)/i);
      if (match && match[1]) iosVersion = match[1].replace(/_/g, '.');
    }

    return {
      os: isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop',
      isMobile: isIOS || isAndroid,
      version: isIOS ? iosVersion : isAndroid ? androidVersion : null,
      ua
    };
  },

  // SDK & API matching flag (false because it's global web API serving all clients dynamically)
  matchSdkApiToUser: false,

  // Script Loader helper: Guarantees single-load execution without duplicate script injections
  loadScript: (libraries = 'places,geometry') => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window not available'));
      if (window.google && window.google.maps) {
        return resolve(window.google.maps);
      }
      const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.google.maps));
        existing.addEventListener('error', e => reject(e));
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsConfig.apiKey}&libraries=${libraries}&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google.maps);
      script.onerror = err => reject(err);
      document.head.appendChild(script);
    });
  }
};

export default mapsConfig;
