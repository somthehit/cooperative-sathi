"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  PiggyBank,
  BadgeDollarSign,
  Landmark,
  Building,
  Gift,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Calculator,
  Plus,
  Trash2,
} from "lucide-react";

export interface MasterAccountItem {
  code: string;
  name: string;
  khata: string;
  requiresMember?: boolean;
  isExpense?: boolean;
  isIncome?: boolean;
  subTypes?: Array<{ code: string; label: string }>;
}

export interface MasterAccountGroup {
  group: string;
  items: MasterAccountItem[];
}

export interface JournalLineState {
  id: string;
  accountCode: string;
  memberId: string;
  subType: string;
  drAmount: string;
  crAmount: string;
}

// MASTER ACCOUNT HEADS (ALL 4 KHATAS UNIFIED CATALOG)
const MASTER_ACCOUNTS: MasterAccountGroup[] = [
  {
    group: "सम्पत्ति खाता (Root 04 Assets — Sheet 2)",
    items: [
      { code: "80", name: "80 नगद मौज्दात (Cash In Hand)", khata: "04", requiresMember: false },
      { code: "90", name: "90 बैंक मौज्दात (Bank Balance)", khata: "04", requiresMember: false },
      { code: "100", name: "100 लगानी हिसाब (Investments)", khata: "04", requiresMember: false },
      {
        code: "110",
        name: "110 ऋण लगानी हिसाब (Loan Investment)",
        khata: "04",
        requiresMember: true,
        subTypes: [
          { code: "110.1", label: "110.1 कृषि तथा पशुपालन कर्जा" },
          { code: "110.2", label: "110.2 लघु व्यापार तथा व्यवसाय कर्जा" },
          { code: "110.3", label: "110.3 आवास तथा घर कर्जा" },
          { code: "110.4", label: "110.4 शैक्षिक तथा वैदेशिक रोजगार" },
          { code: "110.5", label: "110.5 अन्य आवधिक कर्जा" },
        ],
      },
      { code: "120", name: "120 पाउनु पर्ने हिसाब (Receivables)", khata: "04", requiresMember: false },
      { code: "130", name: "130 स्थिर सम्पत्ति हिसाब (Fixed Assets)", khata: "04", requiresMember: false },
      { code: "140", name: "140 अन्य सम्पत्ति हिसाब (Other Assets)", khata: "04", requiresMember: false },
    ],
  },
  {
    group: "दायित्व तथा पुँजी खाता (Root 05 Liabilities & Equity — Sheet 3)",
    items: [
      { code: "10", name: "10 शेयर पुँजी हिसाब (Share Capital)", khata: "05", requiresMember: true },
      { code: "20", name: "20 जगेडा तथा कोष हिसाब (Reserves & Funds)", khata: "05", requiresMember: false },
      {
        code: "30",
        name: "30 बचत / निक्षेप हिसाब (Member Savings)",
        khata: "05",
        requiresMember: true,
        subTypes: [
          { code: "30.1", label: "30.1 नियमित बचत (8.5%)" },
          { code: "30.2", label: "30.2 ऐच्छिक बचत (7.0%)" },
          { code: "30.3", label: "30.3 मुद्दती बचत (10.5%)" },
          { code: "30.4", label: "30.4 बाल तथा नारी बचत (9.0%)" },
        ],
      },
      { code: "40", name: "40 बाह्य ऋण हिसाब (External Borrowings)", khata: "05", requiresMember: false },
      { code: "50", name: "50 अनुदान हिसाब (Grants / Anudan)", khata: "05", requiresMember: false },
      { code: "60", name: "60 भुक्तानी दिनुपर्ने हिसाब (Payables / TDS)", khata: "05", requiresMember: false },
      { code: "70", name: "70 अन्य दायित्व हिसाब (Other Liabilities)", khata: "05", requiresMember: false },
    ],
  },
  {
    group: "खर्च खाता (Root 02 Expenses — Sheet 4)",
    items: [
      { code: "150.1", name: "150.1 खरिद हिसाब (Purchases)", khata: "02", isExpense: true },
      { code: "150.2", name: "150.2 ज्याला तथा ढुवानी (Wages & Freight)", khata: "02", isExpense: true },
      { code: "150.3", name: "150.3 कर्मचारी तलब/भत्ता (Staff Salary)", khata: "02", isExpense: true },
      { code: "150.4", name: "150.4 कार्यालय घरभाडा (Office Rent)", khata: "02", isExpense: true },
      { code: "150.5", name: "150.5 बचत ब्याज खर्च (Savings Interest)", khata: "02", isExpense: true },
      { code: "150.6", name: "150.6 बाह्य ऋण ब्याज (Borrowing Interest)", khata: "02", isExpense: true },
      { code: "150.7", name: "150.7 मसलन्द तथा छपाई (Stationery)", khata: "02", isExpense: true },
      { code: "150.8", name: "150.8 पानी तथा बिजुली (Utilities)", khata: "02", isExpense: true },
      { code: "150.9", name: "150.9 सञ्चार/इन्टरनेट (Comms & Internet)", khata: "02", isExpense: true },
      { code: "150.10", name: "150.10 लेखापरीक्षण शुल्क (Audit Fees)", khata: "02", isExpense: true },
      { code: "150.11", name: "150.11 बैठक तथा सभा खर्च (Meetings)", khata: "02", isExpense: true },
      { code: "150.12", name: "150.12 शिक्षा तथा तालिम (Education & Training)", khata: "02", isExpense: true },
      { code: "150.13", name: "150.13 ह्रासकट्टी खर्च (Depreciation)", khata: "02", isExpense: true },
      { code: "150.14", name: "150.14 कर्जा नोक्सानी LLP (Loan Loss Provision)", khata: "02", isExpense: true },
      { code: "150.15", name: "150.15 मर्मत तथा सम्भार (Repairs & Maintenance)", khata: "02", isExpense: true },
      { code: "150.16", name: "150.16 विविध खर्च (Miscellaneous Expenses)", khata: "02", isExpense: true },
    ],
  },
  {
    group: "आम्दानी खाता (Root 03 Income — Sheet 5)",
    items: [
      { code: "160.1", name: "160.1 बिक्री हिसाब (Sales Income)", khata: "03", isIncome: true },
      { code: "160.2", name: "160.2 लगानीबाट ब्याज (Investment Returns)", khata: "03", isIncome: true },
      { code: "160.3", name: "160.3 सदस्य ऋण लगानीबाट ब्याज (Loan Interest)", khata: "03", isIncome: true },
      { code: "160.4", name: "160.4 हर्जाना तथा विलम्ब शुल्क (Penalties)", khata: "03", isIncome: true },
      { code: "160.5", name: "160.5 ऋण सेवा शुल्क (Loan Service Fees)", khata: "03", isIncome: true },
      { code: "160.6", name: "160.6 प्रवेश शुल्क आम्दानी (Entrance Fees)", khata: "03", isIncome: true },
      { code: "160.7", name: "160.7 पासबुक तथा फारम बिक्री (Passbook Sales)", khata: "03", isIncome: true },
      { code: "160.8", name: "160.8 शेयर लाभांश आम्दानी (Dividend Income)", khata: "03", isIncome: true },
      { code: "160.9", name: "160.9 कमिशन तथा सेवा शुल्क (Commission)", khata: "03", isIncome: true },
      { code: "160.10", name: "160.10 सरकारी/संस्थागत अनुदान (Grants Income)", khata: "03", isIncome: true },
      { code: "160.11", name: "160.11 कृषि उपज तथा मलखाद (Agri Produce)", khata: "03", isIncome: true },
      { code: "160.12", name: "160.12 उन्नत बीउबिजन बिक्री (Seeds Sales)", khata: "03", isIncome: true },
      { code: "160.13", name: "160.13 उपभोक्ता सामान बिक्री (Consumer Goods)", khata: "03", isIncome: true },
      { code: "160.14", name: "160.14 गोदाम तथा मेसिनरी भाडा (Rent Income)", khata: "03", isIncome: true },
      { code: "160.15", name: "160.15 दुग्ध तथा पशुपालन आम्दानी (Dairy/Livestock)", khata: "03", isIncome: true },
      { code: "160.16", name: "160.16 विविध आम्दानी (Miscellaneous Income)", khata: "03", isIncome: true },
    ],
  },
];

