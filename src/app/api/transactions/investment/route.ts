import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Only Admin or Accountant can record investments)" }, { status: 403 });
    }

    const body = await req.json();
    const { date, type, investmentTitle, institutionName, amount, interestRate, paymentMode, narration } = body;

    if (!investmentTitle || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "लगानी शीर्षक र रकम अनिवार्य छ (Investment title and amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postInvestmentTransaction({
      date: date || new Date().toISOString().split("T")[0],
      type: type || "NEW_INVESTMENT",
      investmentTitle,
      institutionName,
      amount: parseFloat(amount),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      paymentMode: paymentMode === "CASH" ? "CASH" : "BANK",
      narration,
    });

    return NextResponse.json({
      success: true,
      message: type === "RETURN_MATURITY"
        ? "लगानी सावाँ फिर्ता सफलतापूर्वक प्रविष्टि भयो (Investment maturity returned)"
        : type === "DIVIDEND_INTEREST"
        ? "लगानी लाभांश/ब्याज आम्दानी प्रविष्टि भयो (Investment dividend/interest recorded)"
        : "नयाँ लगानी हिसाब १०० मा सफलतापूर्वक प्रविष्टि भयो (New investment recorded)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Investment transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post investment transaction" }, { status: 500 });
  }
}
