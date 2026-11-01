import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT", "TELLER"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Unauthorized to post saving transaction)" }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, savingType, type, amount, interestRate, paymentMode, date, narration } = body;

    if (!memberId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "सदस्य नं. र बचत रकम अनिवार्य छ (Member ID and valid amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postSavingTransaction({
      memberId,
      savingType: savingType || "30.1 नियमित बचत",
      type: type === "WITHDRAWAL" ? "WITHDRAWAL" : "DEPOSIT",
      amount: parseFloat(amount),
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      paymentMode: paymentMode === "BANK" ? "BANK" : "CASH",
      date: date || new Date().toISOString().split("T")[0],
      narration: narration || "",
    });

    return NextResponse.json({
      success: true,
      message: "बचत कारोबार सफलतापूर्वक दर्ता भयो (Savings transaction posted successfully)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Saving transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post saving transaction" }, { status: 500 });
  }
}
