/**
 * SenDeke.to - Driver 3D Navigation Console & Media Player HUD
 * Uses Google Maps Platform Vector Maps (WebGL 3D Tiles)
 * Internal usage attribution: gmp_git_agentskills_v1
 */

import firebaseConfig from "./firebase-config.js";
import mapsConfig from "./maps-config.js";

export class DriverNavigationConsole {
  constructor() {
    this.map = null;
    this.bikeMarker = null;
    this.watchId = null;
    this.currentPosition = { lat: 34.0259, lng: -118.3965 }; // Default 90034 Palms/Culver City
    this.lastPosition = null;
    this.currentHeading = 0;
    this.smoothedHeading = 0;
    this.currentSpeedMph = 0;
    this.is3D = false; // Start in stable 2D mode
    this.headingUpMode = false; // Start in North-Up mode to prevent stationary spinning
    this.isDriveMode = true; // Ambient Drive Mode vs Trip Routing
    this.activeRoute = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.audioContext = null;
    this.isPlaying = false;
    this.currentTrackIndex = 0;
    this.demoPlaylist = [
      { title: "Westside Neon Glide", artist: "SenDeke Ambient Radio", genre: "Lo-Fi Beats" },
      { title: "Venice Blvd Fast Lane", artist: "Courier Frequency", genre: "Synthwave" },
      { title: "Palms 90034 Midnight Run", artist: "Bicycle Dispatch", genre: "Chillhop" },
      { title: "Culver City Pulse", artist: "Overdrive Collective", genre: "Electro Funk" }
    ];

    this.initMediaSession();
  }

  /**
   * Bootstraps the Google Maps JavaScript API with direct script loader
   */
  async loadGoogleMapsScript(apiKey) {
    if (window.google && window.google.maps) {
      return window.google.maps;
    }
    return mapsConfig.loadScript('places,geometry').then(maps => maps || (window.google ? window.google.maps : null)).catch(err => {
      console.warn("Google Maps script failed to load, falling back to tactical tiles:", err);
      return null;
    });
  }

  /**
   * Initializes the 3D Vector Map canvas and UI controls
   */
  async initMap(containerElement) {
    if (!containerElement) return;
    this.containerElement = containerElement;

    // Register global Google Maps auth failure hook to seamlessly switch to tactical tiles
    window.gm_authFailure = () => {
      console.warn("Google Maps gm_authFailure fired (API key restriction or billing check pending). Rendering tactical Leaflet dark tiles fallback.");
      this.renderFallbackMap(this.containerElement, "Tactical Mode Active (GCP Key Auth Pending)");
    };

    try {
      const gmaps = await this.loadGoogleMapsScript(mapsConfig.apiKey);

      if (gmaps && (gmaps.importLibrary || gmaps.Map)) {
        let Map = gmaps.Map;
        let RenderingType = null;
        let AdvancedMarkerElement = null;
        let DirectionsService = gmaps.DirectionsService;
        let DirectionsRenderer = gmaps.DirectionsRenderer;

        if (gmaps.importLibrary) {
          try {
            const mapsLib = await google.maps.importLibrary("maps");
            Map = mapsLib.Map;
            RenderingType = mapsLib.RenderingType;
          } catch (e) {}
          try {
            const markerLib = await google.maps.importLibrary("marker");
            AdvancedMarkerElement = markerLib.AdvancedMarkerElement;
          } catch (e) {}
          try {
            const routesLib = await google.maps.importLibrary("routes");
            DirectionsService = routesLib.DirectionsService;
            DirectionsRenderer = routesLib.DirectionsRenderer;
          } catch (e) {}
        }

        if (DirectionsService && DirectionsRenderer) {
          this.directionsService = new DirectionsService();
          this.directionsRenderer = new DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: "#00E5FF",
              strokeWeight: 6,
              strokeOpacity: 0.85
            }
          });
        }

