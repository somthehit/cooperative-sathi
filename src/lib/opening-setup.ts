import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { CoopExcelDB } from "./excel-db";
import { OrgSettingsManager, OrganisationSettings } from "./org-settings";
import { FiscalAuditEngine } from "./fiscal-audit";
import {
  nepaliToEnglishDigits,
  englishToNepaliDigits,
  validateBsDate,
  bsToAdDate,
  calculateDaysBetweenBs,
} from "./nepali-calendar";

const STAGING_FILE = path.join(process.cwd(), "data", "opening_staging.json");
const DRAFT_WIZARD_FILE = path.join(process.cwd(), "data", "opening_wizard_draft.json");
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");
const EXCEL_PATH = path.join(process.cwd(), "data", "nepal_cooperative_4_khata_kyc_vba_system.xlsx");

// --- INTERFACES ---

export interface OpeningLedgerItem {
  code: string;
  nameNep: string;
  nameEng: string;
  category: "ASSET" | "LIABILITY" | "EQUITY" | "EXPENSE" | "INCOME" | "SUSPENSE";
  dr: number;
  cr: number;
  notes?: string;
  isCustom?: boolean;
}

export interface StagedMemberRow {
  rowNum: number;
  memberId: string;
  nameNep: string;
  nameEng?: string;
  gender?: string;
  dobBs?: string;
  citizenshipNo?: string;
  phone?: string;
  province?: string;
  district?: string;
  palika?: string;
  wardNo?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  joinDateBs?: string;
  status?: string;
  isDraftKyc?: boolean;
  errors: string[];
}

export interface StagedShareRow {
  rowNum: number;
  memberId: string;
  memberName?: string;
  shareUnits: number;
  faceValue: number;
  shareAmount: number;
  lastPurchaseDateBs?: string;
  errors: string[];
}

export interface StagedSavingsRow {
  rowNum: number;
  memberId: string;
  memberName?: string;
  accountNo: string;
  productName: string;
  balance: number;
  interestRate: number;
  lastInterestPostedDateBs?: string;
  accruedInterestPayable: number;
  errors: string[];
}

export interface StagedLoanRow {
  rowNum: number;
  loanId: string;
  memberId: string;
  memberName?: string;
  productName: string;
  principalOutstanding: number;
  interestRate: number;
  disbursementDateBs: string;
  maturityDateBs: string;
  installmentType?: string;
  lastPaymentDateBs?: string;
  overdueDays: number;
  accruedInterestReceivable: number;
  overdueInterest: number;
  securityDetails?: string;
  guarantorMemberIds?: string;
  classification?: "PASS" | "WATCHLIST" | "SUBSTANDARD" | "DOUBTFUL" | "LOSS";
  provisionRequired?: number;
  errors: string[];
}

export interface StagedLedgerRow {
  rowNum: number;
  code: string;
  name: string;
  debit: number;
  credit: number;
  errors: string[];
}

export interface StagingBatch {
  batchId: string;
  uploadedBy: string;
  timestamp: string;
  fileName: string;
  fileHash?: string;
  counts: {
    members: number;
    shares: number;
    savings: number;
    loans: number;
    ledgers: number;
    errorsCount: number;
  };
  controlTotals: {
    expectedShareTotal: number;
    expectedSavingsTotal: number;
    expectedLoanTotal: number;
    expectedAccruedInterest: number;
  };
  stagedTotals: {
    shareTotal: number;
    savingsTotal: number;
    loanTotal: number;
    accruedInterestPayableTotal: number;
    accruedInterestReceivableTotal: number;
  };
  status: "Uploaded" | "Validated-With-Errors" | "Validated-OK" | "Committed" | "Discarded";
  dedupeOption: "SKIP" | "UPDATE_BLANK" | "OVERWRITE";
  data: {
    members: StagedMemberRow[];
    shares: StagedShareRow[];
    savings: StagedSavingsRow[];
    loans: StagedLoanRow[];
    ledgers: StagedLedgerRow[];
  };
}

export interface OpeningSetupDraft {
  step: number;
  scenario: "A_FY_START" | "B_MID_YEAR";
  goLiveDateBs: string;
  goLiveDateAd: string;
  fiscalYear: string;
  profile: {
    nameNep: string;
    regNo: string;
    panNo: string;
    address: string;
  };
  ledgers: OpeningLedgerItem[];
  ytdIncomeExpenses?: {
    income: Array<{ code: string; name: string; amount: number }>;
    expenses: Array<{ code: string; name: string; amount: number }>;
  };
  suspenseReason: string;
  cashBankConfirmed: boolean;
  cashBankConfirmedDate?: string;
  cashBankConfirmedUser?: string;
  updatedAt: string;
}

// Default Chart of Accounts for Opening Setup (Pure 4-Khata integer codes - Sheets 2 & 3 Balance Sheet only)
export const DEFAULT_OPENING_LEDGERS: OpeningLedgerItem[] = [
  // ==========================================
  // १. सम्पत्ति खाताहरू (ASSETS) - Sheet 2 (८० देखि १४०)
  // ==========================================
  { code: "80", nameNep: "८० नगद मौज्दात (Cash in Hand)", nameEng: "Cash on Hand", category: "ASSET", dr: 0, cr: 0 },
  { code: "90", nameNep: "९० बैंक मौज्दात (Bank Accounts)", nameEng: "Bank Accounts", category: "ASSET", dr: 0, cr: 0 },
  { code: "100", nameNep: "१०० लगानी हिसाब (Investments)", nameEng: "Investments - Shares/Securities", category: "ASSET", dr: 0, cr: 0 },
  { code: "110", nameNep: "११० सदस्य ऋण लगानी (Member Loans Outstanding)", nameEng: "Member Loans Outstanding", category: "ASSET", dr: 0, cr: 0 },
  { code: "120", nameNep: "१२० पाउनुपर्ने ब्याज तथा आय (Receivables & Accrued Interest)", nameEng: "Receivables & Accrued Interest", category: "ASSET", dr: 0, cr: 0 },
  { code: "130", nameNep: "१३० स्थिर सम्पत्ति (Fixed Assets)", nameEng: "Fixed Assets", category: "ASSET", dr: 0, cr: 0 },
  { code: "140", nameNep: "१४० अन्य चालू सम्पत्ति तथा धरौटी (Other Current Assets & Deposits)", nameEng: "Other Current Assets & Deposits", category: "ASSET", dr: 0, cr: 0 },

  // ==========================================
  // २. पुँजी तथा जगेडा कोषहरू (EQUITY & RESERVES) - Sheet 3 (१० र २०)
  // ==========================================
  { code: "10", nameNep: "१० सदस्य शेयर पुँजी (Member Share Capital)", nameEng: "Member Share Capital", category: "EQUITY", dr: 0, cr: 0 },
  { code: "20", nameNep: "२० जगेडा तथा अन्य कोषहरू (Reserves & Surplus Funds)", nameEng: "Reserves & Surplus Funds", category: "EQUITY", dr: 0, cr: 0 },

  // ==========================================
  // ३. दायित्व खाताहरू (LIABILITIES) - Sheet 3 (३० देखि ७०)
  // ==========================================
  { code: "30", nameNep: "३० सदस्य बचत निक्षेप (Member Savings Deposits)", nameEng: "Member Savings Deposits", category: "LIABILITY", dr: 0, cr: 0 },
  { code: "40", nameNep: "४० बाह्य ऋण तथा सापट दायित्व (External Borrowings)", nameEng: "External Borrowings", category: "LIABILITY", dr: 0, cr: 0 },
  { code: "50", nameNep: "५० पुँजीगत तथा सञ्चालन अनुदान (Grants & Subsidies)", nameEng: "Grants & Subsidies", category: "LIABILITY", dr: 0, cr: 0 },
  { code: "60", nameNep: "६० भुक्तानी दिनुपर्ने हिसाब (Accounts Payable / Creditors)", nameEng: "Accounts Payable", category: "LIABILITY", dr: 0, cr: 0 },
  { code: "70", nameNep: "७० अन्य दायित्व तथा व्यवस्थाहरू (Other Current Liabilities & Provisions)", nameEng: "Other Current Liabilities", category: "LIABILITY", dr: 0, cr: 0 },

  // ==========================================
  // ४. सस्पेन्स खाता (SUSPENSE)
  // ==========================================
  { code: "999", nameNep: "९९९ प्रारम्भिक मौज्दात फरक सस्पेन्स (Opening Balance Suspense)", nameEng: "Opening Balance Difference Suspense", category: "SUSPENSE", dr: 0, cr: 0 },
];

