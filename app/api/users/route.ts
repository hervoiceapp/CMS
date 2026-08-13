import { NextResponse, type NextRequest } from "next/server";
import { listAllUsers, requireCmsAdmin } from "@/lib/admin";

export async function GET(request: NextRequest) {
  const auth = await requireCmsAdmin(request);
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const users = await listAllUsers();
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
