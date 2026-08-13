import { NextResponse, type NextRequest } from "next/server";
import { deleteUserById, requireCmsAdmin, setRole, setUserDisabled } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> },
) {
  if (!(await requireCmsAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { uid } = await context.params;
  let body: { role?: "admin" | "medical" | null; disabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  try {
    if (typeof body.disabled === "boolean") {
      await setUserDisabled(uid, body.disabled);
    }
    if (body.role === "admin" || body.role === "medical" || body.role === null) {
      await setRole(uid, body.role);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> },
) {
  if (!(await requireCmsAdmin(request))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { uid } = await context.params;
  try {
    await deleteUserById(uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