// Migration map from older .1/.2/.10 codes to pure 4-Khata integer codes
export const LEGACY_CODE_MAP: Record<string, string> = {
  "80.1": "80",
  "80.2": "80",
  "90.1": "90",
  "90.2": "90",
  "100.1": "100",
  "100.2": "100",
  "110.1": "110",
  "120.1": "120",
  "120.2": "120",
  "130.1": "130",
  "130.2": "130",
  "140.1": "140",
  "10.1": "10",
  "10.10": "10",
  "20.1": "20",
  "20.2": "20",
  "20.3": "20",
  "20.4": "20",
  "20.5": "20",
  "20.6": "20",
  "20.10": "20",
  "20.20": "20",
  "20.30": "20",
  "20.40": "20",
  "20.50": "20",
  "99.1": "20",
  "30.1": "30",
  "30.2": "30",
  "30.10": "30",
  "30.20": "30",
  "40.1": "40",
  "40.10": "40",
  "50.1": "50",
  "50.10": "50",
  "60.1": "60",
  "60.2": "60",
  "60.10": "60",
  "60.20": "60",
  "70.1": "70",
  "70.2": "70",
  "70.10": "70",
  "70.20": "70",
  "999.1": "999",
};

export class OpeningSetupEngine {
  // --- 1. DRAFT WIZARD PERSISTENCE ---
  public static getDraftWizard(): OpeningSetupDraft {
    let draftData: Partial<OpeningSetupDraft> | null = null;
    try {
      if (fs.existsSync(DRAFT_WIZARD_FILE)) {
        const raw = fs.readFileSync(DRAFT_WIZARD_FILE, "utf-8");
        draftData = JSON.parse(raw);
      }
    } catch {}

    const settings = OrgSettingsManager.getSettings();

    // Map existing draft ledgers by code to preserve user entered amounts & custom accounts
    const existingMap = new Map<string, OpeningLedgerItem>();
    if (draftData?.ledgers && Array.isArray(draftData.ledgers)) {
      draftData.ledgers.forEach((l) => {
        // Drop any nominal income and expense accounts (150.x and 160.x)
        if (l.code.startsWith("150.") || l.code.startsWith("160.") || l.category === "EXPENSE" || l.category === "INCOME") {
          return;
        }

        // Apply legacy code migration if applicable
        const targetCode = LEGACY_CODE_MAP[l.code] || l.code;
        const currentEntry = existingMap.get(targetCode);
        if (currentEntry) {
          existingMap.set(targetCode, {
            ...currentEntry,
            dr: (currentEntry.dr || 0) + (l.dr || 0),
            cr: (currentEntry.cr || 0) + (l.cr || 0),
          });
        } else {
          existingMap.set(targetCode, {
            ...l,
            code: targetCode,
          });
        }
      });
    }

    const mergedLedgers: OpeningLedgerItem[] = [];

    // 1. Include all standard 4-Khata accounts from DEFAULT_OPENING_LEDGERS
    DEFAULT_OPENING_LEDGERS.forEach((tmpl) => {
      const existing = existingMap.get(tmpl.code);
      if (existing) {
        mergedLedgers.push({
          ...tmpl,
          dr: typeof existing.dr === "number" ? existing.dr : tmpl.dr,
          cr: typeof existing.cr === "number" ? existing.cr : tmpl.cr,
          notes: existing.notes || tmpl.notes,
          isCustom: false,
        });
        existingMap.delete(tmpl.code);
      } else {
        mergedLedgers.push({ ...tmpl });
      }
    });

    // 2. Append all custom accounts that the user has added (excluding legacy standard codes & income/expense)
    existingMap.forEach((customItem, key) => {
      if (Object.keys(LEGACY_CODE_MAP).includes(key)) return;
      mergedLedgers.push({
        ...customItem,
        isCustom: true,
      });
    });

    return {
      step: draftData?.step || 1,
      scenario: (draftData?.scenario as any) || (settings.goLiveScenario as any) || "A_FY_START",
      goLiveDateBs: draftData?.goLiveDateBs || settings.systemGoLiveDateBs || "२०८३/०४/०१",
      goLiveDateAd: draftData?.goLiveDateAd || settings.systemGoLiveDateAd || "2026-07-16",
      fiscalYear: draftData?.fiscalYear || settings.firstFiscalYear || settings.fiscalYear || "२०८३/८४",
      profile: {
        nameNep: draftData?.profile?.nameNep || settings.nameNep,
        regNo: draftData?.profile?.regNo || settings.regNo,
        panNo: draftData?.profile?.panNo || settings.panNo,
        address: draftData?.profile?.address || settings.fullAddress,
      },
      ledgers: mergedLedgers,
      ytdIncomeExpenses: draftData?.ytdIncomeExpenses,
      suspenseReason: draftData?.suspenseReason || settings.suspenseLedgerReason || "",
      cashBankConfirmed: draftData?.cashBankConfirmed ?? !!settings.cashBankVerifiedDate,
      cashBankConfirmedDate: draftData?.cashBankConfirmedDate || settings.cashBankVerifiedDate,
      cashBankConfirmedUser: draftData?.cashBankConfirmedUser || settings.cashBankVerifiedUser,
      updatedAt: draftData?.updatedAt || new Date().toISOString(),
    };
  }

