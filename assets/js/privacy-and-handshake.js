/**
 * SenDeke 2 - Privacy Delimiters & Dual-Prefix Mutual Handshake Engine
 * Direct Implementation of Deke's Spoken Audio Directives
 * Universal Browser (file:/// + HTTPS) & CommonJS Module
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.SenDekeHandshake = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {

  function delimitId(rawId, keepLength) {
    const keep = typeof keepLength === 'number' ? keepLength : 5;
    if (!rawId) return '***-00000';
    const clean = String(rawId).replace(/[^a-zA-Z0-9]/g, '');
    const suffix = clean.slice(-keep);
    return '***-' + suffix;
  }

  function extractPhonePrefix(phone) {
    if (!phone) return '000';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return digits.substring(4, 7);
    }
    if (digits.length >= 10) {
      return digits.substring(3, 6);
    }
    return digits.padEnd(3, '0').substring(0, 3);
  }

  function generateDualPrefixPin(customerPhone, driverPhone) {
    const custPrefix = extractPhonePrefix(customerPhone);
    const drvPrefix = extractPhonePrefix(driverPhone || '(323) 374-5787');
    return custPrefix + drvPrefix;
  }

  function verifyDualPrefixPin(enteredPin, customerPhone, driverPhone) {
    const expectedPin = generateDualPrefixPin(customerPhone, driverPhone);
    return String(enteredPin || '').replace(/\D/g, '') === expectedPin;
  }

  function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function verifyProximityHandshake(opts) {
    const options = opts || {};
    const driverCoords = options.driverCoords;
    const customerCoords = options.customerCoords;
    const enteredPin = options.enteredPin || null;
    const customerPhone = options.customerPhone;
    const driverPhone = options.driverPhone || '(323) 374-5787';
    const nfcTouch = Boolean(options.nfcTouch);
    const maxProximityMeters = options.maxProximityMeters || 50;

    if (nfcTouch) {
      return {
        success: true,
        method: 'nfc_fist_bump',
        message: 'NFC co-presence confirmed. Escrow unlocked immediately.'
      };
    }

    if (!driverCoords || !customerCoords) {
      return { success: false, reason: 'missing_coordinates', message: 'GPS coordinates unavailable.' };
    }

    const distanceMeters = getDistanceMeters(
      driverCoords.lat, driverCoords.lng,
      customerCoords.lat, customerCoords.lng
    );

    if (distanceMeters > maxProximityMeters) {
      return {
        success: false,
        reason: 'out_of_proximity',
        distanceMeters: Math.round(distanceMeters),
        message: 'Courier is ' + Math.round(distanceMeters) + 'm away. Must be within ' + maxProximityMeters + 'm of customer doorstep.'
      };
    }

    const pinMatches = verifyDualPrefixPin(enteredPin, customerPhone, driverPhone);
    if (!pinMatches) {
      return {
        success: false,
        reason: 'invalid_pin',
        message: 'Dual-prefix PIN code mismatch. Confirm customer and driver prefix exchange.'
      };
    }

    return {
      success: true,
      method: 'proximity_pin',
      distanceMeters: Math.round(distanceMeters),
      message: 'Proximity verified and dual-prefix PIN matched. Escrow released.'
    };
  }

  const FLEET_CONFIG = {
    INITIAL_CAPACITY_LIMIT: 5000,
    SLOT_PREFIX: 'SDK-DRV',
    generateSlotId: function (index) {
      const padded = String(index).padStart(5, '0');
      return this.SLOT_PREFIX + '-' + padded;
    }
  };

  return {
    delimitId: delimitId,
    extractPhonePrefix: extractPhonePrefix,
    generateDualPrefixPin: generateDualPrefixPin,
    verifyDualPrefixPin: verifyDualPrefixPin,
    getDistanceMeters: getDistanceMeters,
    verifyProximityHandshake: verifyProximityHandshake,
    FLEET_CONFIG: FLEET_CONFIG
  };
});
