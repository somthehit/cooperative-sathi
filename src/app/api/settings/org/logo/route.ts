import { NextRequest, NextResponse } from "next/server";
import { OrgSettingsManager } from "@/lib/org-settings";
import { authenticateRequest, roleAllowed } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN"])) {
      return NextResponse.json(
        { error: "अनधिकृत पहुँच (Only Admin can upload organisation logo)" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("logo") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "लोगो फाइल छनोट गर्नुहोस्" }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.name) || ".png";
    const filename = `org_logo_${Date.now()}${ext}`;
    const filePath = path.join(uploadsDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const logoUrl = `/uploads/${filename}`;
    const updated = OrgSettingsManager.saveSettings({ logoUrl });

    return NextResponse.json({
      success: true,
      logoUrl,
      settings: updated,
      message: "संस्थाको लोगो सफलतापूर्वक अपलोड भयो!",
    });
  } catch (error: any) {
    console.error("Logo upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload logo" },
      { status: 500 }
    );
  }
}
