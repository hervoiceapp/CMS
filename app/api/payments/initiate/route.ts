import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, verifyIdToken } from "@/lib/admin";
import {
  PAYAZA_CURRENCY,
  createPayazaReference,
  getAppointmentAmountGhs,
  getPayazaMode,
  getPayazaPublicKey,
  normalizeGhanaPhone,
} from "@/lib/payaza";

export const runtime = "nodejs";

const ALLOWED_DURATIONS = new Set(["30min", "45min", "1hour"]);
const ALLOWED_SESSION_TYPES = new Set(["Online", "Physical"]);

async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    return await verifyIdToken(token);
  } catch {
    return null;
  }
}

function readString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const decoded = await authenticate(request);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const doctorId = readString(body, "doctorId");
    const doctorName = readString(body, "doctorName");
    const doctorTitle = readString(body, "doctorTitle");
    const doctorImage = readString(body, "doctorImage") || null;
    const date = readString(body, "date");
    const time = readString(body, "time");
    const duration = readString(body, "duration");
    const sessionType = readString(body, "sessionType");
    const notes = readString(body, "notes");

    if (!doctorId || !doctorName || !doctorTitle || !date || !time) {
      return NextResponse.json({ error: "Incomplete appointment details." }, { status: 400 });
    }
    if (!ALLOWED_DURATIONS.has(duration) || !ALLOWED_SESSION_TYPES.has(sessionType)) {
      return NextResponse.json({ error: "Unsupported appointment option." }, { status: 400 });
    }
    if (!Number.isFinite(new Date(date).getTime())) {
      return NextResponse.json({ error: "Invalid appointment date." }, { status: 400 });
    }

    const db = getAdminFirestore();
    const profile = await db.collection("users").doc(decoded.uid).get();
    const profileData = profile.data() ?? {};
    const customerEmail = decoded.email || String(profileData.email || "");
    const rawPhone = String(profileData.phoneNumber || "").trim();
    if (!rawPhone) {
      return NextResponse.json({ error: "A Ghana mobile number is required for payment." }, { status: 400 });
    }
    const customerPhone = normalizeGhanaPhone(rawPhone);
    const fullName = String(profileData.fullName || decoded.name || "Speak up Mama user").trim();
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(" ") || firstName;
    if (!customerEmail) {
      return NextResponse.json({ error: "A verified email is required for payment." }, { status: 400 });
    }

    const amountGhs = getAppointmentAmountGhs();
    const transactionReference = createPayazaReference();
    const paymentRef = db.collection("payments").doc(transactionReference);
    const appointmentRef = db.collection("appointments").doc();
    const payment = {
      userId: decoded.uid,
      purpose: "appointment",
      status: "initialized",
      paymentStatus: "pending",
      appointmentStatus: "pending_payment",
      provider: "payaza",
      transactionReference,
      amount: amountGhs,
      currency: PAYAZA_CURRENCY,
      customerEmail,
      customerFirstName: firstName,
      customerLastName: lastName,
      customerPhone,
      appointmentId: appointmentRef.id,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const appointment = {
      userId: decoded.uid,
      doctorId,
      doctorName,
      doctorTitle,
      doctorImage,
      date,
      time,
      duration,
      sessionType,
      notes: notes.slice(0, 2000),
      paymentId: transactionReference,
      paymentStatus: "pending",
      appointmentStatus: "pending_payment",
      status: "pending_payment",
      amount: amountGhs,
      currency: PAYAZA_CURRENCY,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const batch = db.batch();
    batch.create(paymentRef, payment);
    batch.create(appointmentRef, appointment);
    await batch.commit();

    return NextResponse.json({
      paymentId: transactionReference,
      appointmentId: appointmentRef.id,
      transactionReference,
      amount: amountGhs,
      currency: PAYAZA_CURRENCY,
      merchantKey: getPayazaPublicKey(),
      connectionMode: getPayazaMode() === "test" ? "Test" : "Live",
      customer: {
        email: customerEmail,
        firstName,
        lastName,
        phone: customerPhone,
      },
    });
  } catch (error) {
    console.error("Payaza payment initialization failed", error);
    return NextResponse.json({ error: "Unable to start payment." }, { status: 500 });
  }
}
