import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Only Admin or Accountant can record assets)" }, { status: 403 });
    }

    const body = await req.json();
    const { date, type, assetName, assetCategory, amount, depreciationRate, paymentMode, narration } = body;

    if (!assetName || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "सम्पत्तिको विवरण र रकम अनिवार्य छ (Asset name and amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postAssetTransaction({
      date: date || new Date().toISOString().split("T")[0],
      type: type === "DEPRECIATION" ? "DEPRECIATION" : "PURCHASE",
      assetName,
      assetCategory,
      amount: parseFloat(amount),
      depreciationRate: depreciationRate ? parseFloat(depreciationRate) : undefined,
      paymentMode: paymentMode === "CASH" ? "CASH" : "BANK",
      narration,
    });

    return NextResponse.json({
      success: true,
      message: type === "DEPRECIATION"
        ? "स्थिर सम्पत्ति ह्रासकट्टी सफलतापूर्वक प्रविष्टि भयो (Asset depreciation recorded)"
        : "स्थिर सम्पत्ति खरिद सफलतापूर्वक प्रविष्टि भयो (Asset purchase recorded)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Asset transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post asset transaction" }, { status: 500 });
  }
}
