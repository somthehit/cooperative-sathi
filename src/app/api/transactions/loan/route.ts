import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT", "TELLER"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Unauthorized to post loan transaction)" }, { status: 403 });
    }

    const body = await req.json();
    const {
      memberId,
      loanCategory,
      loanAccNo,
      type,
      principalAmount,
      interestAmount,
      interestRate,
      collateral,
      paymentMode,
      date,
      narration,
    } = body;

    if (!memberId || !principalAmount || parseFloat(principalAmount) <= 0) {
      return NextResponse.json(
        { error: "सदस्य नं. र साँवा रकम अनिवार्य छ (Member ID and principal amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postLoanTransaction({
      memberId,
      loanCategory: loanCategory || "110.1 कृषि कर्जा",
      loanAccNo: loanAccNo || undefined,
      type: type === "REPAYMENT" ? "REPAYMENT" : "DISBURSEMENT",
      principalAmount: parseFloat(principalAmount),
      interestAmount: interestAmount ? parseFloat(interestAmount) : 0,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      collateral: collateral || "",
      paymentMode: paymentMode === "BANK" ? "BANK" : "CASH",
      date: date || new Date().toISOString().split("T")[0],
      narration: narration || "",
    });

    return NextResponse.json({
      success: true,
      message: "ऋण कारोबार सफलतापूर्वक दर्ता भयो (Loan transaction posted successfully)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Loan transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post loan transaction" }, { status: 500 });
  }
}
