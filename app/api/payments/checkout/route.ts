import { NextResponse } from "next/server";
import { getAdminFirestore, verifyIdToken } from "@/lib/admin";
import { getPayazaPublicKey, getPayazaMode } from "@/lib/payaza";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await verifyIdToken(token);
    const body = (await request.json()) as { paymentId?: string };
    const paymentId = body.paymentId?.trim();
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId." }, { status: 400 });

    const payment = await getAdminFirestore().collection("payments").doc(paymentId).get();
    const data = payment.data();
    if (!payment.exists || !data || data.userId !== decoded.uid || data.paymentStatus !== "pending") {
      return NextResponse.json({ error: "Payment session not found." }, { status: 404 });
    }

    return NextResponse.json({
      merchantKey: getPayazaPublicKey(),
      connectionMode: getPayazaMode() === "test" ? "Test" : "Live",
      amount: data.amount,
      currency: data.currency,
      transactionReference: data.transactionReference,
      customer: {
        email: data.customerEmail,
        firstName: data.customerFirstName,
        lastName: data.customerLastName,
        phone: data.customerPhone,
      },
      additionalDetails: {
        paymentId,
        purpose: "appointment",
      },
    });
  } catch (error) {
    console.error("Payaza checkout session failed", error);
    return NextResponse.json({ error: "Unable to load checkout." }, { status: 500 });
  }
}
