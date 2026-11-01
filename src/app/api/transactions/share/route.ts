import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT", "TELLER"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Unauthorized to post share transaction)" }, { status: 403 });
    }

    const body = await req.json();
    const { memberId, type, shareUnits, amount, paymentMode, date, narration } = body;

    if (!memberId || !type || !shareUnits) {
      return NextResponse.json(
        { error: "सदस्य नं., कारोबार प्रकार, र शेयर कित्ता अनिवार्य छ (Member ID, type, units required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postShareTransaction({
      memberId,
      type: type === "RETURN" ? "RETURN" : "ISSUE",
      shareUnits: parseInt(shareUnits, 10),
      amount: amount ? parseFloat(amount) : undefined,
      paymentMode: paymentMode === "BANK" ? "BANK" : "CASH",
      date: date || new Date().toISOString().split("T")[0],
      narration: narration || "",
    });

    return NextResponse.json({
      success: true,
      message: "शेयर कारोबार सफलतापूर्वक प्रविष्टि गरियो (Share transaction posted successfully)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Share transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post share transaction" }, { status: 500 });
  }
}
