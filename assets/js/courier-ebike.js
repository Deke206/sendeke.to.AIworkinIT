/**
 * ============================================================================
 * SenDeke-2: Synch 2 E-Bike Courier & Micro-Animation Engine
 * ============================================================================
 * Features:
 *   - Custom Synch 2 E-Bike with 52V Slab & WS2812B Addressable Neon Glow Frame
 *   - Real Web Audio API sound effects (2.8kHz PWM Motor Whine, Tire Screech Skid,
 *     124 BPM Boombox House Jam, Parabolic Dunk Pop & Cha-Ching Jingle)
 *   - Parabolic Gravity Arc Item Dunk into Rear SDK Cargo Box (Dynamic Emoji & Price)
 *   - Alternating Left-to-Right & Right-to-Left Courier Runs
 *   - Automatic Curbside Arrival Screech Pass on Page Load + On-Demand "🚴 Call Rider" Pill
 *   - 3 California Weather Modes: Sunny Palms, Thunder Sky, Santa Ana Wind
 * ============================================================================
 */

(function () {
  'use strict';

  // --- AUDIO SYNTHESIZER: E-BIKE MOTOR, TIRE SCREECH & BOOMBOX HOUSE JAM ---
  var audioCtx = null;
  var musicGainNode = null;
  var musicFilterNode = null;
  var houseBeatInterval = null;

  function initAudio() {
    try {
      if (!audioCtx) {
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioCtx = new AudioContext();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(function () {});
      }
    } catch (e) {}
  }

  // Unlock Web Audio on first user gesture anywhere on page
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evtName) {
    document.addEventListener(evtName, function unlockOnce() {
      initAudio();
      document.removeEventListener(evtName, unlockOnce, true);
    }, true);
  });

  // --- PROCEDURAL 124 BPM BOOMBOX HOUSE JAM ---
  function startHouseJam() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    stopHouseJam();

    try {
      musicFilterNode = audioCtx.createBiquadFilter();
      musicFilterNode.type = 'lowpass';
      musicFilterNode.frequency.setValueAtTime(4500, audioCtx.currentTime);

      musicGainNode = audioCtx.createGain();
      musicGainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      musicGainNode.gain.exponentialRampToValueAtTime(0.20, audioCtx.currentTime + 0.35);

      musicFilterNode.connect(musicGainNode);
      musicGainNode.connect(audioCtx.destination);

      var step = 0;
      var bassNotes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];

      houseBeatInterval = setInterval(function () {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        var now = audioCtx.currentTime;

        if (step % 2 === 0) {
          var kickOsc = audioCtx.createOscillator();
          var kickGain = audioCtx.createGain();
          kickOsc.type = 'sine';
          kickOsc.frequency.setValueAtTime(155, now);
          kickOsc.frequency.exponentialRampToValueAtTime(38, now + 0.08);
          kickGain.gain.setValueAtTime(0.35, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          kickOsc.connect(kickGain);
          kickGain.connect(musicFilterNode);
          kickOsc.start(now);
          kickOsc.stop(now + 0.15);
        }

        if (step % 2 === 1) {
          var hatSize = Math.floor(audioCtx.sampleRate * 0.06);
          var hatBuf = audioCtx.createBuffer(1, hatSize, audioCtx.sampleRate);
          var hatData = hatBuf.getChannelData(0);
          for (var i = 0; i < hatSize; i++) {
            hatData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (hatSize * 0.25));
          }
          var hatSource = audioCtx.createBufferSource();
          hatSource.buffer = hatBuf;
          var hatFilter = audioCtx.createBiquadFilter();
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7000, now);
          var hatGain = audioCtx.createGain();
          hatGain.gain.setValueAtTime(0.22, now);
          hatSource.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(musicFilterNode);
          hatSource.start(now);
        }

        var note = bassNotes[step % bassNotes.length];
        var bassOsc = audioCtx.createOscillator();
        var bassGain = audioCtx.createGain();
        bassOsc.type = 'triangle';
        bassOsc.frequency.setValueAtTime(note, now);
        bassGain.gain.setValueAtTime(0.18, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        bassOsc.connect(bassGain);
        bassGain.connect(musicFilterNode);
        bassOsc.start(now);
        bassOsc.stop(now + 0.18);

        step++;
      }, 121);
    } catch (e) {}
  }

  function duckHouseJam() {
    if (!audioCtx || !musicGainNode || !musicFilterNode) return;
    var now = audioCtx.currentTime;
    try {
      musicGainNode.gain.cancelScheduledValues(now);
      musicGainNode.gain.linearRampToValueAtTime(0.04, now + 0.25);
      musicFilterNode.frequency.cancelScheduledValues(now);
      musicFilterNode.frequency.exponentialRampToValueAtTime(450, now + 0.3);
    } catch (e) {}
  }

  function pumpHouseJam() {
    if (!audioCtx || !musicGainNode || !musicFilterNode) return;
    var now = audioCtx.currentTime;
    try {
      musicGainNode.gain.cancelScheduledValues(now);
      musicGainNode.gain.linearRampToValueAtTime(0.25, now + 0.2);
      musicFilterNode.frequency.cancelScheduledValues(now);
      musicFilterNode.frequency.exponentialRampToValueAtTime(6500, now + 0.3);
    } catch (e) {}
  }

  function stopHouseJam() {
    if (houseBeatInterval) {
      clearInterval(houseBeatInterval);
      houseBeatInterval = null;
    }
    if (audioCtx && musicGainNode) {
      try {
        var now = audioCtx.currentTime;
        musicGainNode.gain.cancelScheduledValues(now);
        musicGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      } catch (e) {}
    }
  }

  // --- AUTHENTIC SYNCH 2 ELECTRIC MOTOR WHINE (wiiieee-uuu!) ---
  function playElectricWhine(isAccelerating) {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      var now = audioCtx.currentTime;

      var motorOsc = audioCtx.createOscillator();
      var motorGain = audioCtx.createGain();
      motorOsc.type = 'sawtooth';

      var inverterOsc = audioCtx.createOscillator();
      var inverterGain = audioCtx.createGain();
      inverterOsc.type = 'sine';

      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(6.0, now);

      if (isAccelerating) {
        motorOsc.frequency.setValueAtTime(85, now);
        motorOsc.frequency.exponentialRampToValueAtTime(740, now + 0.95);
        filter.frequency.setValueAtTime(320, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 0.95);
        inverterOsc.frequency.setValueAtTime(2600, now);
        inverterOsc.frequency.linearRampToValueAtTime(3400, now + 0.95);
        motorGain.gain.setValueAtTime(0.12, now);
        motorGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
        inverterGain.gain.setValueAtTime(0.04, now);
        inverterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

        motorOsc.connect(filter);
        filter.connect(motorGain);
        motorGain.connect(audioCtx.destination);
        inverterOsc.connect(inverterGain);
        inverterGain.connect(audioCtx.destination);

        motorOsc.start(now);
        inverterOsc.start(now);
        motorOsc.stop(now + 1.2);
        inverterOsc.stop(now + 1.2);
      } else {
        motorOsc.frequency.setValueAtTime(540, now);
        motorOsc.frequency.exponentialRampToValueAtTime(95, now + 1.35);
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(260, now + 1.35);
        inverterOsc.frequency.setValueAtTime(3200, now);
        inverterOsc.frequency.linearRampToValueAtTime(2400, now + 1.35);
        motorGain.gain.setValueAtTime(0.10, now);
        motorGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        inverterGain.gain.setValueAtTime(0.035, now);
        inverterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

        motorOsc.connect(filter);
        filter.connect(motorGain);
        motorGain.connect(audioCtx.destination);
        inverterOsc.connect(inverterGain);
        inverterGain.connect(audioCtx.destination);

        motorOsc.start(now);
        inverterOsc.start(now);
        motorOsc.stop(now + 1.5);
        inverterOsc.stop(now + 1.5);
      }
    } catch (e) {}
  }

  // --- REAL ASPHALT RUBBER TIRE SCREECH & SKID (SKRRRRRT!) ---
  function playSkidSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      var now = audioCtx.currentTime;
      var duration = 0.36;
      var bufferSize = Math.floor(audioCtx.sampleRate * duration);
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      var noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      var filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.frequency.exponentialRampToValueAtTime(920, now + duration);
      filter.Q.setValueAtTime(5.5, now);

      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.20, now);
      gain.gain.exponentialRampToValueAtTime(0.008, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start(now);

      // Harmonic tire squeal chirp (authentic fat-tire street screech)
      var squealOsc = audioCtx.createOscillator();
      var squealGain = audioCtx.createGain();
      squealOsc.type = 'sawtooth';
      squealOsc.frequency.setValueAtTime(1820, now);
      squealOsc.frequency.exponentialRampToValueAtTime(1180, now + 0.28);
      var squealFilter = audioCtx.createBiquadFilter();
      squealFilter.type = 'bandpass';
      squealFilter.frequency.setValueAtTime(1600, now);
      squealFilter.Q.setValueAtTime(8.0, now);
      squealGain.gain.setValueAtTime(0.085, now);
      squealGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);

      squealOsc.connect(squealFilter);
      squealFilter.connect(squealGain);
      squealGain.connect(audioCtx.destination);
      squealOsc.start(now);
      squealOsc.stop(now + 0.31);
    } catch (e) {}
  }

  // Dunk Pop + Cash Jingle
  function playDunkSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      var now = audioCtx.currentTime;
      var osc1 = audioCtx.createOscillator();
      var gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain1.gain.setValueAtTime(0.22, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      var freqs = [1046.5, 1318.5, 1567.98];
      freqs.forEach(function (f, idx) {
        var osc = audioCtx.createOscillator();
        var g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + 0.08 + (idx * 0.04));
        g.gain.setValueAtTime(0.09, now + 0.08 + (idx * 0.04));
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(now + 0.08 + (idx * 0.04));
        osc.stop(now + 0.5);
      });
    } catch (e) {}
  }

  function playThunderSound() {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    try {
      var bufferSize = Math.floor(audioCtx.sampleRate * 1.2);
      var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      var data = buffer.getChannelData(0);
      var lastOut = 0.0;
      for (var i = 0; i < bufferSize; i++) {
        var white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      }
      var noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      var filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, audioCtx.currentTime);
      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
    } catch (e) {}
  }

  // --- COURIER RIDER SVG BUILDER ---
  function getCourierRiderSvg() {
    return [
      '<svg viewBox="0 0 180 140" width="180" height="140" xmlns="http://www.w3.org/2000/svg">',
      '  <defs>',
      '    <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
      '      <stop offset="0%" stop-color="#1E293B"/>',
      '      <stop offset="100%" stop-color="#0F172A"/>',
      '    </linearGradient>',
      '    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
      '      <stop offset="0%" stop-color="#00F0FF"/>',
      '      <stop offset="100%" stop-color="#0284C7"/>',
      '    </linearGradient>',
      '  </defs>',
      '  <!-- Ground Shadow -->',
      '  <ellipse cx="90" cy="132" rx="75" ry="6" fill="rgba(0,0,0,0.35)"/>',
      '  <!-- REAR WHEEL -->',
      '  <g class="ebike-wheel" style="transform-origin: 32px 115px;">',
      '    <circle cx="32" cy="115" r="22" stroke="#334155" stroke-width="4.5" fill="none"/>',
      '    <circle cx="32" cy="115" r="16" stroke="#00F0FF" stroke-width="1.5" fill="none" opacity="0.6"/>',
      '    <line x1="32" y1="93" x2="32" y2="137" stroke="#94A3B8" stroke-width="1.2"/>',
      '    <line x1="10" y1="115" x2="54" y2="115" stroke="#94A3B8" stroke-width="1.2"/>',
      '    <circle cx="32" cy="115" r="4.5" fill="#0F172A"/>',
      '  </g>',
      '  <!-- FRONT WHEEL -->',
      '  <g class="ebike-wheel" style="transform-origin: 145px 115px;">',
      '    <circle cx="145" cy="115" r="22" stroke="#334155" stroke-width="4.5" fill="none"/>',
      '    <circle cx="145" cy="115" r="16" stroke="#00F0FF" stroke-width="1.5" fill="none" opacity="0.6"/>',
      '    <line x1="145" y1="93" x2="145" y2="137" stroke="#94A3B8" stroke-width="1.2"/>',
      '    <line x1="123" y1="115" x2="167" y2="115" stroke="#94A3B8" stroke-width="1.2"/>',
      '    <circle cx="145" cy="115" r="4.5" fill="#0F172A"/>',
      '  </g>',
      '  <!-- SYNCH 2 E-BIKE FRAME -->',
      '  <path d="M32 115 L78 115 L125 82 L145 115 M78 115 L95 72 L138 72 M95 72 L32 115" stroke="url(#frameGrad)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
      '  <!-- BATTERY PACK SLAB (DOWN TUBE) -->',
      '  <rect x="74" y="85" width="28" height="15" rx="3" fill="#0284C7" stroke="#0369A1" stroke-width="1.5"/>',
      '  <text x="77" y="96" font-size="7" font-weight="bold" fill="#FFF" font-family="monospace">52V</text>',
      '  <!-- WS2812B ADDRESSABLE LED CHASER STRIP -->',
      '  <path class="ws2812b-led-strip" d="M36 114 L76 114 L123 83 L136 74" fill="none"/>',
      '  <!-- REAR CARGO DELIVERY BOX -->',
      '  <rect x="12" y="60" width="38" height="34" rx="4" fill="url(#boxGrad)" stroke="#0369A1" stroke-width="1.5"/>',
      '  <text x="16" y="80" font-size="8" font-weight="900" fill="#FFF" font-family="sans-serif">SDK</text>',
      '  <text x="34" y="80" font-size="6" font-weight="bold" fill="#FFE600" font-family="sans-serif">★</text>',
      '  <!-- Cargo Box Open Hatch Lip -->',
      '  <path d="M10 60 L52 60 L46 54 L16 54 Z" fill="#0284C7" stroke="#00F0FF" stroke-width="1"/>',
      '  <!-- BOOMBOX / JAM BOX ON HANDLEBAR -->',
      '  <rect x="125" y="62" width="16" height="11" rx="2" fill="#E11D48" stroke="#9F1239" stroke-width="1"/>',
      '  <circle cx="129" cy="67" r="2.5" fill="#1E293B"/>',
      '  <circle cx="137" cy="67" r="2.5" fill="#1E293B"/>',
      '  <!-- COURIER RIDER -->',
      '  <ellipse cx="68" cy="116" rx="9" ry="4.5" fill="#FF0055" stroke="#FFF" stroke-width="1"/>',
      '  <path d="M82 82 L70 102 L68 114" stroke="#0F172A" stroke-width="6" stroke-linecap="round" fill="none"/>',
      '  <path d="M86 52 L112 68 L82 82 Z" fill="#0284C7"/>',
      '  <path d="M88 54 L108 68" stroke="#38BDF8" stroke-width="3" stroke-linecap="round"/>',
      '  <path d="M96 56 L124 66 L134 72" stroke="#0284C7" stroke-width="5" stroke-linecap="round" fill="none"/>',
      '  <circle cx="134" cy="72" r="3.5" fill="#FBBF24"/>',
      '  <circle cx="106" cy="42" r="9" fill="#FBBF24"/>',
      '  <path d="M96 38 Q106 31 118 37 L94 40 Z" fill="#1E293B"/>',
      '  <rect x="91" y="38" width="8" height="3" rx="1.5" fill="#FF0055"/>',
      '  <rect x="108" y="40" width="8" height="4" rx="1.5" fill="#0F172A"/>',
      '</svg>'
    ].join('\n');
  }

  // --- ATMOSPHERIC CALIFORNIA WEATHER ENGINE ---
  var currentMode = 'sunny';
  var weatherOverlay = null;

  function ensureStageAndWeather() {
    weatherOverlay = document.getElementById('weather-overlay');
    if (!weatherOverlay) {
      weatherOverlay = document.createElement('div');
      weatherOverlay.id = 'weather-overlay';
      document.body.prepend(weatherOverlay);
    }
    var stage = document.getElementById('courier-stage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'courier-stage';
      document.body.appendChild(stage);
    }
    return stage;
  }

  function initWeatherEngine() {
    ensureStageAndWeather();
    setWeatherMode('sunny');
  }

  function setWeatherMode(mode) {
    if (['sunny', 'thunderous', 'blustery'].indexOf(mode) === -1) mode = 'sunny';
    currentMode = mode;
    try { localStorage.setItem('sendeke_weather_mode', mode); } catch (e) {}
    document.body.classList.remove('mode-sunny', 'mode-thunderous', 'mode-blustery');
    document.body.classList.add('mode-' + mode);

    document.querySelectorAll('.wind-gust-leaf').forEach(function (el) { el.remove(); });

    document.querySelectorAll('.weather-mode-label-text').forEach(function (label) {
      if (mode === 'sunny') label.textContent = '☀️ Sunny Palms';
      else if (mode === 'thunderous') label.textContent = '⚡ Thunder Sky';
      else if (mode === 'blustery') label.textContent = '💨 Santa Ana Wind';
    });

    if (mode === 'blustery' && weatherOverlay) {
      for (var i = 0; i < 6; i++) {
        var leaf = document.createElement('div');
        leaf.className = 'wind-gust-leaf';
        leaf.style.setProperty('--leaf-y', (20 + (i * 12)) + 'vh');
        leaf.style.animationDelay = (i * 0.6) + 's';
        weatherOverlay.appendChild(leaf);
      }
    }
  }

  function triggerLightning() {
    if (currentMode !== 'thunderous') return;
    document.body.classList.add('flash-lightning');
    playThunderSound();
    setTimeout(function () {
      document.body.classList.remove('flash-lightning');
    }, 120);
  }

  // --- SMART ITEM EMOJI, NAME & PRICE RESOLVER ---
  function resolvePageEmoji() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('tacos') !== -1) return '🌮';
    if (path.indexOf('sandwiches') !== -1) return '🥪';
    if (path.indexOf('doughroom') !== -1) return '🍕';
    if (path.indexOf('simpang') !== -1) return '🍜';
    if (path.indexOf('mizlala') !== -1) return '🥙';
    if (path.indexOf('menu') !== -1) return '🍱';
    return '🍲';
  }

  function extractItemMeta(btn) {
    var fallbackEmoji = resolvePageEmoji();
    if (!btn) {
      return { name: 'Courier Run', price: '15.00', emoji: fallbackEmoji };
    }
    var card = btn.closest('.card, .menu-item-card, .list-group-item');
    var name = btn.getAttribute('data-name') || '';
    var price = btn.getAttribute('data-price') || '';
    var emoji = btn.getAttribute('data-emoji') || '';

    if (card) {
      if (!name) {
        var h3 = card.querySelector('h3, h4, h5, [itemprop="name"]');
        if (h3) name = h3.textContent.trim();
      }
      if (!price) {
        var metaPrice = card.querySelector('meta[itemprop="price"]');
        if (metaPrice && metaPrice.getAttribute('content')) {
          price = metaPrice.getAttribute('content');
        } else {
          var badgePrice = card.querySelector('.price-num-badge, .text-success-emphasis');
          if (badgePrice) {
            var m = badgePrice.textContent.match(/(\d+(?:\.\d+)?)/);
            if (m) price = m[1];
          }
        }
      }
      if (!emoji) {
        var emojiEl = card.querySelector('.fs-4');
        if (emojiEl && emojiEl.textContent.trim()) {
          emoji = emojiEl.textContent.trim();
        }
      }
    }

    var cleanPrice = parseFloat(price);
    return {
      name: name || 'Corridor Item',
      price: !isNaN(cleanPrice) && cleanPrice > 0 ? cleanPrice.toFixed(2) : '15.00',
      emoji: emoji || fallbackEmoji
    };
  }

  // --- THE RUNNING COURIER DUNKING & PATROL SCREECH ENGINE ---
  var courierDirection = 'ltr';

  function runCourierDunk(itemElement, itemData) {
    initAudio();
    var stage = ensureStageAndWeather();
    var meta = itemData && itemData.price ? {
      name: itemData.name || 'Corridor Item',
      price: parseFloat(itemData.price) > 0 ? parseFloat(itemData.price).toFixed(2) : '15.00',
      emoji: itemData.emoji || resolvePageEmoji(),
      patrolOnly: Boolean(itemData.patrolOnly),
      calloutText: itemData.calloutText || ''
    } : extractItemMeta(itemElement);

    var isLtr = (courierDirection === 'ltr');
    courierDirection = isLtr ? 'rtl' : 'ltr';

    var rider = document.createElement('div');
    rider.className = 'courier-rider' + (isLtr ? '' : ' rtl');
    rider.innerHTML = getCourierRiderSvg();

    var headlight = document.createElement('div');
    headlight.className = 'ebike-headlight';
    rider.appendChild(headlight);

    var startX = isLtr ? -220 : window.innerWidth + 50;
    var mobileCenterX = Math.max(10, Math.round((window.innerWidth - 180) / 2));
    var targetStopX = (window.innerWidth <= 768)
      ? mobileCenterX
      : (isLtr ? Math.round(window.innerWidth * 0.42) : Math.round(window.innerWidth * 0.52));
    var exitX = isLtr ? (window.innerWidth + 240) : -240;

    rider.style.left = startX + 'px';
    stage.appendChild(rider);

    startHouseJam();
    playElectricWhine(false);

    var riderStartTime = performance.now();
    var durationApproach = meta.patrolOnly ? 1350 : 1500;

    function departFromCurb() {
      setTimeout(function () {
        rider.classList.remove('skid');
        playElectricWhine(true);
        pumpHouseJam();

        var departStartTime = performance.now();
        var durationDepart = 1150;
        function stepDepart(dNow) {
          var dProgress = Math.min((dNow - departStartTime) / durationDepart, 1);
          var dEase = Math.pow(dProgress, 2.2);
          var dX = targetStopX + (exitX - targetStopX) * dEase;
          rider.style.left = dX + 'px';

          if (Math.random() < 0.35) {
            spawnDustPuff(stage, dX, isLtr);
          }
          if (Math.random() < 0.25) {
            spawnMusicNote(rider, isLtr);
          }

          if (dProgress < 1) {
            requestAnimationFrame(stepDepart);
          } else {
            rider.remove();
            stopHouseJam();
          }
        }
        requestAnimationFrame(stepDepart);
      }, meta.patrolOnly ? 480 : 350);
    }

    function stepApproach(now) {
      var progress = Math.min((now - riderStartTime) / durationApproach, 1);
      var ease = 1 - Math.pow(1 - progress, 4);
      var currentX = startX + (targetStopX - startX) * ease;
      rider.style.left = currentX + 'px';

      if (Math.random() < 0.28) {
        spawnDustPuff(stage, currentX, isLtr);
      }
      if (Math.random() < 0.20) {
        spawnMusicNote(rider, isLtr);
      }

      if (progress < 1) {
        requestAnimationFrame(stepApproach);
      } else {
        // Hard brake screech & skid at curb!
        rider.classList.add('skid');
        playSkidSound();
        duckHouseJam();
        spawnSkidBatch(stage, currentX, isLtr);

        if (currentMode === 'thunderous') {
          triggerLightning();
        }

        if (meta.patrolOnly) {
          var boxX = isLtr ? (targetStopX + 45) : (targetStopX + 115);
          var boxY = window.innerHeight - 95;
          spawnDunkSplash(boxX, boxY);
          spawnCashJingle(boxX, boxY, meta.calloutText || '⚡ COURIER #04 • SYNCH-2 READY');
          departFromCurb();
        } else {
          launchFoodDunk(itemElement, rider, targetStopX, isLtr, meta, departFromCurb);
        }
      }
    }
    requestAnimationFrame(stepApproach);
  }

  function runCourierPatrol(calloutLabel) {
    runCourierDunk(null, {
      name: 'Courier #04 Patrol',
      price: '15.00',
      patrolOnly: true,
      calloutText: calloutLabel || '⚡ COURIER #04 • 90034 LIVE'
    });
  }

  // --- PARABOLIC FOOD DUNK TRAJECTORY ---
  function launchFoodDunk(sourceBtn, rider, riderX, isLtr, meta, onDunkComplete) {
    var rect = sourceBtn
      ? sourceBtn.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: Math.max(180, window.innerHeight * 0.4), width: 40, height: 40 };
    var startX = rect.left + rect.width / 2;
    var startY = rect.top + rect.height / 2;

    var targetBoxX = isLtr ? (riderX + 28) : (riderX + 152);
    var targetBoxY = window.innerHeight - 75;
    var peakY = Math.min(startY, targetBoxY) - 150;

    var food = document.createElement('div');
    food.className = 'flying-food-item';
    food.textContent = (meta && meta.emoji) ? meta.emoji : '🍲';
    document.body.appendChild(food);

    var dunkStartTime = performance.now();
    var dunkDuration = 760;

    function stepDunk(now) {
      var p = Math.min((now - dunkStartTime) / dunkDuration, 1);
      var curX = startX + (targetBoxX - startX) * p;
      var curY = Math.pow(1 - p, 2) * startY +
                 2 * (1 - p) * p * peakY +
                 Math.pow(p, 2) * targetBoxY;

      var rot = p * 360;
      var scale = (p > 0.85) ? (1 - (p - 0.85) * 4) : 1;

      food.style.left = (curX - 25) + 'px';
      food.style.top = (curY - 25) + 'px';
      food.style.transform = 'rotate(' + rot + 'deg) scale(' + Math.max(scale, 0.2) + ')';

      if (p < 1) {
        requestAnimationFrame(stepDunk);
      } else {
        food.remove();
        playDunkSound();
        spawnDunkSplash(targetBoxX, targetBoxY);
        var label = '+1 ' + (meta && meta.emoji ? meta.emoji : '💸') + ' $' + (meta && meta.price ? meta.price : '15.00');
        spawnCashJingle(targetBoxX, targetBoxY, label);
        bumpNavCartCounter();
        if (onDunkComplete) onDunkComplete();
      }
    }
    requestAnimationFrame(stepDunk);
  }

  // --- PARTICLES & FX ---
  function spawnDustPuff(stage, x, isLtr) {
    if (!stage) return;
    var dust = document.createElement('div');
    dust.className = 'skid-dust';
    dust.style.left = (isLtr ? (x + 15) : (x + 145)) + 'px';
    dust.style.setProperty('--dust-x', (isLtr ? '-28px' : '28px'));
    dust.style.setProperty('--dust-y', (-8 - Math.random() * 16) + 'px');
    stage.appendChild(dust);
    setTimeout(function () { dust.remove(); }, 650);
  }

  function spawnSkidBatch(stage, x, isLtr) {
    if (!stage) return;
    var streak = document.createElement('div');
    streak.className = 'skid-streak';
    streak.style.left = (isLtr ? Math.max(0, x - 18) : (x + 125)) + 'px';
    if (!isLtr) streak.style.transform = 'scaleX(-1)';
    stage.appendChild(streak);
    setTimeout(function () { streak.remove(); }, 850);

    for (var i = 0; i < 6; i++) {
      setTimeout(function () {
        spawnDustPuff(stage, x, isLtr);
      }, i * 32);
    }
  }

  function spawnMusicNote(rider, isLtr) {
    var note = document.createElement('div');
    note.className = 'music-note';
    var notes = ['♪', '♫', '♬', '♩'];
    note.textContent = notes[Math.floor(Math.random() * notes.length)];
    note.style.left = (isLtr ? 130 : 40) + 'px';
    note.style.top = '55px';
    note.style.setProperty('--note-x', (isLtr ? '25px' : '-25px'));
    rider.appendChild(note);
    setTimeout(function () { note.remove(); }, 1400);
  }

  function spawnDunkSplash(x, y) {
    var splash = document.createElement('div');
    splash.className = 'dunk-splash';
    splash.style.left = (x - 32) + 'px';
    splash.style.top = (y - 32) + 'px';
    document.body.appendChild(splash);
    setTimeout(function () { splash.remove(); }, 550);
  }

  function spawnCashJingle(x, y, textLabel) {
    var cash = document.createElement('div');
    cash.className = 'cash-jingle';
    cash.textContent = textLabel || '+1 💸 $15.00';
    cash.style.left = Math.max(8, Math.min(window.innerWidth - 190, x - 45)) + 'px';
    cash.style.top = (y - 24) + 'px';
    document.body.appendChild(cash);
    setTimeout(function () { cash.remove(); }, 1050);
  }

  function bumpNavCartCounter() {
    var badges = document.querySelectorAll('#nav-cart-counter, #nav-cart-counter-badge');
    badges.forEach(function (b) {
      b.style.transition = 'transform 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
      b.style.transform = 'scale(1.35)';
      setTimeout(function () {
        b.style.transform = 'scale(1)';
      }, 180);
    });
  }

  // --- UNIVERSAL WEATHER & RIDER CONTROLLER PILLS (NAVBAR + HERO BARS) ---
  function insertRiderAndWeatherPills() {
    if (document.querySelector('.courier-call-pill')) return;

    var targetBar =
      document.querySelector('.navbar .navbar-collapse div.d-flex') ||
      document.querySelector('.navbar .container-xl > div.d-flex') ||
      document.querySelector('.navbar .container-fluid > div.d-flex') ||
      document.querySelector('#menu-hero-object div.d-flex.flex-wrap.align-items-center') ||
      document.querySelector('#store-hero div.d-flex.flex-wrap.align-items-center') ||
      document.querySelector('#tacos-hero-object div.d-flex.flex-wrap.align-items-center') ||
      document.querySelector('.tacos-hero-banner div.d-flex.flex-wrap.align-items-center') ||
      document.querySelector('.sweetfin-hero-banner div.d-flex.flex-wrap.align-items-center') ||
      document.querySelector('.store-hero-banner div.d-flex.flex-wrap.align-items-center');

    if (!targetBar) {
      var navCollapse = document.querySelector('.navbar .navbar-collapse');
      if (navCollapse) {
        targetBar = document.createElement('div');
        targetBar.className = 'd-flex flex-wrap align-items-center gap-2 ms-lg-3 mt-2 mt-lg-0';
        navCollapse.appendChild(targetBar);
      }
    }

    if (!targetBar) return;

    // 1. Weather Mode Pill
    var weatherPill = document.createElement('button');
    weatherPill.type = 'button';
    weatherPill.className = 'weather-mode-pill font-mono';
    weatherPill.title = 'Switch California Atmosphere (Sunny Palms / Thunder Sky / Santa Ana Wind)';
    weatherPill.innerHTML = '<span id="weather-mode-label" class="weather-mode-label-text">☀️ Sunny Palms</span>';

    var modes = ['sunny', 'thunderous', 'blustery'];
    weatherPill.addEventListener('click', function () {
      initAudio();
      var idx = (modes.indexOf(currentMode) + 1) % modes.length;
      setWeatherMode(modes[idx]);
      if (modes[idx] === 'thunderous') {
        triggerLightning();
      }
    });

    // 2. Call Screeching E-Bike Rider Pill
    var callPill = document.createElement('button');
    callPill.type = 'button';
    callPill.className = 'courier-call-pill font-mono';
    callPill.id = 'btn-summon-synch2-rider';
    callPill.title = 'Summon Courier #04 Synch-2 E-Bike Screech Run';
    callPill.innerHTML = '<span>🚴 Synch-2 Rider</span>';
    callPill.addEventListener('click', function () {
      initAudio();
      runCourierPatrol('⚡ COURIER #04 • SCREECH ROLL-IN!');
    });

    if (targetBar.closest('.navbar')) {
      targetBar.prepend(callPill);
      targetBar.prepend(weatherPill);
    } else {
      targetBar.appendChild(weatherPill);
      targetBar.appendChild(callPill);
    }

    // Sync label text with current weather mode
    setWeatherMode(currentMode);
  }

  // --- INTERCEPT ADD-TO-CART & DISPATCH CLICKS ---
  function hookAddToCartEvents() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.add-to-cart-btn');
      if (btn) {
        var meta = extractItemMeta(btn);
        runCourierDunk(btn, meta);
        return;
      }
      var dispatchBtn = e.target.closest('#submit-ticket-btn');
      if (dispatchBtn) {
        runCourierPatrol('🚀 COURIER #04 DISPATCHED!');
      }
    }, true);
  }

  function bootCourierEngine() {
    initWeatherEngine();
    hookAddToCartEvents();

    // Perform automatic curbside entrance screech pass shortly after page load
    setTimeout(function () {
      runCourierPatrol('⚡ COURIER #04 • ZONE 90034 LIVE');
    }, 650);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootCourierEngine);
  } else {
    bootCourierEngine();
  }

  // Export for manual console or cross-module triggers
  window.SenDekeCourier = {
    dunk: runCourierDunk,
    patrol: runCourierPatrol,
    triggerDeliveryDunk: runCourierDunk,
    runCourierPatrol: runCourierPatrol,
    playSkidSound: playSkidSound,
    setWeather: setWeatherMode,
    triggerLightning: triggerLightning
  };

})();
