import "server-only";
import type { NextRequest } from "next/server";
import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === "cms-admin");
  if (existing) return existing;

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

  return initializeApp({ credential, projectId: "kolado-mis" }, "cms-admin");
}

function getAdminAuth() {
  if (adminAuth) return adminAuth;
  adminAuth = getAuth(getAdminApp());
  return adminAuth;
}

export function getAdminFirestore() {
  if (adminDb) return adminDb;
  adminDb = getFirestore(getAdminApp());
  return adminDb;
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

export async function setRole(uid: string, role: "admin" | "medical" | null) {
  await getAdminAuth().setCustomUserClaims(uid, role ? { role } : {});
}

export interface CmsUser {
  uid: string;
  email: string | undefined;
  role: string | undefined;
  disabled: boolean;
  providers: string[];
  creationTime: string | undefined;
}

export async function listAllUsers(): Promise<CmsUser[]> {
  const auth = getAdminAuth();
  const users: CmsUser[] = [];
  let pageToken: string | undefined;
  do {
    const { users: page, pageToken: next } = await auth.listUsers(1000, pageToken);
    for (const u of page) {
      users.push({
        uid: u.uid,
        email: u.email ?? undefined,
        role: typeof u.customClaims?.role === "string" ? u.customClaims.role : undefined,
        disabled: u.disabled,
        providers: u.providerData?.map((p) => p.providerId) ?? [],
        creationTime: u.metadata.creationTime,
      });
    }
    pageToken = next ?? undefined;
  } while (pageToken);
  return users;
}

export async function setUserDisabled(uid: string, disabled: boolean) {
  await getAdminAuth().updateUser(uid, { disabled });
}

export async function deleteUserById(uid: string) {
  await getAdminAuth().deleteUser(uid);
}

export async function requireCmsAdmin(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const decoded = await verifySessionCookie(cookie);
  if (!decoded || decoded.role !== "admin") {
    return null;
  }
  return decoded;
}
