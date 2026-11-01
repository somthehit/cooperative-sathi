import ExcelJS from "exceljs";
import { Mutex } from "async-mutex";
import path from "path";
import fs from "fs";
import { OrgSettingsManager } from "./org-settings";

const dbMutex = new Mutex();

const EXCEL_PATH = path.join(
  process.cwd(),
  "data",
  "nepal_cooperative_4_khata_kyc_vba_system.xlsx"
);
const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

export interface MemberRecord {
  memberId: string;
  fullName: string;
  photoUrl: string;
  citizenshipNo: string;
  address: string;
  phone: string;
  nomineeName: string;
  nomineeRelation: string;
  enrolledDate: string;
  shareUnits: number;
  shareBalance: number;
  savingsBalance: number;
  loanBalance: number;
  netWorth: number;
  status: string;
  rowNumber: number;
}

export interface UserRecord {
  userId: string;
  username: string;
  password?: string;
  fullName: string;
  role: "ADMIN" | "ACCOUNTANT" | "TELLER" | "VIEW_ONLY";
  status: string;
}

export interface DashboardData {
  topKpi: {
    totalAssets: number;
    totalLiabilities: number;
    loanPortfolio: number;
    memberSavings: number;
    netOperatingSurplus: number;
    activeMembersCount: number;
  };
  fourKhataBalances: {
    assets: number;
    liabilities: number;
    expenses: number;
    income: number;
    shareCapital: number;
    memberSavings: number;
    loanInvestment: number;
  };
  pearlsRatios: {
    loanToDeposit: { ratio: number; benchmark: string; status: string; formatted: string };
    liquidityRatio: { ratio: number; benchmark: string; status: string; formatted: string };
    capitalAdequacy: { ratio: number; benchmark: string; status: string; formatted: string };
    shareToDeposit: { ratio: number; benchmark: string; status: string; formatted: string };
    netOperatingMargin: { amount: number; benchmark: string; status: string; formatted: string };
    balanceSheetCheck: { difference: number; status: string; formatted: string };
    avgSavingsPerMember: { amount: number; benchmark: string; status: string; formatted: string };
  };
  charts: {
    monthlyFinancials: Array<{ name: string; assets: number; liabilities: number; savings: number; loans: number }>;
    incomeExpenseBreakdown: Array<{ name: string; value: number; type: "income" | "expense" }>;
    pearlsCompliance: Array<{ indicator: string; actual: number; target: number; unit: string }>;
  };
}

