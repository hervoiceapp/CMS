import { NextResponse } from "next/server";
import { getAdminFirestore, verifyIdToken } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ paymentId: string }> },
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await verifyIdToken(token);
    const { paymentId } = await context.params;
    const snapshot = await getAdminFirestore().collection("payments").doc(paymentId).get();
    const data = snapshot.data();
    if (!snapshot.exists || !data || data.userId !== decoded.uid) {
      return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    }
    return NextResponse.json({
      paymentId,
      paymentStatus: data.paymentStatus || "pending",
      appointmentStatus: data.appointmentStatus || "pending_payment",
      appointmentId: data.appointmentId || null,
      amount: data.amount,
      currency: data.currency,
    });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve payment status." }, { status: 500 });
  }
}
