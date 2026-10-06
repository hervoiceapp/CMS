import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, verifyIdToken } from "@/lib/admin";
import { normalizeGhanaPhone, processGhanaMobileMoneyCollection } from "@/lib/payaza";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await verifyIdToken(token);
    const body = (await request.json()) as { paymentId?: string; phoneNumber?: string };
    const paymentId = body.paymentId?.trim();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId." }, { status: 400 });

    const db = getAdminFirestore();
    const paymentRef = db.collection("payments").doc(paymentId);
    const snapshot = await paymentRef.get();
    const payment = snapshot.data();
    if (!snapshot.exists || !payment || payment.userId !== decoded.uid || payment.paymentStatus !== "pending") {
      return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
    }

    const phoneNumber = normalizeGhanaPhone(body.phoneNumber || payment.customerPhone || "");
    const response = await processGhanaMobileMoneyCollection({
      amount: Number(payment.amount),
      transactionReference: payment.transactionReference,
      customerNumber: phoneNumber,
      customerEmail: String(payment.customerEmail),
      customerFirstName: String(payment.customerFirstName),
      customerLastName: String(payment.customerLastName),
    });

    await paymentRef.set(
      {
        paymentMethod: "GH_MOBILEMONEY",
        customerPhone: phoneNumber,
        providerResponse: response,
        status: "pending",
        paymentStatus: "pending",
        appointmentStatus: "pending_payment",
        collectionInitiatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return NextResponse.json({
      paymentId,
      transactionReference: payment.transactionReference,
      status: response.response_message || "PENDING",
      instructions: "Approve the Payaza payment prompt on your Ghana mobile phone. Your appointment will be confirmed after webhook verification.",
    });
  } catch (error) {
    console.error("Payaza Ghana Mobile Money initialization failed", error);
    return NextResponse.json({ error: "Unable to start Mobile Money payment." }, { status: 500 });
  }
}
