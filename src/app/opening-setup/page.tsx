"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Users,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  RotateCcw,
  Printer,
  ChevronRight,
  ChevronLeft,
  Save,
  ShieldCheck,
  Scale,
  FileCheck2,
  Plus,
  Trash2,
  HelpCircle,
  Coins,
  Edit2,
  Search,
  Tag,
  Filter,
  ShieldAlert,
  ArrowRight,
  Check,
  X,
  TrendingUp,
  Wallet,
} from "lucide-react";
import ResetTransactionsModal from "@/components/ResetTransactionsModal";

// Helper to format large amounts into Nepali words (Lakh / Crore)
function formatNprWords(amt: number): string {
  if (!amt || isNaN(amt) || amt === 0) return "";
  const abs = Math.abs(amt);
  if (abs >= 10000000) {
    const cr = (abs / 10000000).toFixed(2).replace(/\.00$/, "");
    return `${cr} करोड (${cr} Cr)`;
  }
  if (abs >= 100000) {
    const lk = (abs / 100000).toFixed(2).replace(/\.00$/, "");
    return `${lk} लाख (${lk} Lakh)`;
  }
  if (abs >= 1000) {
    const th = (abs / 1000).toFixed(1).replace(/\.0$/, "");
    return `${th} हजार (${th} K)`;
  }
  return `रु. ${abs.toLocaleString()}`;
}