  public static saveDraftWizard(draft: Partial<OpeningSetupDraft>): OpeningSetupDraft {
    const current = this.getDraftWizard();
    const updated: OpeningSetupDraft = {
      ...current,
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    const dir = path.dirname(DRAFT_WIZARD_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DRAFT_WIZARD_FILE, JSON.stringify(updated, null, 2), "utf-8");

    // Also update org-settings for quick access
    OrgSettingsManager.saveSettings({
      systemGoLiveDateBs: updated.goLiveDateBs,
      systemGoLiveDateAd: updated.goLiveDateAd,
      firstFiscalYear: updated.fiscalYear,
      goLiveScenario: updated.scenario,
      suspenseLedgerReason: updated.suspenseReason,
      cashBankVerifiedDate: updated.cashBankConfirmedDate,
      cashBankVerifiedUser: updated.cashBankConfirmedUser,
    });

    return updated;
  }

  // --- 2. STAGING BATCHES MANAGEMENT ---
  public static getStagingBatches(): StagingBatch[] {
    try {
      if (fs.existsSync(STAGING_FILE)) {
        const content = fs.readFileSync(STAGING_FILE, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object" && Array.isArray(parsed.batches)) {
          return parsed.batches;
        }
      }
    } catch {}
    return [];
  }

  public static saveStagingBatches(batches: StagingBatch[]): void {
    const dir = path.dirname(STAGING_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const list = Array.isArray(batches) ? batches : [];
    fs.writeFileSync(STAGING_FILE, JSON.stringify(list, null, 2), "utf-8");
  }

  public static getActiveBatch(): StagingBatch | null {
    const batches = this.getStagingBatches();
    if (!Array.isArray(batches) || batches.length === 0) return null;
    return batches.find((b) => b && b.status !== "Committed" && b.status !== "Discarded") || batches[0] || null;
  }

  // --- 3. EXCEL / CSV TEMPLATE GENERATOR ---
  public static async generateCombinedOpeningTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Nepal Cooperative ERP";
    wb.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F497D" },
    };
    const headerFont = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };

    // Sheet 1: ०१_सदस्य_विवरण (Members KYC)
    const wsMembers = wb.addWorksheet("०१_सदस्य_विवरण_Members");
    wsMembers.addRow([
      "सदस्य नं (Member ID)*",
      "सदस्यको नाम (Full Name)*",
      "अंग्रेजी नाम (English Name)",
      "लिङ्ग (Gender)",
      "जन्म मिति वि.सं. (DOB BS)",
      "नागरिकता नं (Citizenship No)",
      "मोबाइल नं (Mobile No)",
      "प्रदेश (Province)",
      "जिल्ला (District)",
      "पालिका (Municipality/Palika)",
      "वडा नं (Ward No)",
      "हकवालाको नाम (Nominee Name)",
      "नाता (Relation)",
      "सदस्यता मिति वि.सं. (Join Date BS)",
      "स्थिति (Status: ACTIVE/INACTIVE)",
    ]);
    wsMembers.getRow(1).fill = headerFill;
    wsMembers.getRow(1).font = headerFont;

    // Sheet 2: १०_सेयर_पुँजी (Shares - Hisab 10)
    const wsShares = wb.addWorksheet("१०_सेयर_पुँजी_Shares");
    wsShares.addRow([
      "सदस्य नं (Member ID)*",
      "सेयर कित्ता (Share Units)*",
      "प्रति कित्ता दर रु. (Face Value)*",
      "कुल सेयर रकम रु. (Share Amount)*",
      "अन्तिम खरिद मिति वि.सं. (Last Purchase Date BS)",
    ]);
    wsShares.getRow(1).fill = headerFill;
    wsShares.getRow(1).font = headerFont;

    // Sheet 3: ३०_बचत_निक्षेप (Savings - Hisab 30)
    const wsSavings = wb.addWorksheet("३०_बचत_निक्षेप_Savings");
    wsSavings.addRow([
      "सदस्य नं (Member ID)*",
      "खाता नं (Account No)*",
      "बचत प्रकार (Product Name: ३० बचत)*",
      "बचत मौज्दात रु. (Balance)*",
      "ब्याजदर % (Interest Rate)",
      "अन्तिम ब्याज पोस्ट मिति वि.सं. (Last Interest Date)",
      "तिर्न बाँकी ब्याज रु. (Accrued Interest Payable)",
    ]);
    wsSavings.getRow(1).fill = headerFill;
    wsSavings.getRow(1).font = headerFont;

    // Sheet 4: ११०_ऋण_कर्जा (Loans - Hisab 110)
    const wsLoans = wb.addWorksheet("११०_ऋण_कर्जा_Loans");
    wsLoans.addRow([
      "ऋण नं (Loan ID)*",
      "सदस्य नं (Member ID)*",
      "कर्जा प्रकार (Product Name: ११० कर्जा)*",
      "कर्जा बाँकी सावाँ रु. (Principal Outstanding)*",
      "ब्याजदर % (Interest Rate)*",
      "लगानी मिति वि.सं. (Disbursement Date BS)*",
      "म्याद भुक्तान मिति वि.सं. (Maturity Date BS)*",
      "किस्ता प्रकार (Installment Type)",
      "अन्तिम भुक्तानी मिति (Last Payment Date)",
      "भाखा नाघेको दिन (Overdue Days)",
      "पाउन बाँकी आर्जित ब्याज (Accrued Interest)",
      "हर्जाना ब्याज (Overdue Penalty Interest)",
      "धितो सुरक्षण विवरण (Security Details)",
      "जमानी बस्ने सदस्य नं (Guarantor Member IDs)",
    ]);
    wsLoans.getRow(1).fill = headerFill;
    wsLoans.getRow(1).font = headerFont;

    // Sheet 5: मूल_खाता_सूची_COA (Chart of Accounts: 80..140, 10..70, 999)
    const wsLedgers = wb.addWorksheet("मूल_खाता_सूची_COA_Ledgers");
    wsLedgers.addRow([
      "हिसाब नं / खाता कोड (Account Code)*",
      "खाताको नाम (Account Name)*",
      "डेबिट रकम रु. (Debit Balance)",
      "क्रेडिट रकम रु. (Credit Balance)",
    ]);
    const draft = this.getDraftWizard();
    const ledgersToExport = (draft && draft.ledgers && draft.ledgers.length > 0) ? draft.ledgers : DEFAULT_OPENING_LEDGERS;
    ledgersToExport.forEach((l) => {
      wsLedgers.addRow([l.code, l.nameNep, l.dr || 0, l.cr || 0]);
    });
    wsLedgers.getRow(1).fill = headerFill;
    wsLedgers.getRow(1).font = headerFont;

