import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sheetIndex: string }> }
) {
  try {
    const { sheetIndex } = await params;
    const indexNum = parseInt(sheetIndex, 10);
    if (isNaN(indexNum) || indexNum < 1 || indexNum > 11) {
      return NextResponse.json({ error: "अमान्य खाता सूचकांक (Invalid sheet index 1-11)" }, { status: 400 });
    }

    const data = await CoopExcelDB.getKhataSheetData(indexNum);
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    console.error("GET khata error:", error);
    return NextResponse.json({ error: error.message || "Failed to load khata data" }, { status: 500 });
  }
}
