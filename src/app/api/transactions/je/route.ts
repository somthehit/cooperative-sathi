import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, roleAllowed } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    if (!user || !roleAllowed(user.role, ["ADMIN", "ACCOUNTANT"])) {
      return NextResponse.json(
        { error: "गोश्वारा भौचर प्रविष्टि गर्न लेखापाल वा प्रशासक अधिकार चाहिन्छ (Accountant or Admin required for JE)" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { date, particulars, lines, voucherType, expenseAccount, incomeAccount, amount, paymentMode, customEntries } = body;

    if (!particulars) {
      return NextResponse.json(
        { error: "भौचर विवरण / व्यहोरा (Particulars) अनिवार्य छ" },
        { status: 400 }
      );
    }

    if (lines && Array.isArray(lines)) {
      if (lines.length < 2) {
        return NextResponse.json(
          { error: "गोश्वारा भौचरमा कम्तीमा २ वटा हरफ (Lines) हुनुपर्दछ" },
          { status: 400 }
        );
      }

      let totalDr = 0;
      let totalCr = 0;
      for (const line of lines) {
        totalDr += Math.max(0, Number(line.drAmount) || 0);
        totalCr += Math.max(0, Number(line.crAmount) || 0);

        if (["10", "30", "110"].includes(line.accountCode) && !line.memberId) {
          return NextResponse.json(
            { error: `लेखा शीर्षक ${line.accountCode} को लागि सदस्य नं. अनिवार्य छ (Member ID required)` },
            { status: 400 }
          );
        }
      }

      if (Math.abs(totalDr - totalCr) > 0.001 || totalDr <= 0) {
        return NextResponse.json(
          {
            error: `गोश्वारा भौचर असन्तुलित छ: कुल डेबिट (रु. ${totalDr.toLocaleString()}) र कुल क्रेडिट (रु. ${totalCr.toLocaleString()}) बराबर हुनुपर्दछ (फरक: रु. ${Math.abs(totalDr - totalCr).toLocaleString()})`,
          },
          { status: 400 }
        );
      }

      const result = await CoopExcelDB.postJournalVoucher({
        date: date || new Date().toISOString().split("T")[0],
        particulars,
        lines,
      });

      return NextResponse.json({
        success: true,
        message: "बहु-हरफ गोश्वारा भौचर (Multi-Line Double-Entry JE) सफलतापूर्वक खातामा प्रविष्टि भयो",
        voucherNo: result.voucherNo,
      });
    }

    // Legacy shortcut fallback
    if (!amount && !customEntries) {
      return NextResponse.json(
        { error: "भौचर विवरण र रकम अनिवार्य छ (Particulars and amount required)" },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.postJournalVoucher({
      date: date || new Date().toISOString().split("T")[0],
      particulars,
      voucherType: voucherType || "EXPENSE",
      expenseAccount,
      incomeAccount,
      amount: amount ? parseFloat(amount) : 0,
      paymentMode: paymentMode === "BANK" ? "BANK" : "CASH",
      customEntries,
    });

    return NextResponse.json({
      success: true,
      message: "गोश्वारा भौचर (JE) सफलतापूर्वक खातामा प्रविष्टि भयो (Journal entry posted successfully)",
      voucherNo: result.voucherNo,
    });
  } catch (error: any) {
    console.error("Journal voucher error:", error);
    return NextResponse.json({ error: error.message || "Failed to post journal voucher" }, { status: 500 });
  }
}
