import crypto from "node:crypto";

export const PAYAZA_CURRENCY = "GHS";
export const PAYAZA_SUCCESS_STATUS = "Completed";
export const PAYAZA_SUCCESS_EVENT = "TRANSACTION_SUCCESS";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable.`);
  return value;
}

export function getPayazaMode() {
  return process.env.PAYAZA_MODE === "test" ? "test" : "live";
}

export function getPayazaApiKey() {
  return requiredEnv("PAYAZA_API_KEY");
}

export function getPayazaPublicKey() {
  return requiredEnv("PAYAZA_PUBLIC_KEY");
}

export function getPayazaWebhookSecret() {
  return requiredEnv("PAYAZA_WEBHOOK_SECRET");
}

export function getAppointmentAmountGhs() {
  const raw = requiredEnv("PAYAZA_APPOINTMENT_AMOUNT_GHS");
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("PAYAZA_APPOINTMENT_AMOUNT_GHS must be a positive number.");
  }
  return Math.round(amount * 100) / 100;
}

export function createPayazaReference() {
  // Payaza recommends unique transaction references and recommends <= 15 chars.
  return `SUM${Date.now().toString(36).slice(-8)}${crypto
    .randomBytes(2)
    .toString("hex")}`.slice(0, 15);
}

export function normalizeGhanaPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("233") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `233${digits.slice(1)}`;
  throw new Error("Enter a valid Ghana mobile number.");
}

export function getPayazaApiUrl(path: string) {
  return `https://api.payaza.africa/${getPayazaMode()}${path}`;
}

export function payazaHeaders() {
  return {
    Authorization: `Payaza ${getPayazaApiKey()}`,
    "Content-Type": "application/json",
    "X-TenantID": getPayazaMode() === "test" ? "test" : "live",
    "X-ProductID": "app",
  };
}

export async function processGhanaMobileMoneyCollection(input: {
  amount: number;
  transactionReference: string;
  customerNumber: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
}) {
  const bankCode = requiredEnv("PAYAZA_GH_MOMO_BANK_CODE");
  const response = await fetch(getPayazaApiUrl("/subsidiary/collections/v1/process-collection"), {
    method: "POST",
    headers: payazaHeaders(),
    body: JSON.stringify({
      amount: input.amount,
      customer_number: input.customerNumber,
      transaction_reference: input.transactionReference,
      transaction_description: "Speak up Mama clinician appointment",
      customer_bank_code: bankCode,
      currency_code: PAYAZA_CURRENCY,
      customer_email: input.customerEmail,
      customer_first_name: input.customerFirstName,
      customer_last_name: input.customerLastName,
      customer_phone_number: input.customerNumber,
      country_code: "GH",
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.response_message || "Payaza collection initialization failed.");
  }
  return data as Record<string, unknown>;
}

export function verifyPayazaSignatureWithSecret(
  rawBody: string,
  signature: string | null,
  secret: string,
) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody, "utf8").digest("base64");
  const received = Buffer.from(signature.trim());
  const computed = Buffer.from(expected);
  return received.length === computed.length && crypto.timingSafeEqual(received, computed);
}

export function verifyPayazaSignature(rawBody: string, signature: string | null) {
  return verifyPayazaSignatureWithSecret(rawBody, signature, getPayazaWebhookSecret());
}

export function numericAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

export function isSuccessfulPayazaEvent(payload: Record<string, unknown>) {
  const event = String(payload.event ?? payload.type ?? payload.transaction_status ?? "").toUpperCase();
  const status = String(payload.status ?? "").toLowerCase();
  return (
    event === PAYAZA_SUCCESS_EVENT ||
    (event === "FUNDS RECEIVED" && status === PAYAZA_SUCCESS_STATUS.toLowerCase())
  );
}

export function isFailedPayazaEvent(payload: Record<string, unknown>) {
  const event = String(payload.event ?? payload.type ?? payload.transaction_status ?? "").toUpperCase();
  const status = String(payload.status ?? "").toLowerCase();
  return event.includes("FAIL") || event.includes("CANCEL") || status === "failed";
}
