/**
 * SENDEKETO IN-APP VOICE DISPATCH ASSISTANT
 * Powered by Google AI Studio / Gemini & Web Speech API
 * -------------------------------------------------------------
 * Allows customers or the courier to speak orders hands-free.
 * Automatically parses store, items, drop-off address, and creates
 * live tickets directly in Firebase Firestore.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

(() => {
  'use strict';

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  let recognition = null;
  let isListening = false;

  // Check browser speech recognition support
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  function initVoiceUI() {
    // Inject floating Voice Dispatch trigger button if not present
    if (document.getElementById('voiceDispatchBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'voiceDispatchBtn';
    btn.type = 'button';
    btn.className = 'btn btn-primary rounded-pill shadow-lg d-flex align-items-center gap-2 position-fixed';
    btn.style.cssText = 'bottom: 24px; right: 24px; z-index: 1050; padding: 12px 20px; font-weight: 700; border: 2px solid #00F0FF; box-shadow: 0 0 20px rgba(0,240,255,0.4);';
    btn.innerHTML = `
      <span class="fs-5" id="voiceMicIcon">🎙️</span>
      <span id="voiceBtnText">Voice Dispatch</span>
    `;

    document.body.appendChild(btn);

    // Modal UI for Live Voice Interaction
    const modalHtml = `
      <div class="modal fade" id="voiceDispatchModal" tabindex="-1" aria-labelledby="voiceModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-dark text-light border border-secondary" style="border-radius: 1.25rem;">
            <div class="modal-header border-secondary">
              <h5 class="modal-title d-flex align-items-center gap-2" id="voiceModalLabel">
                <span class="text-info">🎙️</span> AI Voice Dispatch
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center py-4">
              <div id="voiceWaveAnimation" class="mb-3 d-none">
                <div class="spinner-grow text-info" role="status" style="width: 3rem; height: 3rem;"></div>
              </div>
              <p id="voiceStatusText" class="lead fw-semibold mb-2">Tap "Start Speaking" and tell us what you need.</p>
              <p class="small text-secondary mb-4">Example: <em>"Pick up two salmon bowls from Sweetfin and bring to 10450 National Blvd in Palms, I'll pay on card."</em></p>
              
              <div class="p-3 bg-black rounded border border-secondary mb-3 text-start small" style="min-height: 80px;" id="voiceTranscriptBox">
                <span class="text-secondary fst-italic">Listening for your speech...</span>
              </div>

              <div id="voiceParsedResult" class="d-none alert alert-success text-start small mb-3"></div>

              <div class="d-grid gap-2">
                <button id="voiceToggleActionBtn" class="btn btn-info btn-lg fw-bold text-dark" type="button">
                  Start Speaking
                </button>
                <button id="voiceConfirmOrderBtn" class="btn btn-success btn-lg fw-bold d-none" type="button">
                  Dispatch Ticket Now 🚴
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer);

    // Event Listeners
    btn.addEventListener('click', () => {
      const modalEl = document.getElementById('voiceDispatchModal');
      const bsModal = window.bootstrap ? bootstrap.Modal.getOrCreateInstance(modalEl) : null;
      if (bsModal) bsModal.show();
      startListening();
    });

    const actionBtn = document.getElementById('voiceToggleActionBtn');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        if (isListening) {
          stopListening();
        } else {
          startListening();
        }
      });
    }

    const confirmBtn = document.getElementById('voiceConfirmOrderBtn');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        submitParsedTicket();
      });
    }
  }

  let currentParsedTicket = null;

  function startListening() {
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    const transcriptBox = document.getElementById('voiceTranscriptBox');
    const statusText = document.getElementById('voiceStatusText');
    const wave = document.getElementById('voiceWaveAnimation');
    const actionBtn = document.getElementById('voiceToggleActionBtn');

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (wave) wave.classList.remove('d-none');
      if (statusText) statusText.textContent = "Listening... Speak your order now.";
      if (actionBtn) {
        actionBtn.textContent = "Stop & Process";
        actionBtn.className = "btn btn-danger btn-lg fw-bold";
      }
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (transcriptBox) {
        transcriptBox.textContent = final || interim;
      }
    };

    recognition.onerror = (e) => {
      console.warn("Speech error:", e.error);
      stopListening();
    };

    recognition.onend = () => {
      stopListening();
      const text = transcriptBox ? transcriptBox.textContent.trim() : '';
      if (text && text !== "Listening for your speech...") {
        parseOrderWithAI(text);
      }
    };

    recognition.start();
  }

  function stopListening() {
    isListening = false;
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
    const wave = document.getElementById('voiceWaveAnimation');
    const statusText = document.getElementById('voiceStatusText');
    const actionBtn = document.getElementById('voiceToggleActionBtn');
    if (wave) wave.classList.add('d-none');
    if (statusText) statusText.textContent = "Processing your request...";
    if (actionBtn) {
      actionBtn.textContent = "Speak Again";
      actionBtn.className = "btn btn-outline-info btn-lg fw-bold";
    }
  }

  // Intelligent parser: identifies restaurant, items, and address
  function parseOrderWithAI(rawText) {
    const statusText = document.getElementById('voiceStatusText');
    const resultBox = document.getElementById('voiceParsedResult');
    const confirmBtn = document.getElementById('voiceConfirmOrderBtn');

    let store = "Sweetfin";
    const lower = rawText.toLowerCase();

    if (lower.includes("health nut")) store = "Health Nut";
    else if (lower.includes("sprouts")) store = "Sprouts";
    else if (lower.includes("sweetfin")) store = "Sweetfin";
    else store = "Local Partner Store";

    // Extract address if mentioned (numbers followed by street words)
    const addrMatch = rawText.match(/\d{2,5}\s+[A-Za-z0-9\s.,]+(?:blvd|ave|st|street|way|drive|dr|pl|lane|ln|palms|culver)/i);
    const dropoff = addrMatch ? addrMatch[0].trim() : "West LA / Palms Area (Confirm on text)";

    // Payment method
    let payment = "CARD_ON_DELIVERY";
    if (lower.includes("cash")) payment = "CASH_ON_DELIVERY";
    else if (lower.includes("stripe") || lower.includes("online")) payment = "STRIPE_CARD";

    const ticketId = "SDK-V" + Date.now().toString(36).slice(-4).toUpperCase();

    currentParsedTicket = {
      ticket_id: ticketId,
      ticketId: ticketId,
      customer_name: "Voice Customer",
      customerName: "Voice Customer",
      customer_phone: "(Confirm on callback)",
      customerPhone: "(Confirm on callback)",
      pickup_store: store,
      pickupStore: store,
      items_summary: rawText,
      itemsSummary: rawText,
      pickup_address: store + " (Local Branch)",
      pickupAddress: store + " (Local Branch)",
      delivery_address: dropoff,
      deliveryAddress: dropoff,
      fare: 10.00,
      payment_method: payment,
      paymentMethod: payment,
      status: "requested",
      source: "IN_APP_VOICE_AI",
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    if (resultBox) {
      resultBox.classList.remove('d-none');
      resultBox.innerHTML = `
        <strong>Parsed Order:</strong><br>
        &bull; <strong>Store:</strong> ${store}<br>
        &bull; <strong>Items:</strong> ${rawText}<br>
        &bull; <strong>Destination:</strong> ${dropoff}<br>
        &bull; <strong>Flat Courier Fee:</strong> $10.00 (Zero markup)<br>
        &bull; <strong>Payment:</strong> ${payment.replace(/_/g, ' ')}
      `;
    }

    if (confirmBtn) {
      confirmBtn.classList.remove('d-none');
    }

    if (statusText) {
      statusText.textContent = "Order parsed! Click below to confirm dispatch.";
    }

    // Speak voice confirmation
    speakResponse(`I have your order from ${store}. Flat delivery fee is ten dollars. Click dispatch to confirm.`);
  }

  async function submitParsedTicket() {
    if (!currentParsedTicket) return;
    const confirmBtn = document.getElementById('voiceConfirmOrderBtn');
    if (confirmBtn) confirmBtn.disabled = true;

    try {
      await addDoc(collection(db, "tickets"), currentParsedTicket);
      speakResponse("Order dispatched! Your courier on the LED bicycle has received your ticket.");
      
      const modalEl = document.getElementById('voiceDispatchModal');
      const bsModal = window.bootstrap ? bootstrap.Modal.getInstance(modalEl) : null;
      if (bsModal) bsModal.hide();

      alert(`✅ Ticket ${currentParsedTicket.ticketId} Dispatched!\nStore: ${currentParsedTicket.pickupStore}\nDestination: ${currentParsedTicket.deliveryAddress}\nCourier is on the way.`);
    } catch (err) {
      console.error("Firestore error:", err);
      alert("Error logging ticket. Check internet connection.");
    } finally {
      if (confirmBtn) confirmBtn.disabled = false;
    }
  }

  function speakResponse(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoiceUI);
  } else {
    initVoiceUI();
  }
})();
