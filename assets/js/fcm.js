// Firebase Cloud Messaging (Web Push) Client for SenDeke.to
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getMessaging, getToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js";
import firebaseConfig from "./firebase-config.js";

let messagingInstance = null;

export async function initFCM() {
  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("FCM Web Push is not supported in this browser environment.");
    return null;
  }

  const app = initializeApp(firebaseConfig);
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function requestFCMToken() {
  try {
    const msg = await initFCM();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn("Notification permission was not granted.");
      return null;
    }

    const currentToken = await getToken(msg, {
      vapidKey: firebaseConfig.vapidKey
    });

    if (currentToken) {
      console.log("FCM Registration Token active:", currentToken);
      localStorage.setItem('sendeke_fcm_token', currentToken);
      return currentToken;
    } else {
      console.warn("No registration token available.");
      return null;
    }
  } catch (err) {
    console.warn("An error occurred while retrieving FCM token:", err);
    return null;
  }
}

export function onFCMMessage(callback) {
  if (!messagingInstance) return;
  return onMessage(messagingInstance, (payload) => {
    console.log("Foreground message received:", payload);
    if (callback) callback(payload);
  });
}

export default { initFCM, requestFCMToken, onFCMMessage };