    // Set column widths nicely across all sheets
    wb.worksheets.forEach((ws) => {
      ws.columns.forEach((col) => {
        col.width = 24;
      });
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // --- 4. PARSE & VALIDATE STAGING BATCH ---
  public static async processImportFile(
    fileBuffer: Buffer,
    fileName: string,
    uploadedBy: string,
    controlTotals?: {
      expectedShareTotal: number;
      expectedSavingsTotal: number;
      expectedLoanTotal: number;
      expectedAccruedInterest: number;
    }
  ): Promise<StagingBatch> {
    const wb = new ExcelJS.Workbook();
    if (fileName.endsWith(".csv")) {
      // Parse as CSV
      const stream = require("stream");
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);
      await wb.csv.read(bufferStream);
    } else {
      await wb.xlsx.load(fileBuffer as any);
    }

    const batchId = `BATCH-${Date.now()}`;
    const stagedMembers: StagedMemberRow[] = [];
    const stagedShares: StagedShareRow[] = [];
    const stagedSavings: StagedSavingsRow[] = [];
    const stagedLoans: StagedLoanRow[] = [];
    const stagedLedgers: StagedLedgerRow[] = [];

    // Helper to find worksheet by partial name
    const findSheet = (keywords: string[]) => {
      return wb.worksheets.find((ws) =>
        keywords.some((k) => ws.name.toLowerCase().includes(k.toLowerCase()))
      );
    };

    const wsM = findSheet(["member", "सदस्य"]) || wb.getWorksheet(1);
    const wsS = findSheet(["share", "सेयर", "10", "१०"]);
    const wsB = findSheet(["saving", "बचत", "निक्षेप", "30", "३०"]);
    const wsL = findSheet(["loan", "ऋण", "कर्जा", "110", "११०"]);
    const wsLed = findSheet(["ledger", "खाता", "लेजर", "coa"]);

    const cellStr = (row: ExcelJS.Row, col: number): string => {
      const c = row.getCell(col);
      return CoopExcelDB.extractCellText(c ? c.value : null).trim();
    };
    const cellNum = (row: ExcelJS.Row, col: number): number => {
      const c = row.getCell(col);
      const raw = c ? c.value : null;
      if (typeof raw === "number") return raw;
      const cleanStr = nepaliToEnglishDigits(CoopExcelDB.extractCellText(raw).replace(/,/g, "")).trim();
      return CoopExcelDB.extractCellNumber(cleanStr) || 0;
    };

    // 1. Process Members
    if (wsM) {
      for (let r = 2; r <= wsM.rowCount; r++) {
        const row = wsM.getRow(r);
        const memId = nepaliToEnglishDigits(cellStr(row, 1)).trim();
        const nameNep = cellStr(row, 2);
        if (!memId && !nameNep) continue;

        const errors: string[] = [];
        if (!memId) errors.push("सदस्य नम्बर (Member ID) अनिवार्य छ।");
        if (!nameNep) errors.push("सदस्यको नाम अनिवार्य छ।");

        const dobBs = cellStr(row, 5);
        if (dobBs) {
          const val = validateBsDate(dobBs);
          if (!val.valid) errors.push(`जन्म मिति त्रुटि: ${val.error}`);
        }

        const joinBs = cellStr(row, 14);
        if (joinBs) {
          const val = validateBsDate(joinBs);
          if (!val.valid) errors.push(`सदस्यता मिति त्रुटि: ${val.error}`);
        }

        const citizenshipNo = cellStr(row, 6);
        const phone = cellStr(row, 7);

        // Flag incomplete KYC
        const isDraftKyc = !citizenshipNo || !phone || !dobBs;

        stagedMembers.push({
          rowNum: r,
          memberId: memId,
          nameNep,
          nameEng: cellStr(row, 3),
          gender: cellStr(row, 4),
          dobBs,
          citizenshipNo,
          phone,
          province: cellStr(row, 8),
          district: cellStr(row, 9),
          palika: cellStr(row, 10),
          wardNo: cellStr(row, 11),
          nomineeName: cellStr(row, 12),
          nomineeRelation: cellStr(row, 13),
          joinDateBs: joinBs,
          status: cellStr(row, 15) || "ACTIVE",
          isDraftKyc,
          errors,
        });
      }
    }

    // Member IDs set for foreign key check
    const memberIdSet = new Set(stagedMembers.map((m) => m.memberId));

    // 2. Process Shares
    if (wsS) {
      for (let r = 2; r <= wsS.rowCount; r++) {
        const row = wsS.getRow(r);
        const memId = nepaliToEnglishDigits(cellStr(row, 1)).trim();
        if (!memId) continue;

        const errors: string[] = [];
        if (!memberIdSet.has(memId)) {
          errors.push(`सदस्य नं. '${memId}' सदस्य सूची (Sheet 1) मा फेला परेन।`);
        }

        const units = cellNum(row, 2);
        const faceVal = cellNum(row, 3) || 100;
        const amount = cellNum(row, 4) || (units * faceVal);

        if (units <= 0) errors.push("सेयर कित्ता शून्य वा ऋणात्मक हुन सक्दैन।");
        if (amount <= 0) errors.push("सेयर रकम शून्य हुन सक्दैन।");
        if (Math.abs(units * faceVal - amount) > 1) {
          errors.push(`सेयर रकम (रु. ${amount}) र कित्ता × दर (${units} × ${faceVal} = ${units * faceVal}) मिलेन।`);
        }

        stagedShares.push({
          rowNum: r,
          memberId: memId,
          shareUnits: units,
          faceValue: faceVal,
          shareAmount: amount,
          lastPurchaseDateBs: cellStr(row, 5),
          errors,
        });
      }
    }

    // 3. Process Savings
    if (wsB) {
      for (let r = 2; r <= wsB.rowCount; r++) {
        const row = wsB.getRow(r);
        const memId = nepaliToEnglishDigits(cellStr(row, 1)).trim();
        const accNo = cellStr(row, 2);
        if (!memId && !accNo) continue;

        const errors: string[] = [];
        if (!memId) errors.push("सदस्य नं. अनिवार्य छ।");
        else if (!memberIdSet.has(memId)) errors.push(`सदस्य नं. '${memId}' सदस्य सूचीमा फेला परेन।`);

        if (!accNo) errors.push("बचत खाता नं. अनिवार्य छ।");

        const bal = cellNum(row, 4);
        if (bal < 0) errors.push("बचत मौज्दात ऋणात्मक (Negative) हुन सक्दैन।");

        const accruedInt = cellNum(row, 7);

        stagedSavings.push({
          rowNum: r,
          memberId: memId,
          accountNo: accNo,
          productName: cellStr(row, 3) || "साधारण बचत",
          balance: bal,
          interestRate: cellNum(row, 5) || 6.0,
          lastInterestPostedDateBs: cellStr(row, 6),
          accruedInterestPayable: accruedInt,
          errors,
        });
      }
    }

    // 4. Process Loans
    if (wsL) {
      for (let r = 2; r <= wsL.rowCount; r++) {
        const row = wsL.getRow(r);
        const loanId = cellStr(row, 1);
        const memId = nepaliToEnglishDigits(cellStr(row, 2)).trim();
        if (!loanId && !memId) continue;

        const errors: string[] = [];
        if (!loanId) errors.push("कर्जा नं. (Loan ID) अनिवार्य छ।");
        if (!memId) errors.push("ऋणी सदस्य नं. अनिवार्य छ।");
        else if (!memberIdSet.has(memId)) errors.push(`ऋणी सदस्य नं. '${memId}' सदस्य सूचीमा फेला परेन।`);

        const principal = cellNum(row, 4);
        if (principal <= 0) errors.push("कर्जा सावाँ रकम शून्य वा ऋणात्मक हुन सक्दैन।");

        const disBs = cellStr(row, 6);
        const matBs = cellStr(row, 7);

        if (disBs) {
          const val = validateBsDate(disBs);
          if (!val.valid) errors.push(`लगानी मिति त्रुटि: ${val.error}`);
        }
        if (matBs) {
          const val = validateBsDate(matBs);
          if (!val.valid) errors.push(`म्याद मिति त्रुटि: ${val.error}`);
        }

        const overdueDays = cellNum(row, 10);
        let classification: "PASS" | "WATCHLIST" | "SUBSTANDARD" | "DOUBTFUL" | "LOSS" = "PASS";
        let provRate = 0.01;

        if (overdueDays > 180) {
          classification = "LOSS";
          provRate = 1.0;
        } else if (overdueDays > 90) {
          classification = "DOUBTFUL";
          provRate = 0.5;
        } else if (overdueDays > 30) {
          classification = "SUBSTANDARD";
          provRate = 0.25;
        } else if (overdueDays > 0) {
          classification = "WATCHLIST";
          provRate = 0.05;
        }

        const provRequired = Math.round(principal * provRate);

        stagedLoans.push({
          rowNum: r,
          loanId,
          memberId: memId,
          productName: cellStr(row, 3) || "साधारण कर्जा",
          principalOutstanding: principal,
          interestRate: cellNum(row, 5) || 12.0,
          disbursementDateBs: disBs,
          maturityDateBs: matBs,
          installmentType: cellStr(row, 8),
          lastPaymentDateBs: cellStr(row, 9),
          overdueDays,
          accruedInterestReceivable: cellNum(row, 11),
          overdueInterest: cellNum(row, 12),
          securityDetails: cellStr(row, 13),
          guarantorMemberIds: cellStr(row, 14),
          classification,
          provisionRequired: provRequired,
          errors,
        });
      }
    }

    // 5. Process Ledgers
    if (wsLed) {
      for (let r = 2; r <= wsLed.rowCount; r++) {
        const row = wsLed.getRow(r);
        const rawCode = cellStr(row, 1);
        const name = cellStr(row, 2);
        if (!rawCode && !name) continue;

        const codeLower = rawCode.toLowerCase();
        if (codeLower.includes("total") || codeLower.includes("जम्मा") || name.toLowerCase().includes("total") || name.includes("जम्मा")) {
          continue;
        }

        const normalizedCode = nepaliToEnglishDigits(rawCode).trim();
        const code = LEGACY_CODE_MAP[normalizedCode] || normalizedCode;

        // Skip nominal expenses and income if included in older template
        if (code.startsWith("150.") || code.startsWith("160.")) continue;

        const errors: string[] = [];
        const dr = cellNum(row, 3);
        const cr = cellNum(row, 4);

        stagedLedgers.push({
          rowNum: r,
          code,
          name: name || code,
          debit: dr,
          credit: cr,
          errors,
        });
      }
    }

    // Calculate totals
    const shareTot = stagedShares.reduce((s, r) => s + r.shareAmount, 0);
    const savTot = stagedSavings.reduce((s, r) => s + r.balance, 0);
    const loanTot = stagedLoans.reduce((s, r) => s + r.principalOutstanding, 0);
    const savIntTot = stagedSavings.reduce((s, r) => s + r.accruedInterestPayable, 0);
    const loanIntTot = stagedLoans.reduce((s, r) => s + r.accruedInterestReceivable, 0);

    const totalErrors =
      stagedMembers.filter((m) => m.errors.length > 0).length +
      stagedShares.filter((s) => s.errors.length > 0).length +
      stagedSavings.filter((b) => b.errors.length > 0).length +
      stagedLoans.filter((l) => l.errors.length > 0).length +
      stagedLedgers.filter((led) => led.errors.length > 0).length;

    const newBatch: StagingBatch = {
      batchId,
      uploadedBy,
      timestamp: new Date().toISOString(),
      fileName,
      counts: {
        members: stagedMembers.length,
        shares: stagedShares.length,
        savings: stagedSavings.length,
        loans: stagedLoans.length,
        ledgers: stagedLedgers.length,
        errorsCount: totalErrors,
      },
      controlTotals: controlTotals || {
        expectedShareTotal: shareTot,
        expectedSavingsTotal: savTot,
        expectedLoanTotal: loanTot,
        expectedAccruedInterest: loanIntTot,
      },
      stagedTotals: {
        shareTotal: shareTot,
        savingsTotal: savTot,
        loanTotal: loanTot,
        accruedInterestPayableTotal: savIntTot,
        accruedInterestReceivableTotal: loanIntTot,
      },
      status: totalErrors === 0 ? "Validated-OK" : "Validated-With-Errors",
      dedupeOption: "UPDATE_BLANK",
      data: {
        members: stagedMembers,
        shares: stagedShares,
        savings: stagedSavings,
        loans: stagedLoans,
        ledgers: stagedLedgers,
      },
    };

    const batches = this.getStagingBatches();
    batches.unshift(newBatch);
    this.saveStagingBatches(batches.slice(0, 10)); // Keep last 10 batches

    return newBatch;
  }

  // --- 5. RECONCILIATION & SCORECARD ---
  public static async calculateReconciliationScorecard(draft: OpeningSetupDraft, activeBatch?: StagingBatch | null) {
    const totalDr = draft.ledgers.reduce((s, l) => s + l.dr, 0);
    const totalCr = draft.ledgers.reduce((s, l) => s + l.cr, 0);
    const diff = Math.round((totalDr - totalCr) * 100) / 100;

    // Control Ledgers (4-Khata compliant: 10 Share, 30 Savings, 110 Loans)
    const glShare = draft.ledgers
      .filter((l) => l.code === "10" || l.code.startsWith("10.") || l.code === "10.10")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    const glSavings = draft.ledgers
      .filter((l) => l.code === "30" || l.code.startsWith("30.") || l.code === "30.10")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    const glLoans = draft.ledgers
      .filter((l) => l.code === "110" || l.code.startsWith("110.") || (l.code === "30.1" && l.category === "ASSET"))
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    // Subledger totals from Batch or Live registers
    const subShare = activeBatch ? activeBatch.stagedTotals.shareTotal : glShare;
    const subSavings = activeBatch ? activeBatch.stagedTotals.savingsTotal : glSavings;
    const subLoans = activeBatch ? activeBatch.stagedTotals.loanTotal : glLoans;

    const shareDiff = Math.round((subShare - glShare) * 100) / 100;
    const savingsDiff = Math.round((subSavings - glSavings) * 100) / 100;
    const loanDiff = Math.round((subLoans - glLoans) * 100) / 100;

    const checks = [
      {
        id: "check_tb_equilibrium",
        titleNep: "प्रारम्भिक सन्तुलन परीक्षण डेबिट = क्रेडिट (Debit = Credit Equilibrium)",
        titleEng: "Opening Trial Balance Balance",
        status: Math.abs(diff) < 1 ? "PASSED" : "FAILED",
        message:
          Math.abs(diff) < 1
            ? `डेबिट रु. ${totalDr.toLocaleString()} र क्रेडिट रु. ${totalCr.toLocaleString()} पूर्ण सन्तुलित छ।`
            : `डेबिट र क्रेडिट बीच रु. ${diff.toLocaleString()} को फरक छ। कृपया मिलान गर्नुहोस् वा सस्पेन्स खातामा राख्नुहोस्।`,
      },
      {
        id: "check_subledger_share",
        titleNep: "सेयर रजिस्टर र मूल सेयर पुँजी मिलान (Share Subledger vs GL)",
        titleEng: "Share Subledger to GL Control Account",
        status: Math.abs(shareDiff) < 1 ? "PASSED" : "FAILED",
        message:
          Math.abs(shareDiff) < 1
            ? `सदस्य सेयर रजिस्टर (रु. ${subShare.toLocaleString()}) मूल पुँजी खातासँग दुरुस्त छ।`
            : `सेयर रजिस्टर (रु. ${subShare.toLocaleString()}) र मूल खाता (रु. ${glShare.toLocaleString()}) बीच रु. ${shareDiff.toLocaleString()} फरक छ!`,
      },
      {
        id: "check_subledger_savings",
        titleNep: "बचत रजिस्टर र मूल बचत दायित्व मिलान (Savings Subledger vs GL)",
        titleEng: "Savings Subledger to GL Control Account",
        status: Math.abs(savingsDiff) < 1 ? "PASSED" : "FAILED",
        message:
          Math.abs(savingsDiff) < 1
            ? `सदस्य बचत रजिस्टर (रु. ${subSavings.toLocaleString()}) मूल दायित्वसँग दुरुस्त छ।`
            : `बचत रजिस्टर (रु. ${subSavings.toLocaleString()}) र मूल खाता (रु. ${glSavings.toLocaleString()}) बीच रु. ${savingsDiff.toLocaleString()} फरक छ!`,
      },
      {
        id: "check_subledger_loan",
        titleNep: "कर्जा लगानी र मूल कर्जा सम्पत्ति मिलान (Loan Subledger vs GL)",
        titleEng: "Loan Subledger to GL Control Account",
        status: Math.abs(loanDiff) < 1 ? "PASSED" : "FAILED",
        message:
          Math.abs(loanDiff) < 1
            ? `सदस्य कर्जा रजिस्टर (रु. ${subLoans.toLocaleString()}) मूल सम्पत्ति खातासँग दुरुस्त छ।`
            : `कर्जा रजिस्टर (रु. ${subLoans.toLocaleString()}) र मूल सम्पत्ति (रु. ${glLoans.toLocaleString()}) बीच रु. ${loanDiff.toLocaleString()} फरक छ!`,
      },
      {
        id: "check_cash_bank_verified",
        titleNep: "नगद तथा बैंक मौज्दात भौतिक प्रमाणिकरण (Cash & Bank Verification)",
        titleEng: "Cash & Bank Statement Confirmation",
        status: draft.cashBankConfirmed ? "PASSED" : "WARNING",
        message: draft.cashBankConfirmed
          ? `नगद तथा बैंक मौज्दात भौतिक गणना तथा बैंक विवरणपत्र बमोजिम मिति ${draft.cashBankConfirmedDate || draft.goLiveDateBs} मा प्रमाणित गरियो।`
          : "नगद तथा बैंक विवरणपत्र रुजु भएको बक्समा टिक लगाई पुष्टि गर्नुहोस्।",
      },
    ];

    const canPost = checks.every((c) => c.status !== "FAILED");

    return {
      canPost,
      totalDr,
      totalCr,
      diff,
      glShare,
      subShare,
      shareDiff,
      glSavings,
      subSavings,
      savingsDiff,
      glLoans,
      subLoans,
      loanDiff,
      checks,
    };
  }

  // --- 6. COMMIT & POST OPENING SETUP TO LIVE DB ---
  public static async commitOpeningSetup(options: {
    executedBy: string;
    draft: OpeningSetupDraft;
    batch?: StagingBatch | null;
  }): Promise<{ success: boolean; message: string; backupFile: string }> {
    const { executedBy, draft, batch } = options;

    // Verify reconciliation before writing
    const scorecard = await this.calculateReconciliationScorecard(draft, batch);
    if (!scorecard.canPost) {
      throw new Error("प्रारम्भिक मौज्दात पोस्ट गर्न सकिएन! सन्तुलन परीक्षण वा सब-लेजर मिलान जाँचहरू असफल छन्।");
    }

    // 1. Automatic Backup before writing
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const today = new Date().toISOString().split("T")[0];
    const backupFileName = `pre_opening_setup_${today}_${Date.now()}.xlsx`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);
    if (fs.existsSync(EXCEL_PATH)) {
      fs.copyFileSync(EXCEL_PATH, backupPath);
    }

    const wb = await CoopExcelDB.loadWorkbook();
    const wsAssets = wb.getWorksheet(2);
    const wsLiab = wb.getWorksheet(3);
    const wsExp = wb.getWorksheet(4);
    const wsInc = wb.getWorksheet(5);
    const wsMember = wb.getWorksheet(6);
    const wsShare = wb.getWorksheet(7);
    const wsBachat = wb.getWorksheet(8);
    const wsLoan = wb.getWorksheet(9);

    if (!wsAssets || !wsLiab || !wsMember || !wsShare || !wsBachat || !wsLoan) {
      throw new Error("आवश्यक ४-खाता सिटहरू एक्सेल डेटाबेसमा फेला परेनन्।");
    }

    // Wipe any existing transaction rows so the system starts completely fresh
    for (let r = 7; r <= 22; r++) {
      const row = wsAssets.getRow(r);
      row.getCell(1).value = r - 6;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      for (let c = 5; c <= 25; c++) {
        if ([5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24].includes(c)) row.getCell(c).value = null;
      }
      row.commit();
    }
    for (let r = 24; r <= wsAssets.rowCount; r++) wsAssets.getRow(r).values = [];

    for (let r = 7; r <= 22; r++) {
      const row = wsLiab.getRow(r);
      row.getCell(1).value = r - 6;
      row.getCell(2).value = null;
      row.getCell(3).value = null;
      row.getCell(4).value = null;
      for (let c = 5; c <= 25; c++) {
        if ([5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24].includes(c)) row.getCell(c).value = null;
      }
      row.commit();
    }
    for (let r = 24; r <= wsLiab.rowCount; r++) wsLiab.getRow(r).values = [];

    if (wsExp) {
      for (let r = 5; r <= 21; r++) {
        const row = wsExp.getRow(r);
        row.getCell(1).value = r - 4;
        row.getCell(2).value = null;
        row.getCell(3).value = null;
        row.getCell(4).value = null;
        for (let c = 5; c <= 20; c++) row.getCell(c).value = null;
        row.commit();
      }
      for (let r = 23; r <= wsExp.rowCount; r++) wsExp.getRow(r).values = [];
    }
    if (wsInc) {
      for (let r = 5; r <= 21; r++) {
        const row = wsInc.getRow(r);
        row.getCell(1).value = r - 4;
        row.getCell(2).value = null;
        row.getCell(3).value = null;
        row.getCell(4).value = null;
        for (let c = 5; c <= 20; c++) row.getCell(c).value = null;
        row.commit();
      }
      for (let r = 23; r <= wsInc.rowCount; r++) wsInc.getRow(r).values = [];
    }

    for (let r = 9; r <= 24; r++) {
      const rowSh = wsShare.getRow(r);
      for (let c = 1; c <= 12; c++) rowSh.getCell(c).value = null;
      rowSh.commit();

      const rowSav = wsBachat.getRow(r);
      for (let c = 1; c <= 14; c++) rowSav.getCell(c).value = null;
      rowSav.commit();

      const rowLn = wsLoan.getRow(r);
      for (let c = 1; c <= 15; c++) rowLn.getCell(c).value = null;
      rowLn.commit();
    }
    for (let r = 26; r <= wsShare.rowCount; r++) wsShare.getRow(r).values = [];
    for (let r = 26; r <= wsBachat.rowCount; r++) wsBachat.getRow(r).values = [];
    for (let r = 26; r <= wsLoan.rowCount; r++) wsLoan.getRow(r).values = [];

    // 2. Write Opening Balances in Row 6 of Sheet 2 (Assets: 80 Cash, 90 Bank, 100 Inv, 110 Loan, 120 Rec, 130 Fixed, 140 Other)
    const cash = draft.ledgers
      .filter((l) => (l.code === "80" || l.code.startsWith("80.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    const bank = draft.ledgers
      .filter((l) => (l.code === "90" || l.code.startsWith("90.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    const inv = draft.ledgers
      .filter((l) => (l.code === "100" || l.code.startsWith("100.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    const loans = draft.ledgers
      .filter((l) => (l.code === "110" || l.code.startsWith("110.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    const rec = draft.ledgers
      .filter((l) => (l.code === "120" || l.code.startsWith("120.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);

    const fixedCost = draft.ledgers
      .filter((l) => (l.code === "130" || l.code === "130.1") && l.category === "ASSET")
      .reduce((s, l) => s + l.dr, 0);
    const fixedDepr = draft.ledgers
      .filter((l) => l.code === "130.2" && l.category === "ASSET")
      .reduce((s, l) => s + l.cr, 0);
    const netFixed = Math.max(0, fixedCost - fixedDepr);

    // Other Assets (140) + any custom asset heads
    const standardAssetCodes = [
      "80", "80.1", "80.2", "90", "90.1", "90.2",
      "100", "100.1", "100.2", "110", "110.1", "120", "120.1", "120.2",
      "130", "130.1", "130.2", "140", "140.1"
    ];
    const otherAssetsStandard = draft.ledgers
      .filter((l) => (l.code === "140" || l.code.startsWith("140.")) && l.category === "ASSET")
      .reduce((s, l) => s + (l.dr - l.cr), 0);
    const customAssetsDr = draft.ledgers
      .filter((l) => l.category === "ASSET" && !standardAssetCodes.includes(l.code) && !l.code.startsWith("80.") && !l.code.startsWith("90.") && !l.code.startsWith("100.") && !l.code.startsWith("110.") && !l.code.startsWith("120.") && !l.code.startsWith("130."))
      .reduce((s, l) => s + (l.dr - l.cr), 0);
    const otherAssets = otherAssetsStandard + customAssetsDr;

    const totalAssets = cash + bank + inv + loans + rec + netFixed + otherAssets;

    const aRow6 = wsAssets.getRow(6);
    aRow6.getCell(2).value = draft.goLiveDateBs;
    aRow6.getCell(3).value = `प्रारम्भिक सम्पत्ति मौज्दात (Opening Assets B/F - Go-Live: ${draft.goLiveDateBs})`;
    aRow6.getCell(4).value = "OB-001";
    aRow6.getCell(7).value = cash;
    aRow6.getCell(10).value = bank;
    aRow6.getCell(13).value = inv;
    aRow6.getCell(16).value = loans;
    aRow6.getCell(19).value = rec;
    aRow6.getCell(22).value = netFixed;
    aRow6.getCell(25).value = otherAssets;
    aRow6.getCell(26).value = { formula: "G6+J6+M6+P6+S6+V6+Y6", result: totalAssets };
    aRow6.commit();

    // 3. Write Opening Balances in Row 6 of Sheet 3 (Liabilities & Capital: 10 Share, 20 Reserves, 30 Deposits, 40 Borrow, 50 Grants, 60 Payables, 70 Other)
    const shareCap = draft.ledgers
      .filter((l) => l.code === "10" || l.code.startsWith("10.") || l.code === "10.10")
      .reduce((s, l) => s + (l.cr - l.dr), 0);
    
    // Reserves & Funds (Col 10): 20.x + 99.1 + legacy 20.x
    const totalReserves = draft.ledgers
      .filter((l) => (l.code === "20" || l.code.startsWith("20.") || l.code === "99.1") && l.category === "EQUITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    // Deposits (Col 13): 30.x + legacy 30.10, 30.20
    const savings = draft.ledgers
      .filter((l) => (l.code === "30" || l.code.startsWith("30.") || l.code === "30.10" || l.code === "30.20") && l.category === "LIABILITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    // Borrowings (Col 16): 40.x
    const borrow = draft.ledgers
      .filter((l) => (l.code === "40" || l.code.startsWith("40.") || l.code === "40.10") && l.category === "LIABILITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    // Grants (Col 19): 50.x
    const grants = draft.ledgers
      .filter((l) => (l.code === "50" || l.code.startsWith("50.") || l.code === "50.10") && l.category === "LIABILITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    // Payables (Col 22): 60.x
    const payables = draft.ledgers
      .filter((l) => (l.code === "60" || l.code.startsWith("60.") || l.code === "60.10" || l.code === "60.20") && l.category === "LIABILITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);

    // Other Liabilities & Provisions (Col 25): 70.x + Suspense 999.1 + custom liabilities/equity
    const standardLiabCodes = [
      "10", "10.1", "20", "20.1", "20.2", "20.3", "20.4", "20.5", "20.6",
      "30", "30.1", "30.2", "40", "40.1", "50", "50.1", "60", "60.1", "60.2",
      "70", "70.1", "70.2", "999", "999.1",
      "10.10", "20.10", "20.20", "20.30", "20.40", "20.50", "99.1",
      "30.10", "30.20", "40.10", "50.10", "60.10", "60.20", "70.10", "70.20"
    ];
    const otherLiabStandard = draft.ledgers
      .filter((l) => (l.code === "70" || l.code.startsWith("70.") || l.code === "70.10" || l.code === "70.20") && l.category === "LIABILITY")
      .reduce((s, l) => s + (l.cr - l.dr), 0);
    const suspense = draft.ledgers
      .filter((l) => l.code === "999" || l.code.startsWith("999."))
      .reduce((s, l) => s + (l.cr - l.dr), 0);
    const customLiabCr = draft.ledgers
      .filter((l) => (l.category === "LIABILITY" || l.category === "EQUITY") && !standardLiabCodes.includes(l.code))
      .reduce((s, l) => s + (l.cr - l.dr), 0);
    const otherLiab = otherLiabStandard + suspense + customLiabCr;

    const totalLiab = shareCap + totalReserves + savings + borrow + grants + payables + otherLiab;

    const lRow6 = wsLiab.getRow(6);
    lRow6.getCell(2).value = draft.goLiveDateBs;
    lRow6.getCell(3).value = `प्रारम्भिक दायित्व तथा पुँजी मौज्दात (Opening Liab B/F - Go-Live: ${draft.goLiveDateBs})`;
    lRow6.getCell(4).value = "OB-001";
    lRow6.getCell(7).value = shareCap;
    lRow6.getCell(10).value = totalReserves;
    lRow6.getCell(13).value = savings;
    lRow6.getCell(16).value = borrow;
    lRow6.getCell(19).value = grants;
    lRow6.getCell(22).value = payables;
    lRow6.getCell(25).value = otherLiab;
    lRow6.getCell(26).value = { formula: "G6+J6+M6+P6+S6+V6+Y6", result: totalLiab };
    lRow6.commit();

    // 4. If Scenario B (Mid-Year), write YTD Income and Expenses into Sheet 4 & 5
    if (draft.scenario === "B_MID_YEAR") {
      if (wsExp) {
        const rowE = wsExp.getRow(5);
        rowE.getCell(2).value = draft.goLiveDateBs;
        rowE.getCell(3).value = `वर्ष-सुरुदेखि गो-लाइभसम्मको सञ्चित खर्च (YTD Expenses B/F)`;
        rowE.getCell(4).value = "OB-YTD-EXP";
        
        let totalExpCalculated = 0;
        // Populate each 150.1 to 150.16 column (Cols 5 to 20)
        for (let i = 1; i <= 16; i++) {
          const code = `150.${i}`;
          const amt = draft.ledgers.find((l) => l.code === code)?.dr || 
            (draft.ytdIncomeExpenses?.expenses?.find((e: any) => e.code === code)?.amount) || 0;
          rowE.getCell(4 + i).value = amt;
          totalExpCalculated += amt;
        }
        rowE.getCell(21).value = totalExpCalculated;
        rowE.commit();
      }

      if (wsInc) {
        const rowI = wsInc.getRow(5);
        rowI.getCell(2).value = draft.goLiveDateBs;
        rowI.getCell(3).value = `वर्ष-सुरुदेखि गो-लाइभसम्मको सञ्चित आम्दानी (YTD Income B/F)`;
        rowI.getCell(4).value = "OB-YTD-INC";
        
        let totalIncCalculated = 0;
        // Populate each 160.1 to 160.16 column (Cols 5 to 20)
        for (let i = 1; i <= 16; i++) {
          const code = `160.${i}`;
          const amt = draft.ledgers.find((l) => l.code === code)?.cr || 
            (draft.ytdIncomeExpenses?.income?.find((inc: any) => inc.code === code)?.amount) || 0;
          rowI.getCell(4 + i).value = amt;
          totalIncCalculated += amt;
        }
        rowI.getCell(21).value = totalIncCalculated;
        rowI.commit();
      }
    }

    // 5. Update Sub-Ledger starting controls in Sheets 7, 8, 9
    wsShare.getRow(5).getCell(1).value = shareCap;
    wsShare.getRow(5).commit();

    wsBachat.getRow(5).getCell(1).value = savings;
    wsBachat.getRow(5).commit();

    wsLoan.getRow(5).getCell(1).value = loans;
    wsLoan.getRow(5).commit();

    // 6. Write Staged Members into Sheet 6 (Member KYC) if batch provided
    if (batch && batch.data.members.length > 0) {
      // Find starting row (Row 5 onwards)
      let curR = 5;
      for (const m of batch.data.members) {
        if (curR > 35) break; // Keep within standard bounds of sheet
        const mRow = wsMember.getRow(curR);
        mRow.getCell(1).value = m.memberId;
        mRow.getCell(2).value = m.nameNep;
        mRow.getCell(3).value = `[Photo: ${m.memberId}.jpg]`;
        mRow.getCell(4).value = m.citizenshipNo || "अप्राप्त (Draft KYC)";
        mRow.getCell(5).value = `${m.palika || "पुनर्वास"}-${m.wardNo || "०२"}, ${m.district || "कञ्चनपुर"}`;
        mRow.getCell(6).value = m.phone || "९८००००००००";
        mRow.getCell(7).value = m.nomineeName || "";
        mRow.getCell(8).value = m.nomineeRelation || "";
        mRow.getCell(9).value = m.joinDateBs || draft.goLiveDateBs;
        mRow.getCell(15).value = m.isDraftKyc ? "अपूर्ण (DRAFT_KYC)" : "सक्रिय (ACTIVE)";
        mRow.commit();
        curR++;
      }
    }

    // 7. Recalculate everything and commit workbook
    CoopExcelDB.recalculateAllTotals(wb);
    await CoopExcelDB.saveWorkbook(wb);

    // 8. Update Fiscal Year status in FiscalYears
    FiscalAuditEngine.updateFiscalYear({
      fyCode: draft.fiscalYear,
      startBs: draft.goLiveDateBs,
      endBs: draft.scenario === "A_FY_START" ? "२०८४/०३/३१" : "२०८४/०३/३१",
      status: "OPEN",
      auditRemarks: `गो-लाइभ प्रारम्भिक मौज्दात प्रविष्टि सम्पन्न भयो (मिति: ${draft.goLiveDateBs})।`,
    });

    // 9. Update Org Settings Status
    OrgSettingsManager.saveSettings({
      openingBalanceStatus: "Posted-Locked",
      systemGoLiveDateBs: draft.goLiveDateBs,
      systemGoLiveDateAd: draft.goLiveDateAd,
      firstFiscalYear: draft.fiscalYear,
      goLiveScenario: draft.scenario,
      suspenseLedgerBalance: suspense,
      suspenseLedgerReason: draft.suspenseReason,
    });

    // 10. Mark batch committed
    if (batch) {
      batch.status = "Committed";
      const batches = this.getStagingBatches();
      const idx = batches.findIndex((b) => b.batchId === batch.batchId);
      if (idx !== -1) batches[idx] = batch;
      this.saveStagingBatches(batches);
    }

    // 11. Write Audit Log
    await FiscalAuditEngine.logAuditAction(
      "OPENING_BALANCE_SETUP_POSTED",
      `संस्थाको प्रारम्भिक मौज्दात (Go-Live) आधिकारिक रूपमा पोस्ट तथा लक गरियो। कुल सम्पत्ति: रु. ${totalAssets.toLocaleString()}, दायित्व: रु. ${totalLiab.toLocaleString()}`,
      executedBy
    );

    return {
      success: true,
      message: `प्रारम्भिक मौज्दात (Go-Live Opening Balance) सफलतापूर्वक पोस्ट भई लक गरियो! नयाँ आर्थिक वर्ष ${draft.fiscalYear} सुरु भयो।`,
      backupFile: backupFileName,
    };
  }

  // --- 7. REOPEN / ROLLBACK OPENING SETUP ---
  public static async rollbackOpeningSetup(options: {
    adminUsername: string;
    reason: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!options.reason || options.reason.trim().length < 10) {
      throw new Error("प्रारम्भिक मौज्दात पुनः खोल्न कम्तिमा १० अक्षरको आधिकारिक कारण (Mandatory Reason) आवश्यक पर्छ।");
    }

    // Check backups for pre_opening_setup_
    const backups = fs.existsSync(BACKUPS_DIR)
      ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.includes("pre_opening_setup_"))
      : [];

    if (backups.length > 0) {
      backups.sort().reverse();
      const backupToRestore = path.join(BACKUPS_DIR, backups[0]);
      console.log(`[Rollback Opening] Restoring from ${backups[0]}...`);
      fs.copyFileSync(backupToRestore, EXCEL_PATH);
    }

    // Revert status to Draft
    OrgSettingsManager.saveSettings({
      openingBalanceStatus: "Draft",
    });

    // Log to AuditLog
    await FiscalAuditEngine.logAuditAction(
      "OPENING_BALANCE_REOPEN_ROLLBACK",
      `प्रशासक ${options.adminUsername} द्वारा प्रारम्भिक मौज्दात पुनः खोलियो (कारण: ${options.reason})`,
      options.adminUsername
    );

    return {
      success: true,
      message: "प्रारम्भिक मौज्दात सेटअप सफलतापूर्वक पुनः खोलियो (Reopened)। अघिल्लो ड्राफ्ट अवस्था पुनर्स्थापना भयो।",
    };
  }
}