const findAccountMeta = (code: string): MasterAccountItem | null => {
  for (const group of MASTER_ACCOUNTS) {
    const item = group.items.find((i) => i.code === code);
    if (item) return item;
  }
  return null;
};

export default function TransactionsPage() {
  const [activeTab, setActiveTab] = useState<
    "share" | "saving" | "loan" | "bank" | "assets" | "anudan" | "investment" | "je"
  >("share");

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [lastVoucher, setLastVoucher] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = "2083-07-10";

  // Load members for dropdowns
  useEffect(() => {
    fetch("/api/members")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setMembers(data.members || []);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Share State
  const [shareData, setShareData] = useState({
    memberId: "",
    type: "ISSUE" as "ISSUE" | "RETURN",
    shareUnits: "10",
    amount: "1000",
    paymentMode: "CASH" as "CASH" | "BANK",
    date: todayStr,
    narration: "थप शेयर कित्ता खरिद बापत पुँजी दाखिला",
  });

  // 2. Saving State
  const [savingData, setSavingData] = useState({
    memberId: "",
    savingType: "30.1 नियमित बचत",
    type: "DEPOSIT" as "DEPOSIT" | "WITHDRAWAL",
    amount: "2500",
    interestRate: "0.085",
    paymentMode: "CASH" as "CASH" | "BANK",
    date: todayStr,
    narration: "मासिक नियमित बचत दाखिला",
  });

  // 3. Loan State
  const [loanData, setLoanData] = useState({
    memberId: "",
    loanCategory: "110.1 कृषि कर्जा",
    type: "REPAYMENT" as "DISBURSEMENT" | "REPAYMENT",
    principalAmount: "15000",
    interestAmount: "1800",
    interestRate: "0.12",
    collateral: "जग्गा धितो कित्ता नं. ४२१",
    paymentMode: "CASH" as "CASH" | "BANK",
    date: todayStr,
    narration: "कृषि कर्जा मासिक किस्ता साँवा तथा ब्याज असुली",
  });

  // 4. Bank Reconciliation State
  const [bankData, setBankData] = useState({
    type: "CASH_TO_BANK" as "CASH_TO_BANK" | "BANK_TO_CASH" | "BANK_CHARGES" | "BANK_INTEREST" | "RECON_ADJUSTMENT",
    bankName: "राष्ट्रिय वाणिज्य बैंक लि. (खाता नं: ०१२३००४५)",
    chequeNo: "CHQ-88401",
    amount: "50000",
    date: todayStr,
    narration: "दैनिक बचत संकलन रकम बैंक खातामा दाखिला",
  });

  // 5. Assets with Depreciation State
  const [assetData, setAssetData] = useState({
    type: "PURCHASE" as "PURCHASE" | "DEPRECIATION",
    assetCategory: "130.4 उपकरण तथा कम्प्युटर (IT & Equipment)",
    assetName: "डेल डेक्सटप कम्प्युटर २ थान (Dell Core i5)",
    amount: "140000",
    depreciationRate: "0.25", // 25%
    paymentMode: "BANK" as "CASH" | "BANK",
    date: todayStr,
    narration: "कार्यालय लेखा शाखा प्रयोजनार्थ कम्प्युटर खरिद",
  });

  // 6. Anudan (Grants) State
  const [anudanData, setAnudanData] = useState({
    type: "CAPITAL_GRANT" as "CAPITAL_GRANT" | "OPERATIONAL_GRANT",
    donorAgency: "संघीय कृषि तथा पशुपन्छी विकास मन्त्रालय",
    projectName: "दुग्ध संकलन केन्द्र तथा चिलिङ भ्याट स्थापना कार्यक्रम",
    amount: "350000",
    paymentMode: "BANK" as "CASH" | "BANK",
    date: todayStr,
    narration: "दुग्ध चिलिङ भ्याट खरिद बापत नेपाल सरकार पुँजीगत अनुदान प्राप्त",
  });

  // 7. Investment State
  const [investmentData, setInvestmentData] = useState({
    type: "NEW_INVESTMENT" as "NEW_INVESTMENT" | "RETURN_MATURITY" | "DIVIDEND_INTEREST",
    investmentTitle: "राष्ट्रिय सहकारी बैंक लि. मुद्दती निक्षेप (१ वर्षे)",
    institutionName: "राष्ट्रिय सहकारी बैंक लिमिटेड",
    amount: "500000",
    interestRate: "0.095", // 9.5%
    paymentMode: "BANK" as "CASH" | "BANK",
    date: todayStr,
    narration: "संस्थाको तरलता व्यवस्थापनार्थ १ वर्षे मुद्दती लगानी",
  });

  // 8. Multi-Line Double-Entry Journal Voucher State
  const [jeHeader, setJeHeader] = useState({
    date: todayStr,
    particulars: "कार्यालय खर्च तथा बैंक भुक्तानी",
  });

  const [jeLines, setJeLines] = useState<JournalLineState[]>([
    { id: "1", accountCode: "150.3", memberId: "", subType: "", drAmount: "5000", crAmount: "0" },
    { id: "2", accountCode: "90", memberId: "", subType: "", drAmount: "0", crAmount: "5000" },
  ]);

  const handleAddJeLine = () => {
    setJeLines((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        accountCode: "80",
        memberId: "",
        subType: "",
        drAmount: "0",
        crAmount: "0",
      },
    ]);
  };

  const handleRemoveJeLine = (index: number) => {
    if (jeLines.length <= 2) return;
    setJeLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateJeLine = (index: number, field: keyof JournalLineState, value: string) => {
    setJeLines((prev) => {
      const updated = [...prev];
      const cur = { ...updated[index] };

      if (field === "accountCode") {
        cur.accountCode = value;
        const meta = findAccountMeta(value);
        if (meta?.requiresMember) {
          if (!cur.memberId && members.length > 0) {
            cur.memberId = members[0].memberId;
          }
        } else {
          cur.memberId = "";
        }

        if (value === "30") {
          cur.subType = "30.1";
        } else if (value === "110") {
          cur.subType = "110.1";
        } else {
          cur.subType = "";
        }

        if (meta?.isExpense) {
          cur.crAmount = "0";
        } else if (meta?.isIncome) {
          cur.drAmount = "0";
        }
      } else if (field === "drAmount") {
        cur.drAmount = value;
        if (parseFloat(value) > 0) {
          cur.crAmount = "0";
        }
      } else if (field === "crAmount") {
        cur.crAmount = value;
        if (parseFloat(value) > 0) {
          cur.drAmount = "0";
        }
      } else if (field === "memberId") {
        cur.memberId = value;
      } else if (field === "subType") {
        cur.subType = value;
      }

      updated[index] = cur;
      return updated;
    });
  };

  const jeTotalDr = jeLines.reduce((acc, l) => acc + (parseFloat(l.drAmount) || 0), 0);
  const jeTotalCr = jeLines.reduce((acc, l) => acc + (parseFloat(l.crAmount) || 0), 0);
  const jeDifference = Math.abs(jeTotalDr - jeTotalCr);
  const isJeBalanced = jeDifference < 0.001 && jeTotalDr > 0;

  // Default member initializers
  useEffect(() => {
    if (members.length > 0) {
      if (!shareData.memberId) setShareData((s) => ({ ...s, memberId: members[0].memberId }));
      if (!savingData.memberId) setSavingData((s) => ({ ...s, memberId: members[0].memberId }));
      if (!loanData.memberId) setLoanData((s) => ({ ...s, memberId: members[0].memberId }));
    }
  }, [members]);

  // Generic submit helper
  const submitTransaction = async (url: string, payload: any, defaultSuccess: string) => {
    setLoading(true);
    setSuccessMsg("");
    setErrorMsg("");
    setLastVoucher("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "कारोबार असफल भयो");
      setSuccessMsg(data.message || defaultSuccess);
      if (data.voucherNo) setLastVoucher(data.voucherNo);
    } catch (err: any) {
      setErrorMsg(err.message || "कारोबार प्रविष्टि गर्दा त्रुटि देखियो");
    } finally {
      setLoading(false);
    }
  };

  // 1. Share Submit
  const handleShareSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/share", shareData, "शेयर कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 2. Saving Submit
  const handleSavingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/saving", savingData, "बचत कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 3. Loan Submit
  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/loan", loanData, "कर्जा कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 4. Bank Recon Submit
  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/bank-recon", bankData, "बैंक कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 5. Assets Submit
  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/assets", assetData, "सम्पत्ति कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 6. Anudan Submit
  const handleAnudanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/anudan", anudanData, "अनुदान कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 7. Investment Submit
  const handleInvestmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitTransaction("/api/transactions/investment", investmentData, "लगानी कारोबार सफलतापूर्वक प्रविष्टि गरियो");
  };

  // 8. Multi-Line Double-Entry JE Submit
  const handleJeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isJeBalanced) {
      setErrorMsg(
        `गोश्वारा भौचर असन्तुलित छ! कुल डेबिट (रु. ${jeTotalDr.toLocaleString()}) र कुल क्रेडिट (रु. ${jeTotalCr.toLocaleString()}) बराबर हुनुपर्दछ। (फरक: रु. ${jeDifference.toLocaleString()})`
      );
      return;
    }
    submitTransaction(
      "/api/transactions/je",
      {
        date: jeHeader.date,
        particulars: jeHeader.particulars,
        lines: jeLines,
      },
      "बहु-हरफ दोहोरो प्रविष्टि गोश्वारा भौचर (JE) सफलतापूर्वक खातामा प्रविष्टि गरियो"
    );
  };

  const navTabs = [
    { id: "share", labelNep: "शेयर निष्काशन/फिर्ता", labelEng: "Share Issue / Return", icon: CreditCard, khata: "दायित्व ०५ + सम्पत्ति ०४" },
    { id: "saving", labelNep: "बचत दाखिला/फिर्ता", labelEng: "Saving Deposit / Withdraw", icon: PiggyBank, khata: "दायित्व ०५ + सम्पत्ति ०४" },
    { id: "loan", labelNep: "ऋण लगानी/असुली", labelEng: "Loan Disburse / Repay", icon: BadgeDollarSign, khata: "सम्पत्ति ०४ + आम्दानी ०३" },
    { id: "bank", labelNep: "बैंक हिसाब मिलान", labelEng: "Bank Reconciliation", icon: Landmark, khata: "सम्पत्ति ०४ (८० ⇄ ९०)" },
    { id: "assets", labelNep: "स्थिर सम्पत्ति र ह्रासकट्टी", labelEng: "Assets & Depreciation", icon: Building, khata: "सम्पत्ति ०४ + खर्च ०२" },
    { id: "anudan", labelNep: "अनुदान विवरण", labelEng: "Grants (Anudan) Entry", icon: Gift, khata: "दायित्व ०५ / आम्दानी ०३" },
    { id: "investment", labelNep: "लगानी हिसाब", labelEng: "Investment (Hisab 100)", icon: TrendingUp, khata: "सम्पत्ति ०४ + आम्दानी ०३" },
    { id: "je", labelNep: "गोश्वारा भौचर (JE)", labelEng: "General Journal Voucher", icon: FileSpreadsheet, khata: "४-खाता दोहोरो प्रविष्टि (Multi-Line)" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#1F497D] text-white text-[11px] font-black px-2.5 py-0.5 rounded shadow-sm">
              ४-खाता Live Auto-Sync
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              एकीकृत कारोबार तथा भौचर प्रविष्टि (Multi-Khata Entry Hub)
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            दोहोरो लेखा प्रणाली (Double-Entry Bookkeeping) अनुसार सम्पूर्ण कारोबारहरू प्रत्यक्ष ४-मूल खाता स्प्रेडशिटमा तत्काल अद्यावधिक हुन्छ।
          </p>
        </div>

        <Link
          href="/khatas"
          className="flex items-center space-x-1.5 px-4 py-2 bg-[#1F497D] hover:bg-[#183a63] text-white text-xs font-bold rounded-xl shadow transition-colors"
        >
          <span>४-मूल खाता हेर्नुहोस्</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Success Alert with Link to Khata Explorer */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="font-extrabold text-emerald-900">{successMsg}</div>
              {lastVoucher && (
                <div className="text-[11px] text-emerald-700 mt-0.5 font-mono">
                  स्वीकृत भौचर नं: <span className="font-bold">{lastVoucher}</span> | प्रत्यक्ष एक्सेल फाइल तथा ४-खाता लेजरमा स्वतः अपडेट भयो।
                </div>
              )}
            </div>
          </div>
          <Link
            href="/khatas"
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center space-x-1 transition-colors"
          >
            <span>लेजर हेर्नुहोस्</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-3 font-medium shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <div className="font-bold">कारोबार प्रविष्टि असफल:</div>
            <div className="text-[11px] text-rose-700 mt-0.5">{errorMsg}</div>
          </div>
        </div>
      )}

      {/* Main Form Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Navigation Tabs (Responsive Grid - Zero Horizontal Scroll) */}
        <div className="p-2 sm:p-2.5 bg-slate-100/90 border-b border-slate-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSuccessMsg("");
                    setErrorMsg("");
                  }}
                  className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-1.5 sm:gap-2 px-2.5 py-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-[#1F497D] font-black shadow-sm border border-slate-300/80 ring-1 ring-[#1F497D]/10"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 sm:mt-0.5 ${isActive ? "text-[#1F497D]" : "text-slate-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="leading-tight text-xs font-bold truncate">{tab.labelNep}</div>
                    <div className="text-[9px] opacity-75 font-normal truncate">{tab.labelEng}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {/* ========================================================= */}
          {/* TAB 1: SHARE ISSUE / RETURN */}
          {/* ========================================================= */}
          {activeTab === "share" && (
            <form onSubmit={handleShareSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-[#1F497D]">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>शेयर पुँजी खाता (१०.१) दोहोरो प्रविष्टि नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>शेयर खरिद (Issue):</strong> दायित्व १०.१ मा Cr (+) र सम्पत्ति नगद ८० / बैंक ९० मा Dr (+)<br />
                    <strong>शेयर फिर्ता (Return):</strong> दायित्व १०.१ मा Dr (-) र सम्पत्ति नगद ८० / बैंक ९० मा Cr (-)
                  </p>
                </div>
                <span className="bg-blue-200/60 text-[#1F497D] text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 7 + Sheet 3 + Sheet 2
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">सदस्य छनोट (Select Member) *</label>
                  <select
                    required
                    value={shareData.memberId}
                    onChange={(e) => setShareData({ ...shareData, memberId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.memberId} — {m.fullName} (हाल: {m.shareUnits} कित्ता)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Transaction Type) *</label>
                  <select
                    value={shareData.type}
                    onChange={(e) => {
                      const t = e.target.value as "ISSUE" | "RETURN";
                      setShareData({
                        ...shareData,
                        type: t,
                        narration: t === "ISSUE" ? "थप शेयर कित्ता खरिद बापत पुँजी दाखिला" : "शेयर कित्ता फिर्ता भुक्तानी",
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="ISSUE">थप शेयर कित्ता खरिद (Share Issue - Cr +)</option>
                    <option value="RETURN">शेयर कित्ता फिर्ता (Share Return - Dr -)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">शेयर कित्ता संख्या (Share Units) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={shareData.shareUnits}
                    onChange={(e) => {
                      const units = e.target.value;
                      const uNum = parseInt(units, 10) || 0;
                      setShareData({
                        ...shareData,
                        shareUnits: units,
                        amount: String(uNum * 100),
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">दर रु १०० प्रति कित्ता</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कुल शेयर रकम रु. (Total Amount) *</label>
                  <input
                    type="number"
                    required
                    value={shareData.amount}
                    onChange={(e) => setShareData({ ...shareData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Payment Mode) *</label>
                  <select
                    value={shareData.paymentMode}
                    onChange={(e) => setShareData({ ...shareData, paymentMode: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="CASH">नगद काउन्टर (Cash - Hisab 80)</option>
                    <option value="BANK">बैंक खाता (Bank - Hisab 90)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={shareData.date}
                    onChange={(e) => setShareData({ ...shareData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={shareData.narration}
                  onChange={(e) => setShareData({ ...shareData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-[#1F497D] hover:bg-[#183a63] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  <span>शेयर कारोबार प्रविष्टि गर्नुहोस् (Post Share Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 2: SAVING DEPOSIT / WITHDRAWAL */}
          {/* ========================================================= */}
          {activeTab === "saving" && (
            <form onSubmit={handleSavingSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-emerald-900">
                    <PiggyBank className="w-4 h-4 text-emerald-600" />
                    <span>बचत तथा निक्षेप खाता (३०.१..३०.४) दोहोरो प्रविष्टि नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>बचत दाखिला (Deposit):</strong> दायित्व ३० मा Cr (+) र सम्पत्ति नगद ८० / बैंक ९० मा Dr (+)<br />
                    <strong>बचत फिर्ता (Withdrawal):</strong> दायित्व ३० मा Dr (-) र सम्पत्ति नगद ८० / बैंक ९० मा Cr (-)
                  </p>
                </div>
                <span className="bg-emerald-200/60 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 8 + Sheet 3 + Sheet 2
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">सदस्य छनोट (Select Member) *</label>
                  <select
                    required
                    value={savingData.memberId}
                    onChange={(e) => setSavingData({ ...savingData, memberId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.memberId} — {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">बचत खाता प्रकार (Saving Scheme) *</label>
                  <select
                    value={savingData.savingType}
                    onChange={(e) => setSavingData({ ...savingData, savingType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="30.1 नियमित बचत">30.1 नियमित बचत (8.5% p.a.)</option>
                    <option value="30.2 ऐच्छिक बचत">30.2 ऐच्छिक बचत (7.0% p.a.)</option>
                    <option value="30.3 मुद्दती बचत">30.3 मुद्दती बचत (10.5% p.a.)</option>
                    <option value="30.4 बाल तथा नारी बचत">30.4 बाल तथा नारी बचत (9.0% p.a.)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Transaction Type) *</label>
                  <select
                    value={savingData.type}
                    onChange={(e) => {
                      const t = e.target.value as "DEPOSIT" | "WITHDRAWAL";
                      setSavingData({
                        ...savingData,
                        type: t,
                        narration: t === "DEPOSIT" ? "नियमित बचत रकम दाखिला" : "बचत खाताबाट रकम भुक्तानी फिर्ता",
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="DEPOSIT">बचत दाखिला (Deposit - Cr +)</option>
                    <option value="WITHDRAWAL">बचत फिर्ता भुक्तानी (Withdrawal - Dr -)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">बचत रकम रु. (Amount NPR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={savingData.amount}
                    onChange={(e) => setSavingData({ ...savingData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-emerald-700 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Payment Mode) *</label>
                  <select
                    value={savingData.paymentMode}
                    onChange={(e) => setSavingData({ ...savingData, paymentMode: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="CASH">नगद काउन्टर (Cash - Hisab 80)</option>
                    <option value="BANK">बैंक खाता (Bank - Hisab 90)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={savingData.date}
                    onChange={(e) => setSavingData({ ...savingData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={savingData.narration}
                  onChange={(e) => setSavingData({ ...savingData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PiggyBank className="w-4 h-4" />}
                  <span>बचत कारोबार प्रविष्टि गर्नुहोस् (Post Saving Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 3: LOAN DISBURSEMENT / REPAYMENT */}
          {/* ========================================================= */}
          {activeTab === "loan" && (
            <form onSubmit={handleLoanSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-amber-900">
                    <BadgeDollarSign className="w-4 h-4 text-amber-600" />
                    <span>ऋण लगानी तथा असुली (११० + १६०.३) दोहोरो प्रविष्टि नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>ऋण प्रवाह (Disbursement):</strong> सम्पत्ति ११० ऋण लगानीमा Dr (+) र सम्पत्ति नगद/बैंक मा Cr (-)<br />
                    <strong>किस्ता असुली (Repayment):</strong> साँवा रकमले ऋण लगानी ११० मा Cr (-), ब्याज आम्दानी १६०.३ मा Cr (+), र कुल रकमले नगद/बैंक मा Dr (+)
                  </p>
                </div>
                <span className="bg-amber-200/60 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 9 + Sheet 2 + Sheet 5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">सदस्य ऋणी छनोट (Borrower Member) *</label>
                  <select
                    required
                    value={loanData.memberId}
                    onChange={(e) => setLoanData({ ...loanData, memberId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    {members.map((m) => (
                      <option key={m.memberId} value={m.memberId}>
                        {m.memberId} — {m.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कर्जा शीर्षक (Loan Category) *</label>
                  <select
                    value={loanData.loanCategory}
                    onChange={(e) => setLoanData({ ...loanData, loanCategory: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="110.1 कृषि कर्जा">110.1 कृषि तथा पशुपालन कर्जा (12%)</option>
                    <option value="110.2 व्यापार कर्जा">110.2 लघु व्यापार तथा व्यवसाय कर्जा (13.5%)</option>
                    <option value="110.3 घरजग्गा कर्जा">110.3 आवास तथा घर निर्माण कर्जा (14%)</option>
                    <option value="110.4 शैक्षिक कर्जा">110.4 शैक्षिक तथा वैदेशिक रोजगार (11%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Transaction Type) *</label>
                  <select
                    value={loanData.type}
                    onChange={(e) => {
                      const t = e.target.value as "DISBURSEMENT" | "REPAYMENT";
                      setLoanData({
                        ...loanData,
                        type: t,
                        narration: t === "DISBURSEMENT" ? "स्वीकृत कृषि कर्जा प्रवाह भुक्तानी" : "ऋण मासिक किस्ता साँवा तथा ब्याज असुली",
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="REPAYMENT">ऋण किस्ता असुली (Repayment - साँवा + ब्याज)</option>
                    <option value="DISBURSEMENT">नयाँ ऋण प्रवाह / लगानी (Disbursement - Dr +)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {loanData.type === "DISBURSEMENT" ? "प्रवाह गरिएको साँवा रु. *" : "साँवा भुक्तानी रु. (Principal) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={loanData.principalAmount}
                    onChange={(e) => setLoanData({ ...loanData, principalAmount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-900"
                  />
                </div>

                {loanData.type === "REPAYMENT" && (
                  <div>
                    <label className="block font-bold text-amber-800 mb-1">ब्याज असुली आम्दानी रु. (Interest 160.3)</label>
                    <input
                      type="number"
                      min="0"
                      value={loanData.interestAmount}
                      onChange={(e) => setLoanData({ ...loanData, interestAmount: e.target.value })}
                      className="w-full p-2.5 bg-amber-50/60 border border-amber-300 rounded-lg font-mono font-bold text-amber-900"
                    />
                    <span className="text-[10px] text-amber-700 mt-0.5 block">
                      कुल नगद प्रवाह = रु. {(Number(loanData.principalAmount || 0) + Number(loanData.interestAmount || 0)).toLocaleString()}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Payment Mode) *</label>
                  <select
                    value={loanData.paymentMode}
                    onChange={(e) => setLoanData({ ...loanData, paymentMode: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="CASH">नगद काउन्टर (Cash - Hisab 80)</option>
                    <option value="BANK">बैंक खाता (Bank - Hisab 90)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={loanData.date}
                    onChange={(e) => setLoanData({ ...loanData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">धितो विवरण (Collateral / Security)</label>
                  <input
                    type="text"
                    value={loanData.collateral}
                    onChange={(e) => setLoanData({ ...loanData, collateral: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={loanData.narration}
                  onChange={(e) => setLoanData({ ...loanData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-amber-700 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BadgeDollarSign className="w-4 h-4" />}
                  <span>कर्जा कारोबार प्रविष्टि गर्नुहोस् (Post Loan Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 4: BANK RECONCILIATION & TRANSFERS */}
          {/* ========================================================= */}
          {activeTab === "bank" && (
            <form onSubmit={handleBankSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-sky-900">
                    <Landmark className="w-4 h-4 text-sky-600" />
                    <span>बैंक हिसाब मिलान तथा ट्रान्सफर (Bank Contra & Reconciliation) नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>नगद बैंक दाखिला:</strong> बैंक ९० Dr (+) र नगद ८० Cr (-)<br />
                    <strong>बैंकबाट नगद झिकिएको:</strong> नगद ८० Dr (+) र बैंक ९० Cr (-)<br />
                    <strong>बैंक शुल्क / कमिसन:</strong> विविध खर्च १५०.१६ मा Dr (+) र बैंक ९० मा Cr (-)<br />
                    <strong>बैंक खाता ब्याज आम्दानी:</strong> बैंक ९० मा Dr (+) र लगानी ब्याज आम्दानी १६०.२ मा Cr (+)
                  </p>
                </div>
                <span className="bg-sky-200/60 text-sky-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 2 (80 ⇄ 90) + Sheet 4/5
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Bank Transaction Type) *</label>
                  <select
                    value={bankData.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      let narr = "";
                      if (t === "CASH_TO_BANK") narr = "नगद संकलन रकम बैंक खातामा दाखिला (Cash Deposited)";
                      else if (t === "BANK_TO_CASH") narr = "संस्थाको नगद काउन्टर प्रयोजनार्थ बैंकबाट झिकिएको (Cash Withdrawn)";
                      else if (t === "BANK_CHARGES") narr = "बैंक स्टेटमेन्ट अनुसार खाता व्यवस्थापन तथा एसएमएस शुल्क कट्टी";
                      else if (t === "BANK_INTEREST") narr = "बैंक बचत खातामा अर्धवार्षिक/त्रैमासिक ब्याज रकम दाखिला";
                      else narr = "बैंक हिसाब मिलान स्टेटमेन्ट समायोजन भौचर";
                      setBankData({ ...bankData, type: t, narration: narr });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="CASH_TO_BANK">नगद बैंकमा दाखिला (Cash Deposit to Bank - Contra)</option>
                    <option value="BANK_TO_CASH">बैंकबाट नगद झिकिएको (Cash Withdrawn from Bank - Contra)</option>
                    <option value="BANK_CHARGES">बैंक सेवा शुल्क / कमिसन कट्टी (Bank Charges Exp 150.16)</option>
                    <option value="BANK_INTEREST">बैंक ब्याज आम्दानी प्राप्त (Bank Interest Income 160.2)</option>
                    <option value="RECON_ADJUSTMENT">बैंक हिसाब मिलान समायोजन (Reconciliation Adjustment)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">बैंक तथा खाता विवरण (Bank Account) *</label>
                  <input
                    type="text"
                    required
                    value={bankData.bankName}
                    onChange={(e) => setBankData({ ...bankData, bankName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">चेक नं. / कारोबार भौचर नं. (Cheque / Ref No.)</label>
                  <input
                    type="text"
                    value={bankData.chequeNo}
                    onChange={(e) => setBankData({ ...bankData, chequeNo: e.target.value })}
                    placeholder="CHQ-123456 वा स्लिप नं."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार रकम रु. (Amount NPR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bankData.amount}
                    onChange={(e) => setBankData({ ...bankData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-sky-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={bankData.date}
                    onChange={(e) => setBankData({ ...bankData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={bankData.narration}
                  onChange={(e) => setBankData({ ...bankData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-sky-800 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                  <span>बैंक कारोबार प्रविष्टि गर्नुहोस् (Post Bank Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 5: FIXED ASSETS & DEPRECIATION */}
          {/* ========================================================= */}
          {activeTab === "assets" && (
            <form onSubmit={handleAssetSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-indigo-900">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>स्थिर सम्पत्ति (१३०) तथा ह्रासकट्टी (१५०.१३) लेखांकन नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>सम्पत्ति खरिद (Asset Purchase):</strong> सम्पत्ति १३० स्थिर सम्पत्तिमा Dr (+) र भुक्तानी नगद/बैंक मा Cr (-)<br />
                    <strong>ह्रासकट्टी (Depreciation Expense):</strong> खर्च १५०.१३ ह्रासकट्टी खर्चमा Dr (+) र सम्पत्ति १३० मा Cr (-) ले कुल सम्पत्ति मौज्दात घट्ने
                  </p>
                </div>
                <span className="bg-indigo-200/60 text-indigo-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 2 (130) + Sheet 4 (150.13)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Entry Type) *</label>
                  <select
                    value={assetData.type}
                    onChange={(e) => {
                      const t = e.target.value as "PURCHASE" | "DEPRECIATION";
                      setAssetData({
                        ...assetData,
                        type: t,
                        narration: t === "PURCHASE"
                          ? `${assetData.assetName} खरिद तथा स्थिर सम्पत्ति दाखिला`
                          : `${assetData.assetName} वार्षिक ह्रासकट्टी खर्च कट्टी`,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="PURCHASE">नयाँ स्थिर सम्पत्ति खरिद (Fixed Asset Purchase - Dr +)</option>
                    <option value="DEPRECIATION">ह्रासकट्टी खर्च लेखांकन (Depreciation Expense - 150.13 Dr / 130 Cr)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">सम्पत्ति वर्ग (Asset Classification) *</label>
                  <select
                    value={assetData.assetCategory}
                    onChange={(e) => setAssetData({ ...assetData, assetCategory: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="130.1 जग्गा तथा भवन">130.1 जग्गा तथा भवन (Land & Building - 5%)</option>
                    <option value="130.2 सवारी साधन">130.2 सवारी साधन (Vehicles - 20%)</option>
                    <option value="130.3 फर्निचर तथा फिक्चर्स">130.3 फर्निचर तथा फिक्चर्स (Furniture - 25%)</option>
                    <option value="130.4 उपकरण तथा कम्प्युटर">130.4 कार्यालय उपकरण तथा कम्प्युटर (IT - 25%)</option>
                    <option value="130.5 अन्य स्थिर सम्पत्ति">130.5 अन्य स्थिर सम्पत्ति (Other Assets - 15%)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">सम्पत्तिको नाम तथा विवरण (Asset Name) *</label>
                  <input
                    type="text"
                    required
                    value={assetData.assetName}
                    onChange={(e) => setAssetData({ ...assetData, assetName: e.target.value })}
                    placeholder="e.g. कम्प्युटर, फर्निचर, भवन, सवारी"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {assetData.type === "PURCHASE" ? "खरिद लागत रकम रु. (Purchase Cost) *" : "ह्रासकट्टी रकम रु. (Depreciation Amount) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={assetData.amount}
                    onChange={(e) => setAssetData({ ...assetData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-indigo-800 text-sm"
                  />
                </div>

                {assetData.type === "PURCHASE" ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Payment Mode) *</label>
                    <select
                      value={assetData.paymentMode}
                      onChange={(e) => setAssetData({ ...assetData, paymentMode: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                    >
                      <option value="BANK">बैंक खाता (Bank - Hisab 90)</option>
                      <option value="CASH">नगद काउन्टर (Cash - Hisab 80)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ह्रासकट्टी दर (Depreciation Rate %)</label>
                    <input
                      type="text"
                      value={assetData.depreciationRate}
                      onChange={(e) => setAssetData({ ...assetData, depreciationRate: e.target.value })}
                      placeholder="e.g. 0.25 (25%)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={assetData.date}
                    onChange={(e) => setAssetData({ ...assetData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={assetData.narration}
                  onChange={(e) => setAssetData({ ...assetData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-indigo-800 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Building className="w-4 h-4" />}
                  <span>सम्पत्ति कारोबार प्रविष्टि गर्नुहोस् (Post Asset Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 6: ANUDAN (GRANTS) ENTRY */}
          {/* ========================================================= */}
          {activeTab === "anudan" && (
            <form onSubmit={handleAnudanSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-purple-900">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span>सरकारी तथा संस्थागत अनुदान (Anudan) दोहोरो प्रविष्टि नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>पुँजीगत / विकास अनुदान (Capital Grant):</strong> दायित्व ५० अनुदान हिसाबमा Cr (+) र बैंक/नगद मा Dr (+)<br />
                    <strong>चालू / प्रशासनिक अनुदान (Operational Grant):</strong> आम्दानी १६०.१० सरकारी/संस्थागत अनुदानमा Cr (+) र बैंक/नगद मा Dr (+)
                  </p>
                </div>
                <span className="bg-purple-200/60 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 3 (50) / Sheet 5 (160.10)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">अनुदान प्रकृति (Grant Nature) *</label>
                  <select
                    value={anudanData.type}
                    onChange={(e) => {
                      const t = e.target.value as "CAPITAL_GRANT" | "OPERATIONAL_GRANT";
                      setAnudanData({
                        ...anudanData,
                        type: t,
                        narration: t === "CAPITAL_GRANT"
                          ? "संस्थागत विकास तथा संरचना निर्माण बापत पुँजीगत अनुदान हिसाब ५० मा दाखिला"
                          : "कार्यक्रम सञ्चालन तथा तालिम बापत चालू अनुदान आम्दानी १६०.१० मा दाखिला",
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="CAPITAL_GRANT">पुँजीगत अनुदान (Capital Grant - Liability Hisab 50 Cr +)</option>
                    <option value="OPERATIONAL_GRANT">चालू अनुदान आम्दानी (Operational Grant - Income 160.10 Cr +)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">अनुदान रकम रु. (Grant Amount NPR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={anudanData.amount}
                    onChange={(e) => setAnudanData({ ...anudanData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-purple-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">अनुदान दिने निकाय / मन्त्रालय (Donor Agency) *</label>
                  <input
                    type="text"
                    required
                    value={anudanData.donorAgency}
                    onChange={(e) => setAnudanData({ ...anudanData, donorAgency: e.target.value })}
                    placeholder="e.g. नेपाल सरकार कृषि मन्त्रालय, नगरपालिका"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">आयोजना / कार्यक्रमको नाम (Project / Program) *</label>
                  <input
                    type="text"
                    required
                    value={anudanData.projectName}
                    onChange={(e) => setAnudanData({ ...anudanData, projectName: e.target.value })}
                    placeholder="e.g. शीतभण्डार निर्माण, बीउबिजन वितरण"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">रकम दाखिला माध्यम (Payment Mode) *</label>
                  <select
                    value={anudanData.paymentMode}
                    onChange={(e) => setAnudanData({ ...anudanData, paymentMode: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="BANK">बैंक खाता (Bank - Hisab 90 Dr +)</option>
                    <option value="CASH">नगद काउन्टर (Cash - Hisab 80 Dr +)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={anudanData.date}
                    onChange={(e) => setAnudanData({ ...anudanData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={anudanData.narration}
                  onChange={(e) => setAnudanData({ ...anudanData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
                  <span>अनुदान कारोबार प्रविष्टि गर्नुहोस् (Post Anudan Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 7: INVESTMENT (HISAB 100) */}
          {/* ========================================================= */}
          {activeTab === "investment" && (
            <form onSubmit={handleInvestmentSubmit} className="max-w-4xl mx-auto space-y-5 text-xs">
              <div className="bg-teal-50/70 p-4 rounded-xl border border-teal-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2 font-bold text-teal-900">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    <span>लगानी हिसाब (१००) तथा प्रतिफल दोहोरो प्रविष्टि नियम:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>नयाँ लगानी (New Investment):</strong> सम्पत्ति १०० लगानी हिसाबमा Dr (+) र बैंक/नगद मा Cr (-)<br />
                    <strong>सावाँ फिर्ता (Return / Maturity):</strong> बैंक/नगद मा Dr (+) र सम्पत्ति १०० लगानी हिसाबमा Cr (-)<br />
                    <strong>लाभांश/ब्याज आम्दानी (Dividend/Interest):</strong> बैंक/नगद मा Dr (+) र आम्दानी १६०.२ लगानी ब्याजमा Cr (+)
                  </p>
                </div>
                <span className="bg-teal-200/60 text-teal-900 text-[10px] font-bold px-2 py-0.5 rounded">
                  Sheet 2 (100) + Sheet 5 (160.2)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार प्रकार (Transaction Type) *</label>
                  <select
                    value={investmentData.type}
                    onChange={(e) => {
                      const t = e.target.value as any;
                      let narr = "";
                      if (t === "NEW_INVESTMENT") narr = `${investmentData.investmentTitle} नयाँ लगानी हिसाब १०० मा प्रविष्टि`;
                      else if (t === "RETURN_MATURITY") narr = `${investmentData.investmentTitle} लगानी सावाँ फिर्ता / परिपक्वता असुली`;
                      else narr = `${investmentData.investmentTitle} लगानीबाट प्राप्त लाभांश तथा ब्याज आम्दानी`;
                      setInvestmentData({ ...investmentData, type: t, narration: narr });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="NEW_INVESTMENT">नयाँ लगानी प्रविष्टि (New Investment - Hisab 100 Dr +)</option>
                    <option value="RETURN_MATURITY">लगानी सावाँ फिर्ता (Maturity Return - Hisab 100 Cr -)</option>
                    <option value="DIVIDEND_INTEREST">लाभांश तथा ब्याज आम्दानी (Dividend/Interest - 160.2 Cr +)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">लगानी शीर्षक (Investment Title) *</label>
                  <input
                    type="text"
                    required
                    value={investmentData.investmentTitle}
                    onChange={(e) => setInvestmentData({ ...investmentData, investmentTitle: e.target.value })}
                    placeholder="e.g. राष्ट्रिय सहकारी बैंक मुद्दती, संघ शेयर"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">लगानी गरिएको संस्था (Entity / Bank)</label>
                  <input
                    type="text"
                    value={investmentData.institutionName}
                    onChange={(e) => setInvestmentData({ ...investmentData, institutionName: e.target.value })}
                    placeholder="e.g. राष्ट्रिय सहकारी बैंक, जिल्ला सहकारी संघ"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">लगानी रकम रु. (Amount NPR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={investmentData.amount}
                    onChange={(e) => setInvestmentData({ ...investmentData, amount: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono font-black text-teal-900 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">भुक्तानी माध्यम (Payment Mode) *</label>
                  <select
                    value={investmentData.paymentMode}
                    onChange={(e) => setInvestmentData({ ...investmentData, paymentMode: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="BANK">बैंक खाता (Bank - Hisab 90)</option>
                    <option value="CASH">नगद काउन्टर (Cash - Hisab 80)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">कारोबार मिति (Date / Miti) *</label>
                  <input
                    type="text"
                    required
                    value={investmentData.date}
                    onChange={(e) => setInvestmentData({ ...investmentData, date: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">कारोबार विवरण / व्यहोरा (Narration) *</label>
                <input
                  type="text"
                  required
                  value={investmentData.narration}
                  onChange={(e) => setInvestmentData({ ...investmentData, narration: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="pt-4 flex justify-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-teal-800 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  <span>लगानी कारोबार प्रविष्टि गर्नुहोस् (Post Investment Entry)</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 8: GENERAL JOURNAL VOUCHER (JE) */}
          {/* ========================================================= */}
          {activeTab === "je" && (
            <form onSubmit={handleJeSubmit} className="max-w-5xl mx-auto space-y-6 text-xs">
              {/* Informational Guidelines Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-[#1F497D] text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-white/10 rounded-xl mt-0.5">
                    <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm">
                        गोश्वारा भौचर (General Journal Voucher — Double-Entry Table)
                      </span>
                      <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                        ४-मूल खाता प्रत्यक्ष प्रविष्टि
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
                      नेपाल सहकारी ४-खाता प्रणाली अनुसार बहु-हरफ (Multi-line) भौचर प्रविष्टि गर्नुहोस्। सम्पत्ति (०४), दायित्व (०५), खर्च (०२) र आम्दानी (०३) का कुनै पनि शीर्षकहरू बीच दोहोरो लेखा प्रविष्टि (Dr = Cr) मान्य हुन्छ।
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <div className="text-[10px] text-slate-300">नियम (Golden Rule)</div>
                    <div className="font-mono font-bold text-amber-300 text-xs">SUM(Dr) === SUM(Cr)</div>
                  </div>
                </div>
              </div>

              {/* Voucher Header Info: Date & Particulars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    कारोबार मिति (Voucher Date B.S.) *
                  </label>
                  <input
                    type="text"
                    required
                    value={jeHeader.date}
                    onChange={(e) => setJeHeader({ ...jeHeader, date: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
                    placeholder="2083-07-10"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    भौचर व्यहोरा / विवरण (Voucher Particulars / Narration) *
                  </label>
                  <input
                    type="text"
                    required
                    value={jeHeader.particulars}
                    onChange={(e) => setJeHeader({ ...jeHeader, particulars: e.target.value })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
                    placeholder="उदा: कर्मचारी तलब भुक्तानी, TDS कट्टा र बैंक मार्फत बाँकी भुक्तानी"
                  />
                </div>
              </div>

              {/* Multi-Line Journal Entry Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-800 text-sm">
                      भौचर हरफहरू (Journal Voucher Lines — Min 2 Rows)
                    </span>
                    <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {jeLines.length} हरफहरू
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddJeLine}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#1F497D] hover:bg-[#183a63] text-white rounded-lg text-xs font-bold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ हरफ थप्नुहोस् (Add Line)</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-3 px-3 w-10 text-center">#</th>
                        <th className="py-3 px-3 min-w-[260px]">लेखा शीर्षक (Account Head)</th>
                        <th className="py-3 px-3 min-w-[240px]">सदस्य / उप-योजना (Member & Sub-Scheme)</th>
                        <th className="py-3 px-3 min-w-[140px] text-right">डेबिट Dr. (NPR)</th>
                        <th className="py-3 px-3 min-w-[140px] text-right">क्रेडिट Cr. (NPR)</th>
                        <th className="py-3 px-2 w-12 text-center">हटाउनु</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jeLines.map((line, idx) => {
                        const meta = findAccountMeta(line.accountCode);
                        const isMemberReq = meta?.requiresMember;
                        const isExp = meta?.isExpense;
                        const isInc = meta?.isIncome;

                        return (
                          <tr key={line.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Line Number */}
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* Account Selector */}
                            <td className="py-2.5 px-3">
                              <select
                                value={line.accountCode}
                                onChange={(e) => handleUpdateJeLine(idx, "accountCode", e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-800 text-xs focus:ring-2 focus:ring-[#1F497D] focus:border-transparent"
                              >
                                {MASTER_ACCOUNTS.map((group) => (
                                  <optgroup key={group.group} label={group.group}>
                                    {group.items.map((item) => (
                                      <option key={item.code} value={item.code}>
                                        {item.name}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </td>

                            {/* Member Selector / Sub-Type Selector */}
                            <td className="py-2.5 px-3">
                              {isMemberReq ? (
                                <div className="space-y-1.5">
                                  <select
                                    required
                                    value={line.memberId}
                                    onChange={(e) => handleUpdateJeLine(idx, "memberId", e.target.value)}
                                    className="w-full p-1.5 bg-amber-50/60 border border-amber-300 text-amber-950 rounded-lg font-medium text-xs focus:ring-1 focus:ring-amber-500"
                                  >
                                    <option value="">-- सदस्य छनोट गर्नुहोस् * --</option>
                                    {members.map((m) => (
                                      <option key={m.memberId} value={m.memberId}>
                                        {m.memberId} — {m.fullName}
                                      </option>
                                    ))}
                                  </select>

                                  {meta?.subTypes && meta.subTypes.length > 0 && (
                                    <select
                                      value={line.subType}
                                      onChange={(e) => handleUpdateJeLine(idx, "subType", e.target.value)}
                                      className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700"
                                    >
                                      {meta.subTypes.map((sub: { code: string; label: string }) => (
                                        <option key={sub.code} value={sub.code}>
                                          {sub.label}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded text-[11px] font-medium border border-slate-200">
                                  N/A (संस्थागत / साधारण खाता)
                                </span>
                              )}
                            </td>

                            {/* Debit Input */}
                            <td className="py-2.5 px-3 text-right">
                              {isInc ? (
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled
                                    value="0"
                                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-400 text-right cursor-not-allowed"
                                    title="आम्दानी खातामा क्रेडिट मात्र हुन्छ"
                                  />
                                  <span className="text-[10px] text-slate-400 block text-right">Cr मात्र हुने</span>
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.drAmount}
                                  onChange={(e) => handleUpdateJeLine(idx, "drAmount", e.target.value)}
                                  className={`w-full p-2 bg-white border rounded-lg font-mono font-black text-right text-sm ${
                                    parseFloat(line.drAmount) > 0
                                      ? "border-[#1F497D] text-[#1F497D] bg-blue-50/20"
                                      : "border-slate-300 text-slate-600"
                                  }`}
                                  placeholder="0.00"
                                />
                              )}
                            </td>

                            {/* Credit Input */}
                            <td className="py-2.5 px-3 text-right">
                              {isExp ? (
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled
                                    value="0"
                                    className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-slate-400 text-right cursor-not-allowed"
                                    title="खर्च खातामा डेबिट मात्र हुन्छ"
                                  />
                                  <span className="text-[10px] text-slate-400 block text-right">Dr मात्र हुने</span>
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={line.crAmount}
                                  onChange={(e) => handleUpdateJeLine(idx, "crAmount", e.target.value)}
                                  className={`w-full p-2 bg-white border rounded-lg font-mono font-black text-right text-sm ${
                                    parseFloat(line.crAmount) > 0
                                      ? "border-emerald-600 text-emerald-700 bg-emerald-50/20"
                                      : "border-slate-300 text-slate-600"
                                  }`}
                                  placeholder="0.00"
                                />
                              )}
                            </td>

                            {/* Remove Row */}
                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                disabled={jeLines.length <= 2}
                                onClick={() => handleRemoveJeLine(idx)}
                                title={jeLines.length <= 2 ? "कम्तीमा २ हरफ अनिवार्य छ" : "यो हरफ हटाउनुहोस्"}
                                className={`p-2 rounded-lg transition ${
                                  jeLines.length <= 2
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                }`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer with Live Balances & Golden Rule Badge */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleAddJeLine}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>थप हरफ (Add Another Row)</span>
                    </button>

                    {isJeBalanced ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs border border-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>✅ सन्तुलित छ (BALANCED VOUCHER)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-800 font-extrabold text-xs border border-rose-300 animate-pulse">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>⚠️ असन्तुलित (UNBALANCED: फरक रु. {jeDifference.toLocaleString()})</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-6 text-xs font-mono">
                    <div className="text-right">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-bold">
                        कुल डेबिट (Total Dr)
                      </div>
                      <div className="font-black text-sm text-[#1F497D]">
                        रु. {jeTotalDr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-bold">
                        कुल क्रेडिट (Total Cr)
                      </div>
                      <div className="font-black text-sm text-emerald-700">
                        रु. {jeTotalCr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-300">
                      <div className="text-slate-500 text-[10px] uppercase font-sans font-bold">
                        फरक (Difference)
                      </div>
                      <div className={`font-black text-sm ${jeDifference === 0 ? "text-slate-700" : "text-rose-600"}`}>
                        रु. {jeDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  type="submit"
                  disabled={loading || !isJeBalanced}
                  className={`w-full sm:w-auto px-8 py-3.5 font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 ${
                    isJeBalanced && !loading
                      ? "bg-[#1F497D] hover:bg-[#183a63] text-white cursor-pointer"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed shadow-none"
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>गोश्वारा भौचर दर्ता गर्नुहोस् (Post Journal Voucher)</span>
                </button>

                {!isJeBalanced && (
                  <span className="text-[11px] text-rose-600 font-medium">
                    * भौचर सुरक्षित गर्न कुल डेबिट र कुल क्रेडिट रकम बराबर हुनुपर्दछ (फरक: रु. {jeDifference.toLocaleString()})।
                  </span>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
