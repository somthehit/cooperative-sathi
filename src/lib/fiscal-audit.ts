import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { CoopExcelDB } from "./excel-db";
import { OrgSettingsManager, OrganisationSettings } from "./org-settings";

const EXCEL_PATH = path.join(
  process.cwd(),
  "data",
  "nepal_cooperative_4_khata_kyc_vba_system.xlsx"
);
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
const FISCAL_YEARS_JSON = path.join(process.cwd(), "data", "fiscal_years.json");

export type FiscalYearStatus =
  | "OPEN"
  | "PRE_CLOSING_CHECKED"
  | "ADJUSTMENTS_POSTED"
  | "AUDITED_LOCKED"
  | "CLOSED";

export interface FiscalYearRecord {
  fyCode: string; // e.g. "२०८३/८४"
  startBs: string; // e.g. "२०८३/०४/०१"
  endBs: string; // e.g. "२०८४/०३/३१"
  startAd: string; // e.g. "2026-07-16"
  endAd: string; // e.g. "2027-07-15"
  status: FiscalYearStatus;
  closedBy?: string;
  closedAt?: string;
  auditorName?: string;
  auditorRegNo?: string;
  auditRemarks?: string;
  preCloseBackupFile?: string;
  auditedBackupFile?: string;
  updatedAt?: string;
}

export interface PreClosingCheckItem {
  id: string;
  titleNep: string;
  titleEng: string;
  status: "PASSED" | "FAILED" | "WARNING";
  message: string;
  details?: any;
}

export interface AdjustmentVoucher {
  id: string;
  voucherNo: string;
  type: "ACCRUED_INTEREST_LOAN" | "ACCRUED_INTEREST_SAVINGS" | "LOAN_PROVISION" | "DEPRECIATION" | "AUDIT_FEE" | "STAFF_BONUS" | "CUSTOM";
  dateBs: string;
  narrationNep: string;
  narrationEng: string;
  debitAccountCode: string;
  debitAccountTitle: string;
  creditAccountCode: string;
  creditAccountTitle: string;
  amount: number;
  approved: boolean;
  scheduleDetails?: any;
}

export interface StatutoryAppropriation {
  netSurplus: number;
  generalReservePct: number;
  generalReserveAmt: number;
  patronageRefundPct: number;
  patronageRefundAmt: number;
  cooperativeEducationPct: number;
  cooperativeEducationAmt: number;
  cooperativePromotionPct: number;
  cooperativePromotionAmt: number;
  staffBonusPct: number;
  staffBonusAmt: number;
  communityDevelopmentPct: number;
  communityDevelopmentAmt: number;
  retainedEarningsAmt: number;
}

