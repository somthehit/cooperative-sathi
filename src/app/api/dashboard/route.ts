import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    // Allow reading dashboard even if guest or logged in, but provide user role if present
    const data = await CoopExcelDB.getDashboardData();
    return NextResponse.json({
      success: true,
      currentUser: user,
      ...data,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: error.message || "Failed to load dashboard data" }, { status: 500 });
  }
}
