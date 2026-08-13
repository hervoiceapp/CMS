#!/usr/bin/env node
/**
 * Backfill the PII-safe `members/{uid}` collection from existing `users`.
 *
 * The community "nearby members" feature reads `members` (display fields
 * only), while the full `users` docs stay owner-only under the security
 * rules. This one-time migration copies a sanitized subset from `users`
 * into `members` for every existing profile.
 *
 * Usage:
 *   node scripts/backfill-members.mjs            # copy all users -> members
 *   node scripts/backfill-members.mjs <email>    # copy one user by email
 *
 * Requires a FIREBASE_SERVICE_ACCOUNT env var (or a stringified JSON value in
 * .env.local, loaded automatically).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return process.env.FIREBASE_SERVICE_ACCOUNT;
  }
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf8");
    const match = raw.match(/^FIREBASE_SERVICE_ACCOUNT=(.*)$/m);
    if (match) return match[1].replace(/^["']|["']$/g, "").trim();
  }
  throw new Error("Missing FIREBASE_SERVICE_ACCOUNT. Set it as an env var or in .env.local.");
}

const serviceAccount = loadServiceAccount();
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(serviceAccount)),
    projectId: "kolado-mis",
  });
}
const adminAuth = getAuth();
const db = getFirestore();

function sanitize(data) {
  return {
    fullName:
      typeof data.fullName === "string" && data.fullName.trim()
        ? data.fullName.trim()
        : "Community Member",
    preferredLanguage:
      typeof data.preferredLanguage === "string" ? data.preferredLanguage : "English",
    imageColor: "#86efac",
    updatedAt: new Date(),
  };
}

async function backfillOne(uid, data) {
  const member = sanitize(data);
  await db.collection("members").doc(uid).set(member, { merge: true });
  return { uid, ...member };
}

async function main() {
  const [, , emailFilter] = process.argv;

  if (emailFilter) {
    const user = await adminAuth.getUserByEmail(emailFilter);
    const snap = await db.collection("users").doc(user.uid).get();
    if (!snap.exists) throw new Error(`No users/{uid} doc for ${emailFilter}`);
    const result = await backfillOne(user.uid, snap.data());
    console.log(`Created members/${result.uid} for ${emailFilter} (${result.fullName})`);
    return;
  }

  const usersSnap = await db.collection("users").get();
  console.log(`Found ${usersSnap.size} user profile(s)`);

  let count = 0;
  for (const doc of usersSnap.docs) {
    const result = await backfillOne(doc.id, doc.data());
    count++;
    console.log(`  members/${result.uid} <- ${result.fullName}`);
  }
  console.log(`Done. Wrote ${count} member doc(s).`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
