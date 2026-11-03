/**
 * SenDeke 2 - Canonical Multi-Zone Geofence Definitions
 * Source: Deke's Spoken Directives (Venice/MDR/SM, Sawtelle/UCLA, WeHo/La Brea, 90034-90016, K-Town, Crenshaw)
 */

export const GEOFENCE_ZONES = {
  VENICE_MDR_SM: {
    zone_id: 'zone_venice_mdr_sm',
    zone_name: 'Venice / Marina Del Rey / Santa Monica Coastal Fence',
    short_code: 'VNC-MDR-SM',
    postal_codes: ['90291', '90292', '90401', '90405'],
    center: { lat: 33.9936, lng: -118.4680 },
    radius_feet: 800,
    boundaries_description: 'Washington Blvd, Marina Del Rey, Windward Ave (Venice), Santa Monica Blvd to Bundy Dr, and back to Washington Blvd',
    polygon: [
      { lat: 33.9800, lng: -118.4550 }, // Marina Del Rey / Washington Blvd south
      { lat: 33.9880, lng: -118.4735 }, // Venice Beach / Windward Ave
      { lat: 34.0150, lng: -118.4980 }, // Santa Monica Ocean Ave
      { lat: 34.0350, lng: -118.4650 }, // Santa Monica Blvd at Bundy Dr
      { lat: 34.0050, lng: -118.4350 }, // Bundy Dr south to Washington Blvd
      { lat: 33.9800, lng: -118.4550 }  // Close loop
    ],
    anchors: ['Windward Ave Boardwalk', 'Washington Blvd Pier', 'Marina Harbor', 'Bundy Commercial']
  },

  SAWTELLE_JAPANTOWN_UCLA: {
    zone_id: 'zone_sawtelle_ucla',
    zone_name: 'Sawtelle Japantown / Westwood / UCLA Campus Fence',
    short_code: 'SWT-UCLA',
    postal_codes: ['90025', '90095'],
    center: { lat: 34.0410, lng: -118.4480 },
    radius_feet: 700,
    boundaries_description: 'Sawtelle & Olympic, Sepulveda Blvd to Sunset Blvd, UCLA Campus, Veterans Park, down Overland Ave to Olympic Blvd Pavilion',
    polygon: [
      { lat: 34.0330, lng: -118.4480 }, // Sawtelle Blvd & Olympic Blvd (Pavilion)
      { lat: 34.0350, lng: -118.4400 }, // Sepulveda Blvd at Olympic
      { lat: 34.0600, lng: -118.4500 }, // Veterans Memorial Park / Sepulveda
      { lat: 34.0720, lng: -118.4450 }, // UCLA Campus North / Sunset Blvd
      { lat: 34.0650, lng: -118.4200 }, // Westwood Blvd / Overland cutback
      { lat: 34.0360, lng: -118.4250 }, // Overland Ave down to Olympic Blvd
      { lat: 34.0330, lng: -118.4480 }  // Close loop
    ],
    anchors: ['Sawtelle Japantown corridor', 'Olympic Pavilion', 'UCLA Campus Center', 'West LA Veterans Grounds']
  },

  HOLLYWOOD_WEHO_LABREA: {
    zone_id: 'zone_weho_hollywood_labrea',
    zone_name: 'Hollywood / West Hollywood / La Brea Corridor Fence',
    short_code: 'WEHO-HLWD',
    postal_codes: ['90069', '90046', '90038', '90036'],
    center: { lat: 34.0880, lng: -118.3610 },
    radius_feet: 850,
    boundaries_description: 'West Hollywood / Sunset Blvd, La Brea Ave, Hollywood Forever Cemetery, down to Pico Blvd, west 3 blocks to Overland Ave',
    polygon: [
      { lat: 34.0980, lng: -118.3800 }, // Sunset Strip / West Hollywood
      { lat: 34.1010, lng: -118.3450 }, // Hollywood Blvd / La Brea Ave
      { lat: 34.0890, lng: -118.3200 }, // Hollywood Forever Cemetery
      { lat: 34.0550, lng: -118.3450 }, // La Brea Ave down to Pico Blvd
      { lat: 34.0500, lng: -118.4050 }, // Pico Blvd cutback to Overland Ave
      { lat: 34.0800, lng: -118.3900 }, // Overland back north to WeHo
      { lat: 34.0980, lng: -118.3800 }  // Close loop
    ],
    anchors: ['Sunset Strip', 'La Brea Design District', 'Hollywood Forever', 'Pico-Overland Hub']
  },

  PALMS_WESTADAMS_90034_90016: {
    zone_id: 'zone_palms_westadams',
    zone_name: 'Palms to West Adams Corridor Fence (90034 – 90016)',
    short_code: 'PLM-90034-90016',
    postal_codes: ['90034', '90016'],
    center: { lat: 34.0270, lng: -118.3880 },
    radius_feet: 600,
    boundaries_description: 'Palms / Culver City Commercial Hub, Motor Ave, National Blvd, Venice Blvd to La Cienega Blvd and West Adams (90016)',
    polygon: [
      { lat: 34.0200, lng: -118.4150 }, // Venice Blvd & Overland (Palms west)
      { lat: 34.0320, lng: -118.4100 }, // Motor Ave & National Blvd
      { lat: 34.0350, lng: -118.3750 }, // La Cienega Blvd / Expo Line Hub
      { lat: 34.0280, lng: -118.3550 }, // West Adams Blvd (90016 core)
      { lat: 34.0150, lng: -118.3700 }, // Washington Blvd / Culver City border
      { lat: 34.0180, lng: -118.4050 }, // Downtown Culver City / Palms junction
      { lat: 34.0200, lng: -118.4150 }  // Close loop
    ],
    anchors: ['The Doughroom Palms', 'Sweetfin Palms', 'Culver Steps', 'West Adams Arts Corridor']
  },

  KOREATOWN_COMMERCIAL_HUB: {
    zone_id: 'zone_koreatown',
    zone_name: 'Koreatown Commercial Hub Fence',
    short_code: 'KTOWN-LA',
    postal_codes: ['90005', '90010', '90020'],
    center: { lat: 34.0610, lng: -118.3030 },
    radius_feet: 750,
    boundaries_description: 'Wilshire Blvd, Western Ave, Olympic Blvd, Vermont Ave, Koreatown Plaza, Ralphs & Vons corridors',
    polygon: [
      { lat: 34.0680, lng: -118.3200 }, // Wilshire Blvd & Western Ave
      { lat: 34.0680, lng: -118.2910 }, // Wilshire Blvd & Vermont Ave
      { lat: 34.0530, lng: -118.2910 }, // Olympic Blvd & Vermont Ave
      { lat: 34.0530, lng: -118.3200 }, // Olympic Blvd & Western Ave (Koreatown Plaza)
      { lat: 34.0680, lng: -118.3200 }  // Close loop
    ],
    anchors: ['Koreatown Plaza (Western & 9th)', 'Wilshire / Western Station', 'Olympic Blvd BBQ Corridor', 'Ralphs & Vons 3rd/Wilshire']
  },

  CRENSHAW_PAVILION_90008: {
    zone_id: 'zone_crenshaw_90008',
    zone_name: 'The Pavilion / Crenshaw Commercial Hub (90008)',
    short_code: 'CRN-90008',
    postal_codes: ['90008'],
    center: { lat: 34.0093, lng: -118.3391 },
    radius_feet: 600,
    boundaries_description: 'Crenshaw Blvd & Martin Luther King Jr Blvd, Baldwin Hills Crenshaw Plaza',
    polygon: [
      { lat: 34.0180, lng: -118.3450 },
      { lat: 34.0180, lng: -118.3300 },
      { lat: 34.0020, lng: -118.3300 },
      { lat: 34.0020, lng: -118.3450 },
      { lat: 34.0180, lng: -118.3450 }
    ],
    anchors: ['Baldwin Hills Crenshaw Pavilion', 'Leimert Park Hub', 'Crenshaw / MLK Transit Station']
  }
};

/**
 * Standard Ray-Casting Algorithm to test if a GPS point falls inside a zone polygon.
 */
export function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Resolves which geofence zone a coordinate belongs to.
 */
export function resolveGeofenceZone(lat, lng) {
  const pt = { lat, lng };
  for (const key of Object.keys(GEOFENCE_ZONES)) {
    const zone = GEOFENCE_ZONES[key];
    if (isPointInPolygon(pt, zone.polygon)) {
      return zone;
    }
  }
  // Fallback to Palms default if within broad West LA area
  return GEOFENCE_ZONES.PALMS_WESTADAMS_90034_90016;
}
