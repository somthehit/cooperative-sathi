import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT", "TELLER"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Unauthorized to post transaction)" }, { status: 403 });
    }

    const body = await req.json();
    const { date, type, amount, chequeNo, bankName, narration } = body;

    if (!type || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "कारोबार प्रकार र रकम अनिवार्य छ (Transaction type and amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postBankReconciliationTransaction({
      date: date || new Date().toISOString().split("T")[0],
      type,
      amount: parseFloat(amount),
      chequeNo,
      bankName,
      narration,
    });

    return NextResponse.json({
      success: true,
      message: "बैंक कारोबार / हिसाब मिलान सफलतापूर्वक प्रविष्टि भयो (Bank entry recorded successfully)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Bank recon error:", error);
    return NextResponse.json({ error: error.message || "Failed to post bank transaction" }, { status: 500 });
  }
}
