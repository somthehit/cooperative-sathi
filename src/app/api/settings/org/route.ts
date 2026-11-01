import { NextRequest, NextResponse } from "next/server";
import { OrgSettingsManager } from "@/lib/org-settings";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function GET() {
  try {
    const settings = OrgSettingsManager.getSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET /api/settings/org error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load organisation settings" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json(
        { error: "अनधिकृत पहुँच (Only Admin/Accountant can modify organisation settings)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "अमान्य डाटा" }, { status: 400 });
    }

    if (!body.nameNep || !body.nameNep.trim()) {
      return NextResponse.json(
        { error: "संस्थाको नाम (नेपाली) अनिवार्य छ" },
        { status: 400 }
      );
    }

    const updated = OrgSettingsManager.saveSettings(body);
    return NextResponse.json({
      success: true,
      settings: updated,
      message: "संस्थागत सेटिङ सफलतापूर्वक सुरक्षित भयो!",
    });
  } catch (error: any) {
    console.error("POST /api/settings/org error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save organisation settings" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN"])) {
      return NextResponse.json(
        { error: "अनधिकृत पहुँच (Only Admin can reset settings)" },
        { status: 403 }
      );
    }

    const resetData = OrgSettingsManager.resetToDefault();
    return NextResponse.json({
      success: true,
      settings: resetData,
      message: "सेटिङ पूर्ववत (Default) अवस्थामा रिसेट भयो!",
    });
  } catch (error: any) {
    console.error("DELETE /api/settings/org error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset settings" },
      { status: 500 }
    );
  }
}