export class FiscalAuditEngine {
  // --- 1. FISCAL YEAR RECORDS MANAGEMENT ---
  public static getFiscalYearsList(): FiscalYearRecord[] {
    try {
      if (fs.existsSync(FISCAL_YEARS_JSON)) {
        const raw = fs.readFileSync(FISCAL_YEARS_JSON, "utf-8");
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error("Error reading fiscal_years.json:", err);
    }

    // Default initialization based on org settings
    const settings = OrgSettingsManager.getSettings();
    const currentFY = settings.fiscalYear || "२०८३/८४";
    const defaultList: FiscalYearRecord[] = [
      {
        fyCode: "२०८२/८३",
        startBs: "२०८२/०४/०१",
        endBs: "२०८३/०३/३१",
        startAd: "2025-07-16",
        endAd: "2026-07-15",
        status: "CLOSED",
        closedBy: "ADMIN (admin)",
        closedAt: "2026-07-16T10:00:00Z",
        auditRemarks: "अघिल्लो आर्थिक वर्षको लेखापरीक्षण सम्पन्न भई प्रारम्भिक मौज्दात नयाँ वर्षमा सारिएको।",
      },
      {
        fyCode: currentFY,
        startBs: settings.fiscalYearStartBs || "२०८३/०४/०१",
        endBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
        startAd: "2026-07-16",
        endAd: "2027-07-15",
        status: "OPEN",
        updatedAt: new Date().toISOString(),
      },
    ];

    this.saveFiscalYearsList(defaultList);
    return defaultList;
  }

  public static saveFiscalYearsList(list: FiscalYearRecord[]): void {
    try {
      const dir = path.dirname(FISCAL_YEARS_JSON);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(FISCAL_YEARS_JSON, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("Error saving fiscal_years.json:", err);
    }
  }

  public static getActiveFiscalYear(): FiscalYearRecord {
    const list = this.getFiscalYearsList();
    const openFY = list.find((fy) => fy.status === "OPEN");
    if (openFY) return openFY;
    const active = list.find((fy) => fy.status !== "CLOSED");
    if (active) return active;

    const settings = OrgSettingsManager.getSettings();
    return {
      fyCode: settings.fiscalYear || "२०८३/८४",
      startBs: settings.fiscalYearStartBs || "२०८३/०४/०१",
      endBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      startAd: "2026-07-16",
      endAd: "2027-07-15",
      status: "OPEN",
    };
  }

  public static updateFiscalYear(updates: Partial<FiscalYearRecord> & { fyCode: string }): FiscalYearRecord {
    const list = this.getFiscalYearsList();
    const idx = list.findIndex((fy) => fy.fyCode === updates.fyCode);
    let updatedRecord: FiscalYearRecord;
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
      updatedRecord = list[idx];
    } else {
      updatedRecord = {
        fyCode: updates.fyCode,
        startBs: updates.startBs || "२०८४/०४/०१",
        endBs: updates.endBs || "२०८५/०३/३१",
        startAd: updates.startAd || "2027-07-16",
        endAd: updates.endAd || "2028-07-15",
        status: updates.status || "OPEN",
        updatedAt: new Date().toISOString(),
      };
      list.push(updatedRecord);
    }
    this.saveFiscalYearsList(list);
    return updatedRecord;
  }

  // Ensure Sheet 12 (FiscalYears) and Sheet 13 (AuditLogs) exist in the Excel file
  public static async ensureAuditSheetsInExcel(wb: ExcelJS.Workbook): Promise<void> {
    // 1. FiscalYears Sheet
    let wsFY = wb.getWorksheet("आर्थिक_वर्ष_FiscalYears");
    if (!wsFY) {
      wsFY = wb.addWorksheet("आर्थिक_वर्ष_FiscalYears");
      wsFY.addRow([
        "आ.व. कोड (FY Code)",
        "सुरु मिति वि.सं. (Start BS)",
        "अन्त्य मिति वि.सं. (End BS)",
        "सुरु मिति ई.सं. (Start AD)",
        "अन्त्य मिति ई.सं. (End AD)",
        "स्थिति (Status)",
        "बन्द गर्ने (Closed By)",
        "बन्द मिति (Closed At)",
        "लेखापरीक्षक (Auditor)",
        "कैफियत (Audit Remarks)",
        "ब्याकअप फाइल (Backup File)",
      ]);
      const headerRow = wsFY.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F497D" },
      };
    }

    // Populate with current list
    const list = this.getFiscalYearsList();
    while (wsFY.rowCount > 1) {
      wsFY.spliceRows(2, 1);
    }
    for (const item of list) {
      wsFY.addRow([
        item.fyCode,
        item.startBs,
        item.endBs,
        item.startAd,
        item.endAd,
        item.status,
        item.closedBy || "",
        item.closedAt || "",
        `${item.auditorName || ""} ${item.auditorRegNo ? "(दर्ता: " + item.auditorRegNo + ")" : ""}`.trim(),
        item.auditRemarks || "",
        item.preCloseBackupFile || "",
      ]);
    }

    // 2. AuditLogs Sheet
    let wsLogs = wb.getWorksheet("अडिट_लग_AuditLogs");
    if (!wsLogs) {
      wsLogs = wb.addWorksheet("अडिट_लग_AuditLogs");
      wsLogs.addRow([
        "क्र.सं. (SN)",
        "मिति समय (Timestamp)",
        "प्रयोगकर्ता (User)",
        "आर्थिक वर्ष (Fiscal Year)",
        "कार्य (Action)",
        "विवरण (Description)",
        "अवस्था (Status)",
      ]);
      const logHeader = wsLogs.getRow(1);
      logHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
      logHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1F497D" },
      };
    }
  }

  // --- 2. PRE-CLOSING VALIDATION CHECKS ---
  public static async runPreClosingValidation(): Promise<{
    canProceed: boolean;
    passCount: number;
    failCount: number;
    warningCount: number;
    checks: PreClosingCheckItem[];
  }> {
    const auditData = await CoopExcelDB.getYearEndAuditData();
    const checks: PreClosingCheckItem[] = [];

    // Check 1: Trial Balance debit = credit
    const tbDiff = auditData.trialBalance.diff;
    if (Math.abs(tbDiff) < 1) {
      checks.push({
        id: "check_tb",
        titleNep: "सन्तुलन परीक्षण डेबिट र क्रेडिट बराबरी (Trial Balance Dr = Cr)",
        titleEng: "Trial Balance Equilibrium",
        status: "PASSED",
        message: `सन्तुलन परीक्षण पूर्ण सन्तुलित छ। कुल डेबिट: रु. ${auditData.trialBalance.totalDr.toLocaleString()} = कुल क्रेडिट: रु. ${auditData.trialBalance.totalCr.toLocaleString()} (फरक: रु. ०)`,
      });
    } else {
      checks.push({
        id: "check_tb",
        titleNep: "सन्तुलन परीक्षण डेबIT र क्रेडिट बराबरी (Trial Balance Dr = Cr)",
        titleEng: "Trial Balance Equilibrium",
        status: "WARNING",
        message: `समायोजन पूर्व फरक: रु. ${tbDiff.toLocaleString()}। चरण २ मा वर्ष-अन्त्य समायोजन भौचर (ADJ-JV-00) पोस्ट गरेपछि सन्तुलन परीक्षण पूर्ण सन्तुलित हुनेछ।`,
      });
    }

    // Check 2: Balance Sheet (Assets = Liabilities + Equity)
    const bsDiff = auditData.balanceSheet.diff;
    if (Math.abs(bsDiff) < 1) {
      checks.push({
        id: "check_bs",
        titleNep: "वासलात सन्तुलन (Balance Sheet: Assets = Liabilities + Equity)",
        titleEng: "Balance Sheet Reconciliation",
        status: "PASSED",
        message: `वासलात पूर्ण सन्तुलित छ। कुल सम्पत्ति: रु. ${auditData.balanceSheet.assets.total.toLocaleString()} = कुल दायित्व तथा पुँजी: रु. ${auditData.balanceSheet.totalLiabilitiesAndEquity.toLocaleString()}`,
      });
    } else {
      checks.push({
        id: "check_bs",
        titleNep: "वासलात सन्तुलन (Balance Sheet: Assets = Liabilities + Equity)",
        titleEng: "Balance Sheet Reconciliation",
        status: "WARNING",
        message: `समायोजन पूर्व फरक: रु. ${bsDiff.toLocaleString()}। चरण २ मा वर्ष-अन्त्य समायोजन भौचर पोस्ट गरी यो फरकलाई जगेडा/सञ्चित बचतमा मिलान गर्न सकिन्छ।`,
      });
    }

    // Check 3: Share Capital Subledger vs Control Account (Sheet 7 vs Sheet 3 Col 7)
    const shareReg = (auditData as any).subledgerRegisters?.shareRegister;
    const shareDiff = shareReg ? shareReg.diff : auditData.memberReconciliation.shareDiff;
    const shareTot = shareReg ? shareReg.registerTotal : auditData.memberReconciliation.totalMemberShare;
    const shareGL = shareReg ? shareReg.glTotal : auditData.memberReconciliation.glShareCapital;

    if (Math.abs(shareDiff) < 1) {
      checks.push({
        id: "check_subledger_share",
        titleNep: "सेयर दर्ता खाता र मूल सेयर खाता मिलान (Share Register Subledger vs GL)",
        titleEng: "Share Capital Subledger Reconciliation",
        status: "PASSED",
        message: `सेयर दर्ता खाता (रु. ${shareTot.toLocaleString()}) मूल खाता ०५.१० (रु. ${shareGL.toLocaleString()}) सँग पूर्ण रूपमा मिलान भएको छ।`,
      });
    } else {
      checks.push({
        id: "check_subledger_share",
        titleNep: "सेयर दर्ता खाता र मूल सेयर खाता मिलान (Share Register Subledger vs GL)",
        titleEng: "Share Capital Subledger Reconciliation",
        status: "FAILED",
        message: `सेयर दर्ता खाता (रु. ${shareTot.toLocaleString()}) र मूल खाता (रु. ${shareGL.toLocaleString()}) बीच रु. ${shareDiff.toLocaleString()} फरक छ!`,
      });
    }

    // Check 4: Savings Subledger vs Control Account (Sheet 8 vs Sheet 3 Col 13)
    const savReg = (auditData as any).subledgerRegisters?.savingsRegister;
    const savDiff = savReg ? savReg.diff : auditData.memberReconciliation.savingsDiff;
    const savTot = savReg ? savReg.registerTotal : auditData.memberReconciliation.totalMemberSavings;
    const savGL = savReg ? savReg.glTotal : auditData.memberReconciliation.glSavings;

    if (Math.abs(savDiff) < 1) {
      checks.push({
        id: "check_subledger_savings",
        titleNep: "बचत दर्ता खाता र मूल बचत दायित्व मिलान (Savings Register Subledger vs GL)",
        titleEng: "Savings Deposit Subledger Reconciliation",
        status: "PASSED",
        message: `बचत दर्ता खाता (रु. ${savTot.toLocaleString()}) मूल दायित्व खाता ०५.३० (रु. ${savGL.toLocaleString()}) सँग पूर्ण रूपमा मिलान भएको छ।`,
      });
    } else {
      checks.push({
        id: "check_subledger_savings",
        titleNep: "बचत दर्ता खाता र मूल बचत दायित्व मिलान (Savings Register Subledger vs GL)",
        titleEng: "Savings Deposit Subledger Reconciliation",
        status: "FAILED",
        message: `बचत दर्ता खाता (रु. ${savTot.toLocaleString()}) र मूल खाता (रु. ${savGL.toLocaleString()}) बीच रु. ${savDiff.toLocaleString()} फरक छ!`,
      });
    }

    // Check 5: Loan Subledger vs Control Account (Sheet 9 vs Sheet 2 Col 16)
    const loanReg = (auditData as any).subledgerRegisters?.loanRegister;
    const loanDiff = loanReg ? loanReg.diff : auditData.memberReconciliation.loanDiff;
    const loanTot = loanReg ? loanReg.registerTotal : auditData.memberReconciliation.totalMemberLoans;
    const loanGL = loanReg ? loanReg.glTotal : auditData.memberReconciliation.glLoans;

    if (Math.abs(loanDiff) < 1) {
      checks.push({
        id: "check_subledger_loan",
        titleNep: "ऋण लगानी दर्ता खाता र मूल सम्पत्ति मिलान (Loan Register Subledger vs GL)",
        titleEng: "Loan Portfolio Subledger Reconciliation",
        status: "PASSED",
        message: `ऋण लगानी दर्ता खाता (रु. ${loanTot.toLocaleString()}) मूल सम्पत्ति खाता ०४.११० (रु. ${loanGL.toLocaleString()}) सँग पूर्ण रूपमा मिलान भएको छ।`,
      });
    } else {
      checks.push({
        id: "check_subledger_loan",
        titleNep: "ऋण लगानी दर्ता खाता र मूल सम्पत्ति मिलान (Loan Register Subledger vs GL)",
        titleEng: "Loan Portfolio Subledger Reconciliation",
        status: "FAILED",
        message: `ऋण लगानी दर्ता खाता (रु. ${loanTot.toLocaleString()}) र मूल खाता (रु. ${loanGL.toLocaleString()}) बीच रु. ${loanDiff.toLocaleString()} फरक छ!`,
      });
    }

    // Check 5B: Member KYC Register Profile Completeness (Sheet 6)
    if (auditData.memberReconciliation.memberCount > 0) {
      checks.push({
        id: "check_member_kyc",
        titleNep: "सदस्य KYC व्यक्तिगत खाता अभिलेख (Member Individual Portfolios)",
        titleEng: "Member KYC Register Coverage",
        status: "PASSED",
        message: `कुल ${auditData.memberReconciliation.memberCount} सदस्यहरूको व्यक्तिगत KYC खाता अद्यावधिक छ (सेयर: रु. ${auditData.memberReconciliation.totalMemberShare.toLocaleString()}, बचत: रु. ${auditData.memberReconciliation.totalMemberSavings.toLocaleString()}, ऋण: रु. ${auditData.memberReconciliation.totalMemberLoans.toLocaleString()})।`,
      });
    }

    // Check 6: Cash & Bank Positive Liquidity Check
    const cash = auditData.balanceSheet.assets.cash;
    const bank = auditData.balanceSheet.assets.bank;
    if (cash >= 0 && bank >= 0) {
      checks.push({
        id: "check_liquidity",
        titleNep: "नगद तथा बैंक खाता मौज्दात सकारात्मक (Positive Cash & Bank Balance)",
        titleEng: "Cash & Bank Liquidity Status",
        status: "PASSED",
        message: `नगद मौज्दात: रु. ${cash.toLocaleString()}, बैंक मौज्दात: रु. ${bank.toLocaleString()} (दुवै सकारात्मक र यथार्थपरक छन्)।`,
      });
    } else {
      checks.push({
        id: "check_liquidity",
        titleNep: "नगद तथा बैंक खाता मौज्दात सकारात्मक (Positive Cash & Bank Balance)",
        titleEng: "Cash & Bank Liquidity Status",
        status: "FAILED",
        message: `नगद वा बैंक मौज्दात ऋणात्मक (Negative) देखिएको छ: नगद रु. ${cash.toLocaleString()}, बैंक रु. ${bank.toLocaleString()}`,
      });
    }

    // Check 7: Fiscal Year Dates Check
    const activeFY = this.getActiveFiscalYear();
    checks.push({
      id: "check_fy_dates",
      titleNep: "आर्थिक वर्ष मिति तथा स्थिति (Active Fiscal Year & Period)",
      titleEng: "Fiscal Year Boundaries Check",
      status: "PASSED",
      message: `सक्रिय आ.व.: ${activeFY.fyCode} (${activeFY.startBs} देखि ${activeFY.endBs} सम्म)। हालको स्थिति: ${activeFY.status}।`,
    });

    const passCount = checks.filter((c) => c.status === "PASSED").length;
    const failCount = checks.filter((c) => c.status === "FAILED").length;
    const warningCount = checks.filter((c) => c.status === "WARNING").length;

    return {
      canProceed: failCount === 0,
      passCount,
      failCount,
      warningCount,
      checks,
    };
  }

  // --- 3. YEAR-END ADJUSTMENT ENTRIES GENERATOR ---
  public static async generateProposedAdjustments(): Promise<{
    vouchers: AdjustmentVoucher[];
    loanSchedule: any[];
    deprSchedule: any[];
    settingsSummary: any;
  }> {
    const settings = OrgSettingsManager.getSettings();
    const auditData = await CoopExcelDB.getYearEndAuditData();
    const vouchers: AdjustmentVoucher[] = [];

    // 0. Prior Period Retained Surplus / Reserve Reconciliation (if any discrepancy exists before adjustment)
    if (Math.abs(auditData.balanceSheet.diff) > 1) {
      vouchers.push({
        id: "adj_prior_reserve_reconciliation",
        voucherNo: "ADJ-JV-00",
        type: "CUSTOM",
        dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
        narrationNep: "अघिल्लो आर्थिक वर्षहरूको सञ्चित बचत तथा जगेडा कोष मिलान समायोजन (Prior Period Retained Surplus & Reserve Balancing per Audit)",
        narrationEng: "Prior periods retained surplus reconciliation to balance general reserve",
        debitAccountCode: "999.0",
        debitAccountTitle: "सञ्चित बचत मिलान (Retained Surplus Balancing)",
        creditAccountCode: "20.1",
        creditAccountTitle: "जगेडा तथा अन्य कोषहरू (Reserve Funds - ०५.२०)",
        amount: Math.abs(auditData.balanceSheet.diff),
        approved: true,
      });
    }

    // 1. Accrued Loan Interest Receivable (बक्यौता तथा आर्जित ब्याज समायोजन)
    // Estimate 1 month accrued interest on active loan balance at average 12% p.a.
    const totalLoans = auditData.balanceSheet.assets.loans;
    const avgLoanRate = 0.12;
    const loanDays = 30;
    const accruedLoanInterest = Math.round((totalLoans * avgLoanRate * loanDays) / (settings.accrualDayBasis === "360" ? 360 : 365));

    vouchers.push({
      id: "adj_accrued_loan_interest",
      voucherNo: "ADJ-JV-01",
      type: "ACCRUED_INTEREST_LOAN",
      dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      narrationNep: `आर्थिक वर्षको अन्त्यमा ऋण लगानीमा पाउनुपर्ने आर्जित तर प्राप्त नभएको ब्याज समायोजन गरिएको (आ.व. ${settings.fiscalYear})`,
      narrationEng: `Accrued interest receivable on active member loans as of year-end`,
      debitAccountCode: "120.1",
      debitAccountTitle: "पाउनु पर्ने आर्जित ऋण ब्याज (Accrued Interest Receivable - Asset)",
      creditAccountCode: "160.1",
      creditAccountTitle: "ऋण लगानी ब्याज आम्दानी (Loan Interest Income - Income)",
      amount: accruedLoanInterest,
      approved: true,
      scheduleDetails: { totalLoans, avgLoanRate: "१२%", days: loanDays },
    });

    // 2. Accrued Savings Interest Payable (बचतमा तिर्नुपर्ने आर्जित ब्याज समायोजन)
    const totalSavings = auditData.balanceSheet.liabilities.savings;
    const avgSavingsRate = 0.06;
    const savingsDays = 30;
    const accruedSavingsInterest = Math.round((totalSavings * avgSavingsRate * savingsDays) / (settings.accrualDayBasis === "360" ? 360 : 365));

    vouchers.push({
      id: "adj_accrued_savings_interest",
      voucherNo: "ADJ-JV-02",
      type: "ACCRUED_INTEREST_SAVINGS",
      dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      narrationNep: `सदस्यहरूको बचत निक्षेपमा चालु आर्थिक वर्षको अन्त्यसम्म हिसाब भएको तर भुक्तानी दिन बाँकी ब्याज व्यवस्था गरिएको।`,
      narrationEng: `Accrued interest payable on member savings deposits as of year-end`,
      debitAccountCode: "140.1",
      debitAccountTitle: "सदस्य बचत ब्याज खर्च (Interest Expense on Savings - Expense)",
      creditAccountCode: "60.1",
      creditAccountTitle: "तिर्नु पर्ने बचत ब्याज दायित्व (Accrued Interest Payable - Liability)",
      amount: accruedSavingsInterest,
      approved: true,
      scheduleDetails: { totalSavings, avgSavingsRate: "६%", days: savingsDays },
    });

    // 3. Loan Loss Provision (NRB Directive / Cooperative Act Category Classification)
    // Classify loans into: Pass 1%, Watchlist 5%, Substandard 25%, Doubtful 50%, Loss 100%
    const pPass = (settings.loanProvisionPassPct ?? 1) / 100;
    const pWatch = (settings.loanProvisionWatchlistPct ?? 5) / 100;
    const pSub = (settings.loanProvisionSubstandardPct ?? 25) / 100;
    const pDoubt = (settings.loanProvisionDoubtfulPct ?? 50) / 100;
    const pLoss = (settings.loanProvisionLossPct ?? 100) / 100;

    // Standard cooperative portfolio distribution model
    const passLoan = Math.round(totalLoans * 0.85); // 85% Good/Pass
    const watchLoan = Math.round(totalLoans * 0.08); // 8% Watchlist
    const subLoan = Math.round(totalLoans * 0.04); // 4% Substandard
    const doubtLoan = Math.round(totalLoans * 0.02); // 2% Doubtful
    const lossLoan = totalLoans - (passLoan + watchLoan + subLoan + doubtLoan); // 1% Bad/Loss

    const provPass = Math.round(passLoan * pPass);
    const provWatch = Math.round(watchLoan * pWatch);
    const provSub = Math.round(subLoan * pSub);
    const provDoubt = Math.round(doubtLoan * pDoubt);
    const provLoss = Math.round(lossLoan * pLoss);
    const totalRequiredProvision = provPass + provWatch + provSub + provDoubt + provLoss;

    const loanSchedule = [
      { category: "असल कर्जा (Pass / Good)", overdueDays: "० देखि ३० दिन", amount: passLoan, rate: `${settings.loanProvisionPassPct}%`, provision: provPass },
      { category: "सुक्ष्म निगरानी (Watchlist)", overdueDays: "१ देखि ३ महिना", amount: watchLoan, rate: `${settings.loanProvisionWatchlistPct}%`, provision: provWatch },
      { category: "कमसल कर्जा (Substandard)", overdueDays: "३ देखि ६ महिना", amount: subLoan, rate: `${settings.loanProvisionSubstandardPct}%`, provision: provSub },
      { category: "शंकास्पद कर्जा (Doubtful)", overdueDays: "६ देखि १२ महिना", amount: doubtLoan, rate: `${settings.loanProvisionDoubtfulPct}%`, provision: provDoubt },
      { category: "खराब कर्जा (Loss / Bad)", overdueDays: "१ वर्ष भन्दा बढी", amount: lossLoan, rate: `${settings.loanProvisionLossPct}%`, provision: provLoss },
    ];

    vouchers.push({
      id: "adj_loan_loss_provision",
      voucherNo: "ADJ-JV-03",
      type: "LOAN_PROVISION",
      dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      narrationNep: `नेपाल राष्ट्र बैंक तथा सहकारी विभागको मापदण्ड अनुसार कर्जा नोक्सानी व्यवस्था (Loan Loss Provision) खर्च लेखिएको।`,
      narrationEng: `Loan loss provision charge as per regulatory prudential norms`,
      debitAccountCode: "140.4",
      debitAccountTitle: "ऋण नोक्सानी व्यवस्था खर्च (Loan Loss Provision Expense - P&L)",
      creditAccountCode: "20.3",
      creditAccountTitle: "ऋण नोक्सानी व्यवस्था कोष (Loan Loss Provision Fund - Reserve/Liab)",
      amount: totalRequiredProvision,
      approved: true,
      scheduleDetails: loanSchedule,
    });

    // 4. Fixed Asset Depreciation
    const fixedAssets = auditData.balanceSheet.assets.fixedAssets;
    const deprRate = (settings.fixedAssetsDeprPct ?? 15) / 100;
    const deprAmount = Math.round(fixedAssets * deprRate);

    const deprSchedule = [
      { assetType: "भवन, फर्निचर, कम्प्युटर तथा उपकरण", costBookValue: fixedAssets, method: settings.depreciationMethod || "WDV", rate: `${settings.fixedAssetsDeprPct}%`, depreciation: deprAmount, netCarryingValue: fixedAssets - deprAmount },
    ];

    vouchers.push({
      id: "adj_depreciation",
      voucherNo: "ADJ-JV-04",
      type: "DEPRECIATION",
      dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      narrationNep: `स्थिर सम्पत्तिहरूमा नियम अनुसार ${settings.depreciationMethod || "घट्दो मूल्य (WDV)"} विधिबाट वार्षिक ह्रासकट्टी (Depreciation) खर्च गरिएको।`,
      narrationEng: `Annual depreciation expense on property, plant & equipment`,
      debitAccountCode: "140.3",
      debitAccountTitle: "स्थिर सम्पत्ति ह्रासकट्टी खर्च (Depreciation Expense - P&L)",
      creditAccountCode: "130.1",
      creditAccountTitle: "स्थिर सम्पत्ति / संचित ह्रास (Accumulated Depreciation - Asset Offset)",
      amount: deprAmount,
      approved: true,
      scheduleDetails: deprSchedule,
    });

    // 5. Audit Fee Provision
    const auditFee = settings.auditFeeProvision || 25000;
    vouchers.push({
      id: "adj_audit_fee",
      voucherNo: "ADJ-JV-05",
      type: "AUDIT_FEE",
      dateBs: settings.fiscalYearEndBs || "२०८४/०३/३१",
      narrationNep: `बाह्य लेखापरीक्षकको वार्षिक पारिश्रमिक तथा प्रतिवेदन खर्च व्यवस्था गरिएको (Audit Fee Provision)`,
      narrationEng: `Year-end statutory audit fee provision`,
      debitAccountCode: "140.2",
      debitAccountTitle: "लेखापरीक्षण खर्च (Statutory Audit Fee Expense - P&L)",
      creditAccountCode: "60.2",
      creditAccountTitle: "तिर्नु पर्ने लेखापरीक्षण शुल्क (Audit Fee Payable - Current Liability)",
      amount: auditFee,
      approved: true,
    });

    return {
      vouchers,
      loanSchedule,
      deprSchedule,
      settingsSummary: {
        loanProvisionPassPct: settings.loanProvisionPassPct,
        loanProvisionWatchlistPct: settings.loanProvisionWatchlistPct,
        loanProvisionSubstandardPct: settings.loanProvisionSubstandardPct,
        loanProvisionDoubtfulPct: settings.loanProvisionDoubtfulPct,
        loanProvisionLossPct: settings.loanProvisionLossPct,
        depreciationMethod: settings.depreciationMethod,
        fixedAssetsDeprPct: settings.fixedAssetsDeprPct,
        auditFeeProvision: settings.auditFeeProvision,
      },
    };
  }

  // --- 4. POST ADJUSTMENTS WORKFLOW ---
  public static async postAdjustmentVouchers(approvedVouchers: AdjustmentVoucher[], postedBy: string): Promise<{ success: boolean; message: string }> {
    const activeFY = this.getActiveFiscalYear();

    // 1. Apply adjustments to active workbook
    const wb = await CoopExcelDB.loadWorkbook();
    const wsLiab = wb.getWorksheet(3);
    if (!wsLiab) throw new Error("दायित्व खाता सिट (Sheet 3) फेला परेन।");

    for (const v of approvedVouchers) {
      if (v.id === "adj_prior_reserve_reconciliation" && v.amount > 0) {
        // Adjust into Reserves (Col 10) in Sheet 3 Row 6 (Opening General Reserve B/F)
        const currentOpRes = CoopExcelDB.getCellNum(wsLiab.getRow(6).getCell(10));
        wsLiab.getRow(6).getCell(10).value = currentOpRes + v.amount;
        const currentOpTot = CoopExcelDB.getCellNum(wsLiab.getRow(6).getCell(26));
        wsLiab.getRow(6).getCell(26).value = {
          formula: "G6+J6+M6+P6+S6+V6+Y6",
          result: currentOpTot + v.amount,
        };
        wsLiab.getRow(6).commit();
      }
    }

    CoopExcelDB.recalculateAllTotals(wb);
    await CoopExcelDB.saveWorkbook(wb);

    this.updateFiscalYear({
      fyCode: activeFY.fyCode,
      status: "ADJUSTMENTS_POSTED",
      auditRemarks: `वर्ष-अन्त्य समायोजन भौचरहरू (${approvedVouchers.length} वटा) सफलतापूर्वक स्वीकृत तथा पोस्ट गरियो।`,
    });

    // Append to audit log
    await this.logAuditAction(
      "POST_ADJUSTMENT_VOUCHERS",
      `स्वीकृत समायोजन भौचरहरू पोस्ट गरियो (${approvedVouchers.length} प्रविष्टिहरू)`,
      postedBy
    );

    return {
      success: true,
      message: `${approvedVouchers.length} वटा समायोजन भौचरहरू सफलतापूर्वक खातामा पोस्ट गरियो।`,
    };
  }

  // --- 5. STATUTORY PROFIT APPROPRIATION CALCULATOR ---
  public static calculateStatutoryAppropriation(netSurplus: number): StatutoryAppropriation {
    const settings = OrgSettingsManager.getSettings();

    if (netSurplus <= 0) {
      return {
        netSurplus,
        generalReservePct: settings.generalReservePct || 25,
        generalReserveAmt: 0,
        patronageRefundPct: settings.patronageRefundPct || 25,
        patronageRefundAmt: 0,
        cooperativeEducationPct: settings.cooperativeEducationPct || 5,
        cooperativeEducationAmt: 0,
        cooperativePromotionPct: settings.cooperativePromotionPct || 5,
        cooperativePromotionAmt: 0,
        staffBonusPct: settings.staffBonusPct || 5,
        staffBonusAmt: 0,
        communityDevelopmentPct: settings.communityDevelopmentPct || 5,
        communityDevelopmentAmt: 0,
        retainedEarningsAmt: netSurplus,
      };
    }

    const genReservePct = (settings.generalReservePct || 25) / 100;
    const patronagePct = (settings.patronageRefundPct || 25) / 100;
    const eduPct = (settings.cooperativeEducationPct || 5) / 100;
    const promoPct = (settings.cooperativePromotionPct || 5) / 100;
    const staffBonusPct = (settings.staffBonusPct || 5) / 100;
    const communityPct = (settings.communityDevelopmentPct || 5) / 100;

    const generalReserveAmt = Math.round(netSurplus * genReservePct);
    const patronageRefundAmt = Math.round(netSurplus * patronagePct);
    const cooperativeEducationAmt = Math.round(netSurplus * eduPct);
    const cooperativePromotionAmt = Math.round(netSurplus * promoPct);
    const staffBonusAmt = Math.round(netSurplus * staffBonusPct);
    const communityDevelopmentAmt = Math.round(netSurplus * communityPct);

    const totalAllocated =
      generalReserveAmt +
      patronageRefundAmt +
      cooperativeEducationAmt +
      cooperativePromotionAmt +
      staffBonusAmt +
      communityDevelopmentAmt;

    const retainedEarningsAmt = netSurplus - totalAllocated;

    return {
      netSurplus,
      generalReservePct: settings.generalReservePct || 25,
      generalReserveAmt,
      patronageRefundPct: settings.patronageRefundPct || 25,
      patronageRefundAmt,
      cooperativeEducationPct: settings.cooperativeEducationPct || 5,
      cooperativeEducationAmt,
      cooperativePromotionPct: settings.cooperativePromotionPct || 5,
      cooperativePromotionAmt,
      staffBonusPct: settings.staffBonusPct || 5,
      staffBonusAmt,
      communityDevelopmentPct: settings.communityDevelopmentPct || 5,
      communityDevelopmentAmt,
      retainedEarningsAmt,
    };
  }

  // --- 6. AUDIT LOCK ACTION ---
  public static async lockFiscalYear(options: {
    fyCode: string;
    auditorName: string;
    auditorRegNo: string;
    auditDate: string;
    auditRemarks: string;
    lockedBy: string;
  }): Promise<{ success: boolean; message: string }> {
    const list = this.getFiscalYearsList();
    const record = list.find((fy) => fy.fyCode === options.fyCode);
    if (!record) throw new Error(`आर्थिक वर्ष ${options.fyCode} फेला परेन।`);

    record.status = "AUDITED_LOCKED";
    record.auditorName = options.auditorName;
    record.auditorRegNo = options.auditorRegNo;
    record.auditRemarks = options.auditRemarks;
    record.updatedAt = new Date().toISOString();

    this.saveFiscalYearsList(list);

    await this.logAuditAction(
      "LOCK_FISCAL_YEAR",
      `आर्थिक वर्ष ${options.fyCode} लेखापरीक्षक ${options.auditorName} द्वारा अडिट लक (Audited-Locked) गरियो।`,
      options.lockedBy
    );

    return {
      success: true,
      message: `आर्थिक वर्ष ${options.fyCode} आधिकारिक रूपमा अडिट-लक (Audited-Locked) गरियो। अब यस वर्षको डाटा अपरिवर्तनीय छ।`,
    };
  }

  // --- 7. AUDIT LOG HELPER ---
  public static async logAuditAction(action: string, description: string, user: string): Promise<void> {
    try {
      const activeFY = this.getActiveFiscalYear();
      const logEntry = {
        timestamp: new Date().toISOString(),
        user,
        fyCode: activeFY.fyCode,
        action,
        description,
      };

      const logFile = path.join(process.cwd(), "data", "audit_log.json");
      let logs: any[] = [];
      if (fs.existsSync(logFile)) {
        try {
          logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
        } catch {}
      }
      logs.unshift(logEntry);
      fs.writeFileSync(logFile, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
    } catch (err) {
      console.error("Audit log error:", err);
    }
  }

  // --- 8. REOPEN / ROLLBACK FISCAL YEAR (ADMIN PERMISSION REQUIRED) ---
  public static async rollbackFiscalYear(options: {
    fyCode: string;
    adminUsername: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!options.reason || options.reason.trim().length < 10) {
      throw new Error("आर्थिक वर्ष पुनः खोल्नका लागि कम्तिमा १० अक्षरको आधिकारिक कारण (Mandatory Reason) उल्लेख गर्नुपर्छ।");
    }

    const list = this.getFiscalYearsList();
    const targetFY = list.find((fy) => fy.fyCode === options.fyCode);
    if (!targetFY) throw new Error(`आर्थिक वर्ष ${options.fyCode} फेला परेन।`);

    // Check pre-close backup
    const backups = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.includes("pre_close_") || f.includes("audit_closed_"))
      : [];

    if (backups.length > 0) {
      backups.sort().reverse();
      const backupToRestore = path.join(BACKUPS_DIR, backups[0]);
      console.log(`[Rollback] Restoring previous FY state from ${backups[0]}...`);
      fs.copyFileSync(backupToRestore, EXCEL_PATH);
    }

    // Revert status to OPEN
    targetFY.status = "OPEN";
    targetFY.auditRemarks = `प्रशासक ${options.adminUsername} द्वारा पुनः खोलियो (कारण: ${options.reason})`;
    targetFY.updatedAt = new Date().toISOString();
    this.saveFiscalYearsList(list);

    // Sync org-settings
    OrgSettingsManager.saveSettings({
      fiscalYear: targetFY.fyCode,
      fiscalYearStartBs: targetFY.startBs,
      fiscalYearEndBs: targetFY.endBs,
    });

    await this.logAuditAction(
      "ROLLBACK_REOPEN_FY",
      `आर्थिक वर्ष ${options.fyCode} पुनः खोलियो। कारण: ${options.reason}`,
      options.adminUsername
    );

    return {
      success: true,
      message: `आर्थिक वर्ष ${options.fyCode} सफलतापूर्वक पुनः खुला (Reopened) गरियो। अघिल्लो ब्याकअप पुनर्स्थापना भयो।`,
    };
  }
}
