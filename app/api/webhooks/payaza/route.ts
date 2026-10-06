import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/admin";
import {
  PAYAZA_CURRENCY,
  isFailedPayazaEvent,
  isSuccessfulPayazaEvent,
  numericAmount,
  verifyPayazaSignature,
} from "@/lib/payaza";

export const runtime = "nodejs";

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyPayazaSignature(rawBody, request.headers.get("x-payaza-signature"))) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const transactionReference = stringValue(
    payload.transaction_reference ?? payload.merchant_reference,
  );
  if (!transactionReference) {
    return NextResponse.json({ error: "Missing transaction reference." }, { status: 400 });
  }

  const db = getAdminFirestore();
  const paymentRef = db.collection("payments").doc(transactionReference);
  const paymentSnapshot = await paymentRef.get();
  if (!paymentSnapshot.exists) {
    // Return 200 so Payaza does not retry an event for an unknown/stale reference.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const payment = paymentSnapshot.data() ?? {};
  const payloadCurrency = stringValue(payload.currency_code ?? payload.currency).toUpperCase();
  const payloadAmount = numericAmount(payload.amount_received ?? payload.request_amount);
  const expectedAmount = numericAmount(payment.amount);

  if (payloadCurrency !== PAYAZA_CURRENCY || payloadAmount === null || expectedAmount === null || payloadAmount !== expectedAmount) {
    const rejectionBatch = db.batch();
    rejectionBatch.set(
      paymentRef,
      {
        status: "rejected",
        paymentStatus: "failed",
        failureReason: "Payaza amount/currency mismatch",
        webhookPayload: payload,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (payment.appointmentId) {
      rejectionBatch.update(db.collection("appointments").doc(String(payment.appointmentId)), {
        paymentStatus: "failed",
        appointmentStatus: "cancelled",
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await rejectionBatch.commit();
    return NextResponse.json({ error: "Amount or currency mismatch." }, { status: 422 });
  }

  if (payment.webhookProcessedAt || payment.paymentStatus === "paid") {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (!payment.appointmentId || payment.purpose !== "appointment") {
    await paymentRef.set(
      { status: "rejected", paymentStatus: "failed", failureReason: "Unsupported payment purpose", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return NextResponse.json({ error: "Unsupported payment purpose." }, { status: 422 });
  }

  const successful = isSuccessfulPayazaEvent(payload);
  const failed = isFailedPayazaEvent(payload);
  if (!successful && !failed) {
    await paymentRef.set(
      { status: "pending", lastWebhookPayload: payload, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return NextResponse.json({ ok: true, pending: true });
  }

  if (failed) {
    const failureBatch = db.batch();
    failureBatch.set(
      paymentRef,
      {
        status: "failed",
        paymentStatus: "failed",
        lastWebhookPayload: payload,
        webhookProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    if (payment.appointmentId) {
      failureBatch.update(db.collection("appointments").doc(String(payment.appointmentId)), {
        paymentStatus: "failed",
        appointmentStatus: "cancelled",
        status: "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    await failureBatch.commit();
    return NextResponse.json({ ok: true });
  }

  const result = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(paymentRef);
    const currentPayment = current.data() ?? {};
    if (currentPayment.webhookProcessedAt || currentPayment.paymentStatus === "paid") {
      return "duplicate" as const;
    }

    const appointmentRef = db.collection("appointments").doc(String(currentPayment.appointmentId));
    const entitlementRef = db.collection("entitlements").doc();
    transaction.update(appointmentRef, {
      paymentId: transactionReference,
      paymentStatus: "paid",
      appointmentStatus: "confirmed",
      status: "confirmed",
      amount: expectedAmount,
      currency: PAYAZA_CURRENCY,
      confirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.set(entitlementRef, {
      userId: currentPayment.userId,
      sourcePaymentId: transactionReference,
      sourceStore: "payaza",
      productId: "clinician-appointment",
      status: "active",
      validFrom: FieldValue.serverTimestamp(),
      appointmentId: appointmentRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(
      paymentRef,
      {
        status: "completed",
        paymentStatus: "paid",
        appointmentStatus: "confirmed",
        appointmentId: appointmentRef.id,
        entitlementId: entitlementRef.id,
        payazaPayload: payload,
        paidAt: FieldValue.serverTimestamp(),
        webhookProcessedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return "confirmed" as const;
  });

  return NextResponse.json({ ok: true, result });
}
