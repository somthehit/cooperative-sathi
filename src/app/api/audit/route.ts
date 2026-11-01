import { NextRequest, NextResponse } from "next/server";
import { CoopExcelDB } from "@/lib/excel-db";
import { FiscalAuditEngine } from "@/lib/fiscal-audit";

export async function GET(req: NextRequest) {
  try {
    const activeFY = FiscalAuditEngine.getActiveFiscalYear();
    const allFYs = FiscalAuditEngine.getFiscalYearsList();
    const auditData = await CoopExcelDB.getYearEndAuditData();
    const validation = await FiscalAuditEngine.runPreClosingValidation();
    const proposedAdjustments = await FiscalAuditEngine.generateProposedAdjustments();
    const appropriation = FiscalAuditEngine.calculateStatutoryAppropriation(
      auditData.incomeStatement.netSurplus
    );

    return NextResponse.json({
      success: true,
      activeFY,
      allFYs,
      validation,
      financialStatements: {
        trialBalance: auditData.trialBalance,
        balanceSheet: auditData.balanceSheet,
        incomeStatement: auditData.incomeStatement,
        memberReconciliation: auditData.memberReconciliation,
      },
      proposedAdjustments,
      appropriation,
      suggestions: {
        nextFiscalYear: auditData.nextFiscalYearSuggestion,
        nextFiscalYearStart: auditData.nextFiscalYearStartSuggestion,
        nextFiscalYearEnd: auditData.nextFiscalYearEndSuggestion,
      },
      orgSettings: auditData.orgSettings,
    });
  } catch (error: any) {
    console.error("GET audit error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load audit data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    // Action 1: Post Approved Adjustments
    if (action === "POST_ADJUSTMENTS") {
      const { vouchers, postedBy } = body;
      const res = await FiscalAuditEngine.postAdjustmentVouchers(
        vouchers || [],
        postedBy || "ADMIN (admin)"
      );
      return NextResponse.json(res);
    }

    // Action 2: Audit Review & Lock
    if (action === "LOCK_YEAR") {
      const { fyCode, auditorName, auditorRegNo, auditDate, auditRemarks, lockedBy } = body;
      const res = await FiscalAuditEngine.lockFiscalYear({
        fyCode: fyCode || "२०८३/८४",
        auditorName: auditorName || "आधिकारिक लेखापरीक्षक",
        auditorRegNo: auditorRegNo || "COP-AUD-4512",
        auditDate: auditDate || new Date().toISOString().split("T")[0],
        auditRemarks: auditRemarks || "लेखापरीक्षण सम्पन्न भई वित्तीय प्रतिवेदनहरू प्रमाणित गरियो।",
        lockedBy: lockedBy || "ADMIN",
      });
      return NextResponse.json(res);
    }

    // Action 3: Close Year & Rollover Opening Balance
    if (action === "ROLLOVER") {
      const {
        auditorName,
        auditorRegNo,
        auditDate,
        auditRemarks,
        currentFiscalYear,
        nextFiscalYear,
        nextFiscalYearStart,
        nextFiscalYearEnd,
        statutoryAppropriation,
        executedBy,
      } = body;

      // Programmatic Pre-Closing Guard: TB and BS must balance
      const validation = await FiscalAuditEngine.runPreClosingValidation();
      if (!validation.canProceed) {
        const failedMessages = validation.checks
          .filter((c) => c.status === "FAILED")
          .map((c) => c.titleNep)
          .join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `लेखापरीक्षण बन्द गर्न सकिएन! निम्न जाँचरूपहरू असफल छन्: ${failedMessages}`,
          },
          { status: 400 }
        );
      }

      const curFY = currentFiscalYear || FiscalAuditEngine.getActiveFiscalYear().fyCode || "२०८३/८४";
      const nextFY = nextFiscalYear || "२०८४/८५";

      const res = await CoopExcelDB.executeYearEndRollover({
        auditorName: auditorName || "आधिकारिक लेखापरीक्षक",
        auditorRegNo: auditorRegNo || "AUD-01",
        auditDate: auditDate || new Date().toISOString().split("T")[0],
        auditRemarks: auditRemarks || "वर्ष अन्त्य लेखापरीक्षण सम्पन्न गरी प्रारम्भिक मौज्दात नयाँ वर्षमा सारिएको।",
        currentFiscalYear: curFY,
        nextFiscalYear: nextFY,
        nextFiscalYearStart: nextFiscalYearStart || "२०८४/०४/०१",
        nextFiscalYearEnd: nextFiscalYearEnd || "२०८५/०३/३१",
        statutoryAppropriation: statutoryAppropriation || {
          generalReserve: 0,
          patronageRefund: 0,
          educationFund: 0,
          staffBonus: 0,
          retainedEarnings: 0,
        },
      });

      // Update FiscalYears tracking
      FiscalAuditEngine.updateFiscalYear({
        fyCode: curFY,
        status: "CLOSED",
        closedBy: executedBy || "ADMIN",
        closedAt: new Date().toISOString(),
        auditorName,
        auditorRegNo,
        auditRemarks,
        preCloseBackupFile: res.backupFile,
      });

      FiscalAuditEngine.updateFiscalYear({
        fyCode: nextFY,
        startBs: nextFiscalYearStart || "२०८४/०४/०१",
        endBs: nextFiscalYearEnd || "२०८५/०३/३१",
        status: "OPEN",
      });

      await FiscalAuditEngine.logAuditAction(
        "EXECUTE_YEAR_END_ROLLOVER",
        `आर्थिक वर्ष ${curFY} बन्द गरी नयाँ आ.व. ${nextFY} प्रारम्भ गरियो। प्रारम्भिक सम्पत्ति: रु. ${res.openingBalances.assets.toLocaleString()}`,
        executedBy || "ADMIN"
      );

      return NextResponse.json(res);
    }

    // Action 4: Rollback / Reopen Year
    if (action === "ROLLBACK") {
      const { fyCode, adminUsername, user, reason } = body;
      const allFYs = FiscalAuditEngine.getFiscalYearsList();
      const targetFY = fyCode || allFYs.filter((f) => f.status === "CLOSED").pop()?.fyCode || "२०८३/८४";
      const res = await FiscalAuditEngine.rollbackFiscalYear({
        fyCode: targetFY,
        adminUsername: adminUsername || user || "ADMIN",
        reason,
      });
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "अमान्य कार्य अनुरोध (Invalid action)" }, { status: 400 });
  } catch (error: any) {
    console.error("POST audit error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute audit action" },
      { status: 500 }
    );
  }
}
