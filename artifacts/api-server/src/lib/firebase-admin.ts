import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID || "fatima-medical-store";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

export const firebaseAuth = admin.auth();

export interface VerifiedFirebasePhone {
  uid: string;
  phoneNumber: string;
  phoneDigits: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebasePhone> {
  const decoded = await firebaseAuth.verifyIdToken(idToken);
  const phoneNumber = decoded.phone_number || (decoded as any).firebase?.identities?.phone?.[0] || "";
  if (!phoneNumber) throw new Error("Token does not contain a phone number");
  const phoneDigits = phoneNumber.replace(/\D/g, "").slice(-10);
  return { uid: decoded.uid, phoneNumber, phoneDigits };
}
