import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json({ error: "अनधिकृत पहुँच (Only Admin or Accountant can record grants)" }, { status: 403 });
    }

    const body = await req.json();
    const { date, type, donorAgency, projectName, amount, paymentMode, narration } = body;

    if (!donorAgency || !projectName || amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { error: "दातृ/अनुदान निकाय, आयोजना नाम र रकम अनिवार्य छ (Donor, project, and amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postAnudanTransaction({
      date: date || new Date().toISOString().split("T")[0],
      type: type === "OPERATIONAL_GRANT" ? "OPERATIONAL_GRANT" : "CAPITAL_GRANT",
      donorAgency,
      projectName,
      amount: parseFloat(amount),
      paymentMode: paymentMode === "CASH" ? "CASH" : "BANK",
      narration,
    });

    return NextResponse.json({
      success: true,
      message: type === "OPERATIONAL_GRANT"
        ? "चालू अनुदान आम्दानी सफलतापूर्वक प्रविष्टि भयो (Operational grant recorded in Income 160.10)"
        : "पुँजीगत अनुदान सफलतापूर्वक प्रविष्टि भयो (Capital grant recorded in Liability Hisab 50)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Anudan transaction error:", error);
    return NextResponse.json({ error: error.message || "Failed to post anudan transaction" }, { status: 500 });
  }
}
