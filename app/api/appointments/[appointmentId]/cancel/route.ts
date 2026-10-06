import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, verifyIdToken } from "@/lib/admin";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ appointmentId: string }> },
) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await verifyIdToken(token);
    const { appointmentId } = await context.params;
    const ref = getAdminFirestore().collection("appointments").doc(appointmentId);
    const snapshot = await ref.get();
    const appointment = snapshot.data();
    if (!snapshot.exists || !appointment || appointment.userId !== decoded.uid) {
      return NextResponse.json({ error: "Appointment not found." }, { status: 404 });
    }
    if (["completed", "cancelled", "declined"].includes(String(appointment.appointmentStatus || appointment.status))) {
      return NextResponse.json({ error: "Appointment cannot be cancelled in its current state." }, { status: 409 });
    }
    if (appointment.paymentStatus === "paid") {
      return NextResponse.json(
        { error: "Paid appointments require refund processing before cancellation." },
        { status: 409 },
      );
    }

    await ref.update({
      appointmentStatus: "cancelled",
      status: "cancelled",
      cancellationRequestedBy: decoded.uid,
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to cancel appointment." }, { status: 500 });
  }
}
