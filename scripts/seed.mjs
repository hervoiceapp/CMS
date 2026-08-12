#!/usr/bin/env node
/**
 * Provision CMS users and assign roles.
 *
 * Usage:
 *   node scripts/seed.mjs create <email> <password> <admin|medical>
 *   node scripts/seed.mjs set-role <email> <admin|medical>
 *   node scripts/seed.mjs list
 *
 * Requires a FIREBASE_SERVICE_ACCOUNT env var (or a stringified JSON value in
 * .env.local, loaded automatically).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const ROLES = ["admin", "medical"];

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

const [, , command, arg1, arg2, arg3] = process.argv;

async function getUserByEmail(email) {
  try {
    return await adminAuth.getUserByEmail(email);
  } catch {
    return null;
  }
}

async function listUsers() {
  const { users } = await adminAuth.listUsers();
  console.log(`${"Email".padEnd(40)} Role`);
  console.log("-".repeat(52));
  for (const u of users) {
    console.log(
      `${(u.email ?? u.uid).padEnd(40)} ${(u.customClaims?.role ?? "none").toString().padEnd(7)}`,
    );
  }
}

async function setRole(email, role) {
  const user = await getUserByEmail(email);
  if (!user) throw new Error(`No user found with email ${email}`);
  await adminAuth.setCustomUserClaims(user.uid, { role });
  console.log(`Set role "${role}" on ${email} (${user.uid})`);
}

async function createUser(email, password, role) {
  if (!ROLES.includes(role)) {
    throw new Error(`Role must be one of: ${ROLES.join(", ")}`);
  }
  const existing = await getUserByEmail(email);
  if (existing) {
    await adminAuth.updateUser(existing.uid, { password });
    console.log(`User ${email} already existed; password updated.`);
  } else {
    const created = await adminAuth.createUser({
      email,
      password,
      emailVerified: true,
    });
    console.log(`Created user ${email} (${created.uid})`);
  }
  await setRole(email, role);
}

try {
  if (command === "create") {
    if (!arg1 || !arg2 || !arg3) throw new Error("Usage: create <email> <password> <role>");
    await createUser(arg1, arg2, arg3);
  } else if (command === "set-role") {
    if (!arg1 || !arg2) throw new Error("Usage: set-role <email> <role>");
    await setRole(arg1, arg2);
  } else if (command === "list") {
    await listUsers();
  } else {
    console.log("Usage: seed.mjs [create|set-role|list]");
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
