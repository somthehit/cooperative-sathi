import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { authenticateRequest, DEFAULT_FALLBACK_USER } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    let user = await authenticateRequest(req);
    // Allow fallback in dev mode if session cookie is not set
    if (!user && process.env.NODE_ENV === "development") {
      user = DEFAULT_FALLBACK_USER;
    }

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "कारोबार रिसेट तथा मेटाउने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ। (Admin permission required)",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      reason,
      confirmPhrase,
      resetOpeningBalances,
      clearOpeningStaging,
      clearOpeningDraft,
    } = body;

    // Safety confirmation phrase verification
    const normalizedPhrase = String(confirmPhrase || "").trim().toUpperCase();
    if (
      normalizedPhrase !== "RESET-CONFIRM" &&
      normalizedPhrase !== "RESET" &&
      normalizedPhrase !== "सबै कारोबार मेटाउनुहोस्"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "पुष्टि वाक्यांश (Confirmation Phrase) मिलेन। कृपया 'RESET-CONFIRM' वा 'सबै कारोबार मेटाउनुहोस्' लेख्नुहोस्।",
        },
        { status: 400 }
      );
    }

    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: "कृपया कम्तिमा १० अक्षरको आधिकारिक कारण (Mandatory Reason) उल्लेख गर्नुहोस्।",
        },
        { status: 400 }
      );
    }

    const result = await CoopExcelDB.resetAllTransactionsExceptMembers({
      adminUsername: `${user.fullName} (${user.username})`,
      reason: reason.trim(),
      resetOpeningBalances: resetOpeningBalances ?? true,
      clearOpeningStaging: clearOpeningStaging ?? true,
      clearOpeningDraft: clearOpeningDraft ?? true,
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      backupFileName: result.backupFileName,
      membersPreservedCount: result.membersPreservedCount,
      details: result.details,
    });
  } catch (error: any) {
    console.error("Reset transactions error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "कारोबार रिसेट गर्दा अप्रत्याशित समस्या आयो।",
      },
      { status: 500 }
    );
  }
}
