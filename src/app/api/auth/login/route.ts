import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { signSessionToken } from "@/lib/auth";
import { getOrgSettings } from "@/lib/org-settings";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "प्रयोगकर्ता नाम र पासवर्ड आवश्यक छ (Username and password required)" },
        { status: 400 }
      );
    }

    const user = await CoopExcelDB.authenticateUser(username, password);
    if (!user) {
      return NextResponse.json(
        { error: "गलत प्रयोगकर्ता नाम वा पासवर्ड (Invalid username or password)" },
        { status: 401 }
      );
    }

    const settings = getOrgSettings();
    const openingStatus = settings.openingBalanceStatus || "NotStarted";
    const isOpeningComplete = openingStatus === "Posted-Locked";

    // If opening balance setup is not complete and user is ADMIN -> must go to /opening-setup first
    let redirectTo = "/dashboard";
    if (!isOpeningComplete) {
      redirectTo = "/opening-setup";
    }

    const token = await signSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      openingStatus,
      redirectTo,
    });

    response.cookies.set("coop_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    response.cookies.set("coop_opening_status", openingStatus, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({ error: error.message || "Login failed" }, { status: 500 });
  }
}
