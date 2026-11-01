import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statement = await CoopExcelDB.getMemberStatement(id);
    return NextResponse.json({ success: true, ...statement });
  } catch (error: any) {
    console.error("GET statement error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve member statement" },
      { status: 404 }
    );
  }
}
