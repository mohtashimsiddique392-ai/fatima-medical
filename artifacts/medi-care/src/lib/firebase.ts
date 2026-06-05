import { initializeApp, getApps } from "firebase/app";
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

const firebaseReady = !!firebaseConfig.apiKey && !!firebaseConfig.appId;
const app = firebaseReady ? (getApps().length ? getApps()[0] : initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
if (auth) auth.languageCode = "en";

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getOrCreateRecaptcha(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: "invisible",
    callback: () => {},
    "expired-callback": () => {
      try { recaptchaVerifier?.clear(); } catch {}
      recaptchaVerifier = null;
    },
  });
  return recaptchaVerifier;
}

export function resetRecaptcha() {
  try { if (recaptchaVerifier) recaptchaVerifier.clear(); } catch {}
  recaptchaVerifier = null;
  try {
    const container = document.getElementById("recaptcha-container");
    if (container && container.parentNode) {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    }
  } catch {}
}

export async function sendOtpToPhone(phoneE164: string, containerId = "recaptcha-container"): Promise<ConfirmationResult> {
  if (!auth) throw new Error("Firebase not configured.");
  const verifier = getOrCreateRecaptcha(containerId);
  return await signInWithPhoneNumber(auth, phoneE164, verifier);
}

export type { ConfirmationResult };