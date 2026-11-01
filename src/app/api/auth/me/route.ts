import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getOrgSettings } from "@/lib/org-settings";

export async function GET(req: NextRequest) {
  const user = await authenticateRequest(req);
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const settings = getOrgSettings();
  const openingStatus = settings.openingBalanceStatus || "NotStarted";

  const response = NextResponse.json({
    authenticated: true,
    user: {
      userId: user.userId,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
    },
    openingStatus,
  });

  // Ensure client cookie matches current server settings
  response.cookies.set("coop_opening_status", openingStatus, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
