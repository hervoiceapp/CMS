import assert from "node:assert/strict";
import crypto from "node:crypto";
import { test } from "node:test";

process.env.PAYAZA_WEBHOOK_SECRET = "test-payaza-webhook-secret";
process.env.PAYAZA_MODE = "test";

const { verifyPayazaSignatureWithSecret } = await import("../lib/payaza.ts");
const { determinePaymentSettlement } = await import("../lib/payment-state.ts");

const body = JSON.stringify({
  transaction_reference: "SUMTEST123456",
  transaction_status: "Funds Received",
  status: "Completed",
  amount_received: "50",
  currency_code: "GHS",
});

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha512", secret).update(payload, "utf8").digest("base64");
}

test("accepts a valid Payaza HMAC-SHA512 signature", () => {
  const signature = sign(body, "test-payaza-webhook-secret");
  assert.equal(verifyPayazaSignatureWithSecret(body, signature, "test-payaza-webhook-secret"), true);
});

test("rejects a tampered body and wrong secret", () => {
  const signature = sign(body, "test-payaza-webhook-secret");
  assert.equal(verifyPayazaSignatureWithSecret(`${body} `, signature, "test-payaza-webhook-secret"), false);
  assert.equal(verifyPayazaSignatureWithSecret(body, signature, "wrong-secret"), false);
  assert.equal(verifyPayazaSignatureWithSecret(body, null, "test-payaza-webhook-secret"), false);
});

test("confirms only an exact GHS amount and completed Payaza event", () => {
  const action = determinePaymentSettlement({
    payment: { amount: 50, paymentStatus: "pending" },
    payload: {
      transaction_status: "Funds Received",
      status: "Completed",
      amount_received: "50.00",
      currency_code: "GHS",
    },
  });
  assert.equal(action, "confirm");
});

test("rejects amount/currency mismatch before confirmation", () => {
  assert.equal(
    determinePaymentSettlement({
      payment: { amount: 50, paymentStatus: "pending" },
      payload: {
        transaction_status: "Funds Received",
        status: "Completed",
        amount_received: "49.99",
        currency_code: "GHS",
      },
    }),
    "reject",
  );
  assert.equal(
    determinePaymentSettlement({
      payment: { amount: 50, paymentStatus: "pending" },
      payload: {
        transaction_status: "Funds Received",
        status: "Completed",
        amount_received: "50",
        currency_code: "NGN",
      },
    }),
    "reject",
  );
});

test("failed and pending events never confirm an appointment", () => {
  assert.equal(
    determinePaymentSettlement({
      payment: { amount: 50, paymentStatus: "pending" },
      payload: { transaction_status: "Transaction Failed", status: "Failed", amount_received: 50, currency_code: "GHS" },
    }),
    "fail",
  );
  assert.equal(
    determinePaymentSettlement({
      payment: { amount: 50, paymentStatus: "pending" },
      payload: { transaction_status: "Initialized", status: "Pending", amount_received: 50, currency_code: "GHS" },
    }),
    "pending",
  );
});

test("already settled payments are idempotent", () => {
  assert.equal(
    determinePaymentSettlement({
      payment: { amount: 50, paymentStatus: "paid", webhookProcessedAt: "already-processed" },
      payload: { transaction_status: "Funds Received", status: "Completed", amount_received: 50, currency_code: "GHS" },
    }),
    "duplicate",
  );
});