export default function OpeningSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [posting, setPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Core State from API
  const [setupStatus, setSetupStatus] = useState<string>("NotStarted");
  const [draft, setDraft] = useState<any>({
    scenario: "A_FY_START",
    goLiveDateBs: "२०८३/०४/०१",
    goLiveDateAd: "2026-07-16",
    fiscalYear: "२०८३/८४",
    profile: { nameNep: "", regNo: "", panNo: "", address: "" },
    ledgers: [],
    suspenseReason: "",
    cashBankConfirmed: false,
    cashBankConfirmedDate: "",
    cashBankConfirmedUser: "",
    ytdIncomeExpenses: { income: [], expenses: [] },
  });
  const [scorecard, setScorecard] = useState<any>(null);
  const [activeBatch, setActiveBatch] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);

  // Modals & UI Toggles
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackReason, setRollbackReason] = useState("");
  const [showResetTxnModal, setShowResetTxnModal] = useState(false);
  const [filterErrorOnly, setFilterErrorOnly] = useState(false);
  const [batchViewTab, setBatchViewTab] = useState<"ALL" | "SHARES" | "SAVINGS" | "LOANS">("ALL");
  const [showSingleMemberModal, setShowSingleMemberModal] = useState(false);
  const [newMember, setNewMember] = useState({
    memberId: "",
    nameNep: "",
    phone: "",
    citizenshipNo: "",
    shareAmount: 10000,
    savingsAmount: 50000,
    loanAmount: 0,
  });

  // Aggregate member-wise opening balances for line-by-line display
  const memberBalancesMap = useMemo(() => {
    if (!activeBatch?.data) return new Map<string, { share: number; savings: number; loan: number }>();
    const map = new Map<string, { share: number; savings: number; loan: number }>();

    // 1. Shares (Hisab 10)
    (activeBatch.data.shares || []).forEach((s: any) => {
      const mId = String(s.memberId || "").trim();
      if (!mId) return;
      const current = map.get(mId) || { share: 0, savings: 0, loan: 0 };
      current.share += Number(s.shareAmount) || 0;
      map.set(mId, current);
    });

    // 2. Savings (Hisab 30)
    (activeBatch.data.savings || []).forEach((b: any) => {
      const mId = String(b.memberId || "").trim();
      if (!mId) return;
      const current = map.get(mId) || { share: 0, savings: 0, loan: 0 };
      current.savings += Number(b.balance) || 0;
      map.set(mId, current);
    });

    // 3. Loans (Hisab 110)
    (activeBatch.data.loans || []).forEach((l: any) => {
      const mId = String(l.memberId || "").trim();
      if (!mId) return;
      const current = map.get(mId) || { share: 0, savings: 0, loan: 0 };
      current.loan += Number(l.principalOutstanding) || 0;
      map.set(mId, current);
    });

    return map;
  }, [activeBatch]);

  // Custom Chart of Accounts (COA) Head Management State
  const [showAddCoaModal, setShowAddCoaModal] = useState(false);
  const [editingCoa, setEditingCoa] = useState<any>(null);
  const [coaSearchQuery, setCoaSearchQuery] = useState("");
  const [coaCategoryFilter, setCoaCategoryFilter] = useState("ALL");
  const [coaForm, setCoaForm] = useState({
    code: "",
    nameNep: "",
    nameEng: "",
    category: "ASSET",
    normalBalance: "DR",
    openingAmount: 0,
    notes: "",
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/opening-setup");
      const data = await res.json();
      if (data.success) {
        setSetupStatus(data.status);
        if (data.draft) setDraft(data.draft);
        if (data.scorecard) setScorecard(data.scorecard);
        if (data.activeBatch) setActiveBatch(data.activeBatch);
        if (data.batches) setBatches(data.batches);
      }
    } catch (err) {
      console.error("Failed to load opening setup data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetupData();
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === "ADMIN";

  const handleSaveDraft = async (stepToSave?: number) => {
    if (!isAdmin) {
      alert("प्रारम्भिक मौज्दात सेट-अप परिमार्जन गर्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ।");
      return;
    }
    try {
      setSavingDraft(true);
      const res = await fetch("/api/opening-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          draft: { ...draft, step: stepToSave || currentStep },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft(data.draft);
        // Refresh scorecard
        const scRes = await fetch("/api/opening-setup");
        const scData = await scRes.json();
        if (scData.scorecard) setScorecard(scData.scorecard);
      }
    } catch (err: any) {
      alert("ड्राफ्ट सुरक्षित गर्दा समस्या आयो: " + err.message);
    } finally {
      setSavingDraft(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      alert("फाइल अपलोड गर्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ।");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setIsUploading(true);
      const res = await fetch("/api/opening-setup", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setActiveBatch(data.batch);
        loadSetupData();
      } else {
        alert("त्रुटि: " + data.error);
      }
    } catch (err: any) {
      alert("अपलोड असफल भयो: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCommitSetup = async () => {
    if (!isAdmin) {
      alert("प्रारम्भिक मौज्दात पोस्ट तथा लक गर्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ।");
      return;
    }
    if (!confirm("के तपाईं प्रारम्भिक मौज्दात आधिकारिक रूपमा पोस्ट तथा लक गर्न निश्चित हुनुहुन्छ? यो कार्यले नयाँ आर्थिक वर्षको हिसाब सुरु गर्नेछ।")) {
      return;
    }

    try {
      setPosting(true);
      const res = await fetch("/api/opening-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMMIT_SETUP" }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        loadSetupData();
        setCurrentStep(6);
      } else {
        alert("पोस्ट असफल भयो: " + data.error);
      }
    } catch (err: any) {
      alert("समस्या आयो: " + err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleRollbackSetup = async () => {
    if (!isAdmin) {
      alert("प्रारम्भिक मौज्दात पुनः खोल्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र उपलब्ध छ।");
      return;
    }
    if (!rollbackReason || rollbackReason.trim().length < 10) {
      alert("कृपया कम्तिमा १० अक्षरको आधिकारिक कारण उल्लेख गर्नुहोस्।");
      return;
    }

    try {
      const res = await fetch("/api/opening-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ROLLBACK_SETUP", reason: rollbackReason }),
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        setShowRollbackModal(false);
        setRollbackReason("");
        loadSetupData();
      } else {
        alert("रोलब्याक असफल: " + data.error);
      }
    } catch (err: any) {
      alert("समस्या आयो: " + err.message);
    }
  };

  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const updateLedgerAmount = (code: string, field: "dr" | "cr", val: number) => {
    const otherField = field === "dr" ? "cr" : "dr";
    const newLedgers = draft.ledgers.map((l: any) => {
      if (l.code === code) {
        return {
          ...l,
          [field]: val,
          ...(val > 0 ? { [otherField]: 0 } : {}),
        };
      }
      return l;
    });
    setDraft({ ...draft, ledgers: newLedgers });
  };

  const allocateDiffToSuspense = () => {
    const totalDr = draft.ledgers?.reduce((s: number, l: any) => s + (Number(l.dr) || 0), 0) || 0;
    const totalCr = draft.ledgers?.reduce((s: number, l: any) => s + (Number(l.cr) || 0), 0) || 0;
    const diff = Math.round((totalDr - totalCr) * 100) / 100;
    if (Math.abs(diff) < 1) {
      alert("डेबिट र क्रेडिट पहिले नै सन्तुलित छ!");
      return;
    }

    const newLedgers = draft.ledgers.map((l: any) => {
      if (l.code === "999.1") {
        if (diff > 0) {
          // Dr is more than Cr, put into Cr
          return { ...l, cr: Math.abs(diff), dr: 0 };
        } else {
          // Cr is more than Dr, put into Dr
          return { ...l, dr: Math.abs(diff), cr: 0 };
        }
      }
      return l;
    });

    setDraft({
      ...draft,
      ledgers: newLedgers,
      suspenseReason: `प्रारम्भिक मौज्दात फरक रु. ${Math.abs(diff).toLocaleString()} सस्पेन्स खातामा अस्थायी रूपमा समायोजन गरिएको।`,
    });
    alert(`रु. ${Math.abs(diff).toLocaleString()} सस्पेन्स खाता (999.1) मा सारियो। अब सन्तुलन परीक्षण बराबर भयो।`);
  };

  const handleOpenAddCoa = (itemToEdit?: any) => {
    if (itemToEdit) {
      setEditingCoa(itemToEdit);
      setCoaForm({
        code: itemToEdit.code,
        nameNep: itemToEdit.nameNep,
        nameEng: itemToEdit.nameEng || "",
        category: itemToEdit.category,
        normalBalance: itemToEdit.dr > 0 ? "DR" : itemToEdit.cr > 0 ? "CR" : "DR",
        openingAmount: itemToEdit.dr || itemToEdit.cr || 0,
        notes: itemToEdit.notes || "",
      });
    } else {
      setEditingCoa(null);
      setCoaForm({
        code: "",
        nameNep: "",
        nameEng: "",
        category: "ASSET",
        normalBalance: "DR",
        openingAmount: 0,
        notes: "",
      });
    }
    setShowAddCoaModal(true);
  };

  const handleSaveCoa = async () => {
    if (!coaForm.code.trim()) {
      alert("कृपया हिसाब नं. / खाता कोड (Account Code) अनिवार्य रूपमा प्रविष्टि गर्नुहोस्।");
      return;
    }
    if (!coaForm.nameNep.trim()) {
      alert("कृपया खाताको नाम (नेपालीमा) अनिवार्य रूपमा प्रविष्टि गर्नुहोस्।");
      return;
    }

    const existingIdx = draft.ledgers.findIndex((l: any) => l.code === coaForm.code.trim());
    if (!editingCoa && existingIdx >= 0) {
      alert(`हिसाब कोड '${coaForm.code.trim()}' पहिले नै दर्ता छ! कृपया फरक कोड राख्नुहोस्।`);
      return;
    }

    let updatedLedgers = [...draft.ledgers];
    const drVal = coaForm.normalBalance === "DR" ? Number(coaForm.openingAmount) || 0 : 0;
    const crVal = coaForm.normalBalance === "CR" ? Number(coaForm.openingAmount) || 0 : 0;

    if (editingCoa) {
      updatedLedgers = updatedLedgers.map((l: any) => {
        if (l.code === editingCoa.code) {
          return {
            ...l,
            code: coaForm.code.trim(),
            nameNep: coaForm.nameNep.trim(),
            nameEng: coaForm.nameEng.trim() || coaForm.nameNep.trim(),
            category: coaForm.category,
            dr: drVal,
            cr: crVal,
            notes: coaForm.notes.trim(),
            isCustom: l.isCustom ?? true,
          };
        }
        return l;
      });
    } else {
      const newCoaItem = {
        code: coaForm.code.trim(),
        nameNep: coaForm.nameNep.trim(),
        nameEng: coaForm.nameEng.trim() || coaForm.nameNep.trim(),
        category: coaForm.category,
        dr: drVal,
        cr: crVal,
        notes: coaForm.notes.trim(),
        isCustom: true,
      };
      updatedLedgers.push(newCoaItem);
    }

    const newDraft = { ...draft, ledgers: updatedLedgers };
    setDraft(newDraft);
    setShowAddCoaModal(false);

    try {
      await fetch("/api/opening-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          draft: newDraft,
        }),
      });
      const scRes = await fetch("/api/opening-setup");
      const scData = await scRes.json();
      if (scData.success && scData.scorecard) {
        setScorecard(scData.scorecard);
      }
    } catch (err) {
      console.error("Draft save error:", err);
    }
  };

  const handleDeleteCoa = async (code: string) => {
    const target = draft.ledgers.find((l: any) => l.code === code);
    if (!confirm(`के तपाईं हिसाब नं. '${code}' (${target?.nameNep || ""}) खाता सूचीबाट हटाउन निश्चित हुनुहुन्छ?`)) {
      return;
    }

    const updatedLedgers = draft.ledgers.filter((l: any) => l.code !== code);
    const newDraft = { ...draft, ledgers: updatedLedgers };
    setDraft(newDraft);

    try {
      await fetch("/api/opening-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SAVE_DRAFT",
          draft: newDraft,
        }),
      });
      const scRes = await fetch("/api/opening-setup");
      const scData = await scRes.json();
      if (scData.success && scData.scorecard) {
        setScorecard(scData.scorecard);
      }
    } catch (err) {
      console.error("Draft save error:", err);
    }
  };

  const steps = [
    { num: 1, titleNep: "संस्था व आर्थिक वर्ष", titleEng: "Profile & FY", icon: Building2 },
    { num: 2, titleNep: "हिसाब सूची", titleEng: "Chart of Accounts", icon: Layers },
    { num: 3, titleNep: "खातागत मौज्दात", titleEng: "Ledger Balances", icon: FileSpreadsheet },
    { num: 4, titleNep: "सदस्य बल्क आयात", titleEng: "Bulk Member Import", icon: Users },
    { num: 5, titleNep: "प्रमाणीकरण व मिलान", titleEng: "Reconciliation", icon: ShieldCheck },
    { num: 6, titleNep: "समीक्षा तथा पोस्ट", titleEng: "Post & Lock", icon: Lock },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#1F497D] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800">प्रारम्भिक मौज्दात प्रणाली लोड हुँदैछ...</h2>
        <p className="text-xs text-slate-500 mt-1">Opening Balance & Go-Live Setup Engine</p>
      </div>
    );
  }

  const isLocked = setupStatus === "Posted-Locked";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#17365D] via-[#1F497D] to-[#2E5B88] text-white py-8 px-4 sm:px-6 lg:px-10 shadow-md">
        <div className="max-w-[1700px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 p-2.5 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-8 h-8 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-black tracking-tight text-white drop-shadow">
                  प्रारम्भिक मौज्दात प्रविष्टि तथा गो-लाइभ सेट-अप
                </h1>
                <span
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                    isLocked
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
                      : "bg-amber-400/20 text-amber-300 border-amber-400/30"
                  }`}
                >
                  {isLocked ? "स्थिति: पोस्ट भई लक (POSTED-LOCKED)" : `स्थिति: ${setupStatus}`}
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1 font-medium max-w-3xl leading-relaxed">
                पहिलो पटक प्रणाली सुरु गर्दा वा म्यानुअल खाता/अन्य सफ्टवेयरबाट सर्दा साविक अन्तिम मौज्दातलाई पहिलो आर्थिक वर्षको सुरुआती मौज्दात (Row 6 OB-001) मा रूपान्तरण गर्ने आधुनिक इन्जिन।
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {isLocked ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
                >
                  <span>मुख्य ड्यासबोर्डमा जानुहोस् (Dashboard)</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                {isAdmin && (
                  <button
                    onClick={() => setShowRollbackModal(true)}
                    className="flex items-center space-x-2 bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>पुनः खोल्नुहोस् (Reopen Setup)</span>
                  </button>
                )}
              </>
            ) : (
              isAdmin && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowResetTxnModal(true)}
                    className="flex items-center space-x-1.5 bg-red-600/80 hover:bg-red-600 text-white border border-red-400/40 text-xs font-bold px-3.5 py-2.5 rounded-xl shadow transition"
                    title="सदस्य KYC सुरक्षित राख्दै पुराना कारोबार र भौचरहरू खाली गर्नुहोस्"
                  >
                    <Trash2 className="w-4 h-4 text-amber-300" />
                    <span>कारोबार रिसेट (Reset)</span>
                  </button>

                  <button
                    onClick={() => handleSaveDraft()}
                    disabled={savingDraft || isLocked}
                    className="flex items-center space-x-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 text-xs font-bold px-4 py-2.5 rounded-xl shadow transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDraft ? "सुरक्षित हुँदै..." : "ड्राफ्ट सुरक्षित (Save Draft)"}</span>
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Wizard Stepper Tabs */}
        <div className="max-w-[1700px] mx-auto mt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {steps.map((st) => {
              const Icon = st.icon;
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;
              return (
                <button
                  key={st.num}
                  onClick={() => setCurrentStep(st.num)}
                  className={`flex items-center space-x-3 p-3 rounded-xl border text-left transition-all ${
                    isActive
                      ? "bg-white text-[#1F497D] border-amber-400 shadow-md ring-2 ring-amber-400/40"
                      : isPast
                      ? "bg-white/15 text-white border-emerald-400/40 hover:bg-white/20"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                      isActive
                        ? "bg-[#1F497D] text-white"
                        : isPast
                        ? "bg-emerald-500 text-white"
                        : "bg-white/20 text-white"
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : st.num}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate leading-tight">{st.titleNep}</p>
                    <p className="text-[10px] opacity-75 truncate">{st.titleEng}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Wizard Content Area */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-10 mt-8">
        {/* Non-Admin Notice Banner */}
        {!isAdmin && currentUser && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-4 flex items-center justify-between text-amber-900 mb-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-sm font-black">प्रारम्भिक मौज्दात सेट-अप अधिकार: केवल प्रशासक (Admin Only)</h4>
                <p className="text-xs text-amber-800">
                  तपाईं {currentUser.fullName} ({currentUser.role}) हुनुहुन्छ। प्रारम्भिक मौज्दात प्रविष्टि, खाता थपघट वा गो-लाइभ पोस्ट गर्ने अधिकार केवल मुख्य प्रशासकलाई मात्र छ। तपाईं यस विवरणको अवलोकन मात्र गर्न सक्नुहुन्छ।
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold bg-amber-200 text-amber-900 px-3 py-1 rounded-xl shrink-0">
              अवलोकन मोड (View-Only)
            </span>
          </div>
        )}

        {/* Guidance Banner when Setup is Pending */}
        {!isLocked && (
          <div className="bg-gradient-to-r from-[#17365D] to-[#1F497D] text-white rounded-2xl p-4 px-6 flex items-center justify-between mb-6 shadow-md border border-amber-400/40">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />
              <div>
                <h4 className="text-sm font-black text-amber-300">
                  प्रारम्भिक गो-लाइभ अनिवार्य छ (Setup Required Before Dashboard)
                </h4>
                <p className="text-xs text-slate-200 mt-0.5">
                  नयाँ सहकारीको ४-खाता प्रणाली सक्रिय गर्न सर्वप्रथम चरण १ देखि ७ सम्म प्रारम्भिक मौज्दात प्रविष्टि पूरा गरी 'समीक्षा तथा गो-लाइभ पोस्ट' गर्नुहोस्। यो सम्पन्न भएपछि मात्र मुख्य ड्यासबोर्ड सक्रिय हुनेछ।
                </p>
              </div>
            </div>
          </div>
        )}
        {/* STEP 1: Profile & Fiscal Year Scenario */}
        {currentStep === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                <span>चरण १: सहकारी संस्थाको परिचय, आर्थिक वर्ष तथा गो-लाइभ ढाँचा</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                संस्थाको आधारभूत विवरण तथा गो-लाइभ सुरु मिति चयन गर्नुहोस्।
              </p>
            </div>

            {/* Scenario Selection Cards */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                गो-लाइभ परिदृश्य (Go-Live Migration Scenario)*
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setDraft({ ...draft, scenario: "A_FY_START" })}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    draft.scenario === "A_FY_START"
                      ? "border-[#1F497D] bg-blue-50/40 shadow-md ring-1 ring-[#1F497D]"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1F497D] font-bold flex items-center justify-center text-sm">
                      A
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">आर्थिक वर्षको सुरुआत (साउन १ गते)</h4>
                      <p className="text-[11px] text-slate-500">Go-live at Fiscal Year Start (Shrawan 1)</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    अघिल्लो आर्थिक वर्षको लेखापरीक्षण भएको अन्तिम वासलातको मौज्दातलाई यस प्रणालीमा नयाँ वर्षको प्रारम्भिक मौज्दात (Opening Balances B/F) को रूपमा प्रविष्टि गरिन्छ।
                  </p>
                </div>

                <div
                  onClick={() => setDraft({ ...draft, scenario: "B_MID_YEAR" })}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    draft.scenario === "B_MID_YEAR"
                      ? "border-[#1F497D] bg-blue-50/40 shadow-md ring-1 ring-[#1F497D]"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm">
                      B
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">वर्षको बीचमा गो-लाइभ (Mid-Year Go-Live)</h4>
                      <p className="text-[11px] text-slate-500">Cut-off Migration with YTD Balances</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    आर्थिक वर्षको बीचको कुनै निश्चित मिति (जस्तै: पुस १५ वा माघ १) सम्मको सम्पत्ति/दायित्व मौज्दात र वर्ष सुरुदेखि हालसम्मको सञ्चित खर्च र आम्दानी समेत प्रविष्टि गरी वार्षिक हिसाब मिलान गरिन्छ।
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">पहिलो आर्थिक वर्ष (First FY Code)*</label>
                <input
                  type="text"
                  value={draft.fiscalYear}
                  onChange={(e) => setDraft({ ...draft, fiscalYear: e.target.value })}
                  placeholder="२०८३/८४"
                  className="w-full text-xs font-semibold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">गो-लाइभ मिति वि.सं. (BS Date)*</label>
                <input
                  type="text"
                  value={draft.goLiveDateBs}
                  onChange={(e) => setDraft({ ...draft, goLiveDateBs: e.target.value })}
                  placeholder="२०८३/०४/०१"
                  className="w-full text-xs font-semibold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">गो-लाइभ मिति ई.सं. (AD Date)</label>
                <input
                  type="date"
                  value={draft.goLiveDateAd}
                  onChange={(e) => setDraft({ ...draft, goLiveDateAd: e.target.value })}
                  className="w-full text-xs font-semibold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">सहकारी दर्ता नम्बर (Reg. No.)</label>
                <input
                  type="text"
                  value={draft.profile?.regNo || ""}
                  onChange={(e) => setDraft({ ...draft, profile: { ...draft.profile, regNo: e.target.value } })}
                  placeholder="१२३४/०७५/०७६"
                  className="w-full text-xs font-semibold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft(2);
                  setCurrentStep(2);
                }}
                className="flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
              >
                <span>अर्को: हिसाब सूची परीक्षण (Next: Accounts)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Chart of Accounts Check & Custom Accounts Management */}
        {currentStep === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-amber-500" />
                  <span>चरण २: ४-खाता मूल हिसाब सूची तथा खाता व्यवस्थापन (Chart of Accounts)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  सहकारीको आफ्नै हिसाब कोड वा यहाँ नभएको नयाँ खाता थप्न, सम्पादन गर्न र ४-खाता प्रणालीसँग मिलान गर्न सकिन्छ।
                </p>
              </div>
              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  कुल {draft.ledgers?.length || 0} खाताहरू ({draft.ledgers?.filter((l: any) => l.isCustom)?.length || 0} अनुकूलित/कस्टम)
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenAddCoa()}
                  className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ नयाँ हिसाब नं. थप्नुहोस्</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={coaSearchQuery}
                  onChange={(e) => setCoaSearchQuery(e.target.value)}
                  placeholder="हिसाब नं. वा खाताको नाम खोज्नुहोस् (उदा: ८०, ९०, १०, बैंक, शेयर)..."
                  className="w-full text-xs pl-9 pr-3 py-2 border rounded-xl border-slate-300 bg-white focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1 text-xs no-scrollbar">
                {[
                  { key: "ALL", label: `सबै (${draft.ledgers?.length || 0})` },
                  { key: "ASSET", label: `सम्पत्ति (८०..१४०) (${draft.ledgers?.filter((l: any) => l.category === "ASSET").length || 0})` },
                  { key: "LIABILITY", label: `दायित्व (३०..७०) (${draft.ledgers?.filter((l: any) => l.category === "LIABILITY").length || 0})` },
                  { key: "EQUITY", label: `पुँजी व कोष (१०, २०) (${draft.ledgers?.filter((l: any) => l.category === "EQUITY").length || 0})` },
                  { key: "CUSTOM", label: `कस्टम (${draft.ledgers?.filter((l: any) => l.isCustom).length || 0})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setCoaCategoryFilter(tab.key)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                      coaCategoryFilter === tab.key
                        ? "bg-[#1F497D] text-white shadow-sm"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Heads Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {draft.ledgers
                ?.filter((l: any) => {
                  const matchesSearch =
                    l.code.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
                    l.nameNep.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
                    (l.nameEng && l.nameEng.toLowerCase().includes(coaSearchQuery.toLowerCase()));
                  const matchesCat =
                    coaCategoryFilter === "ALL"
                      ? true
                      : coaCategoryFilter === "CUSTOM"
                      ? l.isCustom
                      : l.category === coaCategoryFilter;
                  return matchesSearch && matchesCat;
                })
                .map((l: any) => (
                  <div
                    key={l.code}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      l.isCustom
                        ? "bg-indigo-50/40 border-indigo-200 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                          {l.code}
                        </span>
                        <div className="flex items-center space-x-1.5">
                          {l.isCustom ? (
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-300">
                              कस्टम खाता
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">
                              मूल ४-खाता
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              l.category === "ASSET"
                                ? "bg-blue-100 text-blue-700"
                                : l.category === "LIABILITY"
                                ? "bg-emerald-100 text-emerald-700"
                                : l.category === "EQUITY"
                                ? "bg-purple-100 text-purple-700"
                                : l.category === "EXPENSE"
                                ? "bg-rose-100 text-rose-700"
                                : l.category === "INCOME"
                                ? "bg-teal-100 text-teal-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {l.category}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <h4 className="text-xs font-bold text-slate-800 leading-snug">{l.nameNep}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{l.nameEng || l.nameNep}</p>
                      </div>

                      {l.notes && <p className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded">{l.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
                      <div className="text-slate-500">
                        मौज्दात:{" "}
                        <span className="font-mono font-bold text-slate-700">
                          {l.dr > 0 ? `Dr रु. ${l.dr.toLocaleString()}` : l.cr > 0 ? `Cr रु. ${l.cr.toLocaleString()}` : "रु. ०"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenAddCoa(l)}
                          title="सम्पादन गर्नुहोस्"
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {l.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCoa(l.code)}
                            title="हटाउनुहोस्"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Empty search state */}
            {draft.ledgers?.filter((l: any) => {
              const matchesSearch =
                l.code.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
                l.nameNep.toLowerCase().includes(coaSearchQuery.toLowerCase());
              const matchesCat =
                coaCategoryFilter === "ALL"
                  ? true
                  : coaCategoryFilter === "CUSTOM"
                  ? l.isCustom
                  : l.category === coaCategoryFilter;
              return matchesSearch && matchesCat;
            }).length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                <p className="text-xs text-slate-500">तपाईंले खोज्नुभएको खाता फेला परेन।</p>
                <button
                  type="button"
                  onClick={() => handleOpenAddCoa()}
                  className="bg-[#1F497D] text-white text-xs font-bold px-4 py-2 rounded-xl shadow inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>नयाँ खाता थप्नुहोस्</span>
                </button>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 text-xs font-bold px-4 py-2 border rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>अघिल्लो चरण</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSaveDraft(3);
                  setCurrentStep(3);
                }}
                className="flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
              >
                <span>अर्को: खातागत मौज्दात प्रविष्टि (Next: Ledgers)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Ledger-wise Opening Balances */}
        {currentStep === 3 && (() => {
          const liveTotalDr = draft.ledgers?.reduce((s: number, l: any) => s + (Number(l.dr) || 0), 0) || 0;
          const liveTotalCr = draft.ledgers?.reduce((s: number, l: any) => s + (Number(l.cr) || 0), 0) || 0;
          const liveDiff = Math.round((liveTotalDr - liveTotalCr) * 100) / 100;
          const isLiveBalanced = Math.abs(liveDiff) < 1;
          const drAccountsCount = draft.ledgers?.filter((l: any) => (l.dr || 0) > 0).length || 0;
          const crAccountsCount = draft.ledgers?.filter((l: any) => (l.cr || 0) > 0).length || 0;
          const activeBalancesCount = draft.ledgers?.filter((l: any) => (l.dr || 0) > 0 || (l.cr || 0) > 0).length || 0;

          const filteredLedgers = draft.ledgers?.filter((l: any) => {
            const matchesSearch =
              !coaSearchQuery.trim() ||
              l.code.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
              l.nameNep.toLowerCase().includes(coaSearchQuery.toLowerCase()) ||
              (l.nameEng && l.nameEng.toLowerCase().includes(coaSearchQuery.toLowerCase()));
            const matchesCat =
              coaCategoryFilter === "ALL"
                ? true
                : coaCategoryFilter === "CUSTOM"
                ? l.isCustom
                : l.category === coaCategoryFilter;
            const matchesActive = showActiveOnly ? (l.dr || 0) > 0 || (l.cr || 0) > 0 : true;
            return matchesSearch && matchesCat && matchesActive;
          }) || [];

          const filteredDrSum = filteredLedgers.reduce((s: number, l: any) => s + (Number(l.dr) || 0), 0);
          const filteredCrSum = filteredLedgers.reduce((s: number, l: any) => s + (Number(l.cr) || 0), 0);

          return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
              {/* Header Title & Quick Actions */}
              <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-500" />
                    <span>चरण ३: मूल खातागत प्रारम्भिक मौज्दात प्रविष्टि (Ledger-wise Opening Balances)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    प्रत्येक खाताको साविक अन्तिम डेबिट (Dr) वा क्रेडिट (Cr) मौज्दात प्रविष्टि गर्नुहोस्।
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAddCoa()}
                    className="flex items-center space-x-1.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नयाँ हिसाब नं. थप्नुहोस्</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveDraft(3)}
                    disabled={savingDraft || isLocked}
                    className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-slate-300 transition"
                  >
                    <Save className="w-4 h-4 text-slate-600" />
                    <span>{savingDraft ? "सुरक्षित हुँदै..." : "ड्राफ्ट सेभ"}</span>
                  </button>

                  {!isLiveBalanced && (
                    <button
                      type="button"
                      onClick={allocateDiffToSuspense}
                      className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition animate-bounce"
                      title="डेबिट-क्रेडिट फरकलाई अस्थायी रूपमा सस्पेन्स खाता (999.1) मा सार्नुहोस्"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>फरक सस्पेन्समा सार्नुहोस्</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Executive KPI Metric Cards (Dr, Cr, Equilibrium, Counts) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Total Dr Card */}
                <div className="p-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/70 to-indigo-50/40 relative overflow-hidden">
                  <div className="flex items-center justify-between text-blue-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">कुल डेबिट मौज्दात (Total Dr)</span>
                    <Coins className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="font-mono text-xl font-black text-blue-900 tracking-tight">
                    रु. {liveTotalDr.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100/80 text-[11px]">
                    <span className="font-bold text-blue-700 truncate">{formatNprWords(liveTotalDr) || "रु. ०"}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {drAccountsCount} खाता
                    </span>
                  </div>
                </div>

                {/* 2. Total Cr Card */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 relative overflow-hidden">
                  <div className="flex items-center justify-between text-emerald-800 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider">कुल क्रेडिट मौज्दात (Total Cr)</span>
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="font-mono text-xl font-black text-emerald-900 tracking-tight">
                    रु. {liveTotalCr.toLocaleString()}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100/80 text-[11px]">
                    <span className="font-bold text-emerald-700 truncate">{formatNprWords(liveTotalCr) || "रु. ०"}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {crAccountsCount} खाता
                    </span>
                  </div>
                </div>

                {/* 3. Equilibrium / Trial Balance Card */}
                <div
                  className={`p-4 rounded-xl border transition relative overflow-hidden ${
                    isLiveBalanced
                      ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50/60"
                      : "border-red-300 bg-gradient-to-br from-red-50 to-amber-50/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider ${
                        isLiveBalanced ? "text-emerald-800" : "text-red-800"
                      }`}
                    >
                      सन्तुलन परीक्षण (Equilibrium)
                    </span>
                    {isLiveBalanced ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                    )}
                  </div>
                  <div
                    className={`font-mono text-xl font-black tracking-tight ${
                      isLiveBalanced ? "text-emerald-900" : "text-red-900"
                    }`}
                  >
                    {isLiveBalanced ? "फरक: रु. ०" : `फरक: रु. ${Math.abs(liveDiff).toLocaleString()}`}
                  </div>
                  <div
                    className={`flex items-center justify-between mt-2 pt-2 border-t text-[11px] ${
                      isLiveBalanced
                        ? "border-emerald-200/80 text-emerald-700"
                        : "border-red-200/80 text-red-700"
                    }`}
                  >
                    <span className="font-bold truncate">
                      {isLiveBalanced ? "✓ डेबिट = क्रेडिट बराबर" : formatNprWords(liveDiff) || "बेमेल मौज्दात"}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        isLiveBalanced ? "bg-emerald-200 text-emerald-900" : "bg-red-200 text-red-900"
                      }`}
                    >
                      {isLiveBalanced ? "सन्तुलित" : "असमन्वित"}
                    </span>
                  </div>
                </div>

                {/* 4. Accounts Overview & Filter Switcher */}
                <div className="p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-slate-700 mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider">मौज्दात भएका खाताहरू</span>
                      <Layers className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="font-mono text-xl font-black text-slate-800 tracking-tight">
                      {activeBalancesCount}{" "}
                      <span className="text-xs font-normal text-slate-500">/ {draft.ledgers?.length || 0} खाता</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowActiveOnly(!showActiveOnly)}
                    className={`mt-2 pt-2 border-t border-slate-200 flex items-center justify-between w-full text-left text-[11px] font-bold transition ${
                      showActiveOnly ? "text-blue-700" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>{showActiveOnly ? "✓ केवल मौज्दात भएका मात्र" : "सबै खाताहरू देखाउनुहोस्"}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                        showActiveOnly ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {showActiveOnly ? "सक्रिय" : "सबै"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter and Search Bar for Step 3 */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={coaSearchQuery}
                    onChange={(e) => setCoaSearchQuery(e.target.value)}
                    placeholder="हिसाब नं. वा खाताको नाम खोज्नुहोस् (उदा: ८०, ९०, १०, बैंक, सेयर)..."
                    className="w-full text-xs pl-9 pr-8 py-2 border rounded-xl border-slate-300 bg-white focus:ring-2 focus:ring-[#1F497D] outline-none"
                  />
                  {coaSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCoaSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1 text-xs no-scrollbar">
                  {[
                    { key: "ALL", label: `सबै (${draft.ledgers?.length || 0})` },
                    { key: "ASSET", label: `सम्पत्ति (${draft.ledgers?.filter((l: any) => l.category === "ASSET").length || 0})` },
                    { key: "LIABILITY", label: `दायित्व (${draft.ledgers?.filter((l: any) => l.category === "LIABILITY").length || 0})` },
                    { key: "EQUITY", label: `पुँजी व कोष (${draft.ledgers?.filter((l: any) => l.category === "EQUITY").length || 0})` },
                    { key: "CUSTOM", label: `कस्टम (${draft.ledgers?.filter((l: any) => l.isCustom).length || 0})` },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setCoaCategoryFilter(tab.key)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                        coaCategoryFilter === tab.key
                          ? "bg-[#1F497D] text-white shadow-sm"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ledger Balances Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#1F497D] text-white font-bold sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="py-3 px-4 w-32">खाता कोड</th>
                        <th className="py-3 px-4">खाताको नाम तथा स्वभाव (Account Head & Nature)</th>
                        <th className="py-3 px-4 w-36">वर्ग (Category)</th>
                        <th className="py-3 px-4 w-44 text-right bg-[#1B3F6B]">
                          <div className="flex items-center justify-end space-x-1">
                            <span>डेबिट मौज्दात रु. (Dr)</span>
                            <span className="text-[10px] bg-blue-500/40 text-blue-100 px-1.5 py-0.2 rounded font-normal">
                              सम्पत्ति/खर्च
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-4 w-44 text-right bg-[#17365D]">
                          <div className="flex items-center justify-end space-x-1">
                            <span>क्रेडिट मौज्दात रु. (Cr)</span>
                            <span className="text-[10px] bg-emerald-500/40 text-emerald-100 px-1.5 py-0.2 rounded font-normal">
                              दायित्व/पुँजी
                            </span>
                          </div>
                        </th>
                        <th className="py-3 px-3 w-16 text-center">कार्य</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedgers.map((l: any) => {
                        const isNormalDr = l.category === "ASSET" || l.category === "EXPENSE";
                        const hasDr = (l.dr || 0) > 0;
                        const hasCr = (l.cr || 0) > 0;

                        return (
                          <tr
                            key={l.code}
                            className={`transition hover:bg-slate-50/90 ${
                              hasDr || hasCr ? "bg-amber-50/20" : ""
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-slate-700">
                              <div className="flex items-center space-x-1.5">
                                <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                                  {l.code}
                                </span>
                                {l.isCustom && (
                                  <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-sans font-bold">
                                    कस्टम
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-800 leading-snug">{l.nameNep}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                    isNormalDr ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {isNormalDr ? "DR स्वभाव" : "CR स्वभाव"}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{l.nameEng}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  l.category === "ASSET"
                                    ? "bg-blue-100 text-blue-800"
                                    : l.category === "LIABILITY"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : l.category === "EQUITY"
                                    ? "bg-purple-100 text-purple-800"
                                    : l.category === "EXPENSE"
                                    ? "bg-rose-100 text-rose-800"
                                    : l.category === "INCOME"
                                    ? "bg-teal-100 text-teal-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {l.category}
                              </span>
                            </td>

                            {/* Debit Input Column with Soft Highlight */}
                            <td className={`py-2 px-4 text-right ${isNormalDr ? "bg-blue-50/20" : ""}`}>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400 select-none">
                                  रु.
                                </span>
                                <input
                                  type="number"
                                  value={l.dr || ""}
                                  disabled={isLocked}
                                  placeholder="०"
                                  onChange={(e) => updateLedgerAmount(l.code, "dr", parseFloat(e.target.value) || 0)}
                                  className={`w-full text-right font-mono font-bold text-xs pl-7 pr-2.5 py-1.5 border rounded-lg outline-none transition ${
                                    hasDr
                                      ? "border-blue-500 bg-blue-50/40 text-blue-900 ring-1 ring-blue-400"
                                      : "border-slate-300 bg-white hover:border-slate-400 focus:ring-2 focus:ring-[#1F497D]"
                                  }`}
                                />
                              </div>
                              {hasDr && (
                                <div className="text-[10px] text-blue-700 font-bold mt-0.5 truncate text-right">
                                  {formatNprWords(l.dr)}
                                </div>
                              )}
                            </td>

                            {/* Credit Input Column with Soft Highlight */}
                            <td className={`py-2 px-4 text-right ${!isNormalDr ? "bg-emerald-50/20" : ""}`}>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400 select-none">
                                  रु.
                                </span>
                                <input
                                  type="number"
                                  value={l.cr || ""}
                                  disabled={isLocked}
                                  placeholder="०"
                                  onChange={(e) => updateLedgerAmount(l.code, "cr", parseFloat(e.target.value) || 0)}
                                  className={`w-full text-right font-mono font-bold text-xs pl-7 pr-2.5 py-1.5 border rounded-lg outline-none transition ${
                                    hasCr
                                      ? "border-emerald-500 bg-emerald-50/40 text-emerald-900 ring-1 ring-emerald-400"
                                      : "border-slate-300 bg-white hover:border-slate-400 focus:ring-2 focus:ring-[#1F497D]"
                                  }`}
                                />
                              </div>
                              {hasCr && (
                                <div className="text-[10px] text-emerald-700 font-bold mt-0.5 truncate text-right">
                                  {formatNprWords(l.cr)}
                                </div>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAddCoa(l)}
                                  title="सम्पादन गर्नुहोस्"
                                  className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                {l.isCustom && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCoa(l.code)}
                                    title="खाता हटाउनुहोस्"
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* Table Footer Summary Row */}
                    <tfoot className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 text-slate-700">
                          <div className="flex items-center space-x-2">
                            <span>छानिएका खाताहरूको योग ({filteredLedgers.length} खाता):</span>
                            {filteredLedgers.length !== draft.ledgers?.length && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                (कुल {draft.ledgers?.length} मध्ये)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-blue-900">
                          <div>रु. {filteredDrSum.toLocaleString()}</div>
                          {filteredDrSum > 0 && (
                            <div className="text-[10px] text-blue-700 font-semibold">{formatNprWords(filteredDrSum)}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-900">
                          <div>रु. {filteredCrSum.toLocaleString()}</div>
                          {filteredCrSum > 0 && (
                            <div className="text-[10px] text-emerald-700 font-semibold">{formatNprWords(filteredCrSum)}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {Math.abs(filteredDrSum - filteredCrSum) < 1 ? (
                            <span className="text-emerald-600 font-bold text-[11px]" title="सन्तुलित">✓</span>
                          ) : (
                            <span className="text-amber-600 font-bold text-[10px]" title="फरक">≠</span>
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 text-xs font-bold px-4 py-2 border rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>अघिल्लो चरण</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveDraft(4);
                    setCurrentStep(4);
                  }}
                  className="flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
                >
                  <span>अर्को: सदस्य बल्क आयात (Next: Bulk Import)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })()}

        {/* STEP 4: Member-wise Bulk Import Engine */}
        {currentStep === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  <span>चरण ४: सदस्यगत प्रारम्भिक मौज्दात बल्क आयात इन्जिन (Bulk Import Engine)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  १०,०००+ सम्म सदस्य (KYC), सेयर (हिसाब १०), बचत (हिसाब ३०), कर्जा (हिसाब ११०) र मूल खाताहरू (८०..१४०, १०..७०) एक्सेल वा CSV मार्फत एकैपटक स्टेज गरी प्रमाणीकरण गर्नुहोस्।
                </p>
              </div>

              {/* Template Download Button */}
              <div className="flex items-center space-x-2">
                <a
                  href="/api/opening-setup?action=TEMPLATE"
                  download="nepal_coop_opening_balance_template.xlsx"
                  className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
                >
                  <Download className="w-4 h-4" />
                  <span>एक्सेल टेम्प्लेट डाउनलोड (Download Template)</span>
                </a>
              </div>
            </div>

            {/* Drag & Drop File Upload Box */}
            <div className="border-2 border-dashed border-slate-300 hover:border-[#1F497D] bg-slate-50/50 rounded-2xl p-8 text-center transition">
              <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">
                भरेको एक्सेल वा CSV फाइल यहाँ तान्नुहोस् वा ब्राउज गर्नुहोस्
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
                ४-खाता मानक ५ सिटहरू: <b>०१_सदस्य_विवरण</b>, <b>१०_सेयर_पुँजी</b>, <b>३०_बचत_निक्षेप</b>, <b>११०_ऋण_कर्जा</b> र <b>मूल_खाता_सूची_COA</b> भएको एक्सेल टेम्प्लेट।
              </p>

              <label className="inline-block mt-4">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  disabled={isUploading || isLocked}
                  className="hidden"
                />
                <span className="cursor-pointer bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow inline-flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? "अपलोड तथा प्रोसेसिङ हुँदैछ..." : "फाइल छान्नुहोस् (Browse File)"}</span>
                </span>
              </label>
            </div>

            {/* Active Batch Summary Card */}
            {activeBatch && (
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/70 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-800">{activeBatch.batchId}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          activeBatch.status === "Validated-OK"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : activeBatch.status === "Committed"
                            ? "bg-blue-100 text-blue-800 border border-blue-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }`}
                      >
                        {activeBatch.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      फाइल: {activeBatch.fileName} | अपलोडकर्ता: {activeBatch.uploadedBy}
                    </p>
                  </div>

                  {/* Summary Metric Counters */}
                  <div className="flex items-center space-x-4 text-xs">
                    <div>
                      <span className="text-slate-400">सदस्य: </span>
                      <span className="font-bold text-slate-800">{activeBatch.counts.members}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">सेयर: </span>
                      <span className="font-bold text-slate-800">रु. {activeBatch.stagedTotals.shareTotal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">बचत: </span>
                      <span className="font-bold text-slate-800">रु. {activeBatch.stagedTotals.savingsTotal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">कर्जा: </span>
                      <span className="font-bold text-slate-800">रु. {activeBatch.stagedTotals.loanTotal.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">त्रुटिहरू: </span>
                      <span className={`font-bold ${activeBatch.counts.errorsCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {activeBatch.counts.errorsCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Staged Members Table Preview */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBatchViewTab("ALL")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                          batchViewTab === "ALL"
                            ? "bg-[#1F497D] text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        सदस्य तथा मौज्दात (Members & Balances)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchViewTab("SHARES")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                          batchViewTab === "SHARES"
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        १० सेयर ({activeBatch.counts.shares})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchViewTab("SAVINGS")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                          batchViewTab === "SAVINGS"
                            ? "bg-blue-700 text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        ३० बचत ({activeBatch.counts.savings})
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatchViewTab("LOANS")}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs transition ${
                          batchViewTab === "LOANS"
                            ? "bg-amber-700 text-white shadow-sm"
                            : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-300"
                        }`}
                      >
                        ११० कर्जा ({activeBatch.counts.loans})
                      </button>
                    </div>

                    <label className="flex items-center space-x-2 text-[11px] text-slate-600 cursor-pointer self-end sm:self-auto">
                      <input
                        type="checkbox"
                        checked={filterErrorOnly}
                        onChange={(e) => setFilterErrorOnly(e.target.checked)}
                        className="rounded"
                      />
                      <span>त्रुटि भएका मात्र देखाउनुहोस् (Errors only)</span>
                    </label>
                  </div>

                  {/* TAB 1: ALL MEMBERS WITH LINE-BY-LINE BALANCES */}
                  {batchViewTab === "ALL" && (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b text-slate-600 text-[11px] shadow-sm">
                          <tr>
                            <th className="py-2.5 px-3">पंक्ति</th>
                            <th className="py-2.5 px-3">सदस्य नं</th>
                            <th className="py-2.5 px-3">सदस्यको नाम</th>
                            <th className="py-2.5 px-3">मोबाइल</th>
                            <th className="py-2.5 px-3">नागरिकता नं</th>
                            <th className="py-2.5 px-3 text-right">सेयर रकम (१०)</th>
                            <th className="py-2.5 px-3 text-right">बचत मौज्दात (३०)</th>
                            <th className="py-2.5 px-3 text-right">कर्जा सावाँ (११०)</th>
                            <th className="py-2.5 px-3">स्थिति / त्रुटि</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeBatch.data.members
                            .filter((m: any) => (!filterErrorOnly || m.errors.length > 0))
                            .slice(0, 100)
                            .map((m: any) => {
                              const b = memberBalancesMap.get(m.memberId) || { share: 0, savings: 0, loan: 0 };
                              return (
                                <tr key={m.rowNum} className={m.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}>
                                  <td className="py-2.5 px-3 font-mono text-slate-400">{m.rowNum}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{m.memberId}</td>
                                  <td className="py-2.5 px-3 font-medium text-slate-800">{m.nameNep}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">{m.phone || "-"}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-600">{m.citizenshipNo || "अपूर्ण"}</td>
                                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700">
                                    {b.share > 0 ? `रु. ${b.share.toLocaleString()}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">
                                    {b.savings > 0 ? `रु. ${b.savings.toLocaleString()}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                                    {b.loan > 0 ? `रु. ${b.loan.toLocaleString()}` : <span className="text-slate-300">-</span>}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {m.errors.length > 0 ? (
                                      <span className="text-red-600 font-bold text-[11px] flex items-center space-x-1">
                                        <XCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{m.errors.join(", ")}</span>
                                      </span>
                                    ) : m.isDraftKyc ? (
                                      <span className="text-amber-600 font-medium text-[10.5px]">अपूर्ण (Draft KYC)</span>
                                    ) : (
                                      <span className="text-emerald-600 font-bold text-[11px] flex items-center space-x-1">
                                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        <span>ठीक छ (Valid)</span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
                          <tr>
                            <td colSpan={5} className="py-2.5 px-3 text-right text-xs">कुल जम्मा (Total Batch Balances):</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800">
                              रु. {activeBatch.stagedTotals.shareTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-blue-800">
                              रु. {activeBatch.stagedTotals.savingsTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-800">
                              रु. {activeBatch.stagedTotals.loanTotal.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* TAB 2: SHARES (१०) */}
                  {batchViewTab === "SHARES" && (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b text-slate-600 text-[11px] shadow-sm">
                          <tr>
                            <th className="py-2.5 px-3">पंक्ति</th>
                            <th className="py-2.5 px-3">सदस्य नं</th>
                            <th className="py-2.5 px-3 text-right">सेयर कित्ता</th>
                            <th className="py-2.5 px-3 text-right">प्रति कित्ता दर</th>
                            <th className="py-2.5 px-3 text-right">कुल सेयर रकम (१०)</th>
                            <th className="py-2.5 px-3">खरिद मिति</th>
                            <th className="py-2.5 px-3">स्थिति / त्रुटि</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeBatch.data.shares || [])
                            .filter((s: any) => (!filterErrorOnly || s.errors.length > 0))
                            .slice(0, 100)
                            .map((s: any, idx: number) => (
                              <tr key={idx} className={s.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}>
                                <td className="py-2.5 px-3 font-mono text-slate-400">{s.rowNum || idx + 2}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.memberId}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{s.shareUnits?.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono">रु. {s.faceValue}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">रु. {s.shareAmount?.toLocaleString()}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{s.lastPurchaseDateBs || "-"}</td>
                                <td className="py-2.5 px-3">
                                  {s.errors.length > 0 ? (
                                    <span className="text-red-600 font-bold text-[11px]">{s.errors.join(", ")}</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold text-[11px]">ठीक छ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right">कुल सेयर पुँजी जम्मा:</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-800">रु. {activeBatch.stagedTotals.shareTotal.toLocaleString()}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* TAB 3: SAVINGS (३०) */}
                  {batchViewTab === "SAVINGS" && (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b text-slate-600 text-[11px] shadow-sm">
                          <tr>
                            <th className="py-2.5 px-3">पंक्ति</th>
                            <th className="py-2.5 px-3">सदस्य नं</th>
                            <th className="py-2.5 px-3">खाता नं</th>
                            <th className="py-2.5 px-3">बचत प्रकार</th>
                            <th className="py-2.5 px-3 text-right">बचत मौज्दात (३०)</th>
                            <th className="py-2.5 px-3 text-right">ब्याजदर %</th>
                            <th className="py-2.5 px-3">अन्तिम ब्याज मिति</th>
                            <th className="py-2.5 px-3">स्थिति / त्रुटि</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeBatch.data.savings || [])
                            .filter((b: any) => (!filterErrorOnly || b.errors.length > 0))
                            .slice(0, 100)
                            .map((b: any, idx: number) => (
                              <tr key={idx} className={b.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}>
                                <td className="py-2.5 px-3 font-mono text-slate-400">{b.rowNum || idx + 2}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{b.memberId}</td>
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-700">{b.accountNo}</td>
                                <td className="py-2.5 px-3">{b.productName}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">रु. {b.balance?.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{b.interestRate}%</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{b.lastInterestPostedDateBs || "-"}</td>
                                <td className="py-2.5 px-3">
                                  {b.errors.length > 0 ? (
                                    <span className="text-red-600 font-bold text-[11px]">{b.errors.join(", ")}</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold text-[11px]">ठीक छ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right">कुल बचत निक्षेप जम्मा:</td>
                            <td className="py-2.5 px-3 text-right font-mono text-blue-800">रु. {activeBatch.stagedTotals.savingsTotal.toLocaleString()}</td>
                            <td colSpan={3}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* TAB 4: LOANS (११०) */}
                  {batchViewTab === "LOANS" && (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 sticky top-0 border-b text-slate-600 text-[11px] shadow-sm">
                          <tr>
                            <th className="py-2.5 px-3">पंक्ति</th>
                            <th className="py-2.5 px-3">ऋण नं</th>
                            <th className="py-2.5 px-3">सदस्य नं</th>
                            <th className="py-2.5 px-3">कर्जा प्रकार</th>
                            <th className="py-2.5 px-3 text-right">बाँकी सावाँ (११०)</th>
                            <th className="py-2.5 px-3 text-right">ब्याजदर %</th>
                            <th className="py-2.5 px-3">लगानी मिति</th>
                            <th className="py-2.5 px-3 text-center">भाखा नाघेको दिन</th>
                            <th className="py-2.5 px-3">स्थिति / त्रुटि</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(activeBatch.data.loans || [])
                            .filter((l: any) => (!filterErrorOnly || l.errors.length > 0))
                            .slice(0, 100)
                            .map((l: any, idx: number) => (
                              <tr key={idx} className={l.errors.length > 0 ? "bg-red-50/50" : "hover:bg-slate-50"}>
                                <td className="py-2.5 px-3 font-mono text-slate-400">{l.rowNum || idx + 2}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{l.loanId}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-700">{l.memberId}</td>
                                <td className="py-2.5 px-3">{l.productName}</td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">रु. {l.principalOutstanding?.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right font-mono">{l.interestRate}%</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{l.disbursementDateBs || "-"}</td>
                                <td className="py-2.5 px-3 text-center font-mono">{l.overdueDays || 0}</td>
                                <td className="py-2.5 px-3">
                                  {l.errors.length > 0 ? (
                                    <span className="text-red-600 font-bold text-[11px]">{l.errors.join(", ")}</span>
                                  ) : (
                                    <span className="text-emerald-600 font-bold text-[11px]">ठीक छ</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300 sticky bottom-0">
                          <tr>
                            <td colSpan={4} className="py-2.5 px-3 text-right">कुल कर्जा सावाँ जम्मा:</td>
                            <td className="py-2.5 px-3 text-right font-mono text-amber-800">रु. {activeBatch.stagedTotals.loanTotal.toLocaleString()}</td>
                            <td colSpan={4}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(3)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 text-xs font-bold px-4 py-2 border rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>अघिल्लो चरण</span>
              </button>
              <button
                onClick={() => {
                  handleSaveDraft(5);
                  setCurrentStep(5);
                }}
                className="flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
              >
                <span>अर्को: प्रमाणीकरण व मिलान (Next: Validation)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Validation & Control Reconciliation Scorecard */}
        {currentStep === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>चरण ५: पूर्व-गो-लाइभ प्रमाणीकरण तथा नियन्त्रण खाता मिलान (Reconciliation Scorecard)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ४-खाताको नियन्त्रण खाता र सदस्य रजिस्ट्रारबीचको शतप्रतिशत गणितीय मिलान जाँच।
              </p>
            </div>

            {/* Reconciliation Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-bold uppercase">सेयर पुँजी मिलान (Share Capital)</div>
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <div className="text-xs text-slate-400">मूल खाता:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.glShare?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">रजिस्टर:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.subShare?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-bold">
                  {scorecard?.shareDiff === 0 ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>पूर्ण मिलान (Exact Match)</span>
                    </span>
                  ) : (
                    <span className="text-red-600">फरक: रु. {scorecard?.shareDiff?.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-bold uppercase">बचत निक्षेप मिलान (Savings Deposits)</div>
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <div className="text-xs text-slate-400">मूल खाता:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.glSavings?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">रजिस्टर:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.subSavings?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-bold">
                  {scorecard?.savingsDiff === 0 ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>पूर्ण मिलान (Exact Match)</span>
                    </span>
                  ) : (
                    <span className="text-red-600">फरक: रु. {scorecard?.savingsDiff?.toLocaleString()}</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="text-[11px] text-slate-500 font-bold uppercase">कर्जा लगानी मिलान (Loan Portfolio)</div>
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <div className="text-xs text-slate-400">मूल खाता:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.glLoans?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">रजिस्टर:</div>
                    <div className="text-sm font-bold text-slate-800">रु. {scorecard?.subLoans?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-bold">
                  {scorecard?.loanDiff === 0 ? (
                    <span className="text-emerald-600 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> <span>पूर्ण मिलान (Exact Match)</span>
                    </span>
                  ) : (
                    <span className="text-red-600">फरक: रु. {scorecard?.loanDiff?.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                प्रणाली प्रमाणीकरण विवरण (System Verification Checklist)
              </h4>
              {scorecard?.checks?.map((chk: any) => (
                <div
                  key={chk.id}
                  className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
                    chk.status === "PASSED"
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                      : chk.status === "WARNING"
                      ? "bg-amber-50/50 border-amber-200 text-amber-900"
                      : "bg-red-50/50 border-red-200 text-red-900"
                  }`}
                >
                  {chk.status === "PASSED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : chk.status === "WARNING" ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-bold">{chk.titleNep}</div>
                    <div className="text-[11px] opacity-90 mt-0.5">{chk.message}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cash & Bank Physical Confirmation Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
              <input
                type="checkbox"
                id="cashBankVerifyCheck"
                checked={draft.cashBankConfirmed}
                disabled={isLocked}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    cashBankConfirmed: e.target.checked,
                    cashBankConfirmedDate: draft.goLiveDateBs,
                    cashBankConfirmedUser: "ADMIN",
                  });
                }}
                className="mt-1 rounded"
              />
              <label htmlFor="cashBankVerifyCheck" className="text-xs text-blue-900 cursor-pointer">
                <span className="font-bold">नगद तथा बैंक मौज्दात भौतिक रूपमा रुजु भएको प्रमाणित गर्दछु।</span>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  भौतिक नगद गन्ती तथा बैंक स्टेटमेन्ट बमोजिमका मौज्दातहरू प्रमाणित गरिएको छ र कुनै फरक छैन।
                </p>
              </label>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(4)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 text-xs font-bold px-4 py-2 border rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>अघिल्लो चरण</span>
              </button>
              <button
                onClick={() => {
                  handleSaveDraft(6);
                  setCurrentStep(6);
                }}
                className="flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow"
              >
                <span>अर्को: समीक्षा तथा पोस्ट (Next: Review & Post)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Review Summary, Post & Lock */}
        {currentStep === 6 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1F497D] flex items-center space-x-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <span>चरण ६: प्रारम्भिक मौज्दात अन्तिम समीक्षा तथा पोस्ट-लक (Review & Post-Lock)</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  सबै विवरण अन्तिम रूपमा रुजु गरी प्रत्यक्ष डेटाबेसमा पोस्ट गरी नयाँ आर्थिक वर्ष सुरु गर्नुहोस्।
                </p>
              </div>

              {isLocked && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>प्रमाणिकरण प्रतिवेदन प्रिन्ट (Print Report)</span>
                </button>
              )}
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] text-slate-400 font-bold uppercase">आर्थिक वर्ष</div>
                <div className="text-base font-black text-[#1F497D] mt-1">{draft.fiscalYear}</div>
                <div className="text-xs text-slate-500">सुरु: {draft.goLiveDateBs}</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] text-slate-400 font-bold uppercase">कुल प्रारम्भिक सम्पत्ति (Assets)</div>
                <div className="text-base font-black text-emerald-700 mt-1">
                  रु. {scorecard?.totalDr?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">Row 6 OB-001 मा पोस्ट</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] text-slate-400 font-bold uppercase">कुल दायित्व तथा पुँजी (Liab & Equity)</div>
                <div className="text-base font-black text-blue-700 mt-1">
                  रु. {scorecard?.totalCr?.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500">Row 6 OB-001 मा पोस्ट</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-[10px] text-slate-400 font-bold uppercase">गो-लाइभ स्थिति (Status)</div>
                <div className="text-base font-black text-amber-700 mt-1">
                  {isLocked ? "आधिकारिक रूपमा लक (LOCKED)" : "पोस्ट गर्न बाँकी (READY)"}
                </div>
                <div className="text-xs text-slate-500">
                  {isLocked ? "डाटा सुरक्षित गरिएको छ" : "पोस्ट बटन थिच्नुहोस्"}
                </div>
              </div>
            </div>

            {/* 4 Signatory Verification Block (Printable Report Card) */}
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/70 space-y-6">
              <div className="text-center border-b border-slate-200 pb-3">
                <h3 className="text-base font-black text-slate-800">
                  प्रारम्भिक मौज्दात प्रमाणीकरण प्रतिवेदन (Opening Balance Verification Report)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  सहकारी ऐन २०७४, नियमावली २०७५ तथा नेपाल राष्ट्र बैंक निर्देशिका बमोजिम रुजु गरिएको
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 text-center">
                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-800">लेखापाल (Accountant)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">तयार गर्ने</div>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-800">आन्तरिक लेखापरीक्षक</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">जाँच्ने / रुजु गर्ने</div>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-800">व्यवस्थापक (Manager)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">प्रमाणीकरण गर्ने</div>
                </div>

                <div className="border-t border-slate-400 pt-2">
                  <div className="text-xs font-bold text-slate-800">अध्यक्ष (Chairperson)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">स्वीकृत गर्ने</div>
                </div>
              </div>
            </div>

            {/* Post & Lock Action Button */}
            {!isLocked ? (
              isAdmin ? (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-3">
                  <h4 className="text-sm font-black text-amber-900">
                    प्रारम्भिक मौज्दात पोस्ट तथा लक गर्न तयार हुनुहुन्छ?
                  </h4>
                  <p className="text-xs text-amber-800 max-w-xl mx-auto">
                    यो कार्य गर्दा स्वचालित रूपमा डाटाबेसको ब्याकअप लिइनेछ, ४-खाता प्रणालीको Row 6 मा मौज्दातहरू भरिनेछ, र नयाँ आर्थिक वर्ष सुरु हुनेछ।
                  </p>
                  <button
                    onClick={handleCommitSetup}
                    disabled={posting || !scorecard?.canPost}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-8 py-3 rounded-xl shadow-lg transition disabled:opacity-50 inline-flex items-center space-x-2"
                  >
                    <Lock className="w-5 h-5" />
                    <span>{posting ? "पोस्ट तथा लक हुँदैछ..." : "प्रारम्भिक मौज्दात पोस्ट तथा लक गर्नुहोस् (Post & Lock)"}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-amber-600 mx-auto" />
                  <h4 className="text-sm font-black text-amber-900">
                    प्रारम्भिक मौज्दात पोस्ट गर्ने अधिकार केवल मुख्य प्रशासक (Admin) लाई मात्र छ
                  </h4>
                  <p className="text-xs text-amber-800">
                    गो-लाइभ सम्पन्न गरी प्रणाली सक्रिय गर्न कृपया मुख्य प्रशासक (Admin) लगइन गर्नुहोस्।
                  </p>
                </div>
              )
            ) : (
              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-black text-emerald-900">
                  प्रारम्भिक मौज्दात सफलतापूर्वक पोस्ट भई लक भइसकेको छ!
                </h4>
                <p className="text-xs text-emerald-700">
                  नयाँ आर्थिक वर्ष {draft.fiscalYear} मा दैनिक कारोबार तथा भौचर प्रविष्टि सुरु गर्न सक्नुहुन्छ।
                </p>
                <div className="pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center space-x-2 bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md transition"
                  >
                    <span>मुख्य ड्यासबोर्डमा जानुहोस् (Go to Main Dashboard)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentStep(5)}
                className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 text-xs font-bold px-4 py-2 border rounded-xl"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>अघिल्लो चरण</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reopen Rollback Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600 border-b pb-3">
              <RotateCcw className="w-6 h-6" />
              <h3 className="text-base font-black">प्रारम्भिक मौज्दात पुनः खोल्नुहोस् (Reopen Setup)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              प्रारम्भिक मौज्दात पुनः खोल्दा प्रणाली ड्राफ्ट अवस्थामा फर्किनेछ र बन्द हुनुपूर्वको ब्याकअपबाट डाटा पुनर्स्थापना हुनेछ। यसका लागि कम्तिमा १० अक्षरको आधिकारिक कारण अनिवार्य छ।
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">आधिकारिक कारण (Mandatory Reason)*</label>
              <textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                placeholder="जस्तै: साविक सेयर पुँजी र बचतमा लेखापरीक्षण संशोधन गर्नका लागि..."
                className="w-full text-xs p-3 border rounded-xl border-slate-300 focus:ring-2 focus:ring-red-500 outline-none h-24"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowRollbackModal(false)}
                className="text-xs font-bold text-slate-600 px-4 py-2 rounded-xl border hover:bg-slate-50"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={handleRollbackSetup}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded-xl shadow"
              >
                पुनः खोल्ने पुष्टि गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Custom COA Head Modal */}
      {showAddCoaModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-[#1F497D]">
                <Layers className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black">
                  {editingCoa ? "हिसाब खाता सम्पादन (Edit Account Head)" : "नयाँ हिसाब नं. / खाता थप्नुहोस् (Add Account Head)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCoaModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500">
              सहकारीको आफ्नै हिसाब कोड वा यहाँ नभएको अनुकूलित खाता प्रविष्टि गर्नुहोस्।
            </p>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    हिसाब नं. / कोड (Account Code)*
                  </label>
                  <input
                    type="text"
                    value={coaForm.code}
                    disabled={!!editingCoa && !editingCoa.isCustom}
                    onChange={(e) => setCoaForm({ ...coaForm, code: e.target.value })}
                    placeholder="उदा: 80.3, 90.3, 100.3, 20.7, 30.3"
                    className="w-full font-mono font-bold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">संस्थाको आफ्नै लेजर नम्बर</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    खाताको वर्ग (Account Category)*
                  </label>
                  <select
                    value={coaForm.category}
                    onChange={(e) => setCoaForm({ ...coaForm, category: e.target.value as any })}
                    className="w-full font-bold px-3 py-2 border rounded-xl border-slate-300 bg-white focus:ring-2 focus:ring-[#1F497D] outline-none"
                  >
                    <option value="ASSET">सम्पत्ति (Assets - ८० देखि १४०)</option>
                    <option value="LIABILITY">दायित्व (Liabilities - ३० देखि ७०)</option>
                    <option value="EQUITY">सेयर तथा जगेडा कोष (Equity & Reserves - १० र २०)</option>
                    <option value="SUSPENSE">विशेष / सस्पेन्स (Suspense - ९९९)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  खाताको नाम (नेपालीमा)*
                </label>
                <input
                  type="text"
                  value={coaForm.nameNep}
                  onChange={(e) => setCoaForm({ ...coaForm, nameNep: e.target.value })}
                  placeholder="उदा: भवन निर्माण जगेडा कोष / ग्लोबल आइएमई बैंक चल्ती खाता"
                  className="w-full font-bold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  खाताको नाम (अंग्रेजीमा - English Name)
                </label>
                <input
                  type="text"
                  value={coaForm.nameEng}
                  onChange={(e) => setCoaForm({ ...coaForm, nameEng: e.target.value })}
                  placeholder="उदा: Building Construction Reserve Fund"
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    सामान्य मौज्दात प्रकृति (Normal Balance)
                  </label>
                  <div className="flex items-center space-x-4 pt-1">
                    <label className="inline-flex items-center space-x-1.5 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="normalBal"
                        value="DR"
                        checked={coaForm.normalBalance === "DR"}
                        onChange={() => setCoaForm({ ...coaForm, normalBalance: "DR" })}
                        className="text-[#1F497D]"
                      />
                      <span className="text-blue-700">डेबिट (Dr)</span>
                    </label>
                    <label className="inline-flex items-center space-x-1.5 cursor-pointer font-bold">
                      <input
                        type="radio"
                        name="normalBal"
                        value="CR"
                        checked={coaForm.normalBalance === "CR"}
                        onChange={() => setCoaForm({ ...coaForm, normalBalance: "CR" })}
                        className="text-[#1F497D]"
                      />
                      <span className="text-emerald-700">क्रेडिट (Cr)</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    सुरुवाती मौज्दात रकम (Opening Amount NPR)
                  </label>
                  <input
                    type="number"
                    value={coaForm.openingAmount || ""}
                    onChange={(e) => setCoaForm({ ...coaForm, openingAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full font-mono font-bold px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  कैफियत / विवरण (Notes / Purpose)
                </label>
                <input
                  type="text"
                  value={coaForm.notes}
                  onChange={(e) => setCoaForm({ ...coaForm, notes: e.target.value })}
                  placeholder="उदा: यस खाताको उद्देश्य वा विस्तृत विवरण..."
                  className="w-full px-3 py-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-[#1F497D] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setShowAddCoaModal(false)}
                className="text-xs font-bold text-slate-600 px-4 py-2 rounded-xl border hover:bg-slate-50"
              >
                रद्द गर्नुहोस् (Cancel)
              </button>
              <button
                type="button"
                onClick={handleSaveCoa}
                className="bg-[#1F497D] hover:bg-[#17365D] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow"
              >
                खाता सुरक्षित गर्नुहोस् (Save Account)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Transaction Reset Safety Modal */}
      <ResetTransactionsModal
        isOpen={showResetTxnModal}
        onClose={() => setShowResetTxnModal(false)}
        onSuccess={() => loadSetupData()}
      />
    </div>
  );
}
