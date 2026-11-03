/**
 * SenDeke.to Client-Side Shield & Anti-Inspection Guard
 * Protects proprietary frontend code from casual right-click inspection,
 * view-source hotkeys, and unauthorized copying.
 */
(() => {
  'use strict';

  // 1. Disable Right-Click Context Menu (REMOVED per operator mandate - right clicking enabled)
  // document.addEventListener('contextmenu', event => {
  //   event.preventDefault();
  // });

  // 2. Block DevTools, Inspect Element, and View-Source Shortcut Keys
  document.addEventListener('keydown', event => {
    // F12 (Windows / Linux DevTools)
    if (event.key === 'F12' || event.keyCode === 123) {
      event.preventDefault();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Option+I (DevTools Inspector)
    // Ctrl+Shift+J / Cmd+Option+J (Console)
    // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
    if ((event.ctrlKey || event.metaKey) && event.shiftKey) {
      const k = (event.key || '').toUpperCase();
      if (k === 'I' || k === 'J' || k === 'C') {
        event.preventDefault();
        return false;
      }
    }

    // Ctrl+U / Cmd+U (View Page Source)
    if ((event.ctrlKey || event.metaKey) && ((event.key || '').toUpperCase() === 'U')) {
      event.preventDefault();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page to Disk)
    if ((event.ctrlKey || event.metaKey) && ((event.key || '').toUpperCase() === 'S')) {
      event.preventDefault();
      return false;
    }
  });

  // 3. Anti-Sniffing Console Warning
  if (window.console && typeof console.log === 'function') {
    try {
      console.log(
        '%c⚡ SenDeke.to Direct Dispatch System',
        'color: #0dcaf0; font-size: 20px; font-weight: 900; padding: 4px 0;'
      );
      console.log(
        '%c⚠️ WARNING: All proprietary algorithms, dispatch logic, and interface code are protected by copyright. Reverse engineering, scraping, or copying is strictly monitored and prohibited.',
        'color: #ffc107; font-size: 13px; font-weight: bold; padding: 2px 0;'
      );
    } catch (e) {}
  }
})();
