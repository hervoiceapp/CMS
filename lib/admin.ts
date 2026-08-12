import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

let adminAuth: Auth | null = null;

function getAdminAuth() {
  if (adminAuth) return adminAuth;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT env var. Provide the service-account " +
        "JSON (stringified) for project kolado-mis.",
    );
  }

  let credential;
  try {
    credential = cert(JSON.parse(serviceAccount));
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must be valid stringified service-account JSON.");
  }

  const app =
    getApps().find((a) => a.name === "cms-admin") ??
    initializeApp({ credential, projectId: "kolado-mis" }, "cms-admin");

  adminAuth = getAuth(app);
  return adminAuth;
}

export const SESSION_COOKIE_NAME = "session";
export const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionCookie(idToken: string) {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_MS,
  });
}

export function verifyIdToken(idToken: string) {
  return getAdminAuth().verifyIdToken(idToken);
}

export async function verifySessionCookie(cookie: string | undefined) {
  if (!cookie) return null;
  try {
    return await getAdminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

export async function setRole(uid: string, role: "admin" | "medical") {
  await getAdminAuth().setCustomUserClaims(uid, { role });
}
