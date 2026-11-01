import { NextRequest, NextResponse } from "next/server";
import { OpeningSetupEngine } from "@/lib/opening-setup";
import { OrgSettingsManager } from "@/lib/org-settings";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "STATUS";

    // 1. Download Excel / CSV Template
    if (action === "TEMPLATE") {
      const buffer = await OpeningSetupEngine.generateCombinedOpeningTemplate();
      const filename = "nepal_coop_opening_balance_template.xlsx";

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. Fetch Setup Status & Scorecard
    const settings = OrgSettingsManager.getSettings();
    const draft = OpeningSetupEngine.getDraftWizard();
    const batches = OpeningSetupEngine.getStagingBatches();
    const activeBatch = OpeningSetupEngine.getActiveBatch();
    const scorecard = await OpeningSetupEngine.calculateReconciliationScorecard(draft, activeBatch);

    return NextResponse.json({
      success: true,
      status: settings.openingBalanceStatus || "NotStarted",
      draft,
      activeBatch,
      batches,
      scorecard,
      settings: {
        nameNep: settings.nameNep,
        regNo: settings.regNo,
        panNo: settings.panNo,
        fiscalYear: settings.fiscalYear,
        systemGoLiveDateBs: settings.systemGoLiveDateBs,
        systemGoLiveDateAd: settings.systemGoLiveDateAd,
        goLiveScenario: settings.goLiveScenario,
        suspenseLedgerBalance: settings.suspenseLedgerBalance,
        suspenseLedgerReason: settings.suspenseLedgerReason,
        savingsProducts: settings.savingsProducts,
        loanProducts: settings.loanProducts,
      },
    });
  } catch (error: any) {
    console.error("GET /api/opening-setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load opening setup data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authenticateRequest(req);
    // Enforce Admin-only access for setup modifications
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "प्रारम्भिक मौज्दात सेट-अप, परिमार्जन वा गो-लाइभ गर्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ। (Admin role required)",
        },
        { status: 403 }
      );
    }

    const contentType = req.headers.get("content-type") || "";

    // 1. Multipart File Upload for Staging Batch
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "अपलोडका लागि फाइल फेला परेन।" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const batch = await OpeningSetupEngine.processImportFile(
        buffer,
        file.name,
        user?.fullName || "ADMIN"
      );

      return NextResponse.json({
        success: true,
        message: `फाइल '${file.name}' सफलतापूर्वक स्टेज भयो! कुल ${batch.counts.members} सदस्य, ${batch.counts.shares} सेयर, ${batch.counts.savings} बचत, ${batch.counts.loans} कर्जा।`,
        batch,
      });
    }

    // JSON payload actions
    const body = await req.json();
    const { action } = body;

    // Action A: Save Wizard Draft
    if (action === "SAVE_DRAFT") {
      const updated = OpeningSetupEngine.saveDraftWizard(body.draft || {});
      const response = NextResponse.json({
        success: true,
        message: "ड्राफ्ट सफलतापूर्वक सुरक्षित भयो।",
        draft: updated,
      });
      response.cookies.set("coop_opening_status", "Draft", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      return response;
    }

    // Action B: Commit Opening Setup to Live DB
    if (action === "COMMIT_SETUP") {
      const draft = OpeningSetupEngine.getDraftWizard();
      const activeBatch = OpeningSetupEngine.getActiveBatch();

      const res = await OpeningSetupEngine.commitOpeningSetup({
        executedBy: user?.fullName || "ADMIN",
        draft,
        batch: activeBatch,
      });

      const response = NextResponse.json(res);
      if (res.success) {
        response.cookies.set("coop_opening_status", "Posted-Locked", {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
      }
      return response;
    }

    // Action C: Rollback / Reopen Setup
    if (action === "ROLLBACK_SETUP") {
      const { reason } = body;
      const res = await OpeningSetupEngine.rollbackOpeningSetup({
        adminUsername: user?.username || "admin",
        reason,
      });

      const response = NextResponse.json(res);
      if (res.success) {
        response.cookies.set("coop_opening_status", "Draft", {
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24,
        });
      }
      return response;
    }

    return NextResponse.json({ success: false, error: "अमान्य कार्य अनुरोध (Invalid action)" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/opening-setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process opening setup action" },
      { status: 500 }
    );
  }
}