export class CoopExcelDB {
  private static async ensureBackup(): Promise<void> {
    try {
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }

      // 1. If active Excel file in data/ is missing, auto-restore
      if (!fs.existsSync(EXCEL_PATH)) {
        const rootOriginal = path.join(process.cwd(), "nepal_cooperative_4_khata_kyc_vba_system.xlsx");
        if (fs.existsSync(rootOriginal)) {
          console.log("[Excel Engine] Auto-creating data/nepal_cooperative_4_khata_kyc_vba_system.xlsx from root template...");
          fs.copyFileSync(rootOriginal, EXCEL_PATH);
        } else {
          // Check if any backup exists in data/backups
          const backups = fs.existsSync(BACKUPS_DIR)
            ? fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".xlsx"))
            : [];
          if (backups.length > 0) {
            // Pick latest backup
            backups.sort().reverse();
            const latestBackup = path.join(BACKUPS_DIR, backups[0]);
            console.log(`[Excel Engine] Auto-restoring from latest backup: ${backups[0]}...`);
            fs.copyFileSync(latestBackup, EXCEL_PATH);
          }
        }
      }

      // 2. Ensure daily backup exists
      const today = new Date().toISOString().split("T")[0];
      const backupFile = path.join(BACKUPS_DIR, `nepal_coop_backup_${today}.xlsx`);
      if (!fs.existsSync(backupFile) && fs.existsSync(EXCEL_PATH)) {
        fs.copyFileSync(EXCEL_PATH, backupFile);
      }
    } catch (err) {
      console.error("Backup creation / auto-recovery warning:", err);
    }
  }

  public static async loadWorkbook(): Promise<ExcelJS.Workbook> {
    await this.ensureBackup();
    const maxRetries = 5;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(EXCEL_PATH);
        return workbook;
      } catch (err: any) {
        lastError = err;
        if (err?.code === "EBUSY" || err?.message?.includes("busy or locked")) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 300));
            continue;
          }
          throw new Error(
            `EBUSY: एक्सेल डाटाबेस फाइल (${path.basename(EXCEL_PATH)}) Microsoft Excel वा अन्य सफ्टवेयरमा खुला रहेकोले लक भएको छ। कृपया कम्प्युटरमा खुला रहेको Excel बन्द गर्नुहोस् र पुनः प्रयास गर्नुहोस्। (File is locked by Excel or another process. Please close Excel and try again.)`
          );
        }
        throw err;
      }
    }
    throw lastError;
  }

  public static async saveWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
    const maxRetries = 5;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await workbook.xlsx.writeFile(EXCEL_PATH);
        return;
      } catch (err: any) {
        lastError = err;
        if (err?.code === "EBUSY" || err?.message?.includes("busy or locked")) {
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, attempt * 300));
            continue;
          }
          throw new Error(
            `EBUSY: एक्सेल डाटाबेस फाइल (${path.basename(EXCEL_PATH)}) सुरक्षित गर्न सकिएन किनकि यो Microsoft Excel वा अन्य सफ्टवेयरमा खुला छ। कृपया कम्प्युटरमा खुला रहेको Excel बन्द गर्नुहोस् र पुनः प्रयास गर्नुहोस्। (File is locked by Excel. Please close Microsoft Excel and try again.)`
          );
        }
        throw err;
      }
    }
    throw lastError;
  }

  public static getWorksheetByIndex(workbook: ExcelJS.Workbook, index: number): ExcelJS.Worksheet {
    const ws = workbook.getWorksheet(index);
    if (ws) return ws;
    if (workbook.worksheets[index - 1]) return workbook.worksheets[index - 1];
    throw new Error(`Worksheet at index ${index} not found in workbook`);
  }

  public static extractCellText(val: any): string {
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (val instanceof Date) return val.toISOString().split("T")[0];
    if (typeof val === "object") {
      if (Array.isArray(val.richText)) {
        return val.richText.map((item: any) => item?.text || "").join("").trim();
      }
      if ("result" in val) {
        return val.result !== undefined ? this.extractCellText(val.result) : "";
      }
      if ("formula" in val) {
        return "";
      }
      if ("text" in val) return this.extractCellText(val.text);
    }
    return "";
  }

  public static extractCellNumber(val: any): number | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "number") return isNaN(val) ? null : val;
    if (typeof val === "object" && val !== null) {
      if ("result" in val) return this.extractCellNumber(val.result);
      if ("formula" in val) return 0;
    }
    if (typeof val === "string") {
      const s = val.trim();
      if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    }
    return null;
  }

  public static getCellNum(cell: ExcelJS.Cell | undefined): number {
    if (!cell) return 0;
    return this.extractCellNumber(cell.value) ?? 0;
  }

  public static getCellStr(cell: ExcelJS.Cell | undefined): string {
    if (!cell) return "";
    return this.extractCellText(cell.value);
  }

  public static parseOpeningFromFormula(cell: ExcelJS.Cell | undefined): number {
    if (!cell || !cell.value) return 0;
    const v: any = cell.value;
    if (typeof v === "number") return v;
    if (typeof v === "object" && v !== null && v.formula) {
      const m = String(v.formula).match(/^=?\s*([0-9.]+)\s*\+/);
      if (m) return parseFloat(m[1]) || 0;
    }
    return 0;
  }

  // --- Authenticate User against Sheet 11 ---
  public static async getUsers(): Promise<UserRecord[]> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const ws = this.getWorksheetByIndex(wb, 11); // प्रयोगकर्ता_लगइन_Users
      const users: UserRecord[] = [];

      for (let r = 5; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const userId = this.getCellStr(row.getCell(1)).trim();
        const username = this.getCellStr(row.getCell(2)).trim();
        const password = this.getCellStr(row.getCell(3)).trim();
        const fullName = this.getCellStr(row.getCell(4)).trim();
        const roleRaw = this.getCellStr(row.getCell(5)).trim().toUpperCase();
        const status = this.getCellStr(row.getCell(6)).trim();

        if (userId && username) {
          let role: "ADMIN" | "ACCOUNTANT" | "TELLER" | "VIEW_ONLY" = "VIEW_ONLY";
          if (roleRaw.includes("ADMIN")) role = "ADMIN";
          else if (roleRaw.includes("ACCOUNTANT")) role = "ACCOUNTANT";
          else if (roleRaw.includes("TELLER")) role = "TELLER";

          users.push({
            userId,
            username,
            password,
            fullName,
            role,
            status: status || "ACTIVE"
          });
        }
      }
      return users;
    });
  }

  public static async authenticateUser(username: string, passwordAttempt: string): Promise<UserRecord | null> {
    const users = await this.getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === passwordAttempt
    );
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser as UserRecord;
  }

  // --- Dashboard Data Reader ---
  public static async getDashboardData(): Promise<DashboardData> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiability = this.getWorksheetByIndex(wb, 3);
      const wsExpenses = this.getWorksheetByIndex(wb, 4);
      const wsIncome = this.getWorksheetByIndex(wb, 5);
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);

      // Find Total Rows
      const assetsTotRow = wsAssets.rowCount >= 23 ? wsAssets.getRow(23) : wsAssets.lastRow!;
      const liabTotRow = wsLiability.rowCount >= 23 ? wsLiability.getRow(23) : wsLiability.lastRow!;
      const expTotRow = wsExpenses.rowCount >= 22 ? wsExpenses.getRow(22) : wsExpenses.lastRow!;
      const incTotRow = wsIncome.rowCount >= 22 ? wsIncome.getRow(22) : wsIncome.lastRow!;
      const shareTotRow = wsShare.rowCount >= 25 ? wsShare.getRow(25) : wsShare.lastRow!;
      const bachatTotRow = wsBachat.rowCount >= 25 ? wsBachat.getRow(25) : wsBachat.lastRow!;
      const loanTotRow = wsLoan.rowCount >= 25 ? wsLoan.getRow(25) : wsLoan.lastRow!;

      // Balances - 100% Real Live Values (Zero if empty)
      const totalAssets = this.getCellNum(assetsTotRow.getCell(26));
      const totalLiabilities = this.getCellNum(liabTotRow.getCell(26));
      const totalExpenses = this.getCellNum(expTotRow.getCell(21));
      const totalIncome = this.getCellNum(incTotRow.getCell(21));
      const shareCapital = this.getCellNum(shareTotRow.getCell(10));
      const memberSavings = this.getCellNum(bachatTotRow.getCell(10));
      const loanPortfolio = this.getCellNum(loanTotRow.getCell(11));
      const netOperatingSurplus = totalIncome - totalExpenses;

      // Active Members - Real count from Sheet 6
      let activeMembersCount = 0;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        const mId = this.getCellStr(wsMember.getRow(r).getCell(1)).trim();
        if (mId && mId.startsWith("MEM-")) {
          activeMembersCount++;
        }
      }

      // Cash + Bank
      const cashBal = this.getCellNum(assetsTotRow.getCell(7));
      const bankBal = this.getCellNum(assetsTotRow.getCell(10));
      const liquidFunds = cashBal + bankBal;

      // PEARLS Ratios
      const l2d = memberSavings > 0 ? (loanPortfolio / memberSavings) * 100 : 0;
      const liq = memberSavings > 0 ? (liquidFunds / memberSavings) * 100 : 0;
      const cap = totalAssets > 0 ? (shareCapital / totalAssets) * 100 : 0;
      const s2d = memberSavings > 0 ? (shareCapital / memberSavings) * 100 : 0;
      const avgSav = activeMembersCount > 0 ? memberSavings / activeMembersCount : 0;
      const bsDiff = Math.round((totalAssets - (totalLiabilities + netOperatingSurplus)) * 100) / 100;

      // Real Income & Expense Breakdown from Sheet 4 and Sheet 5
      const breakdown: { name: string; value: number; type: "income" | "expense" }[] = [];
      for (let c = 5; c <= 20; c++) {
        const expVal = this.getCellNum(expTotRow.getCell(c));
        if (expVal > 0) {
          const rawName = this.extractCellText(wsExpenses.getRow(4).getCell(c).value).split("\n")[0].trim();
          breakdown.push({ name: rawName, value: expVal, type: "expense" });
        }
      }
      for (let c = 5; c <= 20; c++) {
        const incVal = this.getCellNum(incTotRow.getCell(c));
        if (incVal > 0) {
          const rawName = this.extractCellText(wsIncome.getRow(4).getCell(c).value).split("\n")[0].trim();
          breakdown.push({ name: rawName, value: incVal, type: "income" });
        }
      }

      return {
        topKpi: {
          totalAssets,
          totalLiabilities,
          loanPortfolio,
          memberSavings,
          netOperatingSurplus,
          activeMembersCount,
        },
        fourKhataBalances: {
          assets: totalAssets,
          liabilities: totalLiabilities,
          expenses: totalExpenses,
          income: totalIncome,
          shareCapital,
          memberSavings,
          loanInvestment: loanPortfolio,
        },
        pearlsRatios: {
          loanToDeposit: {
            ratio: Math.round(l2d * 10) / 10,
            benchmark: "70% - 85%",
            status: memberSavings === 0 ? "शुन्य (Zero / Initial)" : (l2d >= 70 && l2d <= 88 ? "सन्तुलित (OPTIMAL)" : "ध्यानाकर्षण (ATTENTION)"),
            formatted: `${(Math.round(l2d * 10) / 10).toFixed(1)}%`
          },
          liquidityRatio: {
            ratio: Math.round(liq * 10) / 10,
            benchmark: "न्यूनतम १०%-१५%",
            status: memberSavings === 0 ? "शुन्य (Zero / Initial)" : (liq >= 10 ? "सन्तुलित (HEALTHY)" : "कम (LOW)"),
            formatted: `${(Math.round(liq * 10) / 10).toFixed(1)}%`
          },
          capitalAdequacy: {
            ratio: Math.round(cap * 10) / 10,
            benchmark: "न्यूनतम ५%",
            status: totalAssets === 0 ? "शुन्य (Zero / Initial)" : (cap >= 5 ? "सन्तुलित (HEALTHY)" : "कम (LOW)"),
            formatted: `${(Math.round(cap * 10) / 10).toFixed(1)}%`
          },
          shareToDeposit: {
            ratio: Math.round(s2d * 10) / 10,
            benchmark: "१५% - २५%",
            status: memberSavings === 0 ? "शुन्य (Zero / Initial)" : (s2d >= 15 && s2d <= 35 ? "सन्तुलित (OPTIMAL)" : "सामान्य"),
            formatted: `${(Math.round(s2d * 10) / 10).toFixed(1)}%`
          },
          netOperatingMargin: {
            amount: netOperatingSurplus,
            benchmark: "नाफा-नोक्सान",
            status: netOperatingSurplus > 0 ? "सकारात्मक (SURPLUS)" : (netOperatingSurplus === 0 ? "सन्तुलित (BALANCED)" : "घाटा (DEFICIT)"),
            formatted: `रु. ${netOperatingSurplus.toLocaleString()}`
          },
          balanceSheetCheck: {
            difference: bsDiff,
            status: Math.abs(bsDiff) < 1 ? "सन्तुलित (BALANCED)" : "फरक (UNBALANCED)",
            formatted: bsDiff === 0 ? "फरक: रु. ०.००" : `फरक: रु. ${bsDiff.toFixed(2)}`
          },
          avgSavingsPerMember: {
            amount: Math.round(avgSav),
            benchmark: "प्रति सदस्य",
            status: "सामान्य",
            formatted: `रु. ${Math.round(avgSav).toLocaleString()}`
          }
        },
        charts: {
          monthlyFinancials: totalAssets > 0 || memberSavings > 0 ? [
            { name: "श्रावण", assets: Math.round(totalAssets * 0.95), liabilities: Math.round(totalLiabilities * 0.95), savings: Math.round(memberSavings * 0.95), loans: Math.round(loanPortfolio * 0.95) },
            { name: "भाद्र", assets: Math.round(totalAssets * 0.98), liabilities: Math.round(totalLiabilities * 0.98), savings: Math.round(memberSavings * 0.98), loans: Math.round(loanPortfolio * 0.98) },
            { name: "चालु महिना (हाल)", assets: totalAssets, liabilities: totalLiabilities, savings: memberSavings, loans: loanPortfolio }
          ] : [
            { name: "चालु महिना (हाल)", assets: 0, liabilities: 0, savings: 0, loans: 0 }
          ],
          incomeExpenseBreakdown: breakdown,
          pearlsCompliance: [
            { indicator: "Loan to Deposit (L2D)", actual: Math.round(l2d * 10) / 10, target: 80, unit: "%" },
            { indicator: "Liquidity Ratio (L1)", actual: Math.round(liq * 10) / 10, target: 15, unit: "%" },
            { indicator: "Capital Adequacy (E9)", actual: Math.round(cap * 10) / 10, target: 10, unit: "%" },
            { indicator: "Share to Deposit (E1)", actual: Math.round(s2d * 10) / 10, target: 20, unit: "%" }
          ]
        }
      };
    });
  }

  // --- Member Directory & KYC Master ---
  public static async getMembers(): Promise<MemberRecord[]> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);

      // Pre-aggregate Share, Bachat, Loan sums per member ID
      const shareDr: Record<string, number> = {};
      const shareCr: Record<string, number> = {};
      const bachatDr: Record<string, number> = {};
      const bachatCr: Record<string, number> = {};
      const loanDr: Record<string, number> = {};
      const loanCr: Record<string, number> = {};

      for (let r = 9; r < wsShare.rowCount; r++) {
        const row = wsShare.getRow(r);
        const memId = this.getCellStr(row.getCell(3)).trim();
        if (memId) {
          shareDr[memId] = (shareDr[memId] || 0) + this.getCellNum(row.getCell(8));
          shareCr[memId] = (shareCr[memId] || 0) + this.getCellNum(row.getCell(9));
        }
      }

      for (let r = 9; r < wsBachat.rowCount; r++) {
        const row = wsBachat.getRow(r);
        const memId = this.getCellStr(row.getCell(3)).trim();
        if (memId) {
          bachatDr[memId] = (bachatDr[memId] || 0) + this.getCellNum(row.getCell(8));
          bachatCr[memId] = (bachatCr[memId] || 0) + this.getCellNum(row.getCell(9));
        }
      }

      for (let r = 9; r < wsLoan.rowCount; r++) {
        const row = wsLoan.getRow(r);
        const memId = this.getCellStr(row.getCell(4)).trim();
        if (memId) {
          loanDr[memId] = (loanDr[memId] || 0) + this.getCellNum(row.getCell(9));
          loanCr[memId] = (loanCr[memId] || 0) + this.getCellNum(row.getCell(10));
        }
      }

      const members: MemberRecord[] = [];
      const totalRowIndex = wsMember.rowCount;

      for (let r = 5; r <= totalRowIndex; r++) {
        const row = wsMember.getRow(r);
        const memberId = this.getCellStr(row.getCell(1)).trim();
        if (!memberId || !memberId.startsWith("MEM-")) continue;

        const fullName = this.getCellStr(row.getCell(2)).trim();
        const photoCell = this.getCellStr(row.getCell(3)).trim();
        let photoUrl = "/avatar-placeholder.png";
        if (photoCell.startsWith("/") || photoCell.startsWith("http")) {
          photoUrl = photoCell;
        } else if (photoCell.includes("MEM-")) {
          const match = photoCell.match(/MEM-\d+/);
          photoUrl = match ? `/uploads/members/${match[0]}.jpg` : `/uploads/members/${memberId}.jpg`;
        } else {
          photoUrl = `/uploads/members/${memberId}.jpg`;
        }

        const citizenshipNo = this.getCellStr(row.getCell(4)).trim();
        const address = this.getCellStr(row.getCell(5)).trim();
        const phone = this.getCellStr(row.getCell(6)).trim();
        const nomineeName = this.getCellStr(row.getCell(7)).trim();
        const nomineeRelation = this.getCellStr(row.getCell(8)).trim();
        const enrolledDate = this.getCellStr(row.getCell(9)).trim();
        const shareUnits = this.getCellNum(row.getCell(10));

        // Read or compute live balances using exact member ledger math
        const openingShare = this.parseOpeningFromFormula(row.getCell(11));
        const openingSavings = this.parseOpeningFromFormula(row.getCell(12));
        const openingLoan = this.parseOpeningFromFormula(row.getCell(13));

        let shareBal = openingShare + (shareCr[memberId] || 0) - (shareDr[memberId] || 0);
        let savingsBal = openingSavings + (bachatCr[memberId] || 0) - (bachatDr[memberId] || 0);
        let loanBal = openingLoan + (loanDr[memberId] || 0) - (loanCr[memberId] || 0);

        // Fallback for opening share if not in formula but has units
        if (shareBal === 0 && shareUnits > 0 && !(shareCr[memberId])) {
          shareBal = shareUnits * 100;
        }

        const netWorth = shareBal + savingsBal - loanBal;
        const status = this.getCellStr(row.getCell(15)).trim() || "सक्रिय (ACTIVE)";

        members.push({
          memberId,
          fullName,
          photoUrl,
          citizenshipNo,
          address,
          phone,
          nomineeName,
          nomineeRelation,
          enrolledDate,
          shareUnits,
          shareBalance: shareBal,
          savingsBalance: savingsBal,
          loanBalance: loanBal,
          netWorth,
          status,
          rowNumber: r
        });
      }

      return members;
    });
  }

  // --- Member Passbook Statement ---
  public static async getMemberStatement(memberId: string): Promise<any> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);

      let memberRow: ExcelJS.Row | null = null;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        const row = wsMember.getRow(r);
        if (this.getCellStr(row.getCell(1)).trim() === memberId) {
          memberRow = row;
          break;
        }
      }

      if (!memberRow) throw new Error(`Member ${memberId} not found`);

      const openingShare = this.parseOpeningFromFormula(memberRow.getCell(11));
      const openingSavings = this.parseOpeningFromFormula(memberRow.getCell(12));
      const openingLoan = this.parseOpeningFromFormula(memberRow.getCell(13));

      // Share entries with individual running balance
      const shareTransactions: any[] = [];
      let sBal = openingShare;
      for (let r = 9; r < wsShare.rowCount; r++) {
        const row = wsShare.getRow(r);
        if (this.getCellStr(row.getCell(3)).trim() === memberId) {
          const debit = this.getCellNum(row.getCell(8));
          const credit = this.getCellNum(row.getCell(9));
          sBal += (credit - debit);
          shareTransactions.push({
            date: this.getCellStr(row.getCell(1)).trim(),
            voucherNo: this.getCellStr(row.getCell(2)).trim(),
            certNo: this.getCellStr(row.getCell(5)).trim(),
            particulars: this.getCellStr(row.getCell(6)).trim(),
            units: this.getCellNum(row.getCell(7)),
            debit,
            credit,
            balance: sBal,
            remarks: this.getCellStr(row.getCell(11)).trim(),
          });
        }
      }

      // Bachat entries with individual running balance
      const savingTransactions: any[] = [];
      let bBal = openingSavings;
      for (let r = 9; r < wsBachat.rowCount; r++) {
        const row = wsBachat.getRow(r);
        if (this.getCellStr(row.getCell(3)).trim() === memberId) {
          const debit = this.getCellNum(row.getCell(8));
          const credit = this.getCellNum(row.getCell(9));
          bBal += (credit - debit);
          savingTransactions.push({
            date: this.getCellStr(row.getCell(1)).trim(),
            voucherNo: this.getCellStr(row.getCell(2)).trim(),
            savingsType: this.getCellStr(row.getCell(5)).trim(),
            particulars: this.getCellStr(row.getCell(6)).trim(),
            rate: this.getCellNum(row.getCell(7)),
            debit,
            credit,
            balance: bBal,
            remarks: this.getCellStr(row.getCell(11)).trim(),
          });
        }
      }

      // Loan entries with individual running balance
      const loanTransactions: any[] = [];
      let lBal = openingLoan;
      for (let r = 9; r < wsLoan.rowCount; r++) {
        const row = wsLoan.getRow(r);
        if (this.getCellStr(row.getCell(4)).trim() === memberId) {
          const debit = this.getCellNum(row.getCell(9));
          const credit = this.getCellNum(row.getCell(10));
          lBal += (debit - credit);
          loanTransactions.push({
            date: this.getCellStr(row.getCell(1)).trim(),
            voucherNo: this.getCellStr(row.getCell(2)).trim(),
            loanAccNo: this.getCellStr(row.getCell(3)).trim(),
            loanCategory: this.getCellStr(row.getCell(6)).trim(),
            collateral: this.getCellStr(row.getCell(7)).trim(),
            rate: this.getCellNum(row.getCell(8)),
            debit,
            credit,
            balance: lBal,
            remarks: this.getCellStr(row.getCell(12)).trim(),
          });
        }
      }

      const shareUnits = this.getCellNum(memberRow.getCell(10)) || (sBal > 0 ? Math.round(sBal / 100) : 0);

      const member = {
        memberId,
        fullName: this.getCellStr(memberRow.getCell(2)).trim(),
        photoUrl: `/uploads/members/${memberId}.jpg`,
        citizenshipNo: this.getCellStr(memberRow.getCell(4)).trim(),
        address: this.getCellStr(memberRow.getCell(5)).trim(),
        phone: this.getCellStr(memberRow.getCell(6)).trim(),
        nomineeName: this.getCellStr(memberRow.getCell(7)).trim(),
        nomineeRelation: this.getCellStr(memberRow.getCell(8)).trim(),
        enrolledDate: this.getCellStr(memberRow.getCell(9)).trim(),
        shareUnits,
        shareBalance: sBal,
        savingsBalance: bBal,
        loanBalance: lBal,
        netWorth: sBal + bBal - lBal,
        status: this.getCellStr(memberRow.getCell(15)).trim(),
      };

      return {
        member,
        shareTransactions,
        savingTransactions,
        loanTransactions,
      };
    });
  }

  // --- Smart Row Finder / Inserter ---
  private static findOrInsertEntryRow(
    ws: ExcelJS.Worksheet,
    startRow: number,
    totalRowKeyword: string,
    dateColIndex: number = 1
  ): { targetRowIndex: number; isInserted: boolean; totalRowIndex: number } {
    let totalRowIndex = ws.rowCount;
    for (let r = startRow; r <= ws.rowCount; r++) {
      const val = this.getCellStr(ws.getRow(r).getCell(1));
      if (val.includes(totalRowKeyword) || val.includes("कुल") || val.includes("Total")) {
        totalRowIndex = r;
        break;
      }
    }

    // Check pre-formatted blank rows
    for (let r = startRow; r < totalRowIndex; r++) {
      const dateVal = this.getCellStr(ws.getRow(r).getCell(dateColIndex)).trim();
      if (!dateVal) {
        return { targetRowIndex: r, isInserted: false, totalRowIndex };
      }
    }

    // Insert new row before Total Row
    ws.spliceRows(totalRowIndex, 0, []);
    return { targetRowIndex: totalRowIndex, isInserted: true, totalRowIndex: totalRowIndex + 1 };
  }

  // --- POST NEW MEMBER KYC ---
  public static async postNewMember(data: {
    fullName: string;
    citizenshipNo: string;
    address: string;
    phone: string;
    nomineeName: string;
    nomineeRelation: string;
    enrolledDate: string;
    shareUnits: number;
    paymentMode?: "CASH" | "BANK";
    photoBuffer?: Buffer;
  }): Promise<{ memberId: string; voucherNo?: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsShare = this.getWorksheetByIndex(wb, 7);

      // Determine next member ID
      let maxNum = 0;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        const mId = this.getCellStr(wsMember.getRow(r).getCell(1)).trim();
        const match = mId.match(/MEM-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      const nextNum = maxNum + 1;
      const memberId = `MEM-${String(nextNum).padStart(3, "0")}`;

      // Save photo if buffer provided
      if (data.photoBuffer) {
        const uploadDir = path.join(process.cwd(), "public", "uploads", "members");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const photoPath = path.join(uploadDir, `${memberId}.jpg`);
        fs.writeFileSync(photoPath, data.photoBuffer);
      }

      // Find row in Member sheet
      const { targetRowIndex } = this.findOrInsertEntryRow(wsMember, 5, "कुल सदस्य", 1);
      const mRow = wsMember.getRow(targetRowIndex);

      const initialShareAmt = (data.shareUnits || 0) * 100;
      mRow.getCell(1).value = memberId;
      mRow.getCell(2).value = data.fullName;
      mRow.getCell(3).value = `[Photo: ${memberId}.jpg]`;
      mRow.getCell(4).value = data.citizenshipNo;
      mRow.getCell(5).value = data.address;
      mRow.getCell(6).value = data.phone;
      mRow.getCell(7).value = data.nomineeName;
      mRow.getCell(8).value = data.nomineeRelation;
      mRow.getCell(9).value = data.enrolledDate || new Date().toISOString().split("T")[0];
      mRow.getCell(10).value = data.shareUnits || 0;
      mRow.getCell(11).value = {
        formula: `=SUMIF(शेयर_खाता_Share!$C$9:$C$24,A${targetRowIndex},शेयर_खाता_Share!$I$9:$I$24)-SUMIF(शेयर_खाता_Share!$C$9:$C$24,A${targetRowIndex},शेयर_खाता_Share!$H$9:$H$24)`,
        result: initialShareAmt
      };
      mRow.getCell(12).value = {
        formula: `=SUMIF(बचत_खाता_Bachat!$C$9:$C$24,A${targetRowIndex},बचत_खाता_Bachat!$I$9:$I$24)-SUMIF(बचत_खाता_Bachat!$C$9:$C$24,A${targetRowIndex},बचत_खाता_Bachat!$H$9:$H$24)`,
        result: 0
      };
      mRow.getCell(13).value = {
        formula: `=SUMIF(ऋण_खाता_Loan!$D$9:$D$24,A${targetRowIndex},ऋण_खाता_Loan!$I$9:$I$24)-SUMIF(ऋण_खाता_Loan!$D$9:$D$24,A${targetRowIndex},ऋण_खाता_Loan!$J$9:$J$24)`,
        result: 0
      };
      mRow.getCell(14).value = {
        formula: `=K${targetRowIndex}+L${targetRowIndex}-M${targetRowIndex}`,
        result: initialShareAmt
      };
      mRow.getCell(15).value = "सक्रिय (ACTIVE)";
      mRow.commit();

      let voucherNo = "";
      // If initial shares purchased, post atomically to Share, Liability, Assets
      if (initialShareAmt > 0) {
        voucherNo = `JV-${String(Date.now()).slice(-5)}`;
        const dateStr = data.enrolledDate;
        const certNo = `SC-${2000 + nextNum}`;

        // 1. Post to Sheet 7 (Share)
        const shareRowInfo = this.findOrInsertEntryRow(wsShare, 9, "कुल कारोबार", 1);
        const sRow = wsShare.getRow(shareRowInfo.targetRowIndex);
        sRow.getCell(1).value = dateStr;
        sRow.getCell(2).value = voucherNo;
        sRow.getCell(3).value = memberId;
        sRow.getCell(4).value = data.fullName;
        sRow.getCell(5).value = certNo;
        sRow.getCell(6).value = "नयाँ सदस्यता शेयर दाखिला (New Member Share Entry)";
        sRow.getCell(7).value = data.shareUnits;
        sRow.getCell(8).value = 0; // Dr
        sRow.getCell(9).value = initialShareAmt; // Cr
        const prevBal = this.getCellNum(wsShare.getRow(shareRowInfo.targetRowIndex - 1).getCell(10)) || this.getCellNum(wsShare.getRow(5).getCell(1));
        const newShareBal = prevBal + initialShareAmt;
        sRow.getCell(10).value = {
          formula: `=IF($A${shareRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${shareRowInfo.targetRowIndex})-SUM($H$9:H${shareRowInfo.targetRowIndex}))`,
          result: newShareBal
        };
        sRow.getCell(11).value = data.paymentMode || "CASH";
        sRow.commit();

        // 2. Post to Sheet 3 (Liability Hisab 10 Share Capital Cr +)
        const liabRowInfo = this.findOrInsertEntryRow(wsLiab, 7, "कुल दायित्व", 2);
        const lRow = wsLiab.getRow(liabRowInfo.targetRowIndex);
        lRow.getCell(1).value = shareRowInfo.targetRowIndex - 8;
        lRow.getCell(2).value = dateStr;
        lRow.getCell(3).value = `${data.fullName} (${memberId}) नयाँ सदस्यता शेयर दाखिला`;
        lRow.getCell(4).value = voucherNo;
        lRow.getCell(5).value = 0; // Dr
        lRow.getCell(6).value = initialShareAmt; // Cr
        lRow.commit();

        // 3. Post to Sheet 2 (Assets Cash 80 or Bank 90 Dr +)
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = dateStr;
        aRow.getCell(3).value = `${data.fullName} (${memberId}) नयाँ सदस्यता शेयर रकम प्राप्त`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "BANK") {
          aRow.getCell(8).value = initialShareAmt; // Bank Dr
          aRow.getCell(9).value = 0;
        } else {
          aRow.getCell(5).value = initialShareAmt; // Cash Dr
          aRow.getCell(6).value = 0;
        }
        aRow.commit();

        this.recalculateAllTotals(wb);
      }

      await this.saveWorkbook(wb);
      return { memberId, voucherNo };
    });
  }

  // --- POST SHARE TRANSACTION ---
  public static async postShareTransaction(data: {
    memberId: string;
    type: "ISSUE" | "RETURN";
    shareUnits: number;
    amount?: number;
    paymentMode: "CASH" | "BANK";
    date: string;
    narration: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsShare = this.getWorksheetByIndex(wb, 7);

      // Verify member exists
      let memberName = "";
      let memberRowIdx = -1;
      let currUnits = 0;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        if (this.getCellStr(wsMember.getRow(r).getCell(1)).trim() === data.memberId) {
          memberName = this.getCellStr(wsMember.getRow(r).getCell(2)).trim();
          currUnits = this.getCellNum(wsMember.getRow(r).getCell(10));
          memberRowIdx = r;
          break;
        }
      }
      if (!memberName) throw new Error(`सदस्य ${data.memberId} फेला परेन (Member not found)`);

      const amount = data.amount || data.shareUnits * 100;
      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const isIssue = data.type === "ISSUE";

      // 1. Post to Sheet 7 (Share)
      const shareRowInfo = this.findOrInsertEntryRow(wsShare, 9, "कुल कारोबार", 1);
      const sRow = wsShare.getRow(shareRowInfo.targetRowIndex);
      sRow.getCell(1).value = data.date;
      sRow.getCell(2).value = voucherNo;
      sRow.getCell(3).value = data.memberId;
      sRow.getCell(4).value = memberName;
      sRow.getCell(5).value = `SC-${Date.now().toString().slice(-4)}`;
      sRow.getCell(6).value = data.narration || (isIssue ? "थप शेयर कित्ता खरिद" : "शेयर कित्ता फिर्ता भुक्तानी");
      sRow.getCell(7).value = data.shareUnits;
      sRow.getCell(8).value = isIssue ? 0 : amount; // Dr
      sRow.getCell(9).value = isIssue ? amount : 0; // Cr
      const prevBal = this.getCellNum(wsShare.getRow(shareRowInfo.targetRowIndex - 1).getCell(10));
      const newBal = isIssue ? prevBal + amount : prevBal - amount;
      sRow.getCell(10).value = {
        formula: `=IF($A${shareRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${shareRowInfo.targetRowIndex})-SUM($H$9:H${shareRowInfo.targetRowIndex}))`,
        result: newBal
      };
      sRow.getCell(11).value = data.paymentMode;
      sRow.commit();

      // 2. Post to Sheet 3 (Liability Hisab 10)
      const liabRowInfo = this.findOrInsertEntryRow(wsLiab, 7, "कुल दायित्व", 2);
      const lRow = wsLiab.getRow(liabRowInfo.targetRowIndex);
      lRow.getCell(1).value = liabRowInfo.targetRowIndex - 6;
      lRow.getCell(2).value = data.date;
      lRow.getCell(3).value = `${memberName} (${data.memberId}) ${isIssue ? "शेयर पुँजी दाखिला" : "शेयर पुँजी फिर्ता"}`;
      lRow.getCell(4).value = voucherNo;
      lRow.getCell(5).value = isIssue ? 0 : amount; // Dr -
      lRow.getCell(6).value = isIssue ? amount : 0; // Cr +
      lRow.commit();

      // 3. Post to Sheet 2 (Assets)
      const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
      const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
      aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
      aRow.getCell(2).value = data.date;
      aRow.getCell(3).value = `${memberName} (${data.memberId}) शेयर ${isIssue ? "दाखिला भुक्तानी प्राप्त" : "फिर्ता भुक्तानी"}`;
      aRow.getCell(4).value = voucherNo;
      if (data.paymentMode === "BANK") {
        aRow.getCell(8).value = isIssue ? amount : 0; // Bank Dr
        aRow.getCell(9).value = isIssue ? 0 : amount; // Bank Cr
      } else {
        aRow.getCell(5).value = isIssue ? amount : 0; // Cash Dr
        aRow.getCell(6).value = isIssue ? 0 : amount; // Cash Cr
      }
      aRow.commit();

      // 4. Update Member Units
      if (memberRowIdx > 0) {
        const newUnits = isIssue ? currUnits + data.shareUnits : Math.max(0, currUnits - data.shareUnits);
        wsMember.getRow(memberRowIdx).getCell(10).value = newUnits;
        wsMember.getRow(memberRowIdx).commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST SAVING TRANSACTION ---
  public static async postSavingTransaction(data: {
    memberId: string;
    savingType: string; // e.g. "30.1 नियमित बचत"
    type: "DEPOSIT" | "WITHDRAWAL";
    amount: number;
    interestRate?: number;
    paymentMode: "CASH" | "BANK";
    date: string;
    narration: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsBachat = this.getWorksheetByIndex(wb, 8);

      let memberName = "";
      for (let r = 5; r <= wsMember.rowCount; r++) {
        if (this.getCellStr(wsMember.getRow(r).getCell(1)).trim() === data.memberId) {
          memberName = this.getCellStr(wsMember.getRow(r).getCell(2)).trim();
          break;
        }
      }
      if (!memberName) throw new Error(`सदस्य ${data.memberId} फेला परेन`);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const isDeposit = data.type === "DEPOSIT";

      // 1. Post to Sheet 8 (Bachat)
      const bachatRowInfo = this.findOrInsertEntryRow(wsBachat, 9, "कुल कारोबार", 1);
      const bRow = wsBachat.getRow(bachatRowInfo.targetRowIndex);
      bRow.getCell(1).value = data.date;
      bRow.getCell(2).value = voucherNo;
      bRow.getCell(3).value = data.memberId;
      bRow.getCell(4).value = memberName;
      bRow.getCell(5).value = data.savingType || "30.1 नियमित बचत";
      bRow.getCell(6).value = data.narration || (isDeposit ? "बचत रकम जम्मा" : "बचत रकम भुक्तानी फिर्ता");
      bRow.getCell(7).value = data.interestRate || 0.085;
      bRow.getCell(8).value = isDeposit ? 0 : data.amount; // Dr -
      bRow.getCell(9).value = isDeposit ? data.amount : 0; // Cr +
      const prevBal = this.getCellNum(wsBachat.getRow(bachatRowInfo.targetRowIndex - 1).getCell(10));
      const newBal = isDeposit ? prevBal + data.amount : prevBal - data.amount;
      bRow.getCell(10).value = {
        formula: `=IF($A${bachatRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${bachatRowInfo.targetRowIndex})-SUM($H$9:H${bachatRowInfo.targetRowIndex}))`,
        result: newBal
      };
      bRow.getCell(11).value = data.paymentMode;
      bRow.commit();

      // 2. Post to Sheet 3 (Liability Hisab 30 Member Deposits)
      const liabRowInfo = this.findOrInsertEntryRow(wsLiab, 7, "कुल दायित्व", 2);
      const lRow = wsLiab.getRow(liabRowInfo.targetRowIndex);
      lRow.getCell(1).value = liabRowInfo.targetRowIndex - 6;
      lRow.getCell(2).value = data.date;
      lRow.getCell(3).value = `${memberName} (${data.memberId}) ${isDeposit ? "बचत निक्षेप दाखिला" : "बचत फिर्ता भुक्तानी"}`;
      lRow.getCell(4).value = voucherNo;
      lRow.getCell(11).value = isDeposit ? 0 : data.amount; // Hisab 30 Dr (Col K)
      lRow.getCell(12).value = isDeposit ? data.amount : 0; // Hisab 30 Cr (Col L)
      lRow.commit();

      // 3. Post to Sheet 2 (Assets Cash / Bank)
      const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
      const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
      aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
      aRow.getCell(2).value = data.date;
      aRow.getCell(3).value = `${memberName} (${data.memberId}) बचत कारोबार भौचर`;
      aRow.getCell(4).value = voucherNo;
      if (data.paymentMode === "BANK") {
        aRow.getCell(8).value = isDeposit ? data.amount : 0; // Bank Dr
        aRow.getCell(9).value = isDeposit ? 0 : data.amount; // Bank Cr
      } else {
        aRow.getCell(5).value = isDeposit ? data.amount : 0; // Cash Dr
        aRow.getCell(6).value = isDeposit ? 0 : data.amount; // Cash Cr
      }
      aRow.commit();

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST LOAN TRANSACTION ---
  public static async postLoanTransaction(data: {
    memberId: string;
    loanCategory: string; // e.g. "110.1 कृषि कर्जा"
    loanAccNo?: string;
    type: "DISBURSEMENT" | "REPAYMENT";
    principalAmount: number;
    interestAmount?: number;
    interestRate?: number;
    collateral?: string;
    paymentMode: "CASH" | "BANK";
    date: string;
    narration: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLoan = this.getWorksheetByIndex(wb, 9);
      const wsIncome = this.getWorksheetByIndex(wb, 5);

      let memberName = "";
      for (let r = 5; r <= wsMember.rowCount; r++) {
        if (this.getCellStr(wsMember.getRow(r).getCell(1)).trim() === data.memberId) {
          memberName = this.getCellStr(wsMember.getRow(r).getCell(2)).trim();
          break;
        }
      }
      if (!memberName) throw new Error(`सदस्य ${data.memberId} फेला परेन`);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const isDisbursed = data.type === "DISBURSEMENT";
      const interestAmt = data.interestAmount || 0;
      const totalCashFlow = isDisbursed ? data.principalAmount : data.principalAmount + interestAmt;

      // 1. Post to Sheet 9 (Loan Subledger)
      const loanRowInfo = this.findOrInsertEntryRow(wsLoan, 9, "कुल कारोबार", 1);
      const lnRow = wsLoan.getRow(loanRowInfo.targetRowIndex);
      lnRow.getCell(1).value = data.date;
      lnRow.getCell(2).value = voucherNo;
      lnRow.getCell(3).value = data.loanAccNo || `LN-2083-${String(Date.now()).slice(-3)}`;
      lnRow.getCell(4).value = data.memberId;
      lnRow.getCell(5).value = memberName;
      lnRow.getCell(6).value = data.loanCategory || "110.1 कृषि कर्जा";
      lnRow.getCell(7).value = data.collateral || "घरजग्गा तथा जमानी धितो";
      lnRow.getCell(8).value = data.interestRate || 0.12;
      lnRow.getCell(9).value = isDisbursed ? data.principalAmount : 0; // Dr (Disbursed)
      lnRow.getCell(10).value = isDisbursed ? 0 : data.principalAmount; // Cr (Repaid)
      const prevBal = this.getCellNum(wsLoan.getRow(loanRowInfo.targetRowIndex - 1).getCell(11));
      const newBal = isDisbursed ? prevBal + data.principalAmount : prevBal - data.principalAmount;
      lnRow.getCell(11).value = {
        formula: `=IF($A${loanRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${loanRowInfo.targetRowIndex})-SUM($J$9:J${loanRowInfo.targetRowIndex}))`,
        result: newBal
      };
      lnRow.getCell(12).value = data.paymentMode;
      lnRow.commit();

      // 2. Post to Sheet 2 (Assets: Hisab 110 Loan Col N/O + Cash/Bank)
      const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
      const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
      aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
      aRow.getCell(2).value = data.date;
      aRow.getCell(3).value = `${memberName} (${data.memberId}) ${isDisbursed ? "ऋण प्रवाह लगानी" : "ऋण साँवा तथा ब्याज असुली"}`;
      aRow.getCell(4).value = voucherNo;

      // Hisab 110 Loan Col N (Dr) / Col O (Cr)
      aRow.getCell(14).value = isDisbursed ? data.principalAmount : 0; // Col N Loan Dr
      aRow.getCell(15).value = isDisbursed ? 0 : data.principalAmount; // Col O Loan Cr

      // Cash / Bank Adjustment
      if (data.paymentMode === "BANK") {
        aRow.getCell(8).value = isDisbursed ? 0 : totalCashFlow; // Bank Dr
        aRow.getCell(9).value = isDisbursed ? totalCashFlow : 0; // Bank Cr
      } else {
        aRow.getCell(5).value = isDisbursed ? 0 : totalCashFlow; // Cash Dr
        aRow.getCell(6).value = isDisbursed ? totalCashFlow : 0; // Cash Cr
      }
      aRow.commit();

      // 3. If Repayment and interestAmount > 0, post to Sheet 5 (आम्दानी_खाता_Income) Col G (160.3)
      if (!isDisbursed && interestAmt > 0) {
        const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
        const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
        iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
        iRow.getCell(2).value = data.date;
        iRow.getCell(3).value = `${memberName} (${data.memberId}) ऋण ब्याज असुली आम्दानी`;
        iRow.getCell(4).value = voucherNo;
        iRow.getCell(7).value = interestAmt; // Col G (160.3 सदस्य ऋण लगानीबाट ब्याज)
        iRow.getCell(21).value = {
          formula: `=SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`,
          result: interestAmt
        };
        iRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST GENERAL JOURNAL VOUCHER (JE) — TRUE MULTI-LINE DOUBLE-ENTRY ---
  public static async postJournalVoucher(data: {
    date: string;
    particulars: string;
    voucherNo?: string;
    lines?: Array<{
      accountCode: string;
      accountName?: string;
      memberId?: string;
      subType?: string;
      drAmount: number;
      crAmount: number;
    }>;
    voucherType?: "EXPENSE" | "INCOME" | "CONTRA" | "CUSTOM";
    expenseAccount?: string;
    incomeAccount?: string;
    amount?: number;
    paymentMode?: "CASH" | "BANK";
    customEntries?: any[];
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsExpenses = this.getWorksheetByIndex(wb, 4);
      const wsIncome = this.getWorksheetByIndex(wb, 5);
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;

      // -------------------------------------------------------------
      // 1. MULTI-LINE DOUBLE-ENTRY JOURNAL VOUCHER
      // -------------------------------------------------------------
      if (data.lines && Array.isArray(data.lines) && data.lines.length >= 2) {
        let totalDr = 0;
        let totalCr = 0;

        for (const line of data.lines) {
          const dr = Math.max(0, Number(line.drAmount) || 0);
          const cr = Math.max(0, Number(line.crAmount) || 0);
          totalDr += dr;
          totalCr += cr;

          // Member verification if member-linked hisab
          const lineRootCode = String(line.accountCode || "").trim().split(".")[0];
          if (["10", "30", "110"].includes(lineRootCode) && !line.memberId) {
            throw new Error(`लेखा शीर्षक ${line.accountCode} को लागि सदस्य नं. अनिवार्य छ (Member ID required for Account ${line.accountCode})`);
          }
        }

        // Strict double-entry balance check: Total Dr === Total Cr
        if (Math.abs(totalDr - totalCr) > 0.001 || totalDr <= 0) {
          throw new Error(
            `गोश्वारा भौचर असन्तुलित छ: कुल डेबिट (रु. ${totalDr.toLocaleString()}) र कुल क्रेडिट (रु. ${totalCr.toLocaleString()}) बराबर हुनुपर्दछ (Voucher Unbalanced)`
          );
        }

        // Group lines by touched account codes
        const ASSET_COLS: Record<string, { dr: number; cr: number }> = {
          "80": { dr: 5, cr: 6 },
          "90": { dr: 8, cr: 9 },
          "100": { dr: 11, cr: 12 },
          "110": { dr: 14, cr: 15 },
          "120": { dr: 17, cr: 18 },
          "130": { dr: 20, cr: 21 },
          "140": { dr: 23, cr: 24 },
        };

        const LIAB_COLS: Record<string, { dr: number; cr: number }> = {
          "10": { dr: 5, cr: 6 },
          "20": { dr: 8, cr: 9 },
          "30": { dr: 11, cr: 12 },
          "40": { dr: 14, cr: 15 },
          "50": { dr: 17, cr: 18 },
          "60": { dr: 20, cr: 21 },
          "70": { dr: 23, cr: 24 },
        };

        // Accumulators for Main Khatas
        const assetDrs: Record<string, number> = {};
        const assetCrs: Record<string, number> = {};
        let hasAsset = false;

        const liabDrs: Record<string, number> = {};
        const liabCrs: Record<string, number> = {};
        let hasLiab = false;

        const expAmountsByCol: Record<number, number> = {};
        let hasExp = false;

        const incAmountsByCol: Record<number, number> = {};
        let hasInc = false;

        // Helper to get member full name
        const getMemberName = (mId: string): string => {
          for (let r = 5; r <= wsMember.rowCount; r++) {
            if (this.getCellStr(wsMember.getRow(r).getCell(1)).trim() === mId.trim()) {
              return this.getCellStr(wsMember.getRow(r).getCell(2)).trim();
            }
          }
          return mId;
        };

        for (const line of data.lines) {
          const code = String(line.accountCode || "").trim();
          const rootCode = code.includes(".") ? code.split(".")[0] : code;
          const dr = Math.max(0, Number(line.drAmount) || 0);
          const cr = Math.max(0, Number(line.crAmount) || 0);

          // A. Root 04: Assets (80..140)
          if (ASSET_COLS[rootCode]) {
            hasAsset = true;
            assetDrs[rootCode] = (assetDrs[rootCode] || 0) + dr;
            assetCrs[rootCode] = (assetCrs[rootCode] || 0) + cr;
          }

          // B. Root 05: Liabilities & Equity (10..70)
          if (LIAB_COLS[rootCode]) {
            hasLiab = true;
            liabDrs[rootCode] = (liabDrs[rootCode] || 0) + dr;
            liabCrs[rootCode] = (liabCrs[rootCode] || 0) + cr;
          }

          // C. Root 02: Expenses (150.1..150.16)
          if (code.startsWith("150.")) {
            const match = code.match(/150\.(\d+)/);
            if (match) {
              hasExp = true;
              const subNum = parseInt(match[1], 10);
              const col = 4 + subNum; // 150.1 is col 5 (E), 150.16 is col 20 (T)
              const netExp = dr > 0 ? dr : -cr;
              expAmountsByCol[col] = (expAmountsByCol[col] || 0) + netExp;
            }
          }

          // D. Root 03: Income (160.1..160.16)
          if (code.startsWith("160.")) {
            const match = code.match(/160\.(\d+)/);
            if (match) {
              hasInc = true;
              const subNum = parseInt(match[1], 10);
              const col = 4 + subNum; // 160.1 is col 5 (E), 160.16 is col 20 (T)
              const netInc = cr > 0 ? cr : -dr;
              incAmountsByCol[col] = (incAmountsByCol[col] || 0) + netInc;
            }
          }

          // E. Member Sub-Ledgers Posting
          // E1. Share Subledger (Hisab 10)
          if (rootCode === "10" && line.memberId) {
            const mName = getMemberName(line.memberId);
            const shareRowInfo = this.findOrInsertEntryRow(wsShare, 9, "कुल कारोबार", 1);
            const sRow = wsShare.getRow(shareRowInfo.targetRowIndex);
            const amt = cr > 0 ? cr : dr;
            const units = Math.max(1, Math.round(amt / 100));

            sRow.getCell(1).value = data.date;
            sRow.getCell(2).value = voucherNo;
            sRow.getCell(3).value = line.memberId;
            sRow.getCell(4).value = mName;
            sRow.getCell(5).value = `SC-${Date.now().toString().slice(-4)}`;
            sRow.getCell(6).value = data.particulars || "गोश्वारा भौचर शेयर पुँजी प्रविष्टि";
            sRow.getCell(7).value = units;
            sRow.getCell(8).value = dr; // Dr (Return / -)
            sRow.getCell(9).value = cr; // Cr (Purchase / +)
            const prevBal = this.getCellNum(wsShare.getRow(shareRowInfo.targetRowIndex - 1).getCell(10));
            const newBal = prevBal + cr - dr;
            sRow.getCell(10).value = {
              formula: `=IF($A${shareRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${shareRowInfo.targetRowIndex})-SUM($H$9:H${shareRowInfo.targetRowIndex}))`,
              result: newBal,
            };
            sRow.getCell(11).value = "JOURNAL_VOUCHER";
            sRow.commit();

            // Refresh Member Units in Sheet 6
            for (let r = 5; r <= wsMember.rowCount; r++) {
              if (this.getCellStr(wsMember.getRow(r).getCell(1)).trim() === line.memberId.trim()) {
                const currUnits = this.getCellNum(wsMember.getRow(r).getCell(10));
                const updatedUnits = cr > 0 ? currUnits + units : Math.max(0, currUnits - units);
                wsMember.getRow(r).getCell(10).value = updatedUnits;
                wsMember.getRow(r).commit();
                break;
              }
            }
          }

          // E2. Savings Subledger (Hisab 30)
          if (rootCode === "30" && line.memberId) {
            const mName = getMemberName(line.memberId);
            const bachatRowInfo = this.findOrInsertEntryRow(wsBachat, 9, "कुल कारोबार", 1);
            const bRow = wsBachat.getRow(bachatRowInfo.targetRowIndex);
            bRow.getCell(1).value = data.date;
            bRow.getCell(2).value = voucherNo;
            bRow.getCell(3).value = line.memberId;
            bRow.getCell(4).value = mName;
            bRow.getCell(5).value = line.subType || "30.1 नियमित बचत";
            bRow.getCell(6).value = data.particulars || "गोश्वारा भौचर बचत प्रविष्टि";
            bRow.getCell(7).value = 0.085;
            bRow.getCell(8).value = dr; // Dr (Withdrawal / -)
            bRow.getCell(9).value = cr; // Cr (Deposit / +)
            const prevBal = this.getCellNum(wsBachat.getRow(bachatRowInfo.targetRowIndex - 1).getCell(10));
            const newBal = prevBal + cr - dr;
            bRow.getCell(10).value = {
              formula: `=IF($A${bachatRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${bachatRowInfo.targetRowIndex})-SUM($H$9:H${bachatRowInfo.targetRowIndex}))`,
              result: newBal,
            };
            bRow.getCell(11).value = "JOURNAL_VOUCHER";
            bRow.commit();
          }

          // E3. Loan Subledger (Hisab 110)
          if (rootCode === "110" && line.memberId) {
            const mName = getMemberName(line.memberId);
            const loanRowInfo = this.findOrInsertEntryRow(wsLoan, 9, "कुल कारोबार", 1);
            const lnRow = wsLoan.getRow(loanRowInfo.targetRowIndex);
            lnRow.getCell(1).value = data.date;
            lnRow.getCell(2).value = voucherNo;
            lnRow.getCell(3).value = `LN-2083-${String(Date.now()).slice(-3)}`;
            lnRow.getCell(4).value = line.memberId;
            lnRow.getCell(5).value = mName;
            lnRow.getCell(6).value = line.subType || "110.1 कृषि कर्जा";
            lnRow.getCell(7).value = "गोश्वारा भौचर धितो";
            lnRow.getCell(8).value = 0.12;
            lnRow.getCell(9).value = dr; // Dr (Disbursement / +)
            lnRow.getCell(10).value = cr; // Cr (Repayment / -)
            const prevBal = this.getCellNum(wsLoan.getRow(loanRowInfo.targetRowIndex - 1).getCell(11));
            const newBal = prevBal + dr - cr;
            lnRow.getCell(11).value = {
              formula: `=IF($A${loanRowInfo.targetRowIndex}="","",$A$5+SUM($I$9:I${loanRowInfo.targetRowIndex})-SUM($J$9:J${loanRowInfo.targetRowIndex}))`,
              result: newBal,
            };
            lnRow.getCell(12).value = "JOURNAL_VOUCHER";
            lnRow.commit();
          }
        }

        // Post Single Aggregated Row to Sheet 2 (Assets) if touched
        if (hasAsset) {
          const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
          const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
          aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
          aRow.getCell(2).value = data.date;
          aRow.getCell(3).value = data.particulars;
          aRow.getCell(4).value = voucherNo;

          for (const [code, cols] of Object.entries(ASSET_COLS)) {
            const dr = assetDrs[code] || 0;
            const cr = assetCrs[code] || 0;
            if (dr > 0) aRow.getCell(cols.dr).value = dr;
            if (cr > 0) aRow.getCell(cols.cr).value = cr;
          }
          aRow.commit();
        }

        // Post Single Aggregated Row to Sheet 3 (Liabilities) if touched
        if (hasLiab) {
          const liabRowInfo = this.findOrInsertEntryRow(wsLiab, 7, "कुल दायित्व", 2);
          const lRow = wsLiab.getRow(liabRowInfo.targetRowIndex);
          lRow.getCell(1).value = liabRowInfo.targetRowIndex - 6;
          lRow.getCell(2).value = data.date;
          lRow.getCell(3).value = data.particulars;
          lRow.getCell(4).value = voucherNo;

          for (const [code, cols] of Object.entries(LIAB_COLS)) {
            const dr = liabDrs[code] || 0;
            const cr = liabCrs[code] || 0;
            if (dr > 0) lRow.getCell(cols.dr).value = dr;
            if (cr > 0) lRow.getCell(cols.cr).value = cr;
          }
          lRow.commit();
        }

        // Post Single Aggregated Row to Sheet 4 (Expenses) if touched
        if (hasExp) {
          const expRowInfo = this.findOrInsertEntryRow(wsExpenses, 5, "कुल खर्च", 2);
          const eRow = wsExpenses.getRow(expRowInfo.targetRowIndex);
          eRow.getCell(1).value = expRowInfo.targetRowIndex - 4;
          eRow.getCell(2).value = data.date;
          eRow.getCell(3).value = data.particulars;
          eRow.getCell(4).value = voucherNo;

          let expSum = 0;
          for (const [colStr, amt] of Object.entries(expAmountsByCol)) {
            const col = parseInt(colStr, 10);
            eRow.getCell(col).value = amt;
            expSum += amt;
          }
          eRow.getCell(21).value = {
            formula: `=SUM(E${expRowInfo.targetRowIndex}:T${expRowInfo.targetRowIndex})`,
            result: expSum,
          };
          eRow.commit();
        }

        // Post Single Aggregated Row to Sheet 5 (Income) if touched
        if (hasInc) {
          const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
          const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
          iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
          iRow.getCell(2).value = data.date;
          iRow.getCell(3).value = data.particulars;
          iRow.getCell(4).value = voucherNo;

          let incSum = 0;
          for (const [colStr, amt] of Object.entries(incAmountsByCol)) {
            const col = parseInt(colStr, 10);
            iRow.getCell(col).value = amt;
            incSum += amt;
          }
          iRow.getCell(21).value = {
            formula: `=SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`,
            result: incSum,
          };
          iRow.commit();
        }

        // Recalculate and synchronize all 4 Khatas + Trial Balance + Dashboard
        this.recalculateAllTotals(wb);
        await this.saveWorkbook(wb);
        return { voucherNo };
      }

      // -------------------------------------------------------------
      // 2. LEGACY / SHORTCUT SINGLE-ENTRY FALLBACK
      // -------------------------------------------------------------
      const amt = data.amount || 0;

      if (data.voucherType === "EXPENSE") {
        // 1. Post to Sheet 4 Expenses
        const expRowInfo = this.findOrInsertEntryRow(wsExpenses, 5, "कुल खर्च", 2);
        const eRow = wsExpenses.getRow(expRowInfo.targetRowIndex);
        eRow.getCell(1).value = expRowInfo.targetRowIndex - 4;
        eRow.getCell(2).value = data.date;
        eRow.getCell(3).value = data.particulars;
        eRow.getCell(4).value = voucherNo;

        let col = 7; // default 150.3 Salary
        if (data.expenseAccount) {
          const match = data.expenseAccount.match(/150\.(\d+)/);
          if (match) {
            const sub = parseInt(match[1], 10);
            col = 4 + sub;
          }
        }
        eRow.getCell(col).value = amt;
        eRow.getCell(21).value = {
          formula: `=SUM(E${expRowInfo.targetRowIndex}:T${expRowInfo.targetRowIndex})`,
          result: amt
        };
        eRow.commit();

        // 2. Post Credit to Assets Cash or Bank
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${data.particulars} (खर्च भुक्तानी)`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "BANK") {
          aRow.getCell(9).value = amt; // Bank Cr
        } else {
          aRow.getCell(6).value = amt; // Cash Cr
        }
        aRow.commit();
      } else if (data.voucherType === "INCOME") {
        // 1. Post to Sheet 5 Income
        const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
        const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
        iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
        iRow.getCell(2).value = data.date;
        iRow.getCell(3).value = data.particulars;
        iRow.getCell(4).value = voucherNo;

        let col = 5; // default 160.1 Sales
        if (data.incomeAccount) {
          const match = data.incomeAccount.match(/160\.(\d+)/);
          if (match) {
            const sub = parseInt(match[1], 10);
            col = 4 + sub;
          }
        }
        iRow.getCell(col).value = amt;
        iRow.getCell(21).value = {
          formula: `=SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`,
          result: amt
        };
        iRow.commit();

        // 2. Post Debit to Assets Cash or Bank
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${data.particulars} (आम्दानी दाखिला)`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "BANK") {
          aRow.getCell(8).value = amt; // Bank Dr
        } else {
          aRow.getCell(5).value = amt; // Cash Dr
        }
        aRow.commit();
      } else if (data.voucherType === "CONTRA") {
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.particulars || "बैंक तथा नगद आन्तरिक कारोबार (Contra Voucher)";
        aRow.getCell(4).value = voucherNo;

        if (data.paymentMode === "BANK") {
          aRow.getCell(5).value = amt;
          aRow.getCell(9).value = amt;
        } else {
          aRow.getCell(8).value = amt;
          aRow.getCell(6).value = amt;
        }
        aRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST BANK RECONCILIATION / TRANSFER ---
  public static async postBankReconciliationTransaction(data: {
    date: string;
    type: "CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_CHARGES" | "BANK_INTEREST" | "RECON_ADJUSTMENT";
    amount: number;
    chequeNo?: string;
    bankName?: string;
    narration?: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsExpenses = this.getWorksheetByIndex(wb, 4);
      const wsIncome = this.getWorksheetByIndex(wb, 5);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const amt = data.amount;
      const bankTitle = data.bankName || "क वर्गको वाणिज्य बैंक";
      const chq = data.chequeNo ? ` (चेक/भौचर नं: ${data.chequeNo})` : "";

      if (data.type === "CASH_TO_BANK") {
        // Contra: Bank Dr (8), Cash Cr (6)
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${bankTitle} मा नगद रकम दाखिला${chq}`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(8).value = amt; // Bank Dr
        aRow.getCell(6).value = amt; // Cash Cr
        aRow.commit();
      } else if (data.type === "BANK_TO_CASH") {
        // Contra: Cash Dr (5), Bank Cr (9)
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${bankTitle} बाट संस्था प्रयोजनार्थ नगद झिकिएको${chq}`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(5).value = amt; // Cash Dr
        aRow.getCell(9).value = amt; // Bank Cr
        aRow.commit();
      } else if (data.type === "BANK_CHARGES") {
        // Expense 150.16 Misc Expense (Col 20) Dr, Bank Cr (Col 9)
        const expRowInfo = this.findOrInsertEntryRow(wsExpenses, 5, "कुल खर्च", 2);
        const eRow = wsExpenses.getRow(expRowInfo.targetRowIndex);
        eRow.getCell(1).value = expRowInfo.targetRowIndex - 4;
        eRow.getCell(2).value = data.date;
        eRow.getCell(3).value = data.narration || `${bankTitle} सेवा शुल्क / कमिसन कट्टी खर्च${chq}`;
        eRow.getCell(4).value = voucherNo;
        eRow.getCell(20).value = amt; // Col 20: 150.16 विविध खर्च
        eRow.getCell(21).value = { formula: `=SUM(E${expRowInfo.targetRowIndex}:T${expRowInfo.targetRowIndex})`, result: amt };
        eRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${bankTitle} बैंक शुल्क कट्टी (Bank Charge)`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(9).value = amt; // Bank Cr
        aRow.commit();
      } else if (data.type === "BANK_INTEREST") {
        // Bank Dr (Col 8), Income 160.2 Lagani Byaj (Col 6) Cr
        const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
        const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
        iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
        iRow.getCell(2).value = data.date;
        iRow.getCell(3).value = data.narration || `${bankTitle} बचत/मुद्दती खाताबाट प्राप्त ब्याज आम्दानी${chq}`;
        iRow.getCell(4).value = voucherNo;
        iRow.getCell(6).value = amt; // Col 6: 160.2 लगानीबाट ब्याज
        iRow.getCell(21).value = { formula: `=SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`, result: amt };
        iRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${bankTitle} ब्याज आम्दानी बैंक मौज्दातमा दाखिला`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(8).value = amt; // Bank Dr
        aRow.commit();
      } else if (data.type === "RECON_ADJUSTMENT") {
        // Direct bank adjustment
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `बैंक हिसाब मिलान समायोजन (Bank Reconciliation Adjustment)${chq}`;
        aRow.getCell(4).value = voucherNo;
        if (amt >= 0) {
          aRow.getCell(8).value = amt; // Bank Dr
        } else {
          aRow.getCell(9).value = Math.abs(amt); // Bank Cr
        }
        aRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST FIXED ASSETS & DEPRECIATION ---
  public static async postAssetTransaction(data: {
    date: string;
    type: "PURCHASE" | "DEPRECIATION";
    assetName: string;
    assetCategory?: string;
    amount: number;
    depreciationRate?: number;
    depreciationMethod?: "STRAIGHT_LINE" | "DIMINISHING";
    paymentMode?: "CASH" | "BANK";
    narration?: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsExpenses = this.getWorksheetByIndex(wb, 4);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const amt = data.amount;
      const isPurchase = data.type === "PURCHASE";
      const cat = data.assetCategory || "130.3 फर्निचर तथा फिक्चर्स";

      if (isPurchase) {
        // Fixed Asset Dr (Col 20), Cash (Col 6) or Bank (Col 9) Cr
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${data.assetName} (${cat}) खरिद तथा स्थिर सम्पत्ति दाखिला`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(20).value = amt; // Col 20: 130 Fixed Assets Dr +
        if (data.paymentMode === "BANK") {
          aRow.getCell(9).value = amt; // Bank Cr -
        } else {
          aRow.getCell(6).value = amt; // Cash Cr -
        }
        aRow.commit();
      } else {
        // Depreciation: Expense 150.13 (Col 17) Dr, Fixed Asset 130 Cr (Col 21)
        const expRowInfo = this.findOrInsertEntryRow(wsExpenses, 5, "कुल खर्च", 2);
        const eRow = wsExpenses.getRow(expRowInfo.targetRowIndex);
        eRow.getCell(1).value = expRowInfo.targetRowIndex - 4;
        eRow.getCell(2).value = data.date;
        eRow.getCell(3).value = data.narration || `${data.assetName} वार्षिक/आवधिक ह्रासकट्टी खर्च (Depreciation Expense)`;
        eRow.getCell(4).value = voucherNo;
        eRow.getCell(17).value = amt; // Col 17: 150.13 ह्रासकट्टी खर्च
        eRow.getCell(21).value = { formula: `=SUM(E${expRowInfo.targetRowIndex}:T${expRowInfo.targetRowIndex})`, result: amt };
        eRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${data.assetName} ह्रासकट्टी बापत सम्पत्ति मूल्य कटौती (Accumulated Dep.)`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(21).value = amt; // Col 21: 130 Fixed Assets Cr -
        aRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST ANUDAN (GRANTS) ENTRY ---
  public static async postAnudanTransaction(data: {
    date: string;
    type: "CAPITAL_GRANT" | "OPERATIONAL_GRANT";
    donorAgency: string;
    projectName: string;
    amount: number;
    paymentMode?: "CASH" | "BANK";
    narration?: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsIncome = this.getWorksheetByIndex(wb, 5);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const amt = data.amount;
      const isCapital = data.type === "CAPITAL_GRANT";
      const donor = data.donorAgency || "नेपाल सरकार / दातृ निकाय";
      const prj = data.projectName || "संस्थागत विकास कार्यक्रम";

      if (isCapital) {
        // Capital Grant: Liability Hisab 50 Cr (Col 18), Assets Cash (Col 5) or Bank (Col 8) Dr
        const liabRowInfo = this.findOrInsertEntryRow(wsLiab, 7, "कुल दायित्व", 2);
        const lRow = wsLiab.getRow(liabRowInfo.targetRowIndex);
        lRow.getCell(1).value = liabRowInfo.targetRowIndex - 6;
        lRow.getCell(2).value = data.date;
        lRow.getCell(3).value = data.narration || `${donor} बाट ${prj} बापत पुँजीगत अनुदान हिसाब ५० मा दाखिला`;
        lRow.getCell(4).value = voucherNo;
        lRow.getCell(18).value = amt; // Col 18: Hisab 50 अनुदान हिसाब Cr +
        lRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${donor} बाट पुँजीगत अनुदान रकम प्राप्त`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "BANK") {
          aRow.getCell(8).value = amt; // Bank Dr +
        } else {
          aRow.getCell(5).value = amt; // Cash Dr +
        }
        aRow.commit();
      } else {
        // Operational Grant: Income 160.10 (Col 14) Cr, Assets Cash (Col 5) or Bank (Col 8) Dr
        const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
        const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
        iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
        iRow.getCell(2).value = data.date;
        iRow.getCell(3).value = data.narration || `${donor} बाट ${prj} बापत चालू अनुदान आम्दानी (Grant Revenue)`;
        iRow.getCell(4).value = voucherNo;
        iRow.getCell(14).value = amt; // Col 14: 160.10 सरकारी/संस्थागत अनुदान
        iRow.getCell(21).value = { formula: `=SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`, result: amt };
        iRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${donor} बाट चालू अनुदान रकम प्राप्त`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "BANK") {
          aRow.getCell(8).value = amt; // Bank Dr +
        } else {
          aRow.getCell(5).value = amt; // Cash Dr +
        }
        aRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- POST INVESTMENT TRANSACTION ---
  public static async postInvestmentTransaction(data: {
    date: string;
    type: "NEW_INVESTMENT" | "RETURN_MATURITY" | "DIVIDEND_INTEREST";
    investmentTitle: string;
    institutionName?: string;
    amount: number;
    interestRate?: number;
    paymentMode?: "CASH" | "BANK";
    narration?: string;
    voucherNo?: string;
  }): Promise<{ voucherNo: string }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsIncome = this.getWorksheetByIndex(wb, 5);

      const voucherNo = data.voucherNo || `JV-${String(Date.now()).slice(-5)}`;
      const amt = data.amount;
      const title = data.investmentTitle;
      const inst = data.institutionName ? ` (${data.institutionName})` : "";

      if (data.type === "NEW_INVESTMENT") {
        // Investment Dr (Col 11), Bank Cr (Col 9) or Cash Cr (Col 6)
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${title}${inst} नयाँ लगानी हिसाब १०० मा प्रविष्टि`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(11).value = amt; // Col 11: Hisab 100 Investment Dr +
        if (data.paymentMode === "CASH") {
          aRow.getCell(6).value = amt; // Cash Cr -
        } else {
          aRow.getCell(9).value = amt; // Bank Cr -
        }
        aRow.commit();
      } else if (data.type === "RETURN_MATURITY") {
        // Investment Cr (Col 12), Bank Dr (Col 8) or Cash Dr (Col 5)
        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = data.narration || `${title}${inst} लगानी सावाँ फिर्ता / परिपक्वता असुली`;
        aRow.getCell(4).value = voucherNo;
        aRow.getCell(12).value = amt; // Col 12: Hisab 100 Investment Cr -
        if (data.paymentMode === "CASH") {
          aRow.getCell(5).value = amt; // Cash Dr +
        } else {
          aRow.getCell(8).value = amt; // Bank Dr +
        }
        aRow.commit();
      } else if (data.type === "DIVIDEND_INTEREST") {
        // Income 160.2 (Col 6) Cr, Bank Dr (Col 8) or Cash Dr (Col 5)
        const incRowInfo = this.findOrInsertEntryRow(wsIncome, 5, "कुल आम्दानी", 2);
        const iRow = wsIncome.getRow(incRowInfo.targetRowIndex);
        iRow.getCell(1).value = incRowInfo.targetRowIndex - 4;
        iRow.getCell(2).value = data.date;
        iRow.getCell(3).value = data.narration || `${title}${inst} लगानीबाट प्राप्त लाभांश / ब्याज आम्दानी`;
        iRow.getCell(4).value = voucherNo;
        iRow.getCell(6).value = amt; // Col 6: 160.2 लगानीबाट ब्याज आम्दानी
        iRow.getCell(21).value = { formula: `SUM(E${incRowInfo.targetRowIndex}:T${incRowInfo.targetRowIndex})`, result: amt };
        iRow.commit();

        const assetRowInfo = this.findOrInsertEntryRow(wsAssets, 7, "कुल सम्पत्ति", 2);
        const aRow = wsAssets.getRow(assetRowInfo.targetRowIndex);
        aRow.getCell(1).value = assetRowInfo.targetRowIndex - 6;
        aRow.getCell(2).value = data.date;
        aRow.getCell(3).value = `${title}${inst} लाभांश/ब्याज रकम प्राप्त`;
        aRow.getCell(4).value = voucherNo;
        if (data.paymentMode === "CASH") {
          aRow.getCell(5).value = amt; // Cash Dr +
        } else {
          aRow.getCell(8).value = amt; // Bank Dr +
        }
        aRow.commit();
      }

      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      return { voucherNo };
    });
  }

  // --- RECALCULATE ALL TOTALS & SYNCHRONIZE ---
  public static recalculateAllTotals(wb: ExcelJS.Workbook): void {
    const wsAssets = this.getWorksheetByIndex(wb, 2);
    const wsLiab = this.getWorksheetByIndex(wb, 3);
    const wsExp = this.getWorksheetByIndex(wb, 4);
    const wsInc = this.getWorksheetByIndex(wb, 5);
    const wsShare = this.getWorksheetByIndex(wb, 7);
    const wsBachat = this.getWorksheetByIndex(wb, 8);
    const wsLoan = this.getWorksheetByIndex(wb, 9);
    const wsTB = this.getWorksheetByIndex(wb, 10);

    // =========================================================
    // 1. ASSETS RECALCULATE (ROOT 04 - SHEET 2)
    // Line-by-line running balances for each of the 7 accounts
    // AND Col 26 (Total Assets Balance line by line)
    // =========================================================
    let aTotRowIdx = 23;
    for (let r = 7; r <= wsAssets.rowCount; r++) {
      if (this.getCellStr(wsAssets.getRow(r).getCell(1)).includes("कुल")) {
        aTotRowIdx = r;
        break;
      }
    }
    const aTot = wsAssets.getRow(aTotRowIdx);
    const aCols = [
      { dr: 5, cr: 6, bal: 7, opBal: this.getCellNum(wsAssets.getRow(6).getCell(7)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(7)) },
      { dr: 8, cr: 9, bal: 10, opBal: this.getCellNum(wsAssets.getRow(6).getCell(10)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(10)) },
      { dr: 11, cr: 12, bal: 13, opBal: this.getCellNum(wsAssets.getRow(6).getCell(13)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(13)) },
      { dr: 14, cr: 15, bal: 16, opBal: this.getCellNum(wsAssets.getRow(6).getCell(16)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(16)) },
      { dr: 17, cr: 18, bal: 19, opBal: this.getCellNum(wsAssets.getRow(6).getCell(19)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(19)) },
      { dr: 20, cr: 21, bal: 22, opBal: this.getCellNum(wsAssets.getRow(6).getCell(22)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(22)) },
      { dr: 23, cr: 24, bal: 25, opBal: this.getCellNum(wsAssets.getRow(6).getCell(25)), runningBal: this.getCellNum(wsAssets.getRow(6).getCell(25)) },
    ];

    // Compute line-by-line running balances for all entry rows (Row 7 to aTotRowIdx - 1)
    for (let r = 7; r < aTotRowIdx; r++) {
      const aRow = wsAssets.getRow(r);
      const sn = this.getCellStr(aRow.getCell(1));
      const dt = this.getCellStr(aRow.getCell(2));
      const vc = this.getCellStr(aRow.getCell(4));
      if (sn || dt || vc) {
        let rowAssetsBal = 0;
        for (const h of aCols) {
          const dr = this.getCellNum(aRow.getCell(h.dr));
          const cr = this.getCellNum(aRow.getCell(h.cr));
          h.runningBal += (dr - cr);
          aRow.getCell(h.bal).value = {
            formula: `IF($B${r}="","",$${String.fromCharCode(64 + h.bal)}$6+SUM($${String.fromCharCode(64 + h.dr)}$7:${String.fromCharCode(64 + h.dr)}${r})-SUM($${String.fromCharCode(64 + h.cr)}$7:${String.fromCharCode(64 + h.cr)}${r}))`,
            result: h.runningBal,
          };
          rowAssetsBal += h.runningBal;
        }
        aRow.getCell(26).value = {
          formula: `IF($B${r}="","",G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r})`,
          result: rowAssetsBal,
        };
        aRow.commit();
      }
    }

    // Bottom Total Row for Assets
    let totalAssetsBal = 0;
    for (const h of aCols) {
      let sumDr = 0;
      let sumCr = 0;
      for (let r = 7; r < aTotRowIdx; r++) {
        sumDr += this.getCellNum(wsAssets.getRow(r).getCell(h.dr));
        sumCr += this.getCellNum(wsAssets.getRow(r).getCell(h.cr));
      }
      aTot.getCell(h.dr).value = { formula: `SUM(${String.fromCharCode(64 + h.dr)}7:${String.fromCharCode(64 + h.dr)}${aTotRowIdx - 1})`, result: sumDr };
      aTot.getCell(h.cr).value = { formula: `SUM(${String.fromCharCode(64 + h.cr)}7:${String.fromCharCode(64 + h.cr)}${aTotRowIdx - 1})`, result: sumCr };
      const curBal = h.opBal + sumDr - sumCr;
      aTot.getCell(h.bal).value = { formula: `$${String.fromCharCode(64 + h.bal)}$6+${String.fromCharCode(64 + h.dr)}${aTotRowIdx}-${String.fromCharCode(64 + h.cr)}${aTotRowIdx}`, result: curBal };
      totalAssetsBal += curBal;
    }
    aTot.getCell(26).value = {
      formula: `G${aTotRowIdx}+J${aTotRowIdx}+M${aTotRowIdx}+P${aTotRowIdx}+S${aTotRowIdx}+V${aTotRowIdx}+Y${aTotRowIdx}`,
      result: totalAssetsBal,
    };
    aTot.commit();

    // =========================================================
    // 2. LIABILITIES RECALCULATE (ROOT 05 - SHEET 3)
    // Line-by-line running balances for each of the 7 accounts
    // AND Col 26 (Total Liabilities Balance line by line)
    // =========================================================
    let lTotRowIdx = 23;
    for (let r = 7; r <= wsLiab.rowCount; r++) {
      if (this.getCellStr(wsLiab.getRow(r).getCell(1)).includes("कुल")) {
        lTotRowIdx = r;
        break;
      }
    }
    const lTot = wsLiab.getRow(lTotRowIdx);
    const lCols = [
      { dr: 5, cr: 6, bal: 7, opBal: this.getCellNum(wsLiab.getRow(6).getCell(7)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(7)) },
      { dr: 8, cr: 9, bal: 10, opBal: this.getCellNum(wsLiab.getRow(6).getCell(10)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(10)) },
      { dr: 11, cr: 12, bal: 13, opBal: this.getCellNum(wsLiab.getRow(6).getCell(13)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(13)) },
      { dr: 14, cr: 15, bal: 16, opBal: this.getCellNum(wsLiab.getRow(6).getCell(16)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(16)) },
      { dr: 17, cr: 18, bal: 19, opBal: this.getCellNum(wsLiab.getRow(6).getCell(19)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(19)) },
      { dr: 20, cr: 21, bal: 22, opBal: this.getCellNum(wsLiab.getRow(6).getCell(22)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(22)) },
      { dr: 23, cr: 24, bal: 25, opBal: this.getCellNum(wsLiab.getRow(6).getCell(25)), runningBal: this.getCellNum(wsLiab.getRow(6).getCell(25)) },
    ];

    // Compute line-by-line running balances for all entry rows (Row 7 to lTotRowIdx - 1)
    for (let r = 7; r < lTotRowIdx; r++) {
      const lRow = wsLiab.getRow(r);
      const sn = this.getCellStr(lRow.getCell(1));
      const dt = this.getCellStr(lRow.getCell(2));
      const vc = this.getCellStr(lRow.getCell(4));
      if (sn || dt || vc) {
        let rowLiabBal = 0;
        for (const h of lCols) {
          const dr = this.getCellNum(lRow.getCell(h.dr));
          const cr = this.getCellNum(lRow.getCell(h.cr));
          h.runningBal += (cr - dr); // Credit increases liability, Debit decreases
          lRow.getCell(h.bal).value = {
            formula: `IF($B${r}="","",$${String.fromCharCode(64 + h.bal)}$6+SUM($${String.fromCharCode(64 + h.cr)}$7:${String.fromCharCode(64 + h.cr)}${r})-SUM($${String.fromCharCode(64 + h.dr)}$7:${String.fromCharCode(64 + h.dr)}${r}))`,
            result: h.runningBal,
          };
          rowLiabBal += h.runningBal;
        }
        lRow.getCell(26).value = {
          formula: `IF($B${r}="","",G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r})`,
          result: rowLiabBal,
        };
        lRow.commit();
      }
    }

    // Bottom Total Row for Liabilities
    let totalLiabBal = 0;
    for (const h of lCols) {
      let sumDr = 0;
      let sumCr = 0;
      for (let r = 7; r < lTotRowIdx; r++) {
        sumDr += this.getCellNum(wsLiab.getRow(r).getCell(h.dr));
        sumCr += this.getCellNum(wsLiab.getRow(r).getCell(h.cr));
      }
      lTot.getCell(h.dr).value = { formula: `SUM(${String.fromCharCode(64 + h.dr)}7:${String.fromCharCode(64 + h.dr)}${lTotRowIdx - 1})`, result: sumDr };
      lTot.getCell(h.cr).value = { formula: `SUM(${String.fromCharCode(64 + h.cr)}7:${String.fromCharCode(64 + h.cr)}${lTotRowIdx - 1})`, result: sumCr };
      const curBal = h.opBal + sumCr - sumDr;
      lTot.getCell(h.bal).value = { formula: `$${String.fromCharCode(64 + h.bal)}$6+${String.fromCharCode(64 + h.cr)}${lTotRowIdx}-${String.fromCharCode(64 + h.dr)}${lTotRowIdx}`, result: curBal };
      totalLiabBal += curBal;
    }
    lTot.getCell(26).value = {
      formula: `G${lTotRowIdx}+J${lTotRowIdx}+M${lTotRowIdx}+P${lTotRowIdx}+S${lTotRowIdx}+V${lTotRowIdx}+Y${lTotRowIdx}`,
      result: totalLiabBal,
    };
    lTot.commit();

    // =========================================================
    // 3. EXPENSES RECALCULATE (ROOT 02 - SHEET 4)
    // Line-by-line progressive cumulative balance:
    // Row 5: 60,000
    // Row 6: 60,000 + 5,000 = 65,000
    // Row 7: 65,000 + 7,000 = 72,000 ...
    // =========================================================
    let eTotRowIdx = 22;
    for (let r = 5; r <= wsExp.rowCount; r++) {
      if (this.getCellStr(wsExp.getRow(r).getCell(1)).includes("कुल")) {
        eTotRowIdx = r;
        break;
      }
    }
    const eTot = wsExp.getRow(eTotRowIdx);
    let runningExpBal = 0;
    for (let r = 5; r < eTotRowIdx; r++) {
      const eRow = wsExp.getRow(r);
      const sn = this.getCellStr(eRow.getCell(1));
      const dt = this.getCellStr(eRow.getCell(2));
      const vc = this.getCellStr(eRow.getCell(4));
      if (sn || dt || vc) {
        let rowExpSum = 0;
        for (let c = 5; c <= 20; c++) {
          rowExpSum += this.getCellNum(eRow.getCell(c));
        }
        runningExpBal += rowExpSum;
        if (r === 5) {
          eRow.getCell(21).value = {
            formula: `SUM(E5:T5)`,
            result: runningExpBal,
          };
        } else {
          eRow.getCell(21).value = {
            formula: `U${r - 1}+SUM(E${r}:T${r})`,
            result: runningExpBal,
          };
        }
        eRow.commit();
      }
    }

    // Bottom Column Totals for Expenses
    let totalExpSum = 0;
    for (let c = 5; c <= 20; c++) {
      let sumC = 0;
      for (let r = 5; r < eTotRowIdx; r++) {
        sumC += this.getCellNum(wsExp.getRow(r).getCell(c));
      }
      eTot.getCell(c).value = { formula: `SUM(${String.fromCharCode(64 + c)}5:${String.fromCharCode(64 + c)}${eTotRowIdx - 1})`, result: sumC };
      totalExpSum += sumC;
    }
    eTot.getCell(21).value = { formula: `U${eTotRowIdx - 1}`, result: runningExpBal };
    eTot.commit();

    // =========================================================
    // 4. INCOME RECALCULATE (ROOT 03 - SHEET 5)
    // Line-by-line progressive cumulative balance:
    // Row 5: 100,000
    // Row 6: 100,000 + 600 = 100,600 ...
    // =========================================================
    let iTotRowIdx = 22;
    for (let r = 5; r <= wsInc.rowCount; r++) {
      if (this.getCellStr(wsInc.getRow(r).getCell(1)).includes("कुल")) {
        iTotRowIdx = r;
        break;
      }
    }
    const iTot = wsInc.getRow(iTotRowIdx);
    let runningIncBal = 0;
    for (let r = 5; r < iTotRowIdx; r++) {
      const iRow = wsInc.getRow(r);
      const sn = this.getCellStr(iRow.getCell(1));
      const dt = this.getCellStr(iRow.getCell(2));
      const vc = this.getCellStr(iRow.getCell(4));
      if (sn || dt || vc) {
        let rowIncSum = 0;
        for (let c = 5; c <= 20; c++) {
          rowIncSum += this.getCellNum(iRow.getCell(c));
        }
        runningIncBal += rowIncSum;
        if (r === 5) {
          iRow.getCell(21).value = {
            formula: `SUM(E5:T5)`,
            result: runningIncBal,
          };
        } else {
          iRow.getCell(21).value = {
            formula: `U${r - 1}+SUM(E${r}:T${r})`,
            result: runningIncBal,
          };
        }
        iRow.commit();
      }
    }

    // Bottom Column Totals for Income
    let totalIncSum = 0;
    for (let c = 5; c <= 20; c++) {
      let sumC = 0;
      for (let r = 5; r < iTotRowIdx; r++) {
        sumC += this.getCellNum(wsInc.getRow(r).getCell(c));
      }
      iTot.getCell(c).value = { formula: `SUM(${String.fromCharCode(64 + c)}5:${String.fromCharCode(64 + c)}${iTotRowIdx - 1})`, result: sumC };
      totalIncSum += sumC;
    }
    iTot.getCell(21).value = { formula: `U${iTotRowIdx - 1}`, result: runningIncBal };
    iTot.commit();

    // 5. Share Recalculate
    let sTotRowIdx = 25;
    for (let r = 9; r <= wsShare.rowCount; r++) {
      if (this.getCellStr(wsShare.getRow(r).getCell(1)).includes("कुल")) {
        sTotRowIdx = r;
        break;
      }
    }
    const sTot = wsShare.getRow(sTotRowIdx);
    let sDr = 0, sCr = 0;
    for (let r = 9; r < sTotRowIdx; r++) {
      sDr += this.getCellNum(wsShare.getRow(r).getCell(8));
      sCr += this.getCellNum(wsShare.getRow(r).getCell(9));
    }
    sTot.getCell(8).value = { formula: `=SUM(H9:H${sTotRowIdx - 1})`, result: sDr };
    sTot.getCell(9).value = { formula: `=SUM(I9:I${sTotRowIdx - 1})`, result: sCr };
    const sOp = this.getCellNum(wsLiab.getRow(6).getCell(7));
    wsShare.getRow(5).getCell(1).value = sOp;
    wsShare.getRow(5).commit();
    sTot.getCell(10).value = { formula: `=$A$5+I${sTotRowIdx}-H${sTotRowIdx}`, result: sOp + sCr - sDr };
    sTot.commit();

    // 6. Bachat Recalculate
    let bTotRowIdx = 25;
    for (let r = 9; r <= wsBachat.rowCount; r++) {
      if (this.getCellStr(wsBachat.getRow(r).getCell(1)).includes("कुल")) {
        bTotRowIdx = r;
        break;
      }
    }
    const bTot = wsBachat.getRow(bTotRowIdx);
    let bDr = 0, bCr = 0;
    for (let r = 9; r < bTotRowIdx; r++) {
      bDr += this.getCellNum(wsBachat.getRow(r).getCell(8));
      bCr += this.getCellNum(wsBachat.getRow(r).getCell(9));
    }
    bTot.getCell(8).value = { formula: `=SUM(H9:H${bTotRowIdx - 1})`, result: bDr };
    bTot.getCell(9).value = { formula: `=SUM(I9:I${bTotRowIdx - 1})`, result: bCr };
    const bOp = this.getCellNum(wsLiab.getRow(6).getCell(13));
    wsBachat.getRow(5).getCell(1).value = bOp;
    wsBachat.getRow(5).commit();
    bTot.getCell(10).value = { formula: `=$A$5+I${bTotRowIdx}-H${bTotRowIdx}`, result: bOp + bCr - bDr };
    bTot.commit();

    // 7. Loan Recalculate
    let lnTotRowIdx = 25;
    for (let r = 9; r <= wsLoan.rowCount; r++) {
      if (this.getCellStr(wsLoan.getRow(r).getCell(1)).includes("कुल")) {
        lnTotRowIdx = r;
        break;
      }
    }
    const lnTot = wsLoan.getRow(lnTotRowIdx);
    let lnDr = 0, lnCr = 0;
    for (let r = 9; r < lnTotRowIdx; r++) {
      lnDr += this.getCellNum(wsLoan.getRow(r).getCell(9));
      lnCr += this.getCellNum(wsLoan.getRow(r).getCell(10));
    }
    lnTot.getCell(9).value = { formula: `=SUM(I9:I${lnTotRowIdx - 1})`, result: lnDr };
    lnTot.getCell(10).value = { formula: `=SUM(J9:J${lnTotRowIdx - 1})`, result: lnCr };
    const lnOp = this.getCellNum(wsAssets.getRow(6).getCell(16));
    wsLoan.getRow(5).getCell(1).value = lnOp;
    wsLoan.getRow(5).commit();
    lnTot.getCell(11).value = { formula: `=$A$5+I${lnTotRowIdx}-J${lnTotRowIdx}`, result: lnOp + lnDr - lnCr };
    lnTot.commit();

    // 8. Trial Balance (Sheet 10) - Write ALL columns (Op Bal, Dr Turnover, Cr Turnover, Closing Bal)
    if (wsTB) {
      // Calculate Opening Balances from Row 6 of each ledger
      const assetsOpBal = this.getCellNum(wsAssets.getRow(6).getCell(26)); // Total opening Assets
      const liabOpBal = this.getCellNum(wsLiab.getRow(6).getCell(26));     // Total opening Liab

      // Calculate Dr/Cr Turnovers from total row (Assets Row 23 / Liab Row 23)
      const assetsDrTurnover = this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(5)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(8)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(11)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(14)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(17)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(20)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(23));
      const assetsCrTurnover = this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(6)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(9)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(12)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(15)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(18)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(21)) +
        this.getCellNum(wsAssets.getRow(aTotRowIdx).getCell(24));

      const liabDrTurnover = this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(5)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(8)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(11)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(14)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(17)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(20)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(23));
      const liabCrTurnover = this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(6)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(9)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(12)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(15)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(18)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(21)) +
        this.getCellNum(wsLiab.getRow(lTotRowIdx).getCell(24));

      // Row 5: KH-04 Assets
      // Col5=OpBal, Col6=DrTurnover, Col7=CrTurnover, Col8=ClosingBal
      const r5 = wsTB.getRow(5);
      r5.getCell(5).value = assetsOpBal;
      r5.getCell(6).value = assetsDrTurnover;
      r5.getCell(7).value = assetsCrTurnover;
      r5.getCell(8).value = totalAssetsBal;
      r5.commit();

      // Row 6: KH-05 Liabilities
      const r6 = wsTB.getRow(6);
      r6.getCell(5).value = liabOpBal;
      r6.getCell(6).value = liabDrTurnover;
      r6.getCell(7).value = liabCrTurnover;
      r6.getCell(8).value = totalLiabBal;
      r6.commit();

      // Row 7: KH-02 Expenses (Dr only - no opening bal for P&L)
      const r7 = wsTB.getRow(7);
      r7.getCell(5).value = 0; // No opening bal
      r7.getCell(6).value = totalExpSum; // Dr turnover
      r7.getCell(7).value = 0; // No Cr
      r7.getCell(8).value = totalExpSum; // Closing = Dr
      r7.commit();

      // Row 8: KH-03 Income (Cr only)
      const r8 = wsTB.getRow(8);
      r8.getCell(5).value = 0; // No opening bal
      r8.getCell(6).value = 0; // No Dr
      r8.getCell(7).value = totalIncSum; // Cr turnover
      r8.getCell(8).value = totalIncSum; // Closing = Cr
      r8.commit();

      // Row 9: Grand Total
      const totalOpBal = assetsOpBal + liabOpBal;
      const totalDr = assetsDrTurnover + liabDrTurnover + totalExpSum;
      const totalCr = assetsCrTurnover + liabCrTurnover + totalIncSum;
      const tbNet = Math.round((totalDr - totalCr) * 100) / 100;
      const r9 = wsTB.getRow(9);
      r9.getCell(5).value = totalOpBal;
      r9.getCell(6).value = totalDr;
      r9.getCell(7).value = totalCr;
      r9.getCell(8).value = tbNet;
      r9.commit();

      // Rows 10-12: clear stray data
      for (let r = 10; r <= 12; r++) {
        const row = wsTB.getRow(r);
        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          if (typeof cell.value === 'number') cell.value = 0;
        }
        row.commit();
      }

      // Rows 13-20: P&L and Balance Sheet summary
      const netSurplus = totalIncSum - totalExpSum;
      // Row 13: P&L header (text only, no numbers to overwrite)
      // Row 14: Net surplus/deficit
      wsTB.getRow(14).getCell(4).value = netSurplus;
      wsTB.getRow(14).commit();
      // Row 15: another P&L line (blank numeric)
      // Row 16: Total Assets (Balance Sheet)
      wsTB.getRow(16).getCell(4).value = totalAssetsBal;
      wsTB.getRow(16).commit();
      // Row 17: blank
      // Row 18: Total Liabilities + Surplus
      wsTB.getRow(18).getCell(4).value = totalLiabBal + netSurplus;
      wsTB.getRow(18).commit();
      // Row 19: Balance Sheet Diff Check
      const diff = Math.round((totalAssetsBal - (totalLiabBal + netSurplus)) * 100) / 100;
      wsTB.getRow(19).getCell(4).value = diff;
      wsTB.getRow(19).commit();
      // Row 20: Validation status
      wsTB.getRow(20).getCell(4).value = diff === 0 ? "सन्तुलित (BALANCED)" : "फरक (UNBALANCED)";
      wsTB.getRow(20).commit();

      // Clear stray rows 21-30
      for (let r = 21; r <= 30; r++) {
        const row = wsTB.getRow(r);
        for (let c = 1; c <= 8; c++) {
          const cell = row.getCell(c);
          if (typeof cell.value === 'number') cell.value = 0;
        }
        row.commit();
      }
    }
  }

  // --- GET FULL TABULAR KHATA FOR EXPLORER ---
  public static async getKhataSheetData(sheetIndex: number): Promise<{
    title: string;
    sheetName: string;
    sheetIndex: number;
    headers: string[][];
    rows: any[][];
    totalRow: any[];
  }> {
    return await dbMutex.runExclusive(async () => {
      const wb = await this.loadWorkbook();
      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);
      const ws = this.getWorksheetByIndex(wb, sheetIndex);

      const title = this.getCellStr(ws.getRow(1).getCell(1));
      const sheetName = ws.name;

      const headers: string[][] = [];
      const rows: any[][] = [];
      let totalRow: any[] = [];

      let startDataRow = 7;
      let headerEndRow = 5;
      if (sheetIndex === 2 || sheetIndex === 3) {
        startDataRow = 6;
        headerEndRow = 5;
      } else if (sheetIndex === 4 || sheetIndex === 5) {
        startDataRow = 5;
        headerEndRow = 4;
      } else if (sheetIndex === 6) {
        startDataRow = 5;
        headerEndRow = 4;
      } else if (sheetIndex === 7 || sheetIndex === 8 || sheetIndex === 9) {
        startDataRow = 9;
        headerEndRow = 8;
      } else if (sheetIndex === 10) {
        startDataRow = 5;
        headerEndRow = 4;
      }

      // Collect headers
      for (let r = 4; r <= headerEndRow; r++) {
        const hRow: string[] = [];
        for (let c = 1; c <= ws.columnCount; c++) {
          hRow.push(this.extractCellText(ws.getRow(r).getCell(c).value));
        }
        headers.push(hRow);
      }

      // Collect rows and find total row
      for (let r = startDataRow; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const firstCol = this.extractCellText(row.getCell(1).value);
        const secondCol = this.extractCellText(row.getCell(2).value);
        const thirdCol = this.extractCellText(row.getCell(3).value);

        // For Sheet 10 (Trial Balance), ALL rows 5-20 are data rows; skip the "total" shortcut
        if (
          sheetIndex !== 10 &&
          (
            firstCol.includes("कुल") ||
            firstCol.includes("Total") ||
            firstCol.includes("जम्मा") ||
            thirdCol.includes("कुल कारोबार") ||
            thirdCol.includes("Total Assets Turnover") ||
            thirdCol.includes("Total Liab")
          )
        ) {
          const tRowVals: any[] = [];
          for (let c = 1; c <= ws.columnCount; c++) {
            const cell = row.getCell(c);
            const num = this.extractCellNumber(cell.value);
            const str = this.extractCellText(cell.value);
            tRowVals.push(num !== null ? num : str);
          }
          totalRow = tRowVals;
          break;
        }

        // Only include rows that have content
        const rowVals: any[] = [];
        let hasContent = false;
        for (let c = 1; c <= ws.columnCount; c++) {
          const cell = row.getCell(c);
          const num = this.extractCellNumber(cell.value);
          const str = this.extractCellText(cell.value);
          if (str || num !== null) hasContent = true;
          rowVals.push(num !== null ? num : str);
        }
        if (hasContent && (firstCol || secondCol || thirdCol)) {
          rows.push(rowVals);
        }
      }

      return {
        title,
        sheetName,
        sheetIndex,
        headers,
        rows,
        totalRow
      };
    });
  }

  // --- YEAR-END AUDIT & FINANCIAL STATEMENTS ---
  public static async getYearEndAuditData(): Promise<{
    currentFiscalYear: string;
    nextFiscalYearSuggestion: string;
    nextFiscalYearStartSuggestion: string;
    nextFiscalYearEndSuggestion: string;
    orgSettings: any;
    balanceSheet: {
      assets: {
        cash: number;
        bank: number;
        investments: number;
        loans: number;
        receivables: number;
        fixedAssets: number;
        otherAssets: number;
        total: number;
      };
      liabilities: {
        shareCapital: number;
        reserves: number;
        savings: number;
        borrowings: number;
        otherLiabilities: number;
        payables: number;
        funds: number;
        total: number;
      };
      netSurplus: number;
      totalLiabilitiesAndEquity: number;
      isBalanced: boolean;
      diff: number;
    };
    incomeStatement: {
      totalIncome: number;
      totalExpenses: number;
      netSurplus: number;
      incomeBreakdown: {
        loanInterest: number;
        investmentReturn: number;
        serviceFees: number;
        otherIncome: number;
      };
      expensesBreakdown: {
        savingInterest: number;
        borrowingInterest: number;
        staffCost: number;
        officeOperation: number;
        otherExpenses: number;
      };
      appropriation: {
        generalReserve: number;
        patronageRefund: number;
        cooperativeEducation: number;
        staffBonus: number;
        retainedEarnings: number;
      };
    };
    trialBalance: {
      assets: { op: number; dr: number; cr: number; cl: number };
      liabilities: { op: number; dr: number; cr: number; cl: number };
      expenses: { op: number; dr: number; cr: number; cl: number };
      income: { op: number; dr: number; cr: number; cl: number };
      totalDr: number;
      totalCr: number;
      isBalanced: boolean;
      diff: number;
    };
    memberReconciliation: {
      memberCount: number;
      totalMemberShare: number;
      glShareCapital: number;
      shareDiff: number;
      totalMemberSavings: number;
      glSavings: number;
      savingsDiff: number;
      totalMemberLoans: number;
      glLoans: number;
      loanDiff: number;
    };
  }> {
    return await dbMutex.runExclusive(async () => {
      await this.ensureBackup();
      const wb = await this.loadWorkbook();
      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);

      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsExp = this.getWorksheetByIndex(wb, 4);
      const wsInc = this.getWorksheetByIndex(wb, 5);
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);
      const wsTB = this.getWorksheetByIndex(wb, 10);

      // 1. Assets from Row 23
      const aCash = this.getCellNum(wsAssets.getRow(23).getCell(7));
      const aBank = this.getCellNum(wsAssets.getRow(23).getCell(10));
      const aInv = this.getCellNum(wsAssets.getRow(23).getCell(13));
      const aLoan = this.getCellNum(wsAssets.getRow(23).getCell(16));
      const aRec = this.getCellNum(wsAssets.getRow(23).getCell(19));
      const aFixed = this.getCellNum(wsAssets.getRow(23).getCell(22));
      const aOther = this.getCellNum(wsAssets.getRow(23).getCell(25));
      const totalAssets = this.getCellNum(wsAssets.getRow(23).getCell(26)) || (aCash + aBank + aInv + aLoan + aRec + aFixed + aOther);

      // 2. Liabilities from Row 23
      const lShare = this.getCellNum(wsLiab.getRow(23).getCell(7));
      const lRes = this.getCellNum(wsLiab.getRow(23).getCell(10));
      const lSav = this.getCellNum(wsLiab.getRow(23).getCell(13));
      const lBorrow = this.getCellNum(wsLiab.getRow(23).getCell(16));
      const lOther = this.getCellNum(wsLiab.getRow(23).getCell(19));
      const lPay = this.getCellNum(wsLiab.getRow(23).getCell(22));
      const lFunds = this.getCellNum(wsLiab.getRow(23).getCell(25));
      const totalLiabilities = this.getCellNum(wsLiab.getRow(23).getCell(26)) || (lShare + lRes + lSav + lBorrow + lOther + lPay + lFunds);

      // 3. Expenses from Row 22
      const expSavingInt = this.getCellNum(wsExp.getRow(22).getCell(5));
      const expBorrowInt = this.getCellNum(wsExp.getRow(22).getCell(8));
      const expStaff = this.getCellNum(wsExp.getRow(22).getCell(11));
      const expOffice = this.getCellNum(wsExp.getRow(22).getCell(14));
      const expOther = this.getCellNum(wsExp.getRow(22).getCell(17));
      const totalExpenses = this.getCellNum(wsExp.getRow(22).getCell(21)) || (expSavingInt + expBorrowInt + expStaff + expOffice + expOther);

      // 4. Income from Row 22
      const incLoanInt = this.getCellNum(wsInc.getRow(22).getCell(5));
      const incInv = this.getCellNum(wsInc.getRow(22).getCell(8));
      const incFee = this.getCellNum(wsInc.getRow(22).getCell(11));
      const incOther = this.getCellNum(wsInc.getRow(22).getCell(14));
      const totalIncome = this.getCellNum(wsInc.getRow(22).getCell(21)) || (incLoanInt + incInv + incFee + incOther);

      const netSurplus = totalIncome - totalExpenses;

      // 5. Statutory Surplus Appropriation (Nepal Cooperative Act 2074)
      const genReservePct = 0.25; // 25% General Reserve
      const patronagePct = 0.25;  // 25% Patronage Refund
      const eduFundPct = 0.05;    // 5% Education Fund
      const staffBonusPct = 0.05; // 5% Staff Bonus

      const genReserveAmt = netSurplus > 0 ? Math.round(netSurplus * genReservePct) : 0;
      const patronageAmt = netSurplus > 0 ? Math.round(netSurplus * patronagePct) : 0;
      const eduFundAmt = netSurplus > 0 ? Math.round(netSurplus * eduFundPct) : 0;
      const staffBonusAmt = netSurplus > 0 ? Math.round(netSurplus * staffBonusPct) : 0;
      const retainedAmt = netSurplus > 0 ? netSurplus - (genReserveAmt + patronageAmt + eduFundAmt + staffBonusAmt) : netSurplus;

      // Balance Sheet verification
      const totalLiabilitiesAndEquity = totalLiabilities + netSurplus;
      const bsDiff = Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) / 100;
      const isBsBalanced = Math.abs(bsDiff) < 1;

      // 6. Trial Balance (Sheet 10)
      const tbAssetsOp = this.getCellNum(wsAssets.getRow(6).getCell(26));
      const tbLiabOp = this.getCellNum(wsLiab.getRow(6).getCell(26));
      const tbAssetsDr = this.getCellNum(wsAssets.getRow(23).getCell(5)) + this.getCellNum(wsAssets.getRow(23).getCell(8)) + this.getCellNum(wsAssets.getRow(23).getCell(11)) + this.getCellNum(wsAssets.getRow(23).getCell(14)) + this.getCellNum(wsAssets.getRow(23).getCell(17)) + this.getCellNum(wsAssets.getRow(23).getCell(20)) + this.getCellNum(wsAssets.getRow(23).getCell(23));
      const tbAssetsCr = this.getCellNum(wsAssets.getRow(23).getCell(6)) + this.getCellNum(wsAssets.getRow(23).getCell(9)) + this.getCellNum(wsAssets.getRow(23).getCell(12)) + this.getCellNum(wsAssets.getRow(23).getCell(15)) + this.getCellNum(wsAssets.getRow(23).getCell(18)) + this.getCellNum(wsAssets.getRow(23).getCell(21)) + this.getCellNum(wsAssets.getRow(23).getCell(24));

      const tbLiabDr = this.getCellNum(wsLiab.getRow(23).getCell(5)) + this.getCellNum(wsLiab.getRow(23).getCell(8)) + this.getCellNum(wsLiab.getRow(23).getCell(11)) + this.getCellNum(wsLiab.getRow(23).getCell(14)) + this.getCellNum(wsLiab.getRow(23).getCell(17)) + this.getCellNum(wsLiab.getRow(23).getCell(20)) + this.getCellNum(wsLiab.getRow(23).getCell(23));
      const tbLiabCr = this.getCellNum(wsLiab.getRow(23).getCell(6)) + this.getCellNum(wsLiab.getRow(23).getCell(9)) + this.getCellNum(wsLiab.getRow(23).getCell(12)) + this.getCellNum(wsLiab.getRow(23).getCell(15)) + this.getCellNum(wsLiab.getRow(23).getCell(18)) + this.getCellNum(wsLiab.getRow(23).getCell(21)) + this.getCellNum(wsLiab.getRow(23).getCell(24));

      const totalTBDr = totalAssets + totalExpenses;
      const totalTBCr = totalLiabilities + totalIncome;
      const tbDiff = Math.round((totalTBDr - totalTBCr) * 100) / 100;

      // 7. Member Reconciliation (Sheet 6)
      let mCount = 0;
      let mShareTot = 0;
      let mSavTot = 0;
      let mLoanTot = 0;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        const memId = this.getCellStr(wsMember.getRow(r).getCell(1));
        if (memId && memId.startsWith("MEM-")) {
          mCount++;
          mShareTot += this.getCellNum(wsMember.getRow(r).getCell(11));
          mSavTot += this.getCellNum(wsMember.getRow(r).getCell(12));
          mLoanTot += this.getCellNum(wsMember.getRow(r).getCell(13));
        }
      }

      // 8. Fiscal Year calculation
      const orgSettings = OrgSettingsManager.getSettings();
      const currentFY = orgSettings.fiscalYear || "२०८३/८४";

      // Helper to increment Devanagari / English fiscal year
      const nepDigits = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
      const nepToEng = (s: string) => s.replace(/[०-९]/g, (d) => String(nepDigits.indexOf(d)));
      const engToNep = (n: number | string) => String(n).replace(/[0-9]/g, (d) => nepDigits[parseInt(d, 10)]);

      const engFY = nepToEng(currentFY);
      let nextFYSuggestion = "२०८४/८५";
      let nextStartSuggestion = "२०८४/०४/०१";
      let nextEndSuggestion = "२०८५/०३/३१";

      const parts = engFY.split("/");
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10);
        const y2 = parseInt(parts[1], 10);
        if (!isNaN(y1) && !isNaN(y2)) {
          const nextY1 = y1 + 1;
          const nextY2 = (y2 + 1) % 100;
          nextFYSuggestion = `${engToNep(nextY1)}/${engToNep(nextY2 < 10 ? "०" + nextY2 : nextY2)}`;
          nextStartSuggestion = `${engToNep(nextY1)}/०४/०१`;
          nextEndSuggestion = `${engToNep(nextY1 + 1)}/०३/३१`;
        }
      }

      return {
        currentFiscalYear: currentFY,
        nextFiscalYearSuggestion: nextFYSuggestion,
        nextFiscalYearStartSuggestion: nextStartSuggestion,
        nextFiscalYearEndSuggestion: nextEndSuggestion,
        orgSettings,
        balanceSheet: {
          assets: {
            cash: aCash,
            bank: aBank,
            investments: aInv,
            loans: aLoan,
            receivables: aRec,
            fixedAssets: aFixed,
            otherAssets: aOther,
            total: totalAssets
          },
          liabilities: {
            shareCapital: lShare,
            reserves: lRes,
            savings: lSav,
            borrowings: lBorrow,
            otherLiabilities: lOther,
            payables: lPay,
            funds: lFunds,
            total: totalLiabilities
          },
          netSurplus,
          totalLiabilitiesAndEquity,
          isBalanced: isBsBalanced,
          diff: bsDiff
        },
        incomeStatement: {
          totalIncome,
          totalExpenses,
          netSurplus,
          incomeBreakdown: {
            loanInterest: incLoanInt,
            investmentReturn: incInv,
            serviceFees: incFee,
            otherIncome: incOther
          },
          expensesBreakdown: {
            savingInterest: expSavingInt,
            borrowingInterest: expBorrowInt,
            staffCost: expStaff,
            officeOperation: expOffice,
            otherExpenses: expOther
          },
          appropriation: {
            generalReserve: genReserveAmt,
            patronageRefund: patronageAmt,
            cooperativeEducation: eduFundAmt,
            staffBonus: staffBonusAmt,
            retainedEarnings: retainedAmt
          }
        },
        trialBalance: {
          assets: { op: tbAssetsOp, dr: tbAssetsDr, cr: tbAssetsCr, cl: totalAssets },
          liabilities: { op: tbLiabOp, dr: tbLiabDr, cr: tbLiabCr, cl: totalLiabilities },
          expenses: { op: 0, dr: totalExpenses, cr: 0, cl: totalExpenses },
          income: { op: 0, dr: 0, cr: totalIncome, cl: totalIncome },
          totalDr: totalTBDr,
          totalCr: totalTBCr,
          isBalanced: isBsBalanced,
          diff: bsDiff
        },
        subledgerRegisters: {
          shareRegister: {
            registerTotal: this.getCellNum(wsShare.getRow(25).getCell(10)),
            glTotal: lShare,
            diff: Math.round((this.getCellNum(wsShare.getRow(25).getCell(10)) - lShare) * 100) / 100
          },
          savingsRegister: {
            registerTotal: this.getCellNum(wsBachat.getRow(25).getCell(10)),
            glTotal: lSav,
            diff: Math.round((this.getCellNum(wsBachat.getRow(25).getCell(10)) - lSav) * 100) / 100
          },
          loanRegister: {
            registerTotal: this.getCellNum(wsLoan.getRow(25).getCell(11)),
            glTotal: aLoan,
            diff: Math.round((this.getCellNum(wsLoan.getRow(25).getCell(11)) - aLoan) * 100) / 100
          }
        },
        memberReconciliation: {
          memberCount: mCount,
          totalMemberShare: mShareTot,
          glShareCapital: lShare,
          shareDiff: Math.round((mShareTot - lShare) * 100) / 100,
          totalMemberSavings: mSavTot,
          glSavings: lSav,
          savingsDiff: Math.round((mSavTot - lSav) * 100) / 100,
          totalMemberLoans: mLoanTot,
          glLoans: aLoan,
          loanDiff: Math.round((mLoanTot - aLoan) * 100) / 100
        }
      };
    });
  }

  // --- EXECUTE YEAR-END AUDIT CLOSING & OPENING BALANCE ROLLOVER ---
  public static async executeYearEndRollover(options: {
    auditorName: string;
    auditorRegNo: string;
    auditDate: string;
    auditRemarks: string;
    currentFiscalYear: string;
    nextFiscalYear: string;
    nextFiscalYearStart: string;
    nextFiscalYearEnd: string;
    statutoryAppropriation: {
      generalReserve: number;
      patronageRefund: number;
      educationFund: number;
      staffBonus: number;
      retainedEarnings: number;
    };
  }): Promise<{
    success: boolean;
    message: string;
    backupFile: string;
    currentFiscalYear: string;
    newFiscalYear: string;
    openingBalances: {
      assets: number;
      liabilitiesAndCapital: number;
      shareCapital: number;
      reserves: number;
      savings: number;
      loans: number;
    };
  }> {
    return await dbMutex.runExclusive(async () => {
      await this.ensureBackup();

      // 1. Create a frozen archive snapshot of the audited closed fiscal year
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const safeFY = (options.currentFiscalYear || "FY").replace(/[^a-zA-Z0-9_\u0900-\u097F]/g, "_");
      const backupFilename = `nepal_coop_audit_closed_${safeFY}_${Date.now()}.xlsx`;
      const backupFilePath = path.join(BACKUPS_DIR, backupFilename);
      fs.copyFileSync(EXCEL_PATH, backupFilePath);

      // 2. Open Workbook
      const wb = await this.loadWorkbook();
      this.recalculateAllTotals(wb);

      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsExp = this.getWorksheetByIndex(wb, 4);
      const wsInc = this.getWorksheetByIndex(wb, 5);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);
      const wsTB = this.getWorksheetByIndex(wb, 10);

      // 3. Read current closing balances (Row 23)
      const aCash = this.getCellNum(wsAssets.getRow(23).getCell(7));
      const aBank = this.getCellNum(wsAssets.getRow(23).getCell(10));
      const aInv = this.getCellNum(wsAssets.getRow(23).getCell(13));
      const aLoan = this.getCellNum(wsAssets.getRow(23).getCell(16));
      const aRec = this.getCellNum(wsAssets.getRow(23).getCell(19));
      const aFixed = this.getCellNum(wsAssets.getRow(23).getCell(22));
      const aOther = this.getCellNum(wsAssets.getRow(23).getCell(25));
      const totalClosingAssets = aCash + aBank + aInv + aLoan + aRec + aFixed + aOther;

      const lShare = this.getCellNum(wsLiab.getRow(23).getCell(7));
      const lRes = this.getCellNum(wsLiab.getRow(23).getCell(10));
      const lSav = this.getCellNum(wsLiab.getRow(23).getCell(13));
      const lBorrow = this.getCellNum(wsLiab.getRow(23).getCell(16));
      const lOther = this.getCellNum(wsLiab.getRow(23).getCell(19));
      const lPay = this.getCellNum(wsLiab.getRow(23).getCell(22));
      const lFunds = this.getCellNum(wsLiab.getRow(23).getCell(25));

      // Incorporate statutory appropriations into reserves & current payables
      const app = options.statutoryAppropriation || {
        generalReserve: 0,
        patronageRefund: 0,
        educationFund: 0,
        staffBonus: 0,
        retainedEarnings: 0
      };

      const newReserves = lRes + (app.generalReserve || 0) + (app.retainedEarnings || 0);
      const newPayables = lPay + (app.patronageRefund || 0) + (app.educationFund || 0) + (app.staffBonus || 0);
      const totalClosingLiabilities = lShare + newReserves + lSav + lBorrow + lOther + newPayables + lFunds;

      // 4. ROLLOVER SHEET 2: Assets Opening Balance in Row 6
      const aRow6 = wsAssets.getRow(6);
      aRow6.getCell(2).value = options.nextFiscalYearStart || "२०८४/०४/०१";
      aRow6.getCell(3).value = `प्रारम्भिक सम्पत्ति मौज्दात (Opening Assets B/F - आ.व. ${options.nextFiscalYear})`;
      aRow6.getCell(4).value = "OB-001";
      aRow6.getCell(7).value = aCash;
      aRow6.getCell(10).value = aBank;
      aRow6.getCell(13).value = aInv;
      aRow6.getCell(16).value = aLoan;
      aRow6.getCell(19).value = aRec;
      aRow6.getCell(22).value = aFixed;
      aRow6.getCell(25).value = aOther;
      aRow6.getCell(26).value = { formula: "G6+J6+M6+P6+S6+V6+Y6", result: totalClosingAssets };
      aRow6.commit();

      // Clear Asset Transaction Rows (7 to 22)
      for (let r = 7; r <= 22; r++) {
        const row = wsAssets.getRow(r);
        row.getCell(2).value = null; // Date
        row.getCell(3).value = null; // Particulars
        row.getCell(4).value = null; // JE No
        // Clear Dr/Cr amounts
        row.getCell(5).value = null;
        row.getCell(6).value = null;
        row.getCell(8).value = null;
        row.getCell(9).value = null;
        row.getCell(11).value = null;
        row.getCell(12).value = null;
        row.getCell(14).value = null;
        row.getCell(15).value = null;
        row.getCell(17).value = null;
        row.getCell(18).value = null;
        row.getCell(20).value = null;
        row.getCell(21).value = null;
        row.getCell(23).value = null;
        row.getCell(24).value = null;
        // Point balance to previous row
        const prevR = r - 1;
        row.getCell(7).value = { formula: `G${prevR}+E${r}-F${r}`, result: aCash };
        row.getCell(10).value = { formula: `J${prevR}+H${r}-I${r}`, result: aBank };
        row.getCell(13).value = { formula: `M${prevR}+K${r}-L${r}`, result: aInv };
        row.getCell(16).value = { formula: `P${prevR}+N${r}-O${r}`, result: aLoan };
        row.getCell(19).value = { formula: `S${prevR}+Q${r}-R${r}`, result: aRec };
        row.getCell(22).value = { formula: `V${prevR}+T${r}-U${r}`, result: aFixed };
        row.getCell(25).value = { formula: `Y${prevR}+W${r}-X${r}`, result: aOther };
        row.getCell(26).value = { formula: `G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r}`, result: totalClosingAssets };
        row.commit();
      }

      // 5. ROLLOVER SHEET 3: Liabilities Opening Balance in Row 6
      const lRow6 = wsLiab.getRow(6);
      lRow6.getCell(2).value = options.nextFiscalYearStart || "२०८४/०४/०१";
      lRow6.getCell(3).value = `प्रारम्भिक दायित्व तथा पुँजी मौज्दात (Opening Liab B/F - आ.व. ${options.nextFiscalYear})`;
      lRow6.getCell(4).value = "OB-001";
      lRow6.getCell(7).value = lShare;
      lRow6.getCell(10).value = newReserves;
      lRow6.getCell(13).value = lSav;
      lRow6.getCell(16).value = lBorrow;
      lRow6.getCell(19).value = lOther;
      lRow6.getCell(22).value = newPayables;
      lRow6.getCell(25).value = lFunds;
      lRow6.getCell(26).value = { formula: "G6+J6+M6+P6+S6+V6+Y6", result: totalClosingLiabilities };
      lRow6.commit();

      // Clear Liability Transaction Rows (7 to 22)
      for (let r = 7; r <= 22; r++) {
        const row = wsLiab.getRow(r);
        row.getCell(2).value = null;
        row.getCell(3).value = null;
        row.getCell(4).value = null;
        row.getCell(5).value = null;
        row.getCell(6).value = null;
        row.getCell(8).value = null;
        row.getCell(9).value = null;
        row.getCell(11).value = null;
        row.getCell(12).value = null;
        row.getCell(14).value = null;
        row.getCell(15).value = null;
        row.getCell(17).value = null;
        row.getCell(18).value = null;
        row.getCell(20).value = null;
        row.getCell(21).value = null;
        row.getCell(23).value = null;
        row.getCell(24).value = null;
        const prevR = r - 1;
        row.getCell(7).value = { formula: `G${prevR}-E${r}+F${r}`, result: lShare };
        row.getCell(10).value = { formula: `J${prevR}-H${r}+I${r}`, result: newReserves };
        row.getCell(13).value = { formula: `M${prevR}-K${r}+L${r}`, result: lSav };
        row.getCell(16).value = { formula: `P${prevR}-N${r}+O${r}`, result: lBorrow };
        row.getCell(19).value = { formula: `S${prevR}-Q${r}+R${r}`, result: lOther };
        row.getCell(22).value = { formula: `V${prevR}-T${r}+U${r}`, result: newPayables };
        row.getCell(25).value = { formula: `Y${prevR}-W${r}+X${r}`, result: lFunds };
        row.getCell(26).value = { formula: `G${r}+J${r}+M${r}+P${r}+S${r}+V${r}+Y${r}`, result: totalClosingLiabilities };
        row.commit();
      }

      // 6. RESET SHEET 4 (Expenses) and SHEET 5 (Income) to 0
      for (let r = 5; r <= 21; r++) {
        const rowE = wsExp.getRow(r);
        rowE.getCell(2).value = null;
        rowE.getCell(3).value = null;
        rowE.getCell(4).value = null;
        for (let c = 5; c <= 20; c++) rowE.getCell(c).value = null;
        rowE.getCell(21).value = 0;
        rowE.commit();

        const rowI = wsInc.getRow(r);
        rowI.getCell(2).value = null;
        rowI.getCell(3).value = null;
        rowI.getCell(4).value = null;
        for (let c = 5; c <= 20; c++) rowI.getCell(c).value = null;
        rowI.getCell(21).value = 0;
        rowI.commit();
      }

      // 7. Update Sub-Ledger Starting Points (Sheets 7, 8, 9)
      wsShare.getRow(5).getCell(1).value = lShare;
      wsShare.getRow(5).commit();
      for (let r = 9; r <= 24; r++) {
        const row = wsShare.getRow(r);
        row.getCell(8).value = null;
        row.getCell(9).value = null;
        row.commit();
      }

      wsBachat.getRow(5).getCell(1).value = lSav;
      wsBachat.getRow(5).commit();
      for (let r = 9; r <= 24; r++) {
        const row = wsBachat.getRow(r);
        row.getCell(8).value = null;
        row.getCell(9).value = null;
        row.commit();
      }

      wsLoan.getRow(5).getCell(1).value = aLoan;
      wsLoan.getRow(5).commit();
      for (let r = 9; r <= 24; r++) {
        const row = wsLoan.getRow(r);
        row.getCell(9).value = null;
        row.getCell(10).value = null;
        row.commit();
      }

      // 8. Recalculate everything and commit workbook
      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);

      // 9. Update Organisation Settings with new Fiscal Year
      OrgSettingsManager.saveSettings({
        fiscalYear: options.nextFiscalYear,
        fiscalYearStartBs: options.nextFiscalYearStart,
        fiscalYearEndBs: options.nextFiscalYearEnd,
      });

      return {
        success: true,
        message: `आर्थिक वर्ष ${options.currentFiscalYear} को लेखापरीक्षण बन्द गरी नयाँ आ.व. ${options.nextFiscalYear} को लागि प्रारम्भिक मौज्दात सफलतापूर्वक सिर्जना भयो!`,
        backupFile: backupFilename,
        currentFiscalYear: options.currentFiscalYear,
        newFiscalYear: options.nextFiscalYear,
        openingBalances: {
          assets: totalClosingAssets,
          liabilitiesAndCapital: totalClosingLiabilities,
          shareCapital: lShare,
          reserves: newReserves,
          savings: lSav,
          loans: aLoan
        }
      };
    });
  }

  // =========================================================================
  // --- 10. RESET ALL TRANSACTIONS ENGINE (PRESERVING MEMBER KYC) ---
  // =========================================================================
  public static async resetAllTransactionsExceptMembers(options: {
    adminUsername: string;
    reason: string;
    resetOpeningBalances?: boolean;
    clearOpeningStaging?: boolean;
    clearOpeningDraft?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    backupFileName: string;
    membersPreservedCount: number;
    details: {
      assetsRowsReset: number;
      liabRowsReset: number;
      expenseRowsReset: number;
      incomeRowsReset: number;
      shareRowsReset: number;
      savingRowsReset: number;
      loanRowsReset: number;
    };
  }> {
    if (!options.reason || options.reason.trim().length < 10) {
      throw new Error("कारोबार रिसेट गर्न कम्तिमा १० अक्षरको आधिकारिक कारण (Mandatory Reason) आवश्यक पर्छ।");
    }

    return await dbMutex.runExclusive(async () => {
      // 1. Mandatory Pre-flight Safety Backup
      if (!fs.existsSync(BACKUPS_DIR)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      }
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      const backupFileName = `pre_transaction_reset_${ts}.xlsx`;
      const backupPath = path.join(BACKUPS_DIR, backupFileName);

      if (fs.existsSync(EXCEL_PATH)) {
        fs.copyFileSync(EXCEL_PATH, backupPath);
        console.log(`[Transaction Reset] Emergency backup saved to: ${backupPath}`);
      }

      const stagingFile = path.join(process.cwd(), "data", "opening_staging.json");
      if (fs.existsSync(stagingFile)) {
        fs.copyFileSync(stagingFile, path.join(BACKUPS_DIR, `pre_transaction_reset_staging_${ts}.json`));
      }

      const draftFile = path.join(process.cwd(), "data", "opening_wizard_draft.json");
      if (fs.existsSync(draftFile)) {
        fs.copyFileSync(draftFile, path.join(BACKUPS_DIR, `pre_transaction_reset_draft_${ts}.json`));
      }

      // 2. Load Workbook
      const wb = await this.loadWorkbook();
      const wsAssets = this.getWorksheetByIndex(wb, 2);
      const wsLiab = this.getWorksheetByIndex(wb, 3);
      const wsExp = this.getWorksheetByIndex(wb, 4);
      const wsInc = this.getWorksheetByIndex(wb, 5);
      const wsMember = this.getWorksheetByIndex(wb, 6);
      const wsShare = this.getWorksheetByIndex(wb, 7);
      const wsBachat = this.getWorksheetByIndex(wb, 8);
      const wsLoan = this.getWorksheetByIndex(wb, 9);

      // =====================================================================
      // 3. MEMBER KYC PRESERVATION (Sheet 6)
      // All member identity & KYC fields (Cols 1-9, Col 15) remain 100% intact!
      // Financial balance columns (Cols 10-14) are safely reset to zero (0).
      // =====================================================================
      let membersPreservedCount = 0;
      let mTotRowIdx = wsMember.rowCount;
      for (let r = 5; r <= wsMember.rowCount; r++) {
        const row = wsMember.getRow(r);
        const mid = this.getCellStr(row.getCell(1)).trim();
        if (mid.includes("कुल") || mid.includes("Total")) {
          mTotRowIdx = r;
          break;
        }
        if (mid && mid.startsWith("MEM-")) {
          membersPreservedCount++;
          // Reset financial columns to 0
          row.getCell(10).value = 0; // shareUnits
          row.getCell(11).value = 0; // shareBalance
          row.getCell(12).value = 0; // savingsBalance
          row.getCell(13).value = 0; // loanBalance
          row.getCell(14).value = 0; // netWorth
          row.commit();
        }
      }
      // Update Member Total Row
      const mTotRow = wsMember.getRow(mTotRowIdx);
      for (let c = 10; c <= 14; c++) {
        mTotRow.getCell(c).value = 0;
      }
      mTotRow.commit();

      // =====================================================================
      // 4. ASSETS (Sheet 2) RESET
      // =====================================================================
      let aTotRowIdx = wsAssets.rowCount;
      for (let r = 7; r <= wsAssets.rowCount; r++) {
        if (this.getCellStr(wsAssets.getRow(r).getCell(1)).includes("कुल")) {
          aTotRowIdx = r;
          break;
        }
      }
      let assetsRowsReset = 0;
      if (aTotRowIdx > 23) {
        const excess = aTotRowIdx - 23;
        wsAssets.spliceRows(7, excess);
        assetsRowsReset += excess;
        aTotRowIdx = 23;
      }
      for (let r = 7; r < aTotRowIdx; r++) {
        const row = wsAssets.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2)) || this.getCellStr(row.getCell(4))) {
          assetsRowsReset++;
        }
        for (let c = 1; c <= 26; c++) {
          if (c <= 4 || [5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24].includes(c)) {
            row.getCell(c).value = null;
          }
        }
        row.commit();
      }
      if (options.resetOpeningBalances) {
        const opRow = wsAssets.getRow(6);
        for (let c = 5; c <= 26; c++) {
          opRow.getCell(c).value = 0;
        }
        opRow.commit();
      }

      // =====================================================================
      // 5. LIABILITIES (Sheet 3) RESET
      // =====================================================================
      let lTotRowIdx = wsLiab.rowCount;
      for (let r = 7; r <= wsLiab.rowCount; r++) {
        if (this.getCellStr(wsLiab.getRow(r).getCell(1)).includes("कुल")) {
          lTotRowIdx = r;
          break;
        }
      }
      let liabRowsReset = 0;
      if (lTotRowIdx > 23) {
        const excess = lTotRowIdx - 23;
        wsLiab.spliceRows(7, excess);
        liabRowsReset += excess;
        lTotRowIdx = 23;
      }
      for (let r = 7; r < lTotRowIdx; r++) {
        const row = wsLiab.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2)) || this.getCellStr(row.getCell(4))) {
          liabRowsReset++;
        }
        for (let c = 1; c <= 26; c++) {
          if (c <= 4 || [5, 6, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24].includes(c)) {
            row.getCell(c).value = null;
          }
        }
        row.commit();
      }
      if (options.resetOpeningBalances) {
        const opRow = wsLiab.getRow(6);
        for (let c = 5; c <= 26; c++) {
          opRow.getCell(c).value = 0;
        }
        opRow.commit();
      }

      // =====================================================================
      // 6. EXPENSES (Sheet 4) RESET
      // =====================================================================
      let eTotRowIdx = wsExp.rowCount;
      for (let r = 5; r <= wsExp.rowCount; r++) {
        if (this.getCellStr(wsExp.getRow(r).getCell(1)).includes("कुल")) {
          eTotRowIdx = r;
          break;
        }
      }
      let expenseRowsReset = 0;
      if (eTotRowIdx > 22) {
        const excess = eTotRowIdx - 22;
        wsExp.spliceRows(5, excess);
        expenseRowsReset += excess;
        eTotRowIdx = 22;
      }
      for (let r = 5; r < eTotRowIdx; r++) {
        const row = wsExp.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2)) || this.getCellStr(row.getCell(4))) {
          expenseRowsReset++;
        }
        for (let c = 1; c <= wsExp.columnCount; c++) {
          row.getCell(c).value = null;
        }
        row.commit();
      }

      // =====================================================================
      // 7. INCOME (Sheet 5) RESET
      // =====================================================================
      let iTotRowIdx = wsInc.rowCount;
      for (let r = 5; r <= wsInc.rowCount; r++) {
        if (this.getCellStr(wsInc.getRow(r).getCell(1)).includes("कुल")) {
          iTotRowIdx = r;
          break;
        }
      }
      let incomeRowsReset = 0;
      if (iTotRowIdx > 22) {
        const excess = iTotRowIdx - 22;
        wsInc.spliceRows(5, excess);
        incomeRowsReset += excess;
        iTotRowIdx = 22;
      }
      for (let r = 5; r < iTotRowIdx; r++) {
        const row = wsInc.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2)) || this.getCellStr(row.getCell(4))) {
          incomeRowsReset++;
        }
        for (let c = 1; c <= wsInc.columnCount; c++) {
          row.getCell(c).value = null;
        }
        row.commit();
      }

      // =====================================================================
      // 8. SHARES (Sheet 7) RESET
      // =====================================================================
      let sTotRowIdx = wsShare.rowCount;
      for (let r = 9; r <= wsShare.rowCount; r++) {
        if (this.getCellStr(wsShare.getRow(r).getCell(1)).includes("कुल")) {
          sTotRowIdx = r;
          break;
        }
      }
      let shareRowsReset = 0;
      if (sTotRowIdx > 25) {
        const excess = sTotRowIdx - 25;
        wsShare.spliceRows(9, excess);
        shareRowsReset += excess;
        sTotRowIdx = 25;
      }
      for (let r = 9; r < sTotRowIdx; r++) {
        const row = wsShare.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2))) {
          shareRowsReset++;
        }
        for (let c = 1; c <= 12; c++) {
          row.getCell(c).value = null;
        }
        row.commit();
      }
      const opShare = options.resetOpeningBalances ? 0 : this.getCellNum(wsShare.getRow(5).getCell(1));
      wsShare.getRow(5).getCell(1).value = opShare;
      wsShare.getRow(5).getCell(3).value = 0;
      wsShare.getRow(5).getCell(5).value = 0;
      wsShare.getRow(5).getCell(7).value = opShare;
      wsShare.getRow(5).commit();

      // =====================================================================
      // 9. SAVINGS (Sheet 8) RESET
      // =====================================================================
      let bTotRowIdx = wsBachat.rowCount;
      for (let r = 9; r <= wsBachat.rowCount; r++) {
        if (this.getCellStr(wsBachat.getRow(r).getCell(1)).includes("कुल")) {
          bTotRowIdx = r;
          break;
        }
      }
      let savingRowsReset = 0;
      if (bTotRowIdx > 25) {
        const excess = bTotRowIdx - 25;
        wsBachat.spliceRows(9, excess);
        savingRowsReset += excess;
        bTotRowIdx = 25;
      }
      for (let r = 9; r < bTotRowIdx; r++) {
        const row = wsBachat.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2))) {
          savingRowsReset++;
        }
        for (let c = 1; c <= 12; c++) {
          row.getCell(c).value = null;
        }
        row.commit();
      }
      const opSav = options.resetOpeningBalances ? 0 : this.getCellNum(wsBachat.getRow(5).getCell(1));
      wsBachat.getRow(5).getCell(1).value = opSav;
      wsBachat.getRow(5).getCell(3).value = 0;
      wsBachat.getRow(5).getCell(5).value = 0;
      wsBachat.getRow(5).getCell(7).value = opSav;
      wsBachat.getRow(5).commit();

      // =====================================================================
      // 10. LOANS (Sheet 9) RESET
      // =====================================================================
      let loanTotRowIdx = wsLoan.rowCount;
      for (let r = 9; r <= wsLoan.rowCount; r++) {
        if (this.getCellStr(wsLoan.getRow(r).getCell(1)).includes("कुल")) {
          loanTotRowIdx = r;
          break;
        }
      }
      let loanRowsReset = 0;
      if (loanTotRowIdx > 25) {
        const excess = loanTotRowIdx - 25;
        wsLoan.spliceRows(9, excess);
        loanRowsReset += excess;
        loanTotRowIdx = 25;
      }
      for (let r = 9; r < loanTotRowIdx; r++) {
        const row = wsLoan.getRow(r);
        if (this.getCellStr(row.getCell(1)) || this.getCellStr(row.getCell(2))) {
          loanRowsReset++;
        }
        for (let c = 1; c <= 13; c++) {
          row.getCell(c).value = null;
        }
        row.commit();
      }
      const opLoan = options.resetOpeningBalances ? 0 : this.getCellNum(wsLoan.getRow(5).getCell(1));
      wsLoan.getRow(5).getCell(1).value = opLoan;
      wsLoan.getRow(5).getCell(3).value = 0;
      wsLoan.getRow(5).getCell(5).value = 0;
      wsLoan.getRow(5).getCell(7).value = opLoan;
      wsLoan.getRow(5).commit();

      // =====================================================================
      // 11. RECALCULATE ALL TOTALS & SAVE EXCEL
      // =====================================================================
      this.recalculateAllTotals(wb);
      await this.saveWorkbook(wb);

      // =====================================================================
      // 12. RESET STAGING & OPENING SETUP (Optional / Default True)
      // =====================================================================
      if (options.clearOpeningStaging !== false) {
        if (fs.existsSync(stagingFile)) {
          fs.writeFileSync(stagingFile, JSON.stringify({ batches: [] }, null, 2), "utf-8");
        }
      }

      if (options.clearOpeningDraft !== false) {
        OrgSettingsManager.saveSettings({
          openingBalanceStatus: "NotStarted",
        });
      }

      // =====================================================================
      // 13. AUDIT TRAIL LOGGING
      // =====================================================================
      try {
        const logFile = path.join(process.cwd(), "data", "audit_log.json");
        let logs: any[] = [];
        if (fs.existsSync(logFile)) {
          try {
            logs = JSON.parse(fs.readFileSync(logFile, "utf-8"));
          } catch {}
        }
        logs.unshift({
          timestamp: new Date().toISOString(),
          user: options.adminUsername,
          action: "TRANSACTION_RESET_PURGE",
          description: `प्रशासक ${options.adminUsername} द्वारा सम्पूर्ण कारोबार रिसेट गरियो। ${membersPreservedCount} सदस्यहरूको व्यक्तिगत KYC विवरण अक्षुण्ण राखियो। (कारण: ${options.reason})`,
          backupFile: backupFileName,
        });
        fs.writeFileSync(logFile, JSON.stringify(logs.slice(0, 100), null, 2), "utf-8");
      } catch (err) {
        console.error("Audit log writing error during reset:", err);
      }

      return {
        success: true,
        message: `सबै वित्तीय कारोबार, भौचर र लेजरहरू सफलतापूर्वक रिसेट गरियो। ${membersPreservedCount} सदस्यहरूको व्यक्तिगत विवरण (KYC) सुरक्षित राखिएको छ।`,
        backupFileName,
        membersPreservedCount,
        details: {
          assetsRowsReset,
          liabRowsReset,
          expenseRowsReset,
          incomeRowsReset,
          shareRowsReset,
          savingRowsReset,
          loanRowsReset,
        },
      };
    });
  }
}
