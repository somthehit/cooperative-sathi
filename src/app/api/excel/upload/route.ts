import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data",
  "nepal_cooperative_4_khata_kyc_vba_system.xlsx"
);
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN"])) {
      return NextResponse.json({ error: "फाइल अपलोड गर्न मुख्य प्रशासक (Admin) अधिकार चाहिन्छ" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "कृपया मान्य एक्सेल फाइल छनोट गर्नुहोस् (.xlsx)" }, { status: 400 });
    }

    if (!file.name.endsWith(".xlsx")) {
      return NextResponse.json({ error: "केवल .xlsx ढाँचाको फाइल मात्र समर्थित छ" }, { status: 400 });
    }

    // Backup current before replacing
    if (fs.existsSync(EXCEL_PATH)) {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const backupPath = path.join(BACKUPS_DIR, `pre_upload_backup_${Date.now()}.xlsx`);
      fs.copyFileSync(EXCEL_PATH, backupPath);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let written = false;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        fs.writeFileSync(EXCEL_PATH, buffer);
        written = true;
        break;
      } catch (err: any) {
        if ((err?.code === "EBUSY" || err?.message?.includes("busy or locked")) && attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          continue;
        }
        if (err?.code === "EBUSY" || err?.message?.includes("busy or locked")) {
          return NextResponse.json(
            {
              error:
                "एक्सेल डाटाबेस फाइल Microsoft Excel वा अन्य सफ्टवेयरमा खुला रहेकोले प्रतिस्थापन गर्न सकिएन (EBUSY)। कृपया पहिले Excel बन्द गरेर पुनः अपलोड गर्नुहोस्।",
            },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: "एक्सेल डाटाबेस फाइल सफलतापूर्वक प्रतिस्थापन/अपलोड गरियो (Excel database uploaded successfully)",
    });
  } catch (error: any) {
    console.error("Excel upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload Excel file" }, { status: 500 });
  }
}
