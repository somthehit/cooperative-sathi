import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data",
  "nepal_cooperative_4_khata_kyc_vba_system.xlsx"
);

export async function GET(req: NextRequest) {
  try {
    if (!fs.existsSync(EXCEL_PATH)) {
      return NextResponse.json({ error: "Excel file not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(EXCEL_PATH);
    const filename = `nepal_cooperative_4_khata_live_${new Date().toISOString().split("T")[0]}.xlsx`;

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Excel download error:", error);
    return NextResponse.json({ error: error.message || "Failed to download Excel file" }, { status: 500 });
  }
}