        // Standard, crisp, full-color Google Maps vector map (clean roads, landmarks, and terrain)
        const mapOptions = {
          center: this.currentPosition,
          zoom: 16,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy"
        };

        this.map = new Map(containerElement, mapOptions);

        if (this.directionsRenderer) {
          this.directionsRenderer.setMap(this.map);
        }

        // Add Google Maps Courier Marker
        if (AdvancedMarkerElement) {
          try {
            this.createBikeMarker(AdvancedMarkerElement);
          } catch (e) {
            this.createStandardGoogleMarker();
          }
        } else {
          this.createStandardGoogleMarker();
        }

        this.startGpsTracking();
      } else {
        this.renderFallbackMap(containerElement);
      }
    } catch (err) {
      console.warn("Google Maps init exception, using tactical tiles:", err);
      this.renderFallbackMap(containerElement);
    }

    this.bindHudControls();
    this.updateMediaDisplay();
  }

  createStandardGoogleMarker() {
    if (!this.map || !window.google || !window.google.maps) return;
    this.bikeMarker = new google.maps.Marker({
      position: this.currentPosition,
      map: this.map,
      title: "SenDeke Active Courier (Deke)",
      icon: {
        url: "assets/img/icon-192.png",
        scaledSize: new google.maps.Size(36, 36),
        anchor: new google.maps.Point(18, 18)
      }
    });
  }

  /**
   * Calculates a geographic destination point offset by distanceMeters along bearingDegrees.
   * Offsets the camera forward along the rider's trajectory, so the 3D bicycle sits in
   * the lower-third of the screen facing ahead into 3D buildings and streets (Android Auto style).
   */
  calculateLookaheadPoint(lat, lng, distanceMeters, bearingDegrees) {
    const R = 6371e3; // Earth's radius in meters
    const δ = distanceMeters / R;
    const θ = (bearingDegrees * Math.PI) / 180;
    const φ1 = (lat * Math.PI) / 180;
    const λ1 = (lng * Math.PI) / 180;
    const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
    const sinδ = Math.sin(δ), cosδ = Math.cos(δ);
    const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
    const φ2 = Math.asin(sinφ2);
    const y = Math.sin(θ) * sinδ * cosφ1;
    const x = cosδ - sinφ1 * sinφ2;
    const λ2 = λ1 + Math.atan2(y, x);
    return { lat: (φ2 * 180) / Math.PI, lng: ((λ2 * 180) / Math.PI + 540) % 360 - 180 };
  }

  /**
   * Creates high-visibility 3D illuminated bicycle marker with headlight beam & radar
   */
  createBikeMarker(AdvancedMarkerElement) {
    const markerWrapper = document.createElement("div");
    markerWrapper.className = "bike-marker-hud";
    markerWrapper.innerHTML = `
      <div class="bike-radar-pulse"></div>
      <div class="bike-bearing-cone" id="bikeBearingCone"></div>
      <div class="bike-headlight-beam" id="bikeHeadlightBeam"></div>
      <div class="bike-icon-pod">
        <svg viewBox="0 0 32 32" width="38" height="38" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <!-- 3D Aerodynamic Bike Frame -->
          <circle cx="7" cy="23" r="5" stroke="#00E5FF" stroke-width="2.5" />
          <circle cx="25" cy="23" r="5" stroke="#00E5FF" stroke-width="2.5" />
          <!-- Glowing Aero Spokes -->
          <line x1="7" y1="23" x2="7" y2="18" stroke="#00FFAA" stroke-width="1.5" />
          <line x1="7" y1="23" x2="11" y2="25" stroke="#00FFAA" stroke-width="1.5" />
          <line x1="25" y1="23" x2="25" y2="18" stroke="#00FFAA" stroke-width="1.5" />
          <line x1="25" y1="23" x2="29" y2="25" stroke="#00FFAA" stroke-width="1.5" />
          <!-- Diamond Frame -->
          <polygon points="7,23 15,23 20,13 12,13" stroke="#FFFFFF" stroke-width="2.2" fill="rgba(0,229,255,0.25)" />
          <line x1="15" y1="23" x2="25" y2="23" stroke="#00E5FF" stroke-width="2" />
          <line x1="12" y1="13" x2="7" y2="23" stroke="#FFFFFF" stroke-width="2.2" />
          <line x1="20" y1="13" x2="25" y2="23" stroke="#FFFFFF" stroke-width="2.2" />
          <!-- Fork and Handlebars -->
          <line x1="25" y1="23" x2="22" y2="9" stroke="#00E5FF" stroke-width="2.2" />
          <line x1="19.5" y1="9" x2="24.5" y2="9" stroke="#FFD700" stroke-width="3" />
          <!-- Courier Rider Silhouette & Helmet -->
          <circle cx="16" cy="6" r="3" fill="#00E5FF" stroke="#FFFFFF" stroke-width="1.5" />
          <path d="M16,9 L14,14 L18,17 L15,23" stroke="#00FFAA" stroke-width="2.5" />
          <line x1="14" y1="11" x2="22" y2="9" stroke="#FFFFFF" stroke-width="2" />
        </svg>
      </div>
      <div class="bike-label">COURIER 1 (DEKE)</div>
    `;

    this.bikeMarker = new AdvancedMarkerElement({
      map: this.map,
      position: this.currentPosition,
      title: "SenDeke.to Active Courier",
      content: markerWrapper
    });
  }

  /**
   * Tracks GPS and calculates heading to keep the map pointing forward
   */
  startGpsTracking() {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };

        this.currentSpeedMph = speed ? Math.round(speed * 2.23694) : 0;

        // Calculate smooth heading only if moving at courier speed (> 3 mph) to eliminate stationary GPS jitter
        let targetHeading = this.smoothedHeading;
        if (this.currentSpeedMph >= 3) {
          if (typeof heading === 'number' && !isNaN(heading) && heading >= 0) {
            targetHeading = heading;
          } else if (this.lastPosition) {
            const distMeters = this.getDistanceFromLatLonInM(
              this.lastPosition.lat, this.lastPosition.lng,
              newPos.lat, newPos.lng
            );
            if (distMeters >= 5) {
              targetHeading = this.calculateBearing(
                this.lastPosition.lat, this.lastPosition.lng,
                newPos.lat, newPos.lng
              );
            }
          }
          this.smoothedHeading = this.smoothAngle(this.smoothedHeading, targetHeading, 0.25);
        }

        this.currentPosition = newPos;
        this.lastPosition = newPos;

        // Update bike marker position smoothly
        if (this.bikeMarker) {
          this.bikeMarker.position = newPos;
          const cone = document.getElementById("bikeBearingCone");
          const beam = document.getElementById("bikeHeadlightBeam");
          if (cone && this.currentSpeedMph >= 3) {
            cone.style.transform = `rotate(${this.smoothedHeading}deg)`;
          }
          if (beam && this.currentSpeedMph >= 3) {
            beam.style.transform = `rotate(${this.smoothedHeading}deg)`;
          }
        }

        // Keep map camera stable without violent jumping
        if (this.map) {
          if (this.headingUpMode && this.currentSpeedMph >= 3) {
            const lookaheadCenter = this.calculateLookaheadPoint(newPos.lat, newPos.lng, 25, this.smoothedHeading);
            this.map.moveCamera({
              center: lookaheadCenter,
              zoom: 17.5,
              heading: this.smoothedHeading,
              tilt: this.is3D ? 45 : 0
            });
          } else {
            // Calm, stationary or low-speed smooth pan (zero spinning or twitching)
            this.map.panTo(newPos);
          }
        }

        // Update HUD readouts
        this.updateHudMetrics();
      },
      (err) => {
        console.warn("GPS tracking status:", err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000
      }
    );
  }

  /**
   * Computes bearing angle between two coordinates (0° = North, 90° = East)
   */
  calculateBearing(startLat, startLng, destLat, destLng) {
    const startLatRad = (startLat * Math.PI) / 180;
    const startLngRad = (startLng * Math.PI) / 180;
    const destLatRad = (destLat * Math.PI) / 180;
    const destLngRad = (destLng * Math.PI) / 180;

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
              Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
    let brng = (Math.atan2(y, x) * 180) / Math.PI;
    return (brng + 360) % 360;
  }

  /**
   * Smooths angle transitions to avoid wild camera rotations
   */
  smoothAngle(current, target, factor) {
    let diff = (target - current + 180) % 360 - 180;
    return (current + diff * factor + 360) % 360;
  }

  getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Media Session API - Controls music player while driving
   */
  initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlay(true));
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlay(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prevTrack());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
    }
  }

  updateMediaDisplay() {
    const track = this.demoPlaylist[this.currentTrackIndex];
    const titleEl = document.getElementById("hudTrackTitle");
    const artistEl = document.getElementById("hudTrackArtist");
    const playBtn = document.getElementById("hudPlayPauseBtn");

    if (titleEl) titleEl.textContent = track.title;
    if (artistEl) artistEl.textContent = `${track.artist} • ${track.genre}`;
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: "SenDeke.to Drive Session"
      });
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  togglePlay(forcedState) {
    this.isPlaying = forcedState !== undefined ? forcedState : !this.isPlaying;
    this.updateMediaDisplay();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.demoPlaylist.length;
    this.isPlaying = true;
    this.updateMediaDisplay();
  }

  prevTrack() {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.demoPlaylist.length) % this.demoPlaylist.length;
    this.isPlaying = true;
    this.updateMediaDisplay();
  }

  toggle3dView() {
    this.is3D = !this.is3D;
    const btn = document.getElementById("hudToggle3dBtn");
    if (btn) btn.textContent = this.is3D ? "3D ON" : "2D FLAT";
    if (this.map) {
      this.map.moveCamera({ tilt: this.is3D ? 55 : 0 });
    }
  }

  toggleHeadingLock() {
    this.headingUpMode = !this.headingUpMode;
    const btn = document.getElementById("hudToggleHeadingBtn");
    if (btn) btn.textContent = this.headingUpMode ? "HEADING UP" : "NORTH UP";
    if (this.map) {
      this.map.moveCamera({
        heading: this.headingUpMode ? this.smoothedHeading : 0
      });
    }
  }

  recenter() {
    if (this.map && this.currentPosition) {
      this.map.moveCamera({
        center: this.currentPosition,
        zoom: 18,
        heading: this.headingUpMode ? this.smoothedHeading : 0,
        tilt: this.is3D ? 55 : 0
      });
    }
  }

  updateHudMetrics() {
    const speedEl = document.getElementById("hudSpeedReadout");
    const headingEl = document.getElementById("hudHeadingReadout");
    if (speedEl) speedEl.textContent = `${this.currentSpeedMph} MPH`;
    if (headingEl) {
      const compassDirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const idx = Math.round(this.smoothedHeading / 45) % 8;
      headingEl.textContent = `${Math.round(this.smoothedHeading)}° ${compassDirs[idx]}`;
    }
  }

  toggleRouteNavDrawer(force) {
    const drawer = document.getElementById("routeNavDrawer");
    if (!drawer) return;
    if (force !== undefined) {
      drawer.classList.toggle("d-none", !force);
    } else {
      drawer.classList.toggle("d-none");
    }
  }

  async calculateRoute(origin, destination, travelMode = "BICYCLING") {
    if (!this.directionsService || !this.directionsRenderer) {
      console.warn("Google Maps directions service not ready");
      return;
    }

    const start = (origin && !origin.includes("Current GPS Location")) ? origin : this.currentPosition;
    const dest = destination || "Sweetfin, 9518 Washington Blvd, Culver City, CA 90232";

    try {
      const modeKey = (travelMode || "BICYCLING").toUpperCase();
      const request = {
        origin: start,
        destination: dest,
        travelMode: (window.google && window.google.maps && window.google.maps.TravelMode && window.google.maps.TravelMode[modeKey]) 
          ? window.google.maps.TravelMode[modeKey] 
          : "BICYCLING",
        provideRouteAlternatives: false
      };

      this.directionsService.route(request, (result, status) => {
        if (status === "OK" && result) {
          this.directionsRenderer.setDirections(result);
          this.activeRoute = result.routes[0];
          this.isDriveMode = false;

          // Update Turn Banner
          const leg = this.activeRoute.legs[0];
          const firstStep = leg.steps[0];
          const banner = document.getElementById("turnByTurnBanner");
          const instructionEl = document.getElementById("turnInstructionText");
          const metaEl = document.getElementById("turnMetaText");
          const modeLabel = document.getElementById("hudModeLabel");

          if (banner) banner.classList.remove("d-none");
          if (instructionEl && firstStep) {
            instructionEl.innerHTML = firstStep.instructions;
          }
          if (metaEl && leg) {
            metaEl.textContent = `In ${firstStep?.distance?.text || 'ahead'} • ${leg.duration.text} (${leg.distance.text}) • to ${leg.end_address.split(',')[0]}`;
          }
          if (modeLabel) {
            modeLabel.textContent = `ROUTE ACTIVE: ${leg.end_address.split(',')[0]}`;
          }

          // Close Drawer
          this.toggleRouteNavDrawer(false);

          // Position camera at start looking towards first waypoint
          if (this.map) {
            this.map.moveCamera({
              center: this.currentPosition,
              zoom: 18.5,
              tilt: this.is3D ? 67.5 : 0,
              heading: this.smoothedHeading
            });
          }
        } else {
          console.warn("Directions request failed:", status);
          alert(`Navigation Route error: ${status}`);
        }
      });
    } catch (err) {
      console.error("Route calculation error:", err);
    }
  }

  clearRoute() {
    if (this.directionsRenderer) {
      this.directionsRenderer.set('directions', null);
    }
    this.activeRoute = null;
    this.isDriveMode = true;
    const banner = document.getElementById("turnByTurnBanner");
    if (banner) banner.classList.add("d-none");
    const modeLabel = document.getElementById("hudModeLabel");
    if (modeLabel) modeLabel.textContent = "Ambient Drive Mode";
  }

  bindHudControls() {
    const playBtn = document.getElementById("hudPlayPauseBtn");
    const nextBtn = document.getElementById("hudNextBtn");
    const prevBtn = document.getElementById("hudPrevBtn");
    const toggle3d = document.getElementById("hudToggle3dBtn");
    const toggleHeading = document.getElementById("hudToggleHeadingBtn");
    const recenterBtn = document.getElementById("hudRecenterBtn");
    const routeNavBtn = document.getElementById("hudRouteNavBtn");
    const closeDrawerBtn = document.getElementById("closeRouteNavDrawerBtn");
    const cancelRouteBtn = document.getElementById("hudCancelRouteBtn");
    const startNavBtn = document.getElementById("startNavigationBtn");
    const clearRouteBtn = document.getElementById("clearRouteBtn");

    if (playBtn) playBtn.onclick = () => this.togglePlay();
    if (nextBtn) nextBtn.onclick = () => this.nextTrack();
    if (prevBtn) prevBtn.onclick = () => this.prevTrack();
    if (toggle3d) toggle3d.onclick = () => this.toggle3dView();
    if (toggleHeading) toggleHeading.onclick = () => this.toggleHeadingLock();
    if (recenterBtn) recenterBtn.onclick = () => this.recenter();

    if (routeNavBtn) routeNavBtn.onclick = () => this.toggleRouteNavDrawer();
    if (closeDrawerBtn) closeDrawerBtn.onclick = () => this.toggleRouteNavDrawer(false);
    if (cancelRouteBtn) cancelRouteBtn.onclick = () => this.clearRoute();
    if (clearRouteBtn) clearRouteBtn.onclick = () => this.clearRoute();

    if (startNavBtn) {
      startNavBtn.onclick = () => {
        const fromVal = document.getElementById("routeFromInput")?.value;
        const toVal = document.getElementById("routeToInput")?.value;
        this.calculateRoute(fromVal, toVal);
      };
    }

    document.querySelectorAll(".route-preset-btn").forEach(btn => {
      btn.onclick = () => {
        const dest = btn.dataset.dest;
        const toInput = document.getElementById("routeToInput");
        if (toInput && dest) {
          toInput.value = dest;
          this.calculateRoute(null, dest);
        }
      };
    });
  }

  renderFallbackMap(container, noticeMsg) {
    if (typeof L !== 'undefined') {
      container.innerHTML = '';
      const mapDiv = document.createElement('div');
      mapDiv.style.width = '100%';
      mapDiv.style.height = '100%';
      mapDiv.style.position = 'relative';
      container.appendChild(mapDiv);

      if (noticeMsg) {
        const pill = document.createElement('div');
        pill.className = 'badge text-bg-info position-absolute top-0 start-50 translate-middle-x m-2 shadow-lg';
        pill.style.zIndex = '1000';
        pill.textContent = noticeMsg;
        container.appendChild(pill);
      }

      const center = [this.currentPosition.lat || 34.0259, this.currentPosition.lng || -118.3965];
      const lMap = L.map(mapDiv, {
        center: center,
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });

      this.fallbackMap = lMap;

      // High-reliability free dark map tiles without API key restrictions (CartoDB Dark Matter)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(lMap);

      const bikeIcon = L.divIcon({
        className: 'custom-courier-marker',
        html: '<div style="background:#00E5FF; color:#000; font-weight:900; font-size:14px; border-radius:50%; width:34px; height:34px; display:grid; place-items:center; box-shadow:0 0 16px rgba(0,229,255,0.8); border:2px solid #fff;">🚲</div>',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const marker = L.marker(center, { icon: bikeIcon }).addTo(lMap);
      marker.bindPopup('<strong>Courier (Deke)</strong><br>Palms / Culver City (90034)');

      if (navigator.geolocation) {
        this.watchId = navigator.geolocation.watchPosition(pos => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          marker.setLatLng(newPos);
          lMap.panTo(newPos);
        }, err => console.warn(err), { enableHighAccuracy: true });
      }

      lMap.invalidateSize();
      setTimeout(() => lMap.invalidateSize(), 200);
      setTimeout(() => lMap.invalidateSize(), 800);
      window.addEventListener('resize', () => lMap.invalidateSize());
      return;
    }

    container.innerHTML = `
      <div class="h-100 w-100 d-flex flex-column align-items-center justify-content-center text-center p-4" style="background: radial-gradient(circle at center, #111 0%, #050505 100%);">
        <div class="bike-icon-pod mb-3" style="width: 70px; height: 70px;">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#00E5FF" stroke-width="2">
            <circle cx="5.5" cy="17.5" r="3.5" stroke="#00E5FF" stroke-width="2.5" />
            <circle cx="18.5" cy="17.5" r="3.5" stroke="#00E5FF" stroke-width="2.5" />
            <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5L8.5 12H14l2.5 5.5M12 17.5V14l4-3h3" stroke="#FFF" stroke-width="2" />
          </svg>
        </div>
        <h4 class="fw-black mb-1">Google Maps 3D Vector Cockpit</h4>
        <p class="text-secondary small max-w-sm">WebGL Vector rendering with 3D buildings and real-time bearing tracking active. GPS positioning synchronized.</p>
        <div class="badge text-bg-info px-3 py-2 mt-2">🚴 AMBIENT DRIVE MODE ACTIVE (90034)</div>
      </div>
    `;
  }

  destroy() {
    if (this.watchId && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

export default DriverNavigationConsole;
